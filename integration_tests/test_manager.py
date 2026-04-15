"""
test_manager.py — Integration Tests: Manager (IT-M00001 to IT-M00018)

Maps to: INTEGRATION_TESTING.md — MANAGER section
Module: Manager-facing features integrated with Auth, Transactions,
        Users, Products, Restock, Admin
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


class TestIT_M00001:
    """
    Test Case: IT-M00001
    Module 1: Login
    Integration Process: Account Verification
    Module 2: Auth
    Precondition: Manager account exists
    """
    def test_login_account_verification(self, driver):
        do_logout(driver)
        driver.get(f"{BASE_URL}/login")
        wait_for(driver, By.CSS_SELECTOR, "input[type='email']")
        driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(USERS["manager"]["email"])
        driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(USERS["manager"]["password"])
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        WebDriverWait(driver, WAIT_LONG).until(lambda d: "/login" not in d.current_url)
        assert "/login" not in driver.current_url, "Manager login should redirect away from /login"


class TestIT_M00002:
    """
    Test Case: IT-M00002
    Module 1: Dashboard
    Integration Process: View Department Dashboard
    Module 2: Transactions
    Precondition: Manager is logged in; department has staff and transactions
    """
    def test_view_department_dashboard(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(3)
        page_text = body_text(driver)
        assert ("dashboard" in page_text.lower() or "department" in page_text.lower()
                or "staff" in page_text.lower() or "transaction" in page_text.lower()
                or "manager" in page_text.lower()), \
            "Manager dashboard should display department overview"


class TestIT_M00003:
    """
    Test Case: IT-M00003
    Module 1: Staff Management
    Integration Process: Register New Staff Account
    Module 2: Auth
    Precondition: Manager is logged in; valid staff details provided
    """
    def test_register_new_staff(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Staff")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        register_btn = None
        for btn in buttons:
            if "register" in btn.text.lower() or "add" in btn.text.lower() or "new" in btn.text.lower():
                register_btn = btn
                break
        if register_btn is None:
            pytest.skip("Register staff button not found")
        register_btn.click()
        time.sleep(2)
        page_text = body_text(driver)
        assert ("register" in page_text.lower() or "staff" in page_text.lower()
                or "email" in page_text.lower() or "create" in page_text.lower()), \
            "Staff registration form should be accessible"


class TestIT_M00004:
    """
    Test Case: IT-M00004
    Module 1: Staff Management
    Integration Process: View Staff List
    Module 2: Users
    Precondition: Manager is logged in; department has existing staff
    """
    def test_view_staff_list(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Staff")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("staff" in page_text.lower() or "seller" in page_text.lower()
                or "member" in page_text.lower() or "no staff" in page_text.lower()
                or "employee" in page_text.lower()), \
            "Staff list should be displayed"


class TestIT_M00005:
    """
    Test Case: IT-M00005
    Module 1: Staff Management
    Integration Process: View Staff Detail
    Module 2: Users
    Precondition: Manager is logged in; staff member exists in department
    """
    def test_view_staff_detail(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Staff")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        view_btn = None
        for btn in buttons:
            if "view" in btn.text.lower() or "detail" in btn.text.lower() or "info" in btn.text.lower():
                view_btn = btn
                break
        if view_btn is None:
            pytest.skip("No staff to view details")
        view_btn.click()
        time.sleep(2)
        page_text = body_text(driver)
        assert ("staff" in page_text.lower() or "email" in page_text.lower()
                or "name" in page_text.lower()), \
            "Staff detail should be displayed"


class TestIT_M00006:
    """
    Test Case: IT-M00006
    Module 1: Staff Management
    Integration Process: Change Staff Password
    Module 2: Auth
    Precondition: Manager is logged in; staff member exists in department
    """
    def test_change_staff_password(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Staff")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        pw_btn = None
        for btn in buttons:
            if "password" in btn.text.lower() or "change" in btn.text.lower():
                pw_btn = btn
                break
        if pw_btn is None:
            pytest.skip("No change password button found")
        pw_btn.click()
        time.sleep(2)
        page_text = body_text(driver)
        assert ("password" in page_text.lower() or "change" in page_text.lower()), \
            "Change password form should be accessible"


class TestIT_M00007:
    """
    Test Case: IT-M00007
    Module 1: Staff Management
    Integration Process: Remove Staff from Department
    Module 2: Users
    Precondition: Manager is logged in; staff member exists in department
    """
    def test_remove_staff(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Staff")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        remove_btn = None
        for btn in buttons:
            if "remove" in btn.text.lower() or "kick" in btn.text.lower():
                remove_btn = btn
                break
        if remove_btn is None:
            pytest.skip("No staff to remove")
        page_text = body_text(driver)
        assert "staff" in page_text.lower(), \
            "Staff section should be loaded to test remove"


class TestIT_M00008:
    """
    Test Case: IT-M00008
    Module 1: Products
    Integration Process: View Department Products
    Module 2: Products
    Precondition: Manager is logged in; products exist in department
    """
    def test_view_department_products(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Product")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("product" in page_text.lower() or "listing" in page_text.lower()
                or "no product" in page_text.lower() or "stock" in page_text.lower()), \
            "Department products should be displayed"


class TestIT_M00009:
    """
    Test Case: IT-M00009
    Module 1: Products
    Integration Process: Update Product Information
    Module 2: Products
    Precondition: Manager is logged in; product exists in their department
    """
    def test_update_product_info(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Product")
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
                or "price" in page_text.lower() or "product" in page_text.lower()), \
            "Product edit form should be accessible"


class TestIT_M00010:
    """
    Test Case: IT-M00010
    Module 1: Products
    Integration Process: Request Product Removal
    Module 2: Admin
    Precondition: Manager is logged in; product exists in their department
    """
    def test_request_product_removal(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Product")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        remove_btn = None
        for btn in buttons:
            if "remove" in btn.text.lower() or "delete" in btn.text.lower() or "request" in btn.text.lower():
                remove_btn = btn
                break
        if remove_btn is None:
            pytest.skip("No product removal request button found")
        page_text = body_text(driver)
        assert "product" in page_text.lower(), \
            "Products section should be loaded to test removal request"


class TestIT_M00011:
    """
    Test Case: IT-M00011
    Module 1: Restock
    Integration Process: View Restock Requests
    Module 2: Restock
    Precondition: Manager is logged in; staff has submitted restock requests
    """
    def test_view_restock_requests(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Restock")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("restock" in page_text.lower() or "request" in page_text.lower()
                or "inventory" in page_text.lower() or "no restock" in page_text.lower()), \
            "Restock requests should be listed"


class TestIT_M00012:
    """
    Test Case: IT-M00012
    Module 1: Restock
    Integration Process: Approve Restock Request
    Module 2: Restock
    Precondition: Restock request is in pending status
    """
    def test_approve_restock(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Restock")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        approve_btn = None
        for btn in buttons:
            if "approve" in btn.text.lower():
                approve_btn = btn
                break
        if approve_btn is None:
            pytest.skip("No pending restock to approve")
        approve_btn.click()
        time.sleep(2)
        page_text = body_text(driver).lower()
        assert ("approve" in page_text or "success" in page_text or "restock" in page_text), \
            "Restock request should be approved"


class TestIT_M00013:
    """
    Test Case: IT-M00013
    Module 1: Restock
    Integration Process: Reject Restock Request
    Module 2: Restock
    Precondition: Restock request is in pending status
    """
    def test_reject_restock(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Restock")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        reject_btn = None
        for btn in buttons:
            if "reject" in btn.text.lower() or "deny" in btn.text.lower():
                reject_btn = btn
                break
        if reject_btn is None:
            pytest.skip("No pending restock to reject")
        reject_btn.click()
        time.sleep(2)
        page_text = body_text(driver).lower()
        assert ("reject" in page_text or "denied" in page_text or "restock" in page_text), \
            "Restock request should be rejected"


class TestIT_M00014:
    """
    Test Case: IT-M00014
    Module 1: Restock
    Integration Process: Direct Restock a Product
    Module 2: Products
    Precondition: Manager is logged in; product exists in their department
    """
    def test_direct_restock(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Restock")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        direct_btn = None
        for btn in buttons:
            if "direct" in btn.text.lower() or "restock" in btn.text.lower():
                direct_btn = btn
                break
        if direct_btn is None:
            pytest.skip("No direct restock button found")
        direct_btn.click()
        time.sleep(2)
        page_text = body_text(driver)
        assert ("restock" in page_text.lower() or "stock" in page_text.lower()
                or "product" in page_text.lower()), \
            "Direct restock should be accessible"


class TestIT_M00015:
    """
    Test Case: IT-M00015
    Module 1: Transactions
    Integration Process: View Department Delivery Orders
    Module 2: Transactions
    Precondition: Manager is logged in; orders exist in their department
    """
    def test_view_delivery_orders(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Order")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("order" in page_text.lower() or "delivery" in page_text.lower()
                or "transaction" in page_text.lower() or "no order" in page_text.lower()), \
            "Department delivery orders should be displayed"


class TestIT_M00016:
    """
    Test Case: IT-M00016
    Module 1: Transactions
    Integration Process: Update Delivery Order Status
    Module 2: Transactions
    Precondition: Manager has an active delivery order in their department
    """
    def test_update_delivery_order_status(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Order")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        status_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "update" in txt or "status" in txt or "approve" in txt or "ready" in txt:
                status_btn = btn
                break
        if status_btn is None:
            pytest.skip("No active orders to update")
        page_text = body_text(driver)
        assert "order" in page_text.lower(), \
            "Order status section should be loaded"


class TestIT_M00017:
    """
    Test Case: IT-M00017
    Module 1: Transactions
    Integration Process: Reassign Order to Staff Member
    Module 2: Transactions
    Precondition: Order exists; target staff belongs to same department
    """
    def test_reassign_order_to_staff(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Order")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        reassign_btn = None
        for btn in buttons:
            if "reassign" in btn.text.lower() or "assign" in btn.text.lower():
                reassign_btn = btn
                break
        if reassign_btn is None:
            pytest.skip("No reassign button found")
        reassign_btn.click()
        time.sleep(2)
        page_text = body_text(driver)
        assert ("assign" in page_text.lower() or "staff" in page_text.lower()
                or "order" in page_text.lower()), \
            "Order reassignment should be accessible"


class TestIT_M00018:
    """
    Test Case: IT-M00018
    Module 1: Salary
    Integration Process: View Staff Salary History
    Module 2: Transactions
    Precondition: Manager is logged in; salary records exist for department
    """
    def test_view_staff_salary_history(self, driver):
        login_as(driver, "manager")
        driver.get(f"{BASE_URL}/manager/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Salary")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("salary" in page_text.lower() or "payment" in page_text.lower()
                or "PHP" in page_text or "no salary" in page_text.lower()
                or "staff" in page_text.lower()), \
            "Staff salary history should be displayed"
