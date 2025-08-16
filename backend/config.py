import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Settings:
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # Server Configuration
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8001"))
    
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "RaceFi API"
    
    # Validation
    def validate(self):
        # For development, allow placeholder values
        if not self.SUPABASE_URL or self.SUPABASE_URL == "":
            print("Warning: SUPABASE_URL not set, using placeholder")
            self.SUPABASE_URL = "https://placeholder.supabase.co"
        if not self.SUPABASE_SERVICE_ROLE_KEY or self.SUPABASE_SERVICE_ROLE_KEY == "":
            print("Warning: SUPABASE_SERVICE_ROLE_KEY not set, using placeholder")
            self.SUPABASE_SERVICE_ROLE_KEY = "placeholder-service-role-key"

# Create settings instance
settings = Settings()

# Validate settings on import
try:
    settings.validate()
except ValueError as e:
    print(f"Configuration Error: {e}")
    print("Please check your .env file and ensure all required variables are set.") 
