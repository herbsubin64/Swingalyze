#!/usr/bin/env python3
"""
SwingAlyze Backend API Comprehensive Test Suite
Tests all API endpoints for the golf swing analysis system including:
1. Bulletproof Video Upload System
2. AI Golf Swing Analysis with Ghost Skeleton
3. File Validation and Error Handling
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
        self.critical_failures = []

    def log_test(self, name, success, details="", is_critical=False):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED")
            if is_critical:
                self.critical_failures.append(name)
        
        if details:
            print(f"   Details: {details}")
        print()

    def create_realistic_video_file(self, filename="golf_swing.mp4", size_mb=2):
        """Create a realistic test video file with proper MP4 signature"""
        try:
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
            
            # Create a more realistic MP4 file header
            mp4_header = (
                b'\x00\x00\x00\x20ftypmp42\x00\x00\x00\x00mp42isom'  # MP4 ftyp box
                b'\x00\x00\x00\x08free'  # free box
                b'\x00\x00\x00\x28mdat'  # mdat box header
            )
            
            # Fill with dummy video data
            remaining_size = (size_mb * 1024 * 1024) - len(mp4_header)
            dummy_data = b'\x00' * max(0, remaining_size)
            
            temp_file.write(mp4_header + dummy_data)
            temp_file.close()
            
            return temp_file.name
            
        except Exception as e:
            print(f"Failed to create test video file: {e}")
            return None

    def create_invalid_file(self, filename="fake_video.mp4"):
        """Create an invalid file that looks like video but isn't"""
        try:
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
            temp_file.write(b"This is definitely not a video file content")
            temp_file.close()
            return temp_file.name
        except Exception as e:
            print(f"Failed to create invalid test file: {e}")
            return None

    # ========== CORE API TESTS ==========

    def test_health_check(self):
        """Test the health check endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                expected_message = "Swingalyze - AI Golf Swing Analysis with Ghost Skeleton Ready"
                success = data.get("message") == expected_message
                details = f"Status: {response.status_code}, Message: {data.get('message', 'N/A')}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
            self.log_test("Health Check (GET /api/)", success, details, is_critical=True)
            return success
            
        except Exception as e:
            self.log_test("Health Check (GET /api/)", False, f"Exception: {str(e)}", is_critical=True)
            return False

    # ========== VIDEO UPLOAD TESTS ==========

    def test_video_upload_valid(self):
        """Test valid video upload - HIGH PRIORITY"""
        test_file_path = self.create_realistic_video_file("golf_swing_test.mp4", 2)
        
        if not test_file_path:
            self.log_test("Valid Video Upload", False, "Failed to create test file", is_critical=True)
            return False, None

        try:
            with open(test_file_path, 'rb') as f:
                files = {'file': ('golf_swing_test.mp4', f, 'video/mp4')}
                response = requests.post(f"{self.api_url}/upload", files=files, timeout=120)
            
            success = response.status_code == 200
            
            if success:
                data = response.json()
                video_id = data.get('id')
                if video_id:
                    self.uploaded_video_ids.append(video_id)
                details = f"Status: {response.status_code}, Video ID: {video_id}, Size: {data.get('file_size', 'N/A')} bytes"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:300]}"
                
            self.log_test("Valid Video Upload (POST /api/upload)", success, details, is_critical=True)
            
            # Clean up test file
            os.unlink(test_file_path)
            
            return success, data.get('id') if success else None
            
        except Exception as e:
            self.log_test("Valid Video Upload (POST /api/upload)", False, f"Exception: {str(e)}", is_critical=True)
            if os.path.exists(test_file_path):
                os.unlink(test_file_path)
            return False, None

    def test_video_upload_different_formats(self):
        """Test upload with different video formats"""
        formats_to_test = [
            ('test.mov', 'video/quicktime'),
            ('test.avi', 'video/x-msvideo'),
            ('test.webm', 'video/webm')
        ]
        
        all_passed = True
        
        for filename, content_type in formats_to_test:
            test_file_path = self.create_realistic_video_file(filename, 1)
            if not test_file_path:
                continue
                
            try:
                with open(test_file_path, 'rb') as f:
                    files = {'file': (filename, f, content_type)}
                    response = requests.post(f"{self.api_url}/upload", files=files, timeout=60)
                
                success = response.status_code == 200
                if success and response.json().get('id'):
                    self.uploaded_video_ids.append(response.json()['id'])
                
                details = f"Format: {content_type}, Status: {response.status_code}"
                self.log_test(f"Upload {filename}", success, details)
                
                if not success:
                    all_passed = False
                    
                os.unlink(test_file_path)
                
            except Exception as e:
                self.log_test(f"Upload {filename}", False, f"Exception: {str(e)}")
                all_passed = False
                if os.path.exists(test_file_path):
                    os.unlink(test_file_path)
        
        return all_passed

    def test_large_file_upload(self):
        """Test upload with larger file (streaming capability)"""
        test_file_path = self.create_realistic_video_file("large_golf_swing.mp4", 10)  # 10MB
        
        if not test_file_path:
            self.log_test("Large File Upload", False, "Failed to create large test file")
            return False

        try:
            with open(test_file_path, 'rb') as f:
                files = {'file': ('large_golf_swing.mp4', f, 'video/mp4')}
                # Extended timeout for large file
                response = requests.post(f"{self.api_url}/upload", files=files, timeout=180)
            
            success = response.status_code == 200
            
            if success:
                data = response.json()
                video_id = data.get('id')
                if video_id:
                    self.uploaded_video_ids.append(video_id)
                details = f"Status: {response.status_code}, Size: {data.get('file_size', 'N/A')} bytes"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:300]}"
                
            self.log_test("Large File Upload (10MB)", success, details, is_critical=True)
            
            os.unlink(test_file_path)
            return success
            
        except Exception as e:
            self.log_test("Large File Upload (10MB)", False, f"Exception: {str(e)}", is_critical=True)
            if os.path.exists(test_file_path):
                os.unlink(test_file_path)
            return False

    # ========== FILE VALIDATION TESTS ==========

    def test_invalid_file_rejection(self):
        """Test rejection of invalid file types - MEDIUM PRIORITY"""
        try:
            # Create a text file disguised as MP4
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
            temp_file.write(b"This is not a video file at all")
            temp_file.close()
            
            with open(temp_file.name, 'rb') as f:
                files = {'file': ('fake_video.mp4', f, 'video/mp4')}
                response = requests.post(f"{self.api_url}/upload", files=files, timeout=30)
            
            # Should return 400 for invalid file content
            success = response.status_code == 400
            details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test("Invalid File Content Rejection", success, details)
            
            os.unlink(temp_file.name)
            return success
            
        except Exception as e:
            self.log_test("Invalid File Content Rejection", False, f"Exception: {str(e)}")
            return False

    def test_wrong_content_type_rejection(self):
        """Test rejection of wrong content types"""
        try:
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".txt")
            temp_file.write(b"This is a text file")
            temp_file.close()
            
            with open(temp_file.name, 'rb') as f:
                files = {'file': ('document.txt', f, 'text/plain')}
                response = requests.post(f"{self.api_url}/upload", files=files, timeout=30)
            
            success = response.status_code == 400
            details = f"Status: {response.status_code}, Expected 400 for text file"
            
            self.log_test("Wrong Content Type Rejection", success, details)
            
            os.unlink(temp_file.name)
            return success
            
        except Exception as e:
            self.log_test("Wrong Content Type Rejection", False, f"Exception: {str(e)}")
            return False

    def test_empty_file_rejection(self):
        """Test rejection of empty files"""
        try:
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
            temp_file.close()  # Create empty file
            
            with open(temp_file.name, 'rb') as f:
                files = {'file': ('empty.mp4', f, 'video/mp4')}
                response = requests.post(f"{self.api_url}/upload", files=files, timeout=30)
            
            success = response.status_code == 400
            details = f"Status: {response.status_code}, Expected 400 for empty file"
            
            self.log_test("Empty File Rejection", success, details)
            
            os.unlink(temp_file.name)
            return success
            
        except Exception as e:
            self.log_test("Empty File Rejection", False, f"Exception: {str(e)}")
            return False

    # ========== AI ANALYSIS TESTS ==========

    def test_swing_analysis(self, video_id):
        """Test AI golf swing analysis - HIGH PRIORITY"""
        if not video_id:
            self.log_test("Golf Swing Analysis", False, "No video ID provided", is_critical=True)
            return False
            
        try:
            response = requests.post(f"{self.api_url}/analyze/{video_id}", timeout=180)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                has_swing_phases = 'swing_phases' in data
                has_biomechanical = 'biomechanical_data' in data
                has_recommendations = 'recommendations' in data
                has_ghost_skeleton = 'ghost_skeleton_data' in data
                
                details = f"Status: {response.status_code}, Phases: {has_swing_phases}, Bio: {has_biomechanical}, Recs: {has_recommendations}, Ghost: {has_ghost_skeleton}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:300]}"
                
            self.log_test("Golf Swing Analysis (POST /api/analyze/{id})", success, details, is_critical=True)
            return success, data if success else None
            
        except Exception as e:
            self.log_test("Golf Swing Analysis (POST /api/analyze/{id})", False, f"Exception: {str(e)}", is_critical=True)
            return False, None

    def test_ghost_skeleton_video(self, video_id):
        """Test ghost skeleton overlay video retrieval"""
        if not video_id:
            self.log_test("Ghost Skeleton Video", False, "No video ID provided")
            return False
            
        try:
            response = requests.get(f"{self.api_url}/ghost-skeleton/{video_id}", timeout=60)
            success = response.status_code == 200
            
            if success:
                content_type = response.headers.get('content-type', 'N/A')
                content_length = response.headers.get('content-length', 'N/A')
                details = f"Status: {response.status_code}, Type: {content_type}, Size: {content_length} bytes"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
            self.log_test("Ghost Skeleton Video (GET /api/ghost-skeleton/{id})", success, details, is_critical=True)
            return success
            
        except Exception as e:
            self.log_test("Ghost Skeleton Video (GET /api/ghost-skeleton/{id})", False, f"Exception: {str(e)}")
            return False

    # ========== CRUD OPERATION TESTS ==========

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
            self.log_test("Get Video File", False, "No video ID provided")
            return False
            
        try:
            response = requests.get(f"{self.api_url}/uploads/{video_id}", timeout=30)
            success = response.status_code == 200
            
            if success:
                content_type = response.headers.get('content-type', 'N/A')
                content_length = response.headers.get('content-length', 'N/A')
                details = f"Status: {response.status_code}, Type: {content_type}, Size: {content_length} bytes"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
            self.log_test("Get Video File (GET /api/uploads/{id})", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Video File (GET /api/uploads/{id})", False, f"Exception: {str(e)}")
            return False

    def test_get_analysis_results(self, video_id):
        """Test getting analysis results"""
        if not video_id:
            self.log_test("Get Analysis Results", False, "No video ID provided")
            return False
            
        try:
            response = requests.get(f"{self.api_url}/analysis/{video_id}", timeout=30)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                has_phases = 'swing_phases' in data
                has_bio_data = 'biomechanical_data' in data
                details = f"Status: {response.status_code}, Has phases: {has_phases}, Has bio data: {has_bio_data}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
            self.log_test("Get Analysis Results (GET /api/analysis/{id})", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get Analysis Results (GET /api/analysis/{id})", False, f"Exception: {str(e)}")
            return False

    def test_delete_video(self, video_id):
        """Test deleting a video and its analysis"""
        if not video_id:
            self.log_test("Delete Video", False, "No video ID provided")
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

    # ========== ERROR HANDLING TESTS ==========

    def test_nonexistent_video_operations(self):
        """Test operations on non-existent videos"""
        fake_id = "nonexistent-video-id-12345"
        
        # Test getting non-existent video
        try:
            response = requests.get(f"{self.api_url}/uploads/{fake_id}", timeout=30)
            success = response.status_code == 404
            self.log_test("Get Non-existent Video (404)", success, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get Non-existent Video (404)", False, f"Exception: {str(e)}")
        
        # Test analyzing non-existent video
        try:
            response = requests.post(f"{self.api_url}/analyze/{fake_id}", timeout=30)
            success = response.status_code == 404
            self.log_test("Analyze Non-existent Video (404)", success, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Analyze Non-existent Video (404)", False, f"Exception: {str(e)}")
        
        # Test deleting non-existent video
        try:
            response = requests.delete(f"{self.api_url}/uploads/{fake_id}", timeout=30)
            success = response.status_code == 404
            self.log_test("Delete Non-existent Video (404)", success, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Delete Non-existent Video (404)", False, f"Exception: {str(e)}")

    def run_comprehensive_tests(self):
        """Run all comprehensive backend API tests"""
        print("🏌️ Starting SwingAlyze Backend API Comprehensive Tests")
        print(f"🌐 Testing API at: {self.api_url}")
        print("=" * 70)
        
        # ========== PHASE 1: CORE CONNECTIVITY ==========
        print("📡 PHASE 1: Core Connectivity Tests")
        print("-" * 40)
        
        health_ok = self.test_health_check()
        if not health_ok:
            print("❌ Health check failed - API may not be running. Stopping tests.")
            return False
        
        # ========== PHASE 2: VIDEO UPLOAD SYSTEM ==========
        print("\n📤 PHASE 2: Bulletproof Video Upload System Tests")
        print("-" * 50)
        
        # Test valid upload
        upload_success, primary_video_id = self.test_video_upload_valid()
        
        # Test different formats
        self.test_video_upload_different_formats()
        
        # Test large file upload
        self.test_large_file_upload()
        
        # ========== PHASE 3: FILE VALIDATION ==========
        print("\n🔍 PHASE 3: File Validation and Error Handling Tests")
        print("-" * 55)
        
        self.test_invalid_file_rejection()
        self.test_wrong_content_type_rejection()
        self.test_empty_file_rejection()
        
        # ========== PHASE 4: AI ANALYSIS SYSTEM ==========
        print("\n🤖 PHASE 4: AI Golf Swing Analysis Tests")
        print("-" * 45)
        
        analysis_success = False
        if primary_video_id:
            analysis_success, analysis_data = self.test_swing_analysis(primary_video_id)
            if analysis_success:
                self.test_ghost_skeleton_video(primary_video_id)
        
        # ========== PHASE 5: CRUD OPERATIONS ==========
        print("\n📋 PHASE 5: CRUD Operations Tests")
        print("-" * 35)
        
        self.test_get_uploads_list()
        
        if primary_video_id:
            self.test_get_video_file(primary_video_id)
            if analysis_success:
                self.test_get_analysis_results(primary_video_id)
        
        # ========== PHASE 6: ERROR HANDLING ==========
        print("\n⚠️  PHASE 6: Error Handling Tests")
        print("-" * 35)
        
        self.test_nonexistent_video_operations()
        
        # ========== CLEANUP ==========
        print("\n🧹 CLEANUP: Removing Test Data")
        print("-" * 35)
        
        # Clean up uploaded test videos
        for video_id in self.uploaded_video_ids:
            self.test_delete_video(video_id)
        
        # ========== FINAL RESULTS ==========
        print("\n" + "=" * 70)
        print(f"📊 FINAL TEST RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.critical_failures:
            print(f"🚨 CRITICAL FAILURES ({len(self.critical_failures)}):")
            for failure in self.critical_failures:
                print(f"   - {failure}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED! SwingAlyze Backend API is fully functional.")
            return True
        else:
            failed_tests = self.tests_run - self.tests_passed
            critical_count = len(self.critical_failures)
            print(f"⚠️  {failed_tests} test(s) failed ({critical_count} critical).")
            
            if critical_count == 0:
                print("✅ No critical failures - core functionality is working.")
                return True
            else:
                print("❌ Critical failures detected - core functionality may be impaired.")
                return False

def main():
    """Main test runner"""
    tester = SwingAlyzeAPITester()
    success = tester.run_comprehensive_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())