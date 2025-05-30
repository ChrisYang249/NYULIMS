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

def create_discrepancy_attachments_table():
    """Create the discrepancy_attachments table"""
    
    with engine.begin() as conn:
        # Create the discrepancy_attachments table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS discrepancy_attachments (
                id SERIAL PRIMARY KEY,
                discrepancy_approval_id INTEGER NOT NULL REFERENCES discrepancy_approvals(id) ON DELETE CASCADE,
                filename VARCHAR NOT NULL,
                original_filename VARCHAR NOT NULL,
                file_path VARCHAR NOT NULL,
                file_size INTEGER,
                file_type VARCHAR,
                uploaded_by_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        # Create indexes
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_discrepancy_attachments_approval 
            ON discrepancy_attachments(discrepancy_approval_id);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_discrepancy_attachments_uploaded_by 
            ON discrepancy_attachments(uploaded_by_id);
        """))
        
        print("✅ Created discrepancy_attachments table")
        
        # Create uploads directory for discrepancy attachments
        os.makedirs("uploads/discrepancies", exist_ok=True)
        print("✅ Created uploads/discrepancies directory")

if __name__ == "__main__":
    print("Creating discrepancy attachments table...")
    create_discrepancy_attachments_table()
    print("✅ Done!")