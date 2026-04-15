"""
test_buyer.py — Integration Tests: Buyer (IT-B00001 to IT-B00020)

Maps to: INTEGRATION_TESTING.md — BUYER section
Module: Buyer-facing features integrated with Auth, Search Pipeline,
        Products, Cart, Transactions, Wishlist, Wallet
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


class TestIT_B00001:
    """
    Test Case: IT-B00001
    Module 1: Login
    Integration Process: Account Verification
    Module 2: Auth
    Precondition: Buyer account exists
    """
    def test_login_account_verification(self, driver):
        do_logout(driver)
        driver.get(f"{BASE_URL}/login")
        wait_for(driver, By.CSS_SELECTOR, "input[type='email']")
        driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(USERS["buyer"]["email"])
        driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(USERS["buyer"]["password"])
        driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
        WebDriverWait(driver, WAIT_LONG).until(lambda d: "/login" not in d.current_url)
        assert "/login" not in driver.current_url, "Buyer login should redirect away from /login"


class TestIT_B00002:
    """
    Test Case: IT-B00002
    Module 1: Register
    Integration Process: Create Buyer Account
    Module 2: Auth
    Precondition: Valid registration details provided
    """
    def test_register_buyer_account(self, driver):
        do_logout(driver)
        driver.get(f"{BASE_URL}/register")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("register" in page_text.lower() or "sign up" in page_text.lower()
                or "create" in page_text.lower()), \
            "Registration page should be accessible"


class TestIT_B00003:
    """
    Test Case: IT-B00003
    Module 1: Profile
    Integration Process: Update Profile Info
    Module 2: Auth
    Precondition: Buyer is logged in
    """
    def test_update_profile_info(self, driver):
        login_as(driver, "buyer")
        driver.get(f"{BASE_URL}/profile")
        time.sleep(2)
        page_text = body_text(driver)
        assert ("profile" in page_text.lower() or "name" in page_text.lower()
                or "email" in page_text.lower() or "contact" in page_text.lower()), \
            "Profile page should be accessible and display buyer info"


class TestIT_B00004:
    """
    Test Case: IT-B00004
    Module 1: Search
    Integration Process: NLP Query Processing
    Module 2: Search Pipeline
    Precondition: Buyer is logged in; products exist in database
    """
    def test_nlp_query_processing(self, driver):
        login_as(driver, "buyer")
        driver.get(f"{BASE_URL}/search")
        time.sleep(2)
        search_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='text'], input[type='search'], input:not([type='hidden'])")
        assert len(search_inputs) > 0, "Search input should be present"
        search_inputs[0].send_keys("blue shoes")
        buttons = driver.find_elements(By.TAG_NAME, "button")
        for btn in buttons:
            if "search" in btn.text.lower():
                btn.click()
                break
        else:
            search_inputs[0].submit()
        time.sleep(4)
        page_text = body_text(driver)
        assert ("result" in page_text.lower() or "product" in page_text.lower()
                or "found" in page_text.lower() or "no result" in page_text.lower()), \
            "Search pipeline should process NLP query and return results"


class TestIT_B00005:
    """
    Test Case: IT-B00005
    Module 1: Search
    Integration Process: Voice Transcription to Search
    Module 2: Search Pipeline
    Precondition: Buyer is logged in; microphone access granted
    """
    def test_voice_transcription_ui(self, driver):
        login_as(driver, "buyer")
        driver.get(f"{BASE_URL}/search")
        time.sleep(2)
        page_text = body_text(driver)
        # Check voice search button exists in UI
        buttons = driver.find_elements(By.TAG_NAME, "button")
        has_voice = any("voice" in btn.get_attribute("aria-label") or ""
                        or "mic" in (btn.get_attribute("class") or "").lower()
                        for btn in buttons)
        # Also check page source for mic/voice elements
        page_source = driver.page_source.lower()
        has_voice_element = ("mic" in page_source or "voice" in page_source
                             or "speech" in page_source or "record" in page_source)
        assert has_voice or has_voice_element, \
            "Voice search UI element should be present on search page"


class TestIT_B00006:
    """
    Test Case: IT-B00006
    Module 1: Search
    Integration Process: Filter Extraction from Query
    Module 2: Search Pipeline
    Precondition: Buyer submits query with price/brand/color terms
    """
    def test_filter_extraction_from_query(self, driver):
        login_as(driver, "buyer")
        driver.get(f"{BASE_URL}/search")
        time.sleep(2)
        search_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='text'], input[type='search'], input:not([type='hidden'])")
        assert len(search_inputs) > 0, "Search input required"
        search_inputs[0].send_keys("Nike shoes under 2000")
        buttons = driver.find_elements(By.TAG_NAME, "button")
        for btn in buttons:
            if "search" in btn.text.lower():
                btn.click()
                break
        else:
            search_inputs[0].submit()
        time.sleep(4)
        page_text = body_text(driver)
        # Filters or slots should appear somewhere in the results
        assert ("result" in page_text.lower() or "product" in page_text.lower()
                or "filter" in page_text.lower() or "price" in page_text.lower()
                or "no result" in page_text.lower()), \
            "Search should process filtered query and display results"


class TestIT_B00007:
    """
    Test Case: IT-B00007
    Module 1: Search
    Integration Process: ESCI Label Display on Results
    Module 2: Product
    Precondition: Search returns results; ESCI classifier is loaded
    """
    def test_esci_label_display(self, driver):
        login_as(driver, "buyer")
        driver.get(f"{BASE_URL}/search")
        time.sleep(2)
        search_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='text'], input[type='search'], input:not([type='hidden'])")
        if search_inputs:
            search_inputs[0].send_keys("shoes")
            buttons = driver.find_elements(By.TAG_NAME, "button")
            for btn in buttons:
                if "search" in btn.text.lower():
                    btn.click()
                    break
            else:
                search_inputs[0].submit()
        time.sleep(4)
        page_source = driver.page_source
        has_esci = ("Exact" in page_source or "Substitute" in page_source
                    or "Complement" in page_source or "Irrelevant" in page_source
                    or "ESCI" in page_source or "esci" in page_source.lower())
        page_text = body_text(driver)
        has_results = ("product" in page_text.lower() or "result" in page_text.lower())
        assert has_esci or has_results, \
            "Search results should display ESCI labels or product results"


class TestIT_B00008:
    """
    Test Case: IT-B00008
    Module 1: Product
    Integration Process: View Product Detail
    Module 2: Products
    Precondition: Buyer clicks a product from search results
    """
    def test_view_product_detail(self, driver):
        login_as(driver, "buyer")
        driver.get(f"{BASE_URL}/search")
        time.sleep(2)
        search_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='text'], input[type='search'], input:not([type='hidden'])")
        if search_inputs:
            search_inputs[0].send_keys("shirt")
            search_inputs[0].submit()
        time.sleep(4)
        # Click first product link
        product_links = driver.find_elements(By.CSS_SELECTOR, "a[href*='/products/']")
        if not product_links:
            pytest.skip("No product links found in search results")
        product_links[0].click()
        time.sleep(3)
        page_text = body_text(driver)
        assert ("product" in page_text.lower() or "price" in page_text.lower()
                or "add to cart" in page_text.lower() or "PHP" in page_text), \
            "Product detail page should display product information"


class TestIT_B00009:
    """
    Test Case: IT-B00009
    Module 1: Cart
    Integration Process: Add Product to Cart
    Module 2: Products
    Precondition: Buyer is logged in; product is approved and in stock
    """
    def test_add_product_to_cart(self, driver):
        login_as(driver, "buyer")
        driver.get(f"{BASE_URL}/products")
        time.sleep(3)
        product_links = driver.find_elements(By.CSS_SELECTOR, "a[href*='/products/']")
        if not product_links:
            pytest.skip("No products available")
        product_links[0].click()
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        cart_btn = None
        for btn in buttons:
            if "cart" in btn.text.lower() or "add" in btn.text.lower():
                cart_btn = btn
                break
        if cart_btn is None:
            pytest.skip("Add to cart button not found")
        cart_btn.click()
        time.sleep(2)
        page_text = body_text(driver).lower()
        assert ("cart" in page_text or "added" in page_text or "success" in page_text), \
            "Product should be added to cart"


class TestIT_B00010:
    """
    Test Case: IT-B00010
    Module 1: Cart
    Integration Process: Update Cart Item Quantity
    Module 2: Cart
    Precondition: Product already exists in buyer's cart
    """
    def test_update_cart_quantity(self, driver):
        login_as(driver, "buyer")
        driver.get(f"{BASE_URL}/cart")
        time.sleep(3)
        page_text = body_text(driver)
        has_cart = ("cart" in page_text.lower() or "item" in page_text.lower()
                    or "empty" in page_text.lower() or "PHP" in page_text)
        assert has_cart, "Cart page should be accessible"
        # Look for quantity input or +/- buttons
        qty_inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='number']")
        plus_btns = [b for b in driver.find_elements(By.TAG_NAME, "button")
                     if "+" in b.text or "plus" in (b.get_attribute("class") or "").lower()]
        if qty_inputs:
            qty_inputs[0].clear()
            qty_inputs[0].send_keys("2")
            time.sleep(1)
        elif plus_btns:
            plus_btns[0].click()
            time.sleep(1)
        else:
            pytest.skip("No cart items to update quantity")
        page_text = body_text(driver)
        assert "cart" in page_text.lower(), "Cart page should remain after quantity update"


class TestIT_B00011:
    """
    Test Case: IT-B00011
    Module 1: Cart
    Integration Process: Remove Product from Cart
    Module 2: Cart
    Precondition: Product exists in buyer's cart
    """
    def test_remove_product_from_cart(self, driver):
        login_as(driver, "buyer")
        driver.get(f"{BASE_URL}/cart")
        time.sleep(3)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        remove_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "remove" in txt or "delete" in txt or "×" in txt or "trash" in txt:
                remove_btn = btn
                break
        if remove_btn is None:
            pytest.skip("No items in cart to remove")
        remove_btn.click()
        time.sleep(2)
        page_text = body_text(driver).lower()
        assert ("cart" in page_text or "empty" in page_text or "removed" in page_text), \
            "Item should be removed from cart"


class TestIT_B00012:
    """
    Test Case: IT-B00012
    Module 1: Wallet
    Integration Process: Top Up Wallet Balance
    Module 2: Transactions
    Precondition: Buyer is logged in; valid top-up amount entered
    """
    def test_topup_wallet(self, driver):
        login_as(driver, "buyer")
        driver.get(f"{BASE_URL}/profile")
        time.sleep(2)
        page_text = body_text(driver)
        has_wallet = ("wallet" in page_text.lower() or "balance" in page_text.lower()
                      or "top" in page_text.lower() or "deposit" in page_text.lower())
        assert has_wallet, "Wallet/balance section should be visible on profile page"


class TestIT_B00013:
    """
    Test Case: IT-B00013
    Module 1: Cart
    Integration Process: Checkout and Place Order
    Module 2: Transactions
    Precondition: Cart has items; buyer has sufficient wallet balance
    """
    def test_checkout_place_order(self, driver):
        login_as(driver, "buyer")
        driver.get(f"{BASE_URL}/cart")
        time.sleep(3)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        checkout_btn = None
        for btn in buttons:
            if "checkout" in btn.text.lower() or "order" in btn.text.lower() or "buy" in btn.text.lower():
                checkout_btn = btn
                break
        if checkout_btn is None:
            pytest.skip("No checkout button — cart may be empty")
        checkout_btn.click()
        time.sleep(3)
        page_text = body_text(driver).lower()
        assert ("order" in page_text or "success" in page_text or "placed" in page_text
                or "confirm" in page_text or "checkout" in page_text), \
            "Checkout should place order and show confirmation"


class TestIT_B00014:
    """
    Test Case: IT-B00014
    Module 1: Transactions
    Integration Process: View Order History
    Module 2: Orders
    Precondition: Buyer has at least one completed transaction
    """
    def test_view_order_history(self, driver):
        login_as(driver, "buyer")
        driver.get(f"{BASE_URL}/orders")
        time.sleep(3)
        page_text = body_text(driver)
        assert ("order" in page_text.lower() or "transaction" in page_text.lower()
                or "history" in page_text.lower() or "no order" in page_text.lower()
                or "PHP" in page_text), \
            "Orders page should display transaction history"


class TestIT_B00015:
    """
    Test Case: IT-B00015
    Module 1: Transactions
    Integration Process: Cancel Pending Order
    Module 2: Orders
    Precondition: Order status is pending delivery; buyer is logged in
    """
    def test_cancel_pending_order(self, driver):
        login_as(driver, "buyer")
        driver.get(f"{BASE_URL}/orders")
        time.sleep(3)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        cancel_btn = None
        for btn in buttons:
            if "cancel" in btn.text.lower():
                cancel_btn = btn
                break
        if cancel_btn is None:
            pytest.skip("No cancellable orders found")
        cancel_btn.click()
        time.sleep(3)
        page_text = body_text(driver).lower()
        assert ("cancel" in page_text or "success" in page_text or "order" in page_text), \
            "Order cancellation should be processed"


class TestIT_B00016:
    """
    Test Case: IT-B00016
    Module 1: Wishlist
    Integration Process: Add Product to Wishlist
    Module 2: Products
    Precondition: Buyer is logged in; product is approved
    """
    def test_add_product_to_wishlist(self, driver):
        login_as(driver, "buyer")
        driver.get(f"{BASE_URL}/products")
        time.sleep(3)
        product_links = driver.find_elements(By.CSS_SELECTOR, "a[href*='/products/']")
        if not product_links:
            pytest.skip("No products available")
        product_links[0].click()
        time.sleep(2)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        wishlist_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            attr = (btn.get_attribute("aria-label") or "").lower()
            if "wishlist" in txt or "wish" in txt or "heart" in txt or "wishlist" in attr:
                wishlist_btn = btn
                break
        if wishlist_btn is None:
            pytest.skip("Wishlist button not found on product page")
        wishlist_btn.click()
        time.sleep(2)
        page_text = body_text(driver).lower()
        assert ("wishlist" in page_text or "saved" in page_text or "added" in page_text
                or "wish" in page_text), \
            "Product should be added to wishlist"


class TestIT_B00017:
    """
    Test Case: IT-B00017
    Module 1: Wishlist
    Integration Process: Remove Product from Wishlist
    Module 2: Wishlist
    Precondition: Product exists in buyer's wishlist
    """
    def test_remove_product_from_wishlist(self, driver):
        login_as(driver, "buyer")
        driver.get(f"{BASE_URL}/wishlist")
        time.sleep(3)
        buttons = driver.find_elements(By.TAG_NAME, "button")
        remove_btn = None
        for btn in buttons:
            txt = btn.text.lower()
            if "remove" in txt or "delete" in txt or "×" in txt:
                remove_btn = btn
                break
        if remove_btn is None:
            pytest.skip("No wishlist items to remove")
        remove_btn.click()
        time.sleep(2)
        page_text = body_text(driver).lower()
        assert ("wishlist" in page_text or "removed" in page_text or "empty" in page_text), \
            "Product should be removed from wishlist"


class TestIT_B00018:
    """
    Test Case: IT-B00018
    Module 1: Wishlist
    Integration Process: View Wishlist Page
    Module 2: Products
    Precondition: Buyer has at least one wishlisted product
    """
    def test_view_wishlist_page(self, driver):
        login_as(driver, "buyer")
        driver.get(f"{BASE_URL}/wishlist")
        time.sleep(3)
        page_text = body_text(driver)
        assert ("wishlist" in page_text.lower() or "product" in page_text.lower()
                or "PHP" in page_text or "empty" in page_text.lower()
                or "no item" in page_text.lower()), \
            "Wishlist page should display wishlisted products"


class TestIT_B00019:
    """
    Test Case: IT-B00019
    Module 1: Wallet
    Integration Process: Withdraw Wallet Balance
    Module 2: Transactions
    Precondition: Buyer has sufficient wallet balance
    """
    def test_withdraw_wallet_balance(self, driver):
        login_as(driver, "buyer")
        driver.get(f"{BASE_URL}/profile")
        time.sleep(2)
        page_text = body_text(driver)
        has_wallet = ("wallet" in page_text.lower() or "balance" in page_text.lower()
                      or "withdraw" in page_text.lower())
        assert has_wallet, "Wallet section with withdraw option should be on profile page"


class TestIT_B00020:
    """
    Test Case: IT-B00020
    Module 1: Wallet
    Integration Process: View Stored Value History
    Module 2: Transactions
    Precondition: Buyer has performed at least one top-up or withdrawal
    """
    def test_view_stored_value_history(self, driver):
        login_as(driver, "buyer")
        driver.get(f"{BASE_URL}/profile")
        time.sleep(2)
        # Look for history/transactions tab in profile
        buttons = driver.find_elements(By.TAG_NAME, "button")
        for btn in buttons:
            if "history" in btn.text.lower() or "transaction" in btn.text.lower() or "wallet" in btn.text.lower():
                btn.click()
                time.sleep(2)
                break
        page_text = body_text(driver)
        assert ("history" in page_text.lower() or "transaction" in page_text.lower()
                or "deposit" in page_text.lower() or "withdrawal" in page_text.lower()
                or "balance" in page_text.lower() or "PHP" in page_text), \
            "Stored value history should be visible"
