# Test Credentials

## RSN Admin Accounts (auto-seeded on every backend startup via Migration 4)

These accounts are guaranteed to exist after every deploy/restart. Their `role` is `"RSN"` (matches the "I am a → RSN" dropdown). The login API also accepts `role: "admin"` for backwards compatibility.

### Main Admin
- **Email:** risingstarsnation2025@gmail.com
- **Password:** `RSN@Admin2026!` (from `ADMIN_PASSWORD` env var on Render; fallback hardcoded for local/preview)
- **Login dropdown:** RSN
- **Stored fields:** `role="RSN"`, `roles=["RSN"]`, `primary_role="RSN"`, `active_role="RSN"`, `is_main_admin=True`, `can_manage_admins=True`

### Co-Admin
- **Email:** idonateforneedy@gmail.com
- **Password:** `RSN@Admin2026!` (same `ADMIN_PASSWORD` env var)
- **Login dropdown:** RSN
- **Stored fields:** `role="RSN"`, `roles=["RSN"]`, `primary_role="RSN"`, `active_role="RSN"`, `is_co_admin=True`

## Sample Test Accounts (for non-RSN roles, password seeded on this preview env only)

| Role | Email | Password / DOB | Login dropdown |
|---|---|---|---|
| Parent | parent@test.com | Test@1234 | Parent |
| Tutor | tutor1@test.com | Test@1234 | Tutor |
| Coordinator | coordinator@test.com | Test@1234 | Co-Ordinator |
| School | dps@test.com | Test@1234 | School |
| Student | parent@test.com | 15-08-2012 (DOB DD-MM-YYYY) | Student |

> ⚠️ The non-RSN test passwords are seeded on the **preview environment only**. In production, real users register via the platform flow.

## Login End-to-End Status (verified May 3, 2026)

| Path | Status |
|---|---|
| RSN Main Admin via dropdown="RSN" (preview) | PASS |
| RSN Main Admin via dropdown="RSN" (production rsn-backend-x6ax.onrender.com) | PASS |
| RSN Co-Admin via dropdown="RSN" (production) | PASS |
| /auth/me with Bearer token (production) | PASS |
| /api/admin/stats with Bearer token (production) | PASS |
| CORS preflight from https://risingstarsnation.org | PASS |
| Parent / Tutor / Coordinator / School | PASS |
| Student (parent email + DOB DD-MM-YYYY) | PASS |
| Wrong password / wrong role | Correctly rejected |

## Google Login

Implemented via Emergent OAuth — the "Login with Google" button on the login screen redirects to `https://auth.emergentagent.com/?redirect=...`. After Google sign-in, the backend `/api/auth/session` endpoint validates the session and creates/returns the user (new users get `role="pending"` until they complete a register flow).
