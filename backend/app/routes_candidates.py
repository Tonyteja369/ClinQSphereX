from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session, select
from app.db import engine
from app.models import Candidate, AuditLog
from app.schemas import CandidateCreate
from app.auth import get_current_user, require_role
import pandas as pd
from app.ml.data_gen import generate_synthetic_data
from typing import List
import json
import io
import numpy as np

router = APIRouter(prefix="/candidates", tags=["candidates"])

@router.post("/", response_model=dict)
def add_candidate(payload: CandidateCreate, user = Depends(require_role("coordinator"))):
    cand = Candidate(**payload.dict())
    with Session(engine) as session:
        session.add(cand); session.commit(); session.refresh(cand)
        session.add(AuditLog(action="create_candidate", user_email=user.email, details=f"candidate_id={cand.id}"))
        session.commit()
    return {"id": cand.id}

@router.post("/generate", response_model=dict)
def generate_candidates_for_study(study_id: int, n: int = 100, user = Depends(require_role("coordinator"))):
    df, labels = generate_synthetic_data(n_samples=n)
    created = 0
    with Session(engine) as session:
        for _, row in df.iterrows():
            cand = Candidate(
                study_id=study_id,
                age=int(row.age),
                bmi=float(row.bmi),
                systolic_bp=float(row.systolic_bp),
                hba1c=float(row.hba1c),
                symptom_score=int(row.symptom_score),
                prior_condition_flag=int(row.prior_condition_flag),
                medication_flag=int(row.medication_flag),
            )
            session.add(cand); created += 1
        session.commit()
    return {"created": created}

@router.post("/ingest_synthea", response_model=dict)
async def ingest_synthea(study_id: int, file: UploadFile = File(None), user = Depends(require_role("coordinator"))):
    """
    Accepts either:
     - an uploaded JSON file that is an array of simplified patient dicts with fields:
         { "id": "...", "birthDate": "YYYY-MM-DD", "bmi": <float>, "hba1c": <float>, "systolic_bp": <float>, "symptom_score": <int>, "prior_condition_flag": 0/1, "medication_flag": 0/1 }
     - OR if file is not provided, uses the sample file located at app/data/synthea_sample.json
    This endpoint is intentionally permissive for hackathon demos. Real FHIR parsing requires more robust handling.
    """
    content = None
    if file:
        raw = await file.read()
        try:
            content = json.loads(raw.decode("utf-8"))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON upload: {e}")
    else:
        # load local sample
        try:
            with open("data/synthea_sample.json", "r", encoding="utf-8") as fh:
                content = json.load(fh)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Sample Synthea not found: {e}")

    if not isinstance(content, list):
        raise HTTPException(status_code=400, detail="Expected JSON array of patient dicts")

    created = 0
    with Session(engine) as session:
        for p in content:
            # map fields with fallback defaults
            # birthDate -> derive age
            try:
                birth = p.get("birthDate")
                if birth:
                    year = int(birth.split("-")[0])
                    age = 2024 - year
                else:
                    age = int(p.get("age", 45))
            except Exception:
                age = int(p.get("age", 45))
            bmi = float(p.get("bmi", 27.0))
            hba1c = float(p.get("hba1c", 5.8))
            systolic_bp = float(p.get("systolic_bp", 125.0))
            symptom_score = int(p.get("symptom_score", 4))
            prior_condition_flag = int(p.get("prior_condition_flag", 0))
            medication_flag = int(p.get("medication_flag", 0))

            cand = Candidate(
                study_id=study_id,
                age=age,
                bmi=bmi,
                systolic_bp=systolic_bp,
                hba1c=hba1c,
                symptom_score=symptom_score,
                prior_condition_flag=prior_condition_flag,
                medication_flag=medication_flag,
            )
            session.add(cand)
            created += 1
        session.commit()
    return {"created": created}

@router.get("/study/{study_id}", response_model=List[dict])
def list_candidates(study_id: int, user = Depends(get_current_user)):
    with Session(engine) as session:
        cands = session.exec(select(Candidate).where(Candidate.study_id == study_id)).all()
    # Convert to plain dicts
    return [c.dict() for c in cands]

@router.post("/{candidate_id}/confirm", response_model=dict)
def confirm_candidate(candidate_id: int, confirm: bool = True, user = Depends(get_current_user)):
    with Session(engine) as session:
        cand = session.exec(select(Candidate).where(Candidate.id == candidate_id)).first()
        if not cand:
            raise HTTPException(status_code=404, detail="Not found")
        cand.eligibility_confirmed = bool(confirm)
        session.add(AuditLog(action="confirm_candidate", user_email=user.email, details=f"id={candidate_id} confirmed={confirm}"))
        session.add(cand); session.commit()
    return {"id": candidate_id, "confirmed": cand.eligibility_confirmed}

@router.post("/{candidate_id}/consent", response_model=dict)
def sign_consent(candidate_id: int, consent: bool = True, user = Depends(get_current_user)):
    with Session(engine) as session:
        cand = session.exec(select(Candidate).where(Candidate.id == candidate_id)).first()
        if not cand:
            raise HTTPException(status_code=404, detail="Not found")
        cand.consent_signed = bool(consent)
        session.add(AuditLog(action="consent_signed", user_email=user.email, details=f"id={candidate_id} consent={consent}"))
        session.add(cand); session.commit()
    return {"id": candidate_id, "consent_signed": cand.consent_signed}

# ---------------------------
# SHAP explainability endpoint
# ---------------------------
@router.get("/{candidate_id}/explain", response_model=dict)
def explain_candidate(candidate_id: int, user = Depends(get_current_user)):
    """
    Build a small training dataset from candidates in the same study (labels via rule),
    train a logistic regression baseline, compute SHAP LinearExplainer for the logistic model,
    and return per-feature SHAP values for the requested candidate.

    This is a demo-only, on-the-fly explanation approach for hackathon prototypes.
    """
    # fetch candidate and peers
    with Session(engine) as session:
        target = session.exec(select(Candidate).where(Candidate.id == candidate_id)).first()
        if not target:
            raise HTTPException(status_code=404, detail="Candidate not found")
        peers = session.exec(select(Candidate).where(Candidate.study_id == target.study_id)).all()
        if not peers or len(peers) < 10:
            # fallback: generate synthetic data to train a meaningful model
            df, labels = generate_synthetic_data(n_samples=300)
            X = df.values
            y = labels
            feature_names = list(df.columns)
            # find index of a matching "target" like row by constructing array
            cand_vec = np.array([target.age, target.bmi, target.systolic_bp, target.hba1c, target.symptom_score, target.prior_condition_flag, target.medication_flag])
        else:
            # Build DataFrame from peers
            data = []
            for c in peers:
                data.append({
                    "age": c.age,
                    "bmi": c.bmi,
                    "systolic_bp": c.systolic_bp,
                    "hba1c": c.hba1c,
                    "symptom_score": c.symptom_score,
                    "prior_condition_flag": c.prior_condition_flag,
                    "medication_flag": c.medication_flag,
                })
            df = pd.DataFrame(data)
            # Build labels using the same ground-truth rule used by generator
            rule = (
                (df["age"] >= 18) & (df["age"] <= 65) &
                (df["bmi"] >= 18.5) & (df["bmi"] <= 35.0) &
                (df["systolic_bp"] < 140) &
                (df["hba1c"] < 6.5) &
                (df["symptom_score"] >= 4) &
                (df["prior_condition_flag"] == 0) &
                (df["medication_flag"] == 0)
            )
            labels = rule.astype(int).to_numpy()
            X = df.values
            y = labels
            feature_names = list(df.columns)
            cand_vec = np.array([target.age, target.bmi, target.systolic_bp, target.hba1c, target.symptom_score, target.prior_condition_flag, target.medication_flag])

    # Train a logistic regression on X,y and compute SHAP
    try:
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import StandardScaler
        from sklearn.linear_model import LogisticRegression
        import shap
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Missing ML deps: {e}")

    # Standardize + train
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    clf = LogisticRegression(max_iter=1000)
    clf.fit(X_scaled, y)

    # Prepare explainer: LinearExplainer works well with linear models
    try:
        explainer = shap.LinearExplainer(clf, X_scaled, feature_dependence="independent")
    except Exception:
        # fallback to KernelExplainer (slower); use a small background
        background = X_scaled[np.random.choice(X_scaled.shape[0], min(50, X_scaled.shape[0]), replace=False)]
        explainer = shap.KernelExplainer(lambda z: clf.predict_proba(scaler.transform(z))[:, 1], background)

    # compute shap values for candidate
    cand_scaled = scaler.transform(cand_vec.reshape(1, -1))
    shap_values = explainer.shap_values(cand_scaled)
    # shap_values may be list for multioutput; for binary logistic LinearExplainer returns array
    if isinstance(shap_values, list):
        sv = shap_values[0][0]
    else:
        sv = np.asarray(shap_values)[0]

    # format output
    features_out = []
    for name, val, s in zip(feature_names, cand_vec.tolist(), sv.tolist()):
        features_out.append({"feature": name, "value": float(val), "shap": float(s), "abs_shap": abs(float(s))})
    # sort by absolute shap
    features_out = sorted(features_out, key=lambda x: x["abs_shap"], reverse=True)

    return {"candidate_id": candidate_id, "explanation": features_out}
