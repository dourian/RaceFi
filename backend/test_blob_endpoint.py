#!/usr/bin/env python3
"""
Test script for the new blob endpoint
Demonstrates how to get file information from a blob ID
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"  # Adjust if your server runs on a different port

def test_blob_info(blob_id):
    """Test getting blob information"""
    try:
        print(f"🔍 Getting info for blob: {blob_id}")
        
        # Call the blob info endpoint
        response = requests.get(f"{BASE_URL}/nft/blob/{blob_id}")
        
        if response.status_code == 200:
            blob_info = response.json()
            print("✅ Success!")
            print(f"📁 Filename: {blob_info['filename']}")
            print(f"📏 Size: {blob_info['size']} bytes")
            print(f"🔧 Content Type: {blob_info['content_type']}")
            print(f"🔗 Download URL: {blob_info['download_url']}")
            
            # Show metadata if available
            if 'metadata' in blob_info:
                print(f"📋 Metadata: {json.dumps(blob_info['metadata'], indent=2)}")
                
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"📝 Response: {response.text}")
            
    except Exception as e:
        print(f"💥 Exception: {str(e)}")

def test_blob_download(blob_id):
    """Test downloading a blob"""
    try:
        print(f"⬇️  Testing download for blob: {blob_id}")
        
        # Call the download endpoint
        response = requests.get(f"{BASE_URL}/nft/blob/{blob_id}/download")
        
        if response.status_code == 200:
            print("✅ Download successful!")
            print(f"📏 Content length: {len(response.content)} bytes")
            print(f"📋 Headers: {dict(response.headers)}")
            
            # Save to a test file
            filename = f"test_download_{blob_id[:8]}.bin"
            with open(filename, 'wb') as f:
                f.write(response.content)
            print(f"💾 Saved to: {filename}")
            
        else:
            print(f"❌ Download failed: {response.status_code}")
            print(f"📝 Response: {response.text}")
            
    except Exception as e:
        print(f"💥 Exception: {str(e)}")

def main():
    """Main test function"""
    print("🚀 Testing Blob Endpoint")
    print("=" * 50)
    
    # Test with a sample blob ID (replace with a real one from your system)
    sample_blob_id = "your_blob_id_here"
    
    if sample_blob_id == "your_blob_id_here":
        print("⚠️  Please replace 'your_blob_id_here' with a real blob ID from your system")
        print("💡 You can get blob IDs from:")
        print("   - NFT minting responses")
        print("   - Walrus storage operations")
        print("   - Existing NFT metadata")
        return
    
    print(f"🧪 Testing with blob ID: {sample_blob_id}")
    print()
    
    # Test getting blob info
    test_blob_info(sample_blob_id)
    print()
    
    # Test downloading blob
    test_blob_download(sample_blob_id)
    print()
    
    print("🏁 Test completed!")

if __name__ == "__main__":
    main()
