#!/usr/bin/env python3
"""
SwingAlyze Golf Swing Analysis Backend API Test Suite
Tests all API endpoints for the SwingAlyze golf swing analysis system
"""

import requests
import sys
import os
import tempfile
import json
import time
from datetime import datetime
from pathlib import Path

class SwingAlyzeAPITester:
    def __init__(self, base_url="https://golftech-ai.preview.emergentagent.com"):
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
        """Test the SwingAlyze health check endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                expected_message = "Swingalyze - AI Golf Swing Analysis with Ghost Skeleton Ready"
                success = expected_message in data.get("message", "")
                details = f"Status: {response.status_code}, Message: {data.get('message', 'N/A')}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
            self.log_test("SwingAlyze Health Check (GET /api/)", success, details)
            return success
            
        except Exception as e:
            self.log_test("SwingAlyze Health Check (GET /api/)", False, f"Exception: {str(e)}")
            return False

    def create_test_video_file(self, filename="test_golf_swing.mp4", size_mb=1):
        """Create a test video file for golf swing upload testing"""
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
        """Test golf swing video upload endpoint"""
        test_file_path = self.create_test_video_file("test_golf_swing.mp4", 1)  # 1MB test file
        
        if not test_file_path:
            self.log_test("Golf Swing Video Upload (POST /api/upload)", False, "Failed to create test file")
            return False, None

        try:
            with open(test_file_path, 'rb') as f:
                files = {'file': ('test_golf_swing.mp4', f, 'video/mp4')}
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
                
            self.log_test("Golf Swing Video Upload (POST /api/upload)", success, details)
            
            # Clean up test file
            os.unlink(test_file_path)
            
            return success, data.get('id') if success else None
            
        except Exception as e:
            self.log_test("Golf Swing Video Upload (POST /api/upload)", False, f"Exception: {str(e)}")
            if os.path.exists(test_file_path):
                os.unlink(test_file_path)
            return False, None

    def test_swing_analysis(self, video_id):
        """Test golf swing analysis with ghost skeleton generation"""
        if not video_id:
            self.log_test("Golf Swing Analysis (POST /api/analyze/{id})", False, "No video ID provided")
            return False, None
            
        try:
            print(f"   🔄 Starting swing analysis for video {video_id}...")
            response = requests.post(f"{self.api_url}/analyze/{video_id}", timeout=120)  # Extended timeout for AI processing
            success = response.status_code == 200
            
            if success:
                data = response.json()
                # Check for key SwingAlyze analysis components
                has_swing_phases = 'swing_phases' in data and len(data['swing_phases']) > 0
                has_biomechanical = 'biomechanical_data' in data
                has_recommendations = 'recommendations' in data and len(data['recommendations']) > 0
                has_ghost_skeleton = 'ghost_skeleton_data' in data
                
                analysis_quality = sum([has_swing_phases, has_biomechanical, has_recommendations, has_ghost_skeleton])
                
                details = f"Status: {response.status_code}, Analysis components: {analysis_quality}/4 (phases: {has_swing_phases}, biomech: {has_biomechanical}, recommendations: {has_recommendations}, ghost: {has_ghost_skeleton})"
                
                if analysis_quality >= 3:  # At least 3 out of 4 components should be present
                    success = True
                else:
                    success = False
                    details += " - Insufficient analysis components"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
            self.log_test("Golf Swing Analysis (POST /api/analyze/{id})", success, details)
            return success, data if success else None
            
        except Exception as e:
            self.log_test("Golf Swing Analysis (POST /api/analyze/{id})", False, f"Exception: {str(e)}")
            return False, None

    def test_get_uploads_list(self):
        """Test getting list of uploaded golf swing videos"""
        try:
            response = requests.get(f"{self.api_url}/uploads", timeout=30)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                upload_count = len(data) if isinstance(data, list) else 0
                details = f"Status: {response.status_code}, Upload count: {upload_count}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
            self.log_test("Get Golf Swing Videos List (GET /api/uploads)", success, details)
            return success, data if success else []
            
        except Exception as e:
            self.log_test("Get Golf Swing Videos List (GET /api/uploads)", False, f"Exception: {str(e)}")
            return False, []

    def test_get_video_file(self, video_id):
        """Test downloading original golf swing video file"""
        if not video_id:
            self.log_test("Get Original Video (GET /api/uploads/{id})", False, "No video ID provided")
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
                
            self.log_test("Get Original Video (GET /api/uploads/{id})", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Original Video (GET /api/uploads/{id})", False, f"Exception: {str(e)}")
            return False

    def test_get_ghost_skeleton_video(self, video_id):
        """Test downloading ghost skeleton overlay video"""
        if not video_id:
            self.log_test("Get Ghost Skeleton Video (GET /api/ghost-skeleton/{id})", False, "No video ID provided")
            return False
            
        try:
            response = requests.get(f"{self.api_url}/ghost-skeleton/{video_id}", timeout=30)
            success = response.status_code == 200
            
            if success:
                content_type = response.headers.get('content-type', 'N/A')
                content_length = response.headers.get('content-length', 'N/A')
                details = f"Status: {response.status_code}, Content-Type: {content_type}, Size: {content_length} bytes"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
            self.log_test("Get Ghost Skeleton Video (GET /api/ghost-skeleton/{id})", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Ghost Skeleton Video (GET /api/ghost-skeleton/{id})", False, f"Exception: {str(e)}")
            return False

    def test_get_analysis_results(self, video_id):
        """Test getting swing analysis results"""
        if not video_id:
            self.log_test("Get Analysis Results (GET /api/analysis/{id})", False, "No video ID provided")
            return False
            
        try:
            response = requests.get(f"{self.api_url}/analysis/{video_id}", timeout=30)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                has_phases = 'swing_phases' in data
                has_biomech = 'biomechanical_data' in data
                has_recommendations = 'recommendations' in data
                details = f"Status: {response.status_code}, Has phases: {has_phases}, Has biomech: {has_biomech}, Has recommendations: {has_recommendations}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
            self.log_test("Get Analysis Results (GET /api/analysis/{id})", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Analysis Results (GET /api/analysis/{id})", False, f"Exception: {str(e)}")
            return False

    def test_invalid_file_upload(self):
        """Test upload with invalid file type"""
        try:
            # Create a text file to test rejection
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".txt")
            temp_file.write(b"This is not a golf swing video file")
            temp_file.close()
            
            with open(temp_file.name, 'rb') as f:
                files = {'file': ('not_a_video.txt', f, 'text/plain')}
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

    def test_delete_video(self, video_id):
        """Test deleting a golf swing video and its analysis"""
        if not video_id:
            self.log_test("Delete Video & Analysis (DELETE /api/uploads/{id})", False, "No video ID provided")
            return False
            
        try:
            response = requests.delete(f"{self.api_url}/uploads/{video_id}", timeout=30)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"Status: {response.status_code}, Message: {data.get('message', 'N/A')}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
            self.log_test("Delete Video & Analysis (DELETE /api/uploads/{id})", success, details)
            return success
            
        except Exception as e:
            self.log_test("Delete Video & Analysis (DELETE /api/uploads/{id})", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all SwingAlyze backend API tests"""
        print("🏌️ Starting SwingAlyze Golf Swing Analysis Backend API Tests")
        print(f"🌐 Testing API at: {self.api_url}")
        print("=" * 70)
        
        # Test 1: Health Check
        health_ok = self.test_health_check()
        
        if not health_ok:
            print("❌ Health check failed - SwingAlyze API may not be running. Stopping tests.")
            return False
        
        # Test 2: Golf Swing Video Upload
        upload_success, video_id = self.test_video_upload()
        
        # Test 3: Invalid File Upload
        self.test_invalid_file_upload()
        
        # Test 4: Get Uploads List
        list_success, uploads = self.test_get_uploads_list()
        
        # Test 5: Golf Swing Analysis (if we have a video ID)
        analysis_success = False
        if video_id:
            analysis_success, analysis_data = self.test_swing_analysis(video_id)
            
            # Test 6: Get Original Video File
            self.test_get_video_file(video_id)
            
            # Test 7: Get Ghost Skeleton Video (if analysis was successful)
            if analysis_success:
                self.test_get_ghost_skeleton_video(video_id)
            
            # Test 8: Get Analysis Results
            self.test_get_analysis_results(video_id)
        
        # Test 9: Delete Video and Analysis (if we have a video ID)
        if video_id:
            self.test_delete_video(video_id)
        
        # Print summary
        print("=" * 70)
        print(f"📊 SwingAlyze Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! SwingAlyze Backend API is working correctly.")
            print("✅ Golf swing analysis with ghost skeleton functionality is operational!")
            return True
        else:
            failed_tests = self.tests_run - self.tests_passed
            print(f"⚠️  {failed_tests} test(s) failed. Check the details above.")
            
            # Provide specific feedback based on what failed
            if not health_ok:
                print("🔧 Action needed: Check if SwingAlyze backend service is running")
            elif not upload_success:
                print("🔧 Action needed: Video upload functionality needs attention")
            elif video_id and not analysis_success:
                print("🔧 Action needed: Golf swing analysis or ghost skeleton generation is failing")
            
            return False

def main():
    """Main test runner"""
    tester = SwingAlyzeAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())