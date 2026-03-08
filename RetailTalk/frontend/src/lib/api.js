/**
 * API client — all backend calls go through here.
 * Includes 10-second timeout and proper error handling.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TIMEOUT_MS = 10000; // 10 second timeout

function getToken() {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('retailtalk_token');
    }
    return null;
}

export function setToken(token) {
    localStorage.setItem('retailtalk_token', token);
}

export function removeToken() {
    localStorage.removeItem('retailtalk_token');
}

export function getStoredUser() {
    if (typeof window !== 'undefined') {
        const data = localStorage.getItem('retailtalk_user');
        return data ? JSON.parse(data) : null;
    }
    return null;
}

export function setStoredUser(user) {
    localStorage.setItem('retailtalk_user', JSON.stringify(user));
}

async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res;
    try {
        res = await fetch(`${API_URL}${path}`, {
            ...options,
            headers,
            signal: controller.signal,
        });
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('Request timed out after 10 seconds. Please check your connection and try again.');
        }
        throw new Error('Network error: Cannot connect to the server. Make sure the backend is running.');
    } finally {
        clearTimeout(timeoutId);
    }

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `API error ${res.status}`);
    }

    return res.json();
}

// --- Auth ---
export async function register(email, password, fullName, role = 'buyer') {
    const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name: fullName, role }),
    });
    setToken(data.access_token);
    setStoredUser(data.user);
    return data;
}

export async function login(email, password) {
    const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    setToken(data.access_token);
    setStoredUser(data.user);
    return data;
}

export async function getMe() {
    return apiFetch('/auth/me');
}

export function logout() {
    removeToken();
    localStorage.removeItem('retailtalk_user');
}

// --- Products ---
export async function createProduct(product) {
    return apiFetch('/products/', {
        method: 'POST',
        body: JSON.stringify(product),
    });
}

export async function listProducts(limit = 50) {
    return apiFetch(`/products/?limit=${limit}`);
}

export async function getMyProducts() {
    return apiFetch('/products/my');
}

export async function getProduct(id) {
    return apiFetch(`/products/${id}`);
}

export async function updateProduct(id, data) {
    return apiFetch(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function deleteProduct(id) {
    return apiFetch(`/products/${id}`, { method: 'DELETE' });
}

/**
 * Upload a product image file to Supabase Storage.
 * Returns { url, filename }.
 */
export async function uploadProductImage(file) {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s for uploads

    let res;
    try {
        res = await fetch(`${API_URL}/products/upload-image`, {
            method: 'POST',
            headers: {
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: formData,
            signal: controller.signal,
        });
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('Image upload timed out. Try a smaller file.');
        }
        throw new Error('Network error during upload.');
    } finally {
        clearTimeout(timeoutId);
    }

    if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(error.detail || `Upload error ${res.status}`);
    }

    return res.json();
}

// --- Search (ML-powered!) ---
export async function searchProducts(query, maxResults = 20) {
    // Log the prompt asynchronously (don't block the search)
    fetch(`${API_URL}/insights/prompts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
        },
        body: JSON.stringify({ prompt: query }),
    }).catch(console.error);

    return apiFetch(`/search/?q=${encodeURIComponent(query)}&max_results=${maxResults}`);
}

// --- Insights ---
export async function getBuyerInsights() {
    return apiFetch('/insights/buyer');
}

export async function getSellerInsights() {
    return apiFetch('/insights/seller');
}

// --- Transactions ---
export async function buyProduct(productId, quantity = 1) {
    return apiFetch('/transactions/buy', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, quantity }),
    });
}

export async function getTransactionHistory() {
    return apiFetch('/transactions/history');
}

export async function getBalance() {
    return apiFetch('/transactions/balance');
}

export async function topUp(amount) {
    return apiFetch('/transactions/topup', {
        method: 'POST',
        body: JSON.stringify({ amount }),
    });
}

export async function withdraw(amount) {
    return apiFetch('/transactions/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount }),
    });
}

export async function getSVFHistory() {
    return apiFetch('/transactions/svf-history');
}

// --- Admin ---
export async function adminLogin(email, password) {
    const data = await apiFetch('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    setToken(data.access_token);
    localStorage.setItem('retailtalk_admin', JSON.stringify(data.user));
    return data;
}

export async function adminRegister(email, password, fullName) {
    const data = await apiFetch('/auth/admin/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name: fullName }),
    });
    setToken(data.access_token);
    localStorage.setItem('retailtalk_admin', JSON.stringify(data.user));
    return data;
}

export function getStoredAdmin() {
    if (typeof window !== 'undefined') {
        const data = localStorage.getItem('retailtalk_admin');
        return data ? JSON.parse(data) : null;
    }
    return null;
}

export function adminLogout() {
    removeToken();
    localStorage.removeItem('retailtalk_admin');
}

export async function adminGetDashboard() {
    return apiFetch('/admin/dashboard');
}

export async function adminGetUsers(search = '') {
    return apiFetch(`/admin/users?search=${encodeURIComponent(search)}`);
}

export async function adminBanUser(userId, isBanned) {
    return apiFetch(`/admin/users/${userId}/ban`, {
        method: 'PUT',
        body: JSON.stringify({ is_banned: isBanned }),
    });
}

export async function adminSetBalance(userId, balance) {
    return apiFetch(`/admin/users/${userId}/balance`, {
        method: 'PUT',
        body: JSON.stringify({ balance }),
    });
}

export async function adminGetTransactions(search = '') {
    return apiFetch(`/admin/transactions?search=${encodeURIComponent(search)}`);
}

export async function adminGetReports() {
    return apiFetch('/admin/reports');
}

export async function adminGetProducts(search = '') {
    return apiFetch(`/admin/products?search=${encodeURIComponent(search)}`);
}

export async function adminUpdateProduct(productId, data) {
    return apiFetch(`/admin/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}
