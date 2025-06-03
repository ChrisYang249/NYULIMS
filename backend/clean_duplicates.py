#!/usr/bin/env python3
"""
Script to automatically clean duplicate samples by keeping only the oldest one.
"""

import os
import sys
from sqlalchemy import create_engine, func, and_
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from datetime import datetime

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.models import Sample, Project, SampleStatus
from app.models.base import Base

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/lims_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def clean_duplicates():
    """Remove all duplicate samples, keeping only the oldest one from each group"""
    db = SessionLocal()
    try:
        print("=== CLEANING DUPLICATE SAMPLES ===\n")
        
        # Find all duplicate groups
        duplicates_query = (
            db.query(
                Sample.client_sample_id,
                Sample.project_id,
                func.count(Sample.id).label('count')
            )
            .filter(Sample.status != SampleStatus.DELETED)
            .filter(Sample.client_sample_id.isnot(None))
            .group_by(Sample.client_sample_id, Sample.project_id)
            .having(func.count(Sample.id) > 1)
            .all()
        )
        
        print(f"Found {len(duplicates_query)} duplicate groups")
        
        total_deleted = 0
        
        for i, dup in enumerate(duplicates_query):
            # Get all samples for this duplicate group, ordered by creation date
            samples = (
                db.query(Sample)
                .filter(
                    Sample.client_sample_id == dup.client_sample_id,
                    Sample.project_id == dup.project_id,
                    Sample.status != SampleStatus.DELETED
                )
                .order_by(Sample.created_at)
                .all()
            )
            
            # Keep the first (oldest) one, delete the rest
            samples_to_delete = samples[1:]  # All except the first
            
            for sample in samples_to_delete:
                sample.status = SampleStatus.DELETED
                sample.deletion_reason = "Duplicate removal - kept oldest sample"
                sample.deleted_at = datetime.utcnow()
                total_deleted += 1
            
            if (i + 1) % 10 == 0:
                print(f"Processed {i + 1}/{len(duplicates_query)} groups...")
        
        # Commit all changes
        db.commit()
        
        print(f"\n=== CLEANUP COMPLETE ===")
        print(f"Total samples marked as deleted: {total_deleted}")
        
        # Verify the cleanup
        remaining_dups = (
            db.query(func.count(Sample.id))
            .select_from(Sample)
            .filter(Sample.status != SampleStatus.DELETED)
            .filter(Sample.client_sample_id.isnot(None))
            .group_by(Sample.client_sample_id, Sample.project_id)
            .having(func.count(Sample.id) > 1)
            .count()
        )
        
        print(f"Remaining duplicate groups: {remaining_dups}")
        
        if remaining_dups == 0:
            print("\n✅ All duplicates have been successfully cleaned!")
        else:
            print("\n⚠️  Some duplicates may still remain. Please run the script again.")
        
    except Exception as e:
        print(f"\n❌ Error occurred: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("This script will remove all duplicate samples, keeping only the oldest one from each group.")
    print("Duplicates will be soft-deleted (marked as DELETED status).\n")
    
    confirm = input("Are you sure you want to proceed? (yes/no): ").strip().lower()
    
    if confirm == 'yes':
        clean_duplicates()
    else:
        print("\nOperation cancelled.")