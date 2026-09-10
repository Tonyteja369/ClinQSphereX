from fastapi import APIRouter, Depends, HTTPException, Query
from app.auth import get_current_user, require_role
from app.ml.trainer import run_experiment
from app.utils import fig_to_png_bytes
import base64

router = APIRouter(prefix="/train", tags=["train"])

@router.post("/run")
def run_train(
    study_id: int,
    n_samples: int = Query(300, ge=10, le=2000),
    n_qubits: int = Query(4, ge=2, le=6),
    run_classical: bool = True,
    run_quantum: bool = True,
    user = Depends(require_role("coordinator"))
):
    try:
        result = run_experiment(n_samples=n_samples, n_qubits=n_qubits, run_classical=run_classical, run_quantum=run_quantum)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    # Return metrics and base64 encoded ROC
    roc_b64 = base64.b64encode(result["roc_png"]).decode("utf-8") if result.get("roc_png") else None
    return {"classical_metrics": result.get("classical_metrics"), "quantum_metrics": result.get("quantum_metrics"), "roc_image_base64": roc_b64, "info": result.get("info")}
