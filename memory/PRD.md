# Rising Stars Nation - Product Requirements Document

## Original Problem Statement
An educational platform for providing free online tuition to students who need extra support (Classes 6-10). The platform supports multiple user roles: Admin, Co-Admin, Coordinator, Tutor, Parent, Student, and School.

## Core Features
1. **Role-Based Dashboards**: Separate dashboards for Admin, Coordinator, Tutor, Parent, and Student
2. **Batch Management**: Create and manage batches of students with tutor assignments
3. **Coordinator Assignments**: Assign coordinators to specific classes/boards
4. **Academic Year Rollover**: Promote students to next class at year end
5. **Reports System**: Generate enrollment, attendance, and performance reports
6. **Multi-Role System**: Users can have multiple roles (e.g., Parent who is also a Tutor)
7. **School Registration**: Schools can register to participate in the program
8. **Curriculum Management**: Upload and manage curriculum content

## User Roles
- **Admin (RSN)**: Full platform control, can manage all users and settings
- **Co-Admin**: Limited admin access, assigned by main admin
- **Coordinator**: Manages tutors and students within assigned classes/boards
- **Tutor**: Provides tutoring sessions, logs attendance
- **Parent**: Registers students, monitors progress
- **Student**: Accesses tutoring sessions
- **School**: Partner schools for student outreach

## Tech Stack
- **Frontend**: React with Shadcn/UI components
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Email**: SMTP via Gmail

## What's Been Implemented

### April 30, 2026 - RSN Role Alignment + Login Verification
- [x] **RSN as canonical admin role identifier**:
  - Migration 4 now seeds Main Admin & Co-Admin with `role="RSN"`, `roles=["RSN"]`, `primary_role="RSN"`, `active_role="RSN"`
  - Added `ADMIN_ROLES = ("admin", "RSN")` constant + `is_admin_role()` helper in `server.py`
  - Updated all 38+ permission checks (backend) and route guards (frontend `App.js`, `LogBoard.js`) to accept either "admin" or "RSN"
  - Login endpoint normalizes "admin"/"RSN" as equivalent (backwards compatible)
  - Frontend Login dropdown now sends `value: "RSN"` matching the "RSN" label
  - DB queries with `role:"admin"` updated to `role: {"$in": ["admin", "RSN"]}` (admin delete endpoint)
- [x] **End-to-end login verified for ALL 6 roles + edge cases**: see `/app/memory/test_credentials.md` for the matrix
- [x] **Google login confirmed implemented**: `/api/auth/session` (Emergent OAuth) + `handleGoogleLogin` in Login.js
- [x] **Render-portable upload path**: `UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploaded_files")` — works on Render, local, Emergent

### April 30, 2026 - Deployment Readiness
- [x] **Deployment Blockers Resolved**:
  - Rewrote `/app/.gitignore` — fully removed `*.env`, `.env`, `.env.*` duplicates
  - Added Migration 4 in `server.py` startup: auto-seeds Main Admin + Co-Admin with `RisingStars@2025` on every boot
  - Verified both admin logins return valid tokens via curl
  - CORS_ORIGINS correctly lists production custom domain (risingstarsnation.org) + preview + localhost
- [x] Deployment agent re-verified: **status: pass — no blockers**

### January 17, 2026 - Session Updates
- [x] **Deployment Blockers Fixed**:
  - Fixed CORS configuration (set to `*`)
  - Added FRONTEND_URL to backend .env
  - Optimized N+1 database queries with aggregation pipelines
  - Added query limits to prevent memory issues
  
- [x] **Multi-Role System Frontend**:
  - Added Role Requests tab in Admin Dashboard
  - Implemented Approve/Reject functionality for role requests
  - Backend APIs were already complete from previous session

### Previous Sessions
- [x] Reports section with multiple report types
- [x] Academic Year Rollover feature
- [x] Donate Us button
- [x] Data visibility fixes (address/pincode, image URLs)
- [x] Coordinator unavailability feature
- [x] School registration with file upload
- [x] Curriculum display logic fixes
- [x] Mobile responsiveness improvements
- [x] Brand logo integration

## Pending Items

### P1 - High Priority
- [ ] Final user verification of all features
- [ ] Object Storage Migration: Render filesystem is ephemeral; school documents/photos wipe on every deploy. Migrate to S3 / Cloudflare R2 / Emergent object storage.

### P2 - Medium Priority  
- [ ] Coordinator Dashboard Redesign:
  - Batches tab with filters (Board, Class, Subject, Day, Tutors)
  - Tutors tab with sub-tabs (Active, Pending, Suspended, Blacklisted, Unavailable)
  - Schools tab with filters
- [ ] Pre-deployment configuration: Update REACT_APP_BACKEND_URL to production domain

### P3 - Low Priority / Backlog
- [ ] "Donate Us" button on registration pages (needs user clarification)
- [ ] AdminDashboard.js and CoordinatorDashboard.js refactoring for better maintainability

## Changelog

### 2026-05-03 — Production auth fixed (Vercel + Render)
- **Root cause**: Admin user records in production Atlas DB were missing the `id` field. On every login, `User(**user_doc)` auto-generated a fresh UUID via Pydantic default, so sessions were created with a user_id that didn't exist → `/auth/me` returned 401 → dashboard bounced to home.
- **Fix (code)**: Migration 4 (`run_migrations()` in `server.py`) now self-heals admins missing `id`, `user_code`, or `created_at` on every startup.
- **Fix (data)**: Directly patched production DB to assign stable `id` to both admin records and flushed stale sessions.
- **Fix (CORS)**: Added `allow_origin_regex` default that auto-accepts `*.vercel.app`, `*.onrender.com`, and localhost, without breaking the explicit `CORS_ORIGINS` env var on Render (`https://risingstarsnation.org,https://www.risingstarsnation.org`).
- **Verified via curl**: login → /auth/me → /api/admin/stats — all 200 on `https://rsn-backend-x6ax.onrender.com` with Origin `https://risingstarsnation.org`.

## API Endpoints

### Multi-Role System
- `POST /api/auth/request-role` - User requests additional role
- `POST /api/auth/switch-role` - User switches active role
- `GET /api/admin/role-requests` - Get pending role requests
- `POST /api/admin/role-requests/approve` - Approve/reject role request

### Reports
- `GET /api/admin/reports/enrollments`
- `GET /api/admin/reports/attendance`
- `GET /api/admin/reports/performance`

## Database Collections
- `users` - All user accounts with roles array and active_role
- `students` - Student profiles
- `tutors` - Tutor profiles
- `schools` - School registrations
- `batches` - Batch configurations
- `role_requests` - Pending role change requests
- `coordinator_assignments` - Class/board assignments

## Credentials
- **Admin**: risingstarsnation2025@gmail.com / `RSN@Admin2026!` (from `ADMIN_PASSWORD` env var)
- **Co-Admin**: idonateforneedy@gmail.com / `RSN@Admin2026!` (same env var)
