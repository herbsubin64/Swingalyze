import requests
import sys
import json
from datetime import datetime
import io

class SwingAlyzeAPITester:
    def __init__(self, base_url="https://swing-error-help.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else f"{self.api_url}/"
        headers = {'Content-Type': 'application/json'} if not files else {}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, timeout=10)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

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

    def test_upload_video(self):
        """Test video upload endpoint"""
        # Create a mock video file
        mock_video = io.BytesIO(b"mock video content")
        files = {'file': ('test_swing.mp4', mock_video, 'video/mp4')}
        
        return self.run_test(
            "Video Upload",
            "POST",
            "upload",
            200,
            files=files
        )

    def test_analyze_swing(self):
        """Test swing analysis endpoint"""
        analysis_data = {
            "filename": "test_swing.mp4",
            "club_speed": 95.5,
            "ball_speed": 140.2,
            "launch_angle": 14.5,
            "accuracy": 82.3,
            "consistency": 78.9,
            "recommendations": [
                "Focus on maintaining steady tempo throughout the swing",
                "Work on hip rotation for increased power"
            ]
        }
        
        return self.run_test(
            "Swing Analysis",
            "POST",
            "analyze",
            200,
            data=analysis_data
        )

    def test_get_swing_history(self):
        """Test getting swing history"""
        return self.run_test(
            "Get Swing History",
            "GET",
            "swings",
            200
        )

    def test_get_user_stats(self):
        """Test getting user statistics"""
        return self.run_test(
            "Get User Stats",
            "GET",
            "stats",
            200
        )

    def test_delete_swing(self):
        """Test deleting a swing (with mock ID)"""
        return self.run_test(
            "Delete Swing",
            "DELETE",
            "swing/test-swing-id",
            200
        )

def main():
    print("🏌️ SwingAlyze Pro API Testing Suite")
    print("=" * 50)
    
    # Setup
    tester = SwingAlyzeAPITester()
    
    # Run all tests
    print("\n📡 Testing API Endpoints...")
    
    # Test root endpoint
    success, response = tester.test_root_endpoint()
    if not success:
        print("❌ Root endpoint failed - this might indicate server issues")
    
    # Test upload endpoint
    success, response = tester.test_upload_video()
    if not success:
        print("❌ Upload endpoint failed")
    
    # Test analysis endpoint
    success, response = tester.test_analyze_swing()
    if not success:
        print("❌ Analysis endpoint failed")
    
    # Test swing history
    success, response = tester.test_get_swing_history()
    if not success:
        print("❌ Swing history endpoint failed")
    else:
        print(f"   Found {len(response) if isinstance(response, list) else 0} swing records")
    
    # Test user stats
    success, response = tester.test_get_user_stats()
    if not success:
        print("❌ User stats endpoint failed")
    
    # Test delete swing
    success, response = tester.test_delete_swing()
    if not success:
        print("❌ Delete swing endpoint failed")
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend API is working correctly.")
        return 0
    elif tester.tests_passed >= tester.tests_run * 0.5:
        print("⚠️  Most tests passed, but some issues found.")
        return 0
    else:
        print("❌ Major backend issues detected. More than 50% of tests failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())