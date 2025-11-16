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
from subject_config import get_subjects_for_class, is_valid_subject_for_class, SUBJECT_NAMES

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============= MODELS =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    picture: Optional[str] = None
    role: str  # parent, tutor, coordinator, admin
    state: Optional[str] = None  # TS, AP, TN
    user_code: Optional[str] = None  # RSN-TS-T-12345 or RSN-TS-P-12345
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    class_level: int  # 6-10
    board: str  # TS, AP, TN
    school_name: str
    location: str
    roll_no: str
    subjects: List[str]  # ["MAT", "PHY", "SCI", "BIO", "ENG"]
    enrollment_year: int
    user_id: Optional[str] = None  # Linked user account for student login
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Tutor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    tutor_code: str  # RSN-TS-T-12345
    aadhaar_number: str  # 12-digit Aadhaar for KYC (or file path)
    aadhaar_page1_url: Optional[str] = None  # Aadhaar card page 1 upload
    aadhaar_page2_url: Optional[str] = None  # Aadhaar card page 2 upload (optional)
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BatchTutorAssignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    batch_id: str
    tutor_id: str
    assigned_days: List[str]  # ["Monday", "Wednesday"]
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

# ============= INPUT MODELS =============

class RegisterParentInput(BaseModel):
    state: str

class RegisterTutorInput(BaseModel):
    aadhaar_number: str
    board_preference: str  # Which board curriculum they want to teach
    current_address: str
    pincode: str
    classes_can_teach: List[int]
    subjects_can_teach: List[str]
    available_days: List[str]

class RegisterStudentInput(BaseModel):
    name: str
    aadhaar_number: str
    class_level: int
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

class CreateBatchInput(BaseModel):
    state: str
    academic_year: str
    class_level: int
    subject: str
    board: str

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
        
        batch = Batch(
            batch_code=generate_batch_code(student.board, academic_year, student.class_level, subject),
            state=student.board,
            academic_year=academic_year,
            class_level=student.class_level,
            subject=subject,
            board=student.board,
            student_ids=[student.id],
            status="waitlist"
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
    
    user_code = generate_user_code(input.state, "tutor")
    
    # Create tutor profile (pending approval)
    tutor = Tutor(
        user_id=user.id,
        tutor_code=user_code,
        aadhaar_number=input.aadhaar_number,
        board_preference=input.board_preference,
        current_address=input.current_address,
        pincode=input.pincode,
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
    
    return {"user": user, "message": "Registration submitted for coordinator approval"}

@api_router.post("/users/register/coordinator")
async def register_coordinator(input: RegisterParentInput, request: Request):
    """Register as coordinator (requires admin approval in production)"""
    user = await require_auth(request)
    
    if user.role != "pending":
        raise HTTPException(status_code=400, detail="User already registered")
    
    user_code = generate_user_code(input.state, "coordinator")
    
    await db.users.update_one(
        {"id": user.id},
        {"$set": {"role": "coordinator", "state": input.state, "user_code": user_code}}
    )
    
    user.role = "coordinator"
    user.state = input.state
    user.user_code = user_code
    
    return user

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
    
    return [Batch(**b) for b in batches]

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
    
    batch = Batch(
        batch_code=generate_batch_code(input.state, input.academic_year, input.class_level, input.subject),
        state=input.state,
        academic_year=input.academic_year,
        class_level=input.class_level,
        subject=input.subject,
        board=input.board,
        student_ids=[],
        status="waitlist"
    )
    
    doc = batch.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.batches.insert_one(doc)
    
    return batch

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
    
    # Create assignment
    assignment = BatchTutorAssignment(
        batch_id=input.batch_id,
        tutor_id=input.tutor_id,
        assigned_days=input.assigned_days
    )
    
    doc = assignment.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.batch_tutor_assignments.insert_one(doc)
    
    return {"success": True, "assignment": assignment}

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
    
    return {"success": True, "count": len(items)}

# ============= TUTOR ROUTES =============

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

@api_router.get("/tutors/me")
async def get_my_tutor_profile(request: Request):
    """Get current tutor's profile"""
    user = await require_auth(request)
    
    if user.role != "tutor":
        raise HTTPException(status_code=403, detail="Only tutors can access this endpoint")
    
    tutor = await db.tutors.find_one({"user_id": user.id}, {"_id": 0})
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    
    return tutor

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
    
    return {"success": True, "message": f"Tutor status updated to {status}"}

@api_router.get("/tutors/pending")
async def get_pending_tutors(request: Request):
    """Get pending tutor registrations (coordinator/admin only)"""
    user = await require_auth(request)
    
    if user.role not in ["coordinator", "admin"]:
        raise HTTPException(status_code=403, detail="Only coordinators can view pending tutors")
    
    tutors = await db.tutors.find({"approval_status": "pending"}, {"_id": 0}).to_list(None)
    
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
    
    student = await db.students.find_one({"user_id": user.id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    return student

@api_router.get("/students/me/batches")
async def get_my_batches(request: Request):
    """Get batches for logged-in student"""
    user = await require_auth(request)
    
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this endpoint")
    
    student = await db.students.find_one({"user_id": user.id})
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    batches = await db.batches.find({"student_ids": student["id"]}, {"_id": 0}).to_list(None)
    return [Batch(**b) for b in batches]

# ============= REMEDIAL CLASS ROUTES =============

@api_router.post("/remedial/request")
async def create_remedial_request(input: CreateRemedialRequestInput, request: Request):
    """Student requests remedial class"""
    user = await require_auth(request)
    
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can request remedial classes")
    
    # Get student profile
    student = await db.students.find_one({"user_id": user.id})
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Get batch details
    batch = await db.batches.find_one({"id": input.batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    remedial_request = RemedialRequest(
        student_id=student["id"],
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
