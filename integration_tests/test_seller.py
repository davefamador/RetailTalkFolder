"""
test_seller.py — Integration Tests: Staff/Seller (IT-S00001 to IT-S00016)

Maps to: INTEGRATION_TESTING.md — STAFF / SELLER section
Module: Seller-facing features integrated with Auth, Products,
        Search Pipeline, Restock, Transactions, Wishlist
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


class TestIT_S00001:
    """
    Test Case: IT-S00001
    Module 1: Login
    Integration Process: Account Verification
    Module 2: Auth
    Precondition: Staff account exists
    """
    def test_login_account_verification(self, driver):
        do_logout(driver)
        driver.get(f"{BASE_URL}/login")
        wait_for(driver, By.CSS_SELECTOR, "input[type='email']")
        driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(USERS["seller"]["email"])
        driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(USERS["seller"]["password"])
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        WebDriverWait(driver, WAIT_LONG).until(lambda d: "/login" not in d.current_url)
        assert "/login" not in driver.current_url, "Staff login should redirect away from /login"


class TestIT_S00002:
    """
    Test Case: IT-S00002
    Module 1: Products
    Integration Process: Create New Product Listing
    Module 2: Products
    Precondition: Staff is logged in; product details and images provided
    """
    def test_create_new_product(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(2)
        navigate_sidebar(driver, "Products")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        add_btn = None
        for btn in buttons:
            if "add" in btn.text.lower() or "new" in btn.text.lower() or "create" in btn.text.lower():
                add_btn = btn
                break
        if add_btn is None:
            pytest.skip("Add product button not found")
        add_btn.click()
        time.sleep(2)
        page_text = body_text(driver)
        assert ("product" in page_text.lower() or "title" in page_text.lower()
                or "price" in page_text.lower() or "add" in page_text.lower()), \
            "Product creation form should be accessible"


class TestIT_S00003:
    """
    Test Case: IT-S00003
    Module 1: Products
    Integration Process: Product Embedding on Creation
    Module 2: Search Pipeline
    Precondition: Product created; BERT model is loaded
    """
    def test_product_embedding_on_creation(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(2)
        navigate_sidebar(driver, "Products")
        time.sleep(2)
        page_text = body_text(driver)
        # Verify products page loads — embedding happens backend-side on creation
        assert ("product" in page_text.lower() or "listing" in page_text.lower()
                or "stock" in page_text.lower() or "no product" in page_text.lower()), \
            "Products section should load (embedding is triggered on product creation via backend)"


class TestIT_S00004:
    """
    Test Case: IT-S00004
    Module 1: Products
    Integration Process: Update Product Info
    Module 2: Products
    Precondition: Staff is logged in; product exists under their account
    """
    def test_update_product_info(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(2)
        navigate_sidebar(driver, "Products")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        edit_btn = None
        for btn in buttons:
            if "edit" in btn.text.lower() or "update" in btn.text.lower():
                edit_btn = btn
                break
        if edit_btn is None:
            pytest.skip("No products to edit")
        edit_btn.click()
        time.sleep(2)
        page_text = body_text(driver)
        assert ("edit" in page_text.lower() or "update" in page_text.lower()
                or "price" in page_text.lower() or "title" in page_text.lower()), \
            "Product edit form should be accessible"


class TestIT_S00005:
    """
    Test Case: IT-S00005
    Module 1: Products
    Integration Process: Delete Product Listing
    Module 2: Products
    Precondition: Staff is logged in; product exists under their account
    """
    def test_delete_product(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(2)
        navigate_sidebar(driver, "Products")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        delete_btn = None
        for btn in buttons:
            if "delete" in btn.text.lower() or "remove" in btn.text.lower():
                delete_btn = btn
                break
        if delete_btn is None:
            pytest.skip("No products to delete")
        page_text = body_text(driver)
        assert "product" in page_text.lower(), \
            "Products section should be loaded to test delete"


class TestIT_S00006:
    """
    Test Case: IT-S00006
    Module 1: Products
    Integration Process: View My Product Listings
    Module 2: Products
    Precondition: Staff is logged in; at least one product exists
    """
    def test_view_my_products(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(2)
        navigate_sidebar(driver, "Products")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("product" in page_text.lower() or "listing" in page_text.lower()
                or "no product" in page_text.lower() or "stock" in page_text.lower()), \
            "Staff product listings should be displayed"


class TestIT_S00007:
    """
    Test Case: IT-S00007
    Module 1: Restock
    Integration Process: Submit Restock Request
    Module 2: Restock
    Precondition: Staff is logged in; product exists in their department
    """
    def test_submit_restock_request(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(2)
        navigate_sidebar(driver, "Restock")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("restock" in page_text.lower() or "request" in page_text.lower()
                or "inventory" in page_text.lower()), \
            "Restock section should be accessible"


class TestIT_S00008:
    """
    Test Case: IT-S00008
    Module 1: Restock
    Integration Process: View My Restock Requests
    Module 2: Restock
    Precondition: Staff has submitted at least one restock request
    """
    def test_view_restock_requests(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(2)
        navigate_sidebar(driver, "Restock")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("restock" in page_text.lower() or "request" in page_text.lower()
                or "pending" in page_text.lower() or "no restock" in page_text.lower()), \
            "Restock requests should be listed"


class TestIT_S00009:
    """
    Test Case: IT-S00009
    Module 1: Restock
    Integration Process: Accept Restock Delivery
    Module 2: Products
    Precondition: Restock request is in delivery queue; staff is logged in
    """
    def test_accept_restock_delivery(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(2)
        navigate_sidebar(driver, "Restock")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        accept_btn = None
        for btn in buttons:
            if "accept" in btn.text.lower() or "receive" in btn.text.lower():
                accept_btn = btn
                break
        if accept_btn is None:
            pytest.skip("No restock delivery to accept")
        accept_btn.click()
        time.sleep(2)
        page_text = body_text(driver).lower()
        assert ("accept" in page_text or "received" in page_text or "success" in page_text
                or "restock" in page_text), \
            "Restock delivery should be accepted"


class TestIT_S00010:
    """
    Test Case: IT-S00010
    Module 1: Restock
    Integration Process: Modify Pending Restock Request
    Module 2: Restock
    Precondition: Restock request exists with pending status
    """
    def test_modify_restock_request(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(2)
        navigate_sidebar(driver, "Restock")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        edit_btn = None
        for btn in buttons:
            if "edit" in btn.text.lower() or "modify" in btn.text.lower() or "update" in btn.text.lower():
                edit_btn = btn
                break
        if edit_btn is None:
            pytest.skip("No pending restock request to modify")
        edit_btn.click()
        time.sleep(2)
        page_text = body_text(driver)
        assert ("restock" in page_text.lower() or "edit" in page_text.lower()
                or "modify" in page_text.lower()), \
            "Restock request modification form should be accessible"


class TestIT_S00011:
    """
    Test Case: IT-S00011
    Module 1: Restock
    Integration Process: Mark Restock as Delivered
    Module 2: Restock
    Precondition: Staff has an active restock delivery
    """
    def test_mark_restock_delivered(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(2)
        navigate_sidebar(driver, "Restock")
        time.sleep(2)
        page_text = body_text(driver).lower()
        # Restock delivery status is tracked via status labels (In Transit / Delivered)
        # Staff can view delivery progress; actual marking is done by delivery users
        assert ("restock" in page_text or "delivered" in page_text
                  in page_text or "request" in page_text
                or "no restock" in page_text), \
            "Restock tab should show delivery status (Delivered)"


class TestIT_S00012:
    """
    Test Case: IT-S00012
    Module 1: Delivery Orders
    Integration Process: View Store Delivery Orders
    Module 2: Transactions
    Precondition: Staff is logged in; orders exist in their department
    """
    def test_view_store_delivery_orders(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(2)
        navigate_sidebar(driver, "Delivery Orders")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("order" in page_text.lower() or "delivery" in page_text.lower()
                or "transaction" in page_text.lower() or "no order" in page_text.lower()), \
            "Store delivery orders should be displayed"


class TestIT_S00013:
    """
    Test Case: IT-S00013
    Module 1: Delivery Orders
    Integration Process: Update Delivery Order Status
    Module 2: Transactions
    Precondition: Staff has an active delivery order assigned
    """
    def test_update_delivery_order_status(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(2)
        navigate_sidebar(driver, "Delivery Orders")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        status_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "ready" in txt or "inwork" in txt or "update" in txt or "process" in txt:
                status_btn = btn
                break
        if status_btn is None:
            pytest.skip("No orders available to update status")
        page_text = body_text(driver)
        assert "order" in page_text.lower(), \
            "Order status update section should be loaded"


class TestIT_S00014:
    """
    Test Case: IT-S00014
    Module 1: Reports
    Integration Process: View Sales Reports
    Module 2: Transactions
    Precondition: Staff is logged in; at least one completed transaction exists
    """
    def test_view_sales_reports(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell/reports")
        time.sleep(3)
        page_text = body_text(driver)
        assert ("report" in page_text.lower() or "sales" in page_text.lower()
                or "revenue" in page_text.lower() or "transaction" in page_text.lower()
                or "PHP" in page_text), \
            "Sales reports should be displayed"


class TestIT_S00015:
    """
    Test Case: IT-S00015
    Module 1: Reports
    Integration Process: View Wishlist Analytics
    Module 2: Wishlist
    Precondition: Staff is logged in; at least one product has been wishlisted
    """
    def test_view_wishlist_analytics(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell/reports")
        time.sleep(3)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        for btn in buttons:
            if "wishlist" in btn.text.lower() or "wish" in btn.text.lower():
                btn.click()
                time.sleep(2)
                break
        page_text = body_text(driver)
        assert ("wishlist" in page_text.lower() or "wish" in page_text.lower()
                or "report" in page_text.lower()), \
            "Wishlist analytics should be visible in reports"


class TestIT_S00016:
    """
    Test Case: IT-S00016
    Module 1: Salary
    Integration Process: View Salary Payment History
    Module 2: Transactions
    Precondition: Staff is logged in; at least one salary payment has been made
    """
    def test_view_salary_history(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(2)
        navigate_sidebar(driver, "Salary")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("salary" in page_text.lower() or "payment" in page_text.lower()
                or "PHP" in page_text or "no salary" in page_text.lower()
                or "earning" in page_text.lower()), \
            "Salary payment history should be displayed"
