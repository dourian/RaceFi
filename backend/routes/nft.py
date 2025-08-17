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

# Environment and chain configuration
RPC_URL        = os.getenv("RPC_URL")
PUBLIC_ADDRESS = os.getenv("PUBLIC_ADDRESS")
PRIVATE_KEY    = os.getenv("PRIVATE_KEY")
CHAIN_ID       = int(os.getenv("CHAIN_ID", "11155111"))
WALRUS_CONFIG_PATH = os.getenv("WALRUS_CONFIG_PATH", None)

try:
    walrus_service = WalrusService(WALRUS_CONFIG_PATH)
    print("Walrus service initialized")
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

w3 = Web3(Web3.HTTPProvider(RPC_URL, request_kwargs={'timeout': 15}))

def next_nonce(address):
    return w3.eth.get_transaction_count(Web3.to_checksum_address(address))

def get_next_token_id(contract):
    try:
        return contract.functions.getCurrentTokenId().call({"timeout": 5})
    except Exception as e:
        print(f"Could not get next token ID: {str(e)}")
        return 0

def validate_contract(contract_address):
    try:
        checksum_address = Web3.to_checksum_address(contract_address)
        
        code = w3.eth.get_code(checksum_address)
        if code == b'' or code == '0x':
            return False, "Contract does not exist at this address"
        
        contract = w3.eth.contract(address=checksum_address, abi=ABI)
        
        try:
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

# Solidity contract
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
    print(f"Deploying new NFT contract: {name} ({symbol})...")
    try:
        network_id = w3.eth.chain_id
        block_number = w3.eth.block_number
        gas_price = w3.eth.gas_price
        balance = w3.eth.get_balance(PUBLIC_ADDRESS)
        print(f"Network ID: {network_id}, Current block: {block_number}")
        print(f"Gas price: {w3.from_wei(gas_price, 'gwei')} gwei")
        print(f"Wallet balance: {w3.from_wei(balance, 'ether')} ETH")
        
        contract = w3.eth.contract(abi=ABI, bytecode=BYTECODE)
        nonce = next_nonce(PUBLIC_ADDRESS)
        
        try:
            gas_estimate = contract.constructor(name, symbol).estimate_gas({"from": PUBLIC_ADDRESS})
            print(f"Estimated gas: {gas_estimate}")
            gas_limit = int(gas_estimate * 1.2)
        except Exception as e:
            print(f"Gas estimation failed: {str(e)}")
            gas_limit = 3000000
            
        tx = contract.constructor(name, symbol).build_transaction({
            "from": PUBLIC_ADDRESS,
            "nonce": nonce,
            "chainId": CHAIN_ID,
            "gas": gas_limit,
            "gasPrice": w3.to_wei(5, "gwei")
        })
        
        print(f"Sending transaction with gas limit: {gas_limit}")
        tx_hash, receipt = sign_send_wait(tx)
        
        if receipt.status == 0:
            raise Exception("Transaction reverted on blockchain - check contract code")
            
        contract_address = receipt.contractAddress
        print(f"Contract deployed at: {contract_address}")
        return contract_address
        
    except Exception as e:
        print(f"Deployment error: {str(e)}")
        raise

def sign_send_wait(tx):
    try:
        print(f"Transaction details:")
        print(f"  From: {tx.get('from')}")
        print(f"  To: {tx.get('to', 'Contract deployment')}")
        print(f"  Gas: {tx.get('gas')}")
        print(f"  Gas Price: {w3.from_wei(tx.get('gasPrice', 0), 'gwei')} gwei")
        print(f"  Nonce: {tx.get('nonce')}")
        
        signed = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
        
        print("Sending transaction...")
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        print(f"Transaction sent: {tx_hash.hex()}")
        
        print("Waiting for transaction confirmation...")
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
        print(f"Transaction confirmed in block {receipt.blockNumber}")
        print(f"Gas used: {receipt.gasUsed} ({receipt.gasUsed / tx.get('gas', 1) * 100:.1f}% of limit)")
        
        if receipt.status == 0:
            print("⚠️ Transaction reverted on blockchain!")
            raise Exception("Transaction failed - reverted on blockchain. Check contract code or parameters.")
            
        return tx_hash.hex(), receipt
    except Exception as e:
        print(f"Transaction error: {str(e)}")
        raise

def upload_file_to_walrus(file_bytes, filename="file.glb"):
    try:
        blob_id = walrus_service.store_bytes(file_bytes, filename)
        return blob_id
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Walrus file upload failed: {str(e)}")

def upload_metadata_to_walrus(name, description, file_uri, challenge_id="", image_uri="https://bafkreihdtdkjpwwu6qlldzjjgj4ixwrp3yvbcqvpfq7uxvmwmbop65yxfm.ipfs.nftstorage.link/"):
    if not image_uri:
        image_uri = "https://bafkreihdtdkjpwwu6qlldzjjgj4ixwrp3yvbcqvpfq7uxvmwmbop65yxfm.ipfs.nftstorage.link/"
    
    metadata = {
        "name": name,
        "description": description,
        "image": image_uri,
        "animation_url": file_uri,
        "attributes": [
            {
                "trait_type": "Type",
                "value": "3D Floating Line"
            }
        ]
    }
    
    if challenge_id:
        metadata["challenge_id"] = challenge_id
        metadata["attributes"].append({
            "trait_type": "Challenge ID",
            "value": challenge_id
        })

    try:
        blob_id = walrus_service.store_json(metadata)
        return blob_id
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Walrus metadata upload failed: {str(e)}")

# Request Models
class DeployContractRequest(BaseModel):
    name: str = "RaceFi NFT"
    symbol: str = "RACE"

class MintFloatingLineRequest(BaseModel):
    polyline: str
    recipient: str
    contract_address: str = "0x02f07A7DDAb530B5BF1FE4D26a297ea1CE7e85fA"
    name: str = "Floating Line NFT"
    description: str = "A 3D floating line NFT"

# Endpoints
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
        DIMENSION_API = os.getenv("DIMENSION_API_URL", "http://localhost:8001/dimension/floating-line-model")
        resp = requests.post(DIMENSION_API, json={"polyline": req.polyline})
        if resp.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Dimension service failed: {resp.text}")
        glb_bytes = resp.content

        file_uri = upload_file_to_walrus(glb_bytes, filename="floating_line.glb")
        token_uri = upload_metadata_to_walrus(req.name, req.description, file_uri, req.challenge_id)

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
            
        print(f"Minting NFT to {req.recipient}...")
        contract = w3.eth.contract(address=Web3.to_checksum_address(contract_address), abi=ABI)
        nonce = next_nonce(PUBLIC_ADDRESS)
        
        try:
            gas_estimate = contract.functions.mintNFT(
                Web3.to_checksum_address(req.recipient), 
                token_uri
            ).estimate_gas({"from": PUBLIC_ADDRESS})
            gas_limit = int(gas_estimate * 1.2)
            print(f"Estimated gas for minting: {gas_estimate}, using {gas_limit}")
        except Exception as e:
            print(f"Gas estimation failed: {str(e)}")
            gas_limit = 300_000
            
        tx = contract.functions.mintNFT(Web3.to_checksum_address(req.recipient), token_uri).build_transaction({
            "from": PUBLIC_ADDRESS,
            "nonce": nonce,
            "chainId": CHAIN_ID,
            "gas": gas_limit,
            "gasPrice": w3.to_wei(5, "gwei")
        })
        
        try:
            current_token_id = get_next_token_id(contract)
            print(f"Current token ID before minting: {current_token_id}")
        except Exception as e:
            print(f"Could not get current token ID: {str(e)}")
            current_token_id = 0
        
        tx_hash, receipt = sign_send_wait(tx)
        
        token_id = current_token_id
        
        print(f"Successfully minted NFT with token ID: {token_id}")
        
        return {
            "message": f"NFT minted to {req.recipient}",
            "contract_address": contract_address,
            "token_id": token_id,
            "tx_hash": tx_hash,
            "block_number": receipt.blockNumber,
            "token_uri": token_uri,
            "file_uri": file_uri,
            "challenge_id": req.challenge_id if req.challenge_id else None,
            "view_on_explorer": f"https://sepolia.etherscan.io/token/{contract_address}?a={req.recipient}"
        }

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error details: {error_trace}")
        
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
    try:
        print(f"Blob info request for: {blob_id}")
        
        if not walrus_service:
            print("Walrus service not available")
            raise HTTPException(status_code=500, detail="Walrus service not available")
        
        try:
            blob_info = walrus_service.get_blob_info(blob_id)
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to get blob info from Walrus: {str(e)}"
            )
        
        if "error" in blob_info:
            raise HTTPException(
                status_code=404, 
                detail=f"Blob not found or error occurred: {blob_info['error']}"
            )
        
        filename = blob_info.get("filename", f"blob_{blob_id[:8]}")
        
        if not filename or filename.startswith("blob_"):
            try:
                content = walrus_service.read_blob(blob_id)
                
                try:
                    metadata = json.loads(content.decode('utf-8'))
                    if "name" in metadata:
                        filename = metadata["name"]
                    elif "filename" in metadata:
                        filename = metadata["filename"]
                except Exception as json_error:
                    pass
                
                if not filename or filename.startswith("blob_"):
                    if content.startswith(b'\x89PNG'):
                        filename = f"image_{blob_id[:8]}.png"
                    elif content.startswith(b'\xff\xd8\xff'):
                        filename = f"image_{blob_id[:8]}.jpg"
                    elif content.startswith(b'PK'):
                        filename = f"archive_{blob_id[:8]}.zip"
                    elif b'glTF' in content[:100]:
                        filename = f"model_{blob_id[:8]}.glb"
                    else:
                        filename = f"file_{blob_id[:8]}.bin"
                
                blob_info["size"] = len(content)
                blob_info["content_preview"] = content[:100].hex() if len(content) > 0 else ""
                
            except Exception as e:
                blob_info["note"] = f"Could not read blob content: {str(e)}"
        
        if not filename or filename.startswith("blob_"):
            filename = f"file_{blob_id[:8]}.bin"
        
        result = {
            "blob_id": blob_id,
            "filename": filename,
            "size": blob_info.get("size", "unknown"),
            "content_type": blob_info.get("content_type", "unknown"),
            "metadata": blob_info,
            "download_url": f"/nft/blob/{blob_id}/download" if blob_info.get("size") else None
        }
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Unexpected error in get_blob_info: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error getting blob info: {str(e)}"
        )

@router.get("/blob/{blob_id}/download")
def download_blob(blob_id: str):
    try:
        print(f"Download request for blob: {blob_id}")
        
        if not walrus_service:
            print("Walrus service not available")
            raise HTTPException(status_code=500, detail="Walrus service not available")
        
        try:
            blob_info = walrus_service.get_blob_info(blob_id)
            
            if "error" in blob_info:
                raise HTTPException(status_code=404, detail=f"Blob not found: {blob_info['error']}")
                
            filename = blob_info.get("filename", f"blob_{blob_id[:8]}.bin")
            
        except Exception as info_error:
            filename = f"blob_{blob_id[:8]}.bin"
        
        try:
            content = walrus_service.read_blob(blob_id)
            
        except Exception as read_error:
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
        print(f"Unexpected error in download_blob: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Unexpected error downloading blob: {str(e)}"
        )

@router.get("/debug/walrus")
def debug_walrus_service():
    try:
        print("Debug Walrus service request")
        
        if not walrus_service:
            return {
                "status": "error",
                "message": "Walrus service not available",
                "config_path": WALRUS_CONFIG_PATH,
                "walrus_service": None
            }
        
        test_results = {}
        
        try:
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
        except Exception as e:
            test_results["walrus_command"] = {
                "success": False,
                "error": str(e)
            }
        
        test_results["config"] = {
            "config_path": WALRUS_CONFIG_PATH,
            "config_exists": os.path.exists(WALRUS_CONFIG_PATH) if WALRUS_CONFIG_PATH else False,
            "walrus_service_type": type(walrus_service).__name__
        }
        
        try:
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
        print(f"Error in debug endpoint: {str(e)}")
        return {
            "status": "error",
            "message": f"Debug endpoint failed: {str(e)}",
            "traceback": error_trace
        }
