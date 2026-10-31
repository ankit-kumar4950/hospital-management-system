import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker, declarative_base

# Load environment variables from backend/.env
load_dotenv()

# Database connection configuration
DATABASE_URL = URL.create(
    drivername="postgresql+psycopg",
    username=os.getenv("DB_USER", "postgres"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", "5432")),
    database=os.getenv("DB_NAME", "hospital_db"),
)

# Conditional SSL configuration:
# Local PostgreSQL: DB_SSLMODE is not set, so SSL is not forced.
# Neon PostgreSQL: Set DB_SSLMODE=require in Render environment variables.
DB_SSLMODE = os.getenv("DB_SSLMODE")

connect_args = {}

if DB_SSLMODE:
    connect_args["sslmode"] = DB_SSLMODE

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

# Create database session
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Base class for SQLAlchemy models
Base = declarative_base()
