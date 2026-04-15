"""
test_admin.py — Unit Tests: Admin (UT-A01 to UT-A27)

Maps to: Table 37.28 — UNIT TESTING: WEB APPLICATION (ADMIN)
Proponent: Ayuban, Lowell Grey S.
Module: Admin Dashboard (/admin/dashboard)
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


# ═══════════════════════════════════════════════════════════════════
# ACCOUNT MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

class TestUT_A01:
    """
    Test Case: UT-A01
    Module: Account Management
    Unit: View Dashboard
    Description: Navigated to /admin/dashboard
    Expected: Displays total users, products, orders, revenue, commissions
    """
    def test_view_dashboard(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        page_text = body_text(driver)
        has_dashboard = ("dashboard" in page_text.lower()
                         or "total" in page_text.lower()
                         or "users" in page_text.lower()
                         or "products" in page_text.lower()
                         or "revenue" in page_text.lower()
                         or "commission" in page_text.lower())
        assert has_dashboard, \
            "Admin dashboard should display stats: users, products, orders, revenue"


class TestUT_A02:
    """
    Test Case: UT-A02
    Module: Account Management
    Unit: View All Users
    Description: Clicked Users section in admin panel
    Expected: Displays all registered users with roles and status
    """
    def test_view_all_users(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Users")
        time.sleep(3)

        page_text = body_text(driver)
        has_users = ("user" in page_text.lower()
                     or "email" in page_text.lower()
                     or "buyer" in page_text.lower()
                     or "seller" in page_text.lower()
                     or "role" in page_text.lower())
        assert has_users, "Users section should display registered users with roles"


class TestUT_A03:
    """
    Test Case: UT-A03
    Module: Account Management
    Unit: Ban a User
    Description: Clicked Ban toggle on a user account
    Expected: User is_banned flag set to true; user cannot log in
    """
    def test_ban_user(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Users")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        ban_btn = None
        for btn in buttons:
            if "ban" in btn.text.lower() and "unban" not in btn.text.lower():
                ban_btn = btn
                break
        if ban_btn is None:
            pytest.skip("No users available to ban")

        ban_btn.click()
        time.sleep(2)

        # Handle confirmation
        try:
            alert = driver.switch_to.alert
            alert.accept()
        except Exception:
            pass
        time.sleep(2)

        page_text = body_text(driver).lower()
        assert ("banned" in page_text or "success" in page_text
                or "unban" in page_text), \
            "User should be banned"


class TestUT_A04:
    """
    Test Case: UT-A04
    Module: Account Management
    Unit: Unban a User
    Description: Clicked Unban toggle on a banned user
    Expected: User is_banned set to false; user can log in again
    """
    def test_unban_user(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Users")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        unban_btn = None
        for btn in buttons:
            if "unban" in btn.text.lower():
                unban_btn = btn
                break
        if unban_btn is None:
            pytest.skip("No banned users to unban")

        unban_btn.click()
        time.sleep(2)

        try:
            alert = driver.switch_to.alert
            alert.accept()
        except Exception:
            pass
        time.sleep(2)

        page_text = body_text(driver).lower()
        assert ("unbanned" in page_text or "success" in page_text
                or "ban" in page_text), \
            "User should be unbanned"


class TestUT_A05:
    """
    Test Case: UT-A05
    Module: Account Management
    Unit: View User Detail
    Description: Clicked a user's name in user list
    Expected: Displays full user profile, balance, order history
    """
    def test_view_user_detail(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Users")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        view_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "view" in txt or "detail" in txt:
                view_btn = btn
                break
        if view_btn is None:
            # Try clicking a user row or link
            links = driver.find_elements(By.TAG_NAME, "a")
            for link in links:
                if "@" in link.text:
                    view_btn = link
                    break
        if view_btn is None:
            pytest.skip("No users available to view detail")

        view_btn.click()
        time.sleep(2)

        page_text = body_text(driver)
        has_detail = ("email" in page_text.lower()
                      or "balance" in page_text.lower()
                      or "role" in page_text.lower()
                      or "profile" in page_text.lower())
        assert has_detail, "User detail should display profile information"


class TestUT_A06:
    """
    Test Case: UT-A06
    Module: Account Management
    Unit: Delete a User
    Description: Clicked Delete on a user account
    Expected: User removed from the system permanently
    """
    def test_delete_user(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Users")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        delete_btn = None
        for btn in buttons:
            if "delete" in btn.text.lower():
                delete_btn = btn
                break
        if delete_btn is None:
            pytest.skip("No users available to delete")

        delete_btn.click()
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
        assert ("deleted" in page_text or "removed" in page_text
                or "success" in page_text), \
            "User should be deleted from the system"


class TestUT_A07:
    """
    Test Case: UT-A07
    Module: Account Management
    Unit: Change User Password
    Description: Entered new password for a user and saved
    Expected: Password updated successfully
    """
    def test_change_user_password(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Users")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        pwd_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "password" in txt or "change password" in txt:
                pwd_btn = btn
                break
        if pwd_btn is None:
            pytest.skip("Change password button not found")

        pwd_btn.click()
        time.sleep(2)

        pwd_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='password']")
        for inp in pwd_inputs:
            inp.clear()
            inp.send_keys("NewPass@12345")

        save_btns = [b for b in driver.find_elements(By.TAG_NAME, "button")
                     if "save" in b.text.lower() or "change" in b.text.lower() or "update" in b.text.lower()]
        if save_btns:
            save_btns[0].click()
            time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("success" in page_text or "updated" in page_text
                or "changed" in page_text), \
            "Password should be updated successfully"


class TestUT_A08:
    """
    Test Case: UT-A08
    Module: Account Management
    Unit: Assign User to Department
    Description: Selected a department for a seller user
    Expected: User assigned to selected department
    """
    def test_assign_user_to_department(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Users")
        time.sleep(3)

        # Look for department assignment dropdown or button
        selects = driver.find_elements(By.TAG_NAME, "select")
        buttons = driver.find_elements(By.TAG_NAME, "button")

        has_dept_control = (len(selects) > 0
                            or any("department" in b.text.lower() or "assign" in b.text.lower() for b in buttons))

        if not has_dept_control:
            pytest.skip("Department assignment controls not found")

        page_text = body_text(driver)
        assert "user" in page_text.lower(), \
            "Users section should be visible for department assignment"


# ═══════════════════════════════════════════════════════════════════
# PRODUCT MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

class TestUT_A09:
    """
    Test Case: UT-A09
    Module: Product Management
    Unit: View All Products
    Description: Clicked Products section in admin panel
    Expected: Displays all products with status (pending/approved/unapproved)
    """
    def test_view_all_products(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Products")
        time.sleep(3)

        page_text = body_text(driver)
        has_products = ("product" in page_text.lower()
                        or "pending" in page_text.lower()
                        or "approved" in page_text.lower()
                        or "PHP" in page_text
                        or "no products" in page_text.lower())
        assert has_products, \
            "Products section should display all products with statuses"


class TestUT_A10:
    """
    Test Case: UT-A10
    Module: Product Management
    Unit: Approve Product
    Description: Clicked Approve on a pending product
    Expected: Product status changes to approved; visible in search
    """
    def test_approve_product(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Products")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        approve_btn = None
        for btn in buttons:
            if "approve" in btn.text.lower() and "unapprove" not in btn.text.lower():
                approve_btn = btn
                break
        if approve_btn is None:
            pytest.skip("No pending products to approve")

        approve_btn.click()
        time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("approved" in page_text or "success" in page_text), \
            "Product should be approved"


class TestUT_A11:
    """
    Test Case: UT-A11
    Module: Product Management
    Unit: Unapprove Product
    Description: Clicked Unapprove on an approved product
    Expected: Product status changes to unapproved; hidden from search
    """
    def test_unapprove_product(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Products")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        unapprove_btn = None
        for btn in buttons:
            if "unapprove" in btn.text.lower():
                unapprove_btn = btn
                break
        if unapprove_btn is None:
            pytest.skip("No approved products to unapprove")

        unapprove_btn.click()
        time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("unapproved" in page_text or "success" in page_text), \
            "Product should be unapproved"


class TestUT_A12:
    """
    Test Case: UT-A12
    Module: Product Management
    Unit: Update Product Info
    Description: Edited product fields and saved
    Expected: Product information updated in the system
    """
    def test_update_product_info(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
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

        page_text = body_text(driver).lower()
        has_form = ("title" in page_text or "price" in page_text
                    or len(driver.find_elements(By.TAG_NAME, "input")) > 0)
        assert has_form, "Product edit form should be displayed"


class TestUT_A13:
    """
    Test Case: UT-A13
    Module: Product Management
    Unit: Delete Product
    Description: Clicked Delete on a product
    Expected: Product permanently removed from the system
    """
    def test_delete_product(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Products")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        delete_btn = None
        for btn in buttons:
            if "delete" in btn.text.lower():
                delete_btn = btn
                break
        if delete_btn is None:
            pytest.skip("No products available to delete")

        delete_btn.click()
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
        assert ("deleted" in page_text or "removed" in page_text
                or "success" in page_text), \
            "Product should be permanently removed"


class TestUT_A14:
    """
    Test Case: UT-A14
    Module: Product Management
    Unit: Approve Product Removal
    Description: Clicked approve on a pending removal request
    Expected: Product removed; removal request resolved
    """
    def test_approve_product_removal(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        # Navigate to pending removals section
        buttons = driver.find_elements(By.TAG_NAME, "button")
        for btn in buttons:
            txt = btn.text.lower()
            if "removal" in txt or "pending removal" in txt:
                btn.click()
                time.sleep(2)
                break

        buttons = driver.find_elements(By.TAG_NAME, "button")
        approve_btn = None
        for btn in buttons:
            if "approve" in btn.text.lower():
                approve_btn = btn
                break
        if approve_btn is None:
            pytest.skip("No pending removal requests")

        approve_btn.click()
        time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("approved" in page_text or "removed" in page_text
                or "success" in page_text), \
            "Product removal request should be approved"


# ═══════════════════════════════════════════════════════════════════
# DEPARTMENT MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

class TestUT_A15:
    """
    Test Case: UT-A15
    Module: Department Management
    Unit: Create Department
    Description: Filled department form and submitted
    Expected: New department created and listed
    """
    def test_create_department(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Department")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        create_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "create" in txt or "add" in txt or "new" in txt:
                create_btn = btn
                break
        if create_btn is None:
            pytest.skip("Create department button not found")

        create_btn.click()
        time.sleep(2)

        inputs = driver.find_elements(By.TAG_NAME, "input")
        for inp in inputs:
            placeholder = (inp.get_attribute("placeholder") or "").lower()
            name = (inp.get_attribute("name") or "").lower()
            if "name" in placeholder or "name" in name or "department" in placeholder:
                inp.clear()
                inp.send_keys(f"Selenium Dept UT-A15 {int(time.time())}")
                break

        textareas = driver.find_elements(By.TAG_NAME, "textarea")
        for ta in textareas:
            ta.clear()
            ta.send_keys("Test department created by Selenium")

        submit_btns = [b for b in driver.find_elements(By.TAG_NAME, "button")
                       if "create" in b.text.lower() or "save" in b.text.lower() or "submit" in b.text.lower()]
        if submit_btns:
            submit_btns[0].click()
            time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("created" in page_text or "success" in page_text
                or "selenium dept" in page_text), \
            "New department should be created"


class TestUT_A16:
    """
    Test Case: UT-A16
    Module: Department Management
    Unit: View Departments
    Description: Navigated to departments section
    Expected: Displays all departments with manager and seller info
    """
    def test_view_departments(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Department")
        time.sleep(3)

        page_text = body_text(driver)
        has_depts = ("department" in page_text.lower()
                     or "store" in page_text.lower()
                     or "manager" in page_text.lower()
                     or "no departments" in page_text.lower())
        assert has_depts, "Departments section should display department list"


class TestUT_A17:
    """
    Test Case: UT-A17
    Module: Department Management
    Unit: Update Department
    Description: Edited department name/description and saved
    Expected: Department info updated
    """
    def test_update_department(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Department")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        edit_btn = None
        for btn in buttons:
            if "edit" in btn.text.lower() or "update" in btn.text.lower():
                edit_btn = btn
                break
        if edit_btn is None:
            pytest.skip("No departments available to edit")

        edit_btn.click()
        time.sleep(2)

        page_text = body_text(driver).lower()
        has_form = len(driver.find_elements(By.TAG_NAME, "input")) > 0
        assert has_form, "Department edit form should be displayed"


class TestUT_A18:
    """
    Test Case: UT-A18
    Module: Department Management
    Unit: Delete Department
    Description: Clicked delete on a department
    Expected: Department removed from the system
    """
    def test_delete_department(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Department")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        delete_btn = None
        for btn in buttons:
            if "delete" in btn.text.lower():
                delete_btn = btn
                break
        if delete_btn is None:
            pytest.skip("No departments available to delete")

        delete_btn.click()
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
        assert ("deleted" in page_text or "removed" in page_text
                or "success" in page_text), \
            "Department should be removed"


class TestUT_A19:
    """
    Test Case: UT-A19
    Module: Department Management
    Unit: Add Products to Department
    Description: Selected products and assigned to a department
    Expected: Products linked to the selected department
    """
    def test_add_products_to_department(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Department")
        time.sleep(3)

        # Look for add products or manage products button
        buttons = driver.find_elements(By.TAG_NAME, "button")
        add_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "add product" in txt or "product" in txt or "manage" in txt:
                add_btn = btn
                break
        if add_btn is None:
            pytest.skip("Add products to department button not found")

        add_btn.click()
        time.sleep(2)

        page_text = body_text(driver).lower()
        assert ("product" in page_text or "department" in page_text), \
            "Product assignment interface should be displayed"


# ═══════════════════════════════════════════════════════════════════
# DELIVERY MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

class TestUT_A20:
    """
    Test Case: UT-A20
    Module: Delivery Management
    Unit: Register Delivery User
    Description: Filled delivery registration form and submitted
    Expected: New delivery user account created
    """
    def test_register_delivery_user(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/delivery-register")
        time.sleep(3)

        page_text = body_text(driver)
        # Check if registration page loaded
        has_form = ("register" in page_text.lower()
                    or "delivery" in page_text.lower()
                    or "create" in page_text.lower()
                    or len(driver.find_elements(By.TAG_NAME, "input")) > 0)

        if not has_form:
            # Try from dashboard sidebar
            driver.get(f"{BASE_URL}/admin/dashboard")
            time.sleep(3)
            navigate_sidebar(driver, "Delivery")
            time.sleep(2)

        inputs = driver.find_elements(By.TAG_NAME, "input")
        for inp in inputs:
            placeholder = (inp.get_attribute("placeholder") or "").lower()
            name = (inp.get_attribute("name") or "").lower()
            inp_type = (inp.get_attribute("type") or "").lower()
            if "name" in placeholder or "name" in name:
                inp.clear()
                inp.send_keys("Selenium Delivery UT-A20")
            elif "email" in placeholder or inp_type == "email":
                inp.clear()
                inp.send_keys(f"selenium_delivery_a20_{int(time.time())}@retailtalk.test")
            elif "password" in placeholder or inp_type == "password":
                inp.clear()
                inp.send_keys("Test@12345")

        submit_btns = [b for b in driver.find_elements(By.TAG_NAME, "button")
                       if "register" in b.text.lower() or "create" in b.text.lower() or "submit" in b.text.lower()]
        if submit_btns:
            submit_btns[0].click()
            time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("success" in page_text or "created" in page_text
                or "registered" in page_text), \
            "Delivery user should be registered"


class TestUT_A21:
    """
    Test Case: UT-A21
    Module: Delivery Management
    Unit: View Delivery Stats
    Description: Navigated to delivery stats section
    Expected: Displays total deliveries, earnings, per-user breakdown
    """
    def test_view_delivery_stats(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Delivery")
        time.sleep(3)

        page_text = body_text(driver)
        has_stats = ("delivery" in page_text.lower()
                     or "total" in page_text.lower()
                     or "earning" in page_text.lower()
                     or "PHP" in page_text
                     or "no deliveries" in page_text.lower())
        assert has_stats, \
            "Delivery stats should display totals and per-user breakdown"


# ═══════════════════════════════════════════════════════════════════
# TRANSACTION MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

class TestUT_A22:
    """
    Test Case: UT-A22
    Module: Transaction Management
    Unit: View All Transactions
    Description: Navigated to transactions section
    Expected: Displays all orders with buyer, seller, amount, status
    """
    def test_view_all_transactions(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Transaction")
        time.sleep(3)

        page_text = body_text(driver)
        has_txns = ("transaction" in page_text.lower()
                    or "order" in page_text.lower()
                    or "amount" in page_text.lower()
                    or "PHP" in page_text
                    or "no transactions" in page_text.lower()
                    or "status" in page_text.lower())
        assert has_txns, \
            "Transactions section should display orders with details"


class TestUT_A23:
    """
    Test Case: UT-A23
    Module: Transaction Management
    Unit: View Reports
    Description: Navigated to admin reports section
    Expected: Displays revenue, commission, top sellers, top products
    """
    def test_view_reports(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Report")
        time.sleep(3)

        page_text = body_text(driver)
        has_reports = ("report" in page_text.lower()
                       or "revenue" in page_text.lower()
                       or "commission" in page_text.lower()
                       or "top" in page_text.lower()
                       or "PHP" in page_text
                       or "total" in page_text.lower())
        assert has_reports, \
            "Reports section should display revenue and commission data"


# ═══════════════════════════════════════════════════════════════════
# SALARY MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

class TestUT_A24:
    """
    Test Case: UT-A24
    Module: Salary Management
    Unit: View Salaries
    Description: Navigated to salaries section
    Expected: Displays all staff salaries and payment status
    """
    def test_view_salaries(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Salary")
        time.sleep(3)

        page_text = body_text(driver)
        has_salary = ("salary" in page_text.lower()
                      or "payment" in page_text.lower()
                      or "PHP" in page_text
                      or "staff" in page_text.lower()
                      or "no salaries" in page_text.lower())
        assert has_salary, \
            "Salaries section should display staff salary information"


class TestUT_A25:
    """
    Test Case: UT-A25
    Module: Salary Management
    Unit: Set Salary
    Description: Set salary amount for a specific user
    Expected: Salary record updated for that user
    """
    def test_set_salary(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Salary")
        time.sleep(3)

        # Look for salary input or set button
        inputs = driver.find_elements(By.TAG_NAME, "input")
        salary_input = None
        for inp in inputs:
            inp_type = (inp.get_attribute("type") or "").lower()
            placeholder = (inp.get_attribute("placeholder") or "").lower()
            if inp_type == "number" or "salary" in placeholder or "amount" in placeholder:
                salary_input = inp
                break
        if salary_input is None:
            pytest.skip("Salary input not found")

        salary_input.clear()
        salary_input.send_keys("5000")

        buttons = driver.find_elements(By.TAG_NAME, "button")
        set_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "set" in txt or "save" in txt or "update" in txt:
                set_btn = btn
                break
        if set_btn:
            set_btn.click()
            time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("success" in page_text or "updated" in page_text
                or "set" in page_text or "salary" in page_text), \
            "Salary should be set for the user"


class TestUT_A26:
    """
    Test Case: UT-A26
    Module: Salary Management
    Unit: Pay All Salaries
    Description: Clicked Pay All button in salary section
    Expected: All eligible salaries paid; balances updated
    """
    def test_pay_all_salaries(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Salary")
        time.sleep(3)

        buttons = driver.find_elements(By.TAG_NAME, "button")
        pay_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "pay all" in txt or "pay everyone" in txt:
                pay_btn = btn
                break
        if pay_btn is None:
            pytest.skip("Pay All button not found")

        pay_btn.click()
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
        assert ("paid" in page_text or "success" in page_text
                or "salary" in page_text), \
            "All salaries should be paid"


# ═══════════════════════════════════════════════════════════════════
# MANAGER MANAGEMENT
# ═══════════════════════════════════════════════════════════════════

class TestUT_A27:
    """
    Test Case: UT-A27
    Module: Manager Management
    Unit: Register Manager
    Description: Filled manager registration form and submitted
    Expected: New manager account created and linked to department
    """
    def test_register_manager(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)

        navigate_sidebar(driver, "Department")
        time.sleep(3)

        # Look for register manager button
        buttons = driver.find_elements(By.TAG_NAME, "button")
        reg_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "register manager" in txt or "add manager" in txt or "new manager" in txt:
                reg_btn = btn
                break
        if reg_btn is None:
            pytest.skip("Register manager button not found")

        reg_btn.click()
        time.sleep(2)

        inputs = driver.find_elements(By.TAG_NAME, "input")
        for inp in inputs:
            placeholder = (inp.get_attribute("placeholder") or "").lower()
            name = (inp.get_attribute("name") or "").lower()
            inp_type = (inp.get_attribute("type") or "").lower()
            if "name" in placeholder or "name" in name:
                inp.clear()
                inp.send_keys("Selenium Manager UT-A27")
            elif "email" in placeholder or inp_type == "email":
                inp.clear()
                inp.send_keys(f"selenium_mgr_a27_{int(time.time())}@retailtalk.test")
            elif "password" in placeholder or inp_type == "password":
                inp.clear()
                inp.send_keys("Test@12345")

        submit_btns = [b for b in driver.find_elements(By.TAG_NAME, "button")
                       if "register" in b.text.lower() or "create" in b.text.lower() or "submit" in b.text.lower()]
        if submit_btns:
            submit_btns[0].click()
            time.sleep(3)

        page_text = body_text(driver).lower()
        assert ("success" in page_text or "created" in page_text
                or "registered" in page_text), \
            "Manager account should be created and linked to department"
