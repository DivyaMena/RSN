#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class RisingStarsAPITester:
    def __init__(self, base_url="https://risingstarsnation.org"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Test credentials from review request
        self.test_credentials = {
            "admin": {"email": "admin@risingstars.com", "password": "password"},
            "coordinator": {"email": "test-coordinator@risingstarsnation.com", "password": "password123"},
            "tutor": {"email": "milletmomentz@gmail.com", "password": "password"},
            "student": {"email": "vignesh.student@example.com", "password": "password"},
            "school": {"email": "zphs.school1@example.com", "password": "School@123"}
        }
        
    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
        
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
            
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    self.log(f"   Error: {error_detail}")
                except:
                    self.log(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    'test': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'endpoint': endpoint
                })
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            self.failed_tests.append({
                'test': name,
                'error': str(e),
                'endpoint': endpoint
            })
            return False, {}

    def login_as_role(self, role):
        """Login as specific role using test credentials"""
        if role not in self.test_credentials:
            self.log(f"❌ No credentials for role: {role}")
            return False
            
        creds = self.test_credentials[role]
        login_data = {
            "email": creds["email"],
            "password": creds["password"],
            "role": role
        }
        
        success, response = self.run_test(
            f"Login as {role.title()}",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and response.get("session_token"):
            self.session_token = response["session_token"]
            self.user_data = response.get("user", {})
            self.log(f"✅ Logged in as {role}: {self.user_data.get('name', 'Unknown')}")
            return True
        else:
            self.log(f"❌ Failed to login as {role}")
            return False

    def test_auth_flow(self):
        """Test authentication endpoints"""
        self.log("\n🔐 Testing Authentication Flow...")
        
        # Test /auth/me without token (should fail)
        success, _ = self.run_test(
            "Auth Me (No Token)",
            "GET", 
            "auth/me",
            401
        )
        
        # Test login with invalid credentials
        success, _ = self.run_test(
            "Login Invalid Credentials",
            "POST",
            "auth/login",
            401,
            data={"email": "invalid@test.com", "password": "wrong", "role": "student"}
        )
        
        return True

    def test_curriculum_endpoints(self):
        """Test curriculum management endpoints"""
        self.log("\n📚 Testing Curriculum Endpoints...")
        
        # Test public curriculum endpoint with filters
        success, curriculum = self.run_test(
            "Get Curriculum (TS, Class 6, MAT)",
            "GET",
            "curriculum?board=TS&class_level=6&subject=MAT",
            200
        )
        
        if success:
            self.log(f"✅ Retrieved {len(curriculum)} curriculum items for Class 6 MAT")
            
            # Check sorting (should be 1A, 1B, 1C order)
            if curriculum:
                first_item = curriculum[0]
                self.log(f"   First curriculum item: {first_item.get('topic_name', 'N/A')}")
        
        # Test different class/subject combinations
        test_combinations = [
            ("TS", 7, "PHY"),
            ("TS", 8, "BIO"),
            ("TS", 9, "ENG"),
            ("TS", 10, "MAT")
        ]
        
        for board, class_level, subject in test_combinations:
            success, items = self.run_test(
                f"Get Curriculum ({board}, Class {class_level}, {subject})",
                "GET",
                f"curriculum?board={board}&class_level={class_level}&subject={subject}",
                200
            )
            if success:
                self.log(f"   ✅ Class {class_level} {subject}: {len(items)} items")
        
        return True

    def test_student_endpoints(self):
        """Test student-related endpoints"""
        self.log("\n🎓 Testing Student Endpoints...")
        
        # Login as coordinator to access student data
        if not self.login_as_role("coordinator"):
            return False
            
        # Test get students endpoint
        success, students = self.run_test(
            "Get All Students",
            "GET",
            "students",
            200
        )
        
        if success and students:
            self.log(f"✅ Retrieved {len(students)} students")
            
            # Find Vignesh student for detailed testing
            vignesh_student = None
            for student in students:
                if "vignesh" in student.get("name", "").lower():
                    vignesh_student = student
                    break
            
            if vignesh_student:
                student_id = vignesh_student.get("id")
                student_name = vignesh_student.get("name")
                student_code = vignesh_student.get("student_code")
                
                self.log(f"   Found Vignesh: {student_name} ({student_code})")
                
                # Test get individual student details
                success, student_details = self.run_test(
                    f"Get Student Details ({student_name})",
                    "GET",
                    f"students/{student_id}",
                    200
                )
                
                if success:
                    self.log(f"   ✅ Student details: Class {student_details.get('class_level')}, Board {student_details.get('board')}")
                    self.log(f"   ✅ School: {student_details.get('school_name')}")
                    self.log(f"   ✅ Subjects: {student_details.get('subjects', [])}")
                    
                    # Verify student shows as "Name (Code)" format, not UUID
                    display_name = f"{student_name} ({student_code})"
                    if student_code and "RSN-" in student_code:
                        self.log(f"   ✅ Student display format correct: {display_name}")
                    else:
                        self.log(f"   ❌ Student code format issue: {student_code}")
        
        return True

    def test_student_management(self):
        """Test student creation and management"""
        self.log("\n🎓 Testing Student Management...")
        
        if not self.session_token or not self.user_data or self.user_data.get('role') != 'parent':
            self.log("❌ Need parent role for student tests")
            return False
            
        # Test student creation
        student_data = {
            "name": "Test Student",
            "class_level": 9,
            "board": "TS", 
            "school_name": "Test School",
            "location": "Hyderabad",
            "roll_no": "TS001",
            "subjects": ["MAT", "PHY", "SCI"],
            "enrollment_year": 2025
        }
        
        success, created_student = self.run_test(
            "Create Student",
            "POST",
            "students",
            200,
            data=student_data
        )
        
        if success:
            self.log(f"✅ Student created with code: {created_student.get('student_code', 'N/A')}")
            
        # Test get students
        success, students = self.run_test(
            "Get Students",
            "GET",
            "students",
            200
        )
        
        if success:
            self.log(f"✅ Retrieved {len(students)} students")
            
        return success

    def test_batch_management(self):
        """Test batch creation and management"""
        self.log("\n📚 Testing Batch Management...")
        
        # Test get batches
        success, batches = self.run_test(
            "Get Batches",
            "GET", 
            "batches",
            200
        )
        
        if success:
            self.log(f"✅ Retrieved {len(batches)} batches")
            
        return success

    def test_curriculum_access(self):
        """Test curriculum endpoints"""
        self.log("\n📖 Testing Curriculum Access...")
        
        success, curriculum = self.run_test(
            "Get Curriculum",
            "GET",
            "curriculum?board=TS&class_level=9&subject=MAT",
            200
        )
        
        if success:
            self.log(f"✅ Retrieved {len(curriculum)} curriculum items")
            
        return success

    def test_tutor_endpoints(self):
        """Test tutor-related endpoints"""
        self.log("\n👨‍🏫 Testing Tutor Endpoints...")
        
        # Test get tutors (should fail for non-coordinator)
        success, _ = self.run_test(
            "Get All Tutors (Should Fail)",
            "GET",
            "tutors",
            403
        )
        
        if success:
            self.log("✅ Tutor access properly restricted")
            
        return True

    def test_logboard_endpoints(self):
        """Test log board endpoints"""
        self.log("\n📝 Testing Log Board Endpoints...")
        
        # Test get log entries for a batch (will likely be empty)
        success, entries = self.run_test(
            "Get Log Entries",
            "GET",
            "logboard/test-batch-id",
            200
        )
        
        return True

    def run_all_tests(self):
        """Run comprehensive API test suite"""
        self.log("🚀 Starting Rising Stars Nation API Test Suite")
        self.log(f"🌐 Testing against: {self.base_url}")
        
        try:
            # Test authentication
            self.test_auth_flow()
            
            # Test user registration
            self.test_user_registration()
            
            # Test student management
            self.test_student_management()
            
            # Test batch management
            self.test_batch_management()
            
            # Test curriculum
            self.test_curriculum_access()
            
            # Test tutor endpoints
            self.test_tutor_endpoints()
            
            # Test log board
            self.test_logboard_endpoints()
            
        except Exception as e:
            self.log(f"❌ Test suite error: {str(e)}")
            
        # Print final results
        self.log(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            self.log("\n❌ Failed Tests:")
            for test in self.failed_tests:
                self.log(f"   - {test}")
                
        return self.tests_passed == self.tests_run

def main():
    tester = RisingStarsAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())