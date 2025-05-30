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

def fix_approved_field():
    """Fix the approved field to be nullable with no default"""
    
    with engine.begin() as conn:
        # First, update any false values to NULL for pending approvals
        result = conn.execute(text("""
            UPDATE discrepancy_approvals 
            SET approved = NULL 
            WHERE approved = false AND approved_by_id IS NULL
        """))
        print(f"✅ Updated {result.rowcount} pending approvals to have NULL approved status")
        
        # Alter the column to remove the default
        conn.execute(text("""
            ALTER TABLE discrepancy_approvals 
            ALTER COLUMN approved DROP DEFAULT
        """))
        print("✅ Removed default value from approved column")
        
        print("\n✨ Fixed discrepancy approval field!")
        print("New discrepancies will now be in pending status (approved = NULL)")

if __name__ == "__main__":
    print("Fixing discrepancy approved field...")
    fix_approved_field()