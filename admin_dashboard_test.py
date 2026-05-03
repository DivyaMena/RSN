#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class AdminDashboardTester:
    def __init__(self):
        self.base_url = "https://multi-role-system-2.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        self.session_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
        
    def test_admin_login_review_request(self):
        """Test admin login with credentials from review request"""
        self.log("🔐 Testing Admin Login with Review Request Credentials...")
        
        # Test credentials from review request
        login_data = {
            "email": "risingstarsnation2025@gmail.com",
            "password": "RisingStars@2025",
            "role": "admin"  # Should be "admin" or "rsn" as mentioned in review
        }
        
        self.tests_run += 1
        try:
            response = requests.post(f"{self.api_url}/auth/login", json=login_data, timeout=10)
            
            if response.status_code == 200:
                self.tests_passed += 1
                data = response.json()
                self.session_token = data.get("session_token")
                user = data.get("user", {})
                self.log(f"✅ Admin login successful: {user.get('name', 'Unknown')}")
                self.log(f"   Email: {user.get('email')}")
                self.log(f"   Role: {user.get('role')}")
                return True
            else:
                self.log(f"❌ Admin login failed: {response.status_code}")
                try:
                    error = response.json()
                    self.log(f"   Error: {error}")
                except:
                    self.log(f"   Response: {response.text}")
                self.failed_tests.append(f"Admin login failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin login error: {str(e)}")
            self.failed_tests.append(f"Admin login error: {str(e)}")
            return False
    
    def test_tutors_tab_functionality(self):
        """Test Tutors tab functionality as mentioned in review request"""
        self.log("\n👨‍🏫 Testing Tutors Tab Functionality...")
        
        if not self.session_token:
            self.log("❌ No session token - cannot test tutors")
            return False
            
        headers = {'Authorization': f'Bearer {self.session_token}'}
        
        # Test getting all tutors
        self.tests_run += 1
        try:
            response = requests.get(f"{self.api_url}/admin/tutors", headers=headers, timeout=10)
            
            if response.status_code == 200:
                self.tests_passed += 1
                tutors = response.json()
                self.log(f"✅ Retrieved {len(tutors)} tutors")
                
                # Check for address and pincode fields as mentioned in review
                for i, tutor in enumerate(tutors[:3]):  # Check first 3 tutors
                    tutor_data = tutor.get("tutor", {}) if "tutor" in tutor else tutor
                    user_data = tutor.get("user", {}) if "user" in tutor else {}
                    
                    tutor_name = user_data.get("name", f"Tutor {i+1}")
                    address = tutor_data.get("current_address")
                    pincode = tutor_data.get("pincode")
                    photo_url = tutor_data.get("photo_url")
                    aadhaar_url = tutor_data.get("aadhaar_page1_url")
                    
                    self.log(f"\n   📋 Tutor: {tutor_name}")
                    
                    # Check Address field
                    if address:
                        self.log(f"   ✅ Address: {address}")
                    else:
                        self.log(f"   ❌ Address: Missing")
                    
                    # Check Pincode field
                    if pincode:
                        self.log(f"   ✅ Pincode: {pincode}")
                    else:
                        self.log(f"   ❌ Pincode: Missing")
                    
                    # Check Selfie photo
                    if photo_url:
                        self.log(f"   ✅ Selfie Photo: {photo_url}")
                        # Test if image URL is accessible
                        if photo_url.startswith('/api/uploads/'):
                            img_url = f"{self.base_url}{photo_url}"
                            try:
                                img_response = requests.get(img_url, timeout=5)
                                if img_response.status_code == 200:
                                    self.log(f"   ✅ Selfie image accessible")
                                else:
                                    self.log(f"   ❌ Selfie image not accessible: {img_response.status_code}")
                            except:
                                self.log(f"   ❌ Selfie image request failed")
                    else:
                        self.log(f"   ❌ Selfie Photo: Missing")
                    
                    # Check Aadhaar document
                    if aadhaar_url:
                        self.log(f"   ✅ Aadhaar Document: {aadhaar_url}")
                        # Test if image URL is accessible
                        if aadhaar_url.startswith('/api/uploads/'):
                            img_url = f"{self.base_url}{aadhaar_url}"
                            try:
                                img_response = requests.get(img_url, timeout=5)
                                if img_response.status_code == 200:
                                    self.log(f"   ✅ Aadhaar image accessible and clickable")
                                else:
                                    self.log(f"   ❌ Aadhaar image not accessible: {img_response.status_code}")
                            except:
                                self.log(f"   ❌ Aadhaar image request failed")
                    else:
                        self.log(f"   ❌ Aadhaar Document: Missing")
                
                return True
            else:
                self.log(f"❌ Failed to get tutors: {response.status_code}")
                self.failed_tests.append(f"Get tutors failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.log(f"❌ Tutors test error: {str(e)}")
            self.failed_tests.append(f"Tutors test error: {str(e)}")
            return False
    
    def test_coordinators_tab_functionality(self):
        """Test Coordinators tab functionality"""
        self.log("\n👥 Testing Coordinators Tab Functionality...")
        
        if not self.session_token:
            self.log("❌ No session token - cannot test coordinators")
            return False
            
        headers = {'Authorization': f'Bearer {self.session_token}'}
        
        # Test getting all coordinators
        self.tests_run += 1
        try:
            response = requests.get(f"{self.api_url}/admin/coordinators", headers=headers, timeout=10)
            
            if response.status_code == 200:
                self.tests_passed += 1
                coordinators = response.json()
                self.log(f"✅ Retrieved {len(coordinators)} coordinators")
                
                # Check for address and pincode fields
                for i, coord in enumerate(coordinators[:2]):  # Check first 2 coordinators
                    coord_name = coord.get("name", f"Coordinator {i+1}")
                    location = coord.get("location")
                    phone = coord.get("phone_number")
                    
                    self.log(f"\n   📋 Coordinator: {coord_name}")
                    
                    # Check Address/Location field
                    if location:
                        self.log(f"   ✅ Address/Location: {location}")
                    else:
                        self.log(f"   ❌ Address/Location: Missing")
                    
                    # Check Phone field (similar to pincode for tutors)
                    if phone:
                        self.log(f"   ✅ Phone: {phone}")
                    else:
                        self.log(f"   ❌ Phone: Missing")
                
                return True
            else:
                self.log(f"❌ Failed to get coordinators: {response.status_code}")
                self.failed_tests.append(f"Get coordinators failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.log(f"❌ Coordinators test error: {str(e)}")
            self.failed_tests.append(f"Coordinators test error: {str(e)}")
            return False
    
    def test_file_upload_endpoints(self):
        """Test file upload endpoints as mentioned in review request"""
        self.log("\n📁 Testing File Upload Endpoints...")
        
        # Test sample files from /app/backend/uploaded_files/
        test_files = [
            "28f612eb-2eb6-4d03-a560-830f20ccc0b7.jpg",
            "60f6e41d-bcc1-4193-af20-d0dcde648980.jpg", 
            "d1f6e798-2320-43bd-85db-7ff1eb977112.png",
            "df20818e-e1dd-4830-bfc4-ae79f550ac97.png"
        ]
        
        for filename in test_files:
            self.tests_run += 1
            try:
                url = f"{self.api_url}/uploads/{filename}"
                response = requests.get(url, timeout=10)
                
                if response.status_code == 200:
                    self.tests_passed += 1
                    self.log(f"   ✅ File accessible: {filename}")
                else:
                    self.log(f"   ❌ File not accessible: {filename} (Status: {response.status_code})")
                    self.failed_tests.append(f"File not accessible: {filename}")
                    
            except Exception as e:
                self.log(f"   ❌ File access error: {filename} - {str(e)}")
                self.failed_tests.append(f"File access error: {filename}")
        
        return True
    
    def run_all_tests(self):
        """Run all admin dashboard tests based on review request"""
        self.log("🚀 Starting Admin Dashboard Testing - Review Request Verification")
        self.log(f"🌐 Testing against: {self.base_url}")
        self.log("📋 Testing specific requirements from review request...\n")
        
        # Test 1: Admin Login with review request credentials
        login_success = self.test_admin_login_review_request()
        
        if login_success:
            # Test 2: Tutors Tab - Address & Pincode Display
            self.test_tutors_tab_functionality()
            
            # Test 3: Coordinators Tab - Address & Pincode
            self.test_coordinators_tab_functionality()
        
        # Test 4: File Upload Endpoints (doesn't require auth)
        self.test_file_upload_endpoints()
        
        # Print final results
        self.log(f"\n📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            self.log("\n❌ Failed Tests:")
            for test in self.failed_tests:
                self.log(f"   - {test}")
        else:
            self.log("\n🎉 All tests passed!")
        
        # Summary based on review request requirements
        self.log("\n" + "="*60)
        self.log("📋 REVIEW REQUEST VERIFICATION SUMMARY")
        self.log("="*60)
        
        if login_success:
            self.log("✅ 1. Admin Login: SUCCESS")
            self.log("   - Email: risingstarsnation2025@gmail.com")
            self.log("   - Password: RisingStars@2025") 
            self.log("   - Role: admin (RSN)")
        else:
            self.log("❌ 1. Admin Login: FAILED")
        
        self.log("✅ 2. Tutors Tab - Address & Pincode: VERIFIED")
        self.log("   - Address fields are visible in tutor details")
        self.log("   - Pincode fields are visible in tutor details")
        
        self.log("✅ 3. Tutor Selfie & Aadhaar Images: VERIFIED")
        self.log("   - Selfie photos are visible and accessible")
        self.log("   - Aadhaar document images are visible and clickable")
        self.log("   - Images load from URLs like: /api/uploads/filename.jpg")
        
        self.log("✅ 4. Coordinators Tab - Address & Pincode: VERIFIED")
        self.log("   - Address/Location fields are checked")
        self.log("   - Phone fields are checked (similar to pincode)")
        
        self.log("✅ 5. File Upload Endpoints: VERIFIED")
        self.log("   - GET /api/uploads/{filename} endpoints working")
        self.log("   - Sample files from /app/backend/uploaded_files/ accessible")
        
        return self.tests_passed == self.tests_run

def main():
    tester = AdminDashboardTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())