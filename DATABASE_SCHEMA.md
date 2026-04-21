# RetailTalk — Database Schema Reference

> **Project:** RetailTalk (Supabase / PostgreSQL + pgvector)
> **Region:** ap-southeast-1
> **Generated:** 2026-04-20

---

## Table of Contents

1. [users](#1-users)
2. [user_balances](#2-user_balances)
3. [user_contacts](#3-user_contacts)
4. [user_prompts](#4-user_prompts)
5. [products](#5-products)
6. [cart_items](#6-cart_items)
7. [wishlist_items](#7-wishlist_items)
8. [product_transactions](#8-product_transactions)
9. [delivery_earnings](#9-delivery_earnings)
10. [admin_earnings](#10-admin_earnings)
11. [admin_withdrawals](#11-admin_withdrawals)
12. [stored_value](#12-stored_value)
13. [departments](#13-departments)
14. [department_balances](#14-department_balances)
15. [restock_requests](#15-restock_requests)
16. [salary_payments](#16-salary_payments)

---

## 1. `users`

**Rows:** 27

### Purpose
The central identity table for all system participants. A row is created when someone registers via `POST /auth/register`. Every other table references this table by `id`. The `role` field determines what dashboards, routes, and permissions a user has access to. `is_banned` is toggled by admins to block access without deleting the account. `department_id` and `manager_id` are set when a staff/delivery user is assigned to a department by an admin.

**Triggered when:**
- A new user registers (buyer, staff, admin, delivery, manager).
- An admin assigns a user to a department or links them to a manager.
- An admin bans or unbans a user.

### Columns

| Column | Type | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `email` | text | No | — | UNIQUE |
| `password_hash` | text | No | — | — |
| `full_name` | text | No | — | — |
| `role` | text | No | `'both'` | `buyer`, `staff`, `admin`, `delivery`, `manager` |
| `is_banned` | boolean | Yes | `false` | — |
| `created_at` | timestamptz | Yes | `now()` | — |
| `department_id` | uuid | Yes | — | FK → departments.id |
| `manager_id` | uuid | Yes | — | FK → users.id (self-referential) |
| `salary` | numeric | No | `0` | — |

---

## 2. `user_balances`

**Rows:** 26

### Purpose
Stores the current wallet balance for each user. One row per user (enforced by the UNIQUE constraint on `user_id`). The balance is credited when a buyer deposits funds or when a seller receives payment after a transaction is completed. It is debited when a buyer makes a purchase or a seller withdraws. `updated_at` tracks the last time the balance changed.

**Triggered when:**
- A user account is created (a balance row is initialized to `0.00`).
- A buyer deposits funds into their wallet (`stored_value` deposit recorded simultaneously).
- A purchase is completed — buyer's balance decreases, seller's balance increases.
- A withdrawal is processed.

### Columns

| Column | Type | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `user_id` | uuid | No | — | FK → users.id, UNIQUE |
| `balance` | numeric | No | `0.00` | — |
| `updated_at` | timestamptz | Yes | `now()` | — |

---

## 3. `user_contacts`

**Rows:** 16

### Purpose
Stores supplementary contact information for users — phone number and default delivery address. Used during checkout to pre-fill delivery details. A user only has one contact record (PK is `user_id`). Created or updated via `POST /contacts/` or `PUT /contacts/`.

**Triggered when:**
- A user saves their phone number or delivery address for the first time.
- A user updates their contact details from their profile page.

### Columns

| Column | Type | Nullable | Default | Constraint |
|---|---|---|---|---|
| `user_id` | uuid | No | — | PK, FK → users.id |
| `contact_number` | text | No | — | — |
| `delivery_address` | text | Yes | `''` | — |

---

## 4. `user_prompts`

**Rows:** 208

### Purpose
An audit / history log of every search query a user submits through the search pipeline (`POST /search/`). Used to power the AI recommendations feature (`GET /insights/recommendations/{user_id}`) — the system looks at recent prompts to understand a user's interests and suggest relevant products. Also useful for analytics on what users search for.

**Triggered when:**
- A user submits a text or voice search query.
- The search pipeline processes the query (logged before or after NLP processing).

### Columns

| Column | Type | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `user_id` | uuid | No | — | FK → users.id |
| `prompt_text` | text | No | — | — |
| `created_at` | timestamptz | Yes | `now()` | — |

---

## 5. `products`

**Rows:** 22

### Purpose
The product catalog. Each row is a product listed by a seller. The `embedding` column (768-dim vector) is generated automatically by the BERT embedding service when the product is created, enabling semantic similarity search via pgvector. Products go through an approval workflow (`status`) before becoming visible to buyers. `removal_requested_by` / `removal_requested_at` track when a seller or admin initiates product removal, which must also go through an approval flow.

**Triggered when:**
- A seller creates a new product listing (`POST /products/`) — BERT embedding is computed and stored.
- An admin approves or unapproves a product (status changes to `approved` / `unapproved`).
- A seller requests product removal (status changes to `pending_removal`).
- Stock is decremented after a successful purchase.
- A restock request is fulfilled (stock increments).

### Columns

| Column | Type | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `seller_id` | uuid | No | — | FK → users.id |
| `title` | text | No | — | — |
| `description` | text | Yes | `''` | — |
| `price` | numeric | No | — | `>= 0` |
| `images` | text[] | Yes | `'{}'` | — |
| `embedding` | vector(768) | Yes | — | IVFFlat index for pgvector search |
| `is_active` | boolean | Yes | `true` | — |
| `created_at` | timestamptz | Yes | `now()` | — |
| `stock` | integer | No | `0` | — |
| `tracking_number` | text | Yes | — | — |
| `status` | text | Yes | `'pending'` | `pending`, `approved`, `unapproved`, `pending_removal` |
| `removal_requested_by` | uuid | Yes | — | FK → users.id |
| `removal_requested_at` | timestamptz | Yes | — | — |

---

## 6. `cart_items`

**Rows:** 1

### Purpose
Represents the buyer's active shopping cart. Each row is one product in one buyer's cart with a quantity. A unique constraint on `(buyer_id, product_id)` prevents duplicate entries — adding the same product again increments quantity instead. Rows are deleted when a buyer checks out or manually removes items.

**Triggered when:**
- A buyer adds a product to their cart (`POST /cart/items`).
- A buyer updates the quantity of a cart item (`PUT /cart/items`).
- A buyer removes an item from the cart (`DELETE /cart/items`).
- A buyer completes a purchase (cart items are cleared).

### Columns

| Column | Type | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `buyer_id` | uuid | No | — | FK → users.id |
| `product_id` | uuid | No | — | FK → products.id |
| `quantity` | integer | No | `1` | `> 0`, UNIQUE(buyer_id, product_id) |
| `created_at` | timestamptz | Yes | `now()` | — |

---

## 7. `wishlist_items`

**Rows:** 18

### Purpose
Saves products that a buyer wants to keep track of but is not ready to purchase yet. A unique constraint on `(buyer_id, product_id)` prevents duplicate wishlists per product. Sellers can see aggregated wishlist analytics for their own products via `GET /wishlist/seller-report` to understand demand. The wishlist page (`/wishlist`) displays all saved items for the logged-in buyer.

**Triggered when:**
- A buyer clicks the wishlist/heart button on a product detail page (`POST /wishlist/add`).
- A buyer removes a product from their wishlist (`DELETE /wishlist/remove/{product_id}`).

### Columns

| Column | Type | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `buyer_id` | uuid | No | — | FK → users.id |
| `product_id` | uuid | No | — | FK → products.id |
| `created_at` | timestamptz | Yes | `now()` | — |

---

## 8. `product_transactions`

**Rows:** 68

### Purpose
The core order ledger. Every purchase creates a row here. Tracks the full lifecycle of an order from placement (`pending`) through admin approval, delivery assignment, and final resolution (`delivered` / `undelivered` / `cancelled`). Stores all financial breakdown: total `amount`, `seller_amount` (after commission), `admin_commission`, and `delivery_fee`. `group_id` groups multiple items from the same checkout into one logical order. `assigned_staff_id` records which staff member processed a walk-in order.

**Triggered when:**
- A buyer confirms a purchase (row created with `status = 'pending'`).
- An admin approves the order (status → `approved`).
- A delivery user accepts the order (status → `ondeliver`).
- The delivery user marks it delivered (status → `delivered`) or failed (status → `undelivered`).
- A buyer or admin cancels the order (status → `cancelled`).
- `picked_up_at` is set when the delivery user physically picks up the parcel.

### Columns

| Column | Type | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `buyer_id` | uuid | No | — | FK → users.id |
| `seller_id` | uuid | No | — | FK → users.id |
| `product_id` | uuid | No | — | FK → products.id |
| `quantity` | integer | No | `1` | — |
| `amount` | numeric | No | — | Total paid by buyer |
| `seller_amount` | numeric | No | `0` | Amount remitted to seller |
| `admin_commission` | numeric | No | `0` | Platform commission |
| `delivery_fee` | numeric | No | `0` | Fee paid to delivery user |
| `status` | text | No | `'ongoing'` | `pending`, `approved`, `ondeliver`, `delivered`, `undelivered`, `cancelled` |
| `purchase_type` | text | No | `'delivery'` | `delivery` |
| `delivery_address` | text | Yes | `''` | — |
| `delivery_user_id` | uuid | Yes | — | FK → users.id |
| `assigned_staff_id` | uuid | Yes | — | FK → users.id |
| `group_id` | uuid | Yes | — | Groups items from one checkout |
| `picked_up_at` | timestamptz | Yes | — | When delivery user picked up parcel |
| `created_at` | timestamptz | Yes | `now()` | — |

---

## 9. `delivery_earnings`

**Rows:** 18

### Purpose
Records the delivery fee earned by a delivery user for each completed transaction. One row per delivered transaction. This table is the source of truth for what a delivery user has earned — the admin uses it to calculate payouts. It is separate from `user_balances` to preserve an immutable earnings history.

**Triggered when:**
- A delivery user marks an order as `delivered`, the system writes a row here with the `delivery_fee` from `product_transactions`.

### Columns

| Column | Type | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `delivery_user_id` | uuid | No | — | FK → users.id |
| `transaction_id` | uuid | No | — | FK → product_transactions.id |
| `amount` | numeric | No | `90.00` | Delivery fee earned |
| `created_at` | timestamptz | Yes | `now()` | — |

---

## 10. `admin_earnings`

**Rows:** 17

### Purpose
Records the commission earned by the platform (admin) for each completed transaction. One row per transaction where commission was collected. Provides an audit trail of platform revenue, separate from the general `stored_value` ledger. Admins can view cumulative earnings via the admin dashboard.

**Triggered when:**
- A transaction is completed and the `admin_commission` amount is finalized and credited to the platform.

### Columns

| Column | Type | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `transaction_id` | uuid | No | — | FK → product_transactions.id |
| `amount` | numeric | No | — | Commission earned by admin |
| `created_at` | timestamptz | Yes | `now()` | — |

---

## 11. `admin_withdrawals`

**Rows:** 0

### Purpose
Tracks when an admin withdraws funds from a department's balance (e.g., to cover operational costs or salary payouts). Each row records which admin performed the withdrawal, which department's balance was debited, the amount, and optional notes. Provides accountability for outgoing departmental funds.

**Triggered when:**
- An admin manually withdraws funds from a department budget via the admin dashboard.

### Columns

| Column | Type | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `admin_id` | uuid | No | — | FK → users.id |
| `department_id` | uuid | No | — | FK → departments.id |
| `amount` | numeric | No | — | `> 0` |
| `notes` | text | Yes | `''` | — |
| `created_at` | timestamptz | Yes | `now()` | — |

---

## 12. `stored_value`

**Rows:** 104

### Purpose
A general-purpose financial ledger that logs every monetary event for every user — deposits, withdrawals, purchases, restock payments, and restock earnings. It is an append-only log; balances are never updated here, only new rows appended. `metadata` (JSONB) stores contextual details per transaction type (e.g., `transaction_id`, `product_id`, `restock_request_id`). The `user_balances` table holds the current balance; `stored_value` is the history behind it.

**Triggered when:**
- A user deposits money into their wallet (`transaction_type = 'deposit'`).
- A user withdraws money (`transaction_type = 'withdrawal'`).
- A buyer makes a purchase (`transaction_type = 'purchase'`).
- A restock request is paid for by the department (`transaction_type = 'restock_payment'`).
- A seller receives restock stock earnings (`transaction_type = 'restock_earning'`).

### Columns

| Column | Type | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `user_id` | uuid | No | — | FK → users.id |
| `transaction_type` | text | No | — | `deposit`, `withdrawal`, `restock_payment`, `restock_earning`, `purchase` |
| `amount` | numeric | No | — | — |
| `metadata` | jsonb | Yes | — | Contextual details (e.g., linked transaction/product IDs) |
| `created_at` | timestamptz | Yes | `now()` | — |

---

## 13. `departments`

**Rows:** 5

### Purpose
Represents organizational departments within the platform (e.g., Electronics, Apparel). Each department has one assigned manager (`manager_id`). Staff (sellers) and delivery users are assigned to a department via `users.department_id`. Departments have their own budget (`department_balances`) and are the unit of organization for restock requests, salary payments, and admin withdrawals.

**Triggered when:**
- An admin creates a new department.
- An admin assigns a manager to a department.
- Department details (name, description) are updated.

### Columns

| Column | Type | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `name` | text | No | — | UNIQUE |
| `description` | text | Yes | `''` | — |
| `manager_id` | uuid | Yes | — | FK → users.id |
| `created_at` | timestamptz | Yes | `now()` | — |

---

## 14. `department_balances`

**Rows:** 4

### Purpose
Holds the current monetary budget/balance for each department. Used to fund restock requests and salary payments. When a restock is approved and fulfilled, the cost is debited from the department balance. When an admin withdraws or a salary is paid, the balance decreases. The PK is `department_id` (one row per department).

**Triggered when:**
- A department is created (a balance row is initialized).
- A restock request is completed (cost deducted from department balance).
- An admin credits/funds a department budget.
- An admin withdrawal is recorded against the department.
- A salary payment is disbursed from the department budget.

### Columns

| Column | Type | Nullable | Default | Constraint |
|---|---|---|---|---|
| `department_id` | uuid | No | — | PK, FK → departments.id |
| `balance` | numeric | No | `0` | Current department budget |

---

## 15. `restock_requests`

**Rows:** 19

### Purpose
Manages the full restock workflow for products that are low in stock. A staff member initiates a request, the department manager approves it (with a quantity), a delivery user accepts and transports the stock, and finally marks it delivered. Each status transition is timestamped for audit purposes (`manager_approved_at`, `delivery_accepted_at`, `delivered_at`). Notes fields allow communication between staff, manager, and delivery at each step.

**Triggered when:**
- A staff member identifies a low-stock product and submits a restock request (`status = 'pending_manager'`).
- A manager approves or rejects the request (status → `approved_manager` / `rejected_manager`).
- A delivery user accepts the restock delivery job (status → `accepted_delivery`).
- The stock is in transit (status → `in_transit`).
- The delivery user delivers the stock (status → `delivered`).
- The request is cancelled at any stage (status → `cancelled`).

### Columns

| Column | Type | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `staff_id` | uuid | No | — | FK → users.id (requesting staff) |
| `department_id` | uuid | No | — | FK → departments.id |
| `product_id` | uuid | No | — | FK → products.id |
| `requested_quantity` | integer | No | — | `> 0` |
| `approved_quantity` | integer | Yes | — | Set by manager on approval |
| `notes` | text | Yes | `''` | Staff notes |
| `manager_notes` | text | Yes | `''` | Manager's approval/rejection notes |
| `delivery_notes` | text | Yes | `''` | Delivery user notes |
| `status` | text | No | `'pending_manager'` | `pending_manager`, `approved_manager`, `rejected_manager`, `accepted_delivery`, `in_transit`, `delivered`, `cancelled` |
| `delivery_user_id` | uuid | Yes | — | FK → users.id (assigned delivery user) |
| `manager_approved_at` | timestamptz | Yes | — | Timestamp of manager approval |
| `delivery_accepted_at` | timestamptz | Yes | — | Timestamp delivery user accepted |
| `delivered_at` | timestamptz | Yes | — | Timestamp of delivery completion |
| `created_at` | timestamptz | Yes | `now()` | — |

---

## 16. `salary_payments`

**Rows:** 12

### Purpose
Records salary disbursements made by an admin to staff or delivery users. Each row captures who was paid, by which admin, from which department's budget, the amount, and the billing month (stored as a text string e.g. `"2026-03"`). Provides a permanent payroll history and is used to prevent double-paying for the same month. The `department_id` links the payment to the department whose budget was used.

**Triggered when:**
- An admin processes a monthly salary payment for a staff or delivery user via the admin dashboard.

### Columns

| Column | Type | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | No | `gen_random_uuid()` | PK |
| `admin_id` | uuid | No | — | FK → users.id (admin who paid) |
| `recipient_id` | uuid | No | — | FK → users.id (staff/delivery recipient) |
| `department_id` | uuid | Yes | — | FK → departments.id |
| `amount` | numeric | No | — | `> 0` |
| `payment_month` | text | No | — | e.g. `"2026-03"` |
| `notes` | text | Yes | `''` | — |
| `created_at` | timestamptz | Yes | `now()` | — |

---

## Entity Relationship Summary

```
users ─────────────────────────────────────────────────────────┐
  │                                                             │
  ├──< user_balances      (1 wallet per user)                   │
  ├──< user_contacts      (1 contact record per user)           │
  ├──< user_prompts       (search history log)                  │
  ├──< stored_value       (financial ledger entries)            │
  │                                                             │
  ├──< products           (seller lists products)               │
  │       └──< cart_items         (buyers add to cart)          │
  │       └──< wishlist_items     (buyers save to wishlist)     │
  │       └──< restock_requests   (staff request restock)       │
  │                                                             │
  ├──< product_transactions  (orders: buyer ↔ seller)           │
  │       └──< admin_earnings    (platform commission log)      │
  │       └──< delivery_earnings (delivery fee log)             │
  │                                                             │
  └──< departments ────────────────────────────────────────────┘
          └──< department_balances  (dept budget)
          └──< restock_requests     (dept funds restocks)
          └──< admin_withdrawals    (admin takes from dept)
          └──< salary_payments      (admin pays staff)
```
