# RetailTalk — Selenium Integration Test Suite

Maps 1:1 to **INTEGRATION_TESTING.md**.

## Prerequisites

Same as unit tests — backend at `http://localhost:8000`, frontend at `http://localhost:3000`.

## Test Accounts

| Role     | Email               | Password  |
|----------|---------------------|-----------|
| Buyer    | buyer12@gmail.com   | 123456    |
| Seller   | s1food@gmail.com    | 123456    |
| Manager  | 1food@gmail.com     | 123456    |
| Delivery | Juan@gmail.com      | 123456    |
| Admin    | admin@gmail.com     | 1234      |

## Test Structure

| File             | Section  | Test Cases        | Count |
|------------------|----------|-------------------|-------|
| test_buyer.py    | Buyer    | IT-B00001–IT-B00020 | 20  |
| test_seller.py   | Seller   | IT-S00001–IT-S00016 | 16  |
| test_manager.py  | Manager  | IT-M00001–IT-M00018 | 18  |
| test_delivery.py | Delivery | IT-D00001–IT-D00011 | 11  |
| test_admin.py    | Admin    | IT-A00001–IT-A00030 | 30  |
| **Total**        |          |                     | **95** |

## Running Tests (one by one)

```bash
cd c:/Moi/Thesis/Code/RetailTalkFolder/integration_tests

# Run one test at a time — browser stays open until you press Enter:
C:/Moi/Thesis/Code/RetailTalkFolder/venv/Scripts/python.exe -m pytest test_buyer.py::TestIT_B00001 -v -s
C:/Moi/Thesis/Code/RetailTalkFolder/venv/Scripts/python.exe -m pytest test_buyer.py::TestIT_B00002 -v -s
# ... and so on

# Run a full file:
C:/Moi/Thesis/Code/RetailTalkFolder/venv/Scripts/python.exe -m pytest test_buyer.py -v -s

# Run all integration tests:
C:/Moi/Thesis/Code/RetailTalkFolder/venv/Scripts/python.exe -m pytest -v -s

# Generate HTML report:
C:/Moi/Thesis/Code/RetailTalkFolder/venv/Scripts/python.exe -m pytest -v --html=report.html --self-contained-html
```

The `-s` flag keeps the browser open after each test until you press Enter.
