'use client';

import { useState, useEffect, useRef } from 'react';
import {
    getStoredAdmin, adminLogout, adminGetDashboard, adminGetUsers,
    adminBanUser, adminSetBalance, adminGetTransactions, adminGetReports,
    adminGetProducts, adminUpdateProduct,
} from '../../../lib/api';

// ── Line Chart Component ─────────────────────────────────
function LineChart({ data, labelKey, valueKey, title, color = '#6366f1', height = 220 }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !data || data.length === 0) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const w = canvas.width = canvas.parentElement.clientWidth;
        const h = canvas.height = height;
        ctx.clearRect(0, 0, w, h);

        const padding = { top: 24, right: 20, bottom: 50, left: 70 };
        const chartW = w - padding.left - padding.right;
        const chartH = h - padding.top - padding.bottom;
        const maxVal = Math.max(...data.map(d => d[valueKey]), 1);

        // Grid lines
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartH * i / 4);
            ctx.strokeStyle = 'rgba(136,136,160,0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
            ctx.fillStyle = 'rgba(136,136,160,0.5)';
            ctx.font = '11px Inter, system-ui';
            ctx.textAlign = 'right';
            ctx.fillText('₱' + (maxVal * (4 - i) / 4).toFixed(0), padding.left - 8, y + 4);
        }

        // Plot line + gradient fill
        const stepX = data.length > 1 ? chartW / (data.length - 1) : chartW;
        const points = data.map((d, i) => ({
            x: padding.left + i * stepX,
            y: padding.top + chartH - (d[valueKey] / maxVal) * chartH,
        }));

        // Gradient fill under line
        const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
        gradient.addColorStop(0, color + '30');
        gradient.addColorStop(1, color + '05');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(points[0].x, padding.top + chartH);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
        ctx.closePath();
        ctx.fill();

        // Line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();

        // Dots
        points.forEach(p => {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
        });

        // X labels
        ctx.fillStyle = 'rgba(136,136,160,0.6)';
        ctx.font = '10px Inter, system-ui';
        ctx.textAlign = 'center';
        data.forEach((d, i) => {
            const x = padding.left + i * stepX;
            const label = d[labelKey].length > 8 ? d[labelKey].slice(-5) : d[labelKey];
            ctx.save();
            ctx.translate(x, h - 5);
            ctx.rotate(-0.4);
            ctx.fillText(label, 0, 0);
            ctx.restore();
        });
    }, [data, labelKey, valueKey, color, height]);

    return (
        <div>
            <h4 style={{ marginBottom: 12, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{title}</h4>
            {(!data || data.length === 0) ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data yet</p>
            ) : (
                <canvas ref={canvasRef} style={{ width: '100%', height }} />
            )}
        </div>
    );
}

// ── Sidebar Item ─────────────────────────────────────────
function SidebarItem({ icon, label, active, onClick }) {
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
            {label}
        </button>
    );
}

// ── Stat Card ────────────────────────────────────────────
function StatCard({ icon, label, value, color }) {
    return (
        <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 16, padding: '24px 20px',
            display: 'flex', flexDirection: 'column', gap: 12,
            transition: 'all 0.3s',
        }}>
            <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${color}15`, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem',
            }}>
                {icon}
            </div>
            <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {label}
                </p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {value}
                </p>
            </div>
        </div>
    );
}


export default function AdminDashboard() {
    const [admin, setAdmin] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');

    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [userSearch, setUserSearch] = useState('');
    const [editBalanceId, setEditBalanceId] = useState(null);
    const [editBalanceVal, setEditBalanceVal] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [txnSearch, setTxnSearch] = useState('');
    const [reports, setReports] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Products state
    const [products, setProducts] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [editProductId, setEditProductId] = useState(null);
    const [editProductData, setEditProductData] = useState({});

    useEffect(() => {
        const stored = getStoredAdmin();
        if (!stored || stored.role !== 'admin') {
            window.location.href = '/admin';
            return;
        }
        setAdmin(stored);
        setAuthChecked(true);
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try { setStats(await adminGetDashboard()); } catch (e) { console.error(e); }
    };
    const loadUsers = async (search = '') => {
        try { setUsers(await adminGetUsers(search)); } catch (e) { console.error(e); }
    };
    const loadTransactions = async (search = '') => {
        try { setTransactions(await adminGetTransactions(search)); } catch (e) { console.error(e); }
    };
    const loadReports = async () => {
        try { setReports(await adminGetReports()); } catch (e) { console.error(e); }
    };
    const loadProducts = async (search = '') => {
        try { setProducts(await adminGetProducts(search)); } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (!authChecked) return;
        if (activeTab === 'users') loadUsers();
        if (activeTab === 'transactions') loadTransactions();
        if (activeTab === 'reports') loadReports();
        if (activeTab === 'products') loadProducts();
    }, [activeTab, authChecked]);

    const handleBan = async (userId, ban) => {
        try {
            await adminBanUser(userId, ban);
            setMessage({ type: 'success', text: `User ${ban ? 'banned' : 'unbanned'}` });
            loadUsers(userSearch);
        } catch (e) { setMessage({ type: 'error', text: e.message }); }
    };

    const handleSetBalance = async (userId) => {
        try {
            await adminSetBalance(userId, parseFloat(editBalanceVal));
            setMessage({ type: 'success', text: 'Balance updated' });
            setEditBalanceId(null);
            loadUsers(userSearch);
        } catch (e) { setMessage({ type: 'error', text: e.message }); }
    };

    const handleUpdateProduct = async (productId) => {
        try {
            await adminUpdateProduct(productId, editProductData);
            setMessage({ type: 'success', text: 'Product updated' });
            setEditProductId(null);
            setEditProductData({});
            loadProducts(productSearch);
        } catch (e) { setMessage({ type: 'error', text: e.message }); }
    };

    const handleLogout = () => { adminLogout(); window.location.href = '/admin'; };

    if (!authChecked) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: 40, height: 40 }}></div>
            </div>
        );
    }

    const sidebarItems = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'users', icon: '👥', label: 'Users' },
        { id: 'transactions', icon: '💳', label: 'Transactions' },
        { id: 'products', icon: '📦', label: 'Products' },
        { id: 'reports', icon: '📈', label: 'Reports' },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* ===== SIDEBAR ===== */}
            <aside style={{
                width: 260, background: 'var(--bg-secondary)',
                borderRight: '1px solid var(--border-color)',
                display: 'flex', flexDirection: 'column',
                position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 200,
            }}>
                <div style={{
                    padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: '1px solid var(--border-color)',
                }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'var(--gradient-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 800, fontSize: '0.9rem',
                    }}>RT</div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>RetailTalk</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--accent-danger)', fontWeight: 600 }}>ADMIN PANEL</div>
                    </div>
                </div>

                <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <p style={{
                        fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: 1, padding: '8px 20px',
                    }}>
                        Main Menu
                    </p>
                    {sidebarItems.map(item => (
                        <SidebarItem
                            key={item.id}
                            icon={item.icon}
                            label={item.label}
                            active={activeTab === item.id}
                            onClick={() => setActiveTab(item.id)}
                        />
                    ))}
                </nav>

                <div style={{
                    padding: '16px 20px', borderTop: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', gap: 12,
                }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.85rem',
                    }}>
                        {admin?.full_name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {admin?.full_name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Administrator</div>
                    </div>
                    <button onClick={handleLogout} title="Logout" style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: '1.1rem',
                    }}>🚪</button>
                </div>
            </aside>

            {/* ===== MAIN CONTENT ===== */}
            <main style={{ marginLeft: 260, flex: 1, padding: '32px 40px', maxWidth: 1200 }}>
                {message.text && (
                    <div className={`alert alert-${message.type}`} style={{ marginBottom: 16 }}>
                        {message.text}
                        <button onClick={() => setMessage({ type: '', text: '' })} style={{
                            float: 'right', background: 'none', border: 'none',
                            cursor: 'pointer', color: 'inherit', fontWeight: 700,
                        }}>✕</button>
                    </div>
                )}

                {/* ===== DASHBOARD TAB ===== */}
                {activeTab === 'dashboard' && (
                    <div>
                        <div style={{ marginBottom: 32 }}>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>
                                Welcome back, {admin?.full_name?.split(' ')[0]} 👋
                            </h1>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                Here's what's happening with your platform today.
                            </p>
                        </div>

                        {stats ? (
                            <>
                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                    gap: 16, marginBottom: 32,
                                }}>
                                    <StatCard icon="👥" label="Total Users" value={stats.total_users} color="#6366f1" />
                                    <StatCard icon="📦" label="Active Products" value={stats.total_products} color="#0ea5e9" />
                                    <StatCard icon="🛒" label="Total Orders" value={stats.total_orders} color="#10b981" />
                                    <StatCard icon="💰" label="Total Revenue" value={`₱${stats.total_revenue.toFixed(2)}`} color="#f59e0b" />
                                </div>
                            </>
                        ) : (
                            <div className="loading-container"><div className="spinner" style={{ width: 40, height: 40 }}></div><p>Loading...</p></div>
                        )}
                    </div>
                )}

                {/* ===== USERS TAB ===== */}
                {activeTab === 'users' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>User Management</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage all registered users</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    type="text" placeholder="Search users..."
                                    value={userSearch} onChange={e => setUserSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && loadUsers(userSearch)}
                                    style={{
                                        width: 240, padding: '10px 14px', borderRadius: 10,
                                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif',
                                    }}
                                />
                                <button className="btn btn-primary btn-sm" onClick={() => loadUsers(userSearch)}>Search</button>
                            </div>
                        </div>
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th><th>Email</th><th>Role</th><th>Balance</th><th>Status</th><th>Joined</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} style={u.is_banned ? { opacity: 0.5 } : {}}>
                                            <td style={{ fontWeight: 500 }}>
                                                {u.full_name}
                                                {u.role === 'admin' && <span style={{ marginLeft: 6, fontSize: '0.65rem', color: '#ef4444', fontWeight: 700, background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: 4 }}>ADMIN</span>}
                                            </td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.email}</td>
                                            <td>
                                                <span style={{
                                                    padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                                                    textTransform: 'capitalize',
                                                    background: u.role === 'seller' ? 'rgba(108,99,255,0.1)' : u.role === 'admin' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                    color: u.role === 'seller' ? '#6366f1' : u.role === 'admin' ? '#ef4444' : '#10b981',
                                                }}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td>
                                                {editBalanceId === u.id ? (
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <input type="number" value={editBalanceVal} onChange={e => setEditBalanceVal(e.target.value)}
                                                            style={{ width: 100, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                                                        <button className="btn btn-success btn-sm" onClick={() => handleSetBalance(u.id)} style={{ padding: '4px 8px' }}>✓</button>
                                                        <button className="btn btn-outline btn-sm" onClick={() => setEditBalanceId(null)} style={{ padding: '4px 8px' }}>✕</button>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--accent-secondary)', fontWeight: 600, cursor: 'pointer' }}
                                                        onClick={() => { setEditBalanceId(u.id); setEditBalanceVal(u.balance.toString()); }}>
                                                        ₱{u.balance.toFixed(2)}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                                    padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                                                    background: u.is_banned ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                    color: u.is_banned ? '#ef4444' : '#10b981',
                                                }}>
                                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: u.is_banned ? '#ef4444' : '#10b981' }}></span>
                                                    {u.is_banned ? 'Banned' : 'Active'}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                {new Date(u.created_at).toLocaleDateString()}
                                            </td>
                                            <td>
                                                {u.role !== 'admin' && (
                                                    <button
                                                        className={`btn btn-sm ${u.is_banned ? 'btn-success' : 'btn-danger'}`}
                                                        onClick={() => handleBan(u.id, !u.is_banned)}
                                                        style={{ fontSize: '0.75rem' }}
                                                    >
                                                        {u.is_banned ? 'Unban' : 'Ban'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {users.length === 0 && <div className="empty-state" style={{ padding: 40 }}><p>No users found</p></div>}
                        </div>
                    </div>
                )}

                {/* ===== TRANSACTIONS TAB ===== */}
                {activeTab === 'transactions' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Transactions</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>All platform transactions</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    type="text" placeholder="Search..."
                                    value={txnSearch} onChange={e => setTxnSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && loadTransactions(txnSearch)}
                                    style={{
                                        width: 240, padding: '10px 14px', borderRadius: 10,
                                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif',
                                    }}
                                />
                                <button className="btn btn-primary btn-sm" onClick={() => loadTransactions(txnSearch)}>Search</button>
                            </div>
                        </div>
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Buyer</th><th>Seller</th><th>Product</th><th>Qty</th><th>Total</th><th>Seller (90%)</th><th>Admin (10%)</th><th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(t => (
                                        <tr key={t.id}>
                                            <td style={{ fontWeight: 500 }}>{t.buyer_name}</td>
                                            <td style={{ fontWeight: 500 }}>{t.seller_name}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{t.product_title}</td>
                                            <td>{t.quantity || 1}</td>
                                            <td style={{ fontWeight: 600 }}>₱{t.amount.toFixed(2)}</td>
                                            <td style={{ color: 'var(--accent-secondary)' }}>₱{t.seller_amount.toFixed(2)}</td>
                                            <td style={{ color: '#f59e0b' }}>₱{t.admin_commission.toFixed(2)}</td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                {new Date(t.created_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {transactions.length === 0 && <div className="empty-state" style={{ padding: 40 }}><p>No transactions found</p></div>}
                        </div>
                    </div>
                )}

                {/* ===== PRODUCTS TAB ===== */}
                {activeTab === 'products' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Product Management</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>View and edit all platform products</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    type="text" placeholder="Search products..."
                                    value={productSearch} onChange={e => setProductSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && loadProducts(productSearch)}
                                    style={{
                                        width: 240, padding: '10px 14px', borderRadius: 10,
                                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif',
                                    }}
                                />
                                <button className="btn btn-primary btn-sm" onClick={() => loadProducts(productSearch)}>Search</button>
                            </div>
                        </div>
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Product</th><th>Seller</th><th>Price</th><th>Stock</th><th>Status</th><th>Created</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(p => (
                                        <tr key={p.id}>
                                            <td style={{ fontWeight: 500 }}>
                                                {editProductId === p.id ? (
                                                    <input type="text" defaultValue={p.title}
                                                        onChange={e => setEditProductData({ ...editProductData, title: e.target.value })}
                                                        style={{ width: 180, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                                                ) : p.title}
                                            </td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.seller_name}</td>
                                            <td>
                                                {editProductId === p.id ? (
                                                    <input type="number" defaultValue={p.price} step="0.01"
                                                        onChange={e => setEditProductData({ ...editProductData, price: parseFloat(e.target.value) })}
                                                        style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                                                ) : <span style={{ fontWeight: 600 }}>₱{p.price.toFixed(2)}</span>}
                                            </td>
                                            <td>
                                                {editProductId === p.id ? (
                                                    <input type="number" defaultValue={p.stock}
                                                        onChange={e => setEditProductData({ ...editProductData, stock: parseInt(e.target.value) })}
                                                        style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                                                ) : <span style={{ color: p.stock <= 0 ? '#ef4444' : p.stock <= 5 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>{p.stock}</span>}
                                            </td>
                                            <td>
                                                {editProductId === p.id ? (
                                                    <select defaultValue={p.is_active.toString()}
                                                        onChange={e => setEditProductData({ ...editProductData, is_active: e.target.value === 'true' })}
                                                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                                        <option value="true">Active</option>
                                                        <option value="false">Inactive</option>
                                                    </select>
                                                ) : (
                                                    <span style={{
                                                        padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                                                        background: p.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                        color: p.is_active ? '#10b981' : '#ef4444',
                                                    }}>
                                                        {p.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                {new Date(p.created_at).toLocaleDateString()}
                                            </td>
                                            <td>
                                                {editProductId === p.id ? (
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <button className="btn btn-success btn-sm" onClick={() => handleUpdateProduct(p.id)} style={{ padding: '4px 8px' }}>✓</button>
                                                        <button className="btn btn-outline btn-sm" onClick={() => { setEditProductId(null); setEditProductData({}); }} style={{ padding: '4px 8px' }}>✕</button>
                                                    </div>
                                                ) : (
                                                    <button className="btn btn-outline btn-sm" onClick={() => { setEditProductId(p.id); setEditProductData({}); }}
                                                        style={{ fontSize: '0.75rem' }}>Edit</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {products.length === 0 && <div className="empty-state" style={{ padding: 40 }}><p>No products found</p></div>}
                        </div>
                    </div>
                )}

                {/* ===== REPORTS TAB ===== */}
                {activeTab === 'reports' && (
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 24 }}>Financial Reports</h1>

                        {reports ? (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                                    <StatCard icon="💰" label="Total Revenue" value={`₱${reports.total_revenue.toFixed(2)}`} color="#f59e0b" />
                                    <StatCard icon="🏦" label="Sales Volume" value={`₱${reports.total_sales_volume.toFixed(2)}`} color="#6366f1" />
                                    <StatCard icon="🛒" label="Total Orders" value={reports.total_orders} color="#10b981" />
                                    <StatCard icon="📐" label="Avg Order Value" value={`₱${reports.avg_transaction_value.toFixed(2)}`} color="#0ea5e9" />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
                                    <div className="card" style={{ padding: 24 }}>
                                        <LineChart
                                            data={[...reports.daily_income].reverse().slice(-14)}
                                            labelKey="date" valueKey="income"
                                            title="📈 Daily Revenue (14 Days)" color="#f59e0b"
                                        />
                                    </div>
                                    <div className="card" style={{ padding: 24 }}>
                                        <LineChart
                                            data={[...(reports.monthly_income || [])].reverse().slice(-6)}
                                            labelKey="date" valueKey="income"
                                            title="📊 Monthly Revenue" color="#6366f1"
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                    <div className="card" style={{ padding: 24 }}>
                                        <h4 style={{ marginBottom: 16, fontWeight: 700 }}>Top Sellers</h4>
                                        {reports.top_sellers.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)' }}>No sellers yet</p>
                                        ) : (
                                            <table className="data-table">
                                                <thead><tr><th>Seller</th><th>Sales</th><th>Orders</th></tr></thead>
                                                <tbody>
                                                    {reports.top_sellers.map((s, i) => (
                                                        <tr key={i}>
                                                            <td style={{ fontWeight: 500 }}>{s.seller_name}</td>
                                                            <td style={{ color: 'var(--accent-secondary)' }}>₱{s.total_sales.toFixed(2)}</td>
                                                            <td>{s.transaction_count}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                    <div className="card" style={{ padding: 24 }}>
                                        <h4 style={{ marginBottom: 16, fontWeight: 700 }}>Top Products</h4>
                                        {reports.top_products.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)' }}>No products sold yet</p>
                                        ) : (
                                            <table className="data-table">
                                                <thead><tr><th>Product</th><th>Sold</th><th>Revenue</th></tr></thead>
                                                <tbody>
                                                    {reports.top_products.map((p, i) => (
                                                        <tr key={i}>
                                                            <td style={{ fontWeight: 500 }}>{p.product_title}</td>
                                                            <td>{p.times_sold}×</td>
                                                            <td style={{ color: 'var(--accent-secondary)' }}>₱{p.total_revenue.toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="loading-container"><div className="spinner" style={{ width: 40, height: 40 }}></div><p>Loading reports...</p></div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
