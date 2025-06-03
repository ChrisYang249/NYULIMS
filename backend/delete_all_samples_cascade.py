#!/usr/bin/env python3
"""
Delete all samples from the database by first deleting related records.
This handles all foreign key constraints properly.

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
        print("\nDeleting in proper order to handle foreign key constraints...")
        
        # Delete in reverse order of dependencies
        tables_to_clear = [
            ("plate_well_assignments", "extraction plate assignments"),
            ("discrepancy_approvals", "discrepancy approvals"),
            ("sample_logs", "sample logs"),
            ("storage_locations", "storage locations"),
            ("samples", "samples")
        ]
        
        for table, description in tables_to_clear:
            try:
                result = session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                if count > 0:
                    print(f"  - Deleting {count} {description}...")
                    session.execute(text(f"DELETE FROM {table}"))
            except Exception as e:
                print(f"  - Table {table} not found or error: {e}")
        
        # Also reset any extraction plates that might have sample counts
        try:
            session.execute(text("UPDATE extraction_plates SET sample_count = 0"))
            print("  - Reset extraction plate sample counts")
        except Exception as e:
            print(f"  - Could not reset extraction plates: {e}")
        
        # Commit the changes
        session.commit()
        
        print(f"\n✅ Successfully deleted all samples and related records")
        
        # Verify deletion
        result = session.execute(text("SELECT COUNT(*) FROM samples"))
        remaining = result.scalar()
        print(f"\nVerification - Remaining samples: {remaining}")
        
    except Exception as e:
        session.rollback()
        print(f"\n❌ Error deleting samples: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    delete_all_samples()