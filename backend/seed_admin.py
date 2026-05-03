"""Seed RSN Admin user"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_rsn_admin():
    """Create or update the main RSN admin user"""
    
    # Main admin details
    admin_email = "idonateforneedy@gmail.com"
    admin_password = os.environ.get("ADMIN_PASSWORD", "RSN@Admin2026!")  # Read from env; fallback for local use
    
    print(f"🔐 Setting up RSN Admin: {admin_email}")
    
    # Check if admin already exists
    existing_admin = await db.users.find_one({"email": admin_email}, {"_id": 0})
    
    if existing_admin:
        print("⚠️  Admin already exists. Updating admin privileges...")
        # Update existing user to be main admin
        await db.users.update_one(
            {"email": admin_email},
            {
                "$set": {
                    "role": "admin",
                    "is_main_admin": True,
                    "is_co_admin": False,
                    "can_manage_admins": True,
                    "password_hash": pwd_context.hash(admin_password)
                }
            }
        )
        print(f"✅ Admin privileges updated for {admin_email}")
    else:
        # Create new admin user
        admin_user = {
            "id": "admin-main-rsn",
            "email": admin_email,
            "name": "RSN Admin",
            "picture": None,
            "photo_url": None,
            "role": "admin",
            "password_hash": pwd_context.hash(admin_password),
            "state": "TS",
            "user_code": "RSN-ADMIN-00001",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_main_admin": True,
            "is_co_admin": False,
            "can_manage_admins": True,
            "invite_token": None,
            "invite_expires_at": None,
            "availability_status": "available",
            "unavailable_from": None,
            "unavailable_to": None
        }
        
        await db.users.insert_one(admin_user)
        print(f"✅ Main RSN Admin created: {admin_email}")
    
    print("\n" + "="*60)
    print("RSN ADMIN LOGIN CREDENTIALS:")
    print("="*60)
    print(f"Email: {admin_email}")
    print(f"Password: {admin_password}")
    print(f"Role: RSN/Admin")
    print("="*60)
    print("\n⚠️  IMPORTANT: Please change the password after first login!")
    print("\n✨ Admin setup complete!")

if __name__ == "__main__":
    asyncio.run(seed_rsn_admin())
