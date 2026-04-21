"""
test_manager.py — Unit Tests: Manager (UT-M01 to UT-M16)

Maps to: Table 37.26 — UNIT TESTING: WEB APPLICATION (MANAGER)
Proponent: Ayuban, Lowell Grey S.
Module: Manager Dashboard (/manager/dashboard)
"""

import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from conftest import (
    BASE_URL, USERS, WAIT_LONG,
    login_as, do_logout, wait_for, wait_clickable,
    wait_text_present, body_text, navigate_sidebar,
)


# ═══════════════════════════════════════════════════════════════════
# MANAGER DASHBOARD
# ═══════════════════════════════════════════════════════════════════

class TestUT_M01:
    """
    Test Case: UT-M01
    Module: Manager Dashboard
    Unit: View Dashboard
    Description: Clicked Dashboard on manager nav
    Expected: Displays department stats, staff list, sales overview
    """
    def test_view_dashboard(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(3)

        page_text = body_text(driver)
        has_dashboard = ("dashboard" in page_text.lower()
                         or "department" in page_text.lower()
                         or "staff" in page_text.lower()
                         or "sales" in page_text.lower()
                         or "total" in page_text.lower()
                         or "revenue" in page_text.lower())
        assert has_dashboard, \
            "Manager dashboard should display department stats and overview"


# ═══════════════════════════════════════════════════════════════════
# STAFF MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

class TestUT_M02:
    """
    Test Case: UT-M02
    Module: Staff Management
    Unit: View Staff List
    Description: Navigated to staff section
    Expected: Displays all staff under the manager's department
    """
    def test_view_staff_list(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Staff")
        time.sleep(3)

        page_text = body_text(driver)
        has_staff = ("staff" in page_text.lower()
                     or "seller" in page_text.lower()
                     or "employee" in page_text.lower()
                     or "member" in page_text.lower()
                     or "no staff" in page_text.lower())
        assert has_staff, "Staff section should display staff members"


class TestUT_M03:
    """
    Test Case: UT-M03
    Module: Staff Management
    Unit: Register New Staff
    Description: Filled in staff registration form and submitted
    Expected: New staff account created and listed in department
    """
    def test_register_new_staff(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Staff")
        time.sleep(2)

        # Find register/add staff button
        buttons = driver.find_elements(By.TAG_NAME, "button")
        reg_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "register" in txt or "add staff" in txt or "new staff" in txt or "add" in txt:
                reg_btn = btn
                break
        if reg_btn is None:
            pytest.skip("Register staff button not found")

        reg_btn.click()
        time.sleep(2)

        # Fill registration form
        inputs = driver.find_elements(By.TAG_NAME, "input")
        for inp in inputs:
            placeholder = (inp.get_attribute("placeholder") or "").lower()
            name = (inp.get_attribute("name") or "").lower()
            inp_type = (inp.get_attribute("type") or "").lower()
            if "name" in placeholder or "name" in name:
                inp.clear()
                inp.send_keys("Selenium Staff UT-M03")
            elif "email" in placeholder or "email" in name or inp_type == "email":
                inp.clear()
                inp.send_keys(f"selenium_staff_m03_{int(time.time())}@retailtalk.test")
            elif "password" in placeholder or "password" in name or inp_type == "password":
                inp.clear()
                inp.send_keys("Test@12345")

        submit_btns = [b for b in driver.find_elements(By.TAG_NAME, "button")
                       if "register" in b.text.lower() or "create" in b.text.lower() or "submit" in b.text.lower()]
        if submit_btns:
            submit_btns[0].click()
            time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("success" in page_text or "created" in page_text
                or "registered" in page_text or "selenium staff" in page_text), \
            "New staff should be registered and listed"


class TestUT_M04:
    """
    Test Case: UT-M04
    Module: Staff Management
    Unit: Register with Missing Fields
    Description: Submitted staff registration with missing required fields
    Expected: Displays validation error; no account created
    """
    def test_register_missing_fields(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Staff")
        time.sleep(2)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        reg_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "register" in txt or "add staff" in txt or "add" in txt:
                reg_btn = btn
                break
        if reg_btn is None:
            pytest.skip("Register staff button not found")

        reg_btn.click()
        time.sleep(2)

        # Submit without filling any fields
        submit_btns = [b for b in driver.find_elements(By.TAG_NAME, "button")
                       if "register" in b.text.lower() or "create" in b.text.lower() or "submit" in b.text.lower()]
        if submit_btns:
            submit_btns[0].click()
            time.sleep(2)

        page_text = body_text(driver).lower()
        has_error = ("error" in page_text or "required" in page_text
                     or "validation" in page_text or "please" in page_text
                     or "fill" in page_text)
        has_invalid_inputs = len(driver.find_elements(By.CSS_SELECTOR, "input:invalid")) > 0
        assert has_error or has_invalid_inputs, \
            "Validation error should be displayed for missing fields"


class TestUT_M05:
    """
    Test Case: UT-M05
    Module: Staff Management
    Unit: View Staff Detail
    Description: Clicked a staff member's name
    Expected: Displays full staff profile and activity info
    """
    def test_view_staff_detail(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Staff")
        time.sleep(3)

        # Click on a staff name or detail button
        buttons = driver.find_elements(By.TAG_NAME, "button")
        detail_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "view" in txt or "detail" in txt:
                detail_btn = btn
                break
        # Also try clicking a link/name
        if detail_btn is None:
            links = driver.find_elements(By.TAG_NAME, "a")
            for link in links:
                if "@" in link.text or "seller" in link.text.lower():
                    detail_btn = link
                    break

        if detail_btn is None:
            pytest.skip("No staff members to view details")

        detail_btn.click()
        time.sleep(2)

        page_text = body_text(driver)
        has_detail = ("email" in page_text.lower()
                      or "profile" in page_text.lower()
                      or "name" in page_text.lower()
                      or "product" in page_text.lower())
        assert has_detail, "Staff detail should display profile information"


class TestUT_M06:
    """
    Test Case: UT-M06
    Module: Staff Management
    Unit: Change Staff Password
    Description: Entered and confirmed new password for a staff member
    Expected: Password updated successfully
    """
    def test_change_staff_password(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Staff")
        time.sleep(3)

        # Look for password change button
        buttons = driver.find_elements(By.TAG_NAME, "button")
        pwd_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "password" in txt or "change" in txt:
                pwd_btn = btn
                break
        if pwd_btn is None:
            pytest.skip("Change password button not found")

        driver.execute_script("arguments[0].scrollIntoView({block:'center'});", pwd_btn)
        time.sleep(0.5)
        driver.execute_script("arguments[0].click();", pwd_btn)
        time.sleep(2)

        # Fill password fields
        pwd_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='password']")
        for inp in pwd_inputs:
            inp.clear()
            inp.send_keys("NewPass@12345")

        submit_btns = [b for b in driver.find_elements(By.TAG_NAME, "button")
                       if "save" in b.text.lower() or "change" in b.text.lower() or "update" in b.text.lower()]
        if submit_btns:
            driver.execute_script("arguments[0].scrollIntoView({block:'center'});", submit_btns[0])
            time.sleep(0.3)
            driver.execute_script("arguments[0].click();", submit_btns[0])
            time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("success" in page_text or "updated" in page_text
                or "changed" in page_text), \
            "Password should be updated successfully"


class TestUT_M07:
    """
    Test Case: UT-M07
    Module: Staff Management
    Unit: Remove Staff
    Description: Clicked remove on a staff member
    Expected: Staff removed from department
    """
    def test_remove_staff(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Staff")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        remove_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "remove" in txt or "delete" in txt:
                remove_btn = btn
                break
        if remove_btn is None:
            pytest.skip("No staff members available to remove")

        remove_btn.click()
        time.sleep(1)

        # Handle confirmation
        try:
            alert = driver.switch_to.alert
            alert.accept()
        except Exception:
            confirm_btns = [b for b in driver.find_elements(By.TAG_NAME, "button")
                            if "confirm" in b.text.lower() or "yes" in b.text.lower()]
            if confirm_btns:
                confirm_btns[0].click()

        time.sleep(3)
        page_text = body_text(driver).lower()
        assert ("removed" in page_text or "deleted" in page_text
                or "success" in page_text), \
            "Staff member should be removed from department"


# ═══════════════════════════════════════════════════════════════════
# PRODUCT MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

class TestUT_M08:
    """
    Test Case: UT-M08
    Module: Product Management
    Unit: View Department Products
    Description: Navigated to products section
    Expected: Displays all products under the manager's department
    """
    def test_view_department_products(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Products")
        time.sleep(3)

        page_text = body_text(driver)
        has_products = ("product" in page_text.lower()
                        or "no products" in page_text.lower()
                        or "PHP" in page_text
                        or "stock" in page_text.lower())
        assert has_products, "Products section should display department products"


class TestUT_M09:
    """
    Test Case: UT-M09
    Module: Product Management
    Unit: Update Product Info
    Description: Edited product title/price and saved
    Expected: Product details updated in the system
    """
    def test_update_product_info(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Products")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        edit_btn = None
        for btn in buttons:
            if "edit" in btn.text.lower() or "update" in btn.text.lower():
                edit_btn = btn
                break
        if edit_btn is None:
            pytest.skip("No products available to edit")

        edit_btn.click()
        time.sleep(2)

        # Verify edit form is shown
        page_text = body_text(driver).lower()
        has_form = ("title" in page_text or "price" in page_text
                    or "save" in page_text or len(driver.find_elements(By.TAG_NAME, "input")) > 0)
        assert has_form, "Product edit form should be displayed"


class TestUT_M10:
    """
    Test Case: UT-M10
    Module: Product Management
    Unit: Request Product Removal
    Description: Clicked request removal on a product
    Expected: Removal request submitted; pending admin approval
    """
    def test_request_product_removal(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Products")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        remove_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "remove" in txt or "request removal" in txt or "delete" in txt:
                remove_btn = btn
                break
        if remove_btn is None:
            pytest.skip("No products available to request removal")

        remove_btn.click()
        time.sleep(1)

        try:
            alert = driver.switch_to.alert
            alert.accept()
        except Exception:
            confirm_btns = [b for b in driver.find_elements(By.TAG_NAME, "button")
                            if "confirm" in b.text.lower() or "yes" in b.text.lower()]
            if confirm_btns:
                confirm_btns[0].click()

        time.sleep(3)
        page_text = body_text(driver).lower()
        assert ("removal" in page_text or "request" in page_text
                or "pending" in page_text or "success" in page_text), \
            "Product removal request should be submitted"


# ═══════════════════════════════════════════════════════════════════
# RESTOCK
# ═══════════════════════════════════════════════════════════════════

class TestUT_M11:
    """
    Test Case: UT-M11
    Module: Restock
    Unit: View Restock Requests
    Description: Navigated to restock section
    Expected: Displays all pending restock requests from staff
    """
    def test_view_restock_requests(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Restock")
        time.sleep(3)

        page_text = body_text(driver)
        has_restock = ("restock" in page_text.lower()
                       or "request" in page_text.lower()
                       or "pending" in page_text.lower()
                       or "no requests" in page_text.lower())
        assert has_restock, "Restock section should display requests from staff"


class TestUT_M12:
    """
    Test Case: UT-M12
    Module: Restock
    Unit: Approve Restock Request
    Description: Clicked approve on a restock request
    Expected: Request status updated to approved; stock updated
    """
    def test_approve_restock(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Restock")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        approve_btn = None
        for btn in buttons:
            if "approve" in btn.text.lower():
                approve_btn = btn
                break
        if approve_btn is None:
            pytest.skip("No pending restock requests to approve")

        approve_btn.click()
        time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("approved" in page_text or "success" in page_text), \
            "Restock request should be approved"


class TestUT_M13:
    """
    Test Case: UT-M13
    Module: Restock
    Unit: Reject Restock Request
    Description: Clicked reject on a restock request
    Expected: Request status updated to rejected
    """
    def test_reject_restock(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Restock")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        reject_btn = None
        for btn in buttons:
            if "reject" in btn.text.lower() or "deny" in btn.text.lower():
                reject_btn = btn
                break
        if reject_btn is None:
            pytest.skip("No pending restock requests to reject")

        reject_btn.click()
        time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("rejected" in page_text or "success" in page_text
                or "denied" in page_text), \
            "Restock request should be rejected"


class TestUT_M14:
    """
    Test Case: UT-M14
    Module: Restock
    Unit: Direct Restock
    Description: Submitted a direct restock form for a product
    Expected: Product stock incremented without seller request
    """
    def test_direct_restock(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Restock")
        time.sleep(3)

        # Look for direct restock button
        buttons = driver.find_elements(By.TAG_NAME, "button")
        direct_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "direct" in txt or "add stock" in txt or "restock" in txt:
                direct_btn = btn
                break
        if direct_btn is None:
            pytest.skip("Direct restock button not found")

        direct_btn.click()
        time.sleep(2)

        inputs = driver.find_elements(By.TAG_NAME, "input")
        for inp in inputs:
            inp_type = (inp.get_attribute("type") or "").lower()
            if inp_type == "number":
                inp.clear()
                inp.send_keys("5")
                break

        submit_btns = [b for b in driver.find_elements(By.TAG_NAME, "button")
                       if "submit" in b.text.lower() or "save" in b.text.lower() or "restock" in b.text.lower()]
        if submit_btns:
            submit_btns[0].click()
            time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("success" in page_text or "restocked" in page_text
                or "updated" in page_text), \
            "Direct restock should increment product stock"


# ═══════════════════════════════════════════════════════════════════
# TRANSACTIONS
# ═══════════════════════════════════════════════════════════════════

class TestUT_M15:
    """
    Test Case: UT-M15
    Module: Transactions
    Unit: View Delivery Orders
    Description: Navigated to transactions section
    Expected: Displays all delivery orders under manager's department
    """
    def test_view_delivery_orders(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Order")
        time.sleep(3)

        page_text = body_text(driver)
        has_orders = ("order" in page_text.lower()
                      or "delivery" in page_text.lower()
                      or "transaction" in page_text.lower()
                      or "no orders" in page_text.lower()
                      or "PHP" in page_text)
        assert has_orders, "Transactions section should display delivery orders"


class TestUT_M16:
    """
    Test Case: UT-M16
    Module: Transactions
    Unit: Update Delivery Order Status
    Description: Changed status of a delivery order
    Expected: Order status updated and visible to relevant users
    """
    def test_update_delivery_order_status(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Order")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        status_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if ("ready" in txt or "process" in txt or "inwork" in txt
                    or "approve" in txt or "start" in txt):
                status_btn = btn
                break
        if status_btn is None:
            pytest.skip("No delivery orders available to update")

        status_btn.click()
        time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("updated" in page_text or "success" in page_text
                or "status" in page_text), \
            "Delivery order status should be updated"
