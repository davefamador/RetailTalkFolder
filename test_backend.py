import httpx
print("Checking `/admin/deliveries/stats`...")
# We can't really call it without admin token, but let's test `admin_get_deliveries_stats` without hitting the protected endpoint directly by inspecting the code.
