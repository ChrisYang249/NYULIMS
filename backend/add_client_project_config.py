#!/usr/bin/env python3
"""
Add client project configuration table for auto-generating project IDs
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

def add_client_project_config():
    """Add client project configuration table"""
    session = SessionLocal()
    
    try:
        # Create the client_project_config table
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS client_project_config (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                naming_scheme VARCHAR(255) NOT NULL,
                prefix VARCHAR(10) NOT NULL,
                last_batch_number INTEGER DEFAULT 0,
                include_sample_types BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(client_id)
            );
        """))
        
        # Create an update trigger for updated_at
        session.execute(text("""
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        """))
        
        session.execute(text("""
            CREATE TRIGGER update_client_project_config_updated_at 
            BEFORE UPDATE ON client_project_config
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """))
        
        # Add some default configurations for existing clients
        # NB client example
        session.execute(text("""
            INSERT INTO client_project_config (client_id, naming_scheme, prefix, last_batch_number, include_sample_types)
            SELECT id, '{prefix}{batch#}_{#}ST_{#}VG', 'NB', 22, TRUE
            FROM clients 
            WHERE name = 'NB' 
            AND NOT EXISTS (
                SELECT 1 FROM client_project_config WHERE client_id = clients.id
            );
        """))
        
        session.commit()
        print("✅ Successfully created client_project_config table")
        
        # Check if table was created
        result = session.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'client_project_config'
            ORDER BY ordinal_position;
        """))
        
        print("\nTable structure:")
        for row in result:
            print(f"  - {row[0]}: {row[1]}")
            
    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    add_client_project_config()