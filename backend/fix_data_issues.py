#!/usr/bin/env python3
"""
Fix data issues in the products table.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings

def fix_data_issues():
    """Fix data issues in the products table."""
    
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.begin() as conn:
        # Update old requestor values
        conn.execute(text("""
            UPDATE products 
            SET requestor = 'Malvika' 
            WHERE requestor = 'Priyam/Mohsin'
        """))
        
        # Fix null updated_at fields
        conn.execute(text("""
            UPDATE products 
            SET updated_at = created_at 
            WHERE updated_at IS NULL
        """))
        
        print("✅ Fixed data issues in products table")
        
        # Show current data
        result = conn.execute(text("SELECT id, name, requestor, updated_at FROM products"))
        products = result.fetchall()
        
        print(f"\n📋 Current products ({len(products)} total):")
        for product in products:
            print(f"  ID {product[0]}: {product[1]} (Requestor: {product[2]}, Updated: {product[3]})")

if __name__ == "__main__":
    fix_data_issues()
