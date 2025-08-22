#!/usr/bin/env python3
"""
Bulletproof Video Upload Backend API Test Suite
Tests all API endpoints for the video upload system
"""

import requests
import sys
import os
import tempfile
import json
from datetime import datetime
from pathlib import Path

class BulletproofVideoUploadTester:
    def __init__(self, base_url="https://swing-debug.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.uploaded_video_ids = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED")
        
        if details:
            print(f"   Details: {details}")
        print()

    def test_health_check(self):
        """Test the health check endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                expected_message = "Bulletproof Video Upload API Ready"
                success = data.get("message") == expected_message
                details = f"Status: {response.status_code}, Message: {data.get('message', 'N/A')}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
            self.log_test("Health Check (GET /api/)", success, details)
            return success
            
        except Exception as e:
            self.log_test("Health Check (GET /api/)", False, f"Exception: {str(e)}")
            return False

    def create_test_video_file(self, filename="test_video.mp4", size_mb=1):
        """Create a test video file for upload testing"""
        try:
            # Create a temporary file with video-like content
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
            
            # Write some dummy binary data to simulate a video file
            # This creates a file that looks like a video but isn't actually playable
            dummy_data = b'\x00\x00\x00\x20ftypmp42\x00\x00\x00\x00mp42isom' + b'\x00' * (size_mb * 1024 * 1024 - 28)
            temp_file.write(dummy_data)
            temp_file.close()
            
            return temp_file.name
            
        except Exception as e:
            print(f"Failed to create test video file: {e}")
            return None

    def test_video_upload(self):
        """Test video upload endpoint"""
        test_file_path = self.create_test_video_file("test_upload.mp4", 1)  # 1MB test file
        
        if not test_file_path:
            self.log_test("Video Upload (POST /api/upload)", False, "Failed to create test file")
            return False, None

        try:
            with open(test_file_path, 'rb') as f:
                files = {'file': ('test_upload.mp4', f, 'video/mp4')}
                response = requests.post(f"{self.api_url}/upload", files=files, timeout=60)
            
            success = response.status_code == 200
            
            if success:
                data = response.json()
                video_id = data.get('id')
                if video_id:
                    self.uploaded_video_ids.append(video_id)
                details = f"Status: {response.status_code}, Video ID: {video_id}, Filename: {data.get('filename', 'N/A')}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
            self.log_test("Video Upload (POST /api/upload)", success, details)
            
            # Clean up test file
            os.unlink(test_file_path)
            
            return success, data.get('id') if success else None
            
        except Exception as e:
            self.log_test("Video Upload (POST /api/upload)", False, f"Exception: {str(e)}")
            if os.path.exists(test_file_path):
                os.unlink(test_file_path)
            return False, None

    def test_invalid_file_upload(self):
        """Test upload with invalid file type"""
        try:
            # Create a text file to test rejection
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".txt")
            temp_file.write(b"This is not a video file")
            temp_file.close()
            
            with open(temp_file.name, 'rb') as f:
                files = {'file': ('test.txt', f, 'text/plain')}
                response = requests.post(f"{self.api_url}/upload", files=files, timeout=30)
            
            # Should return 400 for invalid file type
            success = response.status_code == 400
            details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test("Invalid File Upload Rejection", success, details)
            
            # Clean up
            os.unlink(temp_file.name)
            return success
            
        except Exception as e:
            self.log_test("Invalid File Upload Rejection", False, f"Exception: {str(e)}")
            return False

    def test_get_uploads_list(self):
        """Test getting list of uploads"""
        try:
            response = requests.get(f"{self.api_url}/uploads", timeout=30)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                upload_count = len(data) if isinstance(data, list) else 0
                details = f"Status: {response.status_code}, Upload count: {upload_count}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
            self.log_test("Get Uploads List (GET /api/uploads)", success, details)
            return success, data if success else []
            
        except Exception as e:
            self.log_test("Get Uploads List (GET /api/uploads)", False, f"Exception: {str(e)}")
            return False, []

    def test_get_video_file(self, video_id):
        """Test downloading a specific video file"""
        if not video_id:
            self.log_test("Get Video File (GET /api/uploads/{id})", False, "No video ID provided")
            return False
            
        try:
            response = requests.get(f"{self.api_url}/uploads/{video_id}", timeout=30)
            success = response.status_code == 200
            
            if success:
                content_type = response.headers.get('content-type', 'N/A')
                content_length = response.headers.get('content-length', 'N/A')
                details = f"Status: {response.status_code}, Content-Type: {content_type}, Size: {content_length} bytes"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
            self.log_test("Get Video File (GET /api/uploads/{id})", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Video File (GET /api/uploads/{id})", False, f"Exception: {str(e)}")
            return False

    def test_delete_video(self, video_id):
        """Test deleting a video"""
        if not video_id:
            self.log_test("Delete Video (DELETE /api/uploads/{id})", False, "No video ID provided")
            return False
            
        try:
            response = requests.delete(f"{self.api_url}/uploads/{video_id}", timeout=30)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"Status: {response.status_code}, Message: {data.get('message', 'N/A')}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
            self.log_test("Delete Video (DELETE /api/uploads/{id})", success, details)
            return success
            
        except Exception as e:
            self.log_test("Delete Video (DELETE /api/uploads/{id})", False, f"Exception: {str(e)}")
            return False

    def test_delete_nonexistent_video(self):
        """Test deleting a non-existent video"""
        fake_id = "nonexistent-video-id-12345"
        try:
            response = requests.delete(f"{self.api_url}/uploads/{fake_id}", timeout=30)
            success = response.status_code == 404
            details = f"Status: {response.status_code} (expected 404 for non-existent video)"
            
            self.log_test("Delete Non-existent Video", success, details)
            return success
            
        except Exception as e:
            self.log_test("Delete Non-existent Video", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Bulletproof Video Upload Backend API Tests")
        print(f"🌐 Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Test 1: Health Check
        health_ok = self.test_health_check()
        
        if not health_ok:
            print("❌ Health check failed - API may not be running. Stopping tests.")
            return False
        
        # Test 2: Video Upload
        upload_success, video_id = self.test_video_upload()
        
        # Test 3: Invalid File Upload
        self.test_invalid_file_upload()
        
        # Test 4: Get Uploads List
        list_success, uploads = self.test_get_uploads_list()
        
        # Test 5: Get Video File (if we have a video ID)
        if video_id:
            self.test_get_video_file(video_id)
        
        # Test 6: Delete Non-existent Video
        self.test_delete_nonexistent_video()
        
        # Test 7: Delete Video (if we have a video ID)
        if video_id:
            self.test_delete_video(video_id)
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! Backend API is working correctly.")
            return True
        else:
            failed_tests = self.tests_run - self.tests_passed
            print(f"⚠️  {failed_tests} test(s) failed. Check the details above.")
            return False

def main():
    """Main test runner"""
    tester = BulletproofVideoUploadTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())