#!/usr/bin/env python3
"""
Script to find and optionally remove duplicate samples in the database.
A duplicate is defined as samples with the same:
- client_sample_id
- project_id
- service_type (from project)
"""

import os
import sys
from sqlalchemy import create_engine, func, and_
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from collections import defaultdict
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

def find_duplicates():
    """Find all duplicate samples in the database"""
    db = SessionLocal()
    try:
        # Query to find duplicates
        # Join samples with projects to get service type
        duplicates_query = (
            db.query(
                Sample.client_sample_id,
                Sample.project_id,
                Project.project_type,
                Project.project_id.label('project_code'),
                func.count(Sample.id).label('count')
            )
            .join(Project, Sample.project_id == Project.id)
            .filter(Sample.status != SampleStatus.DELETED)  # Exclude deleted samples
            .filter(Sample.client_sample_id.isnot(None))  # Must have client_sample_id
            .group_by(
                Sample.client_sample_id,
                Sample.project_id,
                Project.project_type,
                Project.project_id
            )
            .having(func.count(Sample.id) > 1)
            .all()
        )
        
        print(f"\n=== DUPLICATE SAMPLES ANALYSIS ===")
        print(f"Found {len(duplicates_query)} duplicate groups\n")
        
        total_duplicates = 0
        duplicate_details = []
        
        for dup in duplicates_query:
            # Get all samples for this duplicate group
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
            
            total_duplicates += len(samples) - 1  # Count extra copies
            
            print(f"Duplicate Group:")
            print(f"  Project: {dup.project_code}")
            print(f"  Client Sample ID: {dup.client_sample_id}")
            print(f"  Service Type: {dup.project_type}")
            print(f"  Count: {dup.count} samples")
            print(f"  Samples:")
            
            group_details = {
                'project_code': dup.project_code,
                'client_sample_id': dup.client_sample_id,
                'service_type': str(dup.project_type) if dup.project_type else 'N/A',
                'samples': []
            }
            
            for i, sample in enumerate(samples):
                status_str = f"[{sample.status}]" if sample.status else "[NO STATUS]"
                created_str = sample.created_at.strftime("%Y-%m-%d %H:%M") if sample.created_at else "Unknown"
                
                print(f"    {i+1}. Barcode: {sample.barcode} | Status: {status_str} | Created: {created_str}")
                
                group_details['samples'].append({
                    'id': sample.id,
                    'barcode': sample.barcode,
                    'status': sample.status,
                    'created_at': sample.created_at,
                    'is_oldest': i == 0,
                    'is_newest': i == len(samples) - 1
                })
            
            duplicate_details.append(group_details)
            print()
        
        print(f"\nTotal duplicate samples to remove: {total_duplicates}")
        
        return duplicate_details
        
    finally:
        db.close()

def remove_duplicates(keep_strategy='oldest', dry_run=True):
    """
    Remove duplicate samples based on strategy
    
    Args:
        keep_strategy: 'oldest', 'newest', or 'interactive'
        dry_run: If True, only show what would be deleted
    """
    db = SessionLocal()
    try:
        duplicate_groups = find_duplicates()
        
        if not duplicate_groups:
            print("\nNo duplicates found!")
            return
        
        samples_to_delete = []
        
        print(f"\n=== DUPLICATE REMOVAL PLAN (Strategy: Keep {keep_strategy}) ===\n")
        
        for group in duplicate_groups:
            samples = group['samples']
            
            if keep_strategy == 'oldest':
                # Keep the first (oldest) sample, delete the rest
                to_delete = [s for s in samples if not s['is_oldest']]
            elif keep_strategy == 'newest':
                # Keep the last (newest) sample, delete the rest
                to_delete = [s for s in samples if not s['is_newest']]
            else:
                # Interactive mode - ask for each group
                print(f"\nDuplicate group: {group['project_code']} - {group['client_sample_id']}")
                for i, s in enumerate(samples):
                    print(f"  {i+1}. {s['barcode']} (Created: {s['created_at']})")
                
                while True:
                    choice = input("Which one to keep? (Enter number, or 'a' to keep all): ").strip()
                    if choice.lower() == 'a':
                        to_delete = []
                        break
                    try:
                        keep_idx = int(choice) - 1
                        if 0 <= keep_idx < len(samples):
                            to_delete = [s for i, s in enumerate(samples) if i != keep_idx]
                            break
                        else:
                            print("Invalid number, please try again.")
                    except ValueError:
                        print("Invalid input, please enter a number or 'a'.")
            
            for s in to_delete:
                samples_to_delete.append(s)
                print(f"Will DELETE: {s['barcode']} (ID: {s['id']})")
        
        print(f"\n=== SUMMARY ===")
        print(f"Total samples to delete: {len(samples_to_delete)}")
        
        if not dry_run and samples_to_delete:
            confirm = input("\nAre you sure you want to delete these samples? (yes/no): ").strip().lower()
            if confirm == 'yes':
                # Perform the deletion
                deleted_count = 0
                for sample_info in samples_to_delete:
                    sample = db.query(Sample).filter(Sample.id == sample_info['id']).first()
                    if sample:
                        # Soft delete by setting status
                        sample.status = SampleStatus.DELETED
                        sample.deletion_reason = f"Duplicate removal - kept {keep_strategy} sample"
                        sample.deleted_at = datetime.utcnow()
                        deleted_count += 1
                
                db.commit()
                print(f"\nSuccessfully deleted {deleted_count} duplicate samples.")
            else:
                print("\nDeletion cancelled.")
        elif dry_run:
            print("\n[DRY RUN] No changes made. Run with dry_run=False to actually delete.")
        
    except Exception as e:
        print(f"\nError: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("=== DUPLICATE SAMPLE FINDER ===\n")
    
    # First, just find and display duplicates
    find_duplicates()
    
    # Ask user what to do
    print("\nOptions:")
    print("1. Remove duplicates (keep oldest)")
    print("2. Remove duplicates (keep newest)")
    print("3. Remove duplicates (interactive - choose for each)")
    print("4. Exit without changes")
    
    choice = input("\nEnter your choice (1-4): ").strip()
    
    if choice == '1':
        remove_duplicates(keep_strategy='oldest', dry_run=True)
        confirm = input("\nProceed with deletion? (yes/no): ").strip().lower()
        if confirm == 'yes':
            remove_duplicates(keep_strategy='oldest', dry_run=False)
    elif choice == '2':
        remove_duplicates(keep_strategy='newest', dry_run=True)
        confirm = input("\nProceed with deletion? (yes/no): ").strip().lower()
        if confirm == 'yes':
            remove_duplicates(keep_strategy='newest', dry_run=False)
    elif choice == '3':
        remove_duplicates(keep_strategy='interactive', dry_run=False)
    else:
        print("\nNo changes made.")