"""Run migration_v2.sql against the Supabase database."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

import psycopg

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set in .env")
    sys.exit(1)

migration_path = os.path.join(os.path.dirname(__file__), 'migration_v2.sql')
with open(migration_path, 'r') as f:
    sql = f.read()

print(f"Connecting to database...")
try:
    conn = psycopg.connect(DATABASE_URL)
    conn.autocommit = True
    cursor = conn.cursor()
    cursor.execute(sql)
    print("Migration applied successfully!")
    conn.close()
except Exception as e:
    print(f"Migration error: {e}")
    sys.exit(1)
