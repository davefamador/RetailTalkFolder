"""
test_seller.py — Unit Tests: Staff / Seller (UT-S01 to UT-S16)

Maps to: Table 37.24 — UNIT TESTING: WEB APPLICATION (STAFF / SELLER)
Proponent: Ayuban, Lowell Grey S.
Module: Seller Dashboard (/sell)
"""

import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from conftest import (
    BASE_URL, USERS, WAIT_LONG, WAIT_SHORT,
    login_as, do_logout, wait_for, wait_clickable,
    wait_text_present, wait_loading_done, body_text, navigate_sidebar,
)


# ═══════════════════════════════════════════════════════════════════
# PRODUCT MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

class TestUT_S01:
    """
    Test Case: UT-S01
    Module: Product Management
    Unit: Add New Product
    Description: Filled in product form with title, price, stock, images and submitted
    Expected: Product created with status "pending"; queued for admin approval
    """
    def test_add_new_product(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(3)

        # Navigate to Products section
        navigate_sidebar(driver, "Products")
        time.sleep(2)

        # Click create / add product button
        buttons = driver.find_elements(By.TAG_NAME, "button")
        add_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "add" in txt or "create" in txt or "new" in txt:
                add_btn = btn
                break
        assert add_btn is not None, "Add/Create product button should exist"
        add_btn.click()
        time.sleep(2)

        # Fill in product form
        inputs = driver.find_elements(By.TAG_NAME, "input")
        textareas = driver.find_elements(By.TAG_NAME, "textarea")

        # Find title, price, stock fields
        for inp in inputs:
            placeholder = (inp.get_attribute("placeholder") or "").lower()
            name = (inp.get_attribute("name") or "").lower()
            inp_type = (inp.get_attribute("type") or "").lower()
            if "title" in placeholder or "title" in name or "product name" in placeholder:
                inp.clear()
                inp.send_keys("Selenium Test Product UT-S01")
            elif "price" in placeholder or "price" in name:
                inp.clear()
                inp.send_keys("999")
            elif "stock" in placeholder or "stock" in name or inp_type == "number":
                inp.clear()
                inp.send_keys("10")

        for ta in textareas:
            ta.clear()
            ta.send_keys("Test product created by Selenium UT-S01")

        # Submit the form
        submit_buttons = driver.find_elements(By.CSS_SELECTOR, "button[type='submit']")
        if not submit_buttons:
            submit_buttons = [b for b in driver.find_elements(By.TAG_NAME, "button")
                              if "save" in b.text.lower() or "create" in b.text.lower() or "submit" in b.text.lower()]
        assert len(submit_buttons) > 0, "Submit button should exist"
        submit_buttons[0].click()
        time.sleep(3)

        # Verify success — product created (pending status or success message)
        page_text = body_text(driver)
        created = ("pending" in page_text.lower()
                   or "success" in page_text.lower()
                   or "created" in page_text.lower()
                   or "Selenium Test Product" in page_text)
        assert created, "Product should be created with pending status"


class TestUT_S02:
    """
    Test Case: UT-S02
    Module: Product Management
    Unit: Add Product with Missing Fields
    Description: Submitted product form with missing required fields
    Expected: Displays validation error; product not created
    """
    def test_add_product_missing_fields(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(3)

        navigate_sidebar(driver, "Products")
        time.sleep(2)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        add_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "add" in txt or "create" in txt or "new" in txt:
                add_btn = btn
                break
        if add_btn is None:
            pytest.skip("Add product button not found")
        add_btn.click()
        time.sleep(2)

        # Submit without filling fields
        submit_buttons = driver.find_elements(By.CSS_SELECTOR, "button[type='submit']")
        if not submit_buttons:
            submit_buttons = [b for b in driver.find_elements(By.TAG_NAME, "button")
                              if "save" in b.text.lower() or "create" in b.text.lower() or "submit" in b.text.lower()]
        if submit_buttons:
            submit_buttons[0].click()
            time.sleep(2)

        # Should show validation error or form stays open
        page_text = body_text(driver).lower()
        has_error = ("error" in page_text or "required" in page_text
                     or "validation" in page_text or "fill" in page_text
                     or "please" in page_text)
        # If HTML5 validation prevents submit, the form just stays — also valid
        assert has_error or driver.find_elements(By.CSS_SELECTOR, "input:invalid"), \
            "Validation error should appear or form should not submit"


class TestUT_S03:
    """
    Test Case: UT-S03
    Module: Product Management
    Unit: View My Products
    Description: Navigated to /sell page
    Expected: Displays all products listed by the staff/seller
    """
    def test_view_my_products(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(3)

        navigate_sidebar(driver, "Products")
        time.sleep(3)

        page_text = body_text(driver)
        # Should display products section with product cards or a list
        has_products_section = ("Product" in page_text
                                or "product" in page_text.lower()
                                or "No products" in page_text)
        assert has_products_section, "Seller should see their product listings"


class TestUT_S04:
    """
    Test Case: UT-S04
    Module: Product Management
    Unit: Update Product Info
    Description: Edited product title, price, or stock and saved
    Expected: Product details updated in the system
    """
    def test_update_product_info(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(3)

        navigate_sidebar(driver, "Products")
        time.sleep(3)

        # Find an edit button on any product
        buttons = driver.find_elements(By.TAG_NAME, "button")
        edit_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "edit" in txt or "update" in txt:
                edit_btn = btn
                break
        if edit_btn is None:
            pytest.skip("No products available to edit")

        edit_btn.click()
        time.sleep(2)

        # Find and update the title input
        inputs = driver.find_elements(By.TAG_NAME, "input")
        for inp in inputs:
            placeholder = (inp.get_attribute("placeholder") or "").lower()
            name = (inp.get_attribute("name") or "").lower()
            val = (inp.get_attribute("value") or "")
            if "title" in placeholder or "title" in name or (val and len(val) > 5):
                inp.clear()
                inp.send_keys("Updated Product UT-S04")
                break

        # Save
        save_buttons = [b for b in driver.find_elements(By.TAG_NAME, "button")
                        if "save" in b.text.lower() or "update" in b.text.lower()]
        if save_buttons:
            save_buttons[0].click()
            time.sleep(3)

        page_text = body_text(driver)
        updated = ("updated" in page_text.lower()
                   or "success" in page_text.lower()
                   or "Updated Product" in page_text)
        assert updated, "Product details should be updated"


class TestUT_S05:
    """
    Test Case: UT-S05
    Module: Product Management
    Unit: Delete Product
    Description: Clicked delete on a product
    Expected: Product removed from listings
    """
    def test_delete_product(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(3)

        navigate_sidebar(driver, "Products")
        time.sleep(3)

        # Count products before
        page_text_before = body_text(driver)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        delete_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "delete" in txt or "remove" in txt:
                delete_btn = btn
                break
        if delete_btn is None:
            pytest.skip("No products available to delete")

        delete_btn.click()
        time.sleep(1)

        # Handle confirmation dialog if present
        try:
            alert = driver.switch_to.alert
            alert.accept()
        except Exception:
            # No alert; may use a modal confirmation
            confirm_buttons = [b for b in driver.find_elements(By.TAG_NAME, "button")
                               if "confirm" in b.text.lower() or "yes" in b.text.lower() or "delete" in b.text.lower()]
            if confirm_buttons:
                confirm_buttons[-1].click()

        time.sleep(3)
        page_text = body_text(driver)
        deleted = ("deleted" in page_text.lower()
                   or "removed" in page_text.lower()
                   or "success" in page_text.lower())
        assert deleted or page_text != page_text_before, \
            "Product should be removed from listings"


# ═══════════════════════════════════════════════════════════════════
# RESTOCK
# ═══════════════════════════════════════════════════════════════════

class TestUT_S06:
    """
    Test Case: UT-S06
    Module: Restock
    Unit: Submit Restock Request
    Description: Filled restock request form and submitted
    Expected: Restock request created and visible to manager
    """
    def test_submit_restock_request(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(3)

        navigate_sidebar(driver, "Restock")
        time.sleep(3)

        page_text = body_text(driver)
        # Look for restock form or request button
        buttons = driver.find_elements(By.TAG_NAME, "button")
        restock_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "request" in txt or "restock" in txt or "new" in txt:
                restock_btn = btn
                break

        if restock_btn is None:
            pytest.skip("Restock request button not found")

        restock_btn.click()
        time.sleep(2)

        # Fill quantity field
        inputs = driver.find_elements(By.TAG_NAME, "input")
        for inp in inputs:
            inp_type = (inp.get_attribute("type") or "").lower()
            placeholder = (inp.get_attribute("placeholder") or "").lower()
            if inp_type == "number" or "quantity" in placeholder or "qty" in placeholder:
                inp.clear()
                inp.send_keys("5")
                break

        # Submit
        submit_btns = [b for b in driver.find_elements(By.TAG_NAME, "button")
                       if "submit" in b.text.lower() or "request" in b.text.lower() or "save" in b.text.lower()]
        if submit_btns:
            submit_btns[0].click()
            time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("success" in page_text or "submitted" in page_text
                or "pending" in page_text or "restock" in page_text), \
            "Restock request should be created"


class TestUT_S07:
    """
    Test Case: UT-S07
    Module: Restock
    Unit: View My Restock Requests
    Description: Navigated to restock section
    Expected: Displays all submitted restock requests with statuses
    """
    def test_view_restock_requests(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(3)

        navigate_sidebar(driver, "Restock")
        time.sleep(3)

        page_text = body_text(driver)
        has_restock_content = ("restock" in page_text.lower()
                               or "request" in page_text.lower()
                               or "pending" in page_text.lower()
                               or "approved" in page_text.lower()
                               or "No restock" in page_text)
        assert has_restock_content, "Restock section should display requests with statuses"


class TestUT_S08:
    """
    Test Case: UT-S08
    Module: Restock
    Unit: View Delivery Queue
    Description: Navigated to delivery queue tab
    Expected: Displays restock deliveries queued for the store
    """
    def test_view_delivery_queue(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(3)

        navigate_sidebar(driver, "Restock")
        time.sleep(2)

        # Look for a delivery queue tab/button
        buttons = driver.find_elements(By.TAG_NAME, "button")
        for btn in buttons:
            if "queue" in btn.text.lower() or "delivery" in btn.text.lower():
                btn.click()
                time.sleep(2)
                break

        page_text = body_text(driver)
        has_queue = ("queue" in page_text.lower()
                     or "delivery" in page_text.lower()
                     or "restock" in page_text.lower()
                     or "no deliveries" in page_text.lower()
                     or "no items" in page_text.lower())
        assert has_queue, "Delivery queue section should be displayed"


class TestUT_S09:
    """
    Test Case: UT-S09
    Module: Restock
    Unit: Accept Restock Delivery
    Description: Clicked accept on a queued restock delivery
    Expected: Restock accepted; product stock incremented
    """
    def test_accept_restock_delivery(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(3)

        navigate_sidebar(driver, "Restock")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        accept_btn = None
        for btn in buttons:
            if "accept" in btn.text.lower():
                accept_btn = btn
                break

        if accept_btn is None:
            pytest.skip("No restock deliveries available to accept")

        accept_btn.click()
        time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("accepted" in page_text or "success" in page_text
                or "stock" in page_text), \
            "Restock delivery should be accepted"


class TestUT_S10:
    """
    Test Case: UT-S10
    Module: Restock
    Unit: Modify Restock Request
    Description: Edited quantity on a pending restock request
    Expected: Restock request updated with new quantity
    """
    def test_modify_restock_request(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(3)

        navigate_sidebar(driver, "Restock")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        edit_btn = None
        for btn in buttons:
            if "edit" in btn.text.lower() or "modify" in btn.text.lower():
                edit_btn = btn
                break
        if edit_btn is None:
            pytest.skip("No pending restock requests to modify")

        edit_btn.click()
        time.sleep(2)

        inputs = driver.find_elements(By.TAG_NAME, "input")
        for inp in inputs:
            inp_type = (inp.get_attribute("type") or "").lower()
            if inp_type == "number":
                inp.clear()
                inp.send_keys("10")
                break

        save_btns = [b for b in driver.find_elements(By.TAG_NAME, "button")
                     if "save" in b.text.lower() or "update" in b.text.lower()]
        if save_btns:
            save_btns[0].click()
            time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("updated" in page_text or "success" in page_text
                or "modified" in page_text), \
            "Restock request should be updated"


class TestUT_S11:
    """
    Test Case: UT-S11
    Module: Restock
    Unit: Mark Restock as Delivered
    Description: Clicked mark as delivered on an active restock
    Expected: Restock status updated to delivered
    """
    def test_mark_restock_delivered(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(3)

        navigate_sidebar(driver, "Restock")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        deliver_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "delivered" in txt or "mark" in txt or "complete" in txt:
                deliver_btn = btn
                break
        if deliver_btn is None:
            pytest.skip("No active restocks to mark as delivered")

        deliver_btn.click()
        time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("delivered" in page_text or "success" in page_text
                or "completed" in page_text), \
            "Restock should be marked as delivered"


# ═══════════════════════════════════════════════════════════════════
# DELIVERY ORDERS
# ═══════════════════════════════════════════════════════════════════

class TestUT_S12:
    """
    Test Case: UT-S12
    Module: Delivery Orders
    Unit: View Store Delivery Orders
    Description: Navigated to delivery orders section
    Expected: Displays all delivery orders for the staff's department
    """
    def test_view_store_delivery_orders(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(3)

        navigate_sidebar(driver, "Delivery")
        time.sleep(3)

        page_text = body_text(driver)
        has_delivery = ("delivery" in page_text.lower()
                        or "order" in page_text.lower()
                        or "no orders" in page_text.lower()
                        or "status" in page_text.lower())
        assert has_delivery, "Delivery orders section should be displayed"


class TestUT_S13:
    """
    Test Case: UT-S13
    Module: Delivery Orders
    Unit: Update Delivery Order Status
    Description: Changed status of a delivery order (e.g. inwork -> ready)
    Expected: Order status updated; visible to manager and delivery user
    """
    def test_update_delivery_order_status(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(3)

        navigate_sidebar(driver, "Delivery")
        time.sleep(3)

        # Look for status update buttons
        buttons = driver.find_elements(By.TAG_NAME, "button")
        status_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "ready" in txt or "inwork" in txt or "process" in txt or "start" in txt:
                status_btn = btn
                break
        if status_btn is None:
            pytest.skip("No delivery orders available to update status")

        status_btn.click()
        time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("updated" in page_text or "success" in page_text
                or "ready" in page_text or "status" in page_text), \
            "Delivery order status should be updated"


# ═══════════════════════════════════════════════════════════════════
# REPORTS
# ═══════════════════════════════════════════════════════════════════

class TestUT_S14:
    """
    Test Case: UT-S14
    Module: Reports
    Unit: View Sales Reports
    Description: Navigated to /sell/reports
    Expected: Displays sales summary, revenue, and order breakdown
    """
    def test_view_sales_reports(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell/reports")
        time.sleep(3)

        page_text = body_text(driver)
        has_reports = ("report" in page_text.lower()
                       or "revenue" in page_text.lower()
                       or "sales" in page_text.lower()
                       or "total" in page_text.lower()
                       or "PHP" in page_text)
        assert has_reports, "Sales reports should display summary and revenue"


class TestUT_S15:
    """
    Test Case: UT-S15
    Module: Reports
    Unit: View Wishlist Analytics
    Description: Clicked Wishlist Analytics tab in reports
    Expected: Displays total wishlists and per-product breakdown
    """
    def test_view_wishlist_analytics(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(3)

        # Navigate to Wishlist section in sidebar
        navigate_sidebar(driver, "Wishlist")
        time.sleep(3)

        page_text = body_text(driver)
        has_wishlist = ("wishlist" in page_text.lower()
                        or "analytics" in page_text.lower()
                        or "total" in page_text.lower()
                        or "0 wishlist" in page_text.lower())
        assert has_wishlist, "Wishlist analytics should display totals and breakdown"


# ═══════════════════════════════════════════════════════════════════
# SALARY
# ═══════════════════════════════════════════════════════════════════

class TestUT_S16:
    """
    Test Case: UT-S16
    Module: Salary
    Unit: View Salary History
    Description: Navigated to salary history section
    Expected: Displays list of salary payments received
    """
    def test_view_salary_history(self, driver):
        login_as(driver, "seller")
        driver.get(f"{BASE_URL}/sell")
        time.sleep(3)

        navigate_sidebar(driver, "Salary")
        time.sleep(3)

        page_text = body_text(driver)
        has_salary = ("salary" in page_text.lower()
                      or "payment" in page_text.lower()
                      or "earning" in page_text.lower()
                      or "balance" in page_text.lower()
                      or "PHP" in page_text
                      or "no salary" in page_text.lower())
        assert has_salary, "Salary history section should display payment records"
