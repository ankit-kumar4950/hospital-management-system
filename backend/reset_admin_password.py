
from getpass import getpass

from database import SessionLocal
from models import Admin
from auth import hash_password

db = SessionLocal()

try:
    admin = db.query(Admin).filter(
        Admin.username == "ankit"
    ).first()

    if not admin:
        print("Admin account 'ankit' not found.")
    else:
        password = getpass("Enter new password: ")
        confirm_password = getpass("Confirm new password: ")

        if len(password) < 12:
            print("Password must be at least 12 characters.")
        elif password != confirm_password:
            print("Passwords do not match.")
        else:
            admin.hashed_password = hash_password(password)
            db.commit()
            print("Password for admin 'ankit' reset successfully!")

except Exception as error:
    db.rollback()
    print("Password reset failed:", error)

finally:
    db.close()
