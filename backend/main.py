
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Depends, status
from jwt.exceptions import InvalidTokenError
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from auth import (
    verify_password,
    create_access_token,
    decode_access_token,
    oauth2_scheme
)

from database import Base, engine, SessionLocal

from models import (
    Patient,
    Doctor,
    Appointment,
    MedicalRecord,
    Billing,
    Admin
)

from schemas import (
    PatientCreate,
    PatientResponse,
    DoctorCreate,
    DoctorResponse,
    AppointmentCreate,
    AppointmentResponse,
    MedicalRecordCreate,
    MedicalRecordResponse,
    BillingCreate,
    BillingResponse,
    AdminLogin
)


# ==============================
# CREATE DATABASE TABLES
# ==============================

Base.metadata.create_all(bind=engine)


# ==============================
# INITIALIZE FASTAPI
# ==============================

app = FastAPI(
    title="Hospital Management System API",
    description="Backend API for Hospital Management System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "https://hospital-management-system-two-chi.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================
# DATABASE SESSION
# ==============================

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==============================
# ADMIN LOGIN API
# ==============================

@app.post("/login")
def admin_login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    admin = db.query(Admin).filter(
        Admin.username == form_data.username
    ).first()

    if not admin:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=403,
            detail="Admin account is inactive"
        )

    if not verify_password(
        form_data.password,
        admin.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    access_token = create_access_token(
        data={"sub": admin.username}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

# ==============================
# VERIFY LOGGED-IN ADMIN
# ==============================

def get_current_admin(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        payload = decode_access_token(token)
        username = payload.get("sub")

        if username is None:
            raise credentials_exception

    except InvalidTokenError:
        raise credentials_exception

    admin = db.query(Admin).filter(
        Admin.username == username
    ).first()

    if admin is None or not admin.is_active:
        raise credentials_exception

    return admin  

@app.get("/admin/profile")
def admin_profile(
    current_admin: Admin = Depends(get_current_admin)
):
    return {
        "message": "Admin authenticated successfully",
        "username": current_admin.username,
        "email": current_admin.email
    }      

# ==============================
# HOME API
# ==============================

@app.get("/")
def home():
    return {
        "message": "Hospital Management System API is running"
    }


# ==============================
# HEALTH CHECK API
# ==============================

@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


# ==============================
# DATABASE CHECK API
# ==============================

@app.get("/db-check")
def database_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {
            "message": "PostgreSQL connected successfully"
        }
    except SQLAlchemyError:
        raise HTTPException(
            status_code=500,
            detail="Database connection failed"
        )


# ==================================================
# PATIENT APIs
# ==================================================

# CREATE PATIENT

@app.post("/patients", response_model=PatientResponse)
def create_patient(
    patient: PatientCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    existing_patient = db.query(Patient).filter(
        (Patient.phone == patient.phone) |
        (Patient.email == patient.email)
    ).first() if patient.email else db.query(Patient).filter(
        Patient.phone == patient.phone
    ).first()

    if existing_patient:
        raise HTTPException(
            status_code=400,
            detail="Patient with this phone or email already exists"
        )

    new_patient = Patient(**patient.model_dump())

    try:
        db.add(new_patient)
        db.commit()
        db.refresh(new_patient)
        return new_patient

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Patient creation failed"
        )


# GET ALL PATIENTS

@app.get("/patients", response_model=list[PatientResponse])
def get_all_patients(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    return db.query(Patient).all()


# GET PATIENT BY ID

@app.get("/patients/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id
    ).first()

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    return patient


# UPDATE PATIENT

@app.put("/patients/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: int,
    updated_data: PatientCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id
    ).first()

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    duplicate = db.query(Patient).filter(
        Patient.id != patient_id,
        (
            (Patient.phone == updated_data.phone) |
            (Patient.email == updated_data.email)
        ) if updated_data.email else (
            Patient.phone == updated_data.phone
        )
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail="Phone or email already belongs to another patient"
        )

    for key, value in updated_data.model_dump().items():
        setattr(patient, key, value)

    try:
        db.commit()
        db.refresh(patient)
        return patient

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Patient update failed"
        )


# DELETE PATIENT

@app.delete("/patients/{patient_id}")
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id
    ).first()

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    try:
        db.delete(patient)
        db.commit()

        return {
            "message": "Patient deleted successfully"
        }

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Cannot delete patient. Related records may exist."
        )


# ==================================================
# DOCTOR APIs
# ==================================================

# CREATE DOCTOR

@app.post("/doctors", response_model=DoctorResponse)
def create_doctor(
    doctor: DoctorCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    existing_doctor = db.query(Doctor).filter(
        (Doctor.phone == doctor.phone) |
        (Doctor.email == doctor.email)
    ).first()

    if existing_doctor:
        raise HTTPException(
            status_code=400,
            detail="Doctor with this phone or email already exists"
        )

    new_doctor = Doctor(**doctor.model_dump())

    try:
        db.add(new_doctor)
        db.commit()
        db.refresh(new_doctor)
        return new_doctor

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Doctor creation failed"
        )


# GET ALL DOCTORS

@app.get("/doctors", response_model=list[DoctorResponse])
def get_all_doctors(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    return db.query(Doctor).all()


# GET DOCTOR BY ID

@app.get("/doctors/{doctor_id}", response_model=DoctorResponse)
def get_doctor(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    doctor = db.query(Doctor).filter(
        Doctor.id == doctor_id
    ).first()

    if doctor is None:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found"
        )

    return doctor


# UPDATE DOCTOR

@app.put("/doctors/{doctor_id}", response_model=DoctorResponse)
def update_doctor(
    doctor_id: int,
    updated_data: DoctorCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    doctor = db.query(Doctor).filter(
        Doctor.id == doctor_id
    ).first()

    if doctor is None:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found"
        )

    duplicate = db.query(Doctor).filter(
        Doctor.id != doctor_id,
        (
            (Doctor.phone == updated_data.phone) |
            (Doctor.email == updated_data.email)
        )
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail="Phone or email already belongs to another doctor"
        )

    for key, value in updated_data.model_dump().items():
        setattr(doctor, key, value)

    try:
        db.commit()
        db.refresh(doctor)
        return doctor

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Doctor update failed"
        )


# DELETE DOCTOR

@app.delete("/doctors/{doctor_id}")
def delete_doctor(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    doctor = db.query(Doctor).filter(
        Doctor.id == doctor_id
    ).first()

    if doctor is None:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found"
        )

    try:
        db.delete(doctor)
        db.commit()

        return {
            "message": "Doctor deleted successfully"
        }

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Cannot delete doctor. Related records may exist."
        )



# ==================================================
# APPOINTMENT APIs
# ==================================================

# CREATE APPOINTMENT

@app.post("/appointments", response_model=AppointmentResponse)
def create_appointment(
    appointment: AppointmentCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    patient = db.query(Patient).filter(
        Patient.id == appointment.patient_id
    ).first()

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    doctor = db.query(Doctor).filter(
        Doctor.id == appointment.doctor_id
    ).first()

    if doctor is None:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found"
        )

    new_appointment = Appointment(**appointment.model_dump())

    try:
        db.add(new_appointment)
        db.commit()
        db.refresh(new_appointment)
        return new_appointment

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Appointment booking failed"
        )


# GET ALL APPOINTMENTS

@app.get("/appointments", response_model=list[AppointmentResponse])
def get_all_appointments(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    return db.query(Appointment).all()


# GET APPOINTMENT BY ID

@app.get(
    "/appointments/{appointment_id}",
    response_model=AppointmentResponse
)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id
    ).first()

    if appointment is None:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    return appointment


# UPDATE APPOINTMENT

@app.put(
    "/appointments/{appointment_id}",
    response_model=AppointmentResponse
)
def update_appointment(
    appointment_id: int,
    updated_data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id
    ).first()

    if appointment is None:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    patient = db.query(Patient).filter(
        Patient.id == updated_data.patient_id
    ).first()

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    doctor = db.query(Doctor).filter(
        Doctor.id == updated_data.doctor_id
    ).first()

    if doctor is None:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found"
        )

    for key, value in updated_data.model_dump().items():
        setattr(appointment, key, value)

    try:
        db.commit()
        db.refresh(appointment)
        return appointment

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Appointment update failed"
        )


# DELETE APPOINTMENT

@app.delete("/appointments/{appointment_id}")
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id
    ).first()

    if appointment is None:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    try:
        db.delete(appointment)
        db.commit()

        return {
            "message": "Appointment deleted successfully"
        }

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Appointment deletion failed"
        )



# ==================================================
# MEDICAL RECORD APIs
# ==================================================

# CREATE MEDICAL RECORD

@app.post(
    "/medical-records",
    response_model=MedicalRecordResponse
)
def create_medical_record(
    record: MedicalRecordCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    patient = db.query(Patient).filter(
        Patient.id == record.patient_id
    ).first()

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    doctor = db.query(Doctor).filter(
        Doctor.id == record.doctor_id
    ).first()

    if doctor is None:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found"
        )

    new_record = MedicalRecord(**record.model_dump())

    try:
        db.add(new_record)
        db.commit()
        db.refresh(new_record)
        return new_record

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Medical record creation failed"
        )


# GET ALL MEDICAL RECORDS

@app.get(
    "/medical-records",
    response_model=list[MedicalRecordResponse]
)
def get_all_medical_records(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    return db.query(MedicalRecord).order_by(
        MedicalRecord.id.desc()
    ).all()


# GET MEDICAL RECORD BY ID

@app.get(
    "/medical-records/{record_id}",
    response_model=MedicalRecordResponse
)
def get_medical_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    record = db.query(MedicalRecord).filter(
        MedicalRecord.id == record_id
    ).first()

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found"
        )

    return record


# UPDATE MEDICAL RECORD

@app.put(
    "/medical-records/{record_id}",
    response_model=MedicalRecordResponse
)
def update_medical_record(
    record_id: int,
    updated_data: MedicalRecordCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    record = db.query(MedicalRecord).filter(
        MedicalRecord.id == record_id
    ).first()

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found"
        )

    patient = db.query(Patient).filter(
        Patient.id == updated_data.patient_id
    ).first()

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    doctor = db.query(Doctor).filter(
        Doctor.id == updated_data.doctor_id
    ).first()

    if doctor is None:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found"
        )

    for key, value in updated_data.model_dump().items():
        setattr(record, key, value)

    try:
        db.commit()
        db.refresh(record)
        return record

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Medical record update failed"
        )


# DELETE MEDICAL RECORD

@app.delete("/medical-records/{record_id}")
def delete_medical_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    record = db.query(MedicalRecord).filter(
        MedicalRecord.id == record_id
    ).first()

    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Medical record not found"
        )

    try:
        db.delete(record)
        db.commit()

        return {
            "message": "Medical record deleted successfully"
        }

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Medical record deletion failed"
        )


# ==================================================
# BILLING APIs
# ==================================================

# HELPER: VALIDATE PATIENT AND DOCTOR

def validate_billing_relations(patient_id, doctor_id, db):
    patient = db.query(Patient).filter(
        Patient.id == patient_id
    ).first()

    if patient is None:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    doctor = db.query(Doctor).filter(
        Doctor.id == doctor_id
    ).first()

    if doctor is None:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found"
        )


# HELPER: VALIDATE PAYMENT STATUS

def validate_payment_status(status):
    allowed_statuses = ["Paid", "Pending", "Unpaid"]

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Payment status must be Paid, Pending, or Unpaid"
        )


# CREATE BILL

@app.post("/billings", response_model=BillingResponse)
def create_billing(
    billing: BillingCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    validate_billing_relations(
        billing.patient_id,
        billing.doctor_id,
        db
    )

    validate_payment_status(billing.payment_status)

    total_amount = (
        billing.consultation_fee
        + billing.medicine_charges
        + billing.other_charges
    )

    new_bill = Billing(
        patient_id=billing.patient_id,
        doctor_id=billing.doctor_id,
        consultation_fee=billing.consultation_fee,
        medicine_charges=billing.medicine_charges,
        other_charges=billing.other_charges,
        total_amount=total_amount,
        payment_status=billing.payment_status
    )

    try:
        db.add(new_bill)
        db.commit()
        db.refresh(new_bill)
        return new_bill

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Bill creation failed"
        )


# GET ALL BILLS

@app.get("/billings", response_model=list[BillingResponse])
def get_all_billings(
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    return db.query(Billing).order_by(
        Billing.id.desc()
    ).all()


# GET BILL BY ID

@app.get("/billings/{bill_id}", response_model=BillingResponse)
def get_billing(
    bill_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    bill = db.query(Billing).filter(
        Billing.id == bill_id
    ).first()

    if bill is None:
        raise HTTPException(
            status_code=404,
            detail="Bill not found"
        )

    return bill


# UPDATE BILL

@app.put("/billings/{bill_id}", response_model=BillingResponse)
def update_billing(
    bill_id: int,
    updated_data: BillingCreate,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    bill = db.query(Billing).filter(
        Billing.id == bill_id
    ).first()

    if bill is None:
        raise HTTPException(
            status_code=404,
            detail="Bill not found"
        )

    validate_billing_relations(
        updated_data.patient_id,
        updated_data.doctor_id,
        db
    )

    validate_payment_status(updated_data.payment_status)

    total_amount = (
        updated_data.consultation_fee
        + updated_data.medicine_charges
        + updated_data.other_charges
    )

    bill.patient_id = updated_data.patient_id
    bill.doctor_id = updated_data.doctor_id
    bill.consultation_fee = updated_data.consultation_fee
    bill.medicine_charges = updated_data.medicine_charges
    bill.other_charges = updated_data.other_charges
    bill.total_amount = total_amount
    bill.payment_status = updated_data.payment_status

    try:
        db.commit()
        db.refresh(bill)
        return bill

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Bill update failed"
        )


# DELETE BILL

@app.delete("/billings/{bill_id}")
def delete_billing(
    bill_id: int,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin)
):
    bill = db.query(Billing).filter(
        Billing.id == bill_id
    ).first()

    if bill is None:
        raise HTTPException(
            status_code=404,
            detail="Bill not found"
        )

    try:
        db.delete(bill)
        db.commit()

        return {
            "message": "Bill deleted successfully"
        }

    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Bill deletion failed"
        )
