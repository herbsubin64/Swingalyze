import requests
import sys
import json
from datetime import datetime
import time
import io
import os

class SwingAnalyzeAPITester:
    def __init__(self, base_url="https://swingfix.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_analysis_ids = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = requests.get(f"{self.api_url}/")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f" | Message: {data.get('message', 'N/A')}"
            return self.log_test("API Root", success, details)
        except Exception as e:
            return self.log_test("API Root", False, f"Error: {str(e)}")

    def test_create_analysis(self, player_name, club_type, swing_speed=None, ball_speed=None, distance=None, accuracy_rating=None, notes=None):
        """Test creating a swing analysis"""
        payload = {
            "player_name": player_name,
            "club_type": club_type
        }
        if swing_speed is not None:
            payload["swing_speed"] = swing_speed
        if ball_speed is not None:
            payload["ball_speed"] = ball_speed
        if distance is not None:
            payload["distance"] = distance
        if accuracy_rating is not None:
            payload["accuracy_rating"] = accuracy_rating
        if notes is not None:
            payload["notes"] = notes

        try:
            response = requests.post(f"{self.api_url}/analysis", json=payload)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                analysis_id = data.get('id')
                if analysis_id:
                    self.created_analysis_ids.append(analysis_id)
                    details += f" | ID: {analysis_id}"
                return self.log_test(f"Create Analysis ({player_name})", success, details)
            else:
                details += f" | Response: {response.text[:100]}"
                return self.log_test(f"Create Analysis ({player_name})", success, details)
        except Exception as e:
            return self.log_test(f"Create Analysis ({player_name})", False, f"Error: {str(e)}")

    def test_get_all_analyses(self):
        """Test getting all analyses"""
        try:
            response = requests.get(f"{self.api_url}/analysis")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f" | Count: {len(data)}"
            return self.log_test("Get All Analyses", success, details)
        except Exception as e:
            return self.log_test("Get All Analyses", False, f"Error: {str(e)}")

    def test_get_analyses_by_player(self, player_name):
        """Test getting analyses filtered by player"""
        try:
            response = requests.get(f"{self.api_url}/analysis?player_name={player_name}")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f" | Count for {player_name}: {len(data)}"
            return self.log_test(f"Get Analyses by Player ({player_name})", success, details)
        except Exception as e:
            return self.log_test(f"Get Analyses by Player ({player_name})", False, f"Error: {str(e)}")

    def test_get_specific_analysis(self, analysis_id):
        """Test getting a specific analysis by ID"""
        try:
            response = requests.get(f"{self.api_url}/analysis/{analysis_id}")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f" | Player: {data.get('player_name', 'N/A')}"
            return self.log_test(f"Get Specific Analysis", success, details)
        except Exception as e:
            return self.log_test(f"Get Specific Analysis", False, f"Error: {str(e)}")

    def test_get_players(self):
        """Test getting all players"""
        try:
            response = requests.get(f"{self.api_url}/players")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f" | Players: {data}"
            return self.log_test("Get Players", success, details)
        except Exception as e:
            return self.log_test("Get Players", False, f"Error: {str(e)}")

    def test_get_player_stats(self, player_name):
        """Test getting player statistics"""
        try:
            response = requests.get(f"{self.api_url}/stats/{player_name}")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f" | Total Swings: {data.get('total_swings', 'N/A')}"
                details += f" | Avg Speed: {data.get('avg_swing_speed', 'N/A')}"
            return self.log_test(f"Get Player Stats ({player_name})", success, details)
        except Exception as e:
            return self.log_test(f"Get Player Stats ({player_name})", False, f"Error: {str(e)}")

    def test_get_clubs(self):
        """Test getting all club types"""
        try:
            response = requests.get(f"{self.api_url}/clubs")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f" | Clubs: {data}"
            return self.log_test("Get Clubs", success, details)
        except Exception as e:
            return self.log_test("Get Clubs", False, f"Error: {str(e)}")

    def test_delete_analysis(self, analysis_id):
        """Test deleting an analysis"""
        try:
            response = requests.delete(f"{self.api_url}/analysis/{analysis_id}")
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                details += f" | Message: {data.get('message', 'N/A')}"
            return self.log_test(f"Delete Analysis", success, details)
        except Exception as e:
            return self.log_test(f"Delete Analysis", False, f"Error: {str(e)}")

    def test_error_handling(self):
        """Test error handling for invalid requests"""
        print("\n🔍 Testing Error Handling...")
        
        # Test invalid analysis ID
        try:
            response = requests.get(f"{self.api_url}/analysis/invalid-id")
            success = response.status_code == 404
            self.log_test("Invalid Analysis ID (404)", success, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Invalid Analysis ID (404)", False, f"Error: {str(e)}")

        # Test invalid player stats
        try:
            response = requests.get(f"{self.api_url}/stats/NonExistentPlayer")
            success = response.status_code == 404
            self.log_test("Invalid Player Stats (404)", success, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Invalid Player Stats (404)", False, f"Error: {str(e)}")

        # Test invalid create analysis (missing required fields)
        try:
            response = requests.post(f"{self.api_url}/analysis", json={})
            success = response.status_code == 422  # Validation error
            self.log_test("Invalid Create Analysis (422)", success, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Invalid Create Analysis (422)", False, f"Error: {str(e)}")

    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🏌️ Starting SwingAnalyze API Comprehensive Testing")
        print("=" * 60)
        
        # Test API root
        self.test_api_root()
        
        print("\n🔍 Testing CRUD Operations...")
        
        # Create test analyses
        test_players = [
            ("John Doe", "Driver", 95.5, 140.2, 280, 8, "Great drive down the fairway"),
            ("Jane Smith", "7-Iron", 85.0, 125.5, 165, 9, "Perfect approach shot"),
            ("Mike Johnson", "Pitching Wedge", 75.2, 110.8, 95, 7, "Good short game"),
            ("John Doe", "3-Wood", 88.5, 132.1, 245, 6, "Slight fade"),
            ("Jane Smith", "Driver", 92.0, 138.5, 275, 8, "Long and straight")
        ]
        
        for player_data in test_players:
            self.test_create_analysis(*player_data)
            time.sleep(0.1)  # Small delay between requests
        
        # Test getting all analyses
        self.test_get_all_analyses()
        
        # Test filtering by player
        self.test_get_analyses_by_player("John Doe")
        self.test_get_analyses_by_player("Jane Smith")
        
        # Test getting specific analysis (if we have IDs)
        if self.created_analysis_ids:
            self.test_get_specific_analysis(self.created_analysis_ids[0])
        
        # Test getting players
        self.test_get_players()
        
        # Test player stats
        self.test_get_player_stats("John Doe")
        self.test_get_player_stats("Jane Smith")
        self.test_get_player_stats("Mike Johnson")
        
        # Test getting clubs
        self.test_get_clubs()
        
        # Test error handling
        self.test_error_handling()
        
        # Test delete functionality (delete one analysis)
        if self.created_analysis_ids:
            self.test_delete_analysis(self.created_analysis_ids[-1])
        
        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed! API is working correctly.")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed. Please check the issues above.")
            return 1

def main():
    tester = SwingAnalyzeAPITester()
    return tester.run_comprehensive_test()

if __name__ == "__main__":
    sys.exit(main())