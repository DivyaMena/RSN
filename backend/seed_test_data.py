"""Seed comprehensive test data for Rising Stars Nation"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone, timedelta
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def clear_existing_data():
    """Clear existing test data"""
    print("🧹 Clearing existing data...")
    await db.users.delete_many({})
    await db.user_sessions.delete_many({})
    await db.students.delete_many({})
    await db.tutors.delete_many({})
    await db.batches.delete_many({})
    await db.batch_tutor_assignments.delete_many({})
    await db.logboard_entries.delete_many({})
    print("✅ Data cleared")

async def seed_test_data():
    """Seed comprehensive test data"""
    await clear_existing_data()
    
    print("\n📝 Creating test users...")
    
    # Create test users with sessions
    users_data = []
    sessions_data = []
    
    # 1. Parent User
    parent_user = {
        "id": "parent-test-001",
        "email": "parent@test.com",
        "name": "Rajesh Kumar (Parent)",
        "picture": "https://via.placeholder.com/150",
        "role": "parent",
        "state": "TS",
        "user_code": "RSN-TS-P-00001",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    parent_session = {
        "user_id": "parent-test-001",
        "session_token": "parent_test_token_2025",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    users_data.append(parent_user)
    sessions_data.append(parent_session)
    
    # 2. Tutor User 1
    tutor1_user = {
        "id": "tutor-test-001",
        "email": "tutor1@test.com",
        "name": "Priya Sharma (Tutor)",
        "picture": "https://via.placeholder.com/150",
        "role": "tutor",
        "state": "TS",
        "user_code": "RSN-TS-T-00001",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    tutor1_session = {
        "user_id": "tutor-test-001",
        "session_token": "tutor1_test_token_2025",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    users_data.append(tutor1_user)
    sessions_data.append(tutor1_session)
    
    # 3. Tutor User 2
    tutor2_user = {
        "id": "tutor-test-002",
        "email": "tutor2@test.com",
        "name": "Anil Reddy (Tutor)",
        "picture": "https://via.placeholder.com/150",
        "role": "tutor",
        "state": "TS",
        "user_code": "RSN-TS-T-00002",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    tutor2_session = {
        "user_id": "tutor-test-002",
        "session_token": "tutor2_test_token_2025",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    users_data.append(tutor2_user)
    sessions_data.append(tutor2_session)
    
    # 4. Coordinator User
    coordinator_user = {
        "id": "coordinator-test-001",
        "email": "coordinator@test.com",
        "name": "Lakshmi Devi (Coordinator)",
        "picture": "https://via.placeholder.com/150",
        "role": "coordinator",
        "state": "TS",
        "user_code": "RSN-TS-C-00001",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    coordinator_session = {
        "user_id": "coordinator-test-001",
        "session_token": "coordinator_test_token_2025",
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    users_data.append(coordinator_user)
    sessions_data.append(coordinator_session)
    
    # Insert users and sessions
    await db.users.insert_many(users_data)
    await db.user_sessions.insert_many(sessions_data)
    print(f"✅ Created {len(users_data)} test users with sessions")
    
    print("\n📚 Creating tutor profiles...")
    tutors_data = []
    
    # Tutor 1: Mathematics & Physics for classes 9-10 (APPROVED)
    tutor1_profile = {
        "id": "tutor-profile-001",
        "user_id": "tutor-test-001",
        "tutor_code": "RSN-TS-T-00001",
        "aadhaar_number": "123456789012",
        "board_preference": "TS",
        "current_address": "Hyderabad, Telangana",
        "pincode": "500001",
        "classes_can_teach": [9, 10],
        "subjects_can_teach": ["MAT", "PHY"],
        "available_days": ["Monday", "Wednesday", "Friday"],
        "status": "active",
        "approval_status": "approved",
        "availability_status": "available",
        "registration_timestamp": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    tutors_data.append(tutor1_profile)
    
    # Tutor 2: Science & Biology for classes 8-9 (APPROVED)
    tutor2_profile = {
        "id": "tutor-profile-002",
        "user_id": "tutor-test-002",
        "tutor_code": "RSN-TS-T-00002",
        "aadhaar_number": "987654321098",
        "board_preference": "TS",
        "current_address": "Warangal, Telangana",
        "pincode": "506001",
        "classes_can_teach": [8, 9],
        "subjects_can_teach": ["SCI", "BIO", "ENG"],
        "available_days": ["Tuesday", "Thursday", "Saturday"],
        "status": "active",
        "approval_status": "approved",
        "availability_status": "available",
        "registration_timestamp": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    tutors_data.append(tutor2_profile)
    
    print("\n🆕 Creating pending tutors for approval testing...")
    
    # Create 2 additional users for pending tutors
    pending_tutor1_user = {
        "id": "tutor-pending-001",
        "email": "pending1@test.com",
        "name": "Ravi Teja (Pending Tutor)",
        "picture": "https://via.placeholder.com/150",
        "role": "tutor",
        "state": "TS",
        "user_code": "RSN-TS-T-00003",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    pending_tutor2_user = {
        "id": "tutor-pending-002",
        "email": "pending2@test.com",
        "name": "Sneha Reddy (Pending Tutor)",
        "picture": "https://via.placeholder.com/150",
        "role": "tutor",
        "state": "AP",
        "user_code": "RSN-AP-T-00001",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_many([pending_tutor1_user, pending_tutor2_user])
    print("✅ Created pending tutor users")
    
    # Pending Tutor 1: English for classes 6-8 (PENDING APPROVAL)
    pending_tutor1_profile = {
        "id": "tutor-profile-003",
        "user_id": "tutor-pending-001",
        "tutor_code": "RSN-TS-T-00003",
        "aadhaar_number": "111222333444",
        "board_preference": "TS",
        "current_address": "Karimnagar, Telangana",
        "pincode": "505001",
        "classes_can_teach": [6, 7, 8],
        "subjects_can_teach": ["ENG"],
        "available_days": ["Monday", "Tuesday", "Friday"],
        "status": "pending",
        "approval_status": "pending",
        "availability_status": "available",
        "registration_timestamp": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    tutors_data.append(pending_tutor1_profile)
    
    # Pending Tutor 2: All subjects for classes 9-10 (PENDING APPROVAL)
    pending_tutor2_profile = {
        "id": "tutor-profile-004",
        "user_id": "tutor-pending-002",
        "tutor_code": "RSN-AP-T-00001",
        "aadhaar_number": "555666777888",
        "board_preference": "AP",
        "current_address": "Vijayawada, Andhra Pradesh",
        "pincode": "520001",
        "classes_can_teach": [9, 10],
        "subjects_can_teach": ["MAT", "PHY", "SCI", "BIO", "ENG"],
        "available_days": ["Wednesday", "Thursday", "Saturday", "Sunday"],
        "status": "pending",
        "approval_status": "pending",
        "availability_status": "available",
        "registration_timestamp": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    tutors_data.append(pending_tutor2_profile)
    
    await db.tutors.insert_many(tutors_data)
    print(f"✅ Created {len(tutors_data)} tutor profiles")
    
    print("\n👨‍👩‍👧‍👦 Creating students...")
    students_data = []
    
    # Create 15 students (to trigger batch creation - need 10 minimum)
    student_names = [
        "Aarav Patel", "Ananya Singh", "Arjun Kumar", "Diya Sharma", "Ishaan Reddy",
        "Kavya Nair", "Krishna Rao", "Meera Gupta", "Rohan Verma", "Saanvi Kapoor",
        "Sai Prasad", "Tanvi Joshi", "Vihaan Desai", "Yash Mehta", "Zara Khan"
    ]
    
    schools = ["Government High School Hyderabad", "Zilla Parishad School Warangal", "Municipal School Karimnagar"]
    locations = ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam"]
    
    for i, name in enumerate(student_names):
        student = {
            "id": f"student-test-{i+1:03d}",
            "parent_id": "parent-test-001",
            "name": name,
            "student_code": f"RSN-TS-S-2025-{10000 + i + 1}",
            "class_level": 9,  # All in class 9 to create batches
            "board": "TS",
            "school_name": random.choice(schools),
            "location": random.choice(locations),
            "roll_no": f"TS09/{i+1:03d}/2025",
            "subjects": ["MAT", "PHY", "SCI"],  # Common subjects to trigger batch creation
            "enrollment_year": 2025,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        students_data.append(student)
    
    await db.students.insert_many(students_data)
    print(f"✅ Created {len(students_data)} students")
    
    print("\n🎓 Creating batches...")
    batches_data = []
    
    # Batch 1: Class 9 Mathematics (ACTIVE - 15 students)
    batch1 = {
        "id": "batch-test-001",
        "batch_code": "RSN-TS-2025-26-C9-MAT-001",
        "state": "TS",
        "academic_year": "2025-26",
        "class_level": 9,
        "subject": "MAT",
        "board": "TS",
        "student_ids": [s["id"] for s in students_data],
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    batches_data.append(batch1)
    
    # Batch 2: Class 9 Physics (ACTIVE - 15 students)
    batch2 = {
        "id": "batch-test-002",
        "batch_code": "RSN-TS-2025-26-C9-PHY-002",
        "state": "TS",
        "academic_year": "2025-26",
        "class_level": 9,
        "subject": "PHY",
        "board": "TS",
        "student_ids": [s["id"] for s in students_data],
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    batches_data.append(batch2)
    
    # Batch 3: Class 9 Science (ACTIVE - 12 students)
    batch3 = {
        "id": "batch-test-003",
        "batch_code": "RSN-TS-2025-26-C9-SCI-003",
        "state": "TS",
        "academic_year": "2025-26",
        "class_level": 9,
        "subject": "SCI",
        "board": "TS",
        "student_ids": [s["id"] for s in students_data[:12]],
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    batches_data.append(batch3)
    
    # Batch 4: Class 10 Mathematics (WAITLIST - 8 students)
    batch4 = {
        "id": "batch-test-004",
        "batch_code": "RSN-TS-2025-26-C10-MAT-004",
        "state": "TS",
        "academic_year": "2025-26",
        "class_level": 10,
        "subject": "MAT",
        "board": "TS",
        "student_ids": ["student-test-001", "student-test-002", "student-test-003"],
        "status": "waitlist",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    batches_data.append(batch4)
    
    await db.batches.insert_many(batches_data)
    print(f"✅ Created {len(batches_data)} batches")
    
    print("\n👥 Assigning tutors to batches...")
    assignments_data = []
    
    # Assign Tutor 1 (Priya) to Math batch - Monday, Wednesday, Friday
    assignment1 = {
        "id": "assignment-001",
        "batch_id": "batch-test-001",
        "tutor_id": "tutor-profile-001",
        "assigned_days": ["Monday", "Wednesday", "Friday"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    assignments_data.append(assignment1)
    
    # Assign Tutor 1 (Priya) to Physics batch - Monday, Wednesday, Friday
    assignment2 = {
        "id": "assignment-002",
        "batch_id": "batch-test-002",
        "tutor_id": "tutor-profile-001",
        "assigned_days": ["Monday", "Wednesday", "Friday"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    assignments_data.append(assignment2)
    
    # Assign Tutor 2 (Anil) to Science batch - Tuesday, Thursday, Saturday
    assignment3 = {
        "id": "assignment-003",
        "batch_id": "batch-test-003",
        "tutor_id": "tutor-profile-002",
        "assigned_days": ["Tuesday", "Thursday", "Saturday"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    assignments_data.append(assignment3)
    
    await db.batch_tutor_assignments.insert_many(assignments_data)
    print(f"✅ Created {len(assignments_data)} tutor assignments")
    
    print("\n📋 Creating log board entries...")
    log_entries_data = []
    
    # Get curriculum for references
    math_curriculum = await db.curriculum.find({"board": "TS", "class_level": 9, "subject": "MAT"}).to_list(None)
    physics_curriculum = await db.curriculum.find({"board": "TS", "class_level": 9, "subject": "PHY"}).to_list(None)
    
    # Log Entry 1: Math class by Priya (3 days ago)
    entry1 = {
        "id": "log-entry-001",
        "batch_id": "batch-test-001",
        "tutor_id": "tutor-profile-001",
        "tutor_name": "Priya Sharma (Tutor)",
        "date": (datetime.now(timezone.utc) - timedelta(days=3)).strftime("%Y-%m-%d"),
        "topic_covered": "Number Systems - Rational and Irrational Numbers",
        "curriculum_items": [math_curriculum[0]["id"]] if math_curriculum else [],
        "google_meet_link": "https://meet.google.com/abc-defg-hij",
        "notes": "Covered basic concepts of rational numbers. Students asked good questions about decimal expansions.",
        "is_locked": True,
        "created_at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    }
    log_entries_data.append(entry1)
    
    # Log Entry 2: Math class by Priya (1 day ago)
    entry2 = {
        "id": "log-entry-002",
        "batch_id": "batch-test-001",
        "tutor_id": "tutor-profile-001",
        "tutor_name": "Priya Sharma (Tutor)",
        "date": (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d"),
        "topic_covered": "Polynomials - Introduction and Basic Operations",
        "curriculum_items": [math_curriculum[1]["id"]] if len(math_curriculum) > 1 else [],
        "google_meet_link": "https://meet.google.com/xyz-abcd-efg",
        "notes": "Introduced polynomials, covered addition and subtraction. Need more practice on factorization.",
        "is_locked": True,
        "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    }
    log_entries_data.append(entry2)
    
    # Log Entry 3: Physics class by Priya (2 days ago)
    entry3 = {
        "id": "log-entry-003",
        "batch_id": "batch-test-002",
        "tutor_id": "tutor-profile-001",
        "tutor_name": "Priya Sharma (Tutor)",
        "date": (datetime.now(timezone.utc) - timedelta(days=2)).strftime("%Y-%m-%d"),
        "topic_covered": "Motion - Speed, Velocity and Acceleration",
        "curriculum_items": [physics_curriculum[0]["id"]] if physics_curriculum else [],
        "google_meet_link": "https://meet.google.com/physics-class-001",
        "notes": "Explained difference between speed and velocity with real-life examples. Students enjoyed the discussion.",
        "is_locked": True,
        "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    }
    log_entries_data.append(entry3)
    
    # Log Entry 4: Upcoming Math class (today)
    entry4 = {
        "id": "log-entry-004",
        "batch_id": "batch-test-001",
        "tutor_id": "tutor-profile-001",
        "tutor_name": "Priya Sharma (Tutor)",
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "topic_covered": "Linear Equations in Two Variables",
        "curriculum_items": [math_curriculum[2]["id"]] if len(math_curriculum) > 2 else [],
        "google_meet_link": "https://meet.google.com/todays-math-class",
        "notes": "Today's class at 5:00 PM - We'll cover graphical solutions",
        "is_locked": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    log_entries_data.append(entry4)
    
    await db.logboard_entries.insert_many(log_entries_data)
    print(f"✅ Created {len(log_entries_data)} log board entries")
    
    print("\n" + "="*60)
    print("🎉 TEST DATA SEEDED SUCCESSFULLY!")
    print("="*60)
    print("\n📌 TEST USER CREDENTIALS:\n")
    
    print("1️⃣  PARENT LOGIN:")
    print("   Email: parent@test.com")
    print("   Session Token: parent_test_token_2025")
    print("   Direct Link: Add ?test_token=parent_test_token_2025 to URL")
    
    print("\n2️⃣  TUTOR 1 LOGIN (Priya - Math & Physics):")
    print("   Email: tutor1@test.com")
    print("   Session Token: tutor1_test_token_2025")
    
    print("\n3️⃣  TUTOR 2 LOGIN (Anil - Science & Biology):")
    print("   Email: tutor2@test.com")
    print("   Session Token: tutor2_test_token_2025")
    
    print("\n4️⃣  COORDINATOR LOGIN:")
    print("   Email: coordinator@test.com")
    print("   Session Token: coordinator_test_token_2025")
    
    print("\n" + "="*60)
    print("📊 DATA SUMMARY:")
    print("="*60)
    print(f"✅ Users: {len(users_data)}")
    print(f"✅ Students: {len(students_data)}")
    print(f"✅ Tutors: {len(tutors_data)}")
    print(f"✅ Batches: {len(batches_data)}")
    print(f"   - Active: 3 batches (Math, Physics, Science)")
    print(f"   - Waitlist: 1 batch (needs 10 students)")
    print(f"✅ Tutor Assignments: {len(assignments_data)}")
    print(f"✅ Log Board Entries: {len(log_entries_data)}")
    print(f"✅ Curriculum Items: 36+ (pre-seeded)")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_test_data())
