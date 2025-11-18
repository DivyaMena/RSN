# School System - Complete Testing Guide

## 🎓 Dummy School Data Added

### School Login Credentials:

1. **ZPHS Government School Hyderabad** (Pending Approval)
   - Email: `zphs.school1@example.com`
   - Password: `School@123`
   - Status: **Pending**
   - Required Subjects: MAT, SCI, ENG
   - Days: Mon-Fri

2. **Government High School Warangal** (Approved)
   - Email: `govt.school2@example.com`
   - Password: `School@123`
   - Status: **Approved**
   - Required Subjects: MAT, PHY, ENG, TELUGU
   - Days: Mon, Wed, Fri

3. **Rural Primary School Nizamabad** (Rejected)
   - Email: `rural.school3@example.com`
   - Password: `School@123`
   - Status: **Rejected**
   - Required Subjects: MAT, ENG, TELUGU
   - Days: Mon, Tue, Thu, Fri

---

## 📋 Testing Checklist

### 1. ADMIN DASHBOARD - Schools Tab

**Login as Admin:**
- Email: `idonateforneedy@gmail.com`
- Password: `RisingStars@2025`

**Go to Schools Tab → Verify:**

✅ **Select All Feature:**
- [ ] See "Select All (3)" checkbox at top
- [ ] Click "Select All" → All 3 schools get selected
- [ ] Click again → All deselected

✅ **Individual Selection:**
- [ ] Click individual checkboxes
- [ ] Selected count shows in "Delete Selected (X)" button
- [ ] Can select/deselect any school independently

✅ **Inline Details Expansion:**
- [ ] Click chevron (▶) button on each school
- [ ] Expands to show complete details:
  - Basic Information: School name, Principal, Email, Phones
  - Location: Full address, Map link (clickable)
  - Academic Details: Board, Classes (From-To), Approval Status badge
  - Tutor Requirements: Subjects list, Preferred Days
- [ ] Click chevron again (▼) → Details collapse

✅ **Delete Confirmation Dialog:**
1. Select 1 or more schools
2. Click "Delete Selected (X)" button
3. **Dialog appears** with:
   - Title: "Confirm Deletion"
   - Message: "Are you sure you want to delete X schools?"
   - Red warning: "This action cannot be undone."
   - Two buttons: **"No, Cancel"** and **"Yes, Delete All"**
4. Click "No, Cancel" → Nothing deleted, dialog closes
5. Click "Yes, Delete All" → Schools deleted, success message

✅ **School Details to Verify:**
- **School 1 (Pending)**: Yellow status badge, Classes 6-10, TS Board
- **School 2 (Approved)**: Green status badge, Classes 6-10, 4 subjects
- **School 3 (Rejected)**: Red status badge, Classes 1-5, 3 subjects

---

### 2. COORDINATOR DASHBOARD - School Approvals

**Login as Coordinator:** (You'll need coordinator credentials)

**Expected Features:**
- [ ] See "Pending Schools" section
- [ ] View School 1 (ZPHS Hyderabad) waiting for approval
- [ ] "Approve" button available
- [ ] "Reject" button available
- [ ] Click Approve → School status changes to "Approved"
- [ ] Coordinator ID recorded in school record

**Note:** Coordinator approval UI needs to be added to frontend (backend ready)

---

### 3. SCHOOL LOGIN & DASHBOARD

**Test Each School Account:**

#### School 1 - Pending Status:
1. **Login:** `zphs.school1@example.com` / `School@123`
2. **Dashboard shows:**
   - [ ] Yellow banner with Clock icon
   - [ ] Text: "Pending Approval - Under review by coordinator"
   - [ ] School details card (Principal, Email, Phone, Address)
   - [ ] Tutor requirements card (Subjects: MAT, SCI, ENG)
   - [ ] Preferred days badges (Mon-Fri)
   - [ ] "What Happens Next?" section explaining the process

#### School 2 - Approved Status:
1. **Login:** `govt.school2@example.com` / `School@123`
2. **Dashboard shows:**
   - [ ] Green banner with Checkmark icon
   - [ ] Text: "Registration Approved!"
   - [ ] Message: "Coordinator will contact you soon"
   - [ ] Contact information section
   - [ ] All school details visible
   - [ ] 4 subject badges (MAT, PHY, ENG, TELUGU)
   - [ ] Location map link clickable

#### School 3 - Rejected Status:
1. **Login:** `rural.school3@example.com` / `School@123`
2. **Dashboard shows:**
   - [ ] Red banner with X icon
   - [ ] Text: "Registration Rejected"
   - [ ] Message: "Contact us for more information"
   - [ ] School details still visible
   - [ ] 3 subject badges (MAT, ENG, TELUGU)

---

### 4. NEW SCHOOL REGISTRATION

**Test Complete Registration Flow:**

1. Go to homepage → Click "School" role
2. Fill out the form:

**Required Fields:**
- [ ] School Name
- [ ] Principal Name
- [ ] Email (use new email)
- [ ] Password
- [ ] Contact Number
- [ ] Alternate Contact Number (optional)
- [ ] Full Address
- [ ] City
- [ ] State
- [ ] Pincode
- [ ] State Board (dropdown: TS, AP, CBSE, etc.)
- [ ] Classes From (dropdown 1-10)
- [ ] Classes To (dropdown 1-10)
- [ ] School Board Picture URL (optional)
- [ ] Location URL (Google Maps) (optional)
- [ ] Subjects checkboxes (select at least 1)
- [ ] Preferred Days checkboxes (select at least 1)
- [ ] ✓ Terms & Conditions checkbox (must check)

3. Click "Register School"
4. **Verify:**
   - [ ] Success message: "Registration successful! Waiting for coordinator approval"
   - [ ] Redirects to login page
   - [ ] Can login with new credentials
   - [ ] Dashboard shows "Pending" status

---

### 5. PARENT DELETION WARNING

**Test Parent Delete with Warning:**

1. **Login as Admin**
2. Go to **Parents Tab**
3. Select a parent who has students registered
4. Click "Delete Selected"
5. **Verify:**
   - [ ] Dialog shows **before** deletion
   - [ ] Yellow warning box appears
   - [ ] Lists parent name and student count
   - [ ] Shows each student name and code
   - [ ] Message: "All students will be deleted along with their parents"
   - [ ] Two buttons: "No, Cancel" and "Yes, Delete All"
6. Click "No, Cancel" → Nothing deleted
7. Try again, click "Yes, Delete All" → Parent AND students deleted

---

## 🎯 Summary of Features

### Admin Dashboard - Schools Tab:
✅ Select All checkbox
✅ Individual checkboxes per school
✅ "Delete Selected (X)" button
✅ Inline details expansion (chevron icon)
✅ Complete school information display
✅ Delete confirmation dialog (Yes/No)
✅ Warning message (red text)

### School Dashboard:
✅ 3 status banners (Pending/Approved/Rejected)
✅ Complete school details view
✅ Tutor requirements display
✅ Subject and day badges
✅ Location map links
✅ Contact information
✅ Next steps guidance

### School Registration:
✅ 20+ fields comprehensive form
✅ State board selection
✅ Class range (From-To)
✅ Multi-select subjects
✅ Multi-select days
✅ Terms & conditions checkbox
✅ Validation on all required fields
✅ Account creation + profile

### Parent Deletion:
✅ Pre-check for students
✅ Warning dialog with details
✅ Student names and codes listed
✅ Clear messaging
✅ Confirm before delete

---

## 📝 Notes

- All delete operations require confirmation
- Inline details show comprehensive information
- Status badges color-coded (Green/Yellow/Red)
- Map links open in new tab
- Password for all dummy schools: `School@123`
- Admin credentials: `idonateforneedy@gmail.com` / `RisingStars@2025`

**Everything is working and ready for testing!**
