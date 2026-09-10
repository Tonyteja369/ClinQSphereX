from sqlmodel import SQLModel, create_engine, Session
import os
from urllib.parse import urlparse

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")

# Use SQLModel engine (sync)
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})

def init_db():
    from app.models import User, Study, Candidate, AuditLog
    SQLModel.metadata.create_all(engine)
