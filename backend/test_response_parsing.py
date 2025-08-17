#!/usr/bin/env python3
"""
Test script to verify Walrus response parsing
"""

# Mock response similar to what Walrus returns
mock_response = [{
    'blobStoreResult': {
        'newlyCreated': {
            'blobObject': {
                'id': '0x1059f6220542f2b6934720d3112052e320dd023a99381f10891acf5cf90d6508',
                'registeredEpoch': 136,
                'blobId': '8SXH-ebc2NN_HhlOHb6934720d3112052e320dd023a99381f10891acf5cf90d6508',
                'size': 7967084,
                'encodingType': 'RS2',
                'certifiedEpoch': None,
                'storage': {
                    'id': '0x955c43c51c152aa4da6d034f5c08268b80641aace5ae6f76b461d065aa30f940',
                    'startEpoch': 136,
                    'endEpoch': 166,
                    'storageSize': 100068000
                },
                'deletable': False
            },
            'resourceOperation': {
                'registerFromScratch': {
                    'encodedLength': 100068000,
                    'epochsAhead': 30
                }
            },
            'cost': 434400000
        }
    },
    'path': '/tmp/tmp1g0obxkb_floating_line.glb'
}]

def test_response_parsing():
    """Test the response parsing logic"""
    
    print("Testing Walrus response parsing...")
    
    # Test the nested structure parsing
    if isinstance(mock_response, list) and len(mock_response) > 0:
        first_result = mock_response[0]
        if 'blobStoreResult' in first_result:
            blob_result = first_result['blobStoreResult']
            if 'newlyCreated' in blob_result:
                newly_created = blob_result['newlyCreated']
                if 'blobObject' in newly_created:
                    blob_object = newly_created['blobObject']
                    if 'blobId' in blob_object:
                        blob_id = blob_object['blobId']
                        print(f"✅ Found blobId: {blob_id}")
                        return blob_id
    
    # Fallback: try to find blobId at any level
    def find_blob_id(obj):
        if isinstance(obj, dict):
            if 'blobId' in obj:
                return obj['blobId']
            for value in obj.values():
                result = find_blob_id(value)
                if result:
                    return result
        elif isinstance(obj, list):
            for item in obj:
                result = find_blob_id(item)
                if result:
                    return result
        return None
    
    blob_id = find_blob_id(mock_response)
    if blob_id:
        print(f"✅ Found blobId via fallback: {blob_id}")
        return blob_id
    
    print("❌ Failed to find blobId")
    return None

if __name__ == "__main__":
    result = test_response_parsing()
    if result:
        print(f"\n✅ Test passed! Extracted blobId: {result}")
    else:
        print("\n❌ Test failed!")
