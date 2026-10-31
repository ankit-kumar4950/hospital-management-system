
# Hospital Management System

A full-stack Hospital Management System built using React, FastAPI and PostgreSQL.

## Features

- Admin Login and Logout
- JWT Authentication
- Dashboard with hospital statistics
- Patient Management (CRUD)
- Doctor Management (CRUD)
- Appointment Management (CRUD)
- Billing and Invoice PDF
- Medical Records Management
- PDF Reports Export
- Search and Form Validation

## Technologies Used

### Frontend
- React
- Vite
- JavaScript
- CSS
- Lucide React
- jsPDF

### Backend
- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- JWT Authentication
- Argon2 Password Hashing

## Project Structure

```text
Hospital-Management-System/
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   ├── auth.py
│   ├── create_admin.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   └── package.json
├── .gitignore
└── README.md
```

## Requirements

- Python
- Node.js and npm
- PostgreSQL
- VS Code

## Backend Setup

Open terminal:

```powershell
cd backend
```

Activate virtual environment from project root:

```powershell
..\.venv\Scripts\Activate.ps1
```

Install packages:

```powershell
python -m pip install -r requirements.txt
```

Start backend:

```powershell
python -m uvicorn main:app --reload
```

Backend URL: http://127.0.0.1:8000

API Documentation: http://127.0.0.1:8000/docs

## Frontend Setup

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL: http://localhost:5173

## Environment Variables

Create a `.env` file inside the backend folder.

Add your own database connection settings and a strong SECRET_KEY.

Never upload `.env` or real credentials to GitHub.

## Admin Account

Create or reset the admin account using the appropriate backend script.

Do not store admin passwords in this README.

## Database

Create a PostgreSQL database named `hospital_db` and configure its connection in the backend `.env` file.
