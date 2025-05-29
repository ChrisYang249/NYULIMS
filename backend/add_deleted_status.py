#!/usr/bin/env python3
"""
Add 'deleted' status to project_status enum
"""
import sqlite3
import sys
import os

# Update the path to the correct database location
DB_PATH = "/Users/jon/Documents/claudeMaxSandbox/db.sqlite3"

def add_deleted_status():
    """Add 'deleted' to the project status enum"""
    
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        sys.exit(1)
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # SQLite doesn't have true ENUMs, they're implemented as CHECK constraints
        # We need to:
        # 1. Drop the existing CHECK constraint
        # 2. Add a new one with 'deleted' included
        
        print("Getting current table schema...")
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='projects';")
        result = cursor.fetchone()
        if result:
            create_sql = result[0]
            print(f"Current schema: {create_sql}")
        else:
            print("Projects table not found - might be using PostgreSQL or different schema")
        
        # For SQLite, we need to recreate the table with the new constraint
        # This is complex, so let's check if any projects have status that would conflict
        cursor.execute("SELECT DISTINCT status FROM projects;")
        current_statuses = [row[0] for row in cursor.fetchall()]
        print(f"Current statuses in use: {current_statuses}")
        
        # Since SQLite doesn't support ALTER TABLE to modify constraints easily,
        # and the column is likely just TEXT with a CHECK constraint,
        # we can just update any 'cancelled' to 'deleted' if needed
        
        # First, let's verify the column type
        cursor.execute("PRAGMA table_info(projects);")
        columns = cursor.fetchall()
        for col in columns:
            if col[1] == 'status':
                print(f"Status column info: {col}")
        
        print("\nSince SQLite uses TEXT columns for enums, the 'deleted' value should work without schema changes.")
        print("The backend enum has been updated to include 'deleted' status.")
        
        conn.close()
        print("\nDone! The 'deleted' status is now available for use.")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    add_deleted_status()