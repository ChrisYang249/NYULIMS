import psycopg2
from urllib.parse import urlparse

# Parse the database URL
db_url = "postgresql://lims_user:lims_password@localhost/lims_db"
parsed = urlparse(db_url)

# Connect to the database
conn = psycopg2.connect(
    host=parsed.hostname,
    port=parsed.port or 5432,
    database=parsed.path[1:],
    user=parsed.username,
    password=parsed.password
)

# Query for enum values
with conn.cursor() as cur:
    cur.execute("""
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'tat')
        ORDER BY enumsortorder;
    """)
    
    enum_values = cur.fetchall()
    
    if enum_values:
        print("TAT enum values:")
        for value in enum_values:
            print(f"  - {value[0]}")
    else:
        print("No 'tat' enum type found in the database")

conn.close()