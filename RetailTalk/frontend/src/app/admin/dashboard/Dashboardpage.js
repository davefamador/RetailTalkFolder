'use client';

import { useState, useEffect, useRef } from 'react';
import {
    getStoredAdmin, adminLogout, adminGetDashboard, adminGetUsers,
    adminBanUser, adminSetBalance, adminGetTransactions, adminGetReports,
    adminGetProducts, adminUpdateProduct, adminGetUserDetail,
    adminGetPendingProducts, adminApproveProduct, adminUnapproveProduct,
    adminGetDepartments, adminGetDepartmentDetail, adminCreateDepartment, adminRegisterManager,
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


// ── Horizontal Bar Chart (for store comparisons) ─────────
function HorizontalBarChart({ data, labelKey, valueKey, title, color = '#8b5cf6', prefix = '', height = 'auto' }) {
    if (!data || data.length === 0) {
        return (
            <div>
                <h4 style={{ marginBottom: 12, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{title}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data yet</p>
            </div>
        );
    }
    const maxVal = Math.max(...data.map(d => d[valueKey]), 1);
    return (
        <div>
            <h4 style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{title}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 110, fontSize: '0.8rem', fontWeight: 600,
                            color: 'var(--text-primary)', textAlign: 'right',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0,
                        }}>{d[labelKey]}</div>
                        <div style={{ flex: 1, height: 28, background: 'var(--bg-secondary)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                            <div style={{
                                height: '100%', width: `${Math.max((d[valueKey] / maxVal) * 100, 2)}%`,
                                background: `linear-gradient(90deg, ${color}, ${color}90)`,
                                borderRadius: 8, transition: 'width 0.5s ease',
                                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8,
                            }}>
                                {(d[valueKey] / maxVal) > 0.25 && (
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>
                                        {prefix}{typeof d[valueKey] === 'number' && d[valueKey] % 1 !== 0 ? d[valueKey].toFixed(2) : d[valueKey]}
                                    </span>
                                )}
                            </div>
                            {(d[valueKey] / maxVal) <= 0.25 && (
                                <span style={{
                                    position: 'absolute', left: `${Math.max((d[valueKey] / maxVal) * 100, 2) + 2}%`,
                                    top: '50%', transform: 'translateY(-50%)',
                                    fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)',
                                }}>
                                    {prefix}{typeof d[valueKey] === 'number' && d[valueKey] % 1 !== 0 ? d[valueKey].toFixed(2) : d[valueKey]}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Donut/Ring Chart (for order type breakdown) ──────────
function DonutChart({ data, title, size = 140 }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !data || data.length === 0) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = size; canvas.height = size;
        ctx.clearRect(0, 0, size, size);

        const total = data.reduce((s, d) => s + d.value, 0);
        if (total === 0) return;
        const cx = size / 2, cy = size / 2, r = size / 2 - 8, innerR = r * 0.6;
        let start = -Math.PI / 2;
        data.forEach(d => {
            const sweep = (d.value / total) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(cx, cy, r, start, start + sweep);
            ctx.arc(cx, cy, innerR, start + sweep, start, true);
            ctx.closePath();
            ctx.fillStyle = d.color;
            ctx.fill();
            start += sweep;
        });
        // center text
        ctx.fillStyle = 'var(--text-primary)';
        ctx.font = `bold ${size * 0.14}px Inter, system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total.toString(), cx, cy);
    }, [data, size]);

    return (
        <div style={{ textAlign: 'center' }}>
            {title && <h4 style={{ marginBottom: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{title}</h4>}
            {(!data || data.length === 0 || data.every(d => d.value === 0)) ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data</p>
            ) : (
                <>
                    <canvas ref={canvasRef} style={{ width: size, height: size }} />
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                        {data.map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{d.label}: {d.value}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
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

    // User detail panel state
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [userDetail, setUserDetail] = useState(null);
    const [userDetailLoading, setUserDetailLoading] = useState(false);

    // Pending products state
    const [pendingProducts, setPendingProducts] = useState([]);
    const [selectedPendingProduct, setSelectedPendingProduct] = useState(null);
    const [pendingActionLoading, setPendingActionLoading] = useState(false);

    // Department state
    const [departments, setDepartments] = useState([]);
    const [deptSearch, setDeptSearch] = useState('');
    const [selectedDeptDetail, setSelectedDeptDetail] = useState(null);
    const [deptDetailLoading, setDeptDetailLoading] = useState(false);
    // Department creation
    const [showCreateDept, setShowCreateDept] = useState(false);
    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptDesc, setNewDeptDesc] = useState('');
    // Manager registration
    const [showRegisterManager, setShowRegisterManager] = useState(false);
    const [managerForm, setManagerForm] = useState({ full_name: '', email: '', password: '', contact_number: '', department_id: '' });

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
        if (activeTab === 'pending') loadPending();
        if (activeTab === 'departments') loadDepartments();
    }, [activeTab, authChecked]);

    const loadPending = async () => {
        try { setPendingProducts(await adminGetPendingProducts()); } catch (e) { console.error(e); }
    };

    const loadDepartments = async () => {
        try { setDepartments(await adminGetDepartments()); } catch (e) { console.error(e); }
    };
    const handleDeptClick = async (deptId) => {
        setDeptDetailLoading(true);
        setSelectedDeptDetail(null);
        try {
            const detail = await adminGetDepartmentDetail(deptId);
            setSelectedDeptDetail(detail);
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to load department: ' + e.message });
        } finally {
            setDeptDetailLoading(false);
        }
    };
    const handleCreateDepartment = async () => {
        if (!newDeptName.trim()) return;
        try {
            await adminCreateDepartment({ name: newDeptName.trim(), description: newDeptDesc.trim() });
            setMessage({ type: 'success', text: 'Department created!' });
            setShowCreateDept(false);
            setNewDeptName('');
            setNewDeptDesc('');
            loadDepartments();
            loadDashboard();
        } catch (e) { setMessage({ type: 'error', text: e.message }); }
    };
    const handleRegisterManager = async () => {
        try {
            await adminRegisterManager(managerForm);
            setMessage({ type: 'success', text: 'Manager registered!' });
            setShowRegisterManager(false);
            setManagerForm({ full_name: '', email: '', password: '', contact_number: '', department_id: '' });
            loadDepartments();
        } catch (e) { setMessage({ type: 'error', text: e.message }); }
    };

    const handleApproveProduct = async (productId) => {
        setPendingActionLoading(true);
        try {
            await adminApproveProduct(productId);
            setMessage({ type: 'success', text: 'Product approved!' });
            setSelectedPendingProduct(null);
            loadPending();
        } catch (e) { setMessage({ type: 'error', text: e.message }); }
        finally { setPendingActionLoading(false); }
    };

    const handleUnapproveProduct = async (productId) => {
        setPendingActionLoading(true);
        try {
            await adminUnapproveProduct(productId);
            setMessage({ type: 'success', text: 'Product unapproved.' });
            setSelectedPendingProduct(null);
            loadPending();
        } catch (e) { setMessage({ type: 'error', text: e.message }); }
        finally { setPendingActionLoading(false); }
    };

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

    const handleUserClick = async (userId) => {
        setSelectedUserId(userId);
        setUserDetailLoading(true);
        setUserDetail(null);
        try {
            const detail = await adminGetUserDetail(userId);
            setUserDetail(detail);
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to load user details: ' + e.message });
            setSelectedUserId(null);
        } finally {
            setUserDetailLoading(false);
        }
    };

    const closeUserPanel = () => {
        setSelectedUserId(null);
        setUserDetail(null);
    };

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
        { id: 'departments', icon: '🏪', label: 'Stores' },
        { id: 'pending', icon: '⏳', label: 'Pending' },
        { id: 'transactions', icon: '💳', label: 'Transactions' },
        { id: 'products', icon: '📦', label: 'Products' },
        { id: 'reports', icon: '📈', label: 'Reports' },
        { id: 'search', icon: '🔍', label: 'Search', href: '/search' },
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
                <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {sidebarItems.map(item => (
                        <SidebarItem
                            key={item.id}
                            icon={item.icon}
                            label={item.label}
                            active={activeTab === item.id}
                            onClick={() => item.href ? (window.location.href = item.href) : setActiveTab(item.id)}
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
                                    <StatCard icon="🛍️" label="Total Buyers" value={stats.total_buyers || 0} color="#10b981" />
                                    <StatCard icon="🏪" label="Stores" value={stats.total_departments || 0} color="#8b5cf6" />
                                    <StatCard icon="👔" label="Managers" value={stats.total_managers || 0} color="#ec4899" />
                                    <StatCard icon="🧑‍💼" label="Staff" value={stats.total_staff || 0} color="#14b8a6" />
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
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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

                        {/* Add Deliveryman Button */}
                        <button
                            onClick={() => window.location.href = '/admin/delivery-register'}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
                                padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)',
                                background: 'rgba(16,185,129,0.1)', color: '#10b981',
                                cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                                fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                        >
                            🚚 + Add Deliveryman
                        </button>
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th><th>Email</th><th>Role</th><th>Balance</th><th>Status</th><th>Joined</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} style={{ ...(u.is_banned ? { opacity: 0.5 } : {}), cursor: 'pointer', transition: 'background 0.15s' }}
                                            onClick={() => handleUserClick(u.id)}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.06)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ fontWeight: 500 }}>
                                                {u.full_name}
                                                {u.role === 'admin' && <span style={{ marginLeft: 6, fontSize: '0.65rem', color: '#ef4444', fontWeight: 700, background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: 4 }}>ADMIN</span>}
                                            </td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.email}</td>
                                            <td>
                                                <span style={{
                                                    padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                                                    textTransform: 'capitalize',
                                                    background: u.role === 'seller' ? 'rgba(108,99,255,0.1)' : u.role === 'admin' ? 'rgba(239,68,68,0.1)' : u.role === 'delivery' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                                                    color: u.role === 'seller' ? '#6366f1' : u.role === 'admin' ? '#ef4444' : u.role === 'delivery' ? '#3b82f6' : '#10b981',
                                                }}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td>
                                                {editBalanceId === u.id ? (
                                                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                                                        <input type="number" value={editBalanceVal} onChange={e => setEditBalanceVal(e.target.value)}
                                                            style={{ width: 100, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                                                        <button className="btn btn-success btn-sm" onClick={() => handleSetBalance(u.id)} style={{ padding: '4px 8px' }}>✓</button>
                                                        <button className="btn btn-outline btn-sm" onClick={() => setEditBalanceId(null)} style={{ padding: '4px 8px' }}>✕</button>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--accent-secondary)', fontWeight: 600, cursor: 'pointer' }}
                                                        onClick={e => { e.stopPropagation(); setEditBalanceId(u.id); setEditBalanceVal(u.balance.toString()); }}>
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
                                                        onClick={e => { e.stopPropagation(); handleBan(u.id, !u.is_banned); }}
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

                {/* ===== DEPARTMENTS TAB ===== */}
                {activeTab === 'departments' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Store Management</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage stores, managers, and staff</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <button
                                    onClick={() => setShowCreateDept(true)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(139,92,246,0.3)',
                                        background: 'rgba(139,92,246,0.1)', color: '#8b5cf6',
                                        cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                                        fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.2)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(139,92,246,0.1)'}
                                >
                                    🏪 + Create Store
                                </button>
                                <button
                                    onClick={() => setShowRegisterManager(true)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(236,72,153,0.3)',
                                        background: 'rgba(236,72,153,0.1)', color: '#ec4899',
                                        cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                                        fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(236,72,153,0.2)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(236,72,153,0.1)'}
                                >
                                    👔 + Register Manager
                                </button>
                            </div>
                        </div>

                        {/* Department Cards Grid */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                            gap: 16, marginBottom: 24,
                        }}>
                            {departments.filter(d => !deptSearch || d.name.toLowerCase().includes(deptSearch.toLowerCase())).map(dept => (
                                <div key={dept.id}
                                    onClick={() => handleDeptClick(dept.id)}
                                    style={{
                                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                        borderRadius: 16, padding: 20, cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                        <div>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>{dept.name}</h3>
                                            {dept.description && (
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{dept.description}</p>
                                            )}
                                        </div>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10,
                                            background: 'rgba(139,92,246,0.15)', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                                        }}>🏪</div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-secondary)' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 2 }}>Manager</p>
                                            <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{dept.manager_name || 'Unassigned'}</p>
                                        </div>
                                        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-secondary)' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 2 }}>Staff</p>
                                            <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{dept.staff_count || 0}</p>
                                        </div>
                                        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-secondary)' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 2 }}>Products</p>
                                            <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{dept.product_count || 0}</p>
                                        </div>
                                        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-secondary)' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 2 }}>Revenue</p>
                                            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b' }}>₱{(dept.total_revenue || 0).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {departments.length === 0 && <div className="empty-state" style={{ padding: 40 }}><p>No departments found</p></div>}

                        {/* Department Detail Slide Panel */}
                        {(selectedDeptDetail || deptDetailLoading) && (
                            <>
                                <div style={{
                                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                                    zIndex: 300, transition: 'opacity 0.3s',
                                }} onClick={() => { setSelectedDeptDetail(null); }} />
                                <aside style={{
                                    position: 'fixed', top: 0, right: 0, bottom: 0,
                                    width: 620, maxWidth: '90vw', background: 'var(--bg-primary)',
                                    borderLeft: '1px solid var(--border-color)',
                                    zIndex: 301, overflowY: 'auto', padding: 32,
                                    boxShadow: '-8px 0 30px rgba(0,0,0,0.3)',
                                    animation: 'slideInRight 0.25s ease-out',
                                }}>
                                    {deptDetailLoading ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                            <div className="spinner" style={{ width: 40, height: 40 }} />
                                        </div>
                                    ) : selectedDeptDetail ? (
                                        <>
                                            {/* Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                                                <div>
                                                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>
                                                        {selectedDeptDetail.department.name}
                                                    </h2>
                                                    {selectedDeptDetail.department.description && (
                                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{selectedDeptDetail.department.description}</p>
                                                    )}
                                                </div>
                                                <button onClick={() => setSelectedDeptDetail(null)} style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    color: 'var(--text-muted)', fontSize: '1.3rem',
                                                }}>✕</button>
                                            </div>

                                            {/* Department Info */}
                                            <div style={{
                                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20,
                                                padding: 16, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                            }}>
                                                <div>
                                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Manager</p>
                                                    <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedDeptDetail.department.manager_name || 'Unassigned'}</p>
                                                </div>
                                                <div>
                                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Created</p>
                                                    <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{new Date(selectedDeptDetail.department.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div style={{
                                                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginBottom: 20,
                                            }}>
                                                <StatCard icon="👥" label="Staff" value={selectedDeptDetail.total_staff || 0} color="#6366f1" />
                                                <StatCard icon="📦" label="Products" value={selectedDeptDetail.total_products || 0} color="#0ea5e9" />
                                                <StatCard icon="💰" label="Revenue" value={`₱${(selectedDeptDetail.total_revenue || 0).toFixed(2)}`} color="#f59e0b" />
                                                <StatCard icon="🛒" label="Orders" value={selectedDeptDetail.total_orders || 0} color="#10b981" />
                                            </div>

                                            {/* Order Type Breakdown */}
                                            <div style={{
                                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20,
                                            }}>
                                                <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                                    <DonutChart
                                                        title="Order Breakdown"
                                                        size={130}
                                                        data={[
                                                            { label: 'Delivery', value: selectedDeptDetail.delivery_orders || 0, color: '#3b82f6' },
                                                            { label: 'Walk-in', value: selectedDeptDetail.walkin_orders || 0, color: '#10b981' },
                                                        ]}
                                                    />
                                                </div>
                                                <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                                                    <div>
                                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 4 }}>Delivery Orders</p>
                                                        <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b82f6' }}>{selectedDeptDetail.delivery_orders || 0}</p>
                                                    </div>
                                                    <div>
                                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 4 }}>Walk-in Orders</p>
                                                        <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{selectedDeptDetail.walkin_orders || 0}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Sales Charts */}
                                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Sales</h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 20 }}>
                                                <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                                    <LineChart
                                                        data={[...(selectedDeptDetail.daily_sales || [])].reverse().slice(-14)}
                                                        labelKey="date" valueKey="amount"
                                                        title="Daily Sales (14 Days)" color="#6366f1" height={180}
                                                    />
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                    <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                                        <LineChart
                                                            data={selectedDeptDetail.weekly_sales || []}
                                                            labelKey="date" valueKey="amount"
                                                            title="Weekly Sales" color="#0ea5e9" height={160}
                                                        />
                                                    </div>
                                                    <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                                        <LineChart
                                                            data={selectedDeptDetail.monthly_sales || []}
                                                            labelKey="date" valueKey="amount"
                                                            title="Monthly Sales" color="#f59e0b" height={160}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Delivery vs Walk-in Earnings */}
                                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Delivery vs Walk-in Earnings</h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                                <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                                    <LineChart
                                                        data={selectedDeptDetail.delivery_earnings || []}
                                                        labelKey="date" valueKey="amount"
                                                        title="Delivery Earnings" color="#3b82f6" height={150}
                                                    />
                                                </div>
                                                <div style={{ padding: 16, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                                    <LineChart
                                                        data={selectedDeptDetail.walkin_earnings || []}
                                                        labelKey="date" valueKey="amount"
                                                        title="Walk-in Earnings" color="#10b981" height={150}
                                                    />
                                                </div>
                                            </div>

                                            {/* Staff List */}
                                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Staff ({selectedDeptDetail.staff?.length || 0})</h3>
                                            {selectedDeptDetail.staff && selectedDeptDetail.staff.length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    {selectedDeptDetail.staff.map(s => (
                                                        <div key={s.id} style={{
                                                            padding: 12, borderRadius: 10,
                                                            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        }}>
                                                            <div>
                                                                <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>{s.full_name}</p>
                                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.email}</p>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                                <span style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                                    padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600,
                                                                    background: s.is_banned ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                                    color: s.is_banned ? '#ef4444' : '#10b981',
                                                                }}>
                                                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.is_banned ? '#ef4444' : '#10b981' }} />
                                                                    {s.is_banned ? 'Banned' : 'Active'}
                                                                </span>
                                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                                    {new Date(s.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>No staff members</p>
                                            )}
                                        </>
                                    ) : (
                                        <p style={{ color: 'var(--text-muted)' }}>Failed to load department details</p>
                                    )}
                                </aside>
                                <style>{`
                                    @keyframes slideInRight {
                                        from { transform: translateX(100%); }
                                        to { transform: translateX(0); }
                                    }
                                `}</style>
                            </>
                        )}

                        {/* Create Department Modal */}
                        {showCreateDept && (
                            <>
                                <div style={{
                                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                                    zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }} onClick={() => setShowCreateDept(false)}>
                                    <div style={{
                                        background: 'var(--bg-primary)', borderRadius: 20, padding: 32,
                                        width: 440, maxWidth: '90vw', border: '1px solid var(--border-color)',
                                        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                                    }} onClick={e => e.stopPropagation()}>
                                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 20 }}>Create Store</h2>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Store Name *</label>
                                                <input
                                                    type="text" placeholder="Enter store name"
                                                    value={newDeptName} onChange={e => setNewDeptName(e.target.value)}
                                                    style={{
                                                        width: '100%', padding: '10px 14px', borderRadius: 10,
                                                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                                        color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Description</label>
                                                <textarea
                                                    placeholder="Enter description (optional)"
                                                    value={newDeptDesc} onChange={e => setNewDeptDesc(e.target.value)}
                                                    rows={3}
                                                    style={{
                                                        width: '100%', padding: '10px 14px', borderRadius: 10,
                                                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                                        color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                                                        resize: 'vertical',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                                            <button className="btn btn-primary" onClick={handleCreateDepartment}
                                                style={{ flex: 1, padding: '12px 0', fontSize: '0.9rem', fontWeight: 700, borderRadius: 10 }}>
                                                Create Store
                                            </button>
                                            <button className="btn btn-outline" onClick={() => setShowCreateDept(false)}
                                                style={{ flex: 1, padding: '12px 0', fontSize: '0.9rem', fontWeight: 700, borderRadius: 10 }}>
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Register Manager Modal */}
                        {showRegisterManager && (
                            <>
                                <div style={{
                                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                                    zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }} onClick={() => setShowRegisterManager(false)}>
                                    <div style={{
                                        background: 'var(--bg-primary)', borderRadius: 20, padding: 32,
                                        width: 480, maxWidth: '90vw', border: '1px solid var(--border-color)',
                                        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                                    }} onClick={e => e.stopPropagation()}>
                                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 20 }}>Register Manager</h2>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Full Name *</label>
                                                <input
                                                    type="text" placeholder="Enter full name"
                                                    value={managerForm.full_name} onChange={e => setManagerForm({ ...managerForm, full_name: e.target.value })}
                                                    style={{
                                                        width: '100%', padding: '10px 14px', borderRadius: 10,
                                                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                                        color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Email *</label>
                                                <input
                                                    type="email" placeholder="Enter email"
                                                    value={managerForm.email} onChange={e => setManagerForm({ ...managerForm, email: e.target.value })}
                                                    style={{
                                                        width: '100%', padding: '10px 14px', borderRadius: 10,
                                                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                                        color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Password *</label>
                                                <input
                                                    type="password" placeholder="Enter password"
                                                    value={managerForm.password} onChange={e => setManagerForm({ ...managerForm, password: e.target.value })}
                                                    style={{
                                                        width: '100%', padding: '10px 14px', borderRadius: 10,
                                                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                                        color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Contact Number</label>
                                                <input
                                                    type="text" placeholder="Enter contact number"
                                                    value={managerForm.contact_number} onChange={e => setManagerForm({ ...managerForm, contact_number: e.target.value })}
                                                    style={{
                                                        width: '100%', padding: '10px 14px', borderRadius: 10,
                                                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                                        color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Store *</label>
                                                <select
                                                    value={managerForm.department_id} onChange={e => setManagerForm({ ...managerForm, department_id: e.target.value })}
                                                    style={{
                                                        width: '100%', padding: '10px 14px', borderRadius: 10,
                                                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                                        color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                                                    }}
                                                >
                                                    <option value="">Select store</option>
                                                    {departments.map(d => (
                                                        <option key={d.id} value={d.id}>{d.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                                            <button className="btn btn-primary" onClick={handleRegisterManager}
                                                style={{ flex: 1, padding: '12px 0', fontSize: '0.9rem', fontWeight: 700, borderRadius: 10 }}>
                                                Register Manager
                                            </button>
                                            <button className="btn btn-outline" onClick={() => setShowRegisterManager(false)}
                                                style={{ flex: 1, padding: '12px 0', fontSize: '0.9rem', fontWeight: 700, borderRadius: 10 }}>
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ===== PENDING PRODUCTS TAB ===== */}
                {activeTab === 'pending' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Pending Products</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Review and approve or unapprove seller products</p>
                            </div>
                            <span style={{
                                padding: '6px 14px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700,
                                background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
                            }}>
                                {pendingProducts.length} Pending
                            </span>
                        </div>

                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Product</th><th>Price</th><th>Stock</th><th>Seller</th><th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingProducts.map(p => (
                                        <tr key={p.id} style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                                            onClick={() => setSelectedPendingProduct(p)}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.06)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
                                                {p.images && p.images.length > 0 && (
                                                    <img src={p.images[0]} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                                                )}
                                                {p.title}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>₱{p.price.toFixed(2)}</td>
                                            <td>{p.stock}</td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.seller_name}</td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                {new Date(p.created_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {pendingProducts.length === 0 && <div className="empty-state" style={{ padding: 40 }}><p>No pending products 🎉</p></div>}
                        </div>
                    </div>
                )}

                {/* Pending Product Detail Slide Panel */}
                {selectedPendingProduct && (
                    <>
                        <div style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                            zIndex: 300, transition: 'opacity 0.3s',
                        }} onClick={() => setSelectedPendingProduct(null)} />
                        <aside style={{
                            position: 'fixed', top: 0, right: 0, bottom: 0,
                            width: 480, maxWidth: '90vw', background: 'var(--bg-primary)',
                            borderLeft: '1px solid var(--border-color)',
                            zIndex: 301, overflowY: 'auto', padding: 32,
                            boxShadow: '-8px 0 30px rgba(0,0,0,0.3)',
                            animation: 'slideInRight 0.25s ease-out',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                                <div>
                                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 4 }}>
                                        Product Review
                                    </h2>
                                    <span style={{
                                        padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                                        background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
                                    }}>Pending Approval</span>
                                </div>
                                <button onClick={() => setSelectedPendingProduct(null)} style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-muted)', fontSize: '1.3rem',
                                }}>✕</button>
                            </div>

                            {/* Product Image */}
                            {selectedPendingProduct.images && selectedPendingProduct.images.length > 0 && (
                                <div style={{ marginBottom: 20, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                    <img src={selectedPendingProduct.images[0]} alt="" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                                </div>
                            )}

                            {/* Product Details */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24,
                                padding: 16, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                            }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Product Name</p>
                                    <p style={{ fontSize: '1rem', fontWeight: 700 }}>{selectedPendingProduct.title}</p>
                                </div>
                                {selectedPendingProduct.description && (
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Description</p>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedPendingProduct.description}</p>
                                    </div>
                                )}
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Price</p>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>₱{selectedPendingProduct.price.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Stock</p>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{selectedPendingProduct.stock}</p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Seller</p>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{selectedPendingProduct.seller_name}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedPendingProduct.seller_email}</p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Date Added</p>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{new Date(selectedPendingProduct.created_at).toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    className="btn btn-success"
                                    disabled={pendingActionLoading}
                                    onClick={() => handleApproveProduct(selectedPendingProduct.id)}
                                    style={{ flex: 1, padding: '12px 0', fontSize: '0.9rem', fontWeight: 700, borderRadius: 10 }}
                                >
                                    {pendingActionLoading ? '...' : '✓ Approve'}
                                </button>
                                <button
                                    className="btn btn-danger"
                                    disabled={pendingActionLoading}
                                    onClick={() => handleUnapproveProduct(selectedPendingProduct.id)}
                                    style={{ flex: 1, padding: '12px 0', fontSize: '0.9rem', fontWeight: 700, borderRadius: 10 }}
                                >
                                    {pendingActionLoading ? '...' : '✕ Unapprove'}
                                </button>
                            </div>
                        </aside>
                    </>
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
                                        <th>Buyer</th><th>Seller</th><th>Product</th><th>Qty</th><th>Total</th><th>Seller (90%)</th><th>Admin (10%)</th><th>Status</th><th>Type</th><th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(t => {
                                        const statusColors = {
                                            pending: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
                                            pending_walkin: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
                                            approved: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
                                            inwork: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
                                            ready: { bg: 'rgba(139,92,246,0.15)', color: '#8b5cf6' },
                                            ondeliver: { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
                                            delivered: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
                                            picked_up: { bg: 'rgba(14,165,233,0.15)', color: '#0ea5e9' },
                                            completed: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
                                            undelivered: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
                                            cancelled: { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' },
                                        };
                                        const statusLabels = {
                                            pending: 'Pending', pending_walkin: 'Pending', approved: 'Approved',
                                            inwork: 'In Work', ready: 'Ready', ondeliver: 'On Deliver',
                                            delivered: 'Delivered', picked_up: 'Picked Up', completed: 'Completed',
                                            undelivered: 'Undelivered', cancelled: 'Cancelled',
                                        };
                                        const sColor = statusColors[t.status] || { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' };
                                        const sLabel = statusLabels[t.status] || t.status;
                                        const isDelivery = t.purchase_type === 'delivery';
                                        return (
                                        <tr key={t.id}>
                                            <td style={{ fontWeight: 500 }}>{t.buyer_name}</td>
                                            <td style={{ fontWeight: 500 }}>{t.seller_name}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{t.product_title}</td>
                                            <td>{t.quantity || 1}</td>
                                            <td style={{ fontWeight: 600 }}>₱{t.amount.toFixed(2)}</td>
                                            <td style={{ color: 'var(--accent-secondary)' }}>₱{t.seller_amount.toFixed(2)}</td>
                                            <td style={{ color: '#f59e0b' }}>₱{t.admin_commission.toFixed(2)}</td>
                                            <td>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 600,
                                                    background: sColor.bg, color: sColor.color, whiteSpace: 'nowrap',
                                                }}>{sLabel}</span>
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '3px 10px', borderRadius: 12, fontSize: '0.72rem', fontWeight: 600,
                                                    background: isDelivery ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)',
                                                    color: isDelivery ? '#3b82f6' : '#f59e0b', whiteSpace: 'nowrap',
                                                }}>{isDelivery ? '🚚 Delivery' : '🏪 Walk-in'}</span>
                                            </td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                {new Date(t.created_at).toLocaleString()}
                                            </td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {transactions.length === 0 && <div className="empty-state" style={{ padding: 40 }}><p>No transactions found</p></div>}
                        </div>
                    </div>
                )}

                {/* ===== PRODUCTS TAB ===== */}
                {activeTab === 'products' && (() => {
                    // Group products by store (seller_name)
                    const storeGroups = {};
                    products.forEach(p => {
                        const store = p.seller_name || 'Independent';
                        if (!storeGroups[store]) storeGroups[store] = [];
                        storeGroups[store].push(p);
                    });
                    return (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Products by Store</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{products.length} products across {Object.keys(storeGroups).length} store{Object.keys(storeGroups).length !== 1 ? 's' : ''}</p>
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

                        {Object.entries(storeGroups).map(([storeName, storeProducts]) => (
                            <div key={storeName} style={{ marginBottom: 24 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                    <span style={{ fontSize: '1.2rem' }}>🏪</span>
                                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{storeName}</h2>
                                    <span style={{
                                        padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
                                        background: 'rgba(139,92,246,0.1)', color: '#8b5cf6',
                                    }}>{storeProducts.length} product{storeProducts.length !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th>Created</th><th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {storeProducts.map(p => (
                                                <tr key={p.id}>
                                                    <td style={{ fontWeight: 500 }}>
                                                        {editProductId === p.id ? (
                                                            <input type="text" defaultValue={p.title}
                                                                onChange={e => setEditProductData({ ...editProductData, title: e.target.value })}
                                                                style={{ width: 180, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
                                                        ) : p.title}
                                                    </td>
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
                                </div>
                            </div>
                        ))}
                        {products.length === 0 && <div className="empty-state" style={{ padding: 40 }}><p>No products found</p></div>}
                    </div>
                    );
                })()}

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

            {/* ===== USER DETAIL SLIDE PANEL ===== */}
            {selectedUserId && (
                <>
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                        zIndex: 300, transition: 'opacity 0.3s',
                    }} onClick={closeUserPanel} />
                    <aside style={{
                        position: 'fixed', top: 0, right: 0, bottom: 0,
                        width: 520, maxWidth: '90vw', background: 'var(--bg-primary)',
                        borderLeft: '1px solid var(--border-color)',
                        zIndex: 301, overflowY: 'auto', padding: 32,
                        boxShadow: '-8px 0 30px rgba(0,0,0,0.3)',
                        animation: 'slideInRight 0.25s ease-out',
                    }}>
                        {userDetailLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <div className="spinner" style={{ width: 40, height: 40 }} />
                            </div>
                        ) : userDetail ? (
                            <>
                                {/* Header: Name + Ban/Unban */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>
                                            {userDetail.user.full_name}
                                        </h2>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                                            textTransform: 'capitalize',
                                            background: userDetail.user.role === 'seller' ? 'rgba(108,99,255,0.1)' : userDetail.user.role === 'delivery' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                                            color: userDetail.user.role === 'seller' ? '#6366f1' : userDetail.user.role === 'delivery' ? '#3b82f6' : '#10b981',
                                        }}>{userDetail.user.role}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        {userDetail.user.role !== 'admin' && (
                                            <button
                                                className={`btn btn-sm ${userDetail.user.is_banned ? 'btn-success' : 'btn-danger'}`}
                                                onClick={async () => {
                                                    await handleBan(userDetail.user.id, !userDetail.user.is_banned);
                                                    handleUserClick(userDetail.user.id);
                                                }}
                                            >
                                                {userDetail.user.is_banned ? '✓ Unban' : '⛔ Ban'}
                                            </button>
                                        )}
                                        <button onClick={closeUserPanel} style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: 'var(--text-muted)', fontSize: '1.3rem',
                                        }}>✕</button>
                                    </div>
                                </div>

                                {/* User Details */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24,
                                    padding: 16, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                }}>
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Email</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{userDetail.user.email}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Contact</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{userDetail.user.contact_number || '—'}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Balance</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>₱{userDetail.user.balance.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Joined</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{new Date(userDetail.user.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Status</p>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                                            background: userDetail.user.is_banned ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                            color: userDetail.user.is_banned ? '#ef4444' : '#10b981',
                                        }}>
                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: userDetail.user.is_banned ? '#ef4444' : '#10b981' }} />
                                            {userDetail.user.is_banned ? 'Banned' : 'Active'}
                                        </span>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Total Transactions</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>{userDetail.report.total_transactions}</p>
                                    </div>
                                </div>

                                {/* Report Graphs */}
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>📊 Reports</h3>
                                <div style={{ marginBottom: 24 }}>
                                    {/* Daily Bar Chart */}
                                    <div style={{
                                        padding: 16, borderRadius: 12, background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)', marginBottom: 12,
                                    }}>
                                        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 10 }}>Daily Activity (Last 14 Days)</h4>
                                        {userDetail.report.daily.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No data yet</p>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100 }}>
                                                {[...userDetail.report.daily].reverse().slice(0, 14).map((d, i) => {
                                                    const max = Math.max(...userDetail.report.daily.map(x => x.amount), 1);
                                                    const h = Math.max((d.amount / max) * 100, 4);
                                                    return (
                                                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                                            <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>₱{d.amount}</span>
                                                            <div style={{
                                                                width: '100%', height: `${h}%`, borderRadius: 3, minHeight: 3,
                                                                background: 'linear-gradient(to top, #6366f1, rgba(99,102,241,0.4))',
                                                            }} />
                                                            <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>{d.date.slice(-5)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Monthly Bar Chart */}
                                    <div style={{
                                        padding: 16, borderRadius: 12, background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                    }}>
                                        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 10 }}>Monthly Activity</h4>
                                        {userDetail.report.monthly.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No data yet</p>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
                                                {[...userDetail.report.monthly].reverse().slice(0, 6).map((d, i) => {
                                                    const max = Math.max(...userDetail.report.monthly.map(x => x.amount), 1);
                                                    const h = Math.max((d.amount / max) * 100, 4);
                                                    return (
                                                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>₱{d.amount}</span>
                                                            <div style={{
                                                                width: '100%', height: `${h}%`, borderRadius: 4, minHeight: 4,
                                                                background: 'linear-gradient(to top, #f59e0b, rgba(245,158,11,0.4))',
                                                            }} />
                                                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{d.date}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Seller Products (if seller) */}
                                {userDetail.seller_products && userDetail.seller_products.length > 0 && (
                                    <>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>📦 Products ({userDetail.seller_products.length})</h3>
                                        <div style={{
                                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24,
                                        }}>
                                            {userDetail.seller_products.map(p => (
                                                <div key={p.id} style={{
                                                    padding: 10, borderRadius: 10,
                                                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                                    display: 'flex', gap: 10, alignItems: 'center',
                                                }}>
                                                    <div style={{
                                                        width: 48, height: 48, borderRadius: 8, overflow: 'hidden',
                                                        background: 'rgba(0,0,0,0.2)', flexShrink: 0,
                                                    }}>
                                                        {p.image_url ? (
                                                            <img src={p.image_url} alt={p.title}
                                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                onError={e => e.target.style.display = 'none'} />
                                                        ) : (
                                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.6rem' }}>N/A</div>
                                                        )}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p style={{
                                                            fontWeight: 600, fontSize: '0.78rem', marginBottom: 3,
                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                        }}>{p.title}</p>
                                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>₱{p.price.toFixed(2)}</span>
                                                            <span style={{
                                                                fontSize: '0.6rem', padding: '1px 6px', borderRadius: 4,
                                                                background: p.stock > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                                color: p.stock > 0 ? '#10b981' : '#ef4444', fontWeight: 600,
                                                            }}>{p.stock > 0 ? `${p.stock} stock` : 'No stock'}</span>
                                                            {!p.is_active && <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 600 }}>Inactive</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* Transaction History */}
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>🧾 History</h3>
                                {userDetail.transactions.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>No transactions yet</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {userDetail.transactions.slice(0, 20).map(t => {
                                            const statusClr = {
                                                pending: '#fbbf24', approved: '#6366f1', ondeliver: '#3b82f6',
                                                delivered: '#10b981', undelivered: '#ef4444', disapproved: '#ef4444',
                                                completed: '#10b981', cancelled: '#ef4444',
                                            };
                                            const roleClr = { buyer: '#10b981', seller: '#6366f1', delivery: '#3b82f6' };
                                            return (
                                                <div key={t.id} style={{
                                                    padding: 12, borderRadius: 10,
                                                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                }}>
                                                    <div>
                                                        <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>{t.product_title || 'Transaction'}</p>
                                                        <div style={{ display: 'flex', gap: 8, fontSize: '0.7rem' }}>
                                                            <span style={{
                                                                padding: '2px 8px', borderRadius: 10,
                                                                background: `${roleClr[t.role_in_txn] || '#94a3b8'}15`,
                                                                color: roleClr[t.role_in_txn] || '#94a3b8',
                                                                fontWeight: 600, textTransform: 'capitalize',
                                                            }}>{t.role_in_txn}</span>
                                                            <span style={{
                                                                padding: '2px 8px', borderRadius: 10,
                                                                background: `${statusClr[t.status] || '#94a3b8'}15`,
                                                                color: statusClr[t.status] || '#94a3b8',
                                                                fontWeight: 600,
                                                            }}>{t.status}</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>₱{t.amount.toFixed(2)}</p>
                                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                            {new Date(t.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        ) : (
                            <p style={{ color: 'var(--text-muted)' }}>Failed to load user details</p>
                        )}
                    </aside>

                    {/* Slide animation */}
                    <style>{`
                        @keyframes slideInRight {
                            from { transform: translateX(100%); }
                            to { transform: translateX(0); }
                        }
                    `}</style>
                </>
            )}
        </div>
    );
}
