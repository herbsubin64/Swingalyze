import requests
import sys
from datetime import datetime
import json

class SwingalyzeAPITester:
    def __init__(self, base_url="https://swingdebug.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"Response: {json.dumps(response_data, indent=2)}")
                except:
                    print(f"Response text: {response.text[:200]}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text[:200]}")

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "api/", 200)

    def test_create_status_check(self):
        """Test creating a status check"""
        test_data = {
            "client_name": f"test_client_{datetime.now().strftime('%H%M%S')}"
        }
        success, response = self.run_test(
            "Create Status Check",
            "POST", 
            "api/status",
            200,  # FastAPI typically returns 200 for successful POST, not 201
            data=test_data
        )
        return success, response

    def test_get_status_checks(self):
        """Test getting all status checks"""
        return self.run_test("Get Status Checks", "GET", "api/status", 200)

def main():
    print("🚀 Starting Swingalyze Backend API Tests")
    print("=" * 50)
    
    # Setup
    tester = SwingalyzeAPITester()
    
    # Test basic connectivity
    print("\n📡 Testing API connectivity...")
    success, _ = tester.test_root_endpoint()
    if not success:
        print("❌ Root API endpoint failed - backend may not be running properly")
        print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
        return 1

    # Test status check creation
    print("\n📝 Testing status check creation...")
    success, status_response = tester.test_create_status_check()
    if not success:
        print("❌ Status check creation failed")
    
    # Test status check retrieval
    print("\n📋 Testing status check retrieval...")
    success, _ = tester.test_get_status_checks()
    if not success:
        print("❌ Status check retrieval failed")

    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend tests passed!")
        return 0
    else:
        print("⚠️  Some backend tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())