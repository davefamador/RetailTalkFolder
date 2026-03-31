import asyncio
from supabase import create_client, Client
import platform

print("Python version:", platform.python_version())

# We don't have the SUPABASE_URL and KEY in code unless we read env.
# Let's just mock the query to see if supabase accepts `.not_.is_`
from postgrest import APIResponse
try:
    # Just check if postgrest provides this method syntax without erroring locally?
    pass
except Exception as e:
    pass

import requests
# Call backend login to get admin token
resp = requests.post("http://localhost:8000/auth/admin/login", json={"email": "admin@retailtalk.com", "password": "adminpassword"})
if resp.status_code == 200:
    token = resp.json()["access_token"]
    print("Got token")
    r2 = requests.get("http://localhost:8000/admin/deliveries/stats", headers={"Authorization": f"Bearer {token}"})
    print(r2.status_code)
    print(r2.text)
else:
    print("Login failed", resp.text)
