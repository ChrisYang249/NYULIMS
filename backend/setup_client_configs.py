#!/usr/bin/env python3
"""
Setup initial client project configurations
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

def setup_client_configs():
    """Setup initial client project configurations"""
    session = SessionLocal()
    
    try:
        # First, let's check existing clients
        result = session.execute(text("SELECT id, name, institution FROM clients ORDER BY name"))
        clients = result.fetchall()
        
        print("Existing clients:")
        for client in clients:
            print(f"  - ID: {client[0]}, Name: {client[1]}, Institution: {client[2]}")
        
        # Always add NB client if it doesn't exist (per user's example)
        nb_exists = session.execute(text("SELECT COUNT(*) FROM clients WHERE name = 'NB'")).scalar()
        if nb_exists == 0:
            print("\nCreating NB client as per example...")
            session.execute(text("""
                INSERT INTO clients (name, institution, email, phone)
                VALUES ('NB', 'Kit Client', 'nb@example.com', '555-0001')
            """))
            session.commit()
            
        # Re-fetch all clients
        result = session.execute(text("SELECT id, name, institution FROM clients ORDER BY name"))
        clients = result.fetchall()
        
        # Now setup configurations for clients that don't have them
        print("\nChecking client configurations...")
        
        for client_id, client_name, institution in clients:
            # Check if config exists
            result = session.execute(text("""
                SELECT COUNT(*) FROM client_project_config WHERE client_id = :client_id
            """), {"client_id": client_id})
            
            if result.scalar() == 0:
                # Determine prefix from client name or institution
                client_info = (client_name + " " + (institution or "")).upper()
                
                if client_name == "NB":
                    prefix = "NB"
                    last_batch = 22  # Starting from their example
                elif "CMBIO" in client_info or "DK" in client_info:
                    prefix = "CMDK"
                    last_batch = 0
                elif "MARCY" in client_info or "MGH" in client_info:
                    prefix = "MGH"
                    last_batch = 0
                elif "NOVOZYMES" in client_info:
                    prefix = "NOVO"
                    last_batch = 0
                elif "SARAH" in client_info or "EUROFINS" in client_info:
                    prefix = "EURO"
                    last_batch = 0
                else:
                    # Default: use first 2-4 characters of name
                    prefix = ''.join(c for c in client_name.upper() if c.isalnum())[:4]
                    last_batch = 0
                
                print(f"  Creating config for {client_name} with prefix {prefix}")
                
                session.execute(text("""
                    INSERT INTO client_project_config 
                    (client_id, naming_scheme, prefix, last_batch_number, include_sample_types)
                    VALUES (:client_id, :naming_scheme, :prefix, :last_batch, :include_types)
                """), {
                    "client_id": client_id,
                    "naming_scheme": "{prefix}{batch#}_{#}ST_{#}VG",
                    "prefix": prefix,
                    "last_batch": last_batch,
                    "include_types": True
                })
        
        session.commit()
        print("\n✅ Client configurations setup complete!")
        
        # Show final configurations
        print("\nFinal configurations:")
        result = session.execute(text("""
            SELECT c.name, cpc.prefix, cpc.last_batch_number, cpc.include_sample_types
            FROM client_project_config cpc
            JOIN clients c ON c.id = cpc.client_id
            ORDER BY c.name
        """))
        
        for row in result:
            next_id = f"{row[1]}{str(row[2] + 1).zfill(4)}"
            if row[3]:  # include_sample_types
                next_id += "_4ST_2VG"
            print(f"  - {row[0]}: Next ID example = {next_id}")
            
    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    setup_client_configs()