#!/usr/bin/env python3
"""
Quick Error Handling Validation Test
Focused test to validate the backend error handling fix for invalid file uploads
"""

import requests
import tempfile
import os
import sys

class ErrorHandlingValidator:
    def __init__(self, base_url="https://swing-debug.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        
    def test_invalid_file_returns_400(self):
        """Test that invalid file uploads return 400 status code (not 500)"""
        print("🧪 Testing Invalid File Upload - Should Return 400 Status Code")
        
        # Create a text file to test rejection
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as temp_file:
            temp_file.write("This is not a video file - should be rejected with 400 status")
            temp_file_path = temp_file.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                files = {'file': ('invalid_test.txt', f, 'text/plain')}
                response = requests.post(f"{self.api_url}/upload", files=files, timeout=30)
            
            # Check status code
            if response.status_code == 400:
                print("✅ PASS: Invalid file upload correctly returns 400 status code")
                
                # Check error message
                try:
                    error_data = response.json()
                    error_message = error_data.get('detail', '')
                    if 'Unsupported file format' in error_message:
                        print("✅ PASS: Error message is clear and user-friendly")
                        print(f"   Message: {error_message}")
                    else:
                        print("⚠️  WARNING: Error message might not be clear enough")
                        print(f"   Message: {error_message}")
                except:
                    print("⚠️  WARNING: Could not parse error response as JSON")
                
                return True
                
            elif response.status_code == 500:
                print("❌ FAIL: Invalid file upload returns 500 (should be 400)")
                print(f"   Response: {response.text[:200]}")
                return False
                
            else:
                print(f"❌ FAIL: Unexpected status code {response.status_code} (expected 400)")
                print(f"   Response: {response.text[:200]}")
                return False
                
        except Exception as e:
            print(f"❌ FAIL: Exception during test: {str(e)}")
            return False
            
        finally:
            # Clean up
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    def test_valid_file_still_works(self):
        """Test that valid video uploads still work after the fix"""
        print("\n🧪 Testing Valid Video Upload - Should Still Work Normally")
        
        # Create a fake MP4 file
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_file:
            # Write MP4 file signature and some dummy data
            temp_file.write(b'\x00\x00\x00\x20ftypmp42\x00\x00\x00\x00mp42isom' + b'\x00' * 1000)
            temp_file_path = temp_file.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                files = {'file': ('valid_test.mp4', f, 'video/mp4')}
                response = requests.post(f"{self.api_url}/upload", files=files, timeout=60)
            
            if response.status_code == 200:
                print("✅ PASS: Valid video upload works correctly")
                
                try:
                    upload_data = response.json()
                    video_id = upload_data.get('id')
                    filename = upload_data.get('filename')
                    print(f"   Video ID: {video_id}")
                    print(f"   Filename: {filename}")
                    
                    # Clean up the uploaded file
                    if video_id:
                        delete_response = requests.delete(f"{self.api_url}/uploads/{video_id}", timeout=30)
                        if delete_response.status_code == 200:
                            print("   ✅ Test video cleaned up successfully")
                        else:
                            print("   ⚠️  Could not clean up test video")
                    
                except:
                    print("   ⚠️  Could not parse upload response")
                
                return True
                
            else:
                print(f"❌ FAIL: Valid video upload failed with status {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False
                
        except Exception as e:
            print(f"❌ FAIL: Exception during valid upload test: {str(e)}")
            return False
            
        finally:
            # Clean up temp file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    def run_validation(self):
        """Run the complete error handling validation"""
        print("🚀 Error Handling Validation Test")
        print("=" * 50)
        print("Focus: Validating that invalid file uploads return 400 (not 500)")
        print(f"API Endpoint: {self.api_url}")
        print("=" * 50)
        
        # Test 1: Invalid file should return 400
        test1_pass = self.test_invalid_file_returns_400()
        
        # Test 2: Valid file should still work
        test2_pass = self.test_valid_file_still_works()
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 VALIDATION RESULTS:")
        print(f"   Invalid File Returns 400: {'✅ PASS' if test1_pass else '❌ FAIL'}")
        print(f"   Valid File Still Works:   {'✅ PASS' if test2_pass else '❌ FAIL'}")
        
        if test1_pass and test2_pass:
            print("\n🎉 SUCCESS: Error handling fix is working correctly!")
            print("   - Invalid files return 400 status code with clear error message")
            print("   - Valid files still upload successfully")
            return True
        else:
            print("\n❌ FAILURE: Error handling fix needs attention")
            return False

def main():
    validator = ErrorHandlingValidator()
    success = validator.run_validation()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())