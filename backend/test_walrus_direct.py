#!/usr/bin/env python3
"""
Direct test of Walrus commands to debug the issue
"""

import subprocess
import json
import os

def test_walrus_basic():
    """Test basic Walrus functionality"""
    print("🧪 Testing basic Walrus functionality...")
    
    # Test 1: Check if walrus command exists
    try:
        result = subprocess.run(
            ["walrus", "--version"], 
            capture_output=True, 
            text=True, 
            timeout=10
        )
        print(f"✅ Walrus version: {result.stdout.strip()}")
        print(f"📋 Return code: {result.returncode}")
    except FileNotFoundError:
        print("❌ Walrus command not found")
        return False
    except Exception as e:
        print(f"❌ Error testing walrus: {e}")
        return False
    
    # Test 2: Try a simple walrus command
    try:
        result = subprocess.run(
            ["walrus", "help"], 
            capture_output=True, 
            text=True, 
            timeout=10
        )
        print(f"✅ Walrus help command works")
        print(f"📋 Return code: {result.returncode}")
        print(f"📋 Output length: {len(result.stdout)}")
    except Exception as e:
        print(f"❌ Walrus help command failed: {e}")
        return False
    
    return True

def test_walrus_json():
    """Test Walrus JSON mode"""
    print("\n🧪 Testing Walrus JSON mode...")
    
    # Test with a simple command
    test_command = {
        "command": {
            "help": {}
        }
    }
    
    try:
        json_command = json.dumps(test_command)
        print(f"📋 Test command: {json_command}")
        
        result = subprocess.run(
            ["walrus", "json", json_command],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        print(f"📋 Return code: {result.returncode}")
        print(f"📋 stdout length: {len(result.stdout)}")
        print(f"📋 stderr length: {len(result.stderr)}")
        
        if result.returncode == 0:
            print("✅ Walrus JSON command executed successfully")
            try:
                response = json.loads(result.stdout)
                print(f"✅ Response parsed as JSON: {type(response)}")
                return True
            except json.JSONDecodeError as e:
                print(f"❌ Failed to parse response as JSON: {e}")
                print(f"📋 Raw stdout: {result.stdout[:200]}...")
                return False
        else:
            print(f"❌ Walrus JSON command failed")
            print(f"📋 stderr: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing Walrus JSON: {e}")
        return False

def test_walrus_read():
    """Test Walrus read command with the specific blob ID"""
    print("\n🧪 Testing Walrus read command...")
    
    blob_id = "8SXH-ebc2NN_HhlOHbSNa4zLwJHdOD5iej4cORBh8Jo"
    
    # Build the read command
    read_command = {
        "command": {
            "read": {
                "blobId": blob_id
            }
        }
    }
    
    # Add config if available
    config_path = os.getenv("WALRUS_CONFIG_PATH")
    if config_path:
        read_command["config"] = config_path
        print(f"📋 Using config: {config_path}")
    else:
        print("⚠️  No WALRUS_CONFIG_PATH set")
    
    try:
        json_command = json.dumps(read_command)
        print(f"📋 Read command: {json_command}")
        
        result = subprocess.run(
            ["walrus", "json", json_command],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        print(f"📋 Return code: {result.returncode}")
        print(f"📋 stdout length: {len(result.stdout)}")
        print(f"📋 stderr length: {len(result.stderr)}")
        
        if result.returncode == 0:
            print("✅ Walrus read command executed successfully")
            try:
                response = json.loads(result.stdout)
                print(f"✅ Response parsed as JSON: {type(response)}")
                if "content" in response:
                    print(f"✅ Found content, length: {len(response['content'])}")
                else:
                    print(f"⚠️  No 'content' field in response")
                    print(f"📋 Response keys: {list(response.keys()) if isinstance(response, dict) else 'Not a dict'}")
                return True
            except json.JSONDecodeError as e:
                print(f"❌ Failed to parse response as JSON: {e}")
                print(f"📋 Raw stdout: {result.stdout[:200]}...")
                return False
        else:
            print(f"❌ Walrus read command failed")
            print(f"📋 stderr: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing Walrus read: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 Testing Walrus Commands Directly")
    print("=" * 50)
    
    # Test basic functionality
    basic_ok = test_walrus_basic()
    
    # Test JSON mode
    json_ok = test_walrus_json()
    
    # Test read command
    read_ok = test_walrus_read()
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    print(f"✅ Basic functionality: {'PASS' if basic_ok else 'FAIL'}")
    print(f"✅ JSON mode: {'PASS' if json_ok else 'FAIL'}")
    print(f"✅ Read command: {'PASS' if read_ok else 'FAIL'}")
    
    if basic_ok and json_ok and read_ok:
        print("\n🎉 All tests passed! Walrus is working correctly.")
    else:
        print("\n❌ Some tests failed. Check the output above for details.")
        
        if not basic_ok:
            print("\n💡 Troubleshooting tips:")
            print("   - Make sure 'walrus' is installed and in your PATH")
            print("   - Try running 'walrus --version' manually")
        
        if not json_ok:
            print("\n💡 JSON mode issues:")
            print("   - Check if Walrus supports JSON mode")
            print("   - Verify Walrus version compatibility")
        
        if not read_ok:
            print("\n💡 Read command issues:")
            print("   - Check if blob ID is valid")
            print("   - Verify Walrus configuration")
            print("   - Check network/storage connectivity")

if __name__ == "__main__":
    main()
