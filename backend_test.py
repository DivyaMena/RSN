#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class RisingStarsAPITester:
    def __init__(self, base_url="https://learnhub-544.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
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
        
        # Test session endpoint without session ID (should fail)
        success, _ = self.run_test(
            "Auth Session (No Session ID)",
            "GET",
            "auth/session", 
            400
        )
        
        # Create a test session manually for testing
        self.log("📝 Creating test session for API testing...")
        self.create_test_session()
        
        return True

    def create_test_session(self):
        """Create a test user and session in MongoDB for testing"""
        try:
            import subprocess
            
            # Create test user and session via MongoDB
            mongo_script = f"""
            use('test_database');
            var userId = 'test-user-{int(time.time())}';
            var sessionToken = 'test_session_{int(time.time())}';
            
            // Clean up any existing test data
            db.users.deleteMany({{"email": /test.*@example.com/}});
            db.user_sessions.deleteMany({{"session_token": /test_session_/}});
            
            // Create test user
            db.users.insertOne({{
              id: userId,
              email: 'test.user.{int(time.time())}@example.com',
              name: 'Test User',
              role: 'pending',
              created_at: new Date()
            }});
            
            // Create session
            db.user_sessions.insertOne({{
              user_id: userId,
              session_token: sessionToken,
              expires_at: new Date(Date.now() + 7*24*60*60*1000),
              created_at: new Date()
            }});
            
            print('SESSION_TOKEN:' + sessionToken);
            print('USER_ID:' + userId);
            """
            
            result = subprocess.run(
                ['mongosh', '--eval', mongo_script],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                lines = result.stdout.split('\n')
                for line in lines:
                    if line.startswith('SESSION_TOKEN:'):
                        self.session_token = line.split(':', 1)[1]
                        self.log(f"✅ Test session created: {self.session_token[:20]}...")
                        break
                        
                # Test auth/me with valid token
                success, user_data = self.run_test(
                    "Auth Me (Valid Token)",
                    "GET",
                    "auth/me",
                    200
                )
                
                if success:
                    self.user_data = user_data
                    self.log(f"✅ User authenticated: {user_data.get('name', 'Unknown')}")
                    
            else:
                self.log(f"❌ Failed to create test session: {result.stderr}")
                
        except Exception as e:
            self.log(f"❌ Error creating test session: {str(e)}")

    def test_user_registration(self):
        """Test user registration endpoints"""
        self.log("\n👤 Testing User Registration...")
        
        if not self.session_token:
            self.log("❌ No session token available for registration tests")
            return False
            
        # Test parent registration
        success, parent_data = self.run_test(
            "Register as Parent",
            "POST",
            "users/register/parent",
            200,
            data={"state": "TS"}
        )
        
        if success:
            self.user_data = parent_data
            self.log(f"✅ Parent registered with code: {parent_data.get('user_code', 'N/A')}")
        
        return success

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