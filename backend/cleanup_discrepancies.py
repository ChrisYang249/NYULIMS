from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://limsuser:limspass123@localhost/lims_db"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def cleanup_all_discrepancies():
    """Remove all discrepancy data to start fresh"""
    
    with engine.begin() as conn:
        # First, delete all discrepancy attachments
        result = conn.execute(text("DELETE FROM discrepancy_attachments"))
        print(f"✅ Deleted {result.rowcount} discrepancy attachments")
        
        # Then, delete all discrepancy approvals
        result = conn.execute(text("DELETE FROM discrepancy_approvals"))
        print(f"✅ Deleted {result.rowcount} discrepancy approvals")
        
        # Reset the discrepancy flags on all samples
        result = conn.execute(text("""
            UPDATE samples 
            SET has_discrepancy = false,
                discrepancy_notes = NULL,
                discrepancy_resolved = false,
                discrepancy_resolution_date = NULL,
                discrepancy_resolved_by_id = NULL
            WHERE has_discrepancy = true
        """))
        print(f"✅ Reset discrepancy flags on {result.rowcount} samples")
        
        # Optional: Remove discrepancy-related sample logs
        result = conn.execute(text("""
            DELETE FROM sample_logs 
            WHERE log_type = 'discrepancy'
        """))
        print(f"✅ Deleted {result.rowcount} discrepancy-related logs")
        
        print("\n✨ All discrepancy data has been cleaned up!")
        print("You can now start fresh with the discrepancy management system.")

if __name__ == "__main__":
    print("⚠️  WARNING: This will delete ALL discrepancy data.")
    print("\nCleaning up all discrepancy data...")
    cleanup_all_discrepancies()