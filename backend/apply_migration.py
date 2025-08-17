#!/usr/bin/env python3
"""
Script to apply the RLS policies migration to Supabase
Run this script to fix the permission denied errors for the challenges table
"""

import os
import sys
from supabase import create_client, Client
from config import settings

def read_migration_file(filepath: str) -> str:
    """Read the migration SQL file"""
    try:
        with open(filepath, 'r') as file:
            return file.read()
    except FileNotFoundError:
        print(f"Error: Migration file not found: {filepath}")
        sys.exit(1)

def apply_migration():
    """Apply the RLS policies migration"""

    # Validate settings
    settings.validate()

    if settings.SUPABASE_URL == "https://placeholder.supabase.co":
        print("Error: Please set SUPABASE_URL environment variable with your actual Supabase URL")
        sys.exit(1)

    if settings.SUPABASE_SERVICE_ROLE_KEY == "placeholder-service-role-key":
        print("Error: Please set SUPABASE_SERVICE_ROLE_KEY environment variable with your actual service role key")
        sys.exit(1)

    # Create Supabase client with service role key (required for admin operations)
    supabase: Client = create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY
    )

    # Read the migration file
    migration_path = os.path.join(os.path.dirname(__file__), "migrations", "2025-08-16_fix_rls_policies.sql")
    sql_content = read_migration_file(migration_path)

    print("Applying RLS policies migration...")
    print("Migration content preview:")
    print("=" * 50)
    print(sql_content[:500] + "..." if len(sql_content) > 500 else sql_content)
    print("=" * 50)

    try:
        # Execute the migration
        result = supabase.rpc('exec_sql', {'sql': sql_content}).execute()

        if hasattr(result, 'error') and result.error:
            print(f"Error applying migration: {result.error}")
            sys.exit(1)

        print("✅ Migration applied successfully!")
        print("The challenges table permission issues should now be resolved.")

    except Exception as e:
        print(f"Error applying migration: {str(e)}")
        print("\nAlternative approach:")
        print("1. Copy the SQL content from migrations/2025-08-16_fix_rls_policies.sql")
        print("2. Go to your Supabase dashboard > SQL Editor")
        print("3. Paste and run the SQL directly")
        sys.exit(1)

if __name__ == "__main__":
    apply_migration()
