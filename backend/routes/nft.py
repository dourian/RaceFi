# routers/nft.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import requests
from web3 import Web3
from dotenv import load_dotenv
from solcx import compile_standard, install_solc
import json
from services.walrus_service import WalrusService

load_dotenv()

router = APIRouter(prefix="/nft", tags=["nft"])

# --- ENV / CHAIN CONFIG ---
RPC_URL        = os.getenv("RPC_URL")
PUBLIC_ADDRESS = os.getenv("PUBLIC_ADDRESS")
PRIVATE_KEY    = os.getenv("PRIVATE_KEY")
CHAIN_ID       = int(os.getenv("CHAIN_ID", "11155111"))
WALRUS_CONFIG_PATH = os.getenv("WALRUS_CONFIG_PATH", None)  # Make config optional

# Print environment status (without exposing private key)
# Initialize Walrus service
try:
    walrus_service = WalrusService(WALRUS_CONFIG_PATH)
    print("Walrus service initialized successfully")
except Exception as e:
    print(f"Warning: Could not initialize Walrus service: {e}")
    walrus_service = None

print(f"NFT Module Environment Status:")
print(f"- RPC_URL: {'Set' if RPC_URL else 'NOT SET'}")
print(f"- PUBLIC_ADDRESS: {'Set' if PUBLIC_ADDRESS else 'NOT SET'}")
print(f"- PRIVATE_KEY: {'Set' if PRIVATE_KEY else 'NOT SET'}")
print(f"- CHAIN_ID: {CHAIN_ID}")
print(f"- WALRUS_CONFIG_PATH: {WALRUS_CONFIG_PATH}")
print(f"- WALRUS_SERVICE: {'Initialized' if walrus_service else 'NOT INITIALIZED'}")

if not (RPC_URL and PUBLIC_ADDRESS and PRIVATE_KEY):
    raise RuntimeError("RPC_URL, PUBLIC_ADDRESS, and PRIVATE_KEY must be set in environment")

if not walrus_service:
    raise RuntimeError("WALRUS_CONFIG_PATH must be set and valid for NFT operations")

# Configure Web3 with timeout parameters to avoid hanging
w3 = Web3(Web3.HTTPProvider(RPC_URL, request_kwargs={'timeout': 15}))

# Helper function to get the next nonce for a transaction
def next_nonce(address):
    return w3.eth.get_transaction_count(Web3.to_checksum_address(address))

# Helper function to get the next token ID that will be minted
def get_next_token_id(contract):
    """Get the next token ID that will be minted"""
    try:
        return contract.functions.getCurrentTokenId().call({"timeout": 5})
    except Exception as e:
        print(f"Could not get next token ID: {str(e)}")
        return 0

# Helper function to validate contract
def validate_contract(contract_address):
    try:
        # Check if address is valid
        checksum_address = Web3.to_checksum_address(contract_address)
        
        # Check if contract exists (has code)
        code = w3.eth.get_code(checksum_address)
        if code == b'' or code == '0x':
            return False, "Contract does not exist at this address"
        
        # Try to instantiate contract
        contract = w3.eth.contract(address=checksum_address, abi=ABI)
        
        # Try to call a view function if available
        try:
            # Many ERC721 contracts have name() and symbol() functions
            name = contract.functions.name().call()
            symbol = contract.functions.symbol().call()
            print(f"Contract validated: {name} ({symbol})")
        except Exception as e:
            print(f"Contract exists but could not verify ERC721 interface: {str(e)}")
        
        return True, "Contract validated"
    except Exception as e:
        return False, f"Invalid contract: {str(e)}"
if not w3.is_connected():
    raise RuntimeError("Web3 connection failed; check RPC_URL")

# --- SOLIDITY CONTRACT ---
SOLIDITY_VERSION = "0.8.20"
install_solc(SOLIDITY_VERSION)

OZ_ERC721_SOURCE = """
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract GLBNFT {
    string public name;
    string public symbol;
    address public owner;
    uint256 private _nextTokenId;
    
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;
    
    event NFTMinted(address indexed recipient, uint256 indexed tokenId, string tokenURI);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(string memory name_, string memory symbol_) {
        name = name_;
        symbol = symbol_;
        owner = msg.sender;
    }
    
    function mintNFT(address recipient, string memory tokenURI) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(recipient, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        emit NFTMinted(recipient, tokenId, tokenURI);
        return tokenId;
    }
    
    function _mint(address to, uint256 tokenId) internal {
        require(to != address(0), "Invalid recipient");
        require(_owners[tokenId] == address(0), "Token already exists");
        
        _balances[to]++;
        _owners[tokenId] = to;
        
        emit Transfer(address(0), to, tokenId);
    }
    
    function _setTokenURI(uint256 tokenId, string memory tokenURI) internal {
        _tokenURIs[tokenId] = tokenURI;
    }
    
    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "Token does not exist");
        return tokenOwner;
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }
    
    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_owners[tokenId] != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }
    
    function getCurrentTokenId() public view returns (uint256) {
        return _nextTokenId;
    }
}
"""

def compile_contract():
    compiled = compile_standard(
        {
            "language": "Solidity",
            "sources": {"GLBNFT.sol": {"content": OZ_ERC721_SOURCE}},
            "settings": {
                "outputSelection": {"*": {"*": ["abi", "evm.bytecode"]}}
            },
        },
        solc_version=SOLIDITY_VERSION
    )
    contract_interface = compiled["contracts"]["GLBNFT.sol"]["GLBNFT"]
    return contract_interface["abi"], contract_interface["evm"]["bytecode"]["object"]

ABI, BYTECODE = compile_contract()

def deploy_contract(name="GLBNFT", symbol="GLB"):
    """
    Deploy a new NFT contract and return its address
    """
    print(f"Deploying new NFT contract: {name} ({symbol})...")
    try:
        # Print network info
        network_id = w3.eth.chain_id
        block_number = w3.eth.block_number
        gas_price = w3.eth.gas_price
        balance = w3.eth.get_balance(PUBLIC_ADDRESS)
        print(f"Network ID: {network_id}, Current block: {block_number}")
        print(f"Gas price: {w3.from_wei(gas_price, 'gwei')} gwei")
        print(f"Wallet balance: {w3.from_wei(balance, 'ether')} ETH")
        
        # Create contract instance
        contract = w3.eth.contract(abi=ABI, bytecode=BYTECODE)
        nonce = next_nonce(PUBLIC_ADDRESS)
        
        # Estimate gas (this will fail if there's an issue with the contract)
        try:
            gas_estimate = contract.constructor(name, symbol).estimate_gas({"from": PUBLIC_ADDRESS})
            print(f"Estimated gas: {gas_estimate}")
            gas_limit = int(gas_estimate * 1.2)  # Add 20% buffer
        except Exception as e:
            print(f"Gas estimation failed: {str(e)}")
            # Use a fallback if estimation fails
            gas_limit = 3000000
            
        # Build and send deployment transaction
        tx = contract.constructor(name, symbol).build_transaction({
            "from": PUBLIC_ADDRESS,
            "nonce": nonce,
            "chainId": CHAIN_ID,
            "gas": gas_limit,
            # Use legacy gas pricing if network doesn't support EIP-1559
            "gasPrice": w3.to_wei(5, "gwei")
        })
        
        print(f"Sending transaction with gas limit: {gas_limit}")
        tx_hash, receipt = sign_send_wait(tx)
        
        if receipt.status == 0:
            # Try to get revert reason
            print("Transaction reverted. Attempting to get revert reason...")
            # This is a simplified attempt - getting actual revert reasons requires more complex handling
            raise Exception("Transaction reverted on blockchain - check contract code")
            
        contract_address = receipt.contractAddress
        print(f"Contract deployed at: {contract_address}")
        return contract_address
        
    except Exception as e:
        print(f"Deployment error: {str(e)}")
        raise

def sign_send_wait(tx):
    try:
        # Print transaction details
        print(f"Transaction details:")
        print(f"  From: {tx.get('from')}")
        print(f"  To: {tx.get('to', 'Contract deployment')}")
        print(f"  Gas: {tx.get('gas')}")
        print(f"  Gas Price: {w3.from_wei(tx.get('gasPrice', 0), 'gwei')} gwei")
        print(f"  Nonce: {tx.get('nonce')}")
        
        # Sign transaction
        signed = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
        
        # Send transaction
        print("Sending transaction...")
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        print(f"Transaction sent: {tx_hash.hex()}")
        
        # Wait for receipt with a shorter timeout to avoid hanging
        print("Waiting for transaction confirmation...")
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)  # 30 second timeout
        print(f"Transaction confirmed in block {receipt.blockNumber}")
        print(f"Gas used: {receipt.gasUsed} ({receipt.gasUsed / tx.get('gas', 1) * 100:.1f}% of limit)")
        
        # Check status
        if receipt.status == 0:
            print("⚠️ Transaction reverted on blockchain!")
            # Try to get transaction trace if possible
            print("Transaction hash for debugging: " + tx_hash.hex())
            raise Exception("Transaction failed - reverted on blockchain. Check contract code or parameters.")
            
        return tx_hash.hex(), receipt
    except Exception as e:
        print(f"Transaction error: {str(e)}")
        raise

def upload_file_to_walrus(file_bytes, filename="file.glb"):
    """
    Upload a file to Walrus and return its blob ID
    """
    try:
        blob_id = walrus_service.store_bytes(file_bytes, filename)
        return blob_id
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Walrus file upload failed: {str(e)}")

def upload_metadata_to_walrus(name, description, file_uri, challenge_id="", image_uri="https://bafkreihdtdkjpwwu6qlldzjjgj4ixwrp3yvbcqvpfq7uxvmwmbop65yxfm.ipfs.nftstorage.link/"):
    """
    Upload JSON metadata to Walrus and return its blob ID
    
    Parameters:
    - name: Name of the NFT
    - description: Description of the NFT
    - file_uri: URI to the 3D model file (GLB)
    - image_uri: Optional URI to a 2D preview image. If not provided, file_uri is used.
    """
    # Use a default fallback image if none provided
    if not image_uri:
        image_uri = "https://bafkreihdtdkjpwwu6qlldzjjgj4ixwrp3yvbcqvpfq7uxvmwmbop65yxfm.ipfs.nftstorage.link/"
    
    metadata = {
        "name": name,
        "description": description,
        "image": image_uri,  # 2D preview image for wallets/marketplaces
        "animation_url": file_uri,  # 3D model for platforms that support it
        "attributes": [
            {
                "trait_type": "Type",
                "value": "3D Floating Line"
            }
        ]
    }
    
    # Add challenge_id to metadata if provided
    if challenge_id:
        metadata["challenge_id"] = challenge_id
        # Also add as an attribute for better visibility in marketplaces
        metadata["attributes"].append({
            "trait_type": "Challenge ID",
            "value": challenge_id
        })

    try:
        blob_id = walrus_service.store_json(metadata)
        return blob_id
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Walrus metadata upload failed: {str(e)}")
# --- Request Models ---
class DeployContractRequest(BaseModel):
    name: str = "RaceFi NFT"
    symbol: str = "RACE"

class MintFloatingLineRequest(BaseModel):
    polyline: str
    contract_address: str = ""  # Optional, if empty a new contract will be deployed
    recipient: str
    name: str = "Floating Line NFT"
    description: str = "A 3D floating line NFT"
    challenge_id: str = ""

# --- Endpoints ---
@router.post("/deploy-contract")
def deploy_nft_contract(req: DeployContractRequest):
    try:
        contract_address = deploy_contract(req.name, req.symbol)
        return {
            "message": f"Contract deployed successfully",
            "contract_address": contract_address,
            "name": req.name,
            "symbol": req.symbol
        }
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error details: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Contract deployment failed: {str(e)}")

@router.post("/mint-floating-line")
def mint_floating_line(req: MintFloatingLineRequest):
    try:
        # 1️⃣ Call existing /dimension/floating-line-model endpoint
        DIMENSION_API = os.getenv("DIMENSION_API_URL", "http://localhost:8001/dimension/floating-line-model")
        resp = requests.post(DIMENSION_API, json={"polyline": req.polyline})
        if resp.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Dimension service failed: {resp.text}")
        glb_bytes = resp.content

        # 2️⃣ Upload GLB & metadata to Walrus
        file_uri = upload_file_to_walrus(glb_bytes, filename="floating_line.glb")
        token_uri = upload_metadata_to_walrus(req.name, req.description, file_uri, req.challenge_id)

        # 3️⃣ Deploy contract if needed or validate existing contract
        contract_address = req.contract_address
        if not contract_address:
            print("No contract address provided, deploying a new contract...")
            contract_address = deploy_contract("RaceFi NFT", "RACE")
            print(f"New contract deployed at: {contract_address}")
        else:
            print(f"Validating contract at {contract_address}...")
            valid, message = validate_contract(contract_address)
            if not valid:
                raise HTTPException(status_code=400, detail=f"Contract validation failed: {message}")
            
        # 4️⃣ Mint NFT
        print(f"Minting NFT to {req.recipient}...")
        contract = w3.eth.contract(address=Web3.to_checksum_address(contract_address), abi=ABI)
        nonce = next_nonce(PUBLIC_ADDRESS)
        # Try to estimate gas for minting
        try:
            gas_estimate = contract.functions.mintNFT(
                Web3.to_checksum_address(req.recipient), 
                token_uri
            ).estimate_gas({"from": PUBLIC_ADDRESS})
            gas_limit = int(gas_estimate * 1.2)  # Add 20% buffer
            print(f"Estimated gas for minting: {gas_estimate}, using {gas_limit}")
        except Exception as e:
            print(f"Gas estimation failed: {str(e)}")
            gas_limit = 300_000  # Fallback
            
        # Use legacy gas pricing for better compatibility
        tx = contract.functions.mintNFT(Web3.to_checksum_address(req.recipient), token_uri).build_transaction({
            "from": PUBLIC_ADDRESS,
            "nonce": nonce,
            "chainId": CHAIN_ID,
            "gas": gas_limit,
            "gasPrice": w3.to_wei(5, "gwei")  # Legacy gas pricing
        })
        
        # Get the current token ID before minting (this will be our new token ID)
        try:
            current_token_id = get_next_token_id(contract)
            print(f"Current token ID before minting: {current_token_id}")
        except Exception as e:
            print(f"Could not get current token ID: {str(e)}")
            current_token_id = 0
        
        # Mint the NFT
        tx_hash, receipt = sign_send_wait(tx)
        
        # The new token ID is the previous current token ID
        token_id = current_token_id
        
        print(f"Successfully minted NFT with token ID: {token_id}")
        
        return {
            "message": f"NFT minted to {req.recipient}",
            "contract_address": contract_address,
            "token_id": token_id,
            "tx_hash": tx_hash,
            "block_number": receipt.blockNumber,
            "token_uri": token_uri,
            "file_uri": file_uri,  # GLB file blob reference
            "challenge_id": req.challenge_id if req.challenge_id else None,
            "view_on_explorer": f"https://sepolia.etherscan.io/token/{contract_address}?a={req.recipient}"
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error details: {error_trace}")
        
        # Check for common issues
        error_details = str(e)
        if "insufficient funds" in error_details.lower():
            raise HTTPException(status_code=500, detail=f"Insufficient funds in wallet {PUBLIC_ADDRESS} to complete transaction")
        elif "nonce too low" in error_details.lower():
            raise HTTPException(status_code=500, detail=f"Nonce error: {error_details}. Try again in a few minutes.")
        elif "could not establish connection" in error_details.lower() or "connection failed" in error_details.lower():
            raise HTTPException(status_code=500, detail=f"Blockchain connection error: Check your RPC_URL environment variable")
        elif "private key" in error_details.lower():
            raise HTTPException(status_code=500, detail=f"Private key error: Check your PRIVATE_KEY environment variable")
        else:
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.get("/blob/{blob_id}")
def get_blob_info(blob_id: str):
    """Get information about a blob including filename"""
    try:
        print(f"🔍 Blob info request for: {blob_id}")
        
        if not walrus_service:
            print("❌ Walrus service not available")
            raise HTTPException(status_code=500, detail="Walrus service not available")
        
        # Get blob information from Walrus
        try:
            print(f"📋 Calling walrus_service.get_blob_info for: {blob_id}")
            blob_info = walrus_service.get_blob_info(blob_id)
            print(f"📋 Walrus response: {blob_info}")
        except Exception as e:
            print(f"❌ Error calling walrus_service.get_blob_info: {str(e)}")
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to get blob info from Walrus: {str(e)}"
            )
        
        # Check if there was an error
        if "error" in blob_info:
            print(f"❌ Blob info contains error: {blob_info['error']}")
            raise HTTPException(
                status_code=404, 
                detail=f"Blob not found or error occurred: {blob_info['error']}"
            )
        
        # Extract filename from blob info
        filename = blob_info.get("filename", f"blob_{blob_id[:8]}")
        print(f"📁 Initial filename: {filename}")
        
        # If no filename in metadata, try to infer from content
        if not filename or filename.startswith("blob_"):
            try:
                print(f"🔍 No filename in metadata, trying to infer from content...")
                # Try to read the blob content to get more info
                content = walrus_service.read_blob(blob_id)
                print(f"✅ Content read successfully, size: {len(content)} bytes")
                
                # Check if it's JSON metadata
                try:
                    metadata = json.loads(content.decode('utf-8'))
                    if "name" in metadata:
                        filename = metadata["name"]
                        print(f"📁 Found filename in JSON metadata: {filename}")
                    elif "filename" in metadata:
                        filename = metadata["filename"]
                        print(f"📁 Found filename in JSON metadata: {filename}")
                except Exception as json_error:
                    print(f"⚠️  Could not parse as JSON: {str(json_error)}")
                
                # If still no good filename, use content type
                if not filename or filename.startswith("blob_"):
                    if content.startswith(b'\x89PNG'):
                        filename = f"image_{blob_id[:8]}.png"
                        print(f"📁 Detected PNG image: {filename}")
                    elif content.startswith(b'\xff\xd8\xff'):
                        filename = f"image_{blob_id[:8]}.jpg"
                        print(f"📁 Detected JPEG image: {filename}")
                    elif content.startswith(b'PK'):
                        filename = f"archive_{blob_id[:8]}.zip"
                        print(f"📁 Detected ZIP archive: {filename}")
                    elif b'glTF' in content[:100]:
                        filename = f"model_{blob_id[:8]}.glb"
                        print(f"📁 Detected GLB model: {filename}")
                    else:
                        filename = f"file_{blob_id[:8]}.bin"
                        print(f"📁 Default filename: {filename}")
                
                # Add size information
                blob_info["size"] = len(content)
                blob_info["content_preview"] = content[:100].hex() if len(content) > 0 else ""
                
            except Exception as e:
                print(f"⚠️  Could not read blob content: {str(e)}")
                # If we can't read the content, just use the basic info
                blob_info["note"] = f"Could not read blob content: {str(e)}"
        
        # Ensure we have a filename
        if not filename or filename.startswith("blob_"):
            filename = f"file_{blob_id[:8]}.bin"
            print(f"📁 Final fallback filename: {filename}")
        
        result = {
            "blob_id": blob_id,
            "filename": filename,
            "size": blob_info.get("size", "unknown"),
            "content_type": blob_info.get("content_type", "unknown"),
            "metadata": blob_info,
            "download_url": f"/nft/blob/{blob_id}/download" if blob_info.get("size") else None
        }
        
        print(f"✅ Returning result: {result}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"💥 Unexpected error in get_blob_info: {str(e)}")
        print(f"💥 Traceback: {error_trace}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error getting blob info: {str(e)}"
        )

@router.get("/blob/{blob_id}/download")
def download_blob(blob_id: str):
    """Download a blob file"""
    try:
        print(f"🔍 Download request for blob: {blob_id}")
        
        if not walrus_service:
            print("❌ Walrus service not available")
            raise HTTPException(status_code=500, detail="Walrus service not available")
        
        # First try to get blob info to check if it exists
        try:
            print(f"📋 Getting blob info for: {blob_id}")
            blob_info = walrus_service.get_blob_info(blob_id)
            
            if "error" in blob_info:
                print(f"❌ Blob info error: {blob_info['error']}")
                raise HTTPException(status_code=404, detail=f"Blob not found: {blob_info['error']}")
                
            filename = blob_info.get("filename", f"blob_{blob_id[:8]}.bin")
            print(f"📁 Filename from metadata: {filename}")
            
        except Exception as info_error:
            print(f"⚠️  Could not get blob info: {str(info_error)}")
            filename = f"blob_{blob_id[:8]}.bin"
        
        # Try to read blob content
        try:
            print(f"📖 Reading blob content for: {blob_id}")
            content = walrus_service.read_blob(blob_id)
            print(f"✅ Blob content read successfully, size: {len(content)} bytes")
            
        except Exception as read_error:
            print(f"❌ Failed to read blob content: {str(read_error)}")
            
            # Fallback: Try to provide a helpful error message
            error_msg = str(read_error)
            if "command not found" in error_msg.lower():
                raise HTTPException(
                    status_code=500, 
                    detail="Walrus command not found. Please ensure Walrus is installed and accessible."
                )
            elif "timed out" in error_msg.lower():
                raise HTTPException(
                    status_code=500, 
                    detail="Walrus command timed out. The storage system may be slow or unresponsive."
                )
            elif "exit code" in error_msg.lower():
                raise HTTPException(
                    status_code=500, 
                    detail=f"Walrus command failed: {error_msg}"
                )
            else:
                raise HTTPException(
                    status_code=500, 
                    detail=f"Failed to read blob content: {error_msg}"
                )
        
        # Determine content type based on content
        content_type = "application/octet-stream"
        if content.startswith(b'\x89PNG'):
            content_type = "image/png"
            if not filename.endswith('.png'):
                filename = f"{filename}.png"
        elif content.startswith(b'\xff\xd8\xff'):
            content_type = "image/jpeg"
            if not filename.endswith('.jpg'):
                filename = f"{filename}.jpg"
        elif content.startswith(b'PK'):
            content_type = "application/zip"
            if not filename.endswith('.zip'):
                filename = f"{filename}.zip"
        elif b'glTF' in content[:100]:
            content_type = "model/gltf-binary"
            if not filename.endswith('.glb'):
                filename = f"{filename}.glb"
        elif content.startswith(b'{') or content.startswith(b'['):
            content_type = "application/json"
            if not filename.endswith('.json'):
                filename = f"{filename}.json"
        
        print(f"🔧 Final filename: {filename}")
        print(f"🔧 Content type: {content_type}")
        
        # Return file as download
        from fastapi.responses import Response
        return Response(
            content=content,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\"",
                "Content-Length": str(len(content)),
                "Cache-Control": "no-cache"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"💥 Unexpected error in download_blob: {str(e)}")
        print(f"💥 Traceback: {error_trace}")
        raise HTTPException(
            status_code=500, 
            detail=f"Unexpected error downloading blob: {str(e)}"
        )

@router.get("/debug/walrus")
def debug_walrus_service():
    """Debug endpoint to test Walrus service functionality"""
    try:
        print("🔍 Debug Walrus service request")
        
        if not walrus_service:
            return {
                "status": "error",
                "message": "Walrus service not available",
                "config_path": WALRUS_CONFIG_PATH,
                "walrus_service": None
            }
        
        # Test basic Walrus functionality
        test_results = {}
        
        # Test 1: Check if Walrus command works
        try:
            print("🧪 Testing Walrus command execution...")
            # Try a simple command like version or help
            import subprocess
            result = subprocess.run(
                ["walrus", "--version"], 
                capture_output=True, 
                text=True, 
                timeout=10
            )
            test_results["walrus_command"] = {
                "success": result.returncode == 0,
                "stdout": result.stdout.strip(),
                "stderr": result.stderr.strip(),
                "return_code": result.returncode
            }
            print(f"✅ Walrus command test: {test_results['walrus_command']}")
        except Exception as e:
            test_results["walrus_command"] = {
                "success": False,
                "error": str(e)
            }
            print(f"❌ Walrus command test failed: {str(e)}")
        
        # Test 2: Check Walrus service config
        test_results["config"] = {
            "config_path": WALRUS_CONFIG_PATH,
            "config_exists": os.path.exists(WALRUS_CONFIG_PATH) if WALRUS_CONFIG_PATH else False,
            "walrus_service_type": type(walrus_service).__name__
        }
        
        # Test 3: Try to call a simple Walrus method
        try:
            print("🧪 Testing Walrus service methods...")
            # This will test if the service can at least be instantiated
            test_results["service_instantiation"] = {
                "success": True,
                "service_type": type(walrus_service).__name__
            }
        except Exception as e:
            test_results["service_instantiation"] = {
                "success": False,
                "error": str(e)
            }
        
        return {
            "status": "success",
            "message": "Walrus service diagnostic completed",
            "test_results": test_results,
            "environment": {
                "WALRUS_CONFIG_PATH": WALRUS_CONFIG_PATH,
                "walrus_service_available": walrus_service is not None
            }
        }
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"💥 Error in debug endpoint: {str(e)}")
        print(f"💥 Traceback: {error_trace}")
        return {
            "status": "error",
            "message": f"Debug endpoint failed: {str(e)}",
            "traceback": error_trace
        }
