from pydantic import BaseModel, EmailStr
from typing import Optional

class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    role: Optional[str] = "coordinator"

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class StudyCreate(BaseModel):
    title: str
    description: Optional[str] = None
    inclusion_criteria: Optional[str] = None
    exclusion_criteria: Optional[str] = None

class CandidateCreate(BaseModel):
    study_id: int
    age: int
    bmi: float
    systolic_bp: float
    hba1c: float
    symptom_score: int
    prior_condition_flag: int
    medication_flag: int
