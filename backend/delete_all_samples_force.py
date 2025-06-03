#!/usr/bin/env python3
"""
Delete all samples from the database WITHOUT confirmation.
This will also delete related records due to CASCADE settings.

WARNING: This is a destructive operation!
"""

import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def delete_all_samples():
    """Delete all samples and related records from the database."""
    session = SessionLocal()
    
    try:
        # First, let's check how many samples we have
        result = session.execute(text("SELECT COUNT(*) FROM samples"))
        sample_count = result.scalar()
        
        print(f"Found {sample_count} samples in the database")
        
        if sample_count == 0:
            print("No samples to delete.")
            return
        
        print("\n⚠️  WARNING: Deleting ALL samples and related data!")
        print("This includes:")
        print("  - All sample records")
        print("  - All sample logs")
        print("  - All discrepancy approvals")
        print("  - All extraction plate assignments")
        print("  - Storage location assignments")
        
        print("\nDeleting all samples...")
        
        # Delete all samples (CASCADE will handle related records)
        result = session.execute(text("DELETE FROM samples"))
        
        # Also reset any extraction plates that might have sample references
        session.execute(text("UPDATE extraction_plates SET sample_count = 0"))
        
        # Commit the changes
        session.commit()
        
        print(f"✅ Successfully deleted {sample_count} samples and all related records")
        
        # Verify deletion
        result = session.execute(text("SELECT COUNT(*) FROM samples"))
        remaining = result.scalar()
        print(f"Remaining samples: {remaining}")
        
        # Also check related tables
        result = session.execute(text("SELECT COUNT(*) FROM sample_logs"))
        logs = result.scalar()
        print(f"Remaining sample logs: {logs}")
        
        result = session.execute(text("SELECT COUNT(*) FROM storage_locations"))
        storage = result.scalar()
        print(f"Remaining storage locations: {storage}")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error deleting samples: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    delete_all_samples()