#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class RisingStarsAPITester:
    def __init__(self, base_url="https://rising-stars-auth.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
        # Real test credentials from database - Updated as per review request
        self.test_credentials = {
            "admin": {"email": "idonateforneedy@gmail.com", "password": "RisingStars@2025"},
            "student": {"email": "4krishnakumar@gmail.com", "password": "12-11-2013"}  # Parent email + student DOB
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
        
        # Login as admin first to access curriculum
        if not self.login_as_role("admin"):
            self.log("❌ Cannot test curriculum without admin access")
            return False
        
        # Test curriculum endpoint with filters
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
            ("TS", 7, "MAT"),
            ("TS", 7, "SCI"),
            ("TS", 7, "ENG"),
            ("TS", 8, "MAT"),
            ("TS", 8, "PHY")
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
        
        # Login as admin to access student data
        if not self.login_as_role("admin"):
            return False
            
        # Test get students endpoint
        success, students = self.run_test(
            "Get All Students",
            "GET",
            "admin/students",
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
                self.log(f"   ✅ Student details: Class {vignesh_student.get('class_level')}, Board {vignesh_student.get('board')}")
                self.log(f"   ✅ School: {vignesh_student.get('school_name')}")
                self.log(f"   ✅ Subjects: {vignesh_student.get('subjects', [])}")
                
                # Verify student shows as "Name (Code)" format, not UUID
                display_name = f"{student_name} ({student_code})"
                if student_code and "RSN-TS-S-2025-24508" in student_code:
                    self.log(f"   ✅ Student display format correct: {display_name}")
                    self.log(f"   ✅ Matches expected code from review request: RSN-TS-S-2025-24508")
                else:
                    self.log(f"   ❌ Student code format issue: {student_code}")
            else:
                self.log("   ❌ Vignesh student not found")
        
        return True

    def test_remedial_endpoints(self):
        """Test remedial request and class management endpoints"""
        self.log("\n🔧 Testing Remedial System Endpoints...")
        
        # Login as admin to access remedial data
        if not self.login_as_role("admin"):
            return False
            
        # Test get all remedial requests
        success, requests = self.run_test(
            "Get Remedial Requests",
            "GET",
            "remedial/requests",
            200
        )
        
        if success:
            self.log(f"✅ Retrieved {len(requests)} remedial requests")
            
            # Check if any requests show student names properly
            for request in requests[:3]:  # Check first 3 requests
                student_id = request.get("student_id")
                if student_id:
                    self.log(f"   Request for student ID: {student_id}")
        
        # Test get remedial classes
        success, classes = self.run_test(
            "Get Remedial Classes",
            "GET",
            "remedial/classes",
            200
        )
        
        if success:
            self.log(f"✅ Retrieved {len(classes)} remedial classes")
        
        return True

    def test_tutor_dashboard_endpoints(self):
        """Test tutor dashboard specific endpoints"""
        self.log("\n👨‍🏫 Testing Tutor Dashboard Endpoints...")
        
        # Since we don't have tutor credentials, test with admin access
        if not self.login_as_role("admin"):
            return False
            
        # Test get all tutors (admin can access this)
        success, tutors = self.run_test(
            "Get All Tutors",
            "GET",
            "admin/tutors",
            200
        )
        
        if success:
            self.log(f"✅ Retrieved {len(tutors)} tutors")
            
            # Look for Divya Mena tutor
            divya_found = False
            for tutor in tutors:
                tutor_user = tutor.get("user", {})
                if "divya" in tutor_user.get("name", "").lower():
                    tutor_name = tutor_user.get("name")
                    tutor_code = tutor.get("tutor_code")
                    self.log(f"   ✅ Found Divya: {tutor_name} ({tutor_code})")
                    divya_found = True
                    break
            
            if not divya_found:
                self.log("   ❌ Divya Mena tutor not found in results")
        
        # Test batch students endpoint with existing batch
        success, batches = self.run_test(
            "Get All Batches for Student Count Test",
            "GET",
            "batches",
            200
        )
        
        if success and batches:
            # Test first batch for student count
            first_batch = batches[0]
            batch_id = first_batch.get("id")
            batch_code = first_batch.get("batch_code", "Unknown")
            
            success, students = self.run_test(
                f"Get Batch Students ({batch_code})",
                "GET",
                f"batches/{batch_id}/students",
                200
            )
            
            if success:
                student_count = len(students)
                self.log(f"   ✅ Batch {batch_code}: {student_count} students")
        
        return True

    def test_student_dashboard_endpoints(self):
        """Test student dashboard specific endpoints"""
        self.log("\n🎓 Testing Student Dashboard Endpoints...")
        
        # Login as student
        if not self.login_as_role("student"):
            return False
            
        # Test get student's curriculum
        success, curriculum = self.run_test(
            "Get Student Curriculum",
            "GET",
            "students/me/curriculum",
            200
        )
        
        if success:
            self.log(f"✅ Retrieved student curriculum")
            
            # Verify curriculum is sorted properly (1A, 1B, 1C order)
            if curriculum:
                self.log(f"   First curriculum item: {curriculum[0].get('topic_name', 'N/A')}")
        
        # Test create remedial request
        remedial_data = {
            "batch_id": "test-batch-id",
            "reason": "need_clarification",
            "topic": "Algebra Basics",
            "description": "Need help with quadratic equations"
        }
        
        success, request = self.run_test(
            "Create Remedial Request",
            "POST",
            "remedial/requests",
            200,
            data=remedial_data
        )
        
        if success:
            self.log("✅ Remedial request creation working")
        
        # Test get student's batches
        success, batches = self.run_test(
            "Get Student Batches",
            "GET",
            "students/me/batches",
            200
        )
        
        if success:
            self.log(f"✅ Retrieved {len(batches)} student batches")
        
        return True

    def test_coordinator_dashboard_endpoints(self):
        """Test coordinator dashboard specific endpoints"""
        self.log("\n👥 Testing Coordinator Dashboard Endpoints...")
        
        # Login as admin (since we don't have coordinator credentials)
        if not self.login_as_role("admin"):
            return False
            
        # Test get all batches
        success, batches = self.run_test(
            "Get All Batches",
            "GET",
            "batches",
            200
        )
        
        if success:
            self.log(f"✅ Retrieved {len(batches)} batches")
        
        # Test get all students
        success, students = self.run_test(
            "Get All Students",
            "GET",
            "admin/students",
            200
        )
        
        if success:
            self.log(f"✅ Retrieved {len(students)} students")
            
            # Look for Vignesh student
            vignesh_found = False
            for student in students:
                if "vignesh" in student.get("name", "").lower():
                    student_name = student.get("name")
                    student_code = student.get("student_code")
                    self.log(f"   ✅ Found Vignesh: {student_name} ({student_code})")
                    vignesh_found = True
                    break
            
            if not vignesh_found:
                self.log("   ❌ Vignesh student not found in results")
        
        # Test get all schools
        success, schools = self.run_test(
            "Get All Schools",
            "GET",
            "admin/schools",
            200
        )
        
        if success:
            self.log(f"✅ Retrieved {len(schools)} schools")
        
        return True

    def test_admin_dashboard_endpoints(self):
        """Test admin dashboard specific endpoints"""
        self.log("\n👑 Testing Admin Dashboard Endpoints...")
        
        # Login as admin
        if not self.login_as_role("admin"):
            return False
            
        # Test curriculum upload functionality
        success, response = self.run_test(
            "Get Admin Curriculum",
            "GET",
            "admin/curriculum",
            200
        )
        
        if success:
            self.log(f"✅ Retrieved admin curriculum access")
        
        # Test curriculum filters
        filter_tests = [
            ("board=TS", "Board filter"),
            ("class_level=6", "Class filter"),
            ("subject=MAT", "Subject filter"),
            ("board=TS&class_level=6&subject=MAT", "Combined filters")
        ]
        
        for filter_param, description in filter_tests:
            success, filtered = self.run_test(
                f"Test {description}",
                "GET",
                f"curriculum?{filter_param}",
                200
            )
            if success:
                self.log(f"   ✅ {description}: {len(filtered)} items")
        
        # Test bulk operations endpoints
        bulk_endpoints = [
            "admin/students/bulk",
            "admin/tutors/bulk", 
            "admin/parents/bulk",
            "admin/coordinators/bulk",
            "admin/schools/bulk",
            "admin/batches/bulk",
            "admin/curriculum/bulk"
        ]
        
        for endpoint in bulk_endpoints:
            # Test with empty array (should succeed but delete nothing)
            success, response = self.run_test(
                f"Test Bulk Delete ({endpoint.split('/')[-2].title()})",
                "DELETE",
                endpoint,
                200,
                data={"ids": []}
            )
            if success:
                self.log(f"   ✅ Bulk delete endpoint working: {endpoint}")
        
        return True

    def test_admin_dashboard_fixes(self):
        """Test the specific admin dashboard fixes mentioned in review request"""
        self.log("\n🔧 Testing Admin Dashboard Fixes...")
        
        # Login as admin with the correct credentials
        if not self.login_as_role("admin"):
            self.log("❌ Cannot test admin dashboard without admin access")
            return False
        
        # Test 1: Get all tutors to check address and pincode display
        success, tutors = self.run_test(
            "Get All Tutors (Check Address & Pincode)",
            "GET",
            "admin/tutors",
            200
        )
        
        if success and tutors:
            self.log(f"✅ Retrieved {len(tutors)} tutors")
            
            # Check if tutors have address and pincode fields
            for tutor in tutors[:3]:  # Check first 3 tutors
                tutor_data = tutor.get("tutor", {}) if "tutor" in tutor else tutor
                user_data = tutor.get("user", {}) if "user" in tutor else {}
                
                tutor_name = user_data.get("name", "Unknown")
                address = tutor_data.get("current_address")
                pincode = tutor_data.get("pincode")
                
                self.log(f"   Tutor: {tutor_name}")
                if address:
                    self.log(f"   ✅ Address: {address}")
                else:
                    self.log(f"   ❌ Address: Missing")
                    
                if pincode:
                    self.log(f"   ✅ Pincode: {pincode}")
                else:
                    self.log(f"   ❌ Pincode: Missing")
                    
                # Check for selfie and aadhaar images
                photo_url = tutor_data.get("photo_url")
                aadhaar_page1_url = tutor_data.get("aadhaar_page1_url")
                
                if photo_url:
                    self.log(f"   ✅ Selfie URL: {photo_url}")
                else:
                    self.log(f"   ❌ Selfie URL: Missing")
                    
                if aadhaar_page1_url:
                    self.log(f"   ✅ Aadhaar URL: {aadhaar_page1_url}")
                else:
                    self.log(f"   ❌ Aadhaar URL: Missing")
        
        # Test 2: Get all coordinators to check address and pincode display
        success, coordinators = self.run_test(
            "Get All Coordinators (Check Address & Pincode)",
            "GET",
            "admin/coordinators",
            200
        )
        
        if success and coordinators:
            self.log(f"✅ Retrieved {len(coordinators)} coordinators")
            
            # Check if coordinators have address and pincode fields
            for coord in coordinators[:2]:  # Check first 2 coordinators
                coord_name = coord.get("name", "Unknown")
                location = coord.get("location")
                phone = coord.get("phone_number")
                
                self.log(f"   Coordinator: {coord_name}")
                if location:
                    self.log(f"   ✅ Location/Address: {location}")
                else:
                    self.log(f"   ❌ Location/Address: Missing")
                    
                if phone:
                    self.log(f"   ✅ Phone: {phone}")
                else:
                    self.log(f"   ❌ Phone: Missing")
        
        return True
    
    def test_file_upload_endpoints(self):
        """Test file upload endpoints and image serving"""
        self.log("\n📁 Testing File Upload Endpoints...")
        
        # Test uploaded file access
        test_files = [
            "28f612eb-2eb6-4d03-a560-830f20ccc0b7.jpg",
            "60f6e41d-bcc1-4193-af20-d0dcde648980.jpg", 
            "d1f6e798-2320-43bd-85db-7ff1eb977112.png",
            "df20818e-e1dd-4830-bfc4-ae79f550ac97.png"
        ]
        
        for filename in test_files:
            success, _ = self.run_test(
                f"Access Uploaded File ({filename})",
                "GET",
                f"uploads/{filename}",
                200
            )
            
            if success:
                self.log(f"   ✅ File accessible: {filename}")
            else:
                self.log(f"   ❌ File not accessible: {filename}")
        
        return True

    def run_all_tests(self):
        """Run comprehensive API test suite for Rising Stars Nation Educational Platform"""
        self.log("🚀 Starting Admin Dashboard Testing for Rising Stars Nation")
        self.log(f"🌐 Testing against: {self.base_url}")
        self.log("📋 Testing specific fixes from review request...")
        
        try:
            # Test admin login with correct credentials
            self.test_auth_flow()
            
            # Test the specific admin dashboard fixes
            self.test_admin_dashboard_fixes()
            
            # Test file upload endpoints
            self.test_file_upload_endpoints()
            
        except Exception as e:
            self.log(f"❌ Test suite error: {str(e)}")
            
        # Print final results
        self.log(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            self.log("\n❌ Failed Tests:")
            for test in self.failed_tests:
                self.log(f"   - {test}")
        else:
            self.log("\n🎉 All tests passed!")
                
        return self.tests_passed == self.tests_run

def main():
    tester = RisingStarsAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())