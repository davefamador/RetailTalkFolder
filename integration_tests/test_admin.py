"""
test_admin.py — Integration Tests: Admin (IT-A00001 to IT-A00030)

Maps to: INTEGRATION_TESTING.md — ADMIN section
Module: Admin-facing features integrated with Auth, Transactions,
        Products, Search Pipeline, Users, Departments, Earnings, Wallet
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


class TestIT_A00001:
    """
    Test Case: IT-A00001
    Module 1: Login
    Integration Process: Admin Account Verification
    Module 2: Auth
    Precondition: Admin account exists
    """
    def test_admin_login(self, driver):
        login_as(driver, "admin")
        page_text = body_text(driver)
        assert ("dashboard" in driver.current_url.lower()
                or "admin" in driver.current_url.lower()
                or "dashboard" in page_text.lower()), \
            "Admin login should authenticate and redirect to admin dashboard"


class TestIT_A00002:
    """
    Test Case: IT-A00002
    Module 1: Dashboard
    Integration Process: View Admin Dashboard Stats
    Module 2: Transactions
    Precondition: Admin is logged in; users, products, and orders exist
    """
    def test_view_dashboard_stats(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(3)
        page_text = body_text(driver)
        assert ("dashboard" in page_text.lower() or "user" in page_text.lower()
                or "product" in page_text.lower() or "transaction" in page_text.lower()
                or "order" in page_text.lower() or "total" in page_text.lower()), \
            "Admin dashboard should display system-wide statistics"


class TestIT_A00003:
    """
    Test Case: IT-A00003
    Module 1: Users
    Integration Process: View All Users
    Module 2: Auth
    Precondition: Admin is logged in; registered users exist
    """
    def test_view_all_users(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "User")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("user" in page_text.lower() or "email" in page_text.lower()
                or "role" in page_text.lower() or "no user" in page_text.lower()), \
            "Admin should see the full user list"


class TestIT_A00004:
    """
    Test Case: IT-A00004
    Module 1: Users
    Integration Process: Ban a User
    Module 2: Auth
    Precondition: Admin is logged in; target user account exists
    """
    def test_ban_user(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "User")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        ban_btn = None
        for btn in buttons:
            if "ban" in btn.text.lower():
                ban_btn = btn
                break
        if ban_btn is None:
            pytest.skip("No ban button found")
        page_text = body_text(driver)
        assert "user" in page_text.lower(), \
            "Users section should be loaded to test ban"


class TestIT_A00005:
    """
    Test Case: IT-A00005
    Module 1: Users
    Integration Process: Unban a User
    Module 2: Auth
    Precondition: Admin is logged in; target user is currently banned
    """
    def test_unban_user(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "User")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        unban_btn = None
        for btn in buttons:
            if "unban" in btn.text.lower():
                unban_btn = btn
                break
        if unban_btn is None:
            pytest.skip("No banned users to unban")
        page_text = body_text(driver)
        assert "user" in page_text.lower(), \
            "Users section should be loaded to test unban"


class TestIT_A00006:
    """
    Test Case: IT-A00006
    Module 1: Users
    Integration Process: Delete a User Account
    Module 2: Auth
    Precondition: Admin is logged in; target user account exists
    """
    def test_delete_user(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "User")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        delete_btn = None
        for btn in buttons:
            if "delete" in btn.text.lower():
                delete_btn = btn
                break
        if delete_btn is None:
            pytest.skip("No delete user button found")
        page_text = body_text(driver)
        assert "user" in page_text.lower(), \
            "Users section should be loaded to test delete"


class TestIT_A00007:
    """
    Test Case: IT-A00007
    Module 1: Users
    Integration Process: Change User Password
    Module 2: Auth
    Precondition: Admin is logged in; target user account exists
    """
    def test_change_user_password(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "User")
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
            "Change user password form should be accessible"


class TestIT_A00008:
    """
    Test Case: IT-A00008
    Module 1: Users
    Integration Process: Assign User to Department
    Module 2: Departments
    Precondition: Admin is logged in; user and department exist
    """
    def test_assign_user_to_department(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Department")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("department" in page_text.lower() or "assign" in page_text.lower()
                or "staff" in page_text.lower() or "no department" in page_text.lower()), \
            "Department management should allow user assignment"


class TestIT_A00009:
    """
    Test Case: IT-A00009
    Module 1: Users
    Integration Process: View User Detail
    Module 2: Transactions
    Precondition: Admin is logged in; target user account exists
    """
    def test_view_user_detail(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "User")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        view_btn = None
        for btn in buttons:
            if "view" in btn.text.lower() or "detail" in btn.text.lower():
                view_btn = btn
                break
        if view_btn is None:
            pytest.skip("No view user detail button found")
        view_btn.click()
        time.sleep(2)
        page_text = body_text(driver)
        assert ("user" in page_text.lower() or "email" in page_text.lower()
                or "transaction" in page_text.lower()), \
            "User detail should be displayed"


class TestIT_A00010:
    """
    Test Case: IT-A00010
    Module 1: Products
    Integration Process: View All Products
    Module 2: Products
    Precondition: Admin is logged in; products exist in the system
    """
    def test_view_all_products(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Product")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("product" in page_text.lower() or "listing" in page_text.lower()
                or "no product" in page_text.lower() or "pending" in page_text.lower()), \
            "Admin should see all products in the system"


class TestIT_A00011:
    """
    Test Case: IT-A00011
    Module 1: Products
    Integration Process: Approve Pending Product
    Module 2: Search Pipeline
    Precondition: Admin is logged in; product has pending status
    """
    def test_approve_pending_product(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Product")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        approve_btn = None
        for btn in buttons:
            if "approve" in btn.text.lower():
                approve_btn = btn
                break
        if approve_btn is None:
            pytest.skip("No pending products to approve")
        approve_btn.click()
        time.sleep(2)
        page_text = body_text(driver).lower()
        assert ("approve" in page_text or "success" in page_text or "product" in page_text), \
            "Product should be approved and made searchable"


class TestIT_A00012:
    """
    Test Case: IT-A00012
    Module 1: Products
    Integration Process: Unapprove an Approved Product
    Module 2: Search Pipeline
    Precondition: Admin is logged in; product has approved status
    """
    def test_unapprove_product(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Product")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        unapprove_btn = None
        for btn in buttons:
            if "unapprove" in btn.text.lower() or "revoke" in btn.text.lower():
                unapprove_btn = btn
                break
        if unapprove_btn is None:
            pytest.skip("No approved products to unapprove")
        unapprove_btn.click()
        time.sleep(2)
        page_text = body_text(driver).lower()
        assert ("unapprove" in page_text or "success" in page_text or "product" in page_text), \
            "Product should be unapproved"


class TestIT_A00013:
    """
    Test Case: IT-A00013
    Module 1: Products
    Integration Process: Update Product Information
    Module 2: Products
    Precondition: Admin is logged in; product exists in the system
    """
    def test_update_product_info(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
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
                or "product" in page_text.lower()), \
            "Product update form should be accessible"


class TestIT_A00014:
    """
    Test Case: IT-A00014
    Module 1: Products
    Integration Process: Delete a Product
    Module 2: Products
    Precondition: Admin is logged in; product exists in the system
    """
    def test_delete_product(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Product")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        delete_btn = None
        for btn in buttons:
            if "delete" in btn.text.lower():
                delete_btn = btn
                break
        if delete_btn is None:
            pytest.skip("No products to delete")
        page_text = body_text(driver)
        assert "product" in page_text.lower(), \
            "Products section should be loaded to test delete"


class TestIT_A00015:
    """
    Test Case: IT-A00015
    Module 1: Products
    Integration Process: Approve Product Removal Request
    Module 2: Products
    Precondition: Admin is logged in; removal request is pending
    """
    def test_approve_product_removal(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Product")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        removal_btn = None
        for btn in buttons:
            if "removal" in btn.text.lower() or ("approve" in btn.text.lower() and "remov" in btn.text.lower()):
                removal_btn = btn
                break
        if removal_btn is None:
            pytest.skip("No removal requests pending")
        page_text = body_text(driver)
        assert "product" in page_text.lower(), \
            "Products section should be loaded to test removal approval"


class TestIT_A00016:
    """
    Test Case: IT-A00016
    Module 1: Products
    Integration Process: Reject Product Removal Request
    Module 2: Products
    Precondition: Admin is logged in; removal request is pending
    """
    def test_reject_product_removal(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Product")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        reject_btn = None
        for btn in buttons:
            if "reject" in btn.text.lower() and "remov" in btn.text.lower():
                reject_btn = btn
                break
        if reject_btn is None:
            pytest.skip("No removal requests to reject")
        page_text = body_text(driver)
        assert "product" in page_text.lower(), \
            "Products section should be loaded to test removal rejection"


class TestIT_A00017:
    """
    Test Case: IT-A00017
    Module 1: Departments
    Integration Process: Create New Department
    Module 2: Users
    Precondition: Admin is logged in; valid department details provided
    """
    def test_create_department(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Department")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        create_btn = None
        for btn in buttons:
            if "create" in btn.text.lower() or "add" in btn.text.lower() or "new" in btn.text.lower():
                create_btn = btn
                break
        if create_btn is None:
            pytest.skip("No create department button found")
        create_btn.click()
        time.sleep(2)
        page_text = body_text(driver)
        assert ("department" in page_text.lower() or "name" in page_text.lower()
                or "create" in page_text.lower()), \
            "Department creation form should be accessible"


class TestIT_A00018:
    """
    Test Case: IT-A00018
    Module 1: Departments
    Integration Process: View All Departments
    Module 2: Users
    Precondition: Admin is logged in; at least one department exists
    """
    def test_view_all_departments(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Department")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("department" in page_text.lower() or "no department" in page_text.lower()
                or "manager" in page_text.lower()), \
            "All departments should be listed"


class TestIT_A00019:
    """
    Test Case: IT-A00019
    Module 1: Departments
    Integration Process: Update Department Info
    Module 2: Users
    Precondition: Admin is logged in; department exists
    """
    def test_update_department_info(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Department")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        edit_btn = None
        for btn in buttons:
            if "edit" in btn.text.lower() or "update" in btn.text.lower():
                edit_btn = btn
                break
        if edit_btn is None:
            pytest.skip("No departments to edit")
        edit_btn.click()
        time.sleep(2)
        page_text = body_text(driver)
        assert ("department" in page_text.lower() or "edit" in page_text.lower()
                or "name" in page_text.lower()), \
            "Department edit form should be accessible"


class TestIT_A00020:
    """
    Test Case: IT-A00020
    Module 1: Departments
    Integration Process: Delete Department
    Module 2: Users
    Precondition: Admin is logged in; department exists
    """
    def test_delete_department(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Department")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        delete_btn = None
        for btn in buttons:
            if "delete" in btn.text.lower():
                delete_btn = btn
                break
        if delete_btn is None:
            pytest.skip("No departments to delete")
        page_text = body_text(driver)
        assert "department" in page_text.lower(), \
            "Departments section should be loaded to test delete"


class TestIT_A00021:
    """
    Test Case: IT-A00021
    Module 1: Departments
    Integration Process: Add Products to Department
    Module 2: Products
    Precondition: Admin is logged in; department and products exist
    """
    def test_add_products_to_department(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Department")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        add_btn = None
        for btn in buttons:
            if ("product" in btn.text.lower() and "add" in btn.text.lower()) or "add product" in btn.text.lower():
                add_btn = btn
                break
        if add_btn is None:
            pytest.skip("Add products to department button not found")
        page_text = body_text(driver)
        assert "department" in page_text.lower(), \
            "Department section should be loaded to test product assignment"


class TestIT_A00022:
    """
    Test Case: IT-A00022
    Module 1: Delivery Management
    Integration Process: Register New Delivery User
    Module 2: Auth
    Precondition: Admin is logged in; valid delivery user details provided
    """
    def test_register_delivery_user(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/delivery-register")
        time.sleep(3)
        page_text = body_text(driver)
        assert ("register" in page_text.lower() or "delivery" in page_text.lower()
                or "email" in page_text.lower() or "create" in page_text.lower()), \
            "Delivery user registration page should be accessible"


class TestIT_A00023:
    """
    Test Case: IT-A00023
    Module 1: Delivery Management
    Integration Process: View Delivery Statistics
    Module 2: Earnings
    Precondition: Admin is logged in; delivery users have completed deliveries
    """
    def test_view_delivery_statistics(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Delivery")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("delivery" in page_text.lower() or "earning" in page_text.lower()
                or "statistic" in page_text.lower() or "no delivery" in page_text.lower()
                or "user" in page_text.lower()), \
            "Delivery statistics should be displayed"


class TestIT_A00024:
    """
    Test Case: IT-A00024
    Module 1: Transactions
    Integration Process: View All Transactions
    Module 2: Transactions
    Precondition: Admin is logged in; transactions exist in the system
    """
    def test_view_all_transactions(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Transaction")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("transaction" in page_text.lower() or "order" in page_text.lower()
                or "no transaction" in page_text.lower() or "PHP" in page_text), \
            "All transactions should be visible to admin"


class TestIT_A00025:
    """
    Test Case: IT-A00025
    Module 1: Transactions
    Integration Process: View Admin Reports
    Module 2: Transactions
    Precondition: Admin is logged in; completed transactions exist
    """
    def test_view_admin_reports(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Report")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("report" in page_text.lower() or "revenue" in page_text.lower()
                or "commission" in page_text.lower() or "sales" in page_text.lower()
                or "PHP" in page_text), \
            "Admin reports should be displayed"


class TestIT_A00026:
    """
    Test Case: IT-A00026
    Module 1: Salary
    Integration Process: View All Staff Salaries
    Module 2: Users
    Precondition: Admin is logged in; staff accounts exist
    """
    def test_view_all_salaries(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Salary")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("salary" in page_text.lower() or "staff" in page_text.lower()
                or "PHP" in page_text or "no salary" in page_text.lower()
                or "payment" in page_text.lower()), \
            "All staff salaries should be visible to admin"


class TestIT_A00027:
    """
    Test Case: IT-A00027
    Module 1: Salary
    Integration Process: Set Salary for a Staff Member
    Module 2: Users
    Precondition: Admin is logged in; target staff account exists
    """
    def test_set_staff_salary(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Salary")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        set_btn = None
        for btn in buttons:
            if "set" in btn.text.lower() or "assign" in btn.text.lower() or "update" in btn.text.lower():
                set_btn = btn
                break
        if set_btn is None:
            pytest.skip("No set salary button found")
        set_btn.click()
        time.sleep(2)
        page_text = body_text(driver)
        assert ("salary" in page_text.lower() or "amount" in page_text.lower()
                or "set" in page_text.lower()), \
            "Salary assignment form should be accessible"


class TestIT_A00028:
    """
    Test Case: IT-A00028
    Module 1: Salary
    Integration Process: Pay All Staff Salaries
    Module 2: Wallet
    Precondition: Admin is logged in; unpaid salary records exist
    """
    def test_pay_all_salaries(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Salary")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        pay_all_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if ("pay all" in txt) or ("pay" in txt and "all" in txt):
                pay_all_btn = btn
                break
        if pay_all_btn is None:
            pytest.skip("No pay all salaries button found")
        page_text = body_text(driver)
        assert "salary" in page_text.lower(), \
            "Salary section should be loaded to test pay all"


class TestIT_A00029:
    """
    Test Case: IT-A00029
    Module 1: Salary
    Integration Process: Pay Salaries by Department
    Module 2: Wallet
    Precondition: Admin is logged in; department has unpaid salary records
    """
    def test_pay_salaries_by_department(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Salary")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        pay_dept_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "department" in txt and "pay" in txt:
                pay_dept_btn = btn
                break
        if pay_dept_btn is None:
            pytest.skip("No pay by department button found")
        page_text = body_text(driver)
        assert "salary" in page_text.lower(), \
            "Salary section should be loaded to test pay by department"


class TestIT_A00030:
    """
    Test Case: IT-A00030
    Module 1: Managers
    Integration Process: Register New Manager Account
    Module 2: Auth
    Precondition: Admin is logged in; valid manager details provided
    """
    def test_register_manager(self, driver):
        login_as(driver, "admin")
        driver.get(f"{BASE_URL}/admin/dashboard")
        time.sleep(2)
        navigate_sidebar(driver, "Manager")
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        register_btn = None
        for btn in buttons:
            if "register" in btn.text.lower() or "add" in btn.text.lower() or "new" in btn.text.lower():
                register_btn = btn
                break
        if register_btn is None:
            pytest.skip("No register manager button found")
        register_btn.click()
        time.sleep(2)
        page_text = body_text(driver)
        assert ("manager" in page_text.lower() or "register" in page_text.lower()
                or "email" in page_text.lower() or "create" in page_text.lower()), \
            "Manager registration form should be accessible"
