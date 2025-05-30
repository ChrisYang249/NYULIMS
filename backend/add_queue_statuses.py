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

print("Adding new queue statuses to SampleStatus enum...")

# Add new statuses after ACCESSIONED
new_statuses = [
    ('extraction_queue', 'ACCESSIONED'),
    ('dna_quant_queue', 'EXTRACTED')
]

for new_status, after_status in new_statuses:
    try:
        cur.execute(f"""
            ALTER TYPE samplestatus ADD VALUE IF NOT EXISTS '{new_status}' AFTER '{after_status}';
        """)
        print(f"✓ Added status: {new_status}")
    except Exception as e:
        print(f"⚠ Status {new_status} may already exist or error: {str(e)}")

# Check current enum values
cur.execute("""
    SELECT enumlabel 
    FROM pg_enum 
    WHERE enumtypid = 'samplestatus'::regtype::oid
    ORDER BY enumsortorder;
""")
print("\nCurrent SampleStatus values:")
for row in cur.fetchall():
    print(f"  - {row[0]}")

cur.close()
conn.close()

print("\n✅ Migration completed!")