# RetailTalk — Selenium Unit Test Suite

Maps 1:1 to **UNIT_TESTING.md** (Tables 37.24–37.28).

## Prerequisites

1. **Python packages**:
   ```bash
   pip install selenium pytest pytest-html
   ```

2. **Chrome browser** installed (Selenium 4.6+ auto-manages ChromeDriver)

3. **Backend running** at `http://localhost:8000`

4. **Frontend running** at `http://localhost:3000`

5. **Test accounts** in the database:

   | Role     | Email                           | Password    |
   |----------|---------------------------------|-------------|
   | Buyer    | buyer_test@retailtalk.test      | Test@12345  |
   | Seller   | seller_test@retailtalk.test     | Test@12345  |
   | Manager  | manager_test@retailtalk.test    | Test@12345  |
   | Delivery | delivery_test@retailtalk.test   | Test@12345  |
   | Admin    | admin_test@retailtalk.test      | Test@12345  |

## Test Structure (matches UNIT_TESTING.md)

| File             | Table  | Role     | Test Cases    | Count |
|------------------|--------|----------|---------------|-------|
| test_seller.py   | 37.24  | Seller   | UT-S01–UT-S16 | 16    |
| test_buyer.py    | 37.25  | Buyer    | UT-B01–UT-B16 | 16    |
| test_manager.py  | 37.26  | Manager  | UT-M01–UT-M16 | 16    |
| test_delivery.py | 37.27  | Delivery | UT-D01–UT-D11 | 11    |
| test_admin.py    | 37.28  | Admin    | UT-A01–UT-A27 | 27    |
| **Total**        |        |          |               | **86**|

## Running Tests

```bash
cd tests

# Run all tests:
pytest -v

# Run by role:
pytest test_seller.py -v
pytest test_buyer.py -v
pytest test_manager.py -v
pytest test_delivery.py -v
pytest test_admin.py -v

# Run a specific test case (e.g., UT-B01):
pytest test_buyer.py::TestUT_B01 -v

# Generate HTML report:
pytest -v --html=report.html --self-contained-html

# Run headless (no browser window, for CI):
# Edit conftest.py line 82: change headless=False to headless=True
```

## Test Case ID Mapping

Each test class is named `TestUT_XXXX` matching the Test Case ID from UNIT_TESTING.md.
Each class docstring contains the full mapping:
- **Test Case ID** (e.g., UT-B01)
- **Module Name** (e.g., Search)
- **Unit Name** (e.g., Search Products)
- **Description** (matches the UNIT_TESTING.md description exactly)
- **Expected Result** (matches the UNIT_TESTING.md expected result)

## Configuration

Edit `conftest.py` to change:
- `BASE_URL` — frontend URL (default: `http://localhost:3000`)
- `BACKEND` — backend URL (default: `http://localhost:8000`)
- `USERS` — test account credentials
- `headless` — set `True` in `driver()` fixture for CI mode
