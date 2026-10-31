from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DateTime,
    ForeignKey,
    Text,
    Numeric
)
from sqlalchemy.sql import func
from database import Base


# ==============================
# PATIENT MODEL
# ==============================

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)
    phone = Column(String(15), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=True)
    address = Column(String(255), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# ==============================
# DOCTOR MODEL
# ==============================

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    specialization = Column(String(100), nullable=False)
    qualification = Column(String(100), nullable=False)
    experience = Column(Integer, nullable=False)
    phone = Column(String(15), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    consultation_fee = Column(Integer, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# ==============================
# APPOINTMENT MODEL
# ==============================

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(
        Integer,
        ForeignKey("patients.id"),
        nullable=False
    )

    doctor_id = Column(
        Integer,
        ForeignKey("doctors.id"),
        nullable=False
    )

    appointment_date = Column(
        DateTime(timezone=True),
        nullable=False
    )

    reason = Column(String(255), nullable=True)

    status = Column(
        String(50),
        nullable=False,
        default="Scheduled"
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# ==============================
# MEDICAL RECORD MODEL
# ==============================

class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(
        Integer,
        ForeignKey("patients.id"),
        nullable=False
    )

    doctor_id = Column(
        Integer,
        ForeignKey("doctors.id"),
        nullable=False
    )

    diagnosis = Column(Text, nullable=False)
    symptoms = Column(Text, nullable=True)
    prescription = Column(Text, nullable=True)
    treatment = Column(Text, nullable=True)

    record_date = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )


# ==============================
# BILLING MODEL
# ==============================

class Billing(Base):
    __tablename__ = "billings"

    id = Column(Integer, primary_key=True, index=True)

    patient_id = Column(
        Integer,
        ForeignKey("patients.id"),
        nullable=False
    )

    doctor_id = Column(
        Integer,
        ForeignKey("doctors.id"),
        nullable=False
    )

    consultation_fee = Column(
        Numeric(10, 2),
        nullable=False
    )

    medicine_charges = Column(
        Numeric(10, 2),
        nullable=False,
        default=0
    )

    other_charges = Column(
        Numeric(10, 2),
        nullable=False,
        default=0
    )

    total_amount = Column(
        Numeric(10, 2),
        nullable=False
    )

    payment_status = Column(
        String(50),
        nullable=False,
        default="Pending"
    )

    bill_date = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
# ==============================
# ADMIN MODEL
# ==============================

class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    is_active = Column(
        Integer,
        nullable=False,
        default=1
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
