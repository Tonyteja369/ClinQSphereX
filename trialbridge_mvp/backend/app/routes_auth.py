from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db import engine
from app.schemas import RegisterIn, LoginIn, Token
from app.models import User
from app.auth import hash_password, verify_password, create_access_token
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=dict)
def register(payload: RegisterIn):
    with Session(engine) as session:
        exists = session.exec(select(User).where(User.email == payload.email)).first()
        if exists:
            raise HTTPException(status_code=400, detail="Email exists")
        user = User(email=payload.email, hashed_password=hash_password(payload.password), role=payload.role)
        session.add(user); session.commit(); session.refresh(user)
        return {"email": user.email, "role": user.role}

@router.post("/token", response_model=Token)
def token(form_data: LoginIn):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == form_data.email)).first()
        if not user or not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_access_token({"sub": user.email})
        return {"access_token": token}
