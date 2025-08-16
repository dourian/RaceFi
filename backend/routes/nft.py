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

load_dotenv()

router = APIRouter(prefix="/nft", tags=["nft"])

# --- ENV / CHAIN CONFIG ---
RPC_URL        = os.getenv("RPC_URL")
PUBLIC_ADDRESS = os.getenv("PUBLIC_ADDRESS")
PRIVATE_KEY    = os.getenv("PRIVATE_KEY")
CHAIN_ID       = int(os.getenv("CHAIN_ID", "11155111"))
PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_API_SECRET = os.getenv("PINATA_API_SECRET")
PINATA_JWT = os.getenv("PINATA_JWT")
PINATA_BASE_URL = "https://api.pinata.cloud/pinning"

# Print environment status (without exposing private key)
print(f"NFT Module Environment Status:")
print(f"- RPC_URL: {'Set' if RPC_URL else 'NOT SET'}")
print(f"- PUBLIC_ADDRESS: {'Set' if PUBLIC_ADDRESS else 'NOT SET'}")
print(f"- PRIVATE_KEY: {'Set' if PRIVATE_KEY else 'NOT SET'}")
print(f"- CHAIN_ID: {CHAIN_ID}")
print(f"- PINATA API: {'Using JWT' if PINATA_JWT else 'Using API Key' if PINATA_API_KEY and PINATA_API_SECRET else 'NOT SET'}")

if not (RPC_URL and PUBLIC_ADDRESS and PRIVATE_KEY):
    raise RuntimeError("RPC_URL, PUBLIC_ADDRESS, and PRIVATE_KEY must be set in environment")

# Configure Web3 with timeout parameters to avoid hanging
w3 = Web3(Web3.HTTPProvider(RPC_URL, request_kwargs={'timeout': 15}))

# Helper function to get the next nonce for a transaction
def next_nonce(address):
    return w3.eth.get_transaction_count(Web3.to_checksum_address(address))

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
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GLBNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    
    // Event to make token ID easier to track
    event NFTMinted(address indexed recipient, uint256 indexed tokenId, string tokenURI);
    
    constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) Ownable(msg.sender) {}
    
    function mintNFT(address recipient, string memory tokenURI) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(recipient, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        // Emit event with all the information
        emit NFTMinted(recipient, tokenId, tokenURI);
        
        return tokenId;
    }
    
    // Helper function to get the current token ID counter
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
                "outputSelection": {"*": {"*": ["abi", "evm.bytecode"]}},
                "remappings": [
                    "@openzeppelin/=C:/Users/tongl/RaceFi/node_modules/@openzeppelin/"
                ]
            },
        },
        solc_version=SOLIDITY_VERSION,
        allow_paths=["C:/Users/tongl/RaceFi/node_modules"]
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

def upload_file_to_pinata(file_bytes, filename="file.glb"):
    """
    Upload a file to Pinata and return its ipfs:// URI
    """
    headers = {}
    if PINATA_JWT:
        headers["Authorization"] = f"Bearer {PINATA_JWT}"
    else:
        headers["pinata_api_key"] = PINATA_API_KEY
        headers["pinata_secret_api_key"] = PINATA_API_SECRET

    files = {"file": (filename, file_bytes)}
    response = requests.post(f"{PINATA_BASE_URL}/pinFileToIPFS", headers=headers, files=files)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Pinata file upload failed: {response.text}")
    ipfs_hash = response.json()["IpfsHash"]
    return f"ipfs://{ipfs_hash}"

def upload_metadata_to_pinata(name, description, file_uri, image_uri="https://coffee-top-walrus-619.mypinata.cloud/ipfs/bafybeibnf73slsl6fjskpk4bwwchu73ikr4qgkvqmckszo2ktenyhwkblm"):
    """
    Upload JSON metadata to Pinata and return its ipfs:// URI
    
    Parameters:
    - name: Name of the NFT
    - description: Description of the NFT
    - file_uri: URI to the 3D model file (GLB)
    - image_uri: Optional URI to a 2D preview image. If not provided, file_uri is used.
    """
    headers = {
        "Content-Type": "application/json",
    }
    if PINATA_JWT:
        headers["Authorization"] = f"Bearer {PINATA_JWT}"
    else:
        headers["pinata_api_key"] = PINATA_API_KEY
        headers["pinata_secret_api_key"] = PINATA_API_SECRET

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

    response = requests.post(f"{PINATA_BASE_URL}/pinJSONToIPFS", headers=headers, json=metadata)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail=f"Pinata metadata upload failed: {response.text}")
    ipfs_hash = response.json()["IpfsHash"]
    return f"ipfs://{ipfs_hash}"
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

        # 2️⃣ Upload GLB & metadata to Pinata
        file_uri = upload_file_to_pinata(glb_bytes, filename="floating_line.glb")
        token_uri = upload_metadata_to_pinata(req.name, req.description, file_uri)

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
        tx_hash, receipt = sign_send_wait(tx)
        
        # Use a more efficient approach to find the correct token ID
        token_id = None  # Start with None, will try to find the correct ID
        
        try:
            print("Checking for the correct token ID...")
            recipient_address = Web3.to_checksum_address(req.recipient)
            
            # Check token IDs 0-10 with a short timeout
            for i in range(11):  # 0 to 10
                try:
                    # Set a short timeout for each call
                    owner = contract.functions.ownerOf(i).call({"timeout": 2})
                    print(f"Token ID {i} is owned by: {owner}")
                    
                    if owner.lower() == recipient_address.lower():
                        print(f"Found matching token ID {i} owned by recipient")
                        token_id = i
                        
                        # Try to verify this is the token we just minted by checking its URI
                        try:
                            current_uri = contract.functions.tokenURI(i).call({"timeout": 2})
                            print(f"Token {i} URI: {current_uri}")
                            
                            # If this URI matches what we just set, this is definitely our token
                            if current_uri == token_uri:
                                print(f"Confirmed token ID {i} has the URI we just set")
                                break  # We found our token, stop checking
                        except Exception as uri_err:
                            print(f"Couldn't check URI for token {i}: {str(uri_err)}")
                except Exception as e:
                    if "nonexistent token" in str(e).lower():
                        print(f"Token ID {i} does not exist")
                    else:
                        print(f"Error checking token ID {i}: {str(e)}")
                    
                    # If we've already found a token owned by the recipient, stop checking
                    if token_id is not None:
                        break
                    
                    # If we get any other error on token ID 0, it might be that the contract
                    # doesn't support the ownerOf function or there's another issue
                    if i == 0:
                        print("Error on token ID 0, will default to 0 at the end if needed")
        except Exception as e:
            print(f"Error in token ID check: {str(e)}")
        
        # If we couldn't find a token ID, default to 0
        if token_id is None:
            print("Could not determine token ID, defaulting to 0")
            token_id = 0
            
        return {
            "message": f"NFT minted to {req.recipient}",
            "contract_address": contract_address,
            "token_id": token_id,
            "tx_hash": tx_hash,
            "block_number": receipt.blockNumber,
            "token_uri": token_uri,
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
