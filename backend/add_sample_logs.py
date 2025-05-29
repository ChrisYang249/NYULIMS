#!/usr/bin/env python3
"""
Add sample_logs table for tracking sample history and comments
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

# Get database URL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost/lims_db"
)

# Create engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def run_migration():
    with engine.begin() as conn:
        # Create sample_logs table
        print("Creating sample_logs table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS sample_logs (
                id SERIAL PRIMARY KEY,
                sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
                comment TEXT NOT NULL,
                log_type VARCHAR DEFAULT 'comment',
                old_value VARCHAR,
                new_value VARCHAR,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_by_id INTEGER REFERENCES users(id),
                updated_by_id INTEGER
            );
        """))
        
        # Create indexes for better performance
        print("Creating indexes...")
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_sample_logs_sample_id 
            ON sample_logs(sample_id);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_sample_logs_created_at 
            ON sample_logs(created_at DESC);
        """))
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_sample_logs_log_type 
            ON sample_logs(log_type);
        """))
        
        print("Migration completed successfully!")

if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)