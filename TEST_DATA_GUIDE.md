# Rising Stars Nation - Test Data & Access Guide

## 🎉 Your Free Online Tuition App is Ready!

**Website**: https://edu-dashboard-fix.preview.emergentagent.com
**Your Domain**: www.risingstarsnation.com (point to the app when ready)

---

## 🔐 How to Access the App

### Method 1: Test Login Portal (RECOMMENDED)
1. Go to: https://edu-dashboard-fix.preview.emergentagent.com/test-login
2. Click on any user role to instantly login
3. Explore the complete app!

### Method 2: Direct Access
Navigate to dashboard and the app will use test credentials automatically:
- **Parent Dashboard**: `/dashboard` (with parent token in localStorage)
- **Tutor Dashboard**: `/dashboard` (with tutor token in localStorage)
- **Coordinator Dashboard**: `/dashboard` (with coordinator token in localStorage)

---

## 👥 Test Users & What You Can See

### 1️⃣ **PARENT** (Rajesh Kumar)
**Email**: parent@test.com  
**What to explore**:
- ✅ View **15 registered students** (Aarav Patel, Ananya Singh, etc.)
- ✅ See **4 batches** (3 active, 1 waitlist)
- ✅ Student codes: **RSN-TS-S-2025-10001** format
- ✅ Batch codes: **RSN-TS-2025-26-C9-MAT-001** format
- ✅ Click "View Log Board" to see tutor posts
- ✅ Register more students (unlimited)

**Test**: Click on any student → View their batches → Check log board entries

### 2️⃣ **TUTOR 1** (Priya Sharma - Math & Physics)
**Email**: tutor1@test.com  
**What to explore**:
- ✅ Assigned to **2 batches** (Math & Physics)
- ✅ Days: Monday, Wednesday, Friday
- ✅ Can create **log board entries**
- ✅ Post Google Meet links: https://meet.google.com/xyz-abcd-efg
- ✅ Mark curriculum items covered
- ✅ Entries automatically **locked** after creation

**Test**: Click "Manage Log Board" → Create new entry → Add Meet link → Select curriculum

### 3️⃣ **TUTOR 2** (Anil Reddy - Science & Biology)
**Email**: tutor2@test.com  
**What to explore**:
- ✅ Assigned to **1 batch** (Science)
- ✅ Days: Tuesday, Thursday, Saturday
- ✅ Different tutor for different days on same batch

**Test**: Verify multi-tutor assignment works

### 4️⃣ **COORDINATOR** (Lakshmi Devi)
**Email**: coordinator@test.com  
**What to explore**:
- ✅ View **all 4 batches** system-wide
- ✅ Statistics: 4 batches, 3 active, 2 tutors
- ✅ **Assign tutors** to batches
- ✅ **Edit log board** entries (only coordinators can do this!)
- ✅ Manage academic year rollover

**Test**: Click "Assign Tutor" → Select tutor → Choose days → Assign

---

## 📊 Test Data Summary

### Students: 15
- All in Class 9, TS Board
- Schools: Government High School Hyderabad, etc.
- Codes: RSN-TS-S-2025-10001 to RSN-TS-S-2025-10015

### Batches: 4

| Batch Code | Subject | Class | Status | Students | Academic Year |
|------------|---------|-------|--------|----------|---------------|
| RSN-TS-2025-26-C9-MAT-001 | Mathematics | 9 | Active | 15/25 | 2025-26 |
| RSN-TS-2025-26-C9-PHY-002 | Physics | 9 | Active | 15/25 | 2025-26 |
| RSN-TS-2025-26-C9-SCI-003 | Science | 9 | Active | 12/25 | 2025-26 |
| RSN-TS-2025-26-C10-MAT-004 | Mathematics | 10 | **Waitlist** | 3/25 | 2025-26 |

**Note**: Waitlist batch needs 10 students minimum to become active!

### Tutors: 2

| Tutor | Code | Subjects | Classes | Days |
|-------|------|----------|---------|------|
| Priya Sharma | RSN-TS-T-00001 | Math, Physics | 9-10 | Mon, Wed, Fri |
| Anil Reddy | RSN-TS-T-00002 | Science, Biology, English | 8-9 | Tue, Thu, Sat |

### Log Board Entries: 4
- **Math Class** (3 days ago): Number Systems - Rational and Irrational Numbers
- **Math Class** (1 day ago): Polynomials - Introduction and Basic Operations
- **Physics Class** (2 days ago): Motion - Speed, Velocity and Acceleration
- **Math Class** (Today): Linear Equations in Two Variables
  - Link: https://meet.google.com/todays-math-class
  - Notes: "Today's class at 5:00 PM - We'll cover graphical solutions"

### Curriculum: 36+ Items
Pre-seeded for TS and AP boards, classes 6-10, all subjects

---

## 🧪 Features to Test

### ✅ Code Generation
- Student codes: `RSN-{STATE}-S-{YEAR}-{UID}`
- Tutor codes: `RSN-{STATE}-T-{UID}`
- Batch codes: `RSN-{STATE}-{ACAD_YEAR}-C{CLASS}-{SUBJECT}-{SERIAL}`

### ✅ Automatic Batch Creation
- Register 10+ students for same class+subject → Batch auto-created
- Status changes: Waitlist → Active (at 10 students)
- Status changes: Active → Full (at 25 students)

### ✅ Multi-Tutor Assignment
- Same batch can have multiple tutors
- Each tutor assigned specific days
- Example: Priya (Mon/Wed/Fri) + Anil (Tue/Thu/Sat) on same batch

### ✅ Log Board Locking
- Tutors create entries
- Entries automatically locked
- **Only coordinator/admin can edit** locked entries
- Parents and students can view but not edit

### ✅ Google Meet Links
- Tutors post their own Meet links
- Links visible to all batch members
- Can be updated by coordinator if needed

### ✅ Curriculum Tracking
- Pre-populated curriculum for each subject
- Tutors mark which topics covered
- Parents/students see progress
- Topics displayed as badges in log entries

---

## 🔄 How to Reset/Regenerate Test Data

If you want fresh test data:

```bash
cd /app/backend
python seed_test_data.py
```

This will:
1. Clear all existing data
2. Create 4 test users (parent, 2 tutors, coordinator)
3. Generate 15 students
4. Create 4 batches (3 active, 1 waitlist)
5. Assign tutors to batches
6. Create 4 log board entries with Google Meet links

---

## 🎯 What Makes This Special

### For Students Needing Extra Support
- ✅ Free online tuition for government school students
- ✅ Small batches (25 max) for better attention
- ✅ Multiple tutors available on different days
- ✅ Clear curriculum tracking
- ✅ Access to Google Meet classes
- ✅ Can see what's been taught and what's coming

### For Volunteer Tutors
- ✅ Teach 1-2 hours on chosen days
- ✅ Post own Google Meet links
- ✅ Track curriculum coverage
- ✅ Help students from schools with teacher shortages
- ✅ Make real impact

### For Parents
- ✅ Register unlimited children
- ✅ Track all batches and classes
- ✅ See what topics are covered
- ✅ Access Google Meet links
- ✅ Monitor progress

### For Coordinators
- ✅ Manage entire system
- ✅ Assign tutors flexibly
- ✅ Edit log boards if needed
- ✅ Handle academic year rollover
- ✅ View system-wide statistics

---

## 📱 Next Steps

1. **Test everything** using the test login portal
2. **Verify all features** work as expected
3. **Point your domain** (www.risingstarsnation.com) to the app
4. **Start onboarding** real parents, students, and tutors
5. **Use Google OAuth** for real user authentication

---

## 💡 Tips

- **Batch codes** show state, academic year, class, and subject
- **Waitlist batches** need 10 students to activate
- **Log board** is the heart of the system - tutors post here
- **Academic year** format: 2025-26 (not 2025-2026)
- **Multiple states** supported: TS (Telangana), AP (Andhra Pradesh), TN (Tamil Nadu)

---

## 🎉 Everything Works!

All core features are implemented and tested:
✅ Authentication with roles  
✅ Student registration (unlimited)  
✅ Automatic batch creation  
✅ Tutor assignments with days  
✅ Log board with locking  
✅ Google Meet link posting  
✅ Curriculum tracking  
✅ Code generation  
✅ Multi-tutor per batch  
✅ Coordinator controls  

**Your free online tuition platform is ready to help students!**
