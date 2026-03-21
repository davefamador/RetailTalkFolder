'use client';

import { useState, useEffect, useRef } from 'react';
import { createProduct, getMyProducts, updateProduct, deleteProduct, getStoredUser, logout, uploadProductImage, createRestockRequest, getMyRestockRequests, getStaffWalkinOrders, updateWalkinOrderStatus, getStaffDeliveryOrders, updateDeliveryOrderStatus, getTransactionHistory, getBalance } from '../../lib/api';
import SearchContent from '../components/SearchContent';

// ── Sidebar Item ─────────────────────────────────────────
function SidebarItem({ icon, label, active, onClick, badge }) {
    return (
        <button onClick={onClick} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 20px', width: '100%',
            border: 'none', cursor: 'pointer',
            background: active ? 'rgba(108,99,255,0.15)' : 'transparent',
            color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: active ? 600 : 400,
            fontSize: '0.9rem', borderRadius: 10, textAlign: 'left',
            transition: 'all 0.2s',
            fontFamily: 'Inter, sans-serif',
        }}>
            <span style={{ fontSize: '1.1rem', width: 24, textAlign: 'center' }}>{icon}</span>
            <span style={{ flex: 1 }}>{label}</span>
            {badge != null && badge > 0 && (
                <span style={{
                    background: 'rgba(99,102,241,0.2)', color: 'var(--accent-primary)',
                    padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 700,
                }}>{badge}</span>
            )}
        </button>
    );
}


export default function SellPage() {
    const [user, setUser] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [products, setProducts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('1');
    const [imageFiles, setImageFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);
    // Restock state
    const [showRestockModal, setShowRestockModal] = useState(false);
    const [restockProductId, setRestockProductId] = useState('');
    const [restockQuantity, setRestockQuantity] = useState('');
    const [restockNotes, setRestockNotes] = useState('');
    const [restockRequests, setRestockRequests] = useState([]);
    const [restockLoading, setRestockLoading] = useState(false);
    // Walk-in orders state
    const [walkinOrders, setWalkinOrders] = useState([]);
    const [walkinLoading, setWalkinLoading] = useState(false);
    // Delivery orders state
    const [deliveryOrders, setDeliveryOrders] = useState([]);
    const [deliveryLoading, setDeliveryLoading] = useState(false);
    // Active section tab
    const [activeSection, setActiveSection] = useState('dashboard');
    const [initialLoading, setInitialLoading] = useState(true);
    // Dashboard state
    const [sellerBalance, setSellerBalance] = useState(0);
    const [sellerTxns, setSellerTxns] = useState([]);

    useEffect(() => {
        const stored = getStoredUser();
        if (!stored) {
            window.location.href = '/login';
            return;
        }
        if (stored.role !== 'seller') {
            window.location.href = '/';
            return;
        }
        setUser(stored);
        setAuthChecked(true);
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setInitialLoading(true);
        try {
            await Promise.all([loadProducts(), loadRestockRequests(), loadWalkinOrders(), loadDeliveryOrders(), loadDashboardData()]);
        } finally {
            setInitialLoading(false);
        }
    };

    const loadDashboardData = async () => {
        try {
            const [txns, bal] = await Promise.all([getTransactionHistory(), getBalance()]);
            setSellerTxns(txns);
            setSellerBalance(parseFloat(bal.balance) || 0);
        } catch (e) { console.error(e); }
    };

    const loadProducts = async () => {
        try {
            const data = await getMyProducts();
            setProducts(data);
        } catch (err) {
            console.error(err);
        }
    };

    const loadRestockRequests = async () => {
        try {
            const data = await getMyRestockRequests();
            setRestockRequests(data);
        } catch (err) { console.error(err); }
    };

    const loadWalkinOrders = async () => {
        try {
            const data = await getStaffWalkinOrders();
            setWalkinOrders(data);
        } catch (err) { console.error(err); }
    };

    const handleRestockSubmit = async () => {
        if (!restockProductId || !restockQuantity || parseInt(restockQuantity) < 1) {
            setError('Please select a product and enter a valid quantity');
            return;
        }
        setRestockLoading(true);
        try {
            await createRestockRequest({
                product_id: restockProductId,
                requested_quantity: parseInt(restockQuantity),
                notes: restockNotes,
            });
            setSuccess('Restock request submitted!');
            setShowRestockModal(false);
            setRestockProductId('');
            setRestockQuantity('');
            setRestockNotes('');
            loadRestockRequests();
        } catch (err) { setError(err.message); }
        finally { setRestockLoading(false); }
    };

    const loadDeliveryOrders = async () => {
        try {
            const data = await getStaffDeliveryOrders();
            setDeliveryOrders(data);
        } catch (err) { console.error(err); }
    };

    const handleDeliveryStatusUpdate = async (txnId, newStatus) => {
        setDeliveryLoading(true);
        try {
            await updateDeliveryOrderStatus(txnId, newStatus);
            setSuccess(`Order marked as ready for pickup`);
            loadDeliveryOrders();
            loadDashboardData();
        } catch (err) { setError(err.message); }
        finally { setDeliveryLoading(false); }
    };

    const handleWalkinStatusUpdate = async (txnId, newStatus) => {
        setWalkinLoading(true);
        try {
            await updateWalkinOrderStatus(txnId, newStatus);
            setSuccess(`Order updated to "${newStatus}"`);
            loadWalkinOrders();
            if (newStatus === 'completed') loadDashboardData();
        } catch (err) { setError(err.message); }
        finally { setWalkinLoading(false); }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setPrice('');
        setStock('1');
        setImageFiles([]);
        setEditingProduct(null);
        setShowForm(false);
    };

    const startEdit = (product) => {
        setEditingProduct(product);
        setTitle(product.title);
        setDescription(product.description || '');
        setPrice(product.price.toString());
        setStock((product.stock || 0).toString());
        const existing = (product.images || []).map(url => ({ file: null, preview: url, url }));
        setImageFiles(existing);
        setShowForm(true);
        setError('');
        setSuccess('');
    };

    // --- Drag & Drop ---
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        if (e.type === 'dragleave') setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        addFiles(files);
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
        addFiles(files);
        e.target.value = '';
    };

    const addFiles = (files) => {
        const remaining = 5 - imageFiles.length;
        if (remaining <= 0) {
            setError('Maximum 5 images allowed');
            return;
        }
        const toAdd = files.slice(0, remaining);
        const newItems = toAdd.map(f => ({
            file: f,
            preview: URL.createObjectURL(f),
            url: null,
        }));
        setImageFiles(prev => [...prev, ...newItems]);
    };

    const removeImage = (index) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!title.trim()) { setError('Product title is required'); return; }
        if (!description.trim()) { setError('Product description is required'); return; }
        if (!price || parseFloat(price) <= 0) { setError('Price must be greater than 0'); return; }
        if (!stock || parseInt(stock) < 1) { setError('Stock must be at least 1'); return; }
        if (imageFiles.length === 0) { setError('At least one product image is required'); return; }

        setLoading(true);

        try {
            setUploadingImages(true);
            const imageUrls = [];
            for (const img of imageFiles) {
                if (img.url) {
                    imageUrls.push(img.url);
                } else if (img.file) {
                    const result = await uploadProductImage(img.file);
                    imageUrls.push(result.url);
                }
            }
            setUploadingImages(false);

            const productData = {
                title: title.trim(),
                description: description.trim(),
                price: parseFloat(price),
                stock: parseInt(stock),
                images: imageUrls,
            };

            if (editingProduct) {
                await updateProduct(editingProduct.id, productData);
                setSuccess('Product updated successfully!');
            } else {
                await createProduct(productData);
                setSuccess('Product created successfully!');
            }
            resetForm();
            loadProducts();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setUploadingImages(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await deleteProduct(id);
            loadProducts();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleLogout = () => { logout(); window.location.href = '/login'; };

    if (!authChecked) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: 40, height: 40 }}></div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* ===== SIDEBAR ===== */}
            <aside style={{
                width: 260, background: 'var(--bg-secondary)',
                borderRight: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column',
                position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 200,
            }}>
                <a href="/" style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '20px 20px 16px', textDecoration: 'none',
                    borderBottom: '1px solid var(--border-color)',
                }}>
                    <img src="/logo.png" alt="RetailTalk" style={{ height: 28, width: 28 }} />
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>RetailTalk</span>
                </a>

                <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <SidebarItem icon="📊" label="Dashboard" active={activeSection === 'dashboard'} onClick={() => setActiveSection('dashboard')} />
                    <SidebarItem icon="🏷️" label="Products" active={activeSection === 'products'} onClick={() => setActiveSection('products')} />
                    <SidebarItem icon="🛒" label="Walk-in Orders" active={activeSection === 'walkin'} onClick={() => setActiveSection('walkin')} badge={walkinOrders.length} />
                    <SidebarItem icon="🚚" label="Delivery Orders" active={activeSection === 'delivery'} onClick={() => setActiveSection('delivery')} badge={deliveryOrders.filter(o => o.status === 'pending').length} />
                    <SidebarItem icon="📦" label="Restock" active={activeSection === 'restock'} onClick={() => setActiveSection('restock')} badge={restockRequests.length} />

                    <div style={{ height: 1, background: 'var(--border-color)', margin: '8px 0' }} />

                    <SidebarItem icon="🔍" label="Search" active={activeSection === 'search'} onClick={() => setActiveSection('search')} />
                    <SidebarItem icon="📋" label="Order History" active={activeSection === 'orderhistory'} onClick={() => setActiveSection('orderhistory')} />
                </nav>

                <div style={{
                    padding: '16px 20px', borderTop: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', gap: 12,
                }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'rgba(16,185,129,0.15)', color: '#10b981',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.85rem',
                    }}>
                        {user?.full_name?.charAt(0)?.toUpperCase() || 'S'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.full_name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Staff</div>
                    </div>
                    <button onClick={handleLogout} title="Logout" style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: '1.1rem',
                    }}>🚪</button>
                </div>
            </aside>

            {/* ===== MAIN CONTENT ===== */}
            <main style={{ marginLeft: 260, flex: 1, padding: '32px 40px', maxWidth: 1200 }}>
                {error && (
                    <div className="alert alert-error" style={{ marginBottom: 16 }}>
                        {error}
                        <button onClick={() => setError('')} style={{
                            float: 'right', background: 'none', border: 'none',
                            cursor: 'pointer', color: 'inherit', fontWeight: 700,
                        }}>✕</button>
                    </div>
                )}
                {success && (
                    <div className="alert alert-success" style={{ marginBottom: 16 }}>
                        {success}
                        <button onClick={() => setSuccess('')} style={{
                            float: 'right', background: 'none', border: 'none',
                            cursor: 'pointer', color: 'inherit', fontWeight: 700,
                        }}>✕</button>
                    </div>
                )}

                {/* Loading state for initial data */}
                {initialLoading && (activeSection === 'dashboard' || activeSection === 'products' || activeSection === 'walkin' || activeSection === 'delivery' || activeSection === 'restock') && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
                        <div className="spinner" style={{ width: 40, height: 40 }}></div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading data...</p>
                    </div>
                )}

                {/* ===== DASHBOARD ===== */}
                {activeSection === 'dashboard' && !initialLoading && (() => {
                    const mySoldTxns = sellerTxns.filter(t => t.buyer_id !== user?.id);
                    const totalRevenue = mySoldTxns.reduce((sum, t) => sum + (t.seller_amount || 0), 0);
                    const completedTxns = mySoldTxns.filter(t => ['delivered', 'completed'].includes(t.status));
                    const totalSales = completedTxns.reduce((sum, t) => sum + t.amount, 0);
                    const activeProducts = products.filter(p => p.is_active);
                    const lowStock = products.filter(p => p.is_active && (p.stock || 0) <= 5);

                    return (
                        <div>
                            <div style={{ marginBottom: 24 }}>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Dashboard</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Overview of your store activity</p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
                                <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Wallet Balance</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>PHP {sellerBalance.toFixed(2)}</div>
                                </div>
                                <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Revenue</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>PHP {totalRevenue.toFixed(2)}</div>
                                </div>
                                <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Sales</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>PHP {totalSales.toFixed(2)}</div>
                                </div>
                                <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Transactions</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{mySoldTxns.length}</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
                                <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Active Products</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>{activeProducts.length}</div>
                                </div>
                                <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Low Stock</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: lowStock.length > 0 ? '#ef4444' : '#10b981' }}>{lowStock.length}</div>
                                </div>
                                <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Pending Walk-in</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>{walkinOrders.length}</div>
                                </div>
                                <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Pending Delivery</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>{deliveryOrders.filter(o => o.status === 'pending').length}</div>
                                </div>
                            </div>

                            {/* Low stock alerts */}
                            {lowStock.length > 0 && (
                                <div className="card" style={{ padding: 20 }}>
                                    <h3 style={{ fontWeight: 700, marginBottom: 12, color: '#ef4444' }}>Low Stock Products</h3>
                                    <div style={{ display: 'grid', gap: 8 }}>
                                        {lowStock.map(p => (
                                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.05)' }}>
                                                <span style={{ fontWeight: 600 }}>{p.title}</span>
                                                <span style={{ color: '#ef4444', fontWeight: 700 }}>{p.stock || 0} left</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* ===== SEARCH TAB (embedded) ===== */}
                {activeSection === 'search' && <SearchContent />}

                {/* ===== ORDER HISTORY TAB ===== */}
                {activeSection === 'orderhistory' && (() => {
                    const storeOrders = sellerTxns.filter(t => t.buyer_id !== user?.id);
                    const statusColors = {
                        pending: { bg: 'rgba(251,191,36,0.15)', color: '#f59e0b' },
                        approved: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
                        ondeliver: { bg: 'rgba(99,102,241,0.15)', color: '#6366f1' },
                        delivered: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
                        pending_walkin: { bg: 'rgba(251,191,36,0.15)', color: '#f59e0b' },
                        inwork: { bg: 'rgba(99,102,241,0.15)', color: '#6366f1' },
                        ready: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
                        picked_up: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
                        completed: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
                    };
                    const statusLabel = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    return (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <div>
                                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Order History</h1>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>All purchases made in your store</p>
                                </div>
                                <div style={{
                                    background: 'var(--card-bg)', padding: '8px 16px', borderRadius: 10,
                                    border: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)',
                                }}>
                                    {storeOrders.length} order{storeOrders.length !== 1 ? 's' : ''}
                                </div>
                            </div>

                            {storeOrders.length === 0 ? (
                                <div className="card" style={{ padding: 60, textAlign: 'center' }}>
                                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
                                    <h3 style={{ fontWeight: 700, marginBottom: 6 }}>No orders yet</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Purchases made in your store will appear here</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {storeOrders.map(order => {
                                        const img = order.product_images?.[0];
                                        const sc = statusColors[order.status] || { bg: 'rgba(107,114,128,0.15)', color: '#6b7280' };
                                        const date = new Date(order.created_at);
                                        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                        return (
                                            <div key={order.id} className="card" style={{
                                                padding: 16, display: 'flex', gap: 14, alignItems: 'center',
                                                transition: 'all 0.2s',
                                            }}>
                                                {/* Product Image */}
                                                <div style={{
                                                    width: 56, height: 56, borderRadius: 10, overflow: 'hidden',
                                                    background: 'var(--bg-secondary)', flexShrink: 0,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    {img ? (
                                                        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <span style={{ fontSize: '1.5rem' }}>📦</span>
                                                    )}
                                                </div>

                                                {/* Product & Buyer Info */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {order.product_title || 'Unknown Product'}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                                                        <span>Buyer: <strong style={{ color: 'var(--text-primary)' }}>{order.buyer_name || 'Unknown'}</strong></span>
                                                        <span>Qty: <strong style={{ color: 'var(--text-primary)' }}>{order.quantity}</strong></span>
                                                        <span style={{
                                                            background: order.purchase_type === 'delivery' ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)',
                                                            color: order.purchase_type === 'delivery' ? '#6366f1' : '#10b981',
                                                            padding: '1px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                                                        }}>
                                                            {order.purchase_type === 'delivery' ? '🚚 Delivery' : '🛒 Walk-in'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Amount */}
                                                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 90 }}>
                                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent-primary)' }}>
                                                        ₱{(order.amount + (order.delivery_fee || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </div>
                                                    {order.delivery_fee > 0 && (
                                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                            incl. ₱{order.delivery_fee.toFixed(2)} delivery
                                                        </div>
                                                    )}
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                        Earned: ₱{(order.seller_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </div>
                                                </div>

                                                {/* Status & Date */}
                                                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 100 }}>
                                                    <span style={{
                                                        display: 'inline-block', padding: '3px 10px', borderRadius: 8,
                                                        background: sc.bg, color: sc.color, fontSize: '0.75rem', fontWeight: 700,
                                                        marginBottom: 4,
                                                    }}>
                                                        {statusLabel(order.status)}
                                                    </span>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                        {dateStr} {timeStr}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    );
                })()}

                {/* ===== PRODUCTS TAB ===== */}
                {activeSection === 'products' && !initialLoading && (<>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>My Products</h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage your product listings</p>
                        </div>
                        {!user.department_id && (
                            <button className="btn btn-primary" onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}>
                                {showForm ? 'Cancel' : '+ New Product'}
                            </button>
                        )}
                    </div>

                    {/* Create / Edit Product Form */}
                    {showForm && !user.department_id && (
                        <div className="card" style={{ marginBottom: 24 }}>
                            <h3 style={{ marginBottom: 16 }}>
                                {editingProduct ? 'Edit Product' : 'Create New Product'}
                            </h3>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label>Product Title *</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. Wireless Bluetooth Headphones"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description *</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe your product in detail..."
                                        rows={3}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="form-group">
                                        <label>Price (PHP) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            placeholder="299.00"
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Stock Quantity *</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={stock}
                                            onChange={(e) => setStock(e.target.value)}
                                            placeholder="10"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Image Upload — Drag & Drop */}
                                <div className="form-group">
                                    <label>Product Images * (max 5)</label>
                                    <div
                                        className={`dropzone ${dragActive ? 'active' : ''}`}
                                        onDragEnter={handleDrag}
                                        onDragOver={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,image/gif"
                                            multiple
                                            onChange={handleFileSelect}
                                            style={{ display: 'none' }}
                                        />
                                        <div style={{ fontSize: '2rem', marginBottom: 8 }}>📁</div>
                                        <p style={{ fontWeight: 500, marginBottom: 4 }}>
                                            Drag & drop images here or click to browse
                                        </p>
                                        <p style={{ fontSize: '0.8rem' }}>
                                            JPEG, PNG, WebP, GIF — Max 5MB each — {imageFiles.length}/5 uploaded
                                        </p>
                                    </div>

                                    {imageFiles.length > 0 && (
                                        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                                            {imageFiles.map((img, i) => (
                                                <div key={i} style={{ position: 'relative' }}>
                                                    <img
                                                        src={img.preview}
                                                        alt={`Preview ${i + 1}`}
                                                        style={{
                                                            width: 80, height: 80, objectFit: 'cover',
                                                            borderRadius: 8, border: '2px solid var(--border-color)',
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(i)}
                                                        style={{
                                                            position: 'absolute', top: -6, right: -6,
                                                            width: 22, height: 22, borderRadius: '50%',
                                                            background: 'var(--accent-danger)', color: 'white',
                                                            border: 'none', cursor: 'pointer', fontSize: '0.7rem',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        }}
                                                    >✕</button>
                                                    {i === 0 && (
                                                        <div style={{
                                                            position: 'absolute', bottom: 2, left: 2, right: 2,
                                                            background: 'rgba(0,0,0,0.7)', color: 'white',
                                                            fontSize: '0.6rem', textAlign: 'center',
                                                            borderRadius: '0 0 6px 6px', padding: '2px 0',
                                                        }}>Main</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <button type="submit" className="btn btn-success" disabled={loading} style={{ marginTop: 8 }}>
                                    {loading ? (
                                        <><span className="spinner"></span> {uploadingImages ? 'Uploading images...' : 'Saving...'}</>
                                    ) : (
                                        editingProduct ? 'Update Product' : 'Create Product'
                                    )}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Products List */}
                    {products.length === 0 ? (
                        <div className="empty-state">
                            <h3>No products yet</h3>
                            <p>Click "+ New Product" to create your first listing</p>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Image</th>
                                        <th>Title</th>
                                        <th>Price</th>
                                        <th>Stock</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((p) => (
                                        <tr key={p.id}>
                                            <td>
                                                {p.images && p.images.length > 0 ? (
                                                    <img
                                                        src={p.images[0]}
                                                        alt={p.title}
                                                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
                                                        onError={(e) => {
                                                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect fill="%23333" width="48" height="48"/><text fill="%23888" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="10">No img</text></svg>';
                                                        }}
                                                    />
                                                ) : (
                                                    <div style={{
                                                        width: 48, height: 48, background: 'var(--glass-bg)', borderRadius: 6,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.7rem', color: 'var(--text-muted)',
                                                    }}>No img</div>
                                                )}
                                            </td>
                                            <td style={{ fontWeight: 500 }}>{p.title}</td>
                                            <td style={{ color: 'var(--accent-secondary)' }}>PHP {parseFloat(p.price).toFixed(2)}</td>
                                            <td>
                                                <span style={{
                                                    fontWeight: 600,
                                                    color: (p.stock || 0) > 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                                                }}>
                                                    {p.stock || 0}
                                                </span>
                                            </td>
                                            <td>
                                                {!p.is_active ? (
                                                    <span className="label" style={{ background: 'rgba(255,71,87,0.15)', color: 'var(--accent-danger)' }}>
                                                        Deleted
                                                    </span>
                                                ) : (
                                                    <span className="label" style={
                                                        p.status === 'approved'
                                                            ? { background: 'rgba(16,185,129,0.15)', color: '#10b981' }
                                                            : p.status === 'unapproved'
                                                                ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' }
                                                                : { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }
                                                    }>
                                                        {p.status === 'approved' ? 'Approved' : p.status === 'unapproved' ? 'Unapproved' : 'Pending'}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {p.is_active && (
                                                        <>
                                                            <button className="btn btn-outline btn-sm" onClick={() => startEdit(p)}>Edit</button>
                                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>)}

                {/* ===== DELIVERY ORDERS TAB ===== */}
                {activeSection === 'delivery' && !initialLoading && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Delivery Orders</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage delivery orders — mark as ready for pickup</p>
                            </div>
                            <button className="btn btn-outline btn-sm" onClick={loadDeliveryOrders}>Refresh</button>
                        </div>
                        {deliveryOrders.length === 0 ? (
                            <div className="empty-state"><h3>No delivery orders</h3><p>Delivery orders from buyers will appear here</p></div>
                        ) : (
                            <div style={{ display: 'grid', gap: 12 }}>
                                {deliveryOrders.map(order => {
                                    const statusColors = {
                                        pending: { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', label: 'Pending' },
                                        approved: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Ready for Pickup' },
                                        ondeliver: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'On Delivery' },
                                    };
                                    const sc = statusColors[order.status] || { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', label: order.status };
                                    const productImage = order.product_images && order.product_images.length > 0 ? order.product_images[0] : null;
                                    return (
                                        <div key={order.id} className="card" style={{ padding: 20 }}>
                                            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                                                {productImage && (
                                                    <div style={{
                                                        width: 64, height: 64, borderRadius: 10, overflow: 'hidden',
                                                        background: 'var(--bg-secondary)', flexShrink: 0,
                                                    }}>
                                                        <img src={productImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            onError={e => e.target.style.display = 'none'} />
                                                    </div>
                                                )}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{order.product_title}</h4>
                                                        <span style={{
                                                            padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                                                            background: sc.bg, color: sc.color, flexShrink: 0,
                                                        }}>{sc.label}</span>
                                                    </div>
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                        Buyer: {order.buyer_name} | Qty: {order.quantity} | PHP {order.amount.toFixed(2)}
                                                        {order.delivery_fee > 0 && ` | Fee: PHP ${order.delivery_fee.toFixed(2)}`}
                                                    </p>
                                                    {order.delivery_address && (
                                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                                            📍 {order.delivery_address}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {new Date(order.created_at).toLocaleString()}
                                                </span>
                                                {order.status === 'pending' && (
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        disabled={deliveryLoading}
                                                        onClick={() => handleDeliveryStatusUpdate(order.id, 'approved')}
                                                        style={{ fontWeight: 600 }}
                                                    >
                                                        Mark Ready
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ===== WALK-IN ORDERS TAB ===== */}
                {activeSection === 'walkin' && !initialLoading && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Walk-in Orders</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Walk-in orders from buyers</p>
                            </div>
                            <button className="btn btn-outline btn-sm" onClick={loadWalkinOrders}>Refresh</button>
                        </div>
                        {walkinOrders.length === 0 ? (
                            <div className="empty-state"><h3>No walk-in orders</h3><p>Walk-in orders from buyers will appear here</p></div>
                        ) : (
                            <div style={{ display: 'grid', gap: 12 }}>
                                {walkinOrders.map(order => {
                                    const statusColors = {
                                        pending_walkin: { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', label: 'Pending' },
                                        inwork: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'In Work' },
                                        ready: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6', label: 'Ready - Waiting for Buyer' },
                                        picked_up: { bg: 'rgba(14,165,233,0.1)', color: '#0ea5e9', label: 'Picked Up' },
                                    };
                                    const sc = statusColors[order.status] || { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', label: order.status };
                                    const nextStatus = { pending_walkin: 'inwork', inwork: 'ready', picked_up: 'completed' };
                                    const nextLabel = { pending_walkin: 'Start Working', inwork: 'Mark Ready', picked_up: 'Mark Completed' };
                                    const productImage = order.product_images && order.product_images.length > 0 ? order.product_images[0] : null;
                                    return (
                                        <div key={order.id} className="card" style={{ padding: 20 }}>
                                            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                                                {productImage && (
                                                    <div style={{
                                                        width: 64, height: 64, borderRadius: 10, overflow: 'hidden',
                                                        background: 'var(--bg-secondary)', flexShrink: 0,
                                                    }}>
                                                        <img src={productImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            onError={e => e.target.style.display = 'none'} />
                                                    </div>
                                                )}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{order.product_title}</h4>
                                                        <span style={{
                                                            padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                                                            background: sc.bg, color: sc.color, flexShrink: 0,
                                                        }}>{sc.label}</span>
                                                    </div>
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                        Buyer: {order.buyer_name} | Qty: {order.quantity} | PHP {order.amount.toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {new Date(order.created_at).toLocaleString()}
                                                </span>
                                                {nextStatus[order.status] && (
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        disabled={walkinLoading}
                                                        onClick={() => handleWalkinStatusUpdate(order.id, nextStatus[order.status])}
                                                        style={{ fontWeight: 600 }}
                                                    >
                                                        {nextLabel[order.status]}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* ===== RESTOCK TAB ===== */}
                {activeSection === 'restock' && !initialLoading && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>My Restock Requests</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Request restock for products running low</p>
                            </div>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowRestockModal(true)}>
                                + Request Restock
                            </button>
                        </div>
                        {restockRequests.length === 0 ? (
                            <div className="empty-state"><h3>No restock requests</h3><p>Request restock for your products that are running low</p></div>
                        ) : (
                            <div style={{ display: 'grid', gap: 12 }}>
                                {restockRequests.map(req => {
                                    const statusMap = {
                                        pending_manager: { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', label: 'Pending Manager' },
                                        approved_manager: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Approved' },
                                        rejected_manager: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', label: 'Rejected' },
                                        accepted_delivery: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'Accepted by Delivery' },
                                        in_transit: { bg: 'rgba(108,99,255,0.1)', color: '#6366f1', label: 'In Transit' },
                                        delivered: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Delivered' },
                                    };
                                    const sc = statusMap[req.status] || { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', label: req.status };
                                    const productImage = req.product_images && req.product_images.length > 0 ? req.product_images[0] : null;
                                    return (
                                        <div key={req.id} className="card" style={{ padding: 20 }}>
                                            <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                                                {productImage && (
                                                    <div style={{
                                                        width: 64, height: 64, borderRadius: 10, overflow: 'hidden',
                                                        background: 'var(--bg-secondary)', flexShrink: 0,
                                                    }}>
                                                        <img src={productImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                            onError={e => e.target.style.display = 'none'} />
                                                    </div>
                                                )}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{req.product_title}</h4>
                                                        <span style={{
                                                            padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                                                            background: sc.bg, color: sc.color, flexShrink: 0,
                                                        }}>{sc.label}</span>
                                                    </div>
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                        Requested: {req.requested_quantity} units
                                                        {req.approved_quantity != null && ` | Approved: ${req.approved_quantity}`}
                                                    </p>
                                                    {req.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>Note: {req.notes}</p>}
                                                    {req.manager_notes && <p style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginTop: 4 }}>Manager: {req.manager_notes}</p>}
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {new Date(req.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Restock Request Modal */}
                {showRestockModal && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
                    }} onClick={() => setShowRestockModal(false)}>
                        <div className="card" style={{ maxWidth: 420, width: '100%', padding: 32 }} onClick={e => e.stopPropagation()}>
                            <h3 style={{ marginBottom: 16 }}>Request Restock</h3>
                            <div className="form-group">
                                <label>Product</label>
                                <select value={restockProductId} onChange={e => setRestockProductId(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                                    <option value="">Select a product...</option>
                                    {products.filter(p => p.is_active).map(p => (
                                        <option key={p.id} value={p.id}>{p.title} (Stock: {p.stock || 0})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Quantity</label>
                                <input type="number" min="1" value={restockQuantity} onChange={e => setRestockQuantity(e.target.value)} placeholder="e.g. 50" />
                            </div>
                            <div className="form-group">
                                <label>Notes (optional)</label>
                                <textarea value={restockNotes} onChange={e => setRestockNotes(e.target.value)} placeholder="Reason for restock..." rows={2} />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-outline" onClick={() => setShowRestockModal(false)} style={{ flex: 1 }}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleRestockSubmit} disabled={restockLoading} style={{ flex: 1 }}>
                                    {restockLoading ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
