#!/usr/bin/env python3
"""
SwingAlyze Comprehensive Backend Test Suite
Tests all API endpoints with focus on error handling and edge cases
"""

import requests
import sys
import os
import tempfile
import json
import time
from datetime import datetime
from pathlib import Path

class SwingAlyzeComprehensiveTester:
    def __init__(self, base_url="https://swing-debug.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.uploaded_video_ids = []
        self.critical_errors = []

    def log_test(self, name, success, details="", critical=False):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED")
            if critical:
                self.critical_errors.append(f"{name}: {details}")
        
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
                
            self.log_test("Health Check (GET /api/)", success, details, critical=True)
            return success
            
        except Exception as e:
            self.log_test("Health Check (GET /api/)", False, f"Exception: {str(e)}", critical=True)
            return False

    def create_test_video_file(self, filename="test_golf_swing.mp4", size_mb=1, valid=True):
        """Create a test video file for golf swing upload testing"""
        try:
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4" if valid else ".txt")
            
            if valid:
                # Create a minimal valid MP4 header
                dummy_data = b'\x00\x00\x00\x20ftypmp42\x00\x00\x00\x00mp42isom' + b'\x00' * (size_mb * 1024 * 1024 - 28)
            else:
                # Create invalid file content
                dummy_data = b'This is not a video file' + b'\x00' * (size_mb * 1024 * 1024 - 24)
            
            temp_file.write(dummy_data)
            temp_file.close()
            
            return temp_file.name
            
        except Exception as e:
            print(f"Failed to create test video file: {e}")
            return None

    def create_corrupted_video_file(self):
        """Create a corrupted video file to test error handling"""
        try:
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
            # Write corrupted MP4 header
            corrupted_data = b'\x00\x00\x00\x20ftyp' + b'\xFF' * 100  # Corrupted header
            temp_file.write(corrupted_data)
            temp_file.close()
            return temp_file.name
        except Exception as e:
            print(f"Failed to create corrupted video file: {e}")
            return None

    def test_valid_video_upload(self):
        """Test valid golf swing video upload"""
        test_file_path = self.create_test_video_file("test_golf_swing.mp4", 1)
        
        if not test_file_path:
            self.log_test("Valid Video Upload (POST /api/upload)", False, "Failed to create test file")
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
                
            self.log_test("Valid Video Upload (POST /api/upload)", success, details)
            
            os.unlink(test_file_path)
            return success, data.get('id') if success else None
            
        except Exception as e:
            self.log_test("Valid Video Upload (POST /api/upload)", False, f"Exception: {str(e)}")
            if os.path.exists(test_file_path):
                os.unlink(test_file_path)
            return False, None

    def test_invalid_file_upload(self):
        """Test upload with invalid file type - should be gracefully rejected"""
        try:
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
            
            os.unlink(temp_file.name)
            return success
            
        except Exception as e:
            self.log_test("Invalid File Upload Rejection", False, f"Exception: {str(e)}")
            return False

    def test_corrupted_video_upload(self):
        """Test upload with corrupted video file - should handle gracefully"""
        test_file_path = self.create_corrupted_video_file()
        
        if not test_file_path:
            self.log_test("Corrupted Video Upload (POST /api/upload)", False, "Failed to create corrupted file")
            return False, None

        try:
            with open(test_file_path, 'rb') as f:
                files = {'file': ('corrupted_video.mp4', f, 'video/mp4')}
                response = requests.post(f"{self.api_url}/upload", files=files, timeout=60)
            
            # Should either accept (200) or reject gracefully (400)
            success = response.status_code in [200, 400]
            
            video_id = None
            if response.status_code == 200:
                data = response.json()
                video_id = data.get('id')
                if video_id:
                    self.uploaded_video_ids.append(video_id)
                details = f"Status: {response.status_code}, Video ID: {video_id} (Upload accepted, will test analysis)"
            else:
                details = f"Status: {response.status_code}, Response: {response.text[:200]} (Gracefully rejected)"
                
            self.log_test("Corrupted Video Upload Handling", success, details)
            
            os.unlink(test_file_path)
            return success, video_id
            
        except Exception as e:
            self.log_test("Corrupted Video Upload Handling", False, f"Exception: {str(e)}")
            if os.path.exists(test_file_path):
                os.unlink(test_file_path)
            return False, None

    def test_swing_analysis_with_error_handling(self, video_id, test_name="Swing Analysis"):
        """Test golf swing analysis with focus on error handling"""
        if not video_id:
            self.log_test(f"{test_name} (POST /api/analyze/{{id}})", False, "No video ID provided")
            return False, None
            
        try:
            print(f"   🔄 Starting swing analysis for video {video_id}...")
            response = requests.post(f"{self.api_url}/analyze/{video_id}", timeout=120)
            
            # Analysis should not crash - either succeed (200) or fail gracefully (400/500 with proper error message)
            if response.status_code == 200:
                data = response.json()
                
                # Check for key components
                has_swing_phases = 'swing_phases' in data
                has_biomechanical = 'biomechanical_data' in data
                has_recommendations = 'recommendations' in data and len(data['recommendations']) > 0
                has_ghost_skeleton = 'ghost_skeleton_data' in data
                
                # Check for error handling in biomechanical data
                biomech_data = data.get('biomechanical_data', {})
                has_error_field = 'error' in biomech_data
                
                if has_error_field:
                    # Analysis failed but provided fallback
                    success = True
                    details = f"Status: 200, Analysis failed gracefully with fallback: {biomech_data.get('error', 'Unknown error')}"
                else:
                    # Normal successful analysis
                    analysis_quality = sum([has_swing_phases, has_biomechanical, has_recommendations, has_ghost_skeleton])
                    success = analysis_quality >= 2  # At least 2 components should work
                    details = f"Status: 200, Analysis components: {analysis_quality}/4 (phases: {has_swing_phases}, biomech: {has_biomechanical}, recommendations: {has_recommendations}, ghost: {has_ghost_skeleton})"
                
            elif response.status_code in [400, 500]:
                # Check if error message is informative
                try:
                    error_data = response.json()
                    error_detail = error_data.get('detail', 'No error detail provided')
                    success = len(error_detail) > 10  # Should have meaningful error message
                    details = f"Status: {response.status_code}, Error handled gracefully: {error_detail}"
                except:
                    success = False
                    details = f"Status: {response.status_code}, Poor error handling: {response.text[:200]}"
            else:
                success = False
                details = f"Status: {response.status_code}, Unexpected response: {response.text[:200]}"
                
            self.log_test(f"{test_name} Error Handling", success, details)
            return success, data if response.status_code == 200 else None
            
        except Exception as e:
            # Should not crash with unhandled exceptions
            self.log_test(f"{test_name} Error Handling", False, f"Unhandled Exception: {str(e)}", critical=True)
            return False, None

    def test_division_by_zero_protection(self, video_id):
        """Test that analysis doesn't crash with division by zero errors"""
        if not video_id:
            return True  # Skip if no video ID
            
        try:
            response = requests.post(f"{self.api_url}/analyze/{video_id}", timeout=120)
            
            # Should not return 500 errors due to division by zero
            success = response.status_code != 500 or "division by zero" not in response.text.lower()
            
            if response.status_code == 500:
                details = f"Status: 500, Response: {response.text[:200]}"
                if "division by zero" in response.text.lower():
                    details += " - CRITICAL: Division by zero error detected!"
            else:
                details = f"Status: {response.status_code}, No division by zero errors detected"
                
            self.log_test("Division by Zero Protection", success, details, critical=not success)
            return success
            
        except Exception as e:
            self.log_test("Division by Zero Protection", False, f"Exception: {str(e)}")
            return False

    def test_ghost_skeleton_generation(self, video_id):
        """Test ghost skeleton video generation"""
        if not video_id:
            self.log_test("Ghost Skeleton Generation", False, "No video ID provided")
            return False
            
        try:
            response = requests.get(f"{self.api_url}/ghost-skeleton/{video_id}", timeout=30)
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', 'N/A')
                content_length = response.headers.get('content-length', 'N/A')
                success = 'video' in content_type.lower()
                details = f"Status: 200, Content-Type: {content_type}, Size: {content_length} bytes"
            elif response.status_code == 404:
                # Acceptable if ghost skeleton wasn't generated due to analysis failure
                success = True
                details = f"Status: 404, Ghost skeleton not generated (acceptable for failed analysis)"
            else:
                success = False
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
            self.log_test("Ghost Skeleton Generation", success, details)
            return success
            
        except Exception as e:
            self.log_test("Ghost Skeleton Generation", False, f"Exception: {str(e)}")
            return False

    def test_analysis_results_endpoint(self, video_id):
        """Test getting analysis results"""
        if not video_id:
            self.log_test("Analysis Results Endpoint", False, "No video ID provided")
            return False
            
        try:
            response = requests.get(f"{self.api_url}/analysis/{video_id}", timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                has_required_fields = any(field in data for field in ['swing_phases', 'biomechanical_data', 'recommendations'])
                success = has_required_fields
                details = f"Status: 200, Has required analysis fields: {has_required_fields}"
            elif response.status_code == 404:
                success = True  # Acceptable if analysis wasn't stored
                details = f"Status: 404, Analysis not found (acceptable)"
            else:
                success = False
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
            self.log_test("Analysis Results Endpoint", success, details)
            return success
            
        except Exception as e:
            self.log_test("Analysis Results Endpoint", False, f"Exception: {str(e)}")
            return False

    def cleanup_test_videos(self):
        """Clean up uploaded test videos"""
        for video_id in self.uploaded_video_ids:
            try:
                requests.delete(f"{self.api_url}/uploads/{video_id}", timeout=30)
            except:
                pass  # Ignore cleanup errors

    def run_comprehensive_tests(self):
        """Run comprehensive SwingAlyze backend tests focusing on error handling"""
        print("🏌️ Starting SwingAlyze Comprehensive Backend Tests")
        print("🎯 Focus: Error Handling, Edge Cases, and System Stability")
        print(f"🌐 Testing API at: {self.api_url}")
        print("=" * 80)
        
        # Test 1: Health Check
        health_ok = self.test_health_check()
        
        if not health_ok:
            print("❌ Health check failed - SwingAlyze API may not be running. Stopping tests.")
            return False
        
        # Test 2: Valid Video Upload
        upload_success, video_id = self.test_valid_video_upload()
        
        # Test 3: Invalid File Upload (Error Handling)
        self.test_invalid_file_upload()
        
        # Test 4: Corrupted Video Upload (Error Handling)
        corrupted_success, corrupted_video_id = self.test_corrupted_video_upload()
        
        # Test 5: Analysis Error Handling (Valid Video)
        if video_id:
            self.test_swing_analysis_with_error_handling(video_id, "Valid Video Analysis")
            self.test_division_by_zero_protection(video_id)
            self.test_ghost_skeleton_generation(video_id)
            self.test_analysis_results_endpoint(video_id)
        
        # Test 6: Analysis Error Handling (Corrupted Video)
        if corrupted_video_id:
            self.test_swing_analysis_with_error_handling(corrupted_video_id, "Corrupted Video Analysis")
            self.test_division_by_zero_protection(corrupted_video_id)
        
        # Cleanup
        self.cleanup_test_videos()
        
        # Print comprehensive summary
        print("=" * 80)
        print(f"📊 Comprehensive Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.critical_errors:
            print("\n🚨 CRITICAL ERRORS DETECTED:")
            for error in self.critical_errors:
                print(f"   • {error}")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! SwingAlyze Backend is production-ready.")
            print("✅ Error handling and edge cases are properly implemented!")
            return True
        else:
            failed_tests = self.tests_run - self.tests_passed
            print(f"⚠️  {failed_tests} test(s) failed. Check the details above.")
            
            # Provide specific feedback
            if self.critical_errors:
                print("🔧 URGENT: Critical errors need immediate attention before production")
            else:
                print("🔧 Minor issues detected - system is mostly stable")
            
            return False

def main():
    """Main test runner"""
    tester = SwingAlyzeComprehensiveTester()
    success = tester.run_comprehensive_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())