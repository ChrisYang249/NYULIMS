import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from urllib.parse import urlparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Parse database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/lims_db")
url = urlparse(DATABASE_URL)

# Connect to database
conn = psycopg2.connect(
    host=url.hostname,
    port=url.port or 5432,
    user=url.username,
    password=url.password,
    database=url.path[1:]
)
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cur = conn.cursor()

print("Adding extraction fields to samples table...")

# Add extraction-related columns
extraction_fields = [
    ("extraction_plate_id", "VARCHAR"),
    ("extraction_tech_id", "INTEGER REFERENCES users(id)"),
    ("extraction_assigned_date", "TIMESTAMP WITH TIME ZONE"),
    ("extraction_started_date", "TIMESTAMP WITH TIME ZONE"),
    ("extraction_completed_date", "TIMESTAMP WITH TIME ZONE"),
    ("extraction_method", "VARCHAR"),
    ("extraction_notes", "TEXT"),
    ("extraction_well_position", "VARCHAR"),  # Position on 96-well plate (A1-H12)
    ("extraction_qc_pass", "BOOLEAN"),
    ("extraction_concentration", "FLOAT"),  # ng/ul
    ("extraction_volume", "FLOAT"),  # ul
    ("extraction_260_280", "FLOAT"),  # Purity ratio
    ("extraction_260_230", "FLOAT"),  # Purity ratio
]

for field_name, field_type in extraction_fields:
    try:
        cur.execute(f"""
            ALTER TABLE samples 
            ADD COLUMN IF NOT EXISTS {field_name} {field_type};
        """)
        print(f"✓ Added column: {field_name}")
    except Exception as e:
        print(f"⚠ Error adding {field_name}: {str(e)}")

# Add indexes for performance
print("\nAdding indexes...")
indexes = [
    ("idx_samples_extraction_plate_id", "samples", "extraction_plate_id", None),
    ("idx_samples_extraction_tech_id", "samples", "extraction_tech_id", None),
    ("idx_samples_extraction_status", "samples", "status", "WHERE status IN ('extraction_queue', 'IN_EXTRACTION')"),
]

for idx_name, table_name, idx_columns, where_clause in indexes:
    try:
        query = f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table_name} ({idx_columns})"
        if where_clause:
            query += f" {where_clause}"
        cur.execute(query + ";")
        print(f"✓ Created index: {idx_name}")
    except Exception as e:
        print(f"⚠ Error creating index {idx_name}: {str(e)}")

cur.close()
conn.close()

print("\n✅ Migration completed!")