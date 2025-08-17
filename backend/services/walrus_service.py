import json
import subprocess
import os
import yaml
from typing import Dict, Any
import tempfile

class WalrusService:
    """Service for interacting with Walrus decentralized storage using JSON mode"""
    
    def __init__(self, config_path: str = None):
        """
        Initialize Walrus service
        
        Args:
            config_path: Path to Walrus client config file
        """
        self.config_path = config_path or os.getenv("WALRUS_CONFIG_PATH")
        # Make config optional - Walrus can work without it
        
        # Load configuration for default values
        self.config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load Walrus configuration file"""
        try:
            if self.config_path and os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    return yaml.safe_load(f)
            else:
                # Try to load from backend config
                backend_config_path = os.path.join(
                    os.path.dirname(os.path.dirname(__file__)), 
                    'config', 
                    'walrus_config.yaml'
                )
                if os.path.exists(backend_config_path):
                    with open(backend_config_path, 'r') as f:
                        return yaml.safe_load(f)
        except Exception:
            pass
        return {}
    
    def _get_default_epochs(self) -> int:
        """Get default epochs from config or use safe default"""
        return self.config.get('default_epochs', 30)
    
    def _get_max_epochs(self) -> int:
        """Get maximum epochs from config or use safe default"""
        return self.config.get('max_epochs', 53)
    
    def _validate_epochs(self, epochs: int) -> int:
        """Validate and adjust epochs to be within limits"""
        max_epochs = self._get_max_epochs()
        if epochs > max_epochs:
            return max_epochs
        return epochs
    
    def _run_walrus_command(self, command_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a Walrus command using JSON mode
        
        Args:
            command_data: Command data in Walrus JSON format
            
        Returns:
            Parsed JSON response from Walrus
        """
        try:
            # Convert command to JSON string
            json_command = json.dumps(command_data)
            
            # Execute walrus json command
            result = subprocess.run(
                ["walrus", "json", json_command],
                capture_output=True,
                text=True,
                check=True
            )
            
            # Parse and return the JSON response
            return json.loads(result.stdout)
            
        except subprocess.CalledProcessError as e:
            raise Exception(f"Walrus command failed: {e.stderr}")
        except json.JSONDecodeError as e:
            raise Exception(f"Failed to parse Walrus response: {e}")
    
    def store_bytes(self, file_bytes: bytes, filename: str = "file.bin", epochs: int = None) -> str:
        """
        Store bytes data using Walrus
        
        Args:
            file_bytes: Bytes data to store
            filename: Name for the file
            epochs: Number of epochs to store for (defaults to config value)
            
        Returns:
            Blob ID of the stored file
        """
        if epochs is None:
            epochs = self._get_default_epochs()
        
        epochs = self._validate_epochs(epochs)
        
        # Create temporary file with the bytes data
        with tempfile.NamedTemporaryFile(mode='wb', suffix=f"_{filename}", delete=False) as temp_file:
            temp_file.write(file_bytes)
            temp_file_path = temp_file.name
        
        try:
            # Store the temporary file
            blob_id = self.store_files([temp_file_path], epochs)
            return blob_id
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
    
    def store_files(self, files: list, epochs: int = None) -> str:
        """
        Store files using Walrus
        
        Args:
            files: List of file paths to store
            epochs: Number of epochs to store the files for (defaults to config value)
            
        Returns:
            Blob ID of the stored files
        """
        if epochs is None:
            epochs = self._get_default_epochs()
        
        epochs = self._validate_epochs(epochs)
        
        command_data = {
            "command": {
                "store": {
                    "files": files,
                    "epochs": epochs,
                    "permanent": True  # Explicitly set blob behavior
                }
            }
        }
        
        # Only add config if available
        if self.config_path:
            command_data["config"] = self.config_path
        
        response = self._run_walrus_command(command_data)
        
        # Extract blob ID from response
        # The response is a list, and blobId is nested in the structure
        if isinstance(response, list) and len(response) > 0:
            first_result = response[0]
            if 'blobStoreResult' in first_result:
                blob_result = first_result['blobStoreResult']
                if 'newlyCreated' in blob_result:
                    newly_created = blob_result['newlyCreated']
                    if 'blobObject' in newly_created:
                        blob_object = newly_created['blobObject']
                        if 'blobId' in blob_object:
                            return blob_object['blobId']
        
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
        
        blob_id = find_blob_id(response)
        if blob_id:
            return blob_id
        
        raise Exception(f"Unexpected Walrus response format: {response}")
    
    def read_blob(self, blob_id: str) -> bytes:
        """
        Read a blob from Walrus
        
        Args:
            blob_id: The blob ID to read
            
        Returns:
            Blob content as bytes
        """
        command_data = {
            "command": {
                "read": {
                    "blobId": blob_id
                }
            }
        }
        
        # Only add config if available
        if self.config_path:
            command_data["config"] = self.config_path
        
        response = self._run_walrus_command(command_data)
        
        # Extract blob content from response
        if "content" in response:
            return response["content"].encode('utf-8')
        else:
            raise Exception(f"Unexpected Walrus response format: {response}")
    
    def store_json(self, json_data: Dict[str, Any], epochs: int = None) -> str:
        """
        Store JSON data using Walrus
        
        Args:
            json_data: JSON data to store
            epochs: Number of epochs to store for (defaults to config value)
            
        Returns:
            Blob ID of the stored JSON data
        """
        if epochs is None:
            epochs = self._get_default_epochs()
        
        epochs = self._validate_epochs(epochs)
        
        # Create temporary file with JSON data
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
            json.dump(json_data, temp_file)
            temp_file_path = temp_file.name
        
        try:
            # Store the temporary file
            blob_id = self.store_files([temp_file_path], epochs)
            return blob_id
        finally:
            # Clean up temporary file
            os.unlink(temp_file_path)
