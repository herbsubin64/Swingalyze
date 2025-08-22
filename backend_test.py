import requests
import sys
import json
from datetime import datetime
import os
import tempfile

class SwingAlyzeAPITester:
    def __init__(self, base_url="https://swingalyze-debug-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = f"test_user_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, timeout=30):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else self.api_url
        headers = {'Content-Type': 'application/json'} if not files else {}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, timeout=timeout)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Non-dict response'}")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:500]}...")

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )

    def test_user_analyses_empty(self):
        """Test getting analyses for a user with no data"""
        return self.run_test(
            "Get User Analyses (Empty)",
            "GET",
            f"user-analyses/{self.test_user_id}",
            200
        )

    def test_user_progress_empty(self):
        """Test getting progress for a user with no data"""
        return self.run_test(
            "Get User Progress (Empty)",
            "GET",
            f"progress/{self.test_user_id}",
            200
        )

    def test_swing_analysis_upload(self):
        """Test swing analysis with a dummy video file"""
        print(f"\n🔍 Testing Swing Analysis Upload...")
        print("   Creating dummy video file for testing...")
        
        # Create a small dummy video file for testing
        try:
            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_file:
                # Write some dummy binary data to simulate a video file
                dummy_video_data = b'\x00\x00\x00\x20ftypmp41\x00\x00\x00\x00mp41isom\x00\x00\x00\x08free'
                temp_file.write(dummy_video_data)
                temp_file.flush()
                
                # Prepare form data
                form_data = {
                    'user_id': self.test_user_id,
                    'swing_type': 'full_swing',
                    'club_type': 'driver',
                    'notes': 'Test swing analysis'
                }
                
                files = {
                    'video': ('test_swing.mp4', open(temp_file.name, 'rb'), 'video/mp4')
                }
                
                success, response = self.run_test(
                    "Swing Analysis Upload",
                    "POST",
                    "analyze-swing",
                    201,  # Expecting 201 for successful creation
                    data=form_data,
                    files=files,
                    timeout=120  # Longer timeout for AI analysis
                )
                
                files['video'][1].close()  # Close the file
                os.unlink(temp_file.name)  # Clean up temp file
                
                return success, response
                
        except Exception as e:
            print(f"❌ Failed to create test video file: {str(e)}")
            return False, {}

    def test_invalid_endpoints(self):
        """Test invalid endpoints return proper error codes"""
        success1, _ = self.run_test(
            "Invalid Analysis ID",
            "GET",
            "swing-analysis/invalid-id",
            404
        )
        
        success2, _ = self.run_test(
            "Invalid Compare Request",
            "POST",
            "compare-swings",
            400,
            data=["single-id"]  # Need at least 2 IDs
        )
        
        return success1 and success2

    def test_cors_headers(self):
        """Test CORS headers are present"""
        print(f"\n🔍 Testing CORS Headers...")
        try:
            response = requests.options(self.api_url, timeout=10)
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
            }
            
            print(f"   CORS Headers: {cors_headers}")
            
            # Check if at least one CORS header is present
            has_cors = any(value for value in cors_headers.values())
            
            if has_cors:
                print("✅ CORS headers detected")
                self.tests_passed += 1
            else:
                print("❌ No CORS headers found")
            
            self.tests_run += 1
            return has_cors
            
        except Exception as e:
            print(f"❌ Failed to test CORS: {str(e)}")
            self.tests_run += 1
            return False

def main():
    print("🏌️ SwingAlyze API Testing Suite")
    print("=" * 50)
    
    tester = SwingAlyzeAPITester()
    
    # Test basic endpoints
    print("\n📋 Testing Basic API Endpoints...")
    tester.test_root_endpoint()
    tester.test_user_analyses_empty()
    tester.test_user_progress_empty()
    
    # Test CORS
    print("\n🌐 Testing CORS Configuration...")
    tester.test_cors_headers()
    
    # Test error handling
    print("\n⚠️ Testing Error Handling...")
    tester.test_invalid_endpoints()
    
    # Test swing analysis (this might fail if AI service is not working)
    print("\n🤖 Testing AI Swing Analysis...")
    print("   Note: This test may fail if Emergent LLM service is not available")
    analysis_success, analysis_response = tester.test_swing_analysis_upload()
    
    if analysis_success:
        print("   AI analysis working correctly!")
    else:
        print("   AI analysis failed - this may be expected if LLM service is unavailable")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! API is working correctly.")
        return 0
    elif tester.tests_passed >= tester.tests_run * 0.7:  # 70% pass rate
        print("⚠️ Most tests passed. Some issues may need attention.")
        return 0
    else:
        print("❌ Multiple test failures detected. API needs investigation.")
        return 1

if __name__ == "__main__":
    sys.exit(main())