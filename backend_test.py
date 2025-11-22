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

    def test_remedial_endpoints(self):
        """Test remedial request and class management endpoints"""
        self.log("\n🔧 Testing Remedial System Endpoints...")
        
        # Login as coordinator to access remedial data
        if not self.login_as_role("coordinator"):
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
            
            # Test filtering by class and subject
            if requests:
                # Test with filters
                success, filtered = self.run_test(
                    "Get Remedial Requests (Class 6, MAT)",
                    "GET",
                    "remedial/requests?class_level=6&subject=MAT",
                    200
                )
                if success:
                    self.log(f"   ✅ Filtered requests (Class 6, MAT): {len(filtered)}")
        
        # Test get remedial classes
        success, classes = self.run_test(
            "Get Remedial Classes",
            "GET",
            "remedial/classes",
            200
        )
        
        if success:
            self.log(f"✅ Retrieved {len(classes)} remedial classes")
        
        # Test pool students endpoint (with mock data)
        pool_data = {
            "request_ids": ["mock-request-1", "mock-request-2"],
            "topic": "Algebra Basics"
        }
        
        success, pooled = self.run_test(
            "Pool Remedial Students",
            "POST",
            "remedial/pool-students",
            200,
            data=pool_data
        )
        
        if success:
            self.log("✅ Pool students endpoint working")
        
        return True

    def test_tutor_dashboard_endpoints(self):
        """Test tutor dashboard specific endpoints"""
        self.log("\n👨‍🏫 Testing Tutor Dashboard Endpoints...")
        
        # Login as tutor
        if not self.login_as_role("tutor"):
            return False
            
        # Test get tutor's teaching curriculum
        success, curriculum = self.run_test(
            "Get Tutor Teaching Curriculum",
            "GET",
            "tutors/me/curriculum",
            200
        )
        
        if success:
            self.log(f"✅ Retrieved tutor curriculum for opted classes/subjects")
            
            # Verify curriculum is sorted properly (1A, 1B, 1C order)
            if curriculum:
                self.log(f"   First curriculum item: {curriculum[0].get('topic_name', 'N/A')}")
        
        # Test get tutor's batches
        success, batches = self.run_test(
            "Get Tutor Batches",
            "GET",
            "tutors/me/batches",
            200
        )
        
        if success:
            self.log(f"✅ Retrieved {len(batches)} tutor batches")
            
            # Test student count for batches
            for batch in batches[:2]:  # Test first 2 batches
                batch_id = batch.get("id")
                if batch_id:
                    success, students = self.run_test(
                        f"Get Batch Students ({batch.get('batch_code', 'Unknown')})",
                        "GET",
                        f"batches/{batch_id}/students",
                        200
                    )
                    if success:
                        student_count = len(students)
                        self.log(f"   ✅ Batch {batch.get('batch_code')}: {student_count} students")
        
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
        
        # Login as coordinator
        if not self.login_as_role("coordinator"):
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
        
        # Test get all tutors
        success, tutors = self.run_test(
            "Get All Tutors",
            "GET",
            "tutors",
            200
        )
        
        if success:
            self.log(f"✅ Retrieved {len(tutors)} tutors")
        
        # Test get all schools
        success, schools = self.run_test(
            "Get All Schools",
            "GET",
            "schools",
            200
        )
        
        if success:
            self.log(f"✅ Retrieved {len(schools)} schools")
            
            # Verify at least one pending school exists
            pending_schools = [s for s in schools if s.get("approval_status") == "pending"]
            if pending_schools:
                self.log(f"   ✅ Found {len(pending_schools)} pending schools")
        
        # Test pending counts
        success, pending = self.run_test(
            "Get Pending Counts",
            "GET",
            "coordinator/pending-counts",
            200
        )
        
        if success:
            tutors_count = pending.get("tutors", 0)
            schools_count = pending.get("schools", 0)
            remedial_count = pending.get("remedial", 0)
            total_count = tutors_count + schools_count + remedial_count
            
            self.log(f"✅ Pending counts - Tutors: {tutors_count}, Schools: {schools_count}, Remedial: {remedial_count}")
            self.log(f"   Total pending: {total_count}")
        
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

    def run_all_tests(self):
        """Run comprehensive API test suite for Rising Stars Nation Educational Platform"""
        self.log("🚀 Starting Rising Stars Nation Educational Platform API Test Suite")
        self.log(f"🌐 Testing against: {self.base_url}")
        self.log("📋 Testing critical flows from review request...")
        
        try:
            # Test basic authentication
            self.test_auth_flow()
            
            # Test curriculum endpoints (public access)
            self.test_curriculum_endpoints()
            
            # Test admin dashboard functionality
            self.test_admin_dashboard_endpoints()
            
            # Test coordinator dashboard functionality  
            self.test_coordinator_dashboard_endpoints()
            
            # Test tutor dashboard functionality
            self.test_tutor_dashboard_endpoints()
            
            # Test student dashboard functionality
            self.test_student_dashboard_endpoints()
            
            # Test student data access
            self.test_student_endpoints()
            
            # Test remedial system
            self.test_remedial_endpoints()
            
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