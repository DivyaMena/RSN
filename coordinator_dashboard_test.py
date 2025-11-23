#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class CoordinatorDashboardTester:
    def __init__(self, base_url="https://data-insights-171.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.coordinator_token = "coordinator_test_token_2025"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = {}
        
    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
        
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
            
        # Use coordinator token for authentication
        test_headers['Authorization'] = f'Bearer {self.coordinator_token}'

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, params=params, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, params=params, timeout=15)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, params=params, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, params=params, timeout=15)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ {name} - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    self.test_results[name] = {
                        'status': 'PASSED',
                        'response_code': response.status_code,
                        'data': response_data
                    }
                    return True, response_data
                except:
                    self.test_results[name] = {
                        'status': 'PASSED',
                        'response_code': response.status_code,
                        'data': {}
                    }
                    return True, {}
            else:
                self.log(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    self.log(f"   Error: {error_detail}")
                    error_data = error_detail
                except:
                    self.log(f"   Response: {response.text[:200]}")
                    error_data = response.text[:200]
                    
                self.failed_tests.append({
                    'test': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'endpoint': endpoint,
                    'error': error_data
                })
                
                self.test_results[name] = {
                    'status': 'FAILED',
                    'expected_code': expected_status,
                    'actual_code': response.status_code,
                    'error': error_data
                }
                return False, {}

        except Exception as e:
            self.log(f"❌ {name} - Error: {str(e)}")
            self.failed_tests.append({
                'test': name,
                'error': str(e),
                'endpoint': endpoint
            })
            self.test_results[name] = {
                'status': 'ERROR',
                'error': str(e)
            }
            return False, {}

    def setup_pending_tutors(self):
        """Create some pending tutors for testing approval/rejection"""
        self.log("\n🔧 Setting up pending tutors for testing...")
        
        try:
            import subprocess
            
            # Create pending tutors via MongoDB
            mongo_script = """
            use('test_database');
            
            // Create pending tutor users
            var pendingTutor1 = {
              id: 'pending-tutor-001',
              email: 'pending1@test.com',
              name: 'Ramesh Gupta (Pending Tutor)',
              role: 'tutor',
              state: 'TS',
              user_code: 'RSN-TS-T-99001',
              created_at: new Date()
            };
            
            var pendingTutor2 = {
              id: 'pending-tutor-002',
              email: 'pending2@test.com',
              name: 'Sunita Rao (Pending Tutor)',
              role: 'tutor',
              state: 'TS',
              user_code: 'RSN-TS-T-99002',
              created_at: new Date()
            };
            
            // Insert users
            db.users.insertMany([pendingTutor1, pendingTutor2]);
            
            // Create tutor profiles with pending status
            var tutorProfile1 = {
              id: 'pending-tutor-profile-001',
              user_id: 'pending-tutor-001',
              tutor_code: 'RSN-TS-T-99001',
              aadhaar_number: '123456789012',
              board_preference: 'TS',
              current_address: 'Test Address 1',
              pincode: '500001',
              classes_can_teach: [8, 9],
              subjects_can_teach: ['MAT', 'SCI'],
              available_days: ['Monday', 'Tuesday'],
              status: 'pending',
              approval_status: 'pending',
              availability_status: 'available',
              registration_timestamp: new Date(),
              created_at: new Date()
            };
            
            var tutorProfile2 = {
              id: 'pending-tutor-profile-002',
              user_id: 'pending-tutor-002',
              tutor_code: 'RSN-TS-T-99002',
              aadhaar_number: '123456789013',
              board_preference: 'TS',
              current_address: 'Test Address 2',
              pincode: '500002',
              classes_can_teach: [9, 10],
              subjects_can_teach: ['PHY', 'ENG'],
              available_days: ['Wednesday', 'Thursday'],
              status: 'pending',
              approval_status: 'pending',
              availability_status: 'available',
              registration_timestamp: new Date(),
              created_at: new Date()
            };
            
            // Insert tutor profiles
            db.tutors.insertMany([tutorProfile1, tutorProfile2]);
            
            print('PENDING_TUTORS_CREATED');
            """
            
            result = subprocess.run(
                ['mongosh', '--eval', mongo_script],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0 and 'PENDING_TUTORS_CREATED' in result.stdout:
                self.log("✅ Created 2 pending tutors for testing")
                return True
            else:
                self.log(f"❌ Failed to create pending tutors: {result.stderr}")
                return False
                
        except Exception as e:
            self.log(f"❌ Error creating pending tutors: {str(e)}")
            return False

    def test_get_pending_tutors(self):
        """Test GET /api/tutors/pending endpoint"""
        self.log("\n📋 Testing Get Pending Tutors Endpoint...")
        
        success, data = self.run_test(
            "Get Pending Tutors",
            "GET",
            "tutors/pending",
            200
        )
        
        if success:
            if isinstance(data, list):
                self.log(f"✅ Retrieved {len(data)} pending tutors")
                if len(data) > 0:
                    # Check structure of first tutor
                    first_tutor = data[0]
                    if 'tutor' in first_tutor and 'user' in first_tutor:
                        tutor_data = first_tutor['tutor']
                        if tutor_data.get('approval_status') == 'pending':
                            self.log("✅ Tutor has correct pending approval_status")
                        else:
                            self.log(f"⚠️  Tutor approval_status: {tutor_data.get('approval_status')}")
                    else:
                        self.log("⚠️  Unexpected tutor data structure")
                else:
                    self.log("⚠️  No pending tutors found - this might be expected")
            else:
                self.log(f"⚠️  Expected list, got: {type(data)}")
        
        return success

    def test_get_all_tutors(self):
        """Test GET /api/tutors endpoint"""
        self.log("\n👨‍🏫 Testing Get All Tutors Endpoint...")
        
        success, data = self.run_test(
            "Get All Tutors",
            "GET",
            "tutors",
            200
        )
        
        if success:
            if isinstance(data, list):
                self.log(f"✅ Retrieved {len(data)} total tutors")
                if len(data) > 0:
                    # Check structure
                    first_tutor = data[0]
                    if 'tutor' in first_tutor and 'user' in first_tutor:
                        self.log("✅ Tutor data includes both tutor and user details")
                        user_data = first_tutor['user']
                        tutor_data = first_tutor['tutor']
                        self.log(f"   Sample tutor: {user_data.get('name', 'Unknown')} - Status: {tutor_data.get('approval_status', 'N/A')}")
                    else:
                        self.log("⚠️  Unexpected tutor data structure")
                else:
                    self.log("⚠️  No tutors found")
            else:
                self.log(f"⚠️  Expected list, got: {type(data)}")
        
        return success

    def test_tutor_approval(self):
        """Test PUT /api/tutors/{tutor_id}/approve endpoint"""
        self.log("\n✅ Testing Tutor Approval Endpoint...")
        
        # First get pending tutors to find one to approve
        success, pending_data = self.run_test(
            "Get Pending Tutors for Approval Test",
            "GET",
            "tutors/pending",
            200
        )
        
        if not success or not pending_data or len(pending_data) == 0:
            self.log("⚠️  No pending tutors available for approval test")
            return False
        
        # Get first pending tutor
        tutor_to_approve = pending_data[0]
        tutor_id = tutor_to_approve['tutor']['id']
        tutor_name = tutor_to_approve['user']['name']
        
        self.log(f"   Approving tutor: {tutor_name} (ID: {tutor_id})")
        
        success, data = self.run_test(
            "Approve Tutor",
            "PUT",
            f"tutors/{tutor_id}/approve",
            200
        )
        
        if success:
            if data.get('success'):
                self.log("✅ Tutor approval successful")
                
                # Verify the tutor is no longer pending
                time.sleep(1)  # Brief delay
                verify_success, verify_data = self.run_test(
                    "Verify Tutor Approved",
                    "GET",
                    "tutors/pending",
                    200
                )
                
                if verify_success:
                    # Check if the approved tutor is no longer in pending list
                    still_pending = any(t['tutor']['id'] == tutor_id for t in verify_data)
                    if not still_pending:
                        self.log("✅ Tutor successfully removed from pending list")
                    else:
                        self.log("⚠️  Tutor still appears in pending list")
            else:
                self.log("⚠️  Approval response missing 'success' field")
        
        return success

    def test_tutor_rejection(self):
        """Test PUT /api/tutors/{tutor_id}/reject endpoint"""
        self.log("\n❌ Testing Tutor Rejection Endpoint...")
        
        # First get pending tutors to find one to reject
        success, pending_data = self.run_test(
            "Get Pending Tutors for Rejection Test",
            "GET",
            "tutors/pending",
            200
        )
        
        if not success or not pending_data or len(pending_data) == 0:
            self.log("⚠️  No pending tutors available for rejection test")
            return False
        
        # Get first pending tutor
        tutor_to_reject = pending_data[0]
        tutor_id = tutor_to_reject['tutor']['id']
        tutor_name = tutor_to_reject['user']['name']
        
        self.log(f"   Rejecting tutor: {tutor_name} (ID: {tutor_id})")
        
        success, data = self.run_test(
            "Reject Tutor",
            "PUT",
            f"tutors/{tutor_id}/reject",
            200,
            params={"reason": "Incomplete documentation provided"}
        )
        
        if success:
            if data.get('success'):
                self.log("✅ Tutor rejection successful")
                
                # Verify the tutor is no longer pending
                time.sleep(1)  # Brief delay
                verify_success, verify_data = self.run_test(
                    "Verify Tutor Rejected",
                    "GET",
                    "tutors/pending",
                    200
                )
                
                if verify_success:
                    # Check if the rejected tutor is no longer in pending list
                    still_pending = any(t['tutor']['id'] == tutor_id for t in verify_data)
                    if not still_pending:
                        self.log("✅ Tutor successfully removed from pending list")
                    else:
                        self.log("⚠️  Tutor still appears in pending list")
            else:
                self.log("⚠️  Rejection response missing 'success' field")
        
        return success

    def test_tutor_status_update(self):
        """Test PUT /api/tutors/{tutor_id}/status endpoint"""
        self.log("\n🔄 Testing Tutor Status Update Endpoint...")
        
        # First get all tutors to find one to update
        success, all_tutors_data = self.run_test(
            "Get All Tutors for Status Update Test",
            "GET",
            "tutors",
            200
        )
        
        if not success or not all_tutors_data or len(all_tutors_data) == 0:
            self.log("⚠️  No tutors available for status update test")
            return False
        
        # Find an approved tutor to update status
        approved_tutor = None
        for tutor_entry in all_tutors_data:
            if tutor_entry['tutor'].get('approval_status') == 'approved':
                approved_tutor = tutor_entry
                break
        
        if not approved_tutor:
            # Use first tutor if no approved ones found
            approved_tutor = all_tutors_data[0]
        
        tutor_id = approved_tutor['tutor']['id']
        tutor_name = approved_tutor['user']['name']
        
        self.log(f"   Updating status for tutor: {tutor_name} (ID: {tutor_id})")
        
        success, data = self.run_test(
            "Update Tutor Status to Unavailable",
            "PUT",
            f"tutors/{tutor_id}/status",
            200,
            params={"status": "unavailable"}
        )
        
        if success:
            if data.get('success'):
                self.log("✅ Tutor status update successful")
            else:
                self.log("⚠️  Status update response missing 'success' field")
        
        return success

    def test_batch_students(self):
        """Test GET /api/batches/{batch_id}/students endpoint"""
        self.log("\n🎓 Testing Batch Students Endpoint...")
        
        # Test with known batch from seed data
        batch_id = "batch-test-001"  # Math batch from seed data
        
        success, data = self.run_test(
            "Get Batch Students",
            "GET",
            f"batches/{batch_id}/students",
            200
        )
        
        if success:
            if isinstance(data, list):
                self.log(f"✅ Retrieved {len(data)} students from batch {batch_id}")
                if len(data) > 0:
                    # Check structure of first student
                    first_student = data[0]
                    required_fields = ['id', 'name', 'student_code', 'class_level', 'board']
                    missing_fields = [field for field in required_fields if field not in first_student]
                    
                    if not missing_fields:
                        self.log("✅ Student data has all required fields")
                        self.log(f"   Sample student: {first_student.get('name')} - Code: {first_student.get('student_code')}")
                    else:
                        self.log(f"⚠️  Student data missing fields: {missing_fields}")
                else:
                    self.log("⚠️  No students found in batch")
            else:
                self.log(f"⚠️  Expected list, got: {type(data)}")
        
        # Test with invalid batch ID
        invalid_success, invalid_data = self.run_test(
            "Get Students from Invalid Batch",
            "GET",
            "batches/invalid-batch-id/students",
            404
        )
        
        if invalid_success:
            self.log("✅ Correctly returned 404 for invalid batch ID")
        
        return success

    def test_authentication_required(self):
        """Test that endpoints require proper authentication"""
        self.log("\n🔐 Testing Authentication Requirements...")
        
        # Test without token
        test_headers = {'Content-Type': 'application/json'}
        
        try:
            response = requests.get(f"{self.api_url}/tutors/pending", headers=test_headers, timeout=10)
            if response.status_code == 401:
                self.log("✅ Correctly requires authentication for pending tutors")
                self.tests_passed += 1
            else:
                self.log(f"⚠️  Expected 401, got {response.status_code} for unauthenticated request")
                self.failed_tests.append({
                    'test': 'Authentication Required',
                    'expected': 401,
                    'actual': response.status_code
                })
            self.tests_run += 1
        except Exception as e:
            self.log(f"❌ Error testing authentication: {str(e)}")
            self.failed_tests.append({
                'test': 'Authentication Required',
                'error': str(e)
            })
            self.tests_run += 1

    def run_coordinator_dashboard_tests(self):
        """Run comprehensive coordinator dashboard test suite"""
        self.log("🚀 Starting Coordinator Dashboard API Test Suite")
        self.log(f"🌐 Testing against: {self.base_url}")
        self.log(f"🔑 Using coordinator token: {self.coordinator_token[:20]}...")
        
        try:
            # Setup test data
            self.setup_pending_tutors()
            
            # Test authentication requirements
            self.test_authentication_required()
            
            # Test core coordinator endpoints
            self.test_get_pending_tutors()
            self.test_get_all_tutors()
            self.test_tutor_approval()
            self.test_tutor_rejection()
            self.test_tutor_status_update()
            self.test_batch_students()
            
        except Exception as e:
            self.log(f"❌ Test suite error: {str(e)}")
            
        # Print final results
        self.log(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            self.log("\n❌ Failed Tests:")
            for test in self.failed_tests:
                self.log(f"   - {test}")
        
        # Print detailed results
        self.log("\n📋 Detailed Test Results:")
        for test_name, result in self.test_results.items():
            status_emoji = "✅" if result['status'] == 'PASSED' else "❌"
            self.log(f"   {status_emoji} {test_name}: {result['status']}")
            
        return self.tests_passed == self.tests_run

def main():
    tester = CoordinatorDashboardTester()
    success = tester.run_coordinator_dashboard_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())