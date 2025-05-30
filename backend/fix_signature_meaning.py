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

def fix_signature_meaning():
    """Update signature_meaning for pending approvals"""
    
    with engine.begin() as conn:
        # For pending approvals, set signature_meaning to NULL
        result = conn.execute(text("""
            UPDATE discrepancy_approvals 
            SET signature_meaning = NULL 
            WHERE approved IS NULL
        """))
        print(f"✅ Updated {result.rowcount} pending approvals to have NULL signature_meaning")
        
        # Make signature_meaning nullable
        conn.execute(text("""
            ALTER TABLE discrepancy_approvals 
            ALTER COLUMN signature_meaning DROP NOT NULL
        """))
        print("✅ Made signature_meaning column nullable")
        
        print("\n✨ Fixed signature_meaning field!")

if __name__ == "__main__":
    print("Fixing signature_meaning field...")
    fix_signature_meaning()