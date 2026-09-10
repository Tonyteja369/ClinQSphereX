import os
from sqlmodel import Session, select
from app.db import engine
from app.models import User
from app.auth import hash_password

def seed_admin():
    admin_email = os.getenv("ADMIN_USER")
    admin_pass = os.getenv("ADMIN_PASS")
    if not admin_email or not admin_pass:
        print("No admin credentials provided in env; skipping admin seed.")
        return
    with Session(engine) as session:
        exists = session.exec(select(User).where(User.email == admin_email)).first()
        if exists:
            print("Admin exists; skipping seed.")
            return
        user = User(email=admin_email, hashed_password=hash_password(admin_pass), role="admin")
        session.add(user); session.commit()
        print(f"Seeded admin user {admin_email}")

if __name__ == "__main__":
    seed_admin()
