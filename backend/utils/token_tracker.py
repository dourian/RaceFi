#!/usr/bin/env python3
"""
Token ID Tracker Utility
Helps manage and track NFT token IDs without the complexity
"""

import os
import sys
import json
from web3 import Web3
from dotenv import load_dotenv

# Add the parent directory to the path so we can import from routes
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes.nft import ABI, validate_contract, get_next_token_id

load_dotenv()

class TokenTracker:
    def __init__(self, rpc_url=None):
        self.rpc_url = rpc_url or os.getenv("RPC_URL")
        if not self.rpc_url:
            raise ValueError("RPC_URL must be set in environment or passed as parameter")
        
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url, request_kwargs={'timeout': 15}))
        if not self.w3.is_connected():
            raise RuntimeError("Failed to connect to blockchain")
    
    def get_contract_info(self, contract_address):
        """Get basic contract information"""
        try:
            contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(contract_address), 
                abi=ABI
            )
            
            # Get contract details
            name = contract.functions.name().call({"timeout": 5})
            symbol = contract.functions.symbol().call({"timeout": 5})
            next_token_id = get_next_token_id(contract)
            
            return {
                "name": name,
                "symbol": symbol,
                "next_token_id": next_token_id,
                "total_supply": next_token_id
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_token_info(self, contract_address, token_id):
        """Get information about a specific token"""
        try:
            contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(contract_address), 
                abi=ABI
            )
            
            owner = contract.functions.ownerOf(token_id).call({"timeout": 5})
            token_uri = contract.functions.tokenURI(token_id).call({"timeout": 5})
            
            return {
                "token_id": token_id,
                "owner": owner,
                "token_uri": token_uri
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_owner_tokens(self, contract_address, owner_address):
        """Get all tokens owned by a specific address"""
        try:
            contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(contract_address), 
                abi=ABI
            )
            owner_address = Web3.to_checksum_address(owner_address)
            
            next_token_id = get_next_token_id(contract)
            owned_tokens = []
            
            for token_id in range(next_token_id):
                try:
                    owner = contract.functions.ownerOf(token_id).call({"timeout": 2})
                    if owner.lower() == owner_address.lower():
                        owned_tokens.append(token_id)
                except:
                    continue
            
            return {
                "owner": owner_address,
                "owned_tokens": owned_tokens,
                "total_owned": len(owned_tokens)
            }
        except Exception as e:
            return {"error": str(e)}
    
    def list_all_tokens(self, contract_address, limit=50):
        """List all tokens in the contract (up to limit)"""
        try:
            contract = self.w3.eth.contract(
                address=Web3.to_checksum_address(contract_address), 
                abi=ABI
            )
            
            next_token_id = get_next_token_id(contract)
            tokens = []
            
            # Only check up to the limit to avoid long waits
            check_range = min(next_token_id, limit)
            
            for token_id in range(check_range):
                try:
                    owner = contract.functions.ownerOf(token_id).call({"timeout": 2})
                    tokens.append({
                        "token_id": token_id,
                        "owner": owner
                    })
                except:
                    tokens.append({
                        "token_id": token_id,
                        "owner": "Error or doesn't exist"
                    })
            
            return {
                "total_tokens": next_token_id,
                "showing": len(tokens),
                "tokens": tokens
            }
        except Exception as e:
            return {"error": str(e)}

def main():
    """Command line interface for token tracking"""
    if len(sys.argv) < 3:
        print("Usage: python token_tracker.py <command> <contract_address> [options]")
        print("\nCommands:")
        print("  info <contract_address>                    - Get contract info")
        print("  token <contract_address> <token_id>        - Get token info")
        print("  owner <contract_address> <owner_address>   - Get owner's tokens")
        print("  list <contract_address> [limit]            - List all tokens")
        return
    
    command = sys.argv[1]
    contract_address = sys.argv[2]
    
    try:
        tracker = TokenTracker()
        
        if command == "info":
            info = tracker.get_contract_info(contract_address)
            print(json.dumps(info, indent=2))
            
        elif command == "token":
            if len(sys.argv) < 4:
                print("Usage: python token_tracker.py token <contract_address> <token_id>")
                return
            token_id = int(sys.argv[3])
            info = tracker.get_token_info(contract_address, token_id)
            print(json.dumps(info, indent=2))
            
        elif command == "owner":
            if len(sys.argv) < 4:
                print("Usage: python token_tracker.py owner <contract_address> <owner_address>")
                return
            owner_address = sys.argv[3]
            info = tracker.get_owner_tokens(contract_address, owner_address)
            print(json.dumps(info, indent=2))
            
        elif command == "list":
            limit = int(sys.argv[3]) if len(sys.argv) > 3 else 50
            info = tracker.list_all_tokens(contract_address, limit)
            print(json.dumps(info, indent=2))
            
        else:
            print(f"Unknown command: {command}")
            
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()
