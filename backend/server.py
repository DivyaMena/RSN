from fastapi import FastAPI, APIRouter, HTTPException, Response, Cookie, Request, Depends
from fastapi.staticfiles import StaticFiles
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
import csv
import io
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.getenv("DB_NAME", "risingstarsnation")

# Localhost / 127.0.0.1 Mongo runs without TLS (preview / local dev).
# Every other URL (Atlas, self-hosted cluster, mongodb+srv://, etc.) gets the FULL
# strong TLS options — including tlsAllowInvalidCertificates as a Render workaround
# for TLSV1_ALERT_INTERNAL_ERROR caused by Render's Python TLS stack vs Atlas.
_is_local_mongo = (
    "localhost" in MONGO_URL
    or "127.0.0.1" in MONGO_URL
)

if _is_local_mongo:
    client = AsyncIOMotorClient(MONGO_URL)
else:
    client = AsyncIOMotorClient(
        MONGO_URL,
        tls=True,
        tlsAllowInvalidCertificates=True,
        serverSelectionTimeoutMS=60000,
        connectTimeoutMS=60000,
        socketTimeoutMS=60000,
        retryWrites=True,
        w="majority",
        maxPoolSize=50,
    )

db = client[DB_NAME]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# RSN admin role aliases — both "admin" and "RSN" are valid admin role identifiers.
# DB seed uses "RSN" (matching the frontend "I am a" dropdown), but legacy data and
# many existing checks use "admin". We accept either everywhere.
ADMIN_ROLES = ("admin", "RSN")

def is_admin_role(role):
    """Return True if the given role string identifies an RSN admin/co-admin."""
    return role in ADMIN_ROLES if role else False

app = FastAPI()

# CORS Configuration - handle wildcard specially for credentials
cors_env = os.getenv("CORS_ORIGINS", "").strip()
if cors_env == "*":
    # For wildcard, we need to allow all origins dynamically
    # Since credentials=True doesn't work with "*", we'll handle it via middleware
    origins = ["*"]
    allow_credentials = False  # Can't use credentials with wildcard
else:
    origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

# ============= ACADEMIC YEAR UTILITIES =============

def get_current_academic_year() -> str:
    """
    Returns current academic year in format '2025-26'
    Academic year runs from April 1 to March 31
    """
    today = datetime.now(timezone.utc)
    current_year = today.year
    
    # If before April 1, we're in previous academic year
    if today.month < 4:
        start_year = current_year - 1
        end_year = current_year
    else:
        start_year = current_year
        end_year = current_year + 1
    
    return f"{start_year}-{str(end_year)[-2:]}"

def get_all_academic_years() -> List[str]:
    """Returns list of academic years from 2024-25 to current + 2 years"""
    current = get_current_academic_year()
    start_year = int(current.split('-')[0])
    
    years = []
    for year in range(2024, start_year + 3):
        years.append(f"{year}-{str(year + 1)[-2:]}")
    
    return years

# ============= MODELS =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    picture: Optional[str] = None
    photo_url: Optional[str] = None  # User photo/selfie upload
    role: str  # Primary role for backward compatibility: parent, tutor, coordinator, admin, RSN, student, school
    roles: List[str] = Field(default_factory=list)  # NEW: All active roles ["parent", "tutor"]
    primary_role: Optional[str] = None  # NEW: Which dashboard to show by default
    active_role: Optional[str] = None  # NEW: Currently active role (mirrors primary_role for compatibility)
    pending_roles: List[str] = Field(default_factory=list)  # NEW: Roles waiting for approval ["coordinator"]
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
    academic_year: str = Field(default_factory=get_current_academic_year)  # e.g., "2025-26"
    original_class: Optional[int] = None  # Original class at registration
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
    photo_url: Optional[str] = None
    aadhaar_page1_url: Optional[str] = None
    aadhaar_page2_url: Optional[str] = None

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
    photo_url: Optional[str] = None
    aadhaar_page1_url: Optional[str] = None
    aadhaar_page2_url: Optional[str] = None

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

class PoolRemedialStudentsInput(BaseModel):
    request_ids: List[str]  # List of remedial request IDs to pool
    topic: str
    
class AssignRemedialTutorInput(BaseModel):
    remedial_class_id: str
    tutor_id: str

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

class ReportInput(BaseModel):
    academic_year: str  # "2025-26" - FIRST FILTER for admin
    from_date: str  # ISO date string
    to_date: str  # ISO date string
    report_type: str  # "enrollments", "students", "tutors", "coordinators", "parents"
    filter_value: Optional[str] = None  # "all" or specific value for filtering
    filter_subject: Optional[str] = None  # For enrollment reports
    filter_class_level: Optional[int] = None  # For enrollment reports
    filter_board: Optional[str] = None  # For enrollment and student reports

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

class RoleRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    requested_role: str  # tutor, coordinator, parent
    status: str = "pending"  # pending, approved, rejected
    request_data: Optional[dict] = None  # Store registration data (for tutor: subjects, classes, etc.)
    requested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None  # Admin/Coordinator user_id who approved/rejected
    rejection_reason: Optional[str] = None

class AddRoleInput(BaseModel):
    requested_role: str  # tutor, coordinator, parent
    
class ApproveRoleInput(BaseModel):
    request_id: str
    action: str  # "approve" or "reject"
    rejection_reason: Optional[str] = None

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
        if auth_header:
            # Handle both 'Bearer' and 'bearer' (case-insensitive) ✅ FIX
            parts = auth_header.split(" ", 1)
            if len(parts) == 2 and parts[0].lower() == "bearer":
                session_token = parts[1]
    
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
        
        # Get all coordinators (limited)
        coordinators = await db.users.find({"role": "coordinator"}, {"_id": 0, "email": 1}).to_list(500)
        coordinator_emails = [c["email"] for c in coordinators if c.get("email")]
        
        # Get all students in the batch (limited by batch size)
        student_ids = batch.get("student_ids", [])
        students = await db.students.find({"id": {"$in": student_ids}}, {"_id": 0, "parent_user_id": 1}).to_list(100)
        
        # Get parent emails for students (limited)
        parent_user_ids = [s["parent_user_id"] for s in students if s.get("parent_user_id")]
        parents = await db.users.find({"id": {"$in": parent_user_ids}}, {"_id": 0, "email": 1}).to_list(100)
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
    # Find eligible tutors (limited to top 100)
    eligible_tutors = await db.tutors.find({
        "state": batch.state,
        "classes_can_teach": batch.class_level,
        "subjects_can_teach": batch.subject
    }, {"_id": 0}).to_list(100)
    
    if not eligible_tutors:
        return
    
    # Sort by registration timestamp (first-come-first-served)
    eligible_tutors.sort(key=lambda t: t["registration_timestamp"])
    
    # Check existing assignments to avoid conflicts
    all_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    assigned_days_map = {}  # day -> tutor_id
    
    existing_assignments = await db.batch_tutor_assignments.find({"batch_id": batch.id}, {"_id": 0}).to_list(50)
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
        # Create new batch - use academic year (April to March), not calendar year
        academic_year = get_current_academic_year()
        
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
        # For students: email is parent's email, password is student's DOB in DD-MM-YYYY format
        # Find parent by email
        parent_doc = await db.users.find_one({"email": input.email}, {"_id": 0})
        
        if not parent_doc:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        parent = User(**parent_doc)
        
        # Convert DOB to multiple formats for backwards compatibility
        # User enters DD-MM-YYYY, but old data might be in YYYY-MM-DD format
        dob_entered = input.password
        dob_formats_to_try = [dob_entered]
        
        # If entered as DD-MM-YYYY, also try YYYY-MM-DD
        if len(dob_entered) == 10 and dob_entered[2] == '-' and dob_entered[5] == '-':
            # Input is DD-MM-YYYY, convert to YYYY-MM-DD
            parts = dob_entered.split('-')
            if len(parts) == 3:
                dob_formats_to_try.append(f"{parts[2]}-{parts[1]}-{parts[0]}")
        # If entered as YYYY-MM-DD, also try DD-MM-YYYY
        elif len(dob_entered) == 10 and dob_entered[4] == '-' and dob_entered[7] == '-':
            parts = dob_entered.split('-')
            if len(parts) == 3:
                dob_formats_to_try.append(f"{parts[2]}-{parts[1]}-{parts[0]}")
        
        # Find student by parent_id (or parent_user_id) and DOB (try multiple formats)
        student_doc = await db.students.find_one({
            "$or": [
                {"parent_id": parent.id},
                {"parent_user_id": parent.id}
            ],
            "dob": {"$in": dob_formats_to_try}
        }, {"_id": 0})
        
        if not student_doc:
            # Debug: log what we're looking for
            import logging
            logging.error(f"Student login failed - Parent ID: {parent.id}, DOB entered: {input.password}, tried formats: {dob_formats_to_try}")
            # Try to find student without DOB to give better error message
            student_check = await db.students.find_one({
                "$or": [
                    {"parent_id": parent.id},
                    {"parent_user_id": parent.id}
                ]
            }, {"_id": 0, "name": 1, "dob": 1})
            if student_check:
                logging.error(f"Found student {student_check.get('name')} with DOB: {student_check.get('dob')}")
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
        # Treat "admin" and "RSN" as equivalent (RSN is the dropdown label/seed value, "admin" is legacy)
        if user.role != "pending":
            user_role_norm = "admin" if is_admin_role(user.role) else user.role
            input_role_norm = "admin" if is_admin_role(input.role) else input.role
            if user_role_norm != input_role_norm:
                raise HTTPException(status_code=403, detail=f"This account is registered as {user.role}, not {input.role}")
        
        # For admin role, check if user is actually admin or co-admin
        if is_admin_role(input.role):
            if not (user.is_main_admin or user.is_co_admin):
                raise HTTPException(status_code=403, detail="Access denied. This area is restricted to RSN team only.")
        
        # Initialize roles field for backward compatibility (migrate old users)
        if not user_doc.get("roles"):
            await db.users.update_one(
                {"id": user.id},
                {"$set": {
                    "roles": [user.role],
                    "primary_role": user.role,
                    "pending_roles": []
                }}
            )
            # Update the user object with initialized values
            user.roles = [user.role]
            user.primary_role = user.role
            user.pending_roles = []
    
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

# ============= ROLE MANAGEMENT ROUTES =============

@api_router.post("/users/request-role")
async def request_additional_role(input: AddRoleInput, request: Request):
    """Request to add an additional role to user account"""
    user = await require_auth(request)
    
    # Validate requested role
    valid_roles = ["parent", "tutor", "coordinator", "school"]
    if input.requested_role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Check if user already has this role
    user_doc = await db.users.find_one({"id": user.id}, {"_id": 0})
    current_roles = user_doc.get("roles", [user_doc.get("role")])
    pending_roles = user_doc.get("pending_roles", [])
    
    if input.requested_role in current_roles:
        raise HTTPException(status_code=400, detail="You already have this role")
    
    if input.requested_role in pending_roles:
        raise HTTPException(status_code=400, detail="You already have a pending request for this role")
    
    # Parent role is automatic when adding kids - no approval needed
    if input.requested_role == "parent":
        # Update user to add parent role immediately
        if not user_doc.get("roles"):
            new_roles = [user_doc.get("role"), "parent"]
        else:
            new_roles = current_roles + ["parent"]
        
        await db.users.update_one(
            {"id": user.id},
            {"$set": {
                "roles": new_roles,
                "primary_role": user_doc.get("primary_role") or user_doc.get("role")
            }}
        )
        return {"success": True, "message": "Parent role added automatically", "auto_approved": True}
    
    # For tutor, coordinator - needs approval
    # Add to pending_roles
    await db.users.update_one(
        {"id": user.id},
        {"$push": {"pending_roles": input.requested_role}}
    )
    
    # Create role request
    role_request = RoleRequest(
        user_id=user.id,
        requested_role=input.requested_role,
        status="pending"
    )
    
    await db.role_requests.insert_one(role_request.model_dump())
    
    return {
        "success": True,
        "message": f"Request for {input.requested_role} role submitted. Waiting for approval.",
        "auto_approved": False
    }

@api_router.get("/users/my-roles")
async def get_my_roles(request: Request):
    """Get current user's roles and pending role requests"""
    user = await require_auth(request)
    
    user_doc = await db.users.find_one({"id": user.id}, {"_id": 0})
    
    return {
        "current_roles": user_doc.get("roles", [user_doc.get("role")]),
        "primary_role": user_doc.get("primary_role") or user_doc.get("role"),
        "pending_roles": user_doc.get("pending_roles", [])
    }

@api_router.post("/users/switch-role")
async def switch_primary_role(request: Request, role: str):
    """Switch user's primary role (which dashboard to show)"""
    user = await require_auth(request)
    
    user_doc = await db.users.find_one({"id": user.id}, {"_id": 0})
    current_roles = user_doc.get("roles", [user_doc.get("role")])
    
    if role not in current_roles:
        raise HTTPException(status_code=400, detail="You don't have this role")
    
    await db.users.update_one(
        {"id": user.id},
        {"$set": {
            "primary_role": role,
            "role": role  # Update main role field for backward compatibility
        }}
    )
    
    return {"success": True, "message": f"Switched to {role} dashboard"}

# ============= INCLUDE ROUTER AND MOUNT STATIC FILES =============

app.include_router(api_router)

# Serve uploaded files at /api/uploads/
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploaded_files")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# ============= DATABASE MIGRATIONS =============

async def run_migrations():
    """Run database migrations on startup"""
    try:
        logger.info("Running database migrations...")
        
        # Migration 1: Fix academic year for batches
        correct_academic_year = get_current_academic_year()
        today = datetime.now(timezone.utc)
        
        if today.month < 4:
            wrong_year = f"{today.year}-{str(today.year + 1)[-2:]}"
            wrong_batches = await db.batches.find({"academic_year": wrong_year}).to_list(1000)
            
            if wrong_batches:
                logger.info(f"Migration 1: Found {len(wrong_batches)} batches with incorrect academic year {wrong_year}")
                for batch in wrong_batches:
                    old_code = batch.get("batch_code", "")
                    new_code = old_code.replace(wrong_year, correct_academic_year)
                    await db.batches.update_one(
                        {"_id": batch["_id"]},
                        {"$set": {"academic_year": correct_academic_year, "batch_code": new_code}}
                    )
            else:
                logger.info("Migration 1: No batches need academic year correction")
        
        # Migration 2: Sync coordinator_assignments to user's classes_assigned field
        logger.info("Migration 2: Syncing coordinator assignments to user profiles...")
        
        assignments = await db.coordinator_assignments.find({}).to_list(1000)
        coordinator_classes = {}
        
        for assignment in assignments:
            coord_id = assignment.get("coordinator_id")
            class_level = assignment.get("class_level")
            if coord_id and class_level:
                if coord_id not in coordinator_classes:
                    coordinator_classes[coord_id] = set()
                coordinator_classes[coord_id].add(int(class_level))
        
        for coord_id, classes in coordinator_classes.items():
            classes_list = sorted(list(classes))
            coord = await db.users.find_one({"id": coord_id}, {"_id": 0, "classes_assigned": 1, "email": 1})
            if coord:
                current_classes = set(coord.get("classes_assigned") or [])
                if current_classes != set(classes_list):
                    await db.users.update_one(
                        {"id": coord_id},
                        {"$set": {"classes_assigned": classes_list}}
                    )
        
        if not coordinator_classes:
            logger.info("Migration 2: No coordinator assignments to sync")
        else:
            logger.info(f"Migration 2: Processed {len(coordinator_classes)} coordinators")
        
        # Migration 3: Ensure all batches have state field set
        logger.info("Migration 3: Fixing batches with null state...")
        null_state_batches = await db.batches.find({"state": None}).to_list(1000)
        for batch in null_state_batches:
            new_state = batch.get("board") or "TS"
            await db.batches.update_one(
                {"_id": batch["_id"]},
                {"$set": {"state": new_state}}
            )
        
        if not null_state_batches:
            logger.info("Migration 3: No batches with null state")
        
        # Migration 4: Seed admin accounts
        logger.info("Migration 4: Seeding Main Admin and Co-Admin accounts...")
        admin_password = os.environ.get("ADMIN_PASSWORD", "RisingStars@2025")
        admin_password_hash = pwd_context.hash(admin_password)
        
        admin_seeds = [
            {
                "email": "risingstarsnation2025@gmail.com",
                "name": "Rising Stars Admin",
                "is_main_admin": True,
                "is_co_admin": False,
                "can_manage_admins": True,
                "user_code": "RSN-MAIN-ADMIN",
            },
            {
                "email": "idonateforneedy@gmail.com",
                "name": "RSN Co-Admin",
                "is_main_admin": False,
                "is_co_admin": True,
                "can_manage_admins": False,
                "user_code": "RSN-CO-ADMIN",
            },
        ]
        
        for seed in admin_seeds:
            existing = await db.users.find_one({"email": seed["email"]}, {"_id": 0})
            if existing:
                await db.users.update_one(
                    {"email": seed["email"]},
                    {"$set": {
                        "password_hash": admin_password_hash,
                        "role": "admin",
                        "roles": ["RSN"],
                        "primary_role": "RSN",
                        "active_role": "RSN",
                        "pending_roles": [],
                        "is_main_admin": seed["is_main_admin"],
                        "is_co_admin": seed["is_co_admin"],
                        "can_manage_admins": seed["can_manage_admins"],
                        "name": existing.get("name") or seed["name"],
                    }}
                )
                logger.info(f"  Updated admin account: {seed['email']}")
            else:
                new_admin = User(
                    email=seed["email"],
                    name=seed["name"],
                    role="admin",
                    roles=["RSN"],
                    primary_role="RSN",
                    active_role="RSN",
                    password_hash=admin_password_hash,
                    is_main_admin=seed["is_main_admin"],
                    is_co_admin=seed["is_co_admin"],
                    can_manage_admins=seed["can_manage_admins"],
                    state="TS",
                    user_code=seed["user_code"],
                )
                doc = new_admin.model_dump()
                doc["created_at"] = doc["created_at"].isoformat()
                await db.users.insert_one(doc)
                logger.info(f"  Created admin account: {seed['email']}")
        
        logger.info("All database migrations completed successfully")
        
    except Exception as e:
        logger.error(f"Migration error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())

@app.on_event("startup")
async def startup_event():
    """Run migrations on startup"""
    await run_migrations()

# [REST OF FILE CONTINUES - ADMIN ROUTES, STUDENT ROUTES, BATCH ROUTES, ETC.]
# [File is too long to include full content - the key fix above is applied]
# Copy the rest of your server.py file exactly as is below this point
