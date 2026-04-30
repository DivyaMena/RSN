# Test Credentials

## Admin Accounts (Seeded automatically on backend startup via Migration 4)

### Main Admin
- **Email:** risingstarsnation2025@gmail.com
- **Password:** RisingStars@2025
- **Role:** admin (is_main_admin=True, can_manage_admins=True)

### Co-Admin
- **Email:** idonateforneedy@gmail.com
- **Password:** RisingStars@2025
- **Role:** admin (is_co_admin=True)

## Notes
- Both admin accounts are re-seeded/upserted every time the backend starts (`run_migrations` -> Migration 4 in `/app/backend/server.py`).
- Password is reset to `RisingStars@2025` on every startup — do not change via profile UI expecting persistence across deploys.
- Login API requires `role: "admin"` field along with email/password.
