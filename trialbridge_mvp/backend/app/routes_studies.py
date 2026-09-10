from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db import engine
from app.models import Study
from app.schemas import StudyCreate
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/studies", tags=["studies"])

@router.post("/", response_model=dict)
def create_study(payload: StudyCreate, user = Depends(require_role("coordinator"))):
    s = Study(**payload.dict())
    with Session(engine) as session:
        session.add(s); session.commit(); session.refresh(s)
    return {"id": s.id, "title": s.title}

@router.get("/", response_model=list)
def list_studies(user = Depends(get_current_user)):
    with Session(engine) as session:
        studies = session.exec(select(Study)).all()
    return studies

@router.get("/{study_id}", response_model=dict)
def get_study(study_id: int, user = Depends(get_current_user)):
    with Session(engine) as session:
        s = session.exec(select(Study).where(Study.id == study_id)).first()
        if not s:
            raise HTTPException(status_code=404, detail="Not found")
    return s
