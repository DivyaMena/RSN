from fastapi import FastAPI, APIRouter, HTTPException, Response, Cookie, Request, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import random
import requests
from passlib.context import CryptContext
from subject_config import get_subjects_for_class, is_valid_subject_for_class, SUBJECT_NAMES
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============= MODELS =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    picture: Optional[str] = None
    photo_url: Optional[str] = None  # User photo/selfie upload
    role: str  # parent, tutor, coordinator, admin, student, school
    password_hash: Optional[str] = None  # For email/password login
    state: Optional[str] = None  # TS, AP, TN
    user_code: Optional[str] = None  # RSN-TS-T-12345 or RSN-TS-P-12345
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Admin-specific fields
    is_main_admin: bool = False  # True only for main RSN admin
    is_co_admin: bool = False  # True for co-admins
    can_manage_admins: bool = False  # True for main admin, False for co-admins
    invite_token: Optional[str] = None  # For co-admin invites
    invite_expires_at: Optional[datetime] = None  # Invite expiration

    availability_status: Optional[str] = None  # for coordinator/admin availability
    unavailable_from: Optional[str] = None
    unavailable_to: Optional[str] = None
    last_profile_update: Optional[datetime] = None  # Track when profile choices were last updated (for coordinator/parent)
    
    # Parent/Coordinator editable fields
    phone_number: Optional[str] = None
    location: Optional[str] = None
    alternate_phone: Optional[str] = None

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Student(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    parent_id: str
    name: str
    student_code: str  # RSN-TS-S-2025-12345
    aadhaar_number: str  # 12-digit Aadhaar
    dob: Optional[str] = None  # Date of birth (used as password for student login)
    photo_url: Optional[str] = None  # Student photo/selfie
    class_level: int  # 6-10
    board: str  # TS, AP, TN
    school_name: str
    location: str
    roll_no: str
    subjects: List[str]  # ["MAT", "PHY", "SCI", "BIO", "ENG"]
    enrollment_year: int
    user_id: Optional[str] = None  # Linked user account for student login
    last_profile_update: Optional[datetime] = None  # Track when profile choices were last updated
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Tutor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    tutor_code: str  # RSN-TS-T-12345
    aadhaar_number: str  # 12-digit Aadhaar for KYC (or file path)
    aadhaar_page1_url: Optional[str] = None  # Aadhaar card page 1 upload
    aadhaar_page2_url: Optional[str] = None  # Aadhaar card page 2 upload (optional)
    photo_url: Optional[str] = None  # Tutor photo/selfie
    about_yourself: Optional[str] = None

    board_preference: str  # Which board they want to teach (TS, AP, TN)
    current_address: Optional[str] = None
    pincode: Optional[str] = None
    classes_can_teach: List[int]  # [6,7,8,9,10]
    subjects_can_teach: List[str]  # ["MAT", "PHY", "SCI", "BIO", "ENG"]
    available_days: List[str]  # ["Monday", "Tuesday", etc]
    status: str = "pending"  # pending, active, suspended, blacklisted, unavailable
    approval_status: str = "pending"  # pending, approved, rejected
    availability_status: str = "available"  # available, unavailable, not_interested
    unavailable_from: Optional[str] = None
    unavailable_to: Optional[str] = None
    last_profile_update: Optional[datetime] = None  # Track when profile choices were last updated
    registration_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Batch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    batch_code: str  # RSN-TS-2025-26-C9-MAT-123
    state: str
    academic_year: str  # 2025-26
    class_level: int
    subject: str
    board: str
    student_ids: List[str] = Field(default_factory=list)
    status: str = "waitlist"  # waitlist, active, full
    schedule_slots: List["AssignedSlot"] = Field(default_factory=list)  # global schedule for this batch
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AssignedSlot(BaseModel):
    day: str  # e.g. "Monday"
    slot: str  # "17:00-18:00" or "18:00-19:00"


class BatchTutorAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    batch_id: str
    tutor_id: str
    assigned_days: List[str]  # ["Monday", "Wednesday"]
    assigned_slots: List["AssignedSlot"] = Field(default_factory=list)  # detailed day/slot schedule
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LogBoardEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    batch_id: str
    tutor_id: str
    tutor_name: str
    date: str  # ISO date string
    topic_covered: str
    curriculum_items: List[str]  # List of curriculum item IDs covered
    google_meet_link: str
    notes: Optional[str] = None
    sessions_count: int = 1  # Number of sessions for this topic (for multi-class lessons)
    is_locked: bool = True  # Locked by default after creation
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # User ID who created this entry

class Attendance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    batch_id: str
    log_entry_id: str
    date: str  # ISO date string
    status: str  # present, absent, late
    marked_by: Optional[str] = None  # tutor_id who marked
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RemedialRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    batch_id: str
    subject: str
    class_level: int
    board: str
    reason: str  # "missed_class" or "need_clarification"
    topic: str
    description: Optional[str] = None
    status: str = "pending"  # pending, pooled, assigned, completed
    requested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RemedialClass(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    class_code: str  # RSN-TS-REMEDIAL-C9-MAT-001
    subject: str
    class_level: int
    board: str
    topic: str
    student_ids: List[str]  # Students in this remedial class
    request_ids: List[str]  # Remedial requests fulfilled
    tutor_id: Optional[str] = None
    scheduled_date: Optional[str] = None
    google_meet_link: Optional[str] = None
    status: str = "pending"  # pending, scheduled, completed
    created_by: str  # coordinator user_id
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CurriculumItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    board: str  # TS, AP
    class_level: int
    subject: str
    topic_number: int
    topic_name: str
    description: Optional[str] = None

class CoordinatorAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    coordinator_id: str
    assignment_type: str  # "class", "class_subject", "batch_range"
    class_level: Optional[int] = None  # For class and class_subject types
    subject: Optional[str] = None  # For class_subject type
    batch_start: Optional[str] = None  # For batch_range type (e.g., "MAT-001")
    batch_end: Optional[str] = None  # For batch_range type (e.g., "MAT-020")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # Admin user ID

class SchoolTutorAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_id: str
    tutor_id: str
    assigned_subjects: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # Admin user ID

class School(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    school_name: str
    principal_name: str
    email: EmailStr
    phone: str
    alternate_phone: Optional[str] = None
    address: str
    city: str
    state: str
    state_board: str  # Which board (TS, AP, etc.)
    pincode: str
    class_from: int  # Starting class (1-10)
    class_to: int    # Ending class (1-10)
    school_board_pic: Optional[str] = None  # Image URL/path
    location_url: Optional[str] = None  # Google Maps link
    tutors_required_subjects: List[str] = Field(default_factory=list)  # MAT, SCI, ENG, etc.
    preferred_days: List[str] = Field(default_factory=list)  # Mon, Tue, etc.
    time_schedule: Optional[dict] = None  # {"class_6": {"MAT": "10:00-11:00"}}
    terms_accepted: bool = False
    approval_status: str = "pending"  # pending, approved, rejected
    approved_by: Optional[str] = None  # Coordinator ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StateBoard(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "Telangana State Board"
    code: str  # e.g., "TS"
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============= INPUT MODELS =============

class LoginInput(BaseModel):
    email: EmailStr
    password: str
    role: str  # student, parent, tutor, coordinator, school, admin

class RegisterParentInput(BaseModel):
    state: str

class RegisterCoordinatorInput(BaseModel):
    state: str
    name: str
    address: str
    mobile: str
    altMobile: Optional[str] = None
    pincode: str
    languages: List[str]
    selfie_url: Optional[str] = None
    aadhaar_url: Optional[str] = None

class RegisterTutorInput(BaseModel):
    aadhaar_number: str
    board_preference: str  # Which board curriculum they want to teach
    current_address: str
    pincode: str
    about_yourself: Optional[str] = None
    classes_can_teach: List[int]
    subjects_can_teach: List[str]
    available_days: List[str]
    available_slots: List[str]

class RegisterStudentInput(BaseModel):
    name: str
    aadhaar_number: str
    class_level: int
    dob: Optional[str] = None
    board: str
    school_name: str
    location: str
    roll_no: str
    subjects: List[str]
    enrollment_year: int
    create_login: bool = False  # Whether to create separate login for student

class CreateLogEntryInput(BaseModel):
    batch_id: str
    date: str
    topic_covered: str
    curriculum_items: List[str]
    google_meet_link: str
    notes: Optional[str] = None
    sessions_count: int = 1

class CreateRemedialRequestInput(BaseModel):
    batch_id: str
    reason: str  # "missed_class" or "need_clarification"
    topic: str
    description: Optional[str] = None

class JoinClassAttendanceInput(BaseModel):
    batch_id: str
    log_entry_id: str

class MarkAttendanceInput(BaseModel):
    student_id: str
    log_entry_id: str
    status: str  # present, absent, late

class UpdateLogEntryInput(BaseModel):
    topic_covered: Optional[str] = None
    curriculum_items: Optional[List[str]] = None
    google_meet_link: Optional[str] = None
    notes: Optional[str] = None

class AssignTutorInput(BaseModel):
    batch_id: str
    tutor_id: str
    assigned_days: List[str]
    mode: Optional[str] = "assign"  # "assign" or "unassign"

class CoordinatorAvailabilityRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    coordinator_user_id: str
    request_type: str  # available, unavailable, delete_account
    unavailable_from: Optional[str] = None
    unavailable_to: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreateBatchInput(BaseModel):
    state: str
    academic_year: str
    class_level: int
    subject: str
    board: str

class BulkDeleteInput(BaseModel):
    ids: List[str]  # List of entity IDs to delete

class CreateStateBoardInput(BaseModel):
    name: str
    code: str
    description: Optional[str] = None

class UpdateStateBoardInput(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None

class RegisterSchoolInput(BaseModel):
    school_name: str
    principal_name: str
    email: EmailStr
    password: str
    phone: str
    alternate_phone: Optional[str] = None
    address: str
    city: str
    state: str
    state_board: str
    pincode: str
    class_from: int
    class_to: int
    school_board_pic: Optional[str] = None
    location_url: Optional[str] = None
    tutors_required_subjects: List[str]
    preferred_days: List[str]
    time_schedule: Optional[dict] = None
    terms_accepted: bool

# ============= HELPER FUNCTIONS =============

def generate_user_code(state: str, role: str) -> str:
    """Generate user code: RSN-{STATE}-{ROLE_LETTER}-{UID}"""
    role_letter = "T" if role == "tutor" else "P"
    uid = random.randint(1, 99999)
    return f"RSN-{state}-{role_letter}-{uid:05d}"

def generate_student_code(state: str, year: int) -> str:
    """Generate student code: RSN-{STATE}-S-{YEAR}-{UID}"""
    uid = random.randint(1, 99999)
    return f"RSN-{state}-S-{year}-{uid:05d}"

async def generate_batch_code(state: str, academic_year: str, class_level: int, subject: str) -> str:
    """Generate batch code: RSN-{STATE}-{ACAD_YEAR}-C{CLASS}-{SUBJECT}-{SERIAL}"""
    # Get last batch for this combination to generate sequential number
    prefix = f"RSN-{state}-{academic_year}-C{class_level}-{subject}-"
    last_batch = await db.batches.find_one(
        {"batch_code": {"$regex": f"^{prefix}"}},
        sort=[("batch_code", -1)]
    )
    
    if last_batch:
        # Extract serial number and increment
        last_serial = int(last_batch["batch_code"].split("-")[-1])
        serial = last_serial + 1
    else:
        serial = 1
    
    return f"{prefix}{serial:03d}"


SLOT_VALUES = ["17:00-18:00", "18:00-19:00"]

CLASS_DAYS = {
    6: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    7: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    8: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    9: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    10: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
}


def generate_schedule_slots_for_batch(class_level: int, subject: str, batch_code: str) -> List[AssignedSlot]:
    """Generate global schedule slots for a batch based on class & subject rules.

    - Class 6 & 7: 4 slots per subject per week (MAT, SCI, ENG)
    - Class 8 & 9: 3 slots per subject per week (MAT, PHY, BIO, ENG)
    - Class 10: MAT & PHY = 4 slots, BIO & ENG = 3 slots
    - Allowed days: Mon-Sat for 6-9, Mon-Sun for 10
    - No two consecutive slots on the same day for this batch
    - Random but stable per batch_code
    """
    import random

    allowed_days = CLASS_DAYS.get(class_level, CLASS_DAYS[6])

    # Determine slots per week based on rules
    if class_level in [6, 7]:
        slots_per_week = 4
    elif class_level in [8, 9]:
        slots_per_week = 3
    elif class_level == 10:
        if subject in ["MAT", "PHY"]:
            slots_per_week = 4
        else:
            slots_per_week = 3
    else:
        slots_per_week = 3

    # Seed from batch_code so pattern is stable per batch
    random.seed(batch_code)

    assigned: List[AssignedSlot] = []
    used_days = set()

    while len(assigned) < slots_per_week:
        day = random.choice(allowed_days)

        # Enforce at most ONE slot per day for this batch (no consecutive hours on same day)
        if day in used_days:
            continue

        slot = random.choice(SLOT_VALUES)
        used_days.add(day)
        assigned.append(AssignedSlot(day=day, slot=slot))

    return assigned

# ---------- Assigned slots logic (days & time slots) ----------

CLASS_DAYS = {
    6: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    7: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    8: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    9: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    10: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
}

SLOT_VALUES = ["17:00-18:00", "18:00-19:00"]


def _generate_assigned_slots_for_batch(class_level: int, subject: str, batch_code: str) -> List[AssignedSlot]:
    """Generate day+slot pairs for a batch based on class/subject rules.

    NOTE: This is a simplified version inspired by the examples shared (C10-MAT-001, etc.).
    It enforces:
    - Correct number of weekly slots per subject/class
    - Allowed days per class
    - No consecutive slots on the same day for the same batch
    """
    import random

    allowed_days = CLASS_DAYS.get(class_level, CLASS_DAYS[6])

    # How many slots per week
    if class_level in [6, 7]:
        slots_per_week = 4
    elif class_level in [8, 9]:
        slots_per_week = 3
    elif class_level == 10:
        if subject in ["MAT", "PHY"]:
            slots_per_week = 4
        else:  # BIO, ENG
            slots_per_week = 3
    else:
        slots_per_week = 3

    # Seed from batch_code so pattern is stable per batch
    random.seed(batch_code)

    assigned: List[AssignedSlot] = []
    used_day_slots = set()

    while len(assigned) < slots_per_week:
        day = random.choice(allowed_days)

        # Ensure we don't pick both slots on the same day for this batch
        existing_for_day = [s for s in assigned if s.day == day]
        if existing_for_day:
            # If one slot already used on this day, use the other slot or skip if both used
            remaining_slots = [s for s in SLOT_VALUES if s not in {es.slot for es in existing_for_day}]
            if not remaining_slots:
                continue
            slot = remaining_slots[0]
        else:
            slot = random.choice(SLOT_VALUES)

        key = (day, slot)
        if key in used_day_slots:
            continue
        used_day_slots.add(key)
        assigned.append(AssignedSlot(day=day, slot=slot))

    return assigned

async def get_current_user(request: Request) -> Optional[User]:
    """Get current user from session token (cookie or header)"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.replace("Bearer ", "")
    
    if not session_token:
        return None
    
    session = await db.user_sessions.find_one({"session_token": session_token})
    if not session:
        return None
    
    # Handle both timezone-aware and naive datetimes from MongoDB
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
    elif expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": session_token})
        return None
    
    # Check if this is a student session (user_id matches a student ID)
    student_doc = await db.students.find_one({"id": session["user_id"]}, {"_id": 0})
    if student_doc:
        # This is a student session - reconstruct User object from student data
        student = Student(**student_doc)
        parent_doc = await db.users.find_one({"id": student.parent_id}, {"_id": 0})
        parent_email = parent_doc["email"] if parent_doc else "student@risingstarsnation.com"
        
        return User(
            id=student.id,
            email=parent_email,
            name=student.name,
            role="student",
            state=student.board,
            user_code=student.student_code
        )
    
    # Regular user session
    user_doc = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        return None
    
    return User(**user_doc)

async def require_auth(request: Request) -> User:
    """Require authentication"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def send_log_entry_notification(log_entry: dict, batch: dict, tutor_name: str, tutor_email: str = None):
    """Send email notification to coordinators, students, and tutor when log entry is created"""
    try:
        # Get SMTP configuration from environment
        smtp_host = os.environ.get('SMTP_HOST')
        smtp_port = int(os.environ.get('SMTP_PORT', 587))
        smtp_user = os.environ.get('SMTP_USER')
        smtp_password = os.environ.get('SMTP_PASSWORD')
        email_from = os.environ.get('EMAIL_FROM')
        email_from_name = os.environ.get('EMAIL_FROM_NAME', 'Rising Stars Nation')
        
        if not all([smtp_host, smtp_user, smtp_password, email_from]):
            logging.error("Email configuration is incomplete")
            return
        
        # Get all coordinators
        coordinators = await db.users.find({"role": "coordinator"}, {"_id": 0}).to_list(None)
        coordinator_emails = [c["email"] for c in coordinators if c.get("email")]
        
        # Get all students in the batch
        student_ids = batch.get("student_ids", [])
        students = await db.students.find({"id": {"$in": student_ids}}, {"_id": 0}).to_list(None)
        
        # Get parent emails for students
        parent_user_ids = [s["parent_user_id"] for s in students if s.get("parent_user_id")]
        parents = await db.users.find({"id": {"$in": parent_user_ids}}, {"_id": 0}).to_list(None)
        parent_emails = [p["email"] for p in parents if p.get("email")]
        
        # Add tutor email to recipients
        tutor_emails = [tutor_email] if tutor_email else []
        
        # Combine all recipient emails
        all_recipients = list(set(coordinator_emails + parent_emails + tutor_emails))  # Remove duplicates
        
        if not all_recipients:
            logging.info("No recipients found for log entry notification")
            return
        
        # Format the date
        log_date = log_entry.get('date', 'N/A')
        if isinstance(log_date, str):
            try:
                log_date_obj = datetime.fromisoformat(log_date)
                log_date = log_date_obj.strftime('%B %d, %Y')
            except:
                pass
        
        # Create email content
        subject = f"New Class Log Entry by {tutor_name} - {batch['batch_code']}"
        
        # Format curriculum items
        curriculum_html = ""
        curriculum_items = log_entry.get('curriculum_items', [])
        if curriculum_items and isinstance(curriculum_items, list):
            curriculum_html = "<ul style='margin: 10px 0;'>"
            for item in curriculum_items:
                if isinstance(item, dict):
                    topic = item.get('topic', 'N/A')
                    description = item.get('description', 'N/A')
                    curriculum_html += f"<li style='margin: 5px 0;'>{topic}: {description}</li>"
            curriculum_html += "</ul>"
        
        html_body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }}
                .details {{ background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }}
                .footer {{ background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 10px 10px; }}
                h2 {{ margin: 0; font-size: 24px; }}
                .label {{ font-weight: bold; color: #4b5563; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>📚 New Class Log Entry</h2>
                </div>
                <div class="content">
                    <p>Dear Parent/Coordinator/Tutor,</p>
                    <p>A new log entry has been created by <strong>{tutor_name}</strong> for the following batch:</p>
                    
                    <div class="details">
                        <p><span class="label">Batch Code:</span> {batch['batch_code']}</p>
                        <p><span class="label">Subject:</span> {batch.get('subject', 'N/A')}</p>
                        <p><span class="label">Class:</span> {batch.get('class_level', 'N/A')}</p>
                        <p><span class="label">Board:</span> {batch.get('board', 'N/A')}</p>
                        <p><span class="label">Date:</span> {log_date}</p>
                        <p><span class="label">Topic Covered:</span> {log_entry.get('topic_covered', 'N/A')}</p>
                    </div>
                    
                    <div class="details">
                        <p class="label">Curriculum Items Covered:</p>
                        {curriculum_html if curriculum_html else '<p>No curriculum items specified</p>'}
                    </div>
                    
                    {f'<div class="details"><p><span class="label">Google Meet Link:</span> <a href="{log_entry.get("google_meet_link")}">{log_entry.get("google_meet_link")}</a></p></div>' if log_entry.get('google_meet_link') else ''}
                    
                    {f'<div class="details"><p><span class="label">Notes:</span> {log_entry.get("notes")}</p></div>' if log_entry.get('notes') else ''}
                    
                    <p style="margin-top: 20px;">This is an automated notification from Rising Stars Nation.</p>
                </div>
                <div class="footer">
                    <p>© 2025 Rising Stars Nation - Free Online Tuition Platform</p>
                    <p>This email was sent to you because you are associated with the batch {batch['batch_code']}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send emails
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            
            for recipient in all_recipients:
                msg = MIMEMultipart('alternative')
                msg['Subject'] = subject
                msg['From'] = f"{email_from_name} <{email_from}>"
                msg['To'] = recipient
                
                html_part = MIMEText(html_body, 'html')
                msg.attach(html_part)
                
                server.send_message(msg)
                logging.info(f"Email sent to {recipient}")
        
        logging.info(f"Successfully sent log entry notifications to {len(all_recipients)} recipients")
        
    except Exception as e:
        logging.error(f"Failed to send email notifications: {str(e)}")
        # Don't raise exception - email failure shouldn't block log entry creation

async def auto_assign_tutor_to_batch(batch: Batch):
    """Automatically assign tutor to batch based on priority"""
    # Find eligible tutors
    eligible_tutors = await db.tutors.find({
        "state": batch.state,
        "classes_can_teach": batch.class_level,
        "subjects_can_teach": batch.subject
    }).to_list(None)
    
    if not eligible_tutors:
        return
    
    # Sort by registration timestamp (first-come-first-served)
    eligible_tutors.sort(key=lambda t: t["registration_timestamp"])
    
    # Check existing assignments to avoid conflicts
    all_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    assigned_days_map = {}  # day -> tutor_id
    
    existing_assignments = await db.batch_tutor_assignments.find({"batch_id": batch.id}).to_list(None)
    for assignment in existing_assignments:
        for day in assignment["assigned_days"]:
            assigned_days_map[day] = assignment["tutor_id"]
    
    # Assign tutors to remaining days
    for tutor in eligible_tutors:
        available_days_for_tutor = [d for d in tutor["available_days"] if d not in assigned_days_map]
        
        if available_days_for_tutor:
            # Assign this tutor to their available days
            assignment = BatchTutorAssignment(
                batch_id=batch.id,
                tutor_id=tutor["id"],
                assigned_days=available_days_for_tutor
            )
            doc = assignment.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.batch_tutor_assignments.insert_one(doc)
            
            # Update assigned days map
            for day in available_days_for_tutor:
                assigned_days_map[day] = tutor["id"]
        
        # Check if all days are assigned
        if len(assigned_days_map) >= len(all_days):
            break

async def check_and_create_batch(student: Student, subject: str):
    """Check if batch should be created and create if threshold met"""
    # Find existing batch (waitlist or active) for this combination
    existing_batch = await db.batches.find_one({
        "state": student.board,
        "class_level": student.class_level,
        "subject": subject,
        "board": student.board,
        "status": {"$in": ["waitlist", "active"]}
    }, {"_id": 0})
    
    if existing_batch:
        batch = Batch(**existing_batch)
        
        # Add student to batch if not already added
        if student.id not in batch.student_ids:
            batch.student_ids.append(student.id)
            
            # Check if batch should be activated
            if len(batch.student_ids) >= 10 and batch.status == "waitlist":
                batch.status = "active"
                # Auto-assign tutor when batch becomes active
                await auto_assign_tutor_to_batch(batch)
            
            # Check if batch is full
            if len(batch.student_ids) >= 25:
                batch.status = "full"
            
            # Update batch
            await db.batches.update_one(
                {"id": batch.id},
                {"$set": {"student_ids": batch.student_ids, "status": batch.status}}
            )
    else:
        # Create new batch
        current_year = datetime.now(timezone.utc).year
        academic_year = f"{current_year}-{str(current_year + 1)[-2:]}"
        
        batch_code = await generate_batch_code(student.board, academic_year, student.class_level, subject)
        schedule_slots = generate_schedule_slots_for_batch(student.class_level, subject, batch_code)

        batch = Batch(
            batch_code=batch_code,
            state=student.board,
            academic_year=academic_year,
            class_level=student.class_level,
            subject=subject,
            board=student.board,
            student_ids=[student.id],
            status="waitlist",
            schedule_slots=schedule_slots
        )
        
        doc = batch.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.batches.insert_one(doc)

# ============= AUTH ROUTES =============

@api_router.get("/auth/session")
async def get_session_data(request: Request):
    """Get session data from session_id"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="X-Session-ID header required")
    
    # Call Emergent auth service
    try:
        response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get session data: {str(e)}")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    
    if not existing_user:
        # Create new user with pending role (will be set during registration)
        user = User(
            email=data["email"],
            name=data["name"],
            picture=data.get("picture"),
            role="pending"
        )
        doc = user.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.users.insert_one(doc)
    else:
        user = User(**existing_user)
    
    # Create session
    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session = UserSession(
        user_id=user.id,
        session_token=session_token,
        expires_at=expires_at
    )
    
    session_doc = session.model_dump()
    session_doc["created_at"] = session_doc["created_at"].isoformat()
    session_doc["expires_at"] = session_doc["expires_at"].isoformat()
    
    await db.user_sessions.insert_one(session_doc)
    
    return {
        "session_token": session_token,
        "user": user.model_dump()
    }

@api_router.post("/auth/login")
async def login(input: LoginInput, response: Response):
    """Login with email and password"""
    
    # Special handling for student login
    if input.role == "student":
        # For students: email is parent's email, password is student's DOB
        # Find parent by email
        parent_doc = await db.users.find_one({"email": input.email}, {"_id": 0})
        
        if not parent_doc:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        parent = User(**parent_doc)
        
        # Find student by parent_id and DOB
        # Try multiple date formats: DD-MM-YYYY, YYYY-MM-DD, etc.
        student_doc = await db.students.find_one({
            "parent_id": parent.id,
            "dob": input.password
        }, {"_id": 0})
        
        if not student_doc:
            raise HTTPException(status_code=401, detail="Invalid email or password. Please use parent's email and student's date of birth (in format DD-MM-YYYY)")
        
        student = Student(**student_doc)
        
        # Create a user object for the student session
        # Use student's data to create the session
        user = User(
            id=student.id,  # Use student ID for session
            email=input.email,
            name=student.name,
            role="student",
            state=student.board,
            user_code=student.student_code
        )
    else:
        # Regular user login (parent, tutor, coordinator, admin, etc.)
        # Find user by email
        user_doc = await db.users.find_one({"email": input.email}, {"_id": 0})
        
        if not user_doc:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        user = User(**user_doc)
        
        # Verify password
        if not user.password_hash:
            raise HTTPException(status_code=401, detail="This account uses Google login. Please use 'Login with Google' button.")
        
        if not pwd_context.verify(input.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Verify role matches (except for pending role users who haven't registered yet)
        if user.role != "pending" and user.role != input.role:
            raise HTTPException(status_code=403, detail=f"This account is registered as {user.role}, not {input.role}")
        
        # For admin role, check if user is actually admin or co-admin
        if input.role == "admin" or input.role == "rsn":
            if not (user.is_main_admin or user.is_co_admin):
                raise HTTPException(status_code=403, detail="Access denied. This area is restricted to RSN team only.")
    
    # Create session
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session = UserSession(
        user_id=user.id,
        session_token=session_token,
        expires_at=expires_at
    )
    
    session_doc = session.model_dump()
    session_doc["created_at"] = session_doc["created_at"].isoformat()
    session_doc["expires_at"] = session_doc["expires_at"].isoformat()
    
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none"
    )
    
    # Don't return password_hash
    user_data = user.model_dump()
    user_data.pop("password_hash", None)
    
    return {
        "session_token": session_token,
        "user": user_data
    }

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current user"""
    user = await require_auth(request)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"success": True}

# ============= ADMIN ROUTES =============

async def require_admin(request: Request):
    """Require admin or co-admin access"""
    user = await require_auth(request)
    if not (user.is_main_admin or user.is_co_admin):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_main_admin(request: Request):
    """Require main admin access only"""
    user = await require_auth(request)
    if not user.is_main_admin:
        raise HTTPException(status_code=403, detail="Main admin access required")
    return user

@api_router.get("/admin/stats")
async def get_admin_stats(request: Request):
    """Get dashboard statistics"""
    await require_admin(request)
    
    total_coordinators = await db.users.count_documents({"role": "coordinator"})
    total_tutors = await db.tutors.count_documents({})
    total_students = await db.students.count_documents({})
    total_parents = await db.users.count_documents({"role": "parent"})
    total_batches = await db.batches.count_documents({})
    
    pending_coordinators = await db.users.count_documents({
        "role": "coordinator",
        "$or": [
            {"approval_status": "pending"},
            {"status": "pending"}
        ]
    })
    
    pending_tutors = await db.tutors.count_documents({"approval_status": "pending"})
    
    return {
        "totalCoordinators": total_coordinators,
        "totalTutors": total_tutors,
        "totalStudents": total_students,
        "totalParents": total_parents,
        "totalBatches": total_batches,
        "totalSchools": 0,
        "pendingCoordinators": pending_coordinators,
        "pendingTutors": pending_tutors
    }

@api_router.get("/admin/admins")
async def get_all_admins(request: Request):
    """Get all admin and co-admin users"""
    await require_admin(request)
    
    admins = await db.users.find({
        "$or": [
            {"is_main_admin": True},
            {"is_co_admin": True}
        ]
    }, {"_id": 0, "password_hash": 0}).to_list(length=None)
    
    return [User(**admin).model_dump() for admin in admins]

@api_router.post("/admin/co-admins")
async def create_co_admin(input: dict, request: Request):
    """Create a new co-admin (main admin only)"""
    await require_main_admin(request)
    
    # Check if email already exists
    existing = await db.users.find_one({"email": input["email"]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Create new co-admin user
    co_admin = User(
        email=input["email"],
        name=input["name"],
        role="admin",
        password_hash=pwd_context.hash(input["password"]),
        is_main_admin=False,
        is_co_admin=True,
        can_manage_admins=False,
        state="TS",
        user_code=f"RSN-COADMIN-{str(uuid.uuid4())[:8].upper()}"
    )
    
    doc = co_admin.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.users.insert_one(doc)
    
    return {"success": True, "message": "Co-admin created successfully"}

@api_router.post("/admin/invite")
async def generate_invite_link(input: dict, request: Request):
    """Generate invite link for co-admin (main admin only)"""
    await require_main_admin(request)
    
    email = input["email"]
    
    # Generate unique invite token
    invite_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    # Check if user already exists
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        # Update existing user with invite token
        await db.users.update_one(
            {"email": email},
            {"$set": {
                "invite_token": invite_token,
                "invite_expires_at": expires_at.isoformat()
            }}
        )
    else:
        # Create pending co-admin user
        pending_admin = User(
            email=email,
            name="Pending Co-Admin",
            role="pending",
            is_main_admin=False,
            is_co_admin=True,
            can_manage_admins=False,
            invite_token=invite_token,
            invite_expires_at=expires_at
        )
        
        doc = pending_admin.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        if doc.get("invite_expires_at"):
            doc["invite_expires_at"] = doc["invite_expires_at"].isoformat()
        
        await db.users.insert_one(doc)
    
    # Generate invite link
    invite_link = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/accept-invite?token={invite_token}"
    
    return {
        "invite_link": invite_link,
        "expires_at": expires_at.isoformat()
    }

@api_router.delete("/admin/co-admins/{admin_id}")
async def remove_co_admin(admin_id: str, request: Request):
    """Remove a co-admin (main admin only)"""
    await require_main_admin(request)
    
    # Check if the admin exists and is a co-admin
    admin = await db.users.find_one({"id": admin_id}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    if admin.get("is_main_admin"):
        raise HTTPException(status_code=400, detail="Cannot remove main admin")
    
    if not admin.get("is_co_admin"):
        raise HTTPException(status_code=400, detail="User is not a co-admin")
    
    # Delete the co-admin
    await db.users.delete_one({"id": admin_id})
    await db.user_sessions.delete_many({"user_id": admin_id})
    
    return {"success": True, "message": "Co-admin removed successfully"}

@api_router.get("/admin/coordinators")
async def get_all_coordinators(request: Request):
    """Get all coordinators with their details"""
    await require_admin(request)
    
    coordinators = await db.users.find({"role": "coordinator"}, {"_id": 0, "password_hash": 0}).to_list(length=None)
    
    result = []
    for coord in coordinators:
        result.append({
            "id": coord.get("id"),
            "name": coord.get("name"),
            "email": coord.get("email"),
            "state": coord.get("state"),
            "user_code": coord.get("user_code"),
            "approval_status": coord.get("approval_status", "pending"),
            "status": coord.get("status", "pending"),
            "availability_status": coord.get("availability_status", "available")
        })
    
    return result

@api_router.put("/admin/coordinators/{coordinator_id}/status")
async def update_coordinator_status(coordinator_id: str, input: dict, request: Request):
    """Update coordinator status (approve, reject, suspend, blacklist, etc.)"""
    await require_admin(request)
    
    action = input.get("action")
    
    update_data = {}
    
    if action == "approve":
        update_data = {
            "approval_status": "approved",
            "status": "active"
        }
    elif action == "reject":
        update_data = {
            "approval_status": "rejected",
            "status": "rejected"
        }
    elif action == "suspend":
        update_data = {"status": "suspended"}
    elif action == "blacklist":
        update_data = {"status": "blacklisted"}
    elif action == "activate":
        update_data = {"status": "active"}
    elif action == "terminate":
        update_data = {"status": "terminated"}
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
    
    result = await db.users.update_one(
        {"id": coordinator_id, "role": "coordinator"},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Coordinator not found")
    
    return {"success": True, "message": f"Coordinator {action}d successfully"}

@api_router.get("/admin/students")
async def get_all_students(request: Request):
    """Get all students"""
    await require_admin(request)
    
    students = await db.students.find({}, {"_id": 0}).to_list(length=None)
    return students

@api_router.get("/admin/parents")
async def get_all_parents(request: Request):
    """Get all parents"""
    await require_admin(request)
    
    parents = await db.users.find({"role": "parent"}, {"_id": 0, "password_hash": 0}).to_list(length=None)
    return [User(**parent).model_dump() for parent in parents]

@api_router.get("/admin/schools")
async def get_all_schools(request: Request):
    """Get all schools"""
    await require_admin(request)
    
    # Placeholder - schools collection to be implemented
    return []

@api_router.post("/admin/coordinator-assignments")
async def create_coordinator_assignment(input: dict, request: Request):
    """Create a new coordinator assignment"""
    user = await require_admin(request)
    
    assignment_type = input.get("assignment_type")
    coordinator_id = input.get("coordinator_id")
    
    if not coordinator_id:
        raise HTTPException(status_code=400, detail="Coordinator ID is required")
    
    # Verify coordinator exists
    coordinator = await db.users.find_one({"id": coordinator_id, "role": "coordinator"}, {"_id": 0})
    if not coordinator:
        raise HTTPException(status_code=404, detail="Coordinator not found")
    
    # Create assignment based on type
    assignment = CoordinatorAssignment(
        coordinator_id=coordinator_id,
        assignment_type=assignment_type,
        created_by=user.id
    )
    
    if assignment_type == "class":
        if not input.get("class_level"):
            raise HTTPException(status_code=400, detail="Class level is required for class assignment")
        assignment.class_level = input.get("class_level")
    
    elif assignment_type == "class_subject":
        if not input.get("class_level") or not input.get("subject"):
            raise HTTPException(status_code=400, detail="Class level and subject are required")
        assignment.class_level = input.get("class_level")
        assignment.subject = input.get("subject")
    
    elif assignment_type == "batch_range":
        if not input.get("class_level") or not input.get("subject") or not input.get("batch_start") or not input.get("batch_end"):
            raise HTTPException(status_code=400, detail="Class level, subject, batch start and end are required for batch range")
        assignment.class_level = input.get("class_level")
        assignment.subject = input.get("subject")
        assignment.batch_start = input.get("batch_start")
        assignment.batch_end = input.get("batch_end")
    
    else:
        raise HTTPException(status_code=400, detail="Invalid assignment type")
    
    doc = assignment.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.coordinator_assignments.insert_one(doc)
    
    return {"success": True, "message": "Coordinator assigned successfully"}

@api_router.get("/admin/coordinator-assignments")
async def get_coordinator_assignments(request: Request):
    """Get all coordinator assignments"""
    await require_admin(request)
    
    assignments = await db.coordinator_assignments.find({}, {"_id": 0}).to_list(length=None)
    
    # Populate coordinator details
    result = []
    for assignment in assignments:
        coordinator = await db.users.find_one(
            {"id": assignment.get("coordinator_id")},
            {"_id": 0, "name": 1, "email": 1, "id": 1}
        )
        
        assignment["coordinator"] = coordinator
        result.append(assignment)
    
    return result

@api_router.delete("/admin/coordinator-assignments/{assignment_id}")
async def delete_coordinator_assignment(assignment_id: str, request: Request):
    """Delete a coordinator assignment"""
    await require_admin(request)
    
    result = await db.coordinator_assignments.delete_one({"id": assignment_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    return {"success": True, "message": "Assignment removed successfully"}

@api_router.post("/admin/school-tutor-assignments")
async def create_school_tutor_assignment(input: dict, request: Request):
    """Assign a tutor to a school"""
    user = await require_admin(request)
    
    school_id = input.get("school_id")
    tutor_id = input.get("tutor_id")
    assigned_subjects = input.get("assigned_subjects", [])
    
    if not school_id or not tutor_id:
        raise HTTPException(status_code=400, detail="School ID and Tutor ID are required")
    
    # Check if assignment already exists
    existing = await db.school_tutor_assignments.find_one({
        "school_id": school_id,
        "tutor_id": tutor_id
    }, {"_id": 0})
    
    if existing:
        # Update existing assignment
        await db.school_tutor_assignments.update_one(
            {"school_id": school_id, "tutor_id": tutor_id},
            {"$set": {"assigned_subjects": assigned_subjects}}
        )
        return {"success": True, "message": "Tutor assignment updated"}
    
    # Create new assignment
    assignment = SchoolTutorAssignment(
        school_id=school_id,
        tutor_id=tutor_id,
        assigned_subjects=assigned_subjects,
        created_by=user.id
    )
    
    doc = assignment.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.school_tutor_assignments.insert_one(doc)
    
    return {"success": True, "message": "Tutor assigned to school successfully"}

@api_router.get("/admin/school-tutor-assignments")
async def get_school_tutor_assignments(request: Request):
    """Get all school-tutor assignments"""
    await require_admin(request)
    
    assignments = await db.school_tutor_assignments.find({}, {"_id": 0}).to_list(length=None)
    
    # Populate school and tutor details
    result = []
    for assignment in assignments:
        # Get tutor details
        tutor_doc = await db.tutors.find_one({"id": assignment.get("tutor_id")}, {"_id": 0})
        if tutor_doc:
            user_doc = await db.users.find_one(
                {"id": tutor_doc.get("user_id")},
                {"_id": 0, "name": 1, "email": 1}
            )
            assignment["tutor"] = {**tutor_doc, "user": user_doc}
        
        result.append(assignment)
    
    return result

@api_router.delete("/admin/school-tutor-assignments/{assignment_id}")
async def delete_school_tutor_assignment(assignment_id: str, request: Request):
    """Delete a school-tutor assignment"""
    await require_admin(request)
    
    result = await db.school_tutor_assignments.delete_one({"id": assignment_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    return {"success": True, "message": "Tutor assignment removed"}

# ============= BULK DELETE ENDPOINTS =============

@api_router.delete("/admin/coordinators/bulk")
async def bulk_delete_coordinators(input: BulkDeleteInput, request: Request):
    """Bulk delete coordinators (prevents deletion if assigned to batches)"""
    await require_admin(request)
    
    deleted_count = 0
    errors = []
    
    for coordinator_id in input.ids:
        # Check if coordinator has assignments
        has_assignments = await db.coordinator_assignments.find_one({"coordinator_id": coordinator_id})
        if has_assignments:
            coordinator = await db.users.find_one({"id": coordinator_id, "role": "coordinator"}, {"_id": 0, "name": 1})
            errors.append(f"{coordinator.get('name', coordinator_id)} has active assignments")
            continue
        
        # Delete coordinator user
        result = await db.users.delete_one({"id": coordinator_id, "role": "coordinator"})
        deleted_count += result.deleted_count
    
    return {
        "success": True,
        "deleted_count": deleted_count,
        "errors": errors
    }

@api_router.post("/admin/parents/check-students")
async def check_parent_students(input: BulkDeleteInput, request: Request):
    """Check which students belong to parents before deletion"""
    await require_admin(request)
    
    parent_student_info = []
    
    for parent_id in input.ids:
        # Check if parent has students
        students = await db.students.find({"parent_id": parent_id}, {"_id": 0, "name": 1, "student_code": 1}).to_list(length=None)
        if students:
            parent = await db.users.find_one({"id": parent_id}, {"_id": 0, "name": 1})
            student_names = [f"{s['name']} ({s.get('student_code', 'N/A')})" for s in students]
            parent_student_info.append({
                "parent_name": parent.get('name', 'Unknown'),
                "student_count": len(students),
                "students": student_names
            })
    
    return {
        "has_students": len(parent_student_info) > 0,
        "details": parent_student_info
    }

@api_router.delete("/admin/parents/bulk")
async def bulk_delete_parents(input: BulkDeleteInput, request: Request):
    """Bulk delete parents (shows warning if has students)"""
    await require_admin(request)
    
    deleted_count = 0
    warnings = []
    
    for parent_id in input.ids:
        # Check if parent has students
        students = await db.students.find({"parent_id": parent_id}, {"_id": 0, "name": 1}).to_list(length=None)
        if students:
            parent = await db.users.find_one({"id": parent_id}, {"_id": 0, "name": 1})
            student_names = [s["name"] for s in students]
            warnings.append(f"{parent.get('name', parent_id)} has {len(students)} student(s): {', '.join(student_names)}")
            # Delete associated students as well
            await db.students.delete_many({"parent_id": parent_id})
        
        # Delete parent user
        result = await db.users.delete_one({"id": parent_id, "role": "parent"})
        deleted_count += result.deleted_count
    
    return {
        "success": True,
        "deleted_count": deleted_count,
        "warnings": warnings
    }

@api_router.delete("/admin/tutors/bulk")
async def bulk_delete_tutors(input: BulkDeleteInput, request: Request):
    """Bulk delete tutors (prevents deletion if assigned to active batches)"""
    await require_admin(request)
    
    deleted_count = 0
    errors = []
    
    for tutor_id in input.ids:
        # Check if tutor has batch assignments
        has_assignments = await db.batch_tutor_assignments.find_one({"tutor_id": tutor_id})
        if has_assignments:
            tutor = await db.tutors.find_one({"id": tutor_id}, {"_id": 0, "user_id": 1})
            if tutor:
                user = await db.users.find_one({"id": tutor.get("user_id")}, {"_id": 0, "name": 1})
                errors.append(f"{user.get('name', tutor_id)} is assigned to active batches")
            continue
        
        # Delete tutor profile and user
        await db.tutors.delete_one({"id": tutor_id})
        tutor_doc = await db.tutors.find_one({"id": tutor_id}, {"_id": 0, "user_id": 1})
        if tutor_doc:
            await db.users.delete_one({"id": tutor_doc.get("user_id")})
        deleted_count += 1
    
    return {
        "success": True,
        "deleted_count": deleted_count,
        "errors": errors
    }

@api_router.delete("/admin/students/bulk")
async def bulk_delete_students(input: BulkDeleteInput, request: Request):
    """Bulk delete students"""
    await require_admin(request)
    
    deleted_count = 0
    
    for student_id in input.ids:
        # Remove student from batches
        await db.batches.update_many(
            {"student_ids": student_id},
            {"$pull": {"student_ids": student_id}}
        )
        
        # Delete student record
        result = await db.students.delete_one({"id": student_id})
        deleted_count += result.deleted_count
        
        # Delete student user if exists
        student = await db.students.find_one({"id": student_id}, {"_id": 0, "user_id": 1})
        if student and student.get("user_id"):
            await db.users.delete_one({"id": student.get("user_id")})
    
    return {
        "success": True,
        "deleted_count": deleted_count
    }

@api_router.delete("/admin/co-admins/bulk")
async def bulk_delete_co_admins(input: BulkDeleteInput, request: Request):
    """Bulk delete co-admins (only main admin can do this)"""
    user = await require_admin(request)
    
    if not user.can_manage_admins:
        raise HTTPException(status_code=403, detail="Only main admin can delete co-admins")
    
    deleted_count = 0
    errors = []
    
    for admin_id in input.ids:
        # Check if it's the main admin
        admin = await db.users.find_one({"id": admin_id, "role": "admin"})
        if admin and admin.get("is_main_admin"):
            errors.append(f"Cannot delete main admin")
            continue
        
        result = await db.users.delete_one({"id": admin_id, "role": "admin", "is_co_admin": True})
        deleted_count += result.deleted_count
    
    return {
        "success": True,
        "deleted_count": deleted_count,
        "errors": errors
    }

@api_router.delete("/admin/schools/bulk")
async def bulk_delete_schools(input: BulkDeleteInput, request: Request):
    """Bulk delete schools"""
    await require_admin(request)
    
    deleted_count = 0
    
    for school_id in input.ids:
        # Delete school-tutor assignments for this school
        await db.school_tutor_assignments.delete_many({"school_id": school_id})
        
        # Delete school record
        result = await db.schools.delete_one({"id": school_id})
        deleted_count += result.deleted_count
    
    return {
        "success": True,
        "deleted_count": deleted_count
    }

@api_router.delete("/admin/batches/bulk")
async def bulk_delete_batches(input: BulkDeleteInput, request: Request):
    """Bulk delete batches"""
    await require_admin(request)
    
    deleted_count = 0
    
    for batch_id in input.ids:
        # Delete batch tutor assignments
        await db.batch_tutor_assignments.delete_many({"batch_id": batch_id})
        
        # Delete log entries for this batch
        await db.logboard.delete_many({"batch_id": batch_id})
        
        # Delete attendance records
        await db.attendance.delete_many({"batch_id": batch_id})
        
        # Delete batch record
        result = await db.batches.delete_one({"id": batch_id})
        deleted_count += result.deleted_count
    
    return {
        "success": True,
        "deleted_count": deleted_count
    }

@api_router.delete("/admin/curriculum/bulk")
async def bulk_delete_curriculum(input: BulkDeleteInput, request: Request):
    """Bulk delete curriculum items"""
    await require_admin(request)
    
    deleted_count = 0
    
    for curriculum_id in input.ids:
        result = await db.curriculum_items.delete_one({"id": curriculum_id})
        deleted_count += result.deleted_count
    
    return {
        "success": True,
        "deleted_count": deleted_count
    }

# ============= CURRICULUM ENDPOINTS =============

@api_router.get("/admin/curriculum")
async def get_all_curriculum(request: Request):
    """Get all curriculum items"""
    await require_admin(request)
    
    items = await db.curriculum_items.find({}, {"_id": 0}).to_list(length=None)
    return items

@api_router.post("/admin/curriculum/upload-csv")
async def upload_curriculum_csv(request: Request):
    """Upload curriculum CSV file and populate database"""
    await require_admin(request)
    
    try:
        form = await request.form()
        csv_file = form.get("file")
        
        if not csv_file:
            raise HTTPException(status_code=400, detail="No file uploaded")
        
        # Read CSV content
        content = await csv_file.read()
        csv_content = content.decode('utf-8')
        
        import csv
        import io
        
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        
        items_added = 0
        items_updated = 0
        errors = []
        
        for row in csv_reader:
            try:
                # Validate required fields
                if not all(key in row for key in ['board', 'class_level', 'subject', 'lesson_number', 'lesson_title']):
                    errors.append(f"Missing required fields in row: {row}")
                    continue
                
                # Check if item already exists
                existing = await db.curriculum_items.find_one({
                    "board": row['board'],
                    "class_level": int(row['class_level']),
                    "subject": row['subject'],
                    "topic_number": int(row['lesson_number'])
                }, {"_id": 0})
                
                item_data = {
                    "board": row['board'],
                    "class_level": int(row['class_level']),
                    "subject": row['subject'],
                    "topic_number": int(row['lesson_number']),
                    "topic_name": row['lesson_title'],
                    "description": row.get('lesson_summary', '')
                }
                
                if existing:
                    # Update existing item
                    await db.curriculum_items.update_one(
                        {"id": existing["id"]},
                        {"$set": item_data}
                    )
                    items_updated += 1
                else:
                    # Create new item
                    curriculum_item = CurriculumItem(**item_data)
                    doc = curriculum_item.model_dump()
                    doc["created_at"] = datetime.now(timezone.utc).isoformat() if hasattr(curriculum_item, 'created_at') else None
                    await db.curriculum_items.insert_one(doc)
                    items_added += 1
                    
            except Exception as e:
                errors.append(f"Error processing row {row}: {str(e)}")
        
        return {
            "success": True,
            "items_added": items_added,
            "items_updated": items_updated,
            "errors": errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}")

@api_router.get("/admin/curriculum/summary")
async def get_curriculum_summary(request: Request):
    """Get curriculum summary grouped by board, class, subject"""
    await require_admin(request)
    
    pipeline = [
        {
            "$group": {
                "_id": {
                    "board": "$board",
                    "class_level": "$class_level",
                    "subject": "$subject"
                },
                "lesson_count": {"$sum": 1}
            }
        },
        {
            "$group": {
                "_id": {
                    "board": "$_id.board",
                    "class_level": "$_id.class_level"
                },
                "subjects": {
                    "$push": {
                        "subject": "$_id.subject",
                        "lesson_count": "$lesson_count"
                    }
                }
            }
        },
        {
            "$group": {
                "_id": "$_id.board",
                "classes": {
                    "$push": {
                        "class_level": "$_id.class_level",
                        "subjects": "$subjects"
                    }
                }
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    result = await db.curriculum_items.aggregate(pipeline).to_list(length=None)
    return result

# ============= STATE BOARDS ENDPOINTS =============

@api_router.get("/admin/state-boards")
async def get_state_boards(request: Request):
    """Get all state boards"""
    await require_admin(request)
    
    boards = await db.state_boards.find({}, {"_id": 0}).to_list(length=None)
    return boards

@api_router.post("/admin/state-boards")
async def create_state_board(input: CreateStateBoardInput, request: Request):
    """Create a new state board"""
    await require_admin(request)
    
    # Check if code already exists
    existing = await db.state_boards.find_one({"code": input.code}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="State board with this code already exists")
    
    board = StateBoard(
        name=input.name,
        code=input.code,
        description=input.description
    )
    
    doc = board.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.state_boards.insert_one(doc)
    
    return {"success": True, "message": "State board created successfully", "board": board}

@api_router.put("/admin/state-boards/{board_id}")
async def update_state_board(board_id: str, input: UpdateStateBoardInput, request: Request):
    """Update a state board"""
    await require_admin(request)
    
    update_data = {}
    if input.name:
        update_data["name"] = input.name
    if input.code:
        # Check if new code already exists
        existing = await db.state_boards.find_one({"code": input.code, "id": {"$ne": board_id}}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=400, detail="State board with this code already exists")
        update_data["code"] = input.code
    if input.description is not None:
        update_data["description"] = input.description
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.state_boards.update_one(
        {"id": board_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="State board not found")
    
    return {"success": True, "message": "State board updated successfully"}

@api_router.delete("/admin/state-boards/bulk")
async def bulk_delete_state_boards(input: BulkDeleteInput, request: Request):
    """Bulk delete state boards"""
    await require_admin(request)
    
    deleted_count = 0
    
    for board_id in input.ids:
        result = await db.state_boards.delete_one({"id": board_id})
        deleted_count += result.deleted_count
    
    return {
        "success": True,
        "deleted_count": deleted_count
    }

# ============= SCHOOLS ENDPOINTS =============

@api_router.post("/schools/register")
async def register_school(input: RegisterSchoolInput):
    """School registration endpoint"""
    
    # Check if school with same email already exists
    existing = await db.schools.find_one({"email": input.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="School with this email already registered")
    
    school = School(
        school_name=input.school_name,
        principal_name=input.principal_name,
        email=input.email,
        phone=input.phone,
        address=input.address,
        city=input.city,
        state=input.state,
        pincode=input.pincode
    )
    
    doc = school.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.schools.insert_one(doc)
    
    return {"success": True, "message": "School registration successful. Our team will contact you soon."}

# ============= USER ROUTES =============

@api_router.post("/users/register/parent")
async def register_parent(input: RegisterParentInput, request: Request):
    """Register as parent"""
    user = await require_auth(request)
    
    if user.role != "pending":
        raise HTTPException(status_code=400, detail="User already registered")
    
    user_code = generate_user_code(input.state, "parent")
    
    await db.users.update_one(
        {"id": user.id},
        {"$set": {"role": "parent", "state": input.state, "user_code": user_code}}
    )
    
    user.role = "parent"
    user.state = input.state
    user.user_code = user_code
    
    return user

@api_router.post("/users/register/tutor")
async def register_tutor(input: RegisterTutorInput, request: Request):
    """Register as tutor"""
    user = await require_auth(request)
    
    if user.role != "pending":
        raise HTTPException(status_code=400, detail="User already registered")
    
    user_code = generate_user_code(input.board_preference, "tutor")
    
    # Create tutor profile (pending approval)
    tutor = Tutor(
        user_id=user.id,
        tutor_code=user_code,
        aadhaar_number=input.aadhaar_number,
        board_preference=input.board_preference,
        current_address=input.current_address,
        pincode=input.pincode,
        about_yourself=input.about_yourself,
        classes_can_teach=input.classes_can_teach,
        subjects_can_teach=input.subjects_can_teach,
        available_days=input.available_days,
        status="pending",
        approval_status="pending"
    )
    
    tutor_doc = tutor.model_dump()
    tutor_doc["created_at"] = tutor_doc["created_at"].isoformat()
    tutor_doc["registration_timestamp"] = tutor_doc["registration_timestamp"].isoformat()
    await db.tutors.insert_one(tutor_doc)
    
    await db.users.update_one(
        {"id": user.id},
        {"$set": {"role": "tutor", "state": input.board_preference, "user_code": user_code}}
    )
    
    user.role = "tutor"
    user.state = input.board_preference
    user.user_code = user_code
    

@api_router.post("/coordinators/me/availability-requests")
async def create_coordinator_availability_request(request: Request):
    """Coordinator submits an availability request (sent to Admin for action)"""
    user = await require_auth(request)

    if user.role != "coordinator":
        raise HTTPException(status_code=403, detail="Only coordinators can submit availability requests")

    data = await request.json()
    request_type = data.get("request_type")
    unavailable_from = data.get("unavailable_from")
    unavailable_to = data.get("unavailable_to")

    if request_type not in ["available", "unavailable", "delete_account"]:
        raise HTTPException(status_code=400, detail="Invalid request_type")

    if request_type == "unavailable" and (not unavailable_from or not unavailable_to):
        raise HTTPException(status_code=400, detail="unavailable_from and unavailable_to are required for unavailable request")

    availability_request = CoordinatorAvailabilityRequest(
        coordinator_user_id=user.id,
        request_type=request_type,
        unavailable_from=unavailable_from,
        unavailable_to=unavailable_to,
    )

    doc = availability_request.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.coordinator_availability_requests.insert_one(doc)

    return {"success": True}

    return {"user": user, "message": "Registration submitted for coordinator approval"}

@api_router.post("/users/register/coordinator")
async def register_coordinator(input: RegisterCoordinatorInput, request: Request):
    """Register as coordinator (requires admin approval in production)"""
    user = await require_auth(request)
    
    if user.role != "pending":
        raise HTTPException(status_code=400, detail="User already registered")
    
    user_code = generate_user_code(input.state, "coordinator")
    
    # Update user core info
    await db.users.update_one(
        {"id": user.id},
        {"$set": {
            "role": "coordinator",
            "state": input.state,
            "user_code": user_code,
            "name": input.name,
            "photo_url": input.selfie_url,
        }}
    )

    # Store coordinator profile details in a separate collection for future use
    coordinator_profile = {
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        "state": input.state,
        "name": input.name,
        "address": input.address,
        "mobile": input.mobile,
        "altMobile": input.altMobile,
        "pincode": input.pincode,
        "languages": input.languages,
        "selfie_url": input.selfie_url,
        "aadhaar_url": input.aadhaar_url,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.coordinators.insert_one(coordinator_profile)
    
    user.role = "coordinator"
    user.state = input.state
    user.user_code = user_code
    
    return {"user": user, "message": "Coordinator registration submitted"}

# ============= STUDENT ROUTES =============

@api_router.post("/students", response_model=Student)
async def create_student(input: RegisterStudentInput, request: Request):
    """Create student (parent only)"""
    user = await require_auth(request)
    
    if user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can register students")
    
    student_code = generate_student_code(input.board, input.enrollment_year)
    
    # Create student user account if requested
    student_user_id = None
    if input.create_login:
        student_user = User(
            email=f"{student_code.lower()}@student.risingstarsnation.com",  # Auto-generated email
            name=input.name,
            role="student",
            state=input.board,
            user_code=student_code
        )
        user_doc = student_user.model_dump()
        user_doc["created_at"] = user_doc["created_at"].isoformat()
        await db.users.insert_one(user_doc)
        student_user_id = student_user.id
    
    student = Student(
        parent_id=user.id,
        name=input.name,
        student_code=student_code,
        aadhaar_number=input.aadhaar_number,
        dob=input.dob,
        class_level=input.class_level,
        board=input.board,
        school_name=input.school_name,
        location=input.location,
        roll_no=input.roll_no,
        subjects=input.subjects,
        enrollment_year=input.enrollment_year,
        user_id=student_user_id
    )
    
    doc = student.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.students.insert_one(doc)
    
    # Check and create batches for each subject
    for subject in student.subjects:
        await check_and_create_batch(student, subject)
    
    return student

@api_router.get("/students", response_model=List[Student])
async def get_students(request: Request):
    """Get students (parent gets their own, coordinator/admin get all)"""
    user = await require_auth(request)
    
    if user.role == "parent":
        students = await db.students.find({"parent_id": user.id}, {"_id": 0}).to_list(None)
    elif user.role in ["coordinator", "admin"]:
        students = await db.students.find({}, {"_id": 0}).to_list(None)
    else:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return [Student(**s) for s in students]

# ============= BATCH ROUTES =============

@api_router.get("/batches", response_model=List[Batch])
async def get_batches(request: Request):
    """Get batches (filtered by role)"""
    user = await require_auth(request)
    
    if user.role == "parent":
        # Get batches for parent's students
        students = await db.students.find({"parent_id": user.id}).to_list(None)
        student_ids = [s["id"] for s in students]
        batches = await db.batches.find({"student_ids": {"$in": student_ids}}, {"_id": 0}).to_list(None)
    elif user.role == "tutor":
        # Get batches assigned to this tutor
        tutor = await db.tutors.find_one({"user_id": user.id})
        if not tutor:
            return []
        assignments = await db.batch_tutor_assignments.find({"tutor_id": tutor["id"]}).to_list(None)
        batch_ids = [a["batch_id"] for a in assignments]
        batches = await db.batches.find({"id": {"$in": batch_ids}}, {"_id": 0}).to_list(None)
    elif user.role in ["coordinator", "admin"]:
        batches = await db.batches.find({}, {"_id": 0}).to_list(None)
    else:
        return []
    
    batch_models: List[Batch] = []
    for b in batches:
        # Ensure schedule_slots exists for older batches
        if not b.get("schedule_slots"):
            slots = generate_schedule_slots_for_batch(b["class_level"], b["subject"], b["batch_code"])
            b["schedule_slots"] = [s.model_dump() for s in slots]
        batch_models.append(Batch(**b))
    
    return batch_models

@api_router.get("/batches/{batch_id}", response_model=Batch)
async def get_batch(batch_id: str, request: Request):
    """Get batch details"""
    user = await require_auth(request)
    
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    return Batch(**batch)

@api_router.post("/batches", response_model=Batch)
async def create_batch_manual(input: CreateBatchInput, request: Request):
    """Manually create batch (coordinator/admin only)"""
    user = await require_auth(request)
    
    if user.role not in ["coordinator", "admin"]:
        raise HTTPException(status_code=403, detail="Only coordinators/admins can create batches")
    
    # Generate global schedule slots for this batch
    schedule_slots = generate_schedule_slots_for_batch(input.class_level, input.subject, await generate_batch_code(input.state, input.academic_year, input.class_level, input.subject))

    batch = Batch(
        batch_code=await generate_batch_code(input.state, input.academic_year, input.class_level, input.subject),
        state=input.state,
        academic_year=input.academic_year,
        class_level=input.class_level,
        subject=input.subject,
        board=input.board,
        student_ids=[],
        status="waitlist",
        schedule_slots=schedule_slots
    )
    
    doc = batch.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.batches.insert_one(doc)
    
    return batch

@api_router.post("/batches/{batch_id}/assigned-schedule")
async def generate_assigned_schedule(batch_id: str, request: Request):
    """Generate and store assigned days/slots for batch based on rules (admin/coordinator only)"""
    user = await require_auth(request)

    if user.role not in ["coordinator", "admin"]:
        raise HTTPException(status_code=403, detail="Only coordinators/admins can generate schedules")

    batch = await db.batches.find_one({"id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # TODO: implement class/subject-based slot generation logic here
    return {"success": True}

@api_router.post("/batches/assign-tutor")
async def assign_tutor(input: AssignTutorInput, request: Request):
    """Assign tutor to batch (coordinator/admin only)"""
    user = await require_auth(request)
    
    if user.role not in ["coordinator", "admin"]:
        raise HTTPException(status_code=403, detail="Only coordinators/admins can assign tutors")
    
    # Check if batch exists
    batch = await db.batches.find_one({"id": input.batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    # Check if tutor exists
    tutor = await db.tutors.find_one({"id": input.tutor_id})
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    # Get batch schedule days
    batch_days = set()
    if batch.get("schedule_slots"):
        for slot in batch["schedule_slots"]:
            batch_days.add(slot["day"])
    
    # Validate that assigned days are in the batch schedule
    for day in input.assigned_days:
        if day not in batch_days:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot assign tutor to {day}. This batch only has classes on: {', '.join(sorted(batch_days))}"
            )
    
    # Find existing assignment (if any) - use the most recent one
    existing_cursor = db.batch_tutor_assignments.find({
        "batch_id": input.batch_id,
        "tutor_id": input.tutor_id
    }).sort("created_at", -1)
    existing = await existing_cursor.to_list(length=1)
    existing = existing[0] if existing else None

    # Ensure global schedule exists on batch
    if not batch.get("schedule_slots"):
        schedule_slots = generate_schedule_slots_for_batch(batch["class_level"], batch["subject"], batch["batch_code"])
        await db.batches.update_one(
            {"id": batch["id"]},
            {"$set": {"schedule_slots": [s.model_dump() for s in schedule_slots]}}
        )

    if input.mode == "unassign":
        # Unassign: remove selected days from existing assignment
        if not existing:
            return {"success": True, "assignment": None}

        current_days = existing.get("assigned_days", [])
        new_days = [d for d in current_days if d not in input.assigned_days]

        if new_days:
            await db.batch_tutor_assignments.update_one(
                {"id": existing["id"]},
                {"$set": {"assigned_days": new_days}}
            )
            existing["assigned_days"] = new_days
            return {"success": True, "assignment": BatchTutorAssignment(**existing)}
        else:
            # No days left, remove assignment entirely
            await db.batch_tutor_assignments.delete_one({"id": existing["id"]})
            return {"success": True, "assignment": None}

    DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    # Assign mode: create or update
    if existing:
        current_days = existing.get("assigned_days", [])
        # Union of existing and new days
        new_days = sorted(list(set(current_days) | set(input.assigned_days)), key=lambda d: DAYS.index(d))
        await db.batch_tutor_assignments.update_one(
            {"id": existing["id"]},
            {"$set": {"assigned_days": new_days}}
        )
        existing["assigned_days"] = new_days
        return {"success": True, "assignment": BatchTutorAssignment(**existing)}
    else:
        # Create new assignment with global schedule slots
        assigned_slots = generate_schedule_slots_for_batch(batch["class_level"], batch["subject"], batch["batch_code"])

        assignment = BatchTutorAssignment(
            batch_id=input.batch_id,
            tutor_id=input.tutor_id,
            assigned_days=input.assigned_days,
            assigned_slots=assigned_slots
        )
        
        doc = assignment.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.batch_tutor_assignments.insert_one(doc)
        
        return {"success": True, "assignment": assignment}

@api_router.get("/batches/{batch_id}/available-tutors")
async def get_available_tutors_for_batch(batch_id: str, request: Request):
    """Get available tutors for a batch based on schedule and qualifications"""
    user = await require_auth(request)
    
    if user.role not in ["coordinator", "admin"]:
        raise HTTPException(status_code=403, detail="Only coordinators/admins can access this")
    
    # Get batch details
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    # Extract days from schedule_slots
    batch_days = set()
    if batch.get("schedule_slots"):
        for slot in batch["schedule_slots"]:
            batch_days.add(slot["day"])
    
    # Find tutors who:
    # 1. Are active
    # 2. Are available (not on leave)
    # 3. Can teach this class level
    # 4. Can teach this subject
    # 5. Have at least one available day that matches batch schedule
    all_tutors = await db.tutors.find({
        "status": "active",
        "classes_can_teach": batch["class_level"],
        "subjects_can_teach": batch["subject"]
    }, {"_id": 0}).to_list(None)
    
    available_tutors = []
    for tutor in all_tutors:
        # Check availability status
        if tutor.get("availability_status") and tutor["availability_status"] != "available":
            continue
        
        # Check if tutor has any matching days
        tutor_days = set(tutor.get("available_days", []))
        matching_days = batch_days & tutor_days
        
        if not matching_days:
            continue
        
        # Get user details
        user_doc = await db.users.find_one({"id": tutor["user_id"]}, {"_id": 0})
        
        available_tutors.append({
            "tutor": tutor,
            "user": user_doc,
            "matching_days": list(matching_days)
        })
    
    return available_tutors

@api_router.get("/batches/{batch_id}/tutors")
async def get_batch_tutors(batch_id: str, request: Request):
    """Get tutors assigned to batch"""
    user = await require_auth(request)
    
    assignments = await db.batch_tutor_assignments.find({"batch_id": batch_id}, {"_id": 0}).to_list(None)
    
    # Get tutor details
    result = []
    for assignment in assignments:
        tutor = await db.tutors.find_one({"id": assignment["tutor_id"]}, {"_id": 0})
        if tutor:
            tutor_user = await db.users.find_one({"id": tutor["user_id"]}, {"_id": 0})
            result.append({
                "assignment": assignment,
                "tutor": tutor,
                "tutor_user": tutor_user
            })
    
    return result

@api_router.get("/batches/{batch_id}/students")
async def get_batch_students(batch_id: str, request: Request):
    """Get students in a batch (tutor, coordinator, admin only)"""
    user = await require_auth(request)
    
    if user.role not in ["tutor", "coordinator", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    batch = await db.batches.find_one({"id": batch_id}, {"_id": 0})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    # Get student details
    students = await db.students.find({"id": {"$in": batch["student_ids"]}}, {"_id": 0}).to_list(None)
    return students

# ============= LOG BOARD ROUTES =============

@api_router.post("/logboard", response_model=LogBoardEntry)
async def create_log_entry(input: CreateLogEntryInput, request: Request):
    """Create log board entry (tutor only)"""
    user = await require_auth(request)
    
    if user.role != "tutor":
        raise HTTPException(status_code=403, detail="Only tutors can create log entries")
    
    # Validate Google Meet URL
    if input.google_meet_link:
        google_meet_link = input.google_meet_link.strip()
        valid_patterns = [
            google_meet_link.startswith("https://meet.google.com/"),
            google_meet_link.startswith("http://meet.google.com/")
        ]
        if not any(valid_patterns):
            raise HTTPException(
                status_code=400, 
                detail="Invalid Google Meet URL. URL must start with 'https://meet.google.com/' or 'http://meet.google.com/'"
            )
    
    # Get tutor profile
    tutor = await db.tutors.find_one({"user_id": user.id})
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    # Check if tutor is assigned to this batch
    assignment = await db.batch_tutor_assignments.find_one({
        "batch_id": input.batch_id,
        "tutor_id": tutor["id"]
    })
    
    if not assignment:
        raise HTTPException(status_code=403, detail="Tutor not assigned to this batch")
    
    # Validate that the date matches tutor's assigned days
    if input.date:
        from datetime import datetime
        log_date = datetime.fromisoformat(input.date) if isinstance(input.date, str) else input.date
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        day_of_week = day_names[log_date.weekday()]
        
        assigned_days = assignment.get("assigned_days", [])
        if day_of_week not in assigned_days:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid date! {log_date.strftime('%Y-%m-%d')} is a {day_of_week}, but you are only assigned to: {', '.join(assigned_days)}"
            )
    
    entry = LogBoardEntry(
        batch_id=input.batch_id,
        tutor_id=tutor["id"],
        tutor_name=user.name,
        date=input.date,
        topic_covered=input.topic_covered,
        curriculum_items=input.curriculum_items,
        google_meet_link=input.google_meet_link,
        notes=input.notes,
        sessions_count=input.sessions_count,
        is_locked=True,
        created_by=user.id
    )
    
    doc = entry.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.logboard_entries.insert_one(doc)
    
    # Send email notifications to coordinators, students, and tutor
    try:
        batch = await db.batches.find_one({"id": input.batch_id})
        if batch:
            await send_log_entry_notification(doc, batch, user.name, user.email)
    except Exception as e:
        logging.error(f"Failed to send log entry notifications: {str(e)}")
        # Continue even if email fails
    
    return entry

@api_router.get("/logboard/{batch_id}", response_model=List[LogBoardEntry])
async def get_log_entries(batch_id: str, request: Request):
    """Get log board entries for batch"""
    user = await require_auth(request)
    
    entries = await db.logboard_entries.find({"batch_id": batch_id}, {"_id": 0}).sort("date", -1).to_list(None)
    return [LogBoardEntry(**e) for e in entries]

@api_router.put("/logboard/{entry_id}")
async def update_log_entry(entry_id: str, input: UpdateLogEntryInput, request: Request):
    """Update log board entry (coordinator/admin only)"""
    user = await require_auth(request)
    
    if user.role not in ["coordinator", "admin"]:
        raise HTTPException(status_code=403, detail="Only coordinators/admins can edit log entries")
    
    entry = await db.logboard_entries.find_one({"id": entry_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Log entry not found")
    
    # Validate Google Meet URL if provided
    if input.google_meet_link:
        google_meet_link = input.google_meet_link.strip()
        valid_patterns = [
            google_meet_link.startswith("https://meet.google.com/"),
            google_meet_link.startswith("http://meet.google.com/")
        ]
        if not any(valid_patterns):
            raise HTTPException(
                status_code=400, 
                detail="Invalid Google Meet URL. URL must start with 'https://meet.google.com/' or 'http://meet.google.com/'"
            )
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    
    if update_data:
        await db.logboard_entries.update_one({"id": entry_id}, {"$set": update_data})
    
    updated_entry = await db.logboard_entries.find_one({"id": entry_id}, {"_id": 0})
    return LogBoardEntry(**updated_entry)

# ============= CURRICULUM ROUTES =============

@api_router.get("/subjects/{class_level}")
async def get_subjects_by_class(class_level: int):
    """Get available subjects for a class level"""
    subjects = get_subjects_for_class(class_level)
    return [{"code": s, "name": SUBJECT_NAMES[s]} for s in subjects]

@api_router.get("/curriculum", response_model=List[CurriculumItem])
async def get_curriculum(board: str, class_level: int, subject: str, request: Request):
    """Get curriculum for board/class/subject"""
    await require_auth(request)
    
    # Validate subject for class
    if not is_valid_subject_for_class(subject, class_level):
        raise HTTPException(status_code=400, detail=f"Subject {subject} is not available for class {class_level}")
    
    items = await db.curriculum.find({
        "board": board,
        "class_level": class_level,
        "subject": subject
    }, {"_id": 0}).sort("topic_number", 1).to_list(None)
    
    return [CurriculumItem(**item) for item in items]

@api_router.post("/curriculum/upload")
async def upload_curriculum(items: List[CurriculumItem], request: Request):
    """Upload curriculum items (coordinator/admin only)"""
    user = await require_auth(request)
    
    if user.role not in ["coordinator", "admin"]:
        raise HTTPException(status_code=403, detail="Only coordinators/admins can upload curriculum")
    
    # Insert or update curriculum items
    for item in items:
        existing = await db.curriculum.find_one({"id": item.id})
        doc = item.model_dump()
        
        if existing:
            await db.curriculum.update_one({"id": item.id}, {"$set": doc})
        else:
            await db.curriculum.insert_one(doc)
    

# ============= TUTOR ROUTES =============

@api_router.get("/tutors/me")
async def get_my_tutor_profile(request: Request):
    """Get current tutor's profile - MUST BE BEFORE /tutors/{tutor_id}"""
    user = await require_auth(request)
    
    if user.role != "tutor":
        raise HTTPException(status_code=403, detail="Only tutors can access this endpoint")
    
    tutor = await db.tutors.find_one({"user_id": user.id}, {"_id": 0})
    
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    return tutor

@api_router.put("/tutors/me/profile")
async def update_my_tutor_profile(
    available_days: Optional[List[str]] = None,
    subjects_can_teach: Optional[List[str]] = None,
    classes_can_teach: Optional[List[int]] = None,
    about_yourself: Optional[str] = None,
    request: Request = None
):
    """Update tutor profile - restricted to once every 15 days"""
    user = await require_auth(request)
    
    if user.role != "tutor":
        raise HTTPException(status_code=403, detail="Only tutors can access this endpoint")
    
    tutor = await db.tutors.find_one({"user_id": user.id})
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    # Check 15-day restriction
    if tutor.get("last_profile_update"):
        last_update = tutor["last_profile_update"]
        if isinstance(last_update, str):
            last_update = datetime.fromisoformat(last_update)
        
        days_since_update = (datetime.now(timezone.utc) - last_update).days
        if days_since_update < 15:
            days_remaining = 15 - days_since_update
            raise HTTPException(
                status_code=400,
                detail=f"Profile can only be updated once every 15 days. You can edit again in {days_remaining} days."
            )
    
    # Build update data
    update_data = {}
    if available_days is not None:
        update_data["available_days"] = available_days
    if subjects_can_teach is not None:
        update_data["subjects_can_teach"] = subjects_can_teach
    if classes_can_teach is not None:
        update_data["classes_can_teach"] = classes_can_teach
    if about_yourself is not None:
        update_data["about_yourself"] = about_yourself
    
    update_data["last_profile_update"] = datetime.now(timezone.utc)
    
    await db.tutors.update_one({"user_id": user.id}, {"$set": update_data})
    
    return {"message": "Profile updated successfully", "next_edit_available": (datetime.now(timezone.utc) + timedelta(days=15)).isoformat()}

@api_router.put("/users/me/profile")
async def update_my_user_profile(
    phone_number: Optional[str] = None,
    location: Optional[str] = None,
    alternate_phone: Optional[str] = None,
    availability_status: Optional[str] = None,
    request: Request = None
):
    """Update user profile (coordinator/parent) - restricted to once every 15 days"""
    user = await require_auth(request)
    
    if user.role not in ["coordinator", "parent"]:
        raise HTTPException(status_code=403, detail="Only coordinators and parents can update their profile")
    
    user_data = await db.users.find_one({"id": user.id})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check 15-day restriction
    if user_data.get("last_profile_update"):
        last_update = user_data["last_profile_update"]
        if isinstance(last_update, str):
            last_update = datetime.fromisoformat(last_update)
        
        days_since_update = (datetime.now(timezone.utc) - last_update).days
        if days_since_update < 15:
            days_remaining = 15 - days_since_update
            raise HTTPException(
                status_code=400,
                detail=f"Profile can only be updated once every 15 days. You can edit again in {days_remaining} days."
            )
    
    # Build update data
    update_data = {}
    if phone_number is not None:
        update_data["phone_number"] = phone_number
    if location is not None:
        update_data["location"] = location
    if alternate_phone is not None:
        update_data["alternate_phone"] = alternate_phone
    if availability_status is not None:
        update_data["availability_status"] = availability_status
    
    update_data["last_profile_update"] = datetime.now(timezone.utc)
    
    await db.users.update_one({"id": user.id}, {"$set": update_data})
    
    return {"message": "Profile updated successfully", "next_edit_available": (datetime.now(timezone.utc) + timedelta(days=15)).isoformat()}

@api_router.put("/students/me/profile")
async def update_my_student_profile(
    subjects: Optional[List[str]] = None,
    school_name: Optional[str] = None,
    request: Request = None
):
    """Update student profile (subjects and school_name) - restricted to once every 15 days"""
    user = await require_auth(request)
    
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")
    
    student = await db.students.find_one({"user_id": user.id})
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Check 15-day restriction
    if student.get("last_profile_update"):
        last_update = student["last_profile_update"]
        if isinstance(last_update, str):
            last_update = datetime.fromisoformat(last_update)
        
        days_since_update = (datetime.now(timezone.utc) - last_update).days
        if days_since_update < 15:
            days_remaining = 15 - days_since_update
            raise HTTPException(
                status_code=400,
                detail=f"Profile can only be updated once every 15 days. You can edit again in {days_remaining} days."
            )
    
    # Build update data
    update_data = {}
    if subjects is not None:
        update_data["subjects"] = subjects
    if school_name is not None:
        update_data["school_name"] = school_name
    
    update_data["last_profile_update"] = datetime.now(timezone.utc)
    
    await db.students.update_one({"user_id": user.id}, {"$set": update_data})
    
    return {"message": "Profile updated successfully", "next_edit_available": (datetime.now(timezone.utc) + timedelta(days=15)).isoformat()}

@api_router.get("/tutors")
async def get_tutors(request: Request):
    """Get all tutors (coordinator/admin only)"""
    user = await require_auth(request)
    
    if user.role not in ["coordinator", "admin"]:
        raise HTTPException(status_code=403, detail="Only coordinators/admins can view all tutors")
    
    tutors = await db.tutors.find({}, {"_id": 0}).to_list(None)
    
    # Get user details for each tutor
    result = []
    for tutor in tutors:
        tutor_user = await db.users.find_one({"id": tutor["user_id"]}, {"_id": 0})
        result.append({
            "tutor": tutor,
            "user": tutor_user
        })
    
    return result

@api_router.get("/tutors/{tutor_id}")
async def get_tutor_by_id(tutor_id: str, request: Request):
    """Get tutor details (tutor + linked user) by tutor_id"""
    user = await require_auth(request)

    if user.role not in ["coordinator", "admin", "parent", "student", "tutor"]:
        raise HTTPException(status_code=403, detail="Not authorized to view tutor details")

    tutor = await db.tutors.find_one({"id": tutor_id}, {"_id": 0})
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")

    tutor_user = await db.users.find_one({"id": tutor["user_id"]}, {"_id": 0})
    return {"tutor": tutor, "user": tutor_user}

@api_router.put("/tutors/{tutor_id}/approve")
async def approve_tutor(tutor_id: str, request: Request):
    """Approve tutor registration (coordinator/admin only)"""
    user = await require_auth(request)
    
    if user.role not in ["coordinator", "admin"]:
        raise HTTPException(status_code=403, detail="Only coordinators can approve tutors")
    
    await db.tutors.update_one(
        {"id": tutor_id},
        {"$set": {"approval_status": "approved", "status": "active"}}
    )
    
    return {"success": True, "message": "Tutor approved"}

@api_router.put("/tutors/{tutor_id}/reject")
async def reject_tutor(tutor_id: str, reason: str, request: Request):
    """Reject tutor registration (coordinator/admin only)"""
    user = await require_auth(request)
    
    if user.role not in ["coordinator", "admin"]:
        raise HTTPException(status_code=403, detail="Only coordinators can reject tutors")
    
    await db.tutors.update_one(
        {"id": tutor_id},
        {"$set": {"approval_status": "rejected", "rejection_reason": reason}}
    )
    
    return {"success": True, "message": "Tutor rejected"}

@api_router.put("/tutors/{tutor_id}/status")
async def update_tutor_status(tutor_id: str, status: str, request: Request):
    """Update tutor status (coordinator/admin only)"""
    user = await require_auth(request)
    
    if user.role not in ["coordinator", "admin"]:
        raise HTTPException(status_code=403, detail="Only coordinators can update status")
    
    valid_statuses = ["active", "suspended", "blacklisted", "unavailable"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    await db.tutors.update_one(
        {"id": tutor_id},
        {"$set": {"status": status}}
    )

class CoordinatorAvailabilityUpdate(BaseModel):
    availability_status: str
    unavailable_from: Optional[str] = None
    unavailable_to: Optional[str] = None


@api_router.put("/coordinators/me/availability")
async def update_coordinator_availability(update_data: CoordinatorAvailabilityUpdate, request: Request):
    """Coordinator updates their own availability"""
    user = await require_auth(request)

    if user.role != "coordinator":
        raise HTTPException(status_code=403, detail="Only coordinators can update their availability")

    valid_statuses = ["available", "unavailable", "not_interested"]
    if update_data.availability_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    update_fields = {
        "availability_status": update_data.availability_status,
        "unavailable_from": update_data.unavailable_from if update_data.availability_status == "unavailable" else None,
        "unavailable_to": update_data.unavailable_to if update_data.availability_status == "unavailable" else None,
    }

    await db.users.update_one({"id": user.id}, {"$set": update_fields})

    return {"success": True, "message": "Coordinator availability updated"}


class TutorAvailabilityUpdate(BaseModel):
    availability_status: str
    unavailable_from: Optional[str] = None
    unavailable_to: Optional[str] = None

@api_router.put("/tutors/{tutor_id}/availability")
async def update_tutor_availability(tutor_id: str, update_data: TutorAvailabilityUpdate, request: Request):
    """Update tutor availability status (tutor can update their own)"""
    user = await require_auth(request)
    
    # Check if user is updating their own profile or is coordinator/admin
    tutor = await db.tutors.find_one({"id": tutor_id}, {"_id": 0})
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor not found")
    
    if tutor["user_id"] != user.id and user.role not in ["coordinator", "admin"]:
        raise HTTPException(status_code=403, detail="You can only update your own availability")
    
    valid_statuses = ["available", "unavailable", "not_interested"]
    if update_data.availability_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    update_fields = {"availability_status": update_data.availability_status}
    
    if update_data.availability_status == "unavailable":
        if not update_data.unavailable_from or not update_data.unavailable_to:
            raise HTTPException(status_code=400, detail="Unavailability dates are required")
        update_fields["unavailable_from"] = update_data.unavailable_from
        update_fields["unavailable_to"] = update_data.unavailable_to

    else:
        # Clear unavailability dates if status is not unavailable
        update_fields["unavailable_from"] = None
        update_fields["unavailable_to"] = None
    
    await db.tutors.update_one(
        {"id": tutor_id},
        {"$set": update_fields}
    )
    
    return {"success": True, "message": "Availability updated successfully"}

@api_router.get("/tutors/pending")
async def get_pending_tutors(request: Request):
    """Get pending tutor registrations (coordinator/admin only)"""
    user = await require_auth(request)
    
    if user.role not in ["coordinator", "admin"]:
        raise HTTPException(status_code=403, detail="Only coordinators can view pending tutors")
    
    tutors = await db.tutors.find({"status": "pending"}, {"_id": 0}).to_list(None)
    
    # Get user details for each tutor
    result = []
    for tutor in tutors:
        tutor_user = await db.users.find_one({"id": tutor["user_id"]}, {"_id": 0})
        result.append({
            "tutor": tutor,
            "user": tutor_user
        })
    
    return result

# ============= STUDENT ROUTES =============

@api_router.get("/students/me")
async def get_my_student_profile(request: Request):
    """Get current student's profile (for student login)"""
    user = await require_auth(request)
    
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")
    
    # For student login, user.id IS the student ID
    student = await db.students.find_one({"id": user.id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    return student

@api_router.delete("/students/{student_id}")
async def delete_student(student_id: str, request: Request):
    """Delete a student (parent only - can only delete their own children)"""
    user = await require_auth(request)
    
    if user.role != "parent":
        raise HTTPException(status_code=403, detail="Only parents can delete students")
    
    # Find the student
    student = await db.students.find_one({"id": student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Verify the student belongs to this parent
    if student["parent_id"] != user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own children")
    
    # Remove student from all batches
    await db.batches.update_many(
        {"student_ids": student_id},
        {"$pull": {"student_ids": student_id}}
    )
    
    # Delete the student
    await db.students.delete_one({"id": student_id})
    
    return {"message": "Student deleted successfully"}

@api_router.get("/students/me/batches")
async def get_my_batches(request: Request):
    """Get batches for logged-in student"""
    user = await require_auth(request)
    
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")
    
    # For student login, user.id IS the student ID
    batches = await db.batches.find({"student_ids": user.id}, {"_id": 0}).to_list(None)
    return [Batch(**b) for b in batches]

# ============= REMEDIAL CLASS ROUTES =============

@api_router.post("/remedial/request")
async def create_remedial_request(input: CreateRemedialRequestInput, request: Request):
    """Student requests remedial class"""
    user = await require_auth(request)
    
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can request remedial classes")
    
    # For student login, user.id IS the student ID
    student = await db.students.find_one({"id": user.id})
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Get batch details
    batch = await db.batches.find_one({"id": input.batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    remedial_request = RemedialRequest(
        student_id=user.id,
        batch_id=input.batch_id,
        subject=batch["subject"],
        class_level=batch["class_level"],
        board=batch["board"],
        reason=input.reason,
        topic=input.topic,
        description=input.description,
        status="pending"
    )
    
    doc = remedial_request.model_dump()
    doc["requested_at"] = doc["requested_at"].isoformat()
    await db.remedial_requests.insert_one(doc)
    
    return remedial_request

@api_router.get("/remedial/requests")
async def get_remedial_requests(request: Request, status: Optional[str] = None):
    """Get remedial requests (coordinator only)"""
    user = await require_auth(request)
    
    if user.role not in ["coordinator", "admin"]:
        raise HTTPException(status_code=403, detail="Only coordinators can view remedial requests")
    
    query = {}
    if status:
        query["status"] = status
    
    requests_list = await db.remedial_requests.find(query, {"_id": 0}).to_list(None)
    return requests_list

@api_router.post("/attendance/join-class")
async def mark_attendance_on_join(input: JoinClassAttendanceInput, request: Request):
    """Student confirms they are attending class via Join button"""
    user = await require_auth(request)

    if user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can mark attendance by joining class")

    student = await db.students.find_one({"user_id": user.id})
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    log_entry = await db.logboard_entries.find_one({"id": input.log_entry_id})
    if not log_entry:
        raise HTTPException(status_code=404, detail="Log entry not found")

    if log_entry["batch_id"] != input.batch_id:
        raise HTTPException(status_code=400, detail="Log entry does not belong to this batch")

    attendance = Attendance(
        student_id=student["id"],
        batch_id=input.batch_id,
        log_entry_id=input.log_entry_id,
        date=log_entry["date"],
        status="present",
        marked_by=None
    )

    doc = attendance.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.attendance.insert_one(doc)

    return {"success": True}


@api_router.get("/remedial/my-requests")
async def get_my_remedial_requests(request: Request):
    """Get my remedial requests (student only)"""
    user = await require_auth(request)
    
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this")
    
    student = await db.students.find_one({"user_id": user.id})
    if not student:
        return []
    
    requests_list = await db.remedial_requests.find({"student_id": student["id"]}, {"_id": 0}).to_list(None)
    return requests_list

# ============= ATTENDANCE ROUTES =============

@api_router.post("/attendance/mark")
async def mark_attendance(input: MarkAttendanceInput, request: Request):
    """Mark attendance for a student (tutor only)"""
    user = await require_auth(request)
    
    if user.role != "tutor":
        raise HTTPException(status_code=403, detail="Only tutors can mark attendance")
    
    tutor = await db.tutors.find_one({"user_id": user.id})
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    # Get log entry to get batch_id and date
    log_entry = await db.logboard_entries.find_one({"id": input.log_entry_id})
    if not log_entry:
        raise HTTPException(status_code=404, detail="Log entry not found")
    
    attendance = Attendance(
        student_id=input.student_id,
        batch_id=log_entry["batch_id"],
        log_entry_id=input.log_entry_id,
        date=log_entry["date"],
        status=input.status,
        marked_by=tutor["id"]
    )
    
    doc = attendance.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.attendance.insert_one(doc)
    
    return attendance

@api_router.get("/attendance/student/{student_id}")
async def get_student_attendance(student_id: str, request: Request):
    """Get attendance records for a student"""
    user = await require_auth(request)
    
    # Parents can see their kids' attendance, students can see their own
    if user.role == "parent":
        student = await db.students.find_one({"id": student_id, "parent_id": user.id})
        if not student:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif user.role == "student":
        student = await db.students.find_one({"id": student_id, "user_id": user.id})
        if not student:
            raise HTTPException(status_code=403, detail="Not authorized")
    elif user.role not in ["coordinator", "admin", "tutor"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    attendance_records = await db.attendance.find({"student_id": student_id}, {"_id": 0}).to_list(None)
    return attendance_records

@api_router.get("/attendance/batch/{batch_id}")
async def get_batch_attendance(batch_id: str, request: Request, date: Optional[str] = None):
    """Get attendance for entire batch"""
    user = await require_auth(request)
    
    if user.role not in ["tutor", "coordinator", "admin"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = {"batch_id": batch_id}
    if date:
        query["date"] = date
    
    attendance_records = await db.attendance.find(query, {"_id": 0}).to_list(None)
    return attendance_records

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
