"""
conftest.py — Shared fixtures for RetailTalk Selenium Unit Test Suite.

Maps to UNIT_TESTING.md — each test corresponds to a specific Test Case ID.

Requirements:
  pip install selenium pytest pytest-html

Setup:
  - Frontend running at http://localhost:3000
  - Backend  running at http://localhost:8000
  - Chrome browser installed (Selenium 4.6+ auto-manages ChromeDriver)

Test accounts (must exist in database before running):
  Buyer    : buyer_test@retailtalk.test  / Test@12345
  Seller   : seller_test@retailtalk.test / Test@12345
  Manager  : manager_test@retailtalk.test / Test@12345
  Delivery : delivery_test@retailtalk.test / Test@12345
  Admin    : admin_test@retailtalk.test  / Test@12345
"""

import time
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL   = "http://localhost:3000"
BACKEND    = "http://localhost:8000"

WAIT_SHORT = 5
WAIT_LONG  = 20

# Test credentials — update these to match your database
USERS = {
    "buyer": {
        "full_name": "Test Buyer",
        "email":     "buyer12@gmail.com",
        "password":  "123456",
        "role":      "buyer",
    },
    "seller": {
        "full_name": "Test Seller",
        "email":     "s1food@gmail.com",
        "password":  "123456",
        "role":      "seller",
    },
    "manager": {
        "full_name": "Test Manager",
        "email":     "1food@gmail.com",
        "password":  "123456",
        "role":      "manager",
    },
    "delivery": {
        "full_name": "Test Delivery",
        "email":     "Juan@gmail.com",
        "password":  "123456",
        "role":      "delivery",
    },
    "admin": {
        "email":    "admin@gmail.com",
        "password": "1234",
        "role":     "admin",
    },
}

# ---------------------------------------------------------------------------
# Driver factory
# ---------------------------------------------------------------------------

def make_driver(headless: bool = False) -> webdriver.Chrome:
    opts = Options()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1280,900")
    return webdriver.Chrome(options=opts)


# ---------------------------------------------------------------------------
# Session-scoped driver
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def driver():
    d = make_driver(headless=False)  # set True for CI
    d.implicitly_wait(4)
    yield d
    time.sleep(5)  # browser stays open for 5s after tests finish
    d.quit()


# ---------------------------------------------------------------------------
# Wait helpers
# ---------------------------------------------------------------------------

def wait_for(driver, by, value, timeout=WAIT_LONG):
    return WebDriverWait(driver, timeout).until(
        EC.visibility_of_element_located((by, value))
    )

def wait_clickable(driver, by, value, timeout=WAIT_LONG):
    return WebDriverWait(driver, timeout).until(
        EC.element_to_be_clickable((by, value))
    )

def wait_url_contains(driver, text, timeout=WAIT_LONG):
    WebDriverWait(driver, timeout).until(lambda d: text in d.current_url)

def wait_text_present(driver, text, timeout=WAIT_LONG):
    WebDriverWait(driver, timeout).until(
        lambda d: text in d.find_element(By.TAG_NAME, "body").text
    )

def wait_loading_done(driver, timeout=WAIT_LONG):
    """Wait until no spinner elements are visible."""
    WebDriverWait(driver, timeout).until(
        lambda d: len(d.find_elements(By.CSS_SELECTOR, ".spinner")) == 0
            or not any(s.is_displayed() for s in d.find_elements(By.CSS_SELECTOR, ".spinner"))
    )

def body_text(driver):
    return driver.find_element(By.TAG_NAME, "body").text


# ---------------------------------------------------------------------------
# Login / Logout helpers
# ---------------------------------------------------------------------------

def do_login(driver, email: str, password: str):
    """Login via the regular /login page (buyer, seller, manager, delivery)."""
    driver.get(f"{BASE_URL}/login")
    wait_for(driver, By.CSS_SELECTOR, "input[type='email']")
    driver.find_element(By.CSS_SELECTOR, "input[type='email']").clear()
    driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(email)
    driver.find_element(By.CSS_SELECTOR, "input[type='password']").clear()
    driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(password)
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    WebDriverWait(driver, WAIT_LONG).until(
        lambda d: "/login" not in d.current_url
    )

def do_admin_login(driver, email: str, password: str):
    """Login via the /admin page (admin role only)."""
    driver.get(f"{BASE_URL}/admin")
    wait_for(driver, By.CSS_SELECTOR, "input[type='email']")
    driver.find_element(By.CSS_SELECTOR, "input[type='email']").clear()
    driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(email)
    driver.find_element(By.CSS_SELECTOR, "input[type='password']").clear()
    driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(password)
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    WebDriverWait(driver, WAIT_LONG).until(
        lambda d: "dashboard" in d.current_url
        or "retailtalk_admin" in (driver.execute_script("return JSON.stringify(localStorage);") or "")
    )

def do_logout(driver):
    # Must be on a real page (not data:,) before touching localStorage
    if not driver.current_url.startswith(BASE_URL):
        driver.get(f"{BASE_URL}/login")
        time.sleep(0.5)
    try:
        driver.execute_script("localStorage.clear();")
    except Exception:
        pass
    time.sleep(0.3)

def login_as(driver, role: str):
    do_logout(driver)
    if role == "admin":
        do_admin_login(driver, USERS[role]["email"], USERS[role]["password"])
    else:
        do_login(driver, USERS[role]["email"], USERS[role]["password"])

def navigate_seller_tab(driver, tab_label: str):
    """Click a sidebar button in the seller dashboard by label text."""
    buttons = driver.find_elements(By.TAG_NAME, "button")
    for btn in buttons:
        if tab_label.lower() in btn.text.lower():
            btn.click()
            time.sleep(2)
            return
    raise AssertionError(f"Seller sidebar tab '{tab_label}' not found")

def navigate_sidebar(driver, tab_label: str):
    """Click a sidebar button by label text or title attribute (works for collapsed sidebars too)."""
    # Try expanding collapsed admin sidebar via logo click first
    logos = driver.find_elements(By.CSS_SELECTOR, "img[alt='RetailTalk']")
    if logos:
        # Check if sidebar is collapsed (buttons have title attr but no visible text)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        has_text = any(tab_label.lower() in btn.text.lower() for btn in buttons)
        if not has_text:
            try:
                logos[0].click()
                time.sleep(1)
            except Exception:
                pass

    buttons = driver.find_elements(By.TAG_NAME, "button")
    for btn in buttons:
        if tab_label.lower() in btn.text.lower():
            btn.click()
            time.sleep(2)
            return
    # Fallback: match by title attribute (collapsed sidebar)
    for btn in buttons:
        title = (btn.get_attribute("title") or "").lower()
        if tab_label.lower() in title:
            btn.click()
            time.sleep(2)
            return
    raise AssertionError(f"Sidebar tab '{tab_label}' not found")


# ---------------------------------------------------------------------------
# Pytest HTML report metadata
# ---------------------------------------------------------------------------

def pytest_configure(config):
    try:
        config._metadata["Project"]  = "RetailTalk"
        config._metadata["Frontend"] = BASE_URL
        config._metadata["Backend"]  = BACKEND
    except AttributeError:
        pass
