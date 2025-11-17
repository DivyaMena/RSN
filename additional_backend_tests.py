#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class AdditionalBackendTester:
    def __init__(self, base_url="https://rising-stars-app.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.coordinator_token = "coordinator_test_token_2025"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
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

    def test_error_handling(self):
        """Test error handling for various scenarios"""
        self.log("\n🚨 Testing Error Handling...")
        
        # Test approve non-existent tutor
        success, _ = self.run_test(
            "Approve Non-existent Tutor",
            "PUT",
            "tutors/non-existent-tutor-id/approve",
            404  # Should return 404 or handle gracefully
        )
        
        # Test reject non-existent tutor
        success, _ = self.run_test(
            "Reject Non-existent Tutor",
            "PUT",
            "tutors/non-existent-tutor-id/reject",
            404,
            params={"reason": "Test rejection"}
        )
        
        # Test invalid status update
        success, _ = self.run_test(
            "Invalid Status Update",
            "PUT",
            "tutors/tutor-profile-001/status",
            400,  # Should return 400 for invalid status
            params={"status": "invalid_status"}
        )
        
        # Test rejection without reason
        success, _ = self.run_test(
            "Reject Without Reason",
            "PUT",
            "tutors/tutor-profile-001/reject",
            400  # Should require reason parameter
        )

    def test_role_based_access(self):
        """Test role-based access control"""
        self.log("\n🔐 Testing Role-Based Access Control...")
        
        # Test with parent token (should fail)
        parent_token = "parent_test_token_2025"
        parent_headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {parent_token}'
        }
        
        try:
            response = requests.get(f"{self.api_url}/tutors/pending", headers=parent_headers, timeout=10)
            if response.status_code == 403:
                self.log("✅ Correctly denied parent access to pending tutors")
                self.tests_passed += 1
            else:
                self.log(f"⚠️  Expected 403, got {response.status_code} for parent access")
                self.failed_tests.append({
                    'test': 'Parent Access Denied',
                    'expected': 403,
                    'actual': response.status_code
                })
            self.tests_run += 1
        except Exception as e:
            self.log(f"❌ Error testing parent access: {str(e)}")
            self.failed_tests.append({
                'test': 'Parent Access Denied',
                'error': str(e)
            })
            self.tests_run += 1

    def test_data_integrity(self):
        """Test data integrity and field validation"""
        self.log("\n🔍 Testing Data Integrity...")
        
        # Test get all tutors and verify data structure
        success, tutors_data = self.run_test(
            "Verify Tutor Data Structure",
            "GET",
            "tutors",
            200
        )
        
        if success and tutors_data:
            # Check each tutor has required fields
            required_tutor_fields = ['id', 'user_id', 'tutor_code']
            required_user_fields = ['id', 'email', 'name', 'role']
            
            all_valid = True
            for tutor_entry in tutors_data:
                if 'tutor' not in tutor_entry or 'user' not in tutor_entry:
                    all_valid = False
                    break
                    
                tutor = tutor_entry['tutor']
                user = tutor_entry['user']
                
                missing_tutor_fields = [f for f in required_tutor_fields if f not in tutor]
                missing_user_fields = [f for f in required_user_fields if f not in user]
                
                if missing_tutor_fields or missing_user_fields:
                    all_valid = False
                    self.log(f"   Missing tutor fields: {missing_tutor_fields}")
                    self.log(f"   Missing user fields: {missing_user_fields}")
                    break
            
            if all_valid:
                self.log("✅ All tutor data has required fields")
            else:
                self.log("⚠️  Some tutor data missing required fields")

    def test_batch_edge_cases(self):
        """Test batch-related edge cases"""
        self.log("\n📚 Testing Batch Edge Cases...")
        
        # Test empty batch (if any exist)
        success, batches = self.run_test(
            "Get All Batches",
            "GET",
            "batches",
            200
        )
        
        if success and batches:
            # Find a batch with fewer students
            for batch in batches:
                if len(batch.get('student_ids', [])) < 5:  # Small batch
                    batch_id = batch['id']
                    self.log(f"   Testing small batch: {batch_id} with {len(batch['student_ids'])} students")
                    
                    success, students = self.run_test(
                        f"Get Students from Small Batch",
                        "GET",
                        f"batches/{batch_id}/students",
                        200
                    )
                    
                    if success:
                        self.log(f"✅ Successfully retrieved {len(students)} students from small batch")
                    break

    def run_additional_tests(self):
        """Run additional backend tests"""
        self.log("🔧 Starting Additional Backend Tests")
        self.log(f"🌐 Testing against: {self.base_url}")
        
        try:
            self.test_error_handling()
            self.test_role_based_access()
            self.test_data_integrity()
            self.test_batch_edge_cases()
            
        except Exception as e:
            self.log(f"❌ Test suite error: {str(e)}")
            
        # Print final results
        self.log(f"\n📊 Additional Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            self.log("\n❌ Failed Tests:")
            for test in self.failed_tests:
                self.log(f"   - {test}")
                
        return self.tests_passed >= (self.tests_run * 0.8)  # 80% pass rate acceptable

def main():
    tester = AdditionalBackendTester()
    success = tester.run_additional_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())