from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, nullable=False, unique=True)
    hashed_password: str
    role: str = Field(default="coordinator")  # admin, coordinator, reviewer
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Study(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: Optional[str] = None
    inclusion_criteria: Optional[str] = None
    exclusion_criteria: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Candidate(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    study_id: int = Field(foreign_key="study.id")
    age: int
    bmi: float
    systolic_bp: float
    hba1c: float
    symptom_score: int
    prior_condition_flag: int
    medication_flag: int
    eligibility_pred: Optional[float] = None
    eligibility_confirmed: Optional[bool] = None
    consent_signed: Optional[bool] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    action: str
    user_email: Optional[str]
    details: Optional[str]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
