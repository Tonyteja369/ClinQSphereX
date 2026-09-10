from fastapi import FastAPI
from app.db import init_db
from app.routes_auth import router as auth_router
from app.routes_studies import router as studies_router
from app.routes_candidates import router as candidates_router
from app.routes_train import router as train_router
from app.seed_admin import seed_admin
import os

app = FastAPI(title="TrialBridge MVP API")

app.include_router(auth_router)
app.include_router(studies_router)
app.include_router(candidates_router)
app.include_router(train_router)

@app.on_event("startup")
def on_startup():
    init_db()
    seed_admin()
