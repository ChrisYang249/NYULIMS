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
        
        # First, check what tables exist and have sample references
        print("\nChecking table constraints...")
        
        # Delete plate_well_assignments first
        try:
            result = session.execute(text("SELECT COUNT(*) FROM plate_well_assignments"))
            count = result.scalar()
            if count > 0:
                print(f"  - Deleting {count} plate well assignments...")
                session.execute(text("DELETE FROM plate_well_assignments"))
                session.commit()  # Commit after each delete
        except Exception as e:
            print(f"  - Error with plate_well_assignments: {e}")
            session.rollback()
        
        # Delete discrepancy_approvals
        try:
            result = session.execute(text("SELECT COUNT(*) FROM discrepancy_approvals"))
            count = result.scalar()
            if count > 0:
                print(f"  - Deleting {count} discrepancy approvals...")
                session.execute(text("DELETE FROM discrepancy_approvals"))
                session.commit()
        except Exception as e:
            print(f"  - Error with discrepancy_approvals: {e}")
            session.rollback()
        
        # Delete sample_logs
        try:
            result = session.execute(text("SELECT COUNT(*) FROM sample_logs"))
            count = result.scalar()
            if count > 0:
                print(f"  - Deleting {count} sample logs...")
                session.execute(text("DELETE FROM sample_logs"))
                session.commit()
        except Exception as e:
            print(f"  - Error with sample_logs: {e}")
            session.rollback()
        
        # Now delete samples
        try:
            print(f"\n  - Deleting {sample_count} samples...")
            session.execute(text("DELETE FROM samples"))
            session.commit()
            print("  ✅ Samples deleted successfully")
        except Exception as e:
            print(f"  ❌ Error deleting samples: {e}")
            session.rollback()
            raise
        
        # Also delete storage_locations if they exist
        try:
            session.execute(text("DELETE FROM storage_locations"))
            session.commit()
            print("  - Deleted storage locations")
        except Exception as e:
            print(f"  - Note: storage_locations table issue: {e}")
        
        # Verify deletion
        result = session.execute(text("SELECT COUNT(*) FROM samples"))
        remaining = result.scalar()
        print(f"\n✅ Operation complete")
        print(f"Remaining samples: {remaining}")
        
        if remaining == 0:
            print("\n🎉 All samples have been successfully deleted!")
        else:
            print(f"\n⚠️  Warning: {remaining} samples still remain in the database")
        
    except Exception as e:
        session.rollback()
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    delete_all_samples()