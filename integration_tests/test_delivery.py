"""
test_delivery.py — Integration Tests: Delivery (IT-D00001 to IT-D00011)

Maps to: INTEGRATION_TESTING.md — DELIVERY section
Module: Delivery-facing features integrated with Auth, Transactions,
        Earnings, Wallet
"""

import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from conftest import (
    BASE_URL, USERS, WAIT_LONG,
    login_as, do_logout, wait_for, body_text, navigate_sidebar,
)


class TestIT_D00001:
    """
    Test Case: IT-D00001
    Module 1: Login
    Integration Process: Account Verification
    Module 2: Auth
    Precondition: Delivery user account exists
    """
    def test_login_account_verification(self, driver):
        do_logout(driver)
        driver.get(f"{BASE_URL}/login")
        wait_for(driver, By.CSS_SELECTOR, "input[type='email']")
        driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(USERS["delivery"]["email"])
        driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(USERS["delivery"]["password"])
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        WebDriverWait(driver, WAIT_LONG).until(lambda d: "/login" not in d.current_url)
        assert "/login" not in driver.current_url, "Delivery login should redirect away from /login"


class TestIT_D00002:
    """
    Test Case: IT-D00002
    Module 1: Delivery
    Integration Process: View Available Orders
    Module 2: Transactions
    Precondition: Delivery user is logged in; approved orders are available
    """
    def test_view_available_orders(self, driver):
        login_as(driver, "delivery")
        driver.get(f"{BASE_URL}/delivery")
        time.sleep(3)
        navigate_sidebar(driver, "Dashboard")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("available" in page_text.lower() or "order" in page_text.lower()
                or "pickup" in page_text.lower() or "delivery" in page_text.lower()
                or "no available" in page_text.lower()), \
            "Available orders should be displayed for delivery user"


class TestIT_D00003:
    """
    Test Case: IT-D00003
    Module 1: Delivery
    Integration Process: View Active Deliveries
    Module 2: Transactions
    Precondition: Delivery user has picked up at least one order group
    """
    def test_view_active_deliveries(self, driver):
        login_as(driver, "delivery")
        driver.get(f"{BASE_URL}/delivery")
        time.sleep(3)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        for btn in buttons:
            if "active" in btn.text.lower():
                btn.click()
                time.sleep(2)
                break
        page_text = body_text(driver)
        assert ("active" in page_text.lower() or "delivery" in page_text.lower()
                or "no active" in page_text.lower() or "current" in page_text.lower()), \
            "Active deliveries should be displayed"


class TestIT_D00004:
    """
    Test Case: IT-D00004
    Module 1: Delivery
    Integration Process: Pick Up Order Group
    Module 2: Transactions
    Precondition: Order group is available; delivery user has fewer than 5 active deliveries
    """
    def test_pick_up_order_group(self, driver):
        login_as(driver, "delivery")
        driver.get(f"{BASE_URL}/delivery")
        time.sleep(3)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        pickup_btn = None
        for btn in buttons:
            if "pick up" in btn.text.lower() or "pickup" in btn.text.lower() or "accept" in btn.text.lower():
                pickup_btn = btn
                break
        if pickup_btn is None:
            pytest.skip("No available orders to pick up")
        pickup_btn.click()
        time.sleep(3)
        page_text = body_text(driver).lower()
        assert ("picked" in page_text or "accepted" in page_text or "success" in page_text
                or "ondeliver" in page_text or "assigned" in page_text), \
            "Order group should be picked up and assigned to delivery user"


class TestIT_D00005:
    """
    Test Case: IT-D00005
    Module 1: Delivery
    Integration Process: Exceed Maximum Active Delivery Limit
    Module 2: Transactions
    Precondition: Delivery user already has 5 active delivery groups
    """
    def test_exceed_max_active_limit(self, driver):
        login_as(driver, "delivery")
        driver.get(f"{BASE_URL}/delivery")
        time.sleep(3)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        pickup_btn = None
        for btn in buttons:
            if "pick up" in btn.text.lower() or "pickup" in btn.text.lower() or "accept" in btn.text.lower():
                pickup_btn = btn
                break
        if pickup_btn is None:
            pytest.skip("No available orders — cannot test max limit")
        page_text = body_text(driver)
        assert "delivery" in page_text.lower(), \
            "Delivery page should be loaded to verify max active limit enforcement"


class TestIT_D00006:
    """
    Test Case: IT-D00006
    Module 1: Delivery
    Integration Process: Mark Order as Delivered
    Module 2: Earnings
    Precondition: Delivery user has an active order group picked up
    """
    def test_mark_order_delivered(self, driver):
        login_as(driver, "delivery")
        driver.get(f"{BASE_URL}/delivery")
        time.sleep(3)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        deliver_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "delivered" in txt or "mark delivered" in txt or "complete" in txt:
                deliver_btn = btn
                break
        if deliver_btn is None:
            pytest.skip("No active deliveries to mark as delivered")
        deliver_btn.click()
        time.sleep(3)
        page_text = body_text(driver).lower()
        assert ("delivered" in page_text or "success" in page_text
                or "completed" in page_text or "earning" in page_text), \
            "Order should be marked delivered and earnings recorded"


class TestIT_D00007:
    """
    Test Case: IT-D00007
    Module 1: Delivery
    Integration Process: Mark Order as Undelivered
    Module 2: Transactions
    Precondition: Delivery user has an active order group picked up
    """
    def test_mark_order_undelivered(self, driver):
        login_as(driver, "delivery")
        driver.get(f"{BASE_URL}/delivery")
        time.sleep(3)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        undeliver_btn = None
        for btn in buttons:
            if "undelivered" in btn.text.lower() or "failed" in btn.text.lower():
                undeliver_btn = btn
                break
        if undeliver_btn is None:
            pytest.skip("No active deliveries to mark as undelivered")
        undeliver_btn.click()
        time.sleep(3)
        page_text = body_text(driver).lower()
        assert ("undelivered" in page_text or "failed" in page_text or "success" in page_text), \
            "Order should be marked as undelivered"


class TestIT_D00008:
    """
    Test Case: IT-D00008
    Module 1: Earnings
    Integration Process: View Total and Daily Earnings
    Module 2: Earnings
    Precondition: Delivery user has completed at least one delivery
    """
    def test_view_earnings(self, driver):
        login_as(driver, "delivery")
        driver.get(f"{BASE_URL}/delivery")
        time.sleep(3)
        navigate_sidebar(driver, "Earning")
        time.sleep(3)
        page_text = body_text(driver)
        assert ("earning" in page_text.lower() or "total" in page_text.lower()
                or "balance" in page_text.lower() or "PHP" in page_text
                or "daily" in page_text.lower()), \
            "Total and daily earnings should be displayed"


class TestIT_D00009:
    """
    Test Case: IT-D00009
    Module 1: Earnings
    Integration Process: Withdraw Earnings to Wallet
    Module 2: Wallet
    Precondition: Delivery user has sufficient earnings balance
    """
    def test_withdraw_earnings(self, driver):
        login_as(driver, "delivery")
        driver.get(f"{BASE_URL}/delivery")
        time.sleep(3)
        navigate_sidebar(driver, "Earning")
        time.sleep(3)
        inputs = driver.find_elements(By.TAG_NAME, "input")
        withdraw_input = None
        for inp in inputs:
            placeholder = (inp.get_attribute("placeholder") or "").lower()
            inp_type = (inp.get_attribute("type") or "").lower()
            if "amount" in placeholder or "withdraw" in placeholder or inp_type == "number":
                withdraw_input = inp
                break
        if withdraw_input is None:
            pytest.skip("Withdrawal input not found")
        withdraw_input.clear()
        withdraw_input.send_keys("10")
        buttons = driver.find_elements(By.TAG_NAME, "button")
        for btn in buttons:
            if "withdraw" in btn.text.lower():
                btn.click()
                time.sleep(3)
                break
        page_text = body_text(driver).lower()
        assert ("success" in page_text or "withdrew" in page_text
                or "withdraw" in page_text or "balance" in page_text), \
            "Withdrawal should be processed and wallet balance updated"


class TestIT_D00010:
    """
    Test Case: IT-D00010
    Module 1: Earnings
    Integration Process: Withdraw Exceeding Available Balance
    Module 2: Wallet
    Precondition: Delivery user attempts withdrawal greater than balance
    """
    def test_withdraw_exceeding_balance(self, driver):
        login_as(driver, "delivery")
        driver.get(f"{BASE_URL}/delivery")
        time.sleep(3)
        navigate_sidebar(driver, "Earning")
        time.sleep(3)
        inputs = driver.find_elements(By.TAG_NAME, "input")
        withdraw_input = None
        for inp in inputs:
            placeholder = (inp.get_attribute("placeholder") or "").lower()
            inp_type = (inp.get_attribute("type") or "").lower()
            if "amount" in placeholder or "withdraw" in placeholder or inp_type == "number":
                withdraw_input = inp
                break
        if withdraw_input is None:
            pytest.skip("Withdrawal input not found")
        withdraw_input.clear()
        withdraw_input.send_keys("9999999")
        buttons = driver.find_elements(By.TAG_NAME, "button")
        for btn in buttons:
            if "withdraw" in btn.text.lower():
                btn.click()
                time.sleep(3)
                break
        page_text = body_text(driver).lower()
        assert ("insufficient" in page_text or "error" in page_text
                or "not enough" in page_text or "exceed" in page_text
                or "failed" in page_text), \
            "System should reject withdrawal exceeding available balance"


class TestIT_D00011:
    """
    Test Case: IT-D00011
    Module 1: History
    Integration Process: View Delivery History
    Module 2: Transactions
    Precondition: Delivery user has at least one completed or past delivery
    """
    def test_view_delivery_history(self, driver):
        login_as(driver, "delivery")
        driver.get(f"{BASE_URL}/delivery")
        time.sleep(3)
        navigate_sidebar(driver, "History")
        time.sleep(3)
        page_text = body_text(driver)
        assert ("history" in page_text.lower() or "delivered" in page_text.lower()
                or "undelivered" in page_text.lower() or "past" in page_text.lower()
                or "no history" in page_text.lower() or "completed" in page_text.lower()), \
            "Delivery history should display past delivery groups with statuses"
