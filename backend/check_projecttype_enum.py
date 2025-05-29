import psycopg2
from urllib.parse import urlparse

# Parse the database URL
url = urlparse("postgresql://lims_user:lims_password@localhost/lims_db")

# Connect to the database
conn = psycopg2.connect(
    database=url.path[1:],
    user=url.username,
    password=url.password,
    host=url.hostname,
    port=url.port or 5432
)

cur = conn.cursor()

# Query to get enum values
cur.execute("""
    SELECT enumlabel 
    FROM pg_enum 
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'projecttype')
    ORDER BY enumsortorder;
""")

print("ProjectType enum values:")
for row in cur.fetchall():
    print(f"  - {row[0]}")

cur.close()
conn.close()