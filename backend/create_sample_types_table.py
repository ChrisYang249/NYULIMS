#!/usr/bin/env python3
"""Create sample_types table and migrate from enum"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.core.config import settings

def create_sample_types_table():
    """Create sample_types table and populate with initial data"""
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if table already exists
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name='sample_types'
        """))
        
        if result.rowcount > 0:
            print("Table sample_types already exists")
            return
        
        # Create the sample_types table
        print("Creating sample_types table...")
        conn.execute(text("""
            CREATE TABLE sample_types (
                id SERIAL PRIMARY KEY,
                name VARCHAR NOT NULL UNIQUE,
                display_name VARCHAR NOT NULL,
                description VARCHAR,
                requires_description BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        # Insert all sample types
        sample_types = [
            ('abscess', 'Abscess'),
            ('air_filter_fluid', 'Air Filter Fluid'),
            ('amniotic_fluid', 'Amniotic Fluid'),
            ('animal_wound_swabs', 'Animal wound swabs'),
            ('bacterial_biofilms', 'Bacterial Biofilms'),
            ('bal', 'BAL'),
            ('biofilm_cultured', 'Biofilm Cultured'),
            ('biofluids', 'Biofluids'),
            ('biopsy_extract', 'Biopsy Extract'),
            ('blood', 'Blood'),
            ('breast_milk', 'Breast Milk'),
            ('buccal_swab', 'Buccal Swab'),
            ('buffer', 'Buffer'),
            ('capsule', 'Capsule'),
            ('carcass_swab', 'Carcass Swab'),
            ('cdna', 'cDNA'),
            ('cecum', 'Cecum'),
            ('control', 'Control'),
            ('cow_rumen', 'Cow Rumen'),
            ('dna', 'DNA'),
            ('dna_cdna', 'DNA + cDNA'),
            ('dna_library', 'DNA Library'),
            ('dna_plate', 'DNA Plate'),
            ('environmental_sample', 'Environmental Sample'),
            ('environmental_swab', 'Environmental Swab'),
            ('enzymes', 'Enzymes'),
            ('equipment_swabs', 'Equipment swabs'),
            ('fecal_swab', 'Fecal Swab'),
            ('ffpe_block', 'FFPE Block'),
            ('filter', 'Filter'),
            ('food_product', 'Food Product'),
            ('hair', 'Hair'),
            ('icellpellet', 'ICellPellet'),
            ('isolate', 'Isolate'),
            ('library_pool', 'Library Pool'),
            ('liquid', 'Liquid'),
            ('lyophilized_powder', 'Lyophilized powder'),
            ('mcellpellet', 'MCellPellet'),
            ('media', 'Media'),
            ('milk', 'Milk'),
            ('mock_community_standard', 'Mock Community Standard'),
            ('mucosa', 'Mucosa'),
            ('nasal_sample', 'Nasal Sample'),
            ('nasal_swab', 'Nasal Swab'),
            ('ocular_swab', 'Ocular Swab'),
            ('oral_sample', 'Oral Sample'),
            ('oral_swab', 'Oral Swab'),
            ('other', 'Other'),
            ('paper_points', 'Paper Points'),
            ('plaque', 'Plaque'),
            ('plant', 'Plant'),
            ('plasma', 'Plasma'),
            ('plasma_tumor', 'Plasma/Tumor'),
            ('probiotic', 'Probiotic'),
            ('rectal_swab', 'Rectal Swab'),
            ('rna', 'RNA'),
            ('rna_library', 'RNA Library'),
            ('rumen_fluid_pellet', 'Rumen Fluid Pellet'),
            ('saliva', 'Saliva'),
            ('sea_mucilage', 'Sea Mucilage'),
            ('skin_strip', 'Skin Strip'),
            ('skin_swab', 'Skin Swab'),
            ('soil', 'Soil'),
            ('speciality', 'Speciality'),
            ('sputum', 'Sputum'),
            ('stool', 'Stool'),
            ('swab', 'Swab'),
            ('tissue', 'Tissue'),
            ('tumor_samples', 'Tumor Samples'),
            ('urine', 'Urine'),
            ('vaginal_swab', 'Vaginal Swab'),
            ('vitreous_wash_sample', 'Vitreous Wash sample'),
            ('wastewater', 'Wastewater'),
            ('water', 'Water'),
            ('wound_swab', 'Wound Swab')
        ]
        
        for name, display_name in sample_types:
            requires_desc = name == 'other'
            conn.execute(text("""
                INSERT INTO sample_types (name, display_name, requires_description)
                VALUES (:name, :display_name, :requires_desc)
            """), {"name": name, "display_name": display_name, "requires_desc": requires_desc})
        
        # Check if sample_type_id already exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='samples' AND column_name='sample_type_id'
        """))
        
        if result.rowcount == 0:
            # Add foreign key to samples table
            print("Adding sample_type_id to samples table...")
            conn.execute(text("""
                ALTER TABLE samples 
                ADD COLUMN sample_type_id INTEGER REFERENCES sample_types(id)
            """))
        else:
            print("sample_type_id column already exists in samples table")
        
        # Migrate existing data
        print("Migrating existing sample types...")
        conn.execute(text("""
            UPDATE samples s
            SET sample_type_id = st.id
            FROM sample_types st
            WHERE s.sample_type::text = st.name
        """))
        
        conn.commit()
        print("Successfully created sample_types table and migrated data")
        print("\nNOTE: You can now drop the sample_type enum column from samples table")
        print("and make sample_type_id NOT NULL after verifying the migration")

if __name__ == "__main__":
    create_sample_types_table()