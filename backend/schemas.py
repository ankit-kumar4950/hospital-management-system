
from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime
from decimal import Decimal
from typing import Optional


# ==============================
# PATIENT SCHEMAS
# ==============================

class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    age: int
    gender: str
    phone: str
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    date_of_birth: Optional[date] = None


class PatientResponse(PatientCreate):
    id: int

    class Config:
        from_attributes = True


# ==============================
# DOCTOR SCHEMAS
# ==============================

class DoctorCreate(BaseModel):
    first_name: str
    last_name: str
    specialization: str
    qualification: str
    experience: int
    phone: str
    email: EmailStr
    consultation_fee: int


class DoctorResponse(DoctorCreate):
    id: int

    class Config:
        from_attributes = True


# ==============================
# APPOINTMENT SCHEMAS
# ==============================

class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_date: datetime
    reason: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    appointment_date: datetime
    reason: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ==============================
# MEDICAL RECORD SCHEMAS
# ==============================

class MedicalRecordCreate(BaseModel):
    patient_id: int
    doctor_id: int
    diagnosis: str
    symptoms: Optional[str] = None
    prescription: Optional[str] = None
    treatment: Optional[str] = None


class MedicalRecordResponse(MedicalRecordCreate):
    id: int
    record_date: datetime

    class Config:
        from_attributes = True


# ==============================
# BILLING SCHEMAS
# ==============================

class BillingCreate(BaseModel):
    patient_id: int
    doctor_id: int
    consultation_fee: Decimal = Field(ge=0)
    medicine_charges: Decimal = Field(default=Decimal("0"), ge=0)
    other_charges: Decimal = Field(default=Decimal("0"), ge=0)
    payment_status: str = "Pending"


class BillingResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    consultation_fee: Decimal
    medicine_charges: Decimal
    other_charges: Decimal
    total_amount: Decimal
    payment_status: str
    bill_date: datetime

    class Config:
        from_attributes = True
# ==============================
# ADMIN LOGIN SCHEMA
# ==============================

class AdminLogin(BaseModel):
    username: str
    password: str
