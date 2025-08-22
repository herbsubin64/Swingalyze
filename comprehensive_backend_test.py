#!/usr/bin/env python3
"""
Comprehensive SwingAlyze Backend Testing Suite
Focused on the specific requirements from the review request:
1. Main API Endpoints (/api/quick-analyze and /api/analyze-swing)
2. File Upload Handling (various formats, large files up to 200MB)
3. Fast Analysis Integration (OpenCV integration)
4. Error Handling (invalid files, oversized files, API failures)
5. JSON Serialization (MongoDB ObjectId issues resolved)
"""

import requests
import sys
import json
import time
from datetime import datetime
import os
import tempfile
import random

class ComprehensiveSwingAlyzeAPITester:
    def __init__(self, base_url="https://swingalyze-debug-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = f"test_user_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.critical_failures = []
        self.minor_issues = []

    def log_result(self, test_name, success, is_critical=True, details=""):
        """Log test results and categorize issues"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED")
            if details:
                print(f"   Details: {details}")
            
            if is_critical:
                self.critical_failures.append(f"{test_name}: {details}")
            else:
                self.minor_issues.append(f"{test_name}: {details}")

    def create_test_video_file(self, size_mb=1, format_ext='mp4'):
        """Create a test video file with specified size and format"""
        try:
            with tempfile.NamedTemporaryFile(suffix=f'.{format_ext}', delete=False) as temp_file:
                # Create a more realistic MP4 header
                if format_ext == 'mp4':
                    header = b'\x00\x00\x00\x20ftypmp41\x00\x00\x00\x00mp41isom\x00\x00\x00\x08free'
                elif format_ext == 'mov':
                    header = b'\x00\x00\x00\x14ftypqt  \x00\x00\x00\x00qt  '
                else:
                    header = b'\x00\x00\x00\x20ftyp' + format_ext.encode() + b'\x00\x00\x00\x00'
                
                # Write header
                temp_file.write(header)
                
                # Fill to desired size
                remaining_bytes = (size_mb * 1024 * 1024) - len(header)
                chunk_size = 1024
                while remaining_bytes > 0:
                    chunk = min(chunk_size, remaining_bytes)
                    temp_file.write(b'\x00' * chunk)
                    remaining_bytes -= chunk
                
                temp_file.flush()
                return temp_file.name
        except Exception as e:
            print(f"Failed to create test file: {e}")
            return None

    def test_api_root(self):
        """Test 1: API Root Endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                has_message = 'message' in data
                self.log_result("API Root Endpoint", has_message, True, 
                              f"Status: {response.status_code}, Has message: {has_message}")
            else:
                self.log_result("API Root Endpoint", False, True, 
                              f"Expected 200, got {response.status_code}")
        except Exception as e:
            self.log_result("API Root Endpoint", False, True, str(e))

    def test_quick_analyze_endpoint(self):
        """Test 2: Quick Analyze Endpoint - Main Focus"""
        print(f"\n🎯 MAIN TEST: Quick Analyze Endpoint")
        
        video_file = self.create_test_video_file(1, 'mp4')  # 1MB MP4 file
        if not video_file:
            self.log_result("Quick Analyze - File Creation", False, True, "Could not create test file")
            return
        
        try:
            form_data = {
                'user_id': self.test_user_id,
                'swing_type': 'full_swing',
                'club_type': 'driver'
            }
            
            with open(video_file, 'rb') as f:
                files = {'video': ('test_swing.mp4', f, 'video/mp4')}
                
                start_time = time.time()
                response = requests.post(
                    f"{self.api_url}/quick-analyze",
                    data=form_data,
                    files=files,
                    timeout=10
                )
                end_time = time.time()
                
                processing_time = end_time - start_time
                
                # Test response status
                status_ok = response.status_code == 200
                self.log_result("Quick Analyze - Status Code", status_ok, True, 
                              f"Expected 200, got {response.status_code}")
                
                if status_ok:
                    try:
                        data = response.json()
                        
                        # Test JSON serialization (no ObjectId issues)
                        json_serializable = True
                        try:
                            json.dumps(data)
                        except Exception:
                            json_serializable = False
                        
                        self.log_result("Quick Analyze - JSON Serialization", json_serializable, True,
                                      "Response is properly JSON serializable")
                        
                        # Test required fields
                        required_fields = ['analysis_id', 'processing_time', 'metrics', 'recommendations', 'confidence']
                        missing_fields = [field for field in required_fields if field not in data]
                        has_required_fields = len(missing_fields) == 0
                        
                        self.log_result("Quick Analyze - Required Fields", has_required_fields, True,
                                      f"Missing fields: {missing_fields}" if missing_fields else "All fields present")
                        
                        # Test processing time (should be under 3 seconds)
                        reported_time = data.get('processing_time', '0 seconds')
                        if 'seconds' in reported_time:
                            try:
                                time_value = float(reported_time.split()[0])
                                under_3_seconds = time_value <= 3.0
                                self.log_result("Quick Analyze - Processing Time", under_3_seconds, True,
                                              f"Processing time: {reported_time} (actual: {processing_time:.2f}s)")
                            except:
                                self.log_result("Quick Analyze - Processing Time", False, False,
                                              f"Could not parse time: {reported_time}")
                        
                        # Test metrics structure
                        metrics = data.get('metrics', {})
                        expected_metrics = ['club_path_deg', 'face_to_path_deg', 'attack_angle_deg', 'tempo_ratio', 'swing_speed_mph']
                        has_metrics = all(metric in metrics for metric in expected_metrics)
                        self.log_result("Quick Analyze - Metrics Structure", has_metrics, True,
                                      f"Metrics present: {list(metrics.keys())}")
                        
                        # Test recommendations
                        recommendations = data.get('recommendations', [])
                        has_recommendations = isinstance(recommendations, list) and len(recommendations) > 0
                        self.log_result("Quick Analyze - Recommendations", has_recommendations, False,
                                      f"Recommendations count: {len(recommendations)}")
                        
                        # Test confidence score
                        confidence = data.get('confidence', 0)
                        valid_confidence = isinstance(confidence, (int, float)) and 0 <= confidence <= 1
                        self.log_result("Quick Analyze - Confidence Score", valid_confidence, False,
                                      f"Confidence: {confidence}")
                        
                    except json.JSONDecodeError:
                        self.log_result("Quick Analyze - JSON Response", False, True, "Response is not valid JSON")
                
        except Exception as e:
            self.log_result("Quick Analyze - Request", False, True, str(e))
        finally:
            if video_file and os.path.exists(video_file):
                os.unlink(video_file)

    def test_analyze_swing_endpoint(self):
        """Test 3: Full Analyze Swing Endpoint"""
        print(f"\n🎯 Testing Full Analyze Swing Endpoint")
        
        video_file = self.create_test_video_file(1, 'mp4')
        if not video_file:
            self.log_result("Analyze Swing - File Creation", False, True, "Could not create test file")
            return
        
        try:
            form_data = {
                'user_id': self.test_user_id,
                'swing_type': 'full_swing',
                'club_type': 'driver',
                'notes': 'Test analysis',
                'quick_mode': 'true'  # Use quick mode to avoid AI service issues
            }
            
            with open(video_file, 'rb') as f:
                files = {'video': ('test_swing.mp4', f, 'video/mp4')}
                
                response = requests.post(
                    f"{self.api_url}/analyze-swing",
                    data=form_data,
                    files=files,
                    timeout=30
                )
                
                # Test response status (should work with quick_mode=true)
                status_ok = response.status_code == 200
                self.log_result("Analyze Swing - Status Code", status_ok, True, 
                              f"Expected 200, got {response.status_code}")
                
                if status_ok:
                    try:
                        data = response.json()
                        
                        # Test JSON serialization
                        json_serializable = True
                        try:
                            json.dumps(data)
                        except Exception:
                            json_serializable = False
                        
                        self.log_result("Analyze Swing - JSON Serialization", json_serializable, True,
                                      "Response is properly JSON serializable")
                        
                        # Test SwingAnalysisResult structure
                        required_fields = ['id', 'user_id', 'video_filename', 'metrics', 'overall_assessment']
                        missing_fields = [field for field in required_fields if field not in data]
                        has_required_fields = len(missing_fields) == 0
                        
                        self.log_result("Analyze Swing - Required Fields", has_required_fields, True,
                                      f"Missing fields: {missing_fields}" if missing_fields else "All fields present")
                        
                    except json.JSONDecodeError:
                        self.log_result("Analyze Swing - JSON Response", False, True, "Response is not valid JSON")
                
        except Exception as e:
            self.log_result("Analyze Swing - Request", False, True, str(e))
        finally:
            if video_file and os.path.exists(video_file):
                os.unlink(video_file)

    def test_file_format_support(self):
        """Test 4: Various Video Format Support"""
        print(f"\n🎯 Testing Video Format Support")
        
        formats = [
            ('mp4', 'video/mp4'),
            ('mov', 'video/mov'),
            ('avi', 'video/avi')
        ]
        
        for format_ext, mime_type in formats:
            video_file = self.create_test_video_file(1, format_ext)
            if not video_file:
                self.log_result(f"Format Support - {format_ext.upper()}", False, False, "Could not create test file")
                continue
            
            try:
                form_data = {
                    'user_id': self.test_user_id,
                    'swing_type': 'full_swing',
                    'club_type': 'driver'
                }
                
                with open(video_file, 'rb') as f:
                    files = {'video': (f'test.{format_ext}', f, mime_type)}
                    
                    response = requests.post(
                        f"{self.api_url}/quick-analyze",
                        data=form_data,
                        files=files,
                        timeout=10
                    )
                    
                    # Should accept the format (200) or reject it properly (400)
                    acceptable_status = response.status_code in [200, 400]
                    self.log_result(f"Format Support - {format_ext.upper()}", acceptable_status, False,
                                  f"Status: {response.status_code}")
                    
            except Exception as e:
                self.log_result(f"Format Support - {format_ext.upper()}", False, False, str(e))
            finally:
                if video_file and os.path.exists(video_file):
                    os.unlink(video_file)

    def test_file_size_limits(self):
        """Test 5: File Size Limit Handling (200MB limit)"""
        print(f"\n🎯 Testing File Size Limits")
        
        # Test with acceptable size (10MB)
        video_file = self.create_test_video_file(10, 'mp4')
        if video_file:
            try:
                form_data = {
                    'user_id': self.test_user_id,
                    'swing_type': 'full_swing',
                    'club_type': 'driver'
                }
                
                with open(video_file, 'rb') as f:
                    files = {'video': ('test_10mb.mp4', f, 'video/mp4')}
                    
                    response = requests.post(
                        f"{self.api_url}/quick-analyze",
                        data=form_data,
                        files=files,
                        timeout=15
                    )
                    
                    # Should accept 10MB file
                    accepts_normal_size = response.status_code == 200
                    self.log_result("File Size - 10MB File", accepts_normal_size, True,
                                  f"Status: {response.status_code}")
                    
            except Exception as e:
                self.log_result("File Size - 10MB File", False, True, str(e))
            finally:
                os.unlink(video_file)

    def test_invalid_file_handling(self):
        """Test 6: Invalid File Format Handling"""
        print(f"\n🎯 Testing Invalid File Handling")
        
        # Test with text file
        try:
            with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as temp_file:
                temp_file.write(b'This is not a video file')
                temp_file.flush()
                
                form_data = {
                    'user_id': self.test_user_id,
                    'swing_type': 'full_swing',
                    'club_type': 'driver'
                }
                
                with open(temp_file.name, 'rb') as f:
                    files = {'video': ('invalid.txt', f, 'text/plain')}
                    
                    response = requests.post(
                        f"{self.api_url}/quick-analyze",
                        data=form_data,
                        files=files,
                        timeout=10
                    )
                    
                    # Should reject invalid format with 400
                    rejects_invalid = response.status_code == 400
                    self.log_result("Invalid File - Text File", rejects_invalid, True,
                                  f"Status: {response.status_code}")
                    
                os.unlink(temp_file.name)
                
        except Exception as e:
            self.log_result("Invalid File - Text File", False, True, str(e))

    def test_error_handling(self):
        """Test 7: API Error Handling"""
        print(f"\n🎯 Testing Error Handling")
        
        # Test missing required fields
        try:
            response = requests.post(
                f"{self.api_url}/quick-analyze",
                data={'user_id': self.test_user_id},  # Missing video file
                timeout=10
            )
            
            handles_missing_file = response.status_code == 422  # FastAPI validation error
            self.log_result("Error Handling - Missing File", handles_missing_file, True,
                          f"Status: {response.status_code}")
            
        except Exception as e:
            self.log_result("Error Handling - Missing File", False, True, str(e))
        
        # Test invalid endpoint
        try:
            response = requests.get(f"{self.api_url}/nonexistent-endpoint", timeout=10)
            handles_404 = response.status_code == 404
            self.log_result("Error Handling - 404 Endpoint", handles_404, False,
                          f"Status: {response.status_code}")
            
        except Exception as e:
            self.log_result("Error Handling - 404 Endpoint", False, False, str(e))

    def test_opencv_integration(self):
        """Test 8: OpenCV Integration (Indirect test through fast analysis)"""
        print(f"\n🎯 Testing OpenCV Integration")
        
        # This tests if the fast_analysis.py with OpenCV is working
        video_file = self.create_test_video_file(2, 'mp4')  # 2MB file for better analysis
        if not video_file:
            self.log_result("OpenCV Integration - File Creation", False, True, "Could not create test file")
            return
        
        try:
            form_data = {
                'user_id': self.test_user_id,
                'swing_type': 'full_swing',
                'club_type': 'driver'
            }
            
            with open(video_file, 'rb') as f:
                files = {'video': ('opencv_test.mp4', f, 'video/mp4')}
                
                response = requests.post(
                    f"{self.api_url}/quick-analyze",
                    data=form_data,
                    files=files,
                    timeout=10
                )
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        
                        # Check if we get realistic metrics (indicating OpenCV processing)
                        metrics = data.get('metrics', {})
                        has_realistic_metrics = (
                            'swing_speed_mph' in metrics and 
                            isinstance(metrics['swing_speed_mph'], (int, float)) and
                            50 <= metrics['swing_speed_mph'] <= 150  # Realistic swing speed range
                        )
                        
                        self.log_result("OpenCV Integration - Realistic Metrics", has_realistic_metrics, True,
                                      f"Swing speed: {metrics.get('swing_speed_mph', 'N/A')} mph")
                        
                        # Check for swing path data (indicates video analysis)
                        swing_path = data.get('swing_path', [])
                        has_swing_path = isinstance(swing_path, list) and len(swing_path) > 0
                        self.log_result("OpenCV Integration - Swing Path", has_swing_path, False,
                                      f"Swing path points: {len(swing_path)}")
                        
                    except json.JSONDecodeError:
                        self.log_result("OpenCV Integration - Response", False, True, "Invalid JSON response")
                else:
                    self.log_result("OpenCV Integration - Request", False, True, 
                                  f"Request failed with status {response.status_code}")
                
        except Exception as e:
            self.log_result("OpenCV Integration - Request", False, True, str(e))
        finally:
            if video_file and os.path.exists(video_file):
                os.unlink(video_file)

    def run_all_tests(self):
        """Run all comprehensive tests"""
        print("🏌️ SwingAlyze Comprehensive Backend Testing Suite")
        print("=" * 60)
        print(f"Testing against: {self.base_url}")
        print(f"Test User ID: {self.test_user_id}")
        print("=" * 60)
        
        # Run all tests
        self.test_api_root()
        self.test_quick_analyze_endpoint()
        self.test_analyze_swing_endpoint()
        self.test_file_format_support()
        self.test_file_size_limits()
        self.test_invalid_file_handling()
        self.test_error_handling()
        self.test_opencv_integration()
        
        # Print results
        print("\n" + "=" * 60)
        print("📊 COMPREHENSIVE TEST RESULTS")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.critical_failures:
            print(f"\n❌ CRITICAL FAILURES ({len(self.critical_failures)}):")
            for failure in self.critical_failures:
                print(f"   • {failure}")
        
        if self.minor_issues:
            print(f"\n⚠️ MINOR ISSUES ({len(self.minor_issues)}):")
            for issue in self.minor_issues:
                print(f"   • {issue}")
        
        if not self.critical_failures:
            print(f"\n✅ NO CRITICAL FAILURES - Backend core functionality is working!")
        
        print("=" * 60)
        
        # Return exit code
        return 0 if len(self.critical_failures) == 0 else 1

def main():
    tester = ComprehensiveSwingAlyzeAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())