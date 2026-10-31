
from getpass import getpass

from database import Base, engine, SessionLocal
from models import Admin
from auth import hash_password

# Create any missing database tables
Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    username = input("Enter admin username: ").strip()
    email = input("Enter admin email: ").strip()

    if not username or not email:
        print("Username and email cannot be empty.")
    elif db.query(Admin).filter(
        (Admin.username == username) | (Admin.email == email)
    ).first():
        print("An admin with this username or email already exists.")
    else:
        password = getpass("Enter admin password: ")
        confirm_password = getpass("Confirm admin password: ")

        if len(password) < 12:
            print("Password must be at least 12 characters.")
        elif password != confirm_password:
            print("Passwords do not match.")
        else:
            new_admin = Admin(
                username=username,
                email=email,
                hashed_password=hash_password(password),
                is_active=1
            )

            db.add(new_admin)
            db.commit()

            print("Admin account created successfully!")

except Exception as error:
    db.rollback()
    print("Admin creation failed:", error)

finally:
    db.close()
