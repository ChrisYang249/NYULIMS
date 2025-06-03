#!/usr/bin/env python3
"""
Fix client configurations - ensure all clients with custom naming have project configs
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Client, ClientProjectConfig
from app.db.base import Base

# Get database URL from environment or use default
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://jon@localhost/lims_db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def fix_client_configs():
    db = SessionLocal()
    try:
        # Find all clients with custom naming
        clients_with_custom = db.query(Client).filter(
            Client.use_custom_naming == True
        ).all()
        
        print(f"Found {len(clients_with_custom)} clients with custom naming enabled")
        
        for client in clients_with_custom:
            # Check if they have a project config
            existing_config = db.query(ClientProjectConfig).filter(
                ClientProjectConfig.client_id == client.id
            ).first()
            
            if not existing_config:
                print(f"\nClient '{client.name}' is missing project configuration")
                
                if client.abbreviation:
                    # Create project config
                    config = ClientProjectConfig(
                        client_id=client.id,
                        naming_scheme=f"{client.abbreviation}{{batch#}}_{{#}}ST_{{#}}VG",
                        prefix=client.abbreviation,
                        last_batch_number=0,
                        include_sample_types=True
                    )
                    db.add(config)
                    print(f"Created project config for '{client.name}' with prefix '{client.abbreviation}'")
                else:
                    print(f"WARNING: Client '{client.name}' has custom naming enabled but no abbreviation set")
            else:
                print(f"\nClient '{client.name}' already has project configuration:")
                print(f"  - Prefix: {existing_config.prefix}")
                print(f"  - Last batch number: {existing_config.last_batch_number}")
                print(f"  - Include sample types: {existing_config.include_sample_types}")
        
        db.commit()
        print("\nAll client configurations have been fixed!")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_client_configs()