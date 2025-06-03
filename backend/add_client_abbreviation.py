#!/usr/bin/env python3
"""
Add abbreviation field to clients table
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

def add_client_abbreviation():
    """Add abbreviation field to clients table"""
    session = SessionLocal()
    
    try:
        # Add abbreviation column to clients table
        session.execute(text("""
            ALTER TABLE clients 
            ADD COLUMN IF NOT EXISTS abbreviation VARCHAR(10)
        """))
        
        # Add use_custom_naming column to clients table
        session.execute(text("""
            ALTER TABLE clients 
            ADD COLUMN IF NOT EXISTS use_custom_naming BOOLEAN DEFAULT FALSE
        """))
        
        session.commit()
        print("✅ Successfully added abbreviation and use_custom_naming columns to clients table")
        
        # Update existing clients with suggested abbreviations
        print("\nUpdating existing clients with abbreviations...")
        
        updates = [
            ("NB", "NB", True),  # NB uses custom naming
            ("Cmbio-DK", "CMDK", False),
            ("Marcy Kingsbury", "MGH", False),
            ("Novozymes", "NOVO", False),
            ("Sarah Bade", "EURO", False)
        ]
        
        for name, abbrev, use_custom in updates:
            session.execute(text("""
                UPDATE clients 
                SET abbreviation = :abbrev, use_custom_naming = :use_custom
                WHERE name = :name
            """), {"name": name, "abbrev": abbrev, "use_custom": use_custom})
        
        session.commit()
        print("✅ Updated client abbreviations")
        
        # Show current clients
        result = session.execute(text("""
            SELECT name, institution, abbreviation, use_custom_naming 
            FROM clients 
            ORDER BY name
        """))
        
        print("\nCurrent clients:")
        for row in result:
            custom = "Yes" if row[3] else "No"
            print(f"  - {row[0]} ({row[1]}): {row[2] or 'No abbreviation'} - Custom naming: {custom}")
            
    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    add_client_abbreviation()