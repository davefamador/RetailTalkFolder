# RetailTalk System Use Cases

This document illustrates the actions performed by the five user roles — **Buyer**, **Seller (Staff)**, **Manager**, **Delivery Personnel**, and **Admin** — within the RetailTalk system, an NLP-powered e-commerce product search engine. The system enables product searching with ESCI relevance classification, voice-based search, cart and purchase management, product and inventory administration, and report generation.

---

## Table 1: USER LOGIN

| Field                         | Description                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**       | User Login                                                                                                                                                                                                                                                                                                                                                                                     |
| **Brief Description**   | This use case allows a registered user (Buyer, Seller, Manager, Delivery, or Admin) to log into the RetailTalk system using their email address and password. The system authenticates the credentials and issues a JWT access token for session management.                                                                                                                                   |
| **Purpose**             | To authenticate the user's identity and grant authorized access to role-specific features and dashboards within the RetailTalk system.                                                                                                                                                                                                                                                         |
| **Triggering Actor(s)** | Buyer / Seller / Manager / Delivery / Admin — initiates the login process by accessing the login page.                                                                                                                                                                                                                                                                                        |
| **Benefiting Actor(s)** | Buyer: Gains access to search, cart, wishlist, and purchase features. Seller: Gains access to product management and sales tracking. Manager: Gains access to department and staff oversight. Delivery: Gains access to delivery queue and earnings. Admin: Gains access to platform-wide management. System (RetailTalk): Establishes a secure, traceable session for the authenticated user. |
| **Pre-condition(s)**    | User has a registered RetailTalk account. User has access to the RetailTalk login page.                                                                                                                                                                                                                                                                                                        |
| **Post-condition(s)**   | User is authenticated and a JWT access token is issued. User is redirected to their role-appropriate dashboard.                                                                                                                                                                                                                                                                                |

### Process Flow

```
Actor: Buyer / Seller / Manager / Delivery / Admin

    [User Login]
         |
    <<INCLUDE>> ── [Enter Login Credentials]
         |
    <<INCLUDE>> ── [Validate User Credentials]
         |
    <<INCLUDE>> ── [Generate JWT Access Token]
         |
    <<INCLUDE>> ── [Redirect to Role-Based Dashboard]
```

### Flow of Activities

| Step | Description                                                                                                                                                            |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Actor:** Access the RetailTalk login page.                                                                                                                     |
| 2    | **Application:** Load and display the login form.                                                                                                                |
| 3    | **Actor:** Enter email address and password.                                                                                                                     |
| 4    | **Actor:** Submit the login form.                                                                                                                                |
| 5    | **Application:** Validate that both email and password fields are provided.                                                                                      |
| 6    | **Application:** Retrieve the user record by email from the database.                                                                                            |
| 7    | **Application:** Verify the password against the stored bcrypt hash.                                                                                             |
| 8    | **Application:** Check if the user account is active and not banned.                                                                                             |
| 9    | **Application:** Generate a JWT access token with user ID and role.                                                                                              |
| 10   | **Application:** Return the access token and user profile information.                                                                                           |
| 11   | **Actor:** Receive the token and gain access to the system.                                                                                                      |
| 12   | **Application:** Redirect the user to their role-based dashboard (Buyer Dashboard, Seller Dashboard, Manager Dashboard, Delivery Dashboard, or Admin Dashboard). |

---

## Table 2: VIEW DASHBOARD

| Field                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**       | View Dashboard                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Brief Description**   | This use case allows an authenticated user to view their personalized dashboard. Buyers see recent orders and account summary. Sellers see their product listings and sales data. Managers see department statistics and staff overview. Delivery personnel see their delivery queue and earnings. Admins see platform-wide statistics including total users, products, orders, revenue, and stored value facility (SVF) summaries. |
| **Purpose**             | To provide each user role with a centralized overview of relevant system metrics, activities, and statuses.                                                                                                                                                                                                                                                                                                                         |
| **Triggering Actor(s)** | Buyer / Seller / Manager / Delivery / Admin — accesses their respective dashboard after login.                                                                                                                                                                                                                                                                                                                                     |
| **Benefiting Actor(s)** | Buyer: Gets an overview of orders, balance, and account status. Seller: Sees product performance, sales reports, and wishlist analytics. Manager: Views department statistics, staff, and restock requests. Delivery: Sees available orders, active deliveries, and earnings. Admin: Gets a comprehensive view of platform performance, user counts, revenue, and system health.                                                    |
| **Pre-condition(s)**    | User is authenticated with a valid JWT token. User has an active, non-banned account.                                                                                                                                                                                                                                                                                                                                               |
| **Post-condition(s)**   | Dashboard data is displayed based on the user's role. System metrics are loaded and rendered in real time.                                                                                                                                                                                                                                                                                                                          |

### Process Flow

```
Actor: Buyer / Seller / Manager / Delivery / Admin

    [View Dashboard]
         |
    <<INCLUDE>> ── [Verify JWT Token and Determine Role]
         |
    <<INCLUDE>> ── [Retrieve Role-Based Dashboard Data]
         |
    <<INCLUDE>> ── [Display Dashboard Metrics]
```

### Flow of Activities

| Step | Description                                                                                                          |
| ---- | -------------------------------------------------------------------------------------------------------------------- |
| 1    | **Actor:** Navigate to the dashboard page.                                                                     |
| 2    | **Application:** Verify the user's JWT token and determine their role.                                         |
| 3    | **Application:** (If Buyer) Retrieve the user's recent transactions, balance, and order history.               |
| 4    | **Application:** (If Seller) Retrieve the seller's product listings, sales data, and wishlist analytics.       |
| 5    | **Application:** (If Manager) Retrieve department statistics, staff list, and pending restock requests.        |
| 6    | **Application:** (If Delivery) Retrieve available delivery orders, active deliveries, and earnings summary.    |
| 7    | **Application:** (If Admin) Query total users, products, orders, total revenue, sales volume, and SVF summary. |
| 8    | **Application:** (If Admin) Calculate role-based user counts (buyers, managers, staff, delivery).              |
| 9    | **Application:** Compile and format the dashboard data.                                                        |
| 10   | **Application:** Display the role-appropriate dashboard with all metrics and summaries.                        |
| 11   | **Actor:** View the dashboard information.                                                                     |

---

## Table 3: SEARCH PRODUCTS

| Field                         | Description                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**       | Search Products                                                                                                                                                                                                                                                                                                                              |
| **Brief Description**   | This use case allows a user to search for products using natural language text queries. The system processes the query through a multi-stage NLP pipeline including intent classification, slot extraction, BERT embedding, pgvector similarity search, CrossEncoder re-ranking, and ESCI classification to deliver highly relevant results. |
| **Purpose**             | To enable users to find products using natural language queries processed by an intelligent NLP pipeline that understands search intent, extracts attributes, and ranks results by relevance.                                                                                                                                                |
| **Triggering Actor(s)** | Buyer — enters a search query on the search page. Seller / Manager / Admin — may also search products for catalog management or verification purposes.                                                                                                                                                                                     |
| **Benefiting Actor(s)** | Buyer: Receives highly relevant, semantically ranked product results with transparency into relevance scoring. Seller: Can verify how their products appear in search results. Manager/Admin: Can review product discoverability. System (RetailTalk): Logs search prompts for market trend analysis and insights.                           |
| **Pre-condition(s)**    | User has access to the RetailTalk search interface. Products exist in the database with computed BERT embeddings. NLP models (Intent Classifier, Slot Extractor, BERT, CrossEncoder, ESCI Classifier) are loaded.                                                                                                                            |
| **Post-condition(s)**   | Search results are returned ranked by blended relevance scores. Each result includes ESCI labels (Exact, Substitute, Complement, Irrelevant) with confidence scores. The search query is logged for analytics.                                                                                                                               |

### Process Flow

```
Actor: Buyer / Seller / Manager / Admin

    [Search Products]
         |
    <<INCLUDE>> ── [Enter Search Query]
         |
    <<INCLUDE>> ── [Run NLP Pipeline (Intent, Slot, BERT)]
         |
    <<INCLUDE>> ── [Execute Similarity Search and Re-Ranking]
         |
    <<INCLUDE>> ── [Classify Results with ESCI Labels]
         |
    <<INCLUDE>> ── [Display Ranked Search Results]
         |
    <<INCLUDE>> ── [Log Search Prompt for Analytics]
```

### Flow of Activities

| Step | Description                                                                                                                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | **Actor:** Navigate to the search page.                                                                                                                                                                                                                                  |
| 2    | **Application:** Display the search interface with text input and voice search options.                                                                                                                                                                                  |
| 3    | **Actor:** Enter a natural language search query (e.g., "red Nike shoes under 2000").                                                                                                                                                                                    |
| 4    | **Actor:** Submit the search query.                                                                                                                                                                                                                                      |
| 5    | **Application:** **Stage 1 (Parallel):** Run Intent Classification (single_search, multi_search, filtered_search, free_form), Slot Extraction (PRODUCT, BRAND, COLOR, PRICE_MIN, PRICE_MAX, SIZE, RATING_MIN), and compute BERT embedding (768-dim) for the query. |
| 6    | **Application:** **Stage 2:** Rewrite the query by combining extracted intents and slots into clean search text and structured filters.                                                                                                                            |
| 7    | **Application:** **Stage 3 (Parallel):** Execute pgvector cosine similarity search (top 50 candidates), apply Supabase filters from extracted slots, and run CrossEncoder re-ranking on candidate pairs.                                                           |
| 8    | **Application:** **Stage 4:** Run ESCI Classification on each result to assign Exact, Substitute, Complement, or Irrelevant labels with confidence scores.                                                                                                         |
| 9    | **Application:** **Stage 5:** Blend final scores (0.55 × Ranker + 0.05 × Classifier + 0.40 × Similarity) and sort results.                                                                                                                                      |
| 10   | **Application:** Return ranked results with ESCI labels, confidence scores, rewritten query, detected intents, and extracted slots.                                                                                                                                      |
| 11   | **Application:** Log the search prompt for market trend analytics.                                                                                                                                                                                                       |
| 12   | **Actor:** View the search results with relevance information.                                                                                                                                                                                                           |

---

## Table 4: VOICE SEARCH

| Field                         | Description                                                                                                                                                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**       | Voice Search                                                                                                                                                                                                                                                                       |
| **Brief Description**   | This use case allows a user to search for products using voice input instead of typing. The system captures audio from the user's microphone, transcribes it to text using Google Speech Recognition, and feeds the transcribed text into the NLP-powered product search pipeline. |
| **Purpose**             | To provide an alternative, hands-free search method that enables users to find products by speaking their queries naturally.                                                                                                                                                       |
| **Triggering Actor(s)** | Buyer — activates the voice search feature by clicking the microphone button. Seller / Manager / Admin — may also use voice search when browsing products.                                                                                                                       |
| **Benefiting Actor(s)** | Buyer: Can search for products without typing, improving accessibility and convenience. Seller / Manager / Admin: Can use voice search for quicker product lookup. System (RetailTalk): Captures additional search data for analytics.                                             |
| **Pre-condition(s)**    | User has access to the RetailTalk search interface. User's device has a functional microphone. Browser has microphone permissions enabled. Google Speech Recognition service is available.                                                                                         |
| **Post-condition(s)**   | Audio is transcribed to text successfully. The transcribed text is processed through the full NLP search pipeline. Relevant product results are displayed to the user.                                                                                                             |

### Process Flow

```
Actor: Buyer / Seller / Manager / Admin

    [Voice Search]
         |
    <<INCLUDE>> ── [Activate Microphone Recording]
         |
    <<INCLUDE>> ── [Capture Audio Input]
         |
    <<INCLUDE>> ── [Transcribe Audio to Text]
         |
    <<INCLUDE>> ── [Execute NLP Search Pipeline]
         |
    <<INCLUDE>> ── [Display Search Results]
```

### Flow of Activities

| Step | Description                                                                                        |
| ---- | -------------------------------------------------------------------------------------------------- |
| 1    | **Actor:** Click the microphone/voice search button on the search page.                      |
| 2    | **Application:** Request microphone access from the browser.                                 |
| 3    | **Actor:** Grant microphone permission (if not already granted).                             |
| 4    | **Application:** Begin audio recording using the browser's MediaRecorder API.                |
| 5    | **Actor:** Speak the search query clearly into the microphone.                               |
| 6    | **Actor:** Click the stop button or wait for automatic silence detection.                    |
| 7    | **Application:** Capture the audio recording in WebM format.                                 |
| 8    | **Application:** Send the audio file to the transcription endpoint (`/search/transcribe`). |
| 9    | **Application:** Convert the audio to WAV format for processing.                             |
| 10   | **Application:** Transcribe the audio to text using Google Speech Recognition API.           |
| 11   | **Application:** Return the transcribed text to the frontend.                                |
| 12   | **Application:** Automatically populate the search bar with the transcribed text.            |
| 13   | **Application:** Execute the full NLP search pipeline using the transcribed query.           |
| 14   | **Actor:** View the transcribed text and the search results.                                 |

---

## Table 5: VIEW ESCI & RELEVANCE RESULTS

| Field                         | Description                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**       | View ESCI & Relevance Results                                                                                                                                                                                                                                                                                                                               |
| **Brief Description**   | This use case allows a user to view detailed ESCI (Exact, Substitute, Complement, Irrelevant) classification labels and relevance scores alongside their product search results. Each product result is transparently labeled with its relevance category and a blended confidence score.                                                                   |
| **Purpose**             | To provide transparency into how the system ranks and classifies search results, enabling users to understand why certain products appear and how they relate to their query.                                                                                                                                                                               |
| **Triggering Actor(s)** | Buyer — views search results after performing a text or voice search. Seller / Manager / Admin — may view ESCI results when reviewing product search relevance.                                                                                                                                                                                           |
| **Benefiting Actor(s)** | Buyer: Gains insight into product relevance, enabling more informed purchasing decisions. Seller: Can evaluate how their products are classified relative to search queries. Manager/Admin: Can monitor the quality and relevance of search results. System (RetailTalk): Demonstrates the value of its NLP pipeline through transparent relevance scoring. |
| **Pre-condition(s)**    | User has performed a product search (text or voice). The ESCI Classifier model is loaded and operational. Search results have been processed through the full NLP pipeline.                                                                                                                                                                                 |
| **Post-condition(s)**   | Each search result displays its ESCI classification label (Exact, Substitute, Complement, or Irrelevant). Relevance confidence scores are visible for each result. Results are sorted by blended score.                                                                                                                                                     |

### Process Flow

```
Actor: Buyer / Seller / Manager / Admin

    [View ESCI & Relevance Results]
         |
    <<INCLUDE>> ── [Process Query Through NLP Pipeline]
         |
    <<INCLUDE>> ── [Compute ESCI Classification per Result]
         |
    <<INCLUDE>> ── [Calculate Blended Relevance Scores]
         |
    <<INCLUDE>> ── [Display Results with ESCI Labels]
         |
    <<EXTEND>> ── [Filter Results by ESCI Category]
```

### Flow of Activities

| Step | Description                                                                                                                                                                                                     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Actor:** Perform a product search (text or voice).                                                                                                                                                      |
| 2    | **Application:** Process the query through the NLP pipeline and retrieve ranked results.                                                                                                                  |
| 3    | **Application:** For each result, compute the ESCI classification by passing query embedding (768-dim) and product embedding (768-dim) through the ESCI Classifier.                                       |
| 4    | **Application:** Assign one of four labels: **Exact** (direct match), **Substitute** (similar alternative), **Complement** (related accessory), or **Irrelevant** (not relevant). |
| 5    | **Application:** Calculate the blended relevance score for each result (0.55 × Ranker + 0.05 × Classifier + 0.40 × Similarity).                                                                        |
| 6    | **Application:** Format results with ESCI labels, confidence percentages, and relevance scores.                                                                                                           |
| 7    | **Application:** Display the search results with ESCI badges and relevance indicators.                                                                                                                    |
| 8    | **Actor:** View the product results with their ESCI labels and relevance scores.                                                                                                                          |
| 9    | **Actor:** (Optional) Filter results to show only Exact matches, or include Substitutes and Complements.                                                                                                  |
| 10   | **Application:** Re-filter and display results based on user's selected ESCI category filter.                                                                                                             |

---

## Table 6: MANAGE CART

| Field                         | Description                                                                                                                                                                                                                                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**       | Manage Cart                                                                                                                                                                                                                                                                                                                   |
| **Brief Description**   | This use case allows an authenticated buyer to manage their shopping cart by adding products, updating quantities, removing items, and viewing the cart summary with delivery fee calculations. The system groups items by seller/department and calculates delivery fees (₱90 per unique department or independent seller). |
| **Purpose**             | To provide buyers with a flexible cart management system that supports multi-seller purchases with transparent delivery fee breakdowns before checkout.                                                                                                                                                                       |
| **Triggering Actor(s)** | Buyer — interacts with the shopping cart to add, update, or remove items.                                                                                                                                                                                                                                                    |
| **Benefiting Actor(s)** | Buyer: Can collect products from multiple sellers and review costs before purchasing. Seller: Receives purchase orders when the buyer proceeds to checkout. System (RetailTalk): Organizes and tracks pending purchases per buyer.                                                                                            |
| **Pre-condition(s)**    | Buyer is authenticated with a valid JWT token. Products to be added are active and in stock.                                                                                                                                                                                                                                  |
| **Post-condition(s)**   | Cart accurately reflects all added items with correct quantities. Delivery fees are calculated based on unique departments/sellers. Cart totals (subtotal, delivery fees, grand total) are displayed.                                                                                                                         |

### Process Flow

```
Actor: Buyer

    [Manage Cart]
         |
    <<INCLUDE>> ── [Add Product to Cart]
         |
    <<INCLUDE>> ── [Validate Stock Availability]
         |
    <<INCLUDE>> ── [Calculate Delivery Fees]
         |
    <<INCLUDE>> ── [Display Cart Summary]
         |
    <<EXTEND>> ── [Update Cart Item Quantity]
         |
    <<EXTEND>> ── [Remove Cart Item]
```

### Flow of Activities

| Step | Description                                                                                        |
| ---- | -------------------------------------------------------------------------------------------------- |
| 1    | **Actor (Buyer):** Browse products and select a product to add to cart.                      |
| 2    | **Actor (Buyer):** Click "Add to Cart" and specify the desired quantity.                     |
| 3    | **Application:** Verify the product is active and has sufficient stock.                      |
| 4    | **Application:** Check if the product already exists in the buyer's cart.                    |
| 5    | **Application:** (If exists) Increment the quantity; (If new) Create a new cart item entry.  |
| 6    | **Application:** Confirm the item has been added to the cart.                                |
| 7    | **Actor (Buyer):** Navigate to the cart page to view all items.                              |
| 8    | **Application:** Retrieve all cart items for the buyer.                                      |
| 9    | **Application:** Group items by seller/department.                                           |
| 10   | **Application:** Calculate delivery fees: ₱90 per unique department or independent seller.  |
| 11   | **Application:** Display cart items, subtotal, delivery fees, and grand total.               |
| 12   | **Actor (Buyer):** (Optional) Update the quantity of a cart item.                            |
| 13   | **Application:** Validate the new quantity against available stock and update the cart item. |
| 14   | **Actor (Buyer):** (Optional) Remove an item from the cart.                                  |
| 15   | **Application:** Delete the cart item and recalculate totals.                                |
| 16   | **Actor (Buyer):** Review the final cart summary.                                            |

---

## Table 7: PURCHASE PRODUCTS

| Field                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**       | Purchase Products                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Brief Description**   | This use case allows an authenticated buyer to purchase products either through cart checkout (batch) or direct buy (single product). The system validates stock availability and wallet balance, processes payment through the internal wallet system, distributes revenue (100% admin commission on product price and delivery fees), updates inventory, and creates transaction records. The seller receives the order for processing, and delivery personnel are assigned for delivery orders. |
| **Purpose**             | To enable buyers to complete purchases securely through the internal wallet system with automatic revenue distribution, stock management, and transaction tracking.                                                                                                                                                                                                                                                                                                                                |
| **Triggering Actor(s)** | Buyer — initiates a purchase via checkout or direct buy.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **Benefiting Actor(s)** | Buyer: Acquires the desired products. Seller: Receives the order for processing. Delivery: Gets assigned delivery orders for fulfillment. Admin: Receives 100% commission on product price and delivery fees (₱90 per delivery order). System (RetailTalk): Records a complete transaction for tracking and reporting.                                                                                                                                                                            |
| **Pre-condition(s)**    | Buyer is authenticated. Buyer has sufficient wallet balance to cover the purchase plus delivery fees. Products are active and have sufficient stock. Buyer has contact information and delivery address set (for delivery orders).                                                                                                                                                                                                                                                                 |
| **Post-condition(s)**   | Buyer's wallet balance is deducted by the total amount. Admin receives 100% of the product price and delivery fee. The order appears in the seller's transaction list. Product stock is decremented. Transaction records are created with a "pending" status. Delivery personnel are notified of new delivery orders.                                                                                                                                                                              |

### Process Flow

```
Actor: Buyer
Secondary Actors: Seller, Delivery, Admin

    [Purchase Products]
         |
    <<INCLUDE>> ── [Validate Buyer Details and Stock]
         |
    <<INCLUDE>> ── [Calculate Total Amount with Delivery Fees]
         |
    <<INCLUDE>> ── [Process Wallet Payment]
         |
    <<INCLUDE>> ── [Distribute Revenue (Admin 100%)]
         |              └── Secondary Actor (Admin): Receives 100% of product price and delivery fees
         |
    <<INCLUDE>> ── [Update Product Inventory]
         |
    <<INCLUDE>> ── [Create Transaction Records]
         |
    <<INCLUDE>> ── [Notify Seller of New Order]
         |              └── Secondary Actor (Seller): Notified of incoming order
         |
    <<EXTEND>>  ── [Add to Delivery Queue (if delivery order)]
         |              └── Secondary Actor (Delivery): Order appears in delivery queue
         |
    <<EXTEND>>  ── [Clear Cart Items (if cart checkout)]
         |
    <<INCLUDE>> ── [Display Purchase Confirmation]
```

### Flow of Activities

| Step | Description                                                                                                                                    |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Actor (Buyer):** Review cart items or select a product for direct purchase.                                                            |
| 2    | **Actor (Buyer):** Choose purchase type: delivery or walk-in.                                                                            |
| 3    | **Actor (Buyer):** Click the "Checkout" or "Buy Now" button.                                                                             |
| 4    | **Application:** Validate the buyer's contact number and delivery address (for delivery orders).                                         |
| 5    | **Application:** Verify each product is active and has sufficient stock.                                                                 |
| 6    | **Application:** Calculate the total amount: product prices × quantities + delivery fees (₱90 per unique seller for delivery orders).  |
| 7    | **Application:** Validate the buyer's wallet balance is sufficient.                                                                      |
| 8    | **Application:** Deduct the total amount from the buyer's wallet balance.                                                                |
| 9    | **Application:** Distribute revenue: credit 100% of product price and delivery fees to the admin's balance.                              |
| 10   | **Secondary Actor (Admin):** Receives 100% commission of the product price and delivery fees (₱90 per delivery order) to their balance. |
| 11   | **Application:** Decrement product stock for each purchased item.                                                                        |
| 12   | **Application:** Create transaction records for each seller group with status "pending."                                                 |
| 13   | **Application:** Notify the seller of the new incoming order.                                                                            |
| 14   | **Secondary Actor (Seller):** Receives notification of the new order for processing.                                                     |
| 15   | **Application:** (If delivery order) Add the order to the delivery personnel queue.                                                      |
| 16   | **Secondary Actor (Delivery):** The order becomes visible in the delivery queue for assignment.                                          |
| 17   | **Application:** (If cart checkout) Clear the purchased items from the buyer's cart.                                                     |
| 18   | **Application:** Return a purchase confirmation with transaction details.                                                                |
| 19   | **Actor (Buyer):** View the purchase confirmation and transaction details.                                                               |

---

## Table 8: PROCESS ORDERS (SELLER / STAFF)

| Field                         | Description                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**       | Process Orders (Seller / Staff)                                                                                                                                                                                                                                                                                                                           |
| **Brief Description**   | This use case allows a seller (staff) to view incoming orders assigned to them, update order statuses through the fulfillment workflow, and track their sales. For walk-in orders, the seller marks the status from "pending_walkin" → "inwork" → "ready." For delivery orders, the seller views the order until it is picked up by delivery personnel. |
| **Purpose**             | To enable sellers to manage and fulfill their incoming customer orders through the appropriate workflow (walk-in or delivery).                                                                                                                                                                                                                            |
| **Triggering Actor(s)** | Seller (Staff) — accesses their order list to view and process incoming orders.                                                                                                                                                                                                                                                                          |
| **Benefiting Actor(s)** | Seller: Manages their order fulfillment and tracks earnings. Buyer: Orders are processed and fulfilled in a timely manner. Delivery: Walk-in orders marked as "ready" can be picked up. System (RetailTalk): Tracks the complete order lifecycle.                                                                                                         |
| **Pre-condition(s)**    | Seller is authenticated with seller role privileges. Orders assigned to the seller exist in the system.                                                                                                                                                                                                                                                   |
| **Post-condition(s)**   | Order statuses are updated through the fulfillment workflow. Walk-in orders are prepared and marked as ready for pickup. Sales records are updated for the seller.                                                                                                                                                                                        |

### Process Flow

```
Actor: Seller (Staff)

    [Process Orders]
         |
    <<INCLUDE>> ── [View Incoming Orders]
         |
    <<INCLUDE>> ── [Display Order Details]
         |
    <<EXTEND>> ── [Process Walk-In Order]
         |         └── <<INCLUDE>> ── [Update Status: pending_walkin → inwork → ready]
         |
    <<EXTEND>> ── [Track Delivery Order Status]
         |
    <<INCLUDE>> ── [View Sales and Earnings]
```

### Flow of Activities

| Step | Description                                                                                                      |
| ---- | ---------------------------------------------------------------------------------------------------------------- |
| 1    | **Actor (Manager/Admin):** Navigate to the orders/transactions page.                                       |
| 2    | **Application:** Retrieve all orders assigned to the seller.                                               |
| 3    | **Application:** Display orders with details: buyer name, product, quantity, amount, status, and date.     |
| 4    | **Actor (Manager/Admin):** View the list of incoming orders.                                               |
| 5    | **Actor (Manager/Admin):** Select an order to view its full details.                                       |
| 6    | **Application:** Display the complete order information including buyer details and payment breakdown.     |
| 7    | **Actor (Manager/Admin):** (Walk-In Order) Click to update the status from "pending_walkin" to "inwork."   |
| 8    | **Application:** Update the order status to "inwork" and confirm the change.                               |
| 9    | **Actor (Manager/Admin):** (Walk-In Order) Complete preparation and click to update the status to "ready." |
| 10   | **Application:** Update the order status to "ready" and notify the buyer.                                  |
| 11   | **Actor (Manager/Admin):** View the updated order status and sales earnings.                               |

---

## Table 9: MANAGE DELIVERIES (DELIVERY PERSONNEL)

| Field                         | Description                                                                                                                                                                                                                                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**       | Manage Deliveries                                                                                                                                                                                                                                                                                                                   |
| **Brief Description**   | This use case allows delivery personnel to view available delivery orders, accept delivery assignments, update delivery statuses, manage restock deliveries, and track their earnings. The delivery user handles both customer order deliveries and inventory restock deliveries.                                                   |
| **Purpose**             | To enable delivery personnel to efficiently manage their delivery assignments, track order progress, and monitor their earnings from delivery fees.                                                                                                                                                                                 |
| **Triggering Actor(s)** | Delivery Personnel — accesses the delivery dashboard to view and manage delivery assignments.                                                                                                                                                                                                                                      |
| **Benefiting Actor(s)** | Delivery: Receives delivery assignments and earns delivery fees. Buyer: Orders are delivered to their specified address. Seller: Products are restocked when delivery personnel fulfill restock requests. Manager: Approved restock deliveries are completed. System (RetailTalk): Tracks order fulfillment and delivery logistics. |
| **Pre-condition(s)**    | Delivery user is authenticated with delivery role privileges. Delivery orders or approved restock requests exist in the system.                                                                                                                                                                                                     |
| **Post-condition(s)**   | Delivery assignments are accepted and fulfilled. Order statuses are updated (ondeliver → delivered). Restock deliveries update product stock quantities. Delivery earnings are recorded.                                                                                                                                           |

### Process Flow

```
Actor: Delivery Personnel

    [Manage Deliveries]
         |
    <<INCLUDE>> ── [View Available Delivery Orders]
         |
    <<INCLUDE>> ── [Accept Delivery Assignment]
         |
    <<INCLUDE>> ── [Update Delivery Status]
         |
    <<EXTEND>> ── [Complete Customer Order Delivery]
         |         └── <<INCLUDE>> ── [Update Status: ondeliver → delivered]
         |
    <<EXTEND>> ── [Complete Restock Delivery]
         |         └── <<INCLUDE>> ── [Update Product Stock Quantity]
         |
    <<EXTEND>> ── [Mark as Undelivered]
         |
    <<INCLUDE>> ── [View Delivery Earnings and History]
         |
    <<EXTEND>> ── [Withdraw Delivery Earnings]
```

### Flow of Activities

| Step | Description                                                                                                                   |
| ---- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Actor (Delivery):** Navigate to the delivery dashboard.                                                               |
| 2    | **Application:** Retrieve all available delivery orders and restock delivery assignments.                               |
| 3    | **Application:** Display the delivery queue with order details: buyer address, products, and delivery fee.              |
| 4    | **Actor (Delivery):** View available delivery orders.                                                                   |
| 5    | **Actor (Delivery):** Accept a delivery assignment by clicking "Accept."                                                |
| 6    | **Application:** Assign the delivery order to the delivery user and update status to "ondeliver."                       |
| 7    | **Actor (Delivery):** Pick up the order and deliver to the buyer's address.                                             |
| 8    | **Actor (Delivery):** Click "Delivered" to mark the order as completed, or "Undelivered" if delivery failed.            |
| 9    | **Application:** (If Delivered) Update order status to "delivered" and credit delivery fee to delivery user's earnings. |
| 10   | **Application:** (If Undelivered) Update order status to "undelivered" and notify the buyer.                            |
| 11   | **Actor (Delivery):** (Restock Delivery) View approved restock requests in the delivery queue.                          |
| 12   | **Actor (Delivery):** Accept a restock delivery assignment.                                                             |
| 13   | **Application:** Update restock status to "accepted_delivery" and assign the delivery user.                             |
| 14   | **Actor (Delivery):** Complete the restock delivery.                                                                    |
| 15   | **Application:** Update restock status to "delivered" and increment the product's stock quantity.                       |
| 16   | **Actor (Delivery):** View delivery earnings and history.                                                               |
| 17   | **Application:** Display the delivery user's total earnings, completed deliveries, and transaction history.             |
| 18   | **Actor (Delivery):** (Optional) Withdraw delivery earnings to wallet.                                                  |
| 19   | **Application:** Process the withdrawal and update the delivery user's balance.                                         |

---

## Table 10: WISHLIST

| Field                         | Description                                                                                                                                                                                                                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**       | Wishlist                                                                                                                                                                                                                                                                                            |
| **Brief Description**   | This use case allows an authenticated buyer to save products to a personal wishlist for future reference. Users can add products they are interested in, view their saved items, and remove products they no longer wish to track. Sellers can also view the wishlist analytics for their products. |
| **Purpose**             | To enable buyers to bookmark and organize products of interest for future purchasing decisions without immediately adding them to the cart.                                                                                                                                                         |
| **Triggering Actor(s)** | Buyer — adds or manages products in their wishlist. Seller — views wishlist analytics to gauge product demand.                                                                                                                                                                                    |
| **Benefiting Actor(s)** | Buyer: Can save and revisit products of interest at any time. Seller: Gains insight into product demand through wishlist counts and analytics. System (RetailTalk): Tracks user interest and product demand.                                                                                        |
| **Pre-condition(s)**    | Buyer is authenticated. Products to be added to the wishlist are active in the system.                                                                                                                                                                                                              |
| **Post-condition(s)**   | Selected products are saved to the buyer's wishlist. Sellers can view how many users have wishlisted their products.                                                                                                                                                                                |

### Process Flow

```
Actor: Buyer
Secondary Actor: Seller

    [Wishlist]
         |
    <<INCLUDE>> ── [Add Product to Wishlist (Buyer)]
         |
    <<INCLUDE>> ── [Validate Product Availability]
         |
    <<INCLUDE>> ── [Display Wishlist Items (Buyer)]
         |
    <<EXTEND>> ── [Remove Product from Wishlist (Buyer)]
         |
    <<EXTEND>> ── [Move Wishlist Item to Cart (Buyer)]
         |
    <<EXTEND>> ── [View Wishlist Analytics (Seller)]
```

### Flow of Activities

| Step | Description                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1    | **Actor (Buyer):** Browse products or view product details.                                                              |
| 2    | **Actor (Buyer):** Click the "Add to Wishlist" button on a desired product.                                              |
| 3    | **Application:** Verify the product exists and is active.                                                                |
| 4    | **Application:** Check if the product is already in the buyer's wishlist.                                                |
| 5    | **Application:** (If not duplicate) Save the product to the buyer's wishlist.                                            |
| 6    | **Application:** Confirm the product has been added to the wishlist.                                                     |
| 7    | **Actor (Buyer):** Navigate to the wishlist page.                                                                        |
| 8    | **Application:** Retrieve all wishlist items for the buyer with current product details and availability.                |
| 9    | **Application:** Display the wishlist with product names, prices, stock status, and images.                              |
| 10   | **Actor (Buyer):** View saved products in the wishlist.                                                                  |
| 11   | **Actor (Buyer):** (Optional) Click "Remove" to remove a product from the wishlist.                                      |
| 12   | **Application:** Delete the product from the buyer's wishlist and update the display.                                    |
| 13   | **Actor (Buyer):** (Optional) Click "Add to Cart" to move a wishlist item to the shopping cart.                          |
| 14   | **Application:** Add the product to the cart and optionally remove it from the wishlist.                                 |
| 15   | **Actor (Manager/Admin):** Navigate to the wishlist analytics on the seller dashboard.                                   |
| 16   | **Application:** Retrieve and display total wishlist count and per-product wishlist breakdown for the seller's products. |
| 17   | **Actor (Manager/Admin):** View wishlist demand insights for their products.                                             |

---

## Table 11: MANAGE PRODUCT

| Field                         | Description                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Use Case Name**       | Manage Product                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Brief Description**   | This use case allows a Seller (Staff) to create and manage their own product listings, and an Admin to oversee all products across the platform. When a product is created or its title is updated, the system automatically computes a BERT embedding (768-dimensional vector) and stores it in the pgvector database for semantic search capability. Product images are uploaded and stored in Supabase Storage. |
| **Purpose**             | To enable sellers to maintain their product listings and admins to oversee the entire product catalog, ensuring all products have accurate information and are indexed for the NLP-powered search pipeline.                                                                                                                                                                                                        |
| **Triggering Actor(s)** | Seller (Staff) — creates and manages their own products. Admin — manages all products across the platform.                                                                                                                                                                                                                                                                                                       |
| **Benefiting Actor(s)** | Seller: Can list, update, and manage their own products. Admin: Maintains full control over the entire product catalog. Buyer: Accesses an up-to-date product catalog. System (RetailTalk): Keeps the search index current with new and updated embeddings.                                                                                                                                                        |
| **Pre-condition(s)**    | Seller or Admin is authenticated with appropriate role privileges. BERT model is loaded for embedding computation. Supabase Storage is available for image uploads.                                                                                                                                                                                                                                                |
| **Post-condition(s)**   | Product is created/updated/deleted in the database. BERT embedding is computed and stored in pgvector (for new or title-updated products). Product images are stored in Supabase Storage with public URLs.                                                                                                                                                                                                         |

### Process Flow

```
Actor: Seller (Staff) / Admin

    [Manage Product]
         |
    <<INCLUDE>> ── [Display Product List]
         |
    <<EXTEND>> ── [Create New Product]
         |         └── <<INCLUDE>> ── [Upload Images to Supabase Storage]
         |         └── <<INCLUDE>> ── [Compute BERT Embedding]
         |         └── <<INCLUDE>> ── [Store Product in pgvector Database]
         |
    <<EXTEND>> ── [Update Existing Product]
         |         └── <<INCLUDE>> ── [Recompute BERT Embedding (if title changed)]
         |
    <<EXTEND>> ── [Delete Product (Soft Delete)]
         |
    <<EXTEND>> ── [View Seller's Own Products (Seller)]
```

### Flow of Activities

| Step | Description                                                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Actor (Seller/Admin):** Navigate to the product management page.                                                                            |
| 2    | **Application:** Display the list of products (seller sees own products; admin sees all products with status: pending, approved, unapproved). |
| 3    | **Actor (Seller/Admin):** **(To Create)** Click "Add New Product."                                                                      |
| 4    | **Application:** Display the product creation form.                                                                                           |
| 5    | **Actor (Seller/Admin):** Enter product details: title, description, price, stock quantity, and upload images.                                |
| 6    | **Actor (Seller/Admin):** Submit the product creation form.                                                                                   |
| 7    | **Application:** Validate all required fields (title, description, price, stock).                                                             |
| 8    | **Application:** Upload product images to Supabase Storage (max 5 images, max 5MB each; JPEG, PNG, WebP, GIF).                                |
| 9    | **Application:** Compute the BERT embedding (768-dim vector) from the product title.                                                          |
| 10   | **Application:** Store the product record with embedding in the pgvector database.                                                            |
| 11   | **Application:** Set product status to "pending" (awaiting admin/manager approval).                                                           |
| 12   | **Application:** Confirm product creation with a success message.                                                                             |
| 13   | **Actor (Seller/Admin):** **(To Update)** Select an existing product and click "Edit."                                                  |
| 14   | **Application:** Load the product's current details into the edit form.                                                                       |
| 15   | **Actor (Seller/Admin):** Modify the desired fields and submit.                                                                               |
| 16   | **Application:** Update the product record; if the title changed, recompute the BERT embedding.                                               |
| 17   | **Actor (Seller/Admin):** **(To Delete)** Select a product and click "Delete."                                                          |
| 18   | **Application:** Perform a soft delete by setting `is_active = false`.                                                                      |
| 19   | **Application:** Confirm the deletion and update the product list.                                                                            |

---

## Table 12: MANAGE INVENTORY

| Field                         | Description                                                                                                                                                                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Use Case Name**       | Manage Inventory                                                                                                                                                                                                                                                                                             |
| **Brief Description**   | This use case involves multiple actors in a structured restock workflow. Sellers (Staff) submit restock requests when stock is low, Managers review and approve or reject these requests, and Delivery personnel fulfill approved restocks. The Admin oversees overall inventory levels across the platform. |
| **Purpose**             | To ensure products remain adequately stocked through a structured restock request and approval workflow involving staff, managers, and delivery personnel.                                                                                                                                                   |
| **Triggering Actor(s)** | Seller (Staff) — identifies low stock and submits a restock request. Manager — reviews and approves/rejects restock requests. Delivery — fulfills approved restock deliveries. Admin — oversees overall inventory levels.                                                                                |
| **Benefiting Actor(s)** | Seller: Can request restocks for their products. Manager: Maintains control over inventory decisions within their department. Delivery: Receives restock delivery assignments. Admin: Has visibility into stock levels platform-wide. Buyer: Products remain in stock and available for purchase.            |
| **Pre-condition(s)**    | Each actor is authenticated with appropriate role privileges. Products exist in the system with tracked stock levels.                                                                                                                                                                                        |
| **Post-condition(s)**   | Restock requests are created, reviewed, and processed. Approved restocks are fulfilled and product stock quantities are updated. Restock history is recorded for auditing.                                                                                                                                   |

### Process Flow

```
Actor: Seller (Staff) / Manager / Delivery / Admin

    [Manage Inventory]
         |
    <<INCLUDE>> ── [Display Current Stock Levels]
         |
    <<EXTEND>> ── [Submit Restock Request (Seller)]
         |         └── <<INCLUDE>> ── [Create Pending Restock Record]
         |
    <<EXTEND>> ── [Review and Approve/Reject Request (Manager)]
         |         └── <<INCLUDE>> ── [Update Restock Status]
         |         └── <<INCLUDE>> ── [Add to Delivery Queue (if approved)]
         |
    <<EXTEND>> ── [Fulfill Restock Delivery (Delivery)]
         |         └── <<INCLUDE>> ── [Update Product Stock Quantity]
         |
    <<EXTEND>> ── [View Inventory Overview (Admin)]
```

### Flow of Activities

| Step | Description                                                                                                      |
| ---- | ---------------------------------------------------------------------------------------------------------------- |
| 1    | **Actor (Seller/Admin):** Navigate to the inventory management page.                                       |
| 2    | **Application:** Display current stock levels for all products (seller sees own products; admin sees all). |
| 3    | **Actor (Manager/Admin):** Identify a product with low stock and click "Request Restock."                  |
| 4    | **Actor (Manager/Admin):** Enter the requested quantity and optional notes, then submit.                   |
| 5    | **Application:** Create a restock request with status "pending_manager."                                   |
| 6    | **Application:** Notify the department manager of the pending request.                                     |
| 7    | **Actor (Manager):** Navigate to the restock requests page.                                                |
| 8    | **Application:** Display all pending restock requests for the manager's department.                        |
| 9    | **Actor (Manager):** Review the request and click "Approve" or "Reject."                                   |
| 10   | **Application:** (If Approved) Update status to "approved_manager" and add to the delivery queue.          |
| 11   | **Application:** (If Rejected) Update status to "rejected" with the manager's notes.                       |
| 12   | **Actor (Delivery):** View the restock delivery queue.                                                     |
| 13   | **Application:** Display approved restocks available for pickup.                                           |
| 14   | **Actor (Delivery):** Accept a restock delivery assignment.                                                |
| 15   | **Application:** Update status to "accepted_delivery" and assign the delivery user.                        |
| 16   | **Actor (Delivery):** Complete the restock delivery.                                                       |
| 17   | **Application:** Update status to "delivered" and increment the product's stock quantity.                  |
| 18   | **Application:** Record the completed restock in the system for auditing.                                  |

---

## Table 13: MANAGE ORDERS (ADMIN)

| Field                         | Description                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**       | Manage Orders                                                                                                                                                                                                                                                                                                                                                   |
| **Brief Description**   | This use case allows an Admin to view, track, and update the status of all customer orders (transactions) across the platform. The Admin can monitor order progress through various statuses from pending to completion, and intervene when necessary to approve, cancel, or resolve order issues. Managers can also view transactions within their department. |
| **Purpose**             | To provide administrators and managers with oversight and control over customer orders, ensuring smooth order fulfillment and resolution of any issues.                                                                                                                                                                                                         |
| **Triggering Actor(s)** | Admin — accesses the order management interface to review and manage all transactions. Manager — views transactions within their department.                                                                                                                                                                                                                  |
| **Benefiting Actor(s)** | Admin: Maintains full visibility and control over all transactions. Manager: Has oversight of department-level orders. Buyer: Orders are properly tracked and fulfilled. Seller: Order statuses are updated accurately for their sales. Delivery: Receives clear order assignments.                                                                             |
| **Pre-condition(s)**    | Admin or Manager is authenticated with appropriate role privileges. Transactions exist in the system.                                                                                                                                                                                                                                                           |
| **Post-condition(s)**   | Order statuses are updated as needed. Order history is maintained for all transactions. Relevant parties are notified of status changes.                                                                                                                                                                                                                        |

### Process Flow

```
Actor: Admin / Manager

    [Manage Orders]
         |
    <<INCLUDE>> ── [Retrieve All Transactions]
         |
    <<INCLUDE>> ── [Display Orders with Details]
         |
    <<EXTEND>> ── [Filter Orders by Status/Date/Seller]
         |
    <<EXTEND>> ── [View Full Order Details]
         |
    <<EXTEND>> ── [Update Order Status (Admin)]
         |         └── <<INCLUDE>> ── [Validate Status Transition]
         |         └── <<INCLUDE>> ── [Process Refund (if cancelled)]
         |
    <<EXTEND>> ── [View Department Transactions (Manager)]
```

### Flow of Activities

| Step | Description                                                                                                                                                     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Actor (Admin/Manager):** Navigate to the order management page.                                                                                         |
| 2    | **Application:** Retrieve all transactions (admin sees all; manager sees department transactions).                                                        |
| 3    | **Application:** Display orders with details: buyer, seller, product, quantity, amount, status, and date.                                                 |
| 4    | **Actor (Admin/Manager):** View the list of orders and apply filters (by status, date, or seller).                                                        |
| 5    | **Application:** Filter and display the matching transactions.                                                                                            |
| 6    | **Actor (Admin/Manager):** Select a specific order to view its full details.                                                                              |
| 7    | **Application:** Display the complete transaction record including buyer info, seller info, product details, payment breakdown, and delivery information. |
| 8    | **Actor (Admin):** (Optional) Update the order status (pending → approved → ondeliver → delivered → completed).                                       |
| 9    | **Application:** Validate the status transition is allowed.                                                                                               |
| 10   | **Application:** Update the transaction status in the database.                                                                                           |
| 11   | **Application:** (If cancelled) Process any refund to the buyer's wallet balance.                                                                         |
| 12   | **Application:** Confirm the status update.                                                                                                               |
| 13   | **Actor (Admin/Manager):** View the updated order status.                                                                                                 |

---

## Table 14: MANAGE ACCOUNTS (ADMIN)

| Field                         | Description                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**       | Manage Accounts                                                                                                                                                                                                                                                                                                                             |
| **Brief Description**   | This use case allows an Admin to manage all user accounts on the RetailTalk platform. The Admin can view all registered users, search and filter by role or department, ban or unban accounts, and adjust user wallet balances. Managers can register new staff members under their department. Admins can register new delivery personnel. |
| **Purpose**             | To provide administrators with full user account management capabilities and enable managers to register staff, ensuring platform integrity and proper user access control.                                                                                                                                                                 |
| **Triggering Actor(s)** | Admin — accesses the user management interface to oversee all accounts and register delivery users. Manager — registers new staff members under their department.                                                                                                                                                                         |
| **Benefiting Actor(s)** | Admin: Maintains control over all user accounts and platform access. Manager: Can onboard new staff members to their department. Seller (Staff): Accounts are created and managed by managers. Delivery: Accounts are registered by admin. System (RetailTalk): Ensures only authorized, non-banned users can access the platform.          |
| **Pre-condition(s)**    | Admin or Manager is authenticated with appropriate role privileges. User records exist in the database.                                                                                                                                                                                                                                     |
| **Post-condition(s)**   | User accounts are viewed, created, updated, banned, or unbanned as needed. New staff or delivery accounts are registered. Account changes are reflected immediately in the system.                                                                                                                                                          |

### Process Flow

```
Actor: Admin / Manager

    [Manage Accounts]
         |
    <<INCLUDE>> ── [Retrieve All User Records (Admin)]
         |
    <<INCLUDE>> ── [Display User List with Details]
         |
    <<EXTEND>> ── [Search User by Name or Email]
         |
    <<EXTEND>> ── [Filter Users by Role]
         |
    <<EXTEND>> ── [View Full User Profile]
         |
    <<EXTEND>> ── [Ban or Unban User Account (Admin)]
         |
    <<EXTEND>> ── [Adjust User Wallet Balance (Admin)]
         |
    <<EXTEND>> ── [Register New Staff Member (Manager)]
         |
    <<EXTEND>> ── [Register New Delivery Personnel (Admin)]
```

### Flow of Activities

| Step | Description                                                                                                                |
| ---- | -------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Actor (Admin):** Navigate to the account management page.                                                          |
| 2    | **Application:** Retrieve all user records from the database.                                                        |
| 3    | **Application:** Display the user list with name, email, role, department, balance, and status.                      |
| 4    | **Actor (Admin):** (Optional) Search for a user by name or email.                                                    |
| 5    | **Application:** Filter and display matching user records.                                                           |
| 6    | **Actor (Admin):** (Optional) Filter users by role (buyer, seller, manager, delivery).                               |
| 7    | **Application:** Display users matching the selected role filter.                                                    |
| 8    | **Actor (Admin):** Select a user to view their full details.                                                         |
| 9    | **Application:** Display the user's complete profile, balance, contact info, and transaction history.                |
| 10   | **Actor (Admin):** (Optional) Click "Ban" or "Unban" to change the user's access status.                             |
| 11   | **Application:** Update the user's banned status in the database.                                                    |
| 12   | **Application:** Immediately revoke or restore the user's access to the system.                                      |
| 13   | **Actor (Admin):** (Optional) Adjust the user's wallet balance.                                                      |
| 14   | **Application:** Update the user's balance in the database and confirm the change.                                   |
| 15   | **Actor (Admin):** (Optional) Register a new delivery personnel account.                                             |
| 16   | **Application:** Create the delivery user account with the provided details (name, email, password, contact number). |
| 17   | **Actor (Manager):** Navigate to the staff management page.                                                          |
| 18   | **Actor (Manager):** Click "Register New Staff" and enter employee details.                                          |
| 19   | **Application:** Validate the email and contact number are unique.                                                   |
| 20   | **Application:** Create the staff account assigned to the manager's department.                                      |
| 21   | **Application:** Confirm the account registration.                                                                   |
| 22   | **Actor (Admin/Manager):** View the updated account information.                                                     |

---

## Table 15: APPROVE PRODUCTS

| Field                         | Description                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**       | Approve Products                                                                                                                                                                                                                                                                                                                               |
| **Brief Description**   | This use case allows an Admin to review newly submitted or updated products and approve or disapprove them before they become visible in the product catalog and search results. Only approved products are indexed for the NLP search pipeline and shown to buyers. Managers may also review products submitted by staff in their department. |
| **Purpose**             | To ensure product quality and compliance by requiring administrative review before products are published to the platform's catalog and become searchable by buyers.                                                                                                                                                                           |
| **Triggering Actor(s)** | Admin — reviews pending products for approval or disapproval. Manager — reviews products from their department's staff.                                                                                                                                                                                                                      |
| **Benefiting Actor(s)** | Admin: Maintains quality control over the product catalog. Manager: Ensures department product quality. Seller: Approved products become visible and purchasable by buyers. Buyer: Only reviewed, quality-assured products appear in search results.                                                                                           |
| **Pre-condition(s)**    | Admin or Manager is authenticated with appropriate role privileges. Products with "pending" status exist in the system.                                                                                                                                                                                                                        |
| **Post-condition(s)**   | Product status is updated to "approved" or "unapproved." Approved products become visible in search results and the product catalog. Unapproved products remain hidden from buyers.                                                                                                                                                            |

### Process Flow

```
Actor: Admin / Manager

    [Approve Products]
         |
    <<INCLUDE>> ── [Retrieve Pending Products]
         |
    <<INCLUDE>> ── [Display Pending Product List]
         |
    <<INCLUDE>> ── [Review Product Details]
         |
    <<EXTEND>> ── [Approve Product]
         |         └── <<INCLUDE>> ── [Update Status to Approved]
         |         └── <<INCLUDE>> ── [Make Product Visible in Catalog]
         |
    <<EXTEND>> ── [Disapprove Product]
                  └── <<INCLUDE>> ── [Update Status to Unapproved]
                  └── <<INCLUDE>> ── [Keep Product Hidden from Buyers]
```

### Flow of Activities

| Step | Description                                                                                                                        |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Actor (Admin/Manager):** Navigate to the product approval page.                                                            |
| 2    | **Application:** Retrieve all products with "pending" status (admin sees all; manager sees department products).             |
| 3    | **Application:** Display the list of pending products with title, description, price, stock, images, and seller information. |
| 4    | **Actor (Admin/Manager):** Select a product to review its details.                                                           |
| 5    | **Application:** Display the full product details including images, description, pricing, and seller profile.                |
| 6    | **Actor (Admin/Manager):** Review the product for quality, accuracy, and compliance.                                         |
| 7    | **Actor (Admin/Manager):** Click "Approve" to publish the product or "Disapprove" to reject it.                              |
| 8    | **Application:** (If Approved) Update the product status to "approved."                                                      |
| 9    | **Application:** (If Approved) Make the product visible in search results and the catalog.                                   |
| 10   | **Application:** (If Disapproved) Update the product status to "unapproved."                                                 |
| 11   | **Application:** (If Disapproved) Keep the product hidden from buyers.                                                       |
| 12   | **Application:** Confirm the approval/disapproval action.                                                                    |
| 13   | **Actor (Admin/Manager):** View the updated product status.                                                                  |

---

## Table 16: STORE INFORMATION

| Field                         | Description                                                                                                                                                                                                                                                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**       | Store Information                                                                                                                                                                                                                                                                                                                        |
| **Brief Description**   | This use case allows an Admin to manage store and department information within the RetailTalk platform. The Admin can create, view, and organize departments, assign managers to departments, and maintain the organizational structure of the retail platform. Managers can view their department's information and staff assignments. |
| **Purpose**             | To establish and maintain the organizational structure of the retail platform by managing departments, their assigned managers, and store-level configuration.                                                                                                                                                                           |
| **Triggering Actor(s)** | Admin — accesses the store/department management interface to create and manage departments. Manager — views their assigned department's information.                                                                                                                                                                                  |
| **Benefiting Actor(s)** | Admin: Maintains the organizational hierarchy of the platform. Manager: Views and oversees their specific department. Seller (Staff): Is organized under departments for proper management. System (RetailTalk): Uses department structure for delivery fee calculation, product grouping, and reporting.                                |
| **Pre-condition(s)**    | Admin or Manager is authenticated with appropriate role privileges.                                                                                                                                                                                                                                                                      |
| **Post-condition(s)**   | Departments are created or updated with assigned managers. The organizational structure is reflected across the platform (delivery fees, product grouping, reporting).                                                                                                                                                                   |

### Process Flow

```
Actor: Admin / Manager

    [Store Information]
         |
    <<INCLUDE>> ── [Retrieve All Departments]
         |
    <<INCLUDE>> ── [Display Department List]
         |
    <<EXTEND>> ── [Create New Department (Admin)]
         |         └── <<INCLUDE>> ── [Validate Department Name]
         |         └── <<INCLUDE>> ── [Assign Manager to Department]
         |
    <<EXTEND>> ── [View Department Details (Admin/Manager)]
         |
    <<EXTEND>> ── [Update Department Information (Admin)]
         |
    <<EXTEND>> ── [View Department Staff and Products (Manager)]
```

### Flow of Activities

| Step | Description                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------- |
| 1    | **Actor (Admin):** Navigate to the store/department management page.                                    |
| 2    | **Application:** Retrieve all departments from the database.                                            |
| 3    | **Application:** Display the list of departments with their names, assigned managers, and staff counts. |
| 4    | **Actor (Admin):** **(To Create)** Click "Create Department."                                     |
| 5    | **Actor (Admin):** Enter the department name and assign a manager.                                      |
| 6    | **Actor (Admin):** Submit the new department form.                                                      |
| 7    | **Application:** Validate the department name is unique.                                                |
| 8    | **Application:** Create the department record and assign the selected manager.                          |
| 9    | **Application:** Update the manager's role and department assignment.                                   |
| 10   | **Application:** Confirm department creation.                                                           |
| 11   | **Actor (Admin/Manager):** **(To View)** Select a department to view its details.                 |
| 12   | **Application:** Display the department's products, staff members, and performance metrics.             |
| 13   | **Actor (Admin):** **(To Update)** Modify department information or reassign the manager.         |
| 14   | **Application:** Update the department record and confirm the changes.                                  |
| 15   | **Actor (Manager):** View their department's staff list, products, and statistics.                      |
| 16   | **Application:** Display the manager's department-specific data.                                        |
| 17   | **Actor (Admin/Manager):** View the updated department information.                                     |

---

## Table 17: GENERATE REPORTS

| Field                         | Description                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**       | Generate Reports                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Brief Description**   | This use case allows an Admin to generate and view comprehensive analytics reports for the RetailTalk platform. Reports include total revenue, sales volume, order counts, average transaction values, daily and monthly income breakdowns, top-performing sellers, top-selling products, and delivery statistics. Sellers can view their own sales reports and revenue trends. Managers can view department-level reports. |
| **Purpose**             | To provide administrators, sellers, and managers with data-driven insights into performance, enabling informed business decisions through revenue tracking, trend analysis, and performance metrics.                                                                                                                                                                                                                        |
| **Triggering Actor(s)** | Admin — accesses the platform-wide reports and analytics section. Seller — views their personal sales reports and revenue trends. Manager — views department-level transaction and performance reports.                                                                                                                                                                                                                  |
| **Benefiting Actor(s)** | Admin: Gains actionable insights for platform management and business decisions. Seller: Tracks their own sales performance, revenue trends, and product demand. Manager: Monitors department performance and staff productivity. System (RetailTalk): Report data helps identify trends, top performers, and areas for improvement.                                                                                        |
| **Pre-condition(s)**    | Admin, Seller, or Manager is authenticated with appropriate role privileges. Transaction and sales data exists in the system.                                                                                                                                                                                                                                                                                               |
| **Post-condition(s)**   | Reports are generated and displayed with current data. Analytics metrics are presented in readable charts and tables.                                                                                                                                                                                                                                                                                                       |

### Process Flow

```
Actor: Admin / Seller / Manager

    [Generate Reports]
         |
    <<INCLUDE>> ── [Query Transaction and Sales Data]
         |
    <<INCLUDE>> ── [Calculate Revenue and Sales Metrics]
         |
    <<EXTEND>> ── [Generate Platform-Wide Reports (Admin)]
         |         └── <<INCLUDE>> ── [Rank Top Sellers and Top Products]
         |         └── <<INCLUDE>> ── [Compile Delivery Statistics]
         |         └── <<INCLUDE>> ── [Generate Daily/Monthly Income Breakdowns]
         |
    <<EXTEND>> ── [Generate Seller Sales Report (Seller)]
         |         └── <<INCLUDE>> ── [Calculate Seller Revenue Trends]
         |         └── <<INCLUDE>> ── [Display Day/Week/Month Comparisons]
         |
    <<EXTEND>> ── [Generate Department Report (Manager)]
         |         └── <<INCLUDE>> ── [Calculate Department Transaction Summary]
         |
    <<INCLUDE>> ── [Display Analytics Dashboard]
         |
    <<EXTEND>> ── [Filter Reports by Date Range or Department]
         |
    <<EXTEND>> ── [Export Report Data]
```

### Flow of Activities

| Step | Description                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------ |
| 1    | **Actor (Admin/Seller/Manager):** Navigate to the reports and analytics page.                          |
| 2    | **Application:** Query the database for relevant transaction and sales data based on the user's role.  |
| 3    | **Application:** (Admin) Calculate total revenue across all completed transactions.                    |
| 4    | **Application:** (Admin) Calculate total sales volume (number of items sold).                          |
| 5    | **Application:** (Admin) Calculate total order count and average transaction value.                    |
| 6    | **Application:** (Admin) Generate daily income breakdown (revenue per day).                            |
| 7    | **Application:** (Admin) Generate monthly income breakdown (revenue per month).                        |
| 8    | **Application:** (Admin) Rank top sellers by total sales volume and revenue.                           |
| 9    | **Application:** (Admin) Rank top products by times sold and total revenue generated.                  |
| 10   | **Application:** (Admin) Compile delivery statistics (total deliveries, delivery fees collected).      |
| 11   | **Application:** (Seller) Calculate the seller's revenue trends with day, week, and month comparisons. |
| 12   | **Application:** (Seller) Generate the seller's product performance and sales breakdown.               |
| 13   | **Application:** (Manager) Calculate department-level transaction summary and staff performance.       |
| 14   | **Application:** Format all metrics into charts, tables, and summary cards.                            |
| 15   | **Application:** Display the role-appropriate analytics dashboard.                                     |
| 16   | **Actor (Admin/Seller/Manager):** View the generated reports and analytics.                            |
| 17   | **Actor (Admin):** (Optional) Filter reports by date range or department.                              |
| 18   | **Application:** Re-query data with the applied filters and update the displayed reports.              |
| 19   | **Actor (Admin):** (Optional) Export report data for external use.                                     |
| 20   | **Application:** Generate a downloadable report file and provide the download link.                    |

---

## Table 18: MANAGE TRANSACTIONS

| Field                         | Description                                                                                                                                                                                                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**       | Manage Transactions                                                                                                                                                                                                                                                                                                         |
| **Brief Description**   | This use case allows Admin and Manager to view, track, and manage detailed transaction records. It includes viewing transaction details (buyer, seller, product, amount, commissions, delivery fees), transaction status history, financial breakdowns, and transaction analytics. Managers can filter by their department. |
| **Purpose**             | To provide admins and managers with comprehensive transaction oversight for financial reconciliation, commission tracking, delivery fee management, and dispute resolution.                                                                                                                                                 |
| **Triggering Actor(s)** | Admin — accesses all platform transactions. Manager — views department-level transactions.                                                                                                                                                                                                                                |
| **Benefiting Actor(s)** | Admin: Tracks platform revenue, commissions, and delivery fees. Manager: Monitors department transaction activity. System (RetailTalk): Maintains financial audit trail and enables transaction reconciliation.                                                                                                             |
| **Pre-condition(s)**    | Admin or Manager is authenticated with appropriate role privileges. Transaction records exist in the system.                                                                                                                                                                                                                |
| **Post-condition(s)**   | Transaction data is displayed with detailed breakdown (amount, commission, delivery fee). Transaction status is visible and filterable.                                                                                                                                                                                     |

### Process Flow

```
Actor: Admin / Manager

    [Manage Transactions]
         |
    <<INCLUDE>> ── [View Transaction List]
         |
    <<EXTEND>> ── [View All Transactions (Admin)]
         |         └── <<INCLUDE>> ── [Filter by Date Range]
         |         └── <<INCLUDE>> ── [Filter by Seller]
         |         └── <<INCLUDE>> ── [Filter by Status]
         |
    <<EXTEND>> ── [View Department Transactions (Manager)]
         |         └── <<INCLUDE>> ── [Filter by Date Range]
         |         └── <<INCLUDE>> ── [Calculate Department Commission Summary]
         |
    <<INCLUDE>> ── [View Transaction Details]
         |
    <<INCLUDE>> ── [View Financial Breakdown]
         |         └── Buyer Amount
         |         └── Seller Payout
         |         └── Admin Commission
         |         └── Delivery Fee
         |
    <<EXTEND>> ── [Reconcile Transactions]
         |
    <<EXTEND>> ── [Generate Transaction Report]
```

### Flow of Activities

| Step | Description                                                                                                          |
| ---- | -------------------------------------------------------------------------------------------------------------------- |
| 1    | **Actor (Admin/Manager):** Navigate to the Transactions management page.                                       |
| 2    | **Application:** Query and retrieve all transactions (Admin) or department transactions (Manager).             |
| 3    | **Application:** Display transaction list with key details (ID, buyer, seller, product, amount, status, date). |
| 4    | **Actor (Admin/Manager):** (Optional) Apply filters (date range, seller, status).                              |
| 5    | **Application:** Re-query transactions with applied filters.                                                   |
| 6    | **Application:** Update the transaction list display with filtered results.                                    |
| 7    | **Actor (Admin/Manager):** Click on a transaction to view detailed information.                                |
| 8    | **Application:** Retrieve and display complete transaction details.                                            |
| 9    | **Application:** Display financial breakdown: buyer amount, seller payout, admin commission, delivery fee.     |
| 10   | **Application:** Display transaction status and history (pending → approved → ondeliver → delivered, etc.). |
| 11   | **Actor (Admin/Manager):** View transaction analytics and summaries.                                           |
| 12   | **Application:** Calculate and display total revenue, average transaction value, and commission totals.        |

---

## Table 19: CREATE PRODUCTS

| Field                         | Description                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**       | Create Products                                                                                                                                                                                                                                                                                                                                                                         |
| **Brief Description**   | This use case allows Managers and Admins to create and list new products on the RetailTalk platform on behalf of sellers or for inventory purposes. Managers/Admins provide product information (title, description, price, images, stock), upload images to Supabase Storage, and submit the product. The system automatically generates BERT embeddings for vector similarity search. |
| **Purpose**             | To enable managers and admins to add products to the marketplace and make them discoverable through the search pipeline, supporting bulk product creation and inventory management.                                                                                                                                                                                                     |
| **Triggering Actor(s)** | Manager — creates products for sellers in their department. Admin — creates products system-wide for inventory or onboarding.                                                                                                                                                                                                                                                         |
| **Benefiting Actor(s)** | Manager/Admin: Manages product catalog efficiently. Sellers: Products added on their behalf. Buyers: Discover new products. System (RetailTalk): Increases product inventory and improves search diversity.                                                                                                                                                                             |
| **Pre-condition(s)**    | Manager/Admin is authenticated with appropriate role. Manager has assigned department (if applicable).                                                                                                                                                                                                                                                                                  |
| **Post-condition(s)**   | Product is created with status "pending" or "approved" (depending on role). BERT embedding is generated. Product appears in the product list and seller's inventory.                                                                                                                                                                                                                    |

### Process Flow

```
Actor: Manager / Admin

    [Create Products]
         |
    <<INCLUDE>> ── [Enter Product Information]
         |         └── Title
         |         └── Description
         |         └── Price
         |         └── Stock Quantity
         |         └── Category/Tags
         |
    <<INCLUDE>> ── [Upload Product Images]
         |         └── <<INCLUDE>> ── [Upload to Supabase Storage]
         |         └── <<INCLUDE>> ── [Validate Image Format]
         |
    <<INCLUDE>> ── [Generate Product Embedding]
         |         └── <<INCLUDE>> ── [Tokenize Product Title]
         |         └── <<INCLUDE>> ── [Compute BERT Embedding (768-dim)]
         |         └── <<INCLUDE>> ── [Store in pgvector]
         |
    <<INCLUDE>> ── [Submit Product]
         |
    <<EXTEND>> ── [Product Validation]
         |         └── Check required fields
         |         └── Check image quality
         |
    <<EXTEND>> ── [Set to Pending Approval]
         |
    <<INCLUDE>> ── [Confirm Product Creation]
```

### Flow of Activities

| Step | Description                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------------ |
| 1    | **Actor (Manager/Admin):** Navigate to the Create Product page.                                                    |
| 2    | **Actor (Manager/Admin):** Enter product information (title, description, price, stock, category).                 |
| 3    | **Actor (Manager/Admin):** Upload one or more product images.                                                      |
| 4    | **Application:** Validate image format (JPG, PNG) and file size.                                                   |
| 5    | **Application:** Upload images to Supabase Storage and retrieve URLs.                                              |
| 6    | **Actor (Manager/Admin):** Submit the product creation form.                                                       |
| 7    | **Application:** Validate all required fields are populated.                                                       |
| 8    | **Application:** Tokenize the product title and description.                                                       |
| 9    | **Application:** Compute BERT embedding (768-dimensional vector) using bert-base-multilingual-uncased.             |
| 10   | **Application:** Store the product record with status = "pending".                                                 |
| 11   | **Application:** Store the BERT embedding in pgvector (IVFFlat indexed).                                           |
| 12   | **Application:** Return confirmation with product ID to the manager/admin.                                         |
| 13   | **Actor (Manager/Admin):** View confirmation and product appears in the product inventory with appropriate status. |
| 14   | **Application:** Notify admin of new product awaiting approval.                                                    |

---

## Table 20: MANAGE MANAGEMENT (Manager Dashboard & Operations)

| Field                         | Description                                                                                                                                                                                                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Use Case Name**       | Manage Management                                                                                                                                                                                                                                              |
| **Brief Description**   | This use case allows Managers to oversee and manage their assigned department operations, including viewing department staff/sellers, managing product approval workflows, monitoring sales performance, and accessing department-level analytics and reports. |
| **Purpose**             | To enable managers to have centralized control over their department's operations, sales, staffing, and product approval processes.                                                                                                                            |
| **Triggering Actor(s)** | Manager — accesses the manager dashboard to manage department operations and staff.                                                                                                                                                                           |
| **Benefiting Actor(s)** | Manager: Has oversight of department operations. Admin: Leverages managers for departmental control. System (RetailTalk): Distributes management responsibilities across departments.                                                                          |
| **Pre-condition(s)**    | Manager is authenticated with manager role. Manager has an assigned department. Department has associated sellers and products.                                                                                                                                |
| **Post-condition(s)**   | Manager dashboard displays department metrics, staff list, and pending product approvals. Department operations are visible and manageable.                                                                                                                    |

### Process Flow

```
Actor: Manager

    [Manage Management]
         |
    <<INCLUDE>> ── [View Manager Dashboard]
         |         └── Department Metrics
         |         └── Sales Performance
         |         └── Staff List
         |
    <<EXTEND>> ── [Manage Department Sellers]
         |         └── <<INCLUDE>> ── [View Department Sellers]
         |         └── <<INCLUDE>> ── [Add/Remove Sellers from Department]
         |
    <<EXTEND>> ── [Approve Department Products]
         |         └── <<INCLUDE>> ── [View Pending Products]
         |         └── <<INCLUDE>> ── [Review Product Details]
         |         └── <<INCLUDE>> ── [Approve or Reject Products]
         |
    <<INCLUDE>> ── [View Department Sales Reports]
         |
    <<EXTEND>> ── [View Department Transaction Summary]
         |
    <<EXTEND>> ── [Monitor Staff Performance]
```

### Flow of Activities

| Step | Description                                                                                                      |
| ---- | ---------------------------------------------------------------------------------------------------------------- |
| 1    | **Actor (Manager):** Log in with manager credentials.                                                      |
| 2    | **Application:** Retrieve manager's assigned department and role privileges.                               |
| 3    | **Application:** Display manager dashboard with department overview.                                       |
| 4    | **Application:** Show key metrics: total sellers, active products, recent sales, revenue.                  |
| 5    | **Actor (Manager):** Navigate to view department sellers and staff.                                        |
| 6    | **Application:** Retrieve and display list of sellers assigned to the department.                          |
| 7    | **Application:** Display seller status, products count, and performance metrics.                           |
| 8    | **Actor (Manager):** Navigate to product approval section.                                                 |
| 9    | **Application:** Query products with status = "pending" from department sellers.                           |
| 10   | **Application:** Display pending products with thumbnails, titles, descriptions, and prices.               |
| 11   | **Actor (Manager):** Review a product and decide to approve or reject.                                     |
| 12   | **Application:** Update product status to "approved" or "unapproved".                                      |
| 13   | **Application:** Notify the seller of the product approval decision.                                       |
| 14   | **Actor (Manager):** View department sales and transaction reports.                                        |
| 15   | **Application:** Display department-level transaction summary, revenue trends, and top-performing sellers. |
| 16   | **Application:** Allow filtering by date range for historical analysis.                                    |
