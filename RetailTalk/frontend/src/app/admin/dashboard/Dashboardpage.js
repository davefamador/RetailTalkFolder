'use client';
import { useState, useEffect, useRef } from 'react';
import {
    LayoutDashboard, Users, Store, Truck, Clock, CreditCard,
    Box, ClipboardList, TrendingUp, Search, LogOut, Timer, CalendarDays,
    ShoppingCart, DollarSign, ShoppingBag, Briefcase, UserCheck,
    Package, Ruler, Sun, Moon, X, Receipt, AlertTriangle, Send, Download,
} from 'lucide-react';
import {
    getStoredAdmin, adminLogout, adminGetDashboard, adminGetUsers,
    adminBanUser, adminGetTransactions, adminGetReports,
    adminGetProducts, adminUpdateProduct, adminGetUserDetail,
    adminGetPendingProducts, adminApproveProduct, adminUnapproveProduct,
    adminGetDepartments, adminGetDepartmentDetail, adminCreateDepartment, adminRegisterManager,
    adminGetPendingRemovals, adminApproveRemoval, adminRejectRemoval,
    adminGetDeliveriesStats,
} from '../../../lib/api';
// â”€â”€ Line Chart Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function LineChart({ data, labelKey, valueKey, title, color = '#6366f1', height = 220, prefix = 'PHP ' }) {
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
            ctx.fillText(prefix + (maxVal * (4 - i) / 4).toFixed(0), padding.left - 8, y + 4);
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
            <h4 style={{ marginBottom: 12, fontSize: '0.9rem', color: 'var(--admin-text-secondary)' }}>{title}</h4>
            {(!data || data.length === 0) ? (
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>No data yet</p>
            ) : (
                <canvas ref={canvasRef} style={{ width: '100%', height }} />
            )}
        </div>
    );
}
// â”€â”€ Sidebar Item â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SidebarItem({ icon: Icon, label, active, onClick, collapsed }) {
    return (
        <button onClick={onClick} title={collapsed ? label : undefined} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: collapsed ? '10px 0' : '9px 16px', width: '100%',
            border: 'none', cursor: 'pointer',
            background: active ? 'var(--admin-active-bg)' : 'transparent',
            color: active ? 'var(--admin-active-text)' : 'var(--admin-sidebar-text)',
            fontWeight: active ? 600 : 400,
            fontSize: '0.85rem', textAlign: 'left',
            transition: 'all 0.15s ease',
            fontFamily: 'Inter, sans-serif',
            borderRadius: 8,
            justifyContent: collapsed ? 'center' : 'flex-start',
            position: 'relative',
        }}>
            <span style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} strokeWidth={1.8} />
            </span>
            {!collapsed && label}
        </button>
    );
}
// â”€â”€ Sidebar Section Label â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SidebarSection({ label, collapsed }) {
    if (collapsed) return <div style={{ height: 16 }} />;
    return (
        <div style={{
            padding: '16px 16px 6px',
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--admin-section-label)',
        }}>{label}</div>
    );
}
// â”€â”€ Stat Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatCard({ icon: Icon, label, value, color }) {
    return (
        <div style={{
            background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
            borderRadius: 12, padding: '20px 18px',
            display: 'flex', flexDirection: 'column', gap: 10,
            transition: 'all 0.2s',
        }}>
            <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${color}12`, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: color,
            }}>
                <Icon size={22} strokeWidth={1.8} />
            </div>
            <div style={{ minWidth: 0 }}>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    {label}
                </p>
                <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--admin-text)', wordBreak: 'break-word', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {value}
                </p>
            </div>
        </div>
    );
}
// â”€â”€ Horizontal Bar Chart (for store comparisons) â”€â”€â”€â”€â”€â”€â”€â”€â”€
function HorizontalBarChart({ data, labelKey, valueKey, title, color = '#8b5cf6', prefix = '', height = 'auto' }) {
    if (!data || data.length === 0) {
        return (
            <div>
                <h4 style={{ marginBottom: 12, fontSize: '0.9rem', color: 'var(--admin-text-secondary)' }}>{title}</h4>
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>No data yet</p>
            </div>
        );
    }
    const maxVal = Math.max(...data.map(d => d[valueKey]), 1);
    return (
        <div>
            <h4 style={{ marginBottom: 16, fontSize: '0.9rem', color: 'var(--admin-text-secondary)' }}>{title}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 110, fontSize: '0.8rem', fontWeight: 600,
                            color: 'var(--admin-text)', textAlign: 'right',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0,
                        }}>{d[labelKey]}</div>
                        <div style={{ flex: 1, height: 28, background: 'var(--admin-hover)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
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
                                    fontSize: '0.7rem', fontWeight: 700, color: 'var(--admin-text-secondary)',
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
// â”€â”€ Donut/Ring Chart (for order type breakdown) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        ctx.fillStyle = 'var(--admin-text)';
        ctx.font = `bold ${size * 0.14}px Inter, system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total.toString(), cx, cy);
    }, [data, size]);
    return (
        <div style={{ textAlign: 'center' }}>
            {title && <h4 style={{ marginBottom: 10, fontSize: '0.85rem', color: 'var(--admin-text-secondary)' }}>{title}</h4>}
            {(!data || data.length === 0 || data.every(d => d.value === 0)) ? (
                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>No data</p>
            ) : (
                <>
                    <canvas ref={canvasRef} style={{ width: size, height: size }} />
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                        {data.map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />
                                <span style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)' }}>{d.label}: {d.value}</span>
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
    const [adminTheme, setAdminTheme] = useState('dark');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    // Theme persistence
    useEffect(() => {
        const saved = localStorage.getItem('adminTheme');
        if (saved) setAdminTheme(saved);
    }, []);
    const toggleTheme = () => {
        const next = adminTheme === 'dark' ? 'light' : 'dark';
        setAdminTheme(next);
        localStorage.setItem('adminTheme', next);
    };
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [userSearch, setUserSearch] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [txnSearch, setTxnSearch] = useState('');
    const [reports, setReports] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });
    // Products state
    const [products, setProducts] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [editProductId, setEditProductId] = useState(null);
    const [editProductData, setEditProductData] = useState({});
    // Inventory tab state
    const [inventorySearch, setInventorySearch] = useState('');
    const [lowStockStoreModal, setLowStockStoreModal] = useState(null);
    const [lowStockStoreLoading, setLowStockStoreLoading] = useState(false);
    // Restock request modal state
    const [restockModal, setRestockModal] = useState(null);
    const [restockQty, setRestockQty] = useState('');
    const [restockMessage, setRestockMessage] = useState('');
    // User detail panel state
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [userDetail, setUserDetail] = useState(null);
    const [userDetailLoading, setUserDetailLoading] = useState(false);
    // Pending products state
    const [pendingProducts, setPendingProducts] = useState([]);
    const [selectedPendingProduct, setSelectedPendingProduct] = useState(null);
    const [pendingActionLoading, setPendingActionLoading] = useState(false);
    const [pendingSubTab, setPendingSubTab] = useState('products');
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
    // Pending removals state
    const [pendingRemovals, setPendingRemovals] = useState([]);
    const [removalLoading, setRemovalLoading] = useState(false);
    const [selectedRemoval, setSelectedRemoval] = useState(null);
    // Deliveries state
    const [deliveriesStats, setDeliveriesStats] = useState(null);
    const [selectedDeliveryman, setSelectedDeliveryman] = useState(null);
    // Staff detail popup state (for store detail)
    const [selectedStaffDetail, setSelectedStaffDetail] = useState(null);
    const [staffDetailLoading, setStaffDetailLoading] = useState(false);
    // Transactions filter state
    const [txnTypeFilter, setTxnTypeFilter] = useState('all');
    const [txnStatusFilter, setTxnStatusFilter] = useState('all');
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
    const loadDeliveries = async () => {
        try { setDeliveriesStats(await adminGetDeliveriesStats()); } catch (e) { console.error(e); setMessage({ type: 'error', text: 'Failed to load deliveries' }); }
    };
    useEffect(() => {
        if (!authChecked) return;
        if (activeTab === 'users') loadUsers();
        if (activeTab === 'transactions') loadTransactions();
        if (activeTab === 'reports') loadReports();
        if (activeTab === 'products') loadProducts();
        if (activeTab === 'inventory') loadProducts();
        if (activeTab === 'pending') { loadPending(); loadPendingRemovals(); }
        if (activeTab === 'departments') loadDepartments();
        if (activeTab === 'deliveries') loadDeliveries();
    }, [activeTab, authChecked]);
    const loadPending = async () => {
        try { setPendingProducts(await adminGetPendingProducts()); } catch (e) { console.error(e); }
    };
    const loadPendingRemovals = async () => {
        try { setPendingRemovals(await adminGetPendingRemovals()); } catch (e) { console.error(e); }
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
    const handleApproveRemoval = async (productId) => {
        setRemovalLoading(true);
        try {
            await adminApproveRemoval(productId);
            setMessage({ type: 'success', text: 'Removal approved! Product has been removed.' });
            setSelectedRemoval(null);
            loadPendingRemovals();
        } catch (e) { setMessage({ type: 'error', text: e.message }); }
        finally { setRemovalLoading(false); }
    };
    const handleRejectRemoval = async (productId) => {
        setRemovalLoading(true);
        try {
            await adminRejectRemoval(productId);
            setMessage({ type: 'success', text: 'Removal rejected.' });
            setSelectedRemoval(null);
            loadPendingRemovals();
        } catch (e) { setMessage({ type: 'error', text: e.message }); }
        finally { setRemovalLoading(false); }
    };
    const handleLowStockClick = (product) => {
        setRestockModal(product);
        setRestockQty('');
        setRestockMessage('');
    };
    const handleSubmitRestock = async () => {
        if (!restockModal || !restockQty) {
            setMessage({ type: 'error', text: 'Please enter requested stock quantity' });
            return;
        }
        try {
            const { adminCreateRestockRequest } = await import('../../../lib/api');
            await adminCreateRestockRequest({
                product_id: restockModal.id,
                requested_quantity: parseInt(restockQty),
                notes: restockMessage || '',
            });
            setMessage({ type: 'success', text: `Restock request submitted for ${restockModal.title} (Qty: ${restockQty}) — To Be Delivered` });
            setRestockModal(null);
            setRestockQty('');
            setRestockMessage('');
            // Refresh products if on inventory tab
            if (activeTab === 'inventory') loadProducts();
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to submit restock: ' + e.message });
        }
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
    const sidebarSections = [
        {
            label: 'Overview', items: [
                { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            ]
        },
        {
            label: 'Management', items: [
                { id: 'users', icon: Users, label: 'Users' },
                { id: 'departments', icon: Store, label: 'Stores' },
                { id: 'deliveries', icon: Truck, label: 'Deliveries' },
            ]
        },
        {
            label: 'Operations', items: [
                { id: 'pending', icon: Clock, label: 'Pending' },
                { id: 'transactions', icon: CreditCard, label: 'Transactions' },
            ]
        },
        {
            label: 'Catalog', items: [
                { id: 'products', icon: Box, label: 'Products' },
                { id: 'inventory', icon: ClipboardList, label: 'Inventory' },
            ]
        },
        {
            label: 'Analytics', items: [
                { id: 'reports', icon: TrendingUp, label: 'Reports' },
                { id: 'search', icon: Search, label: 'Search', href: '/search' },
            ]
        },
    ];
    const sidebarWidth = sidebarCollapsed ? 68 : 240;
    const isDark = adminTheme === 'dark';
    const adminVars = isDark ? {
        '--admin-bg': '#131318',
        '--admin-sidebar-bg': '#1a1a22',
        '--admin-header-bg': '#1a1a22',
        '--admin-card-bg': '#1e1e28',
        '--admin-border': '#2a2a3a',
        '--admin-text': '#e8e8ef',
        '--admin-text-secondary': '#9ca3b0',
        '--admin-text-muted': '#6b7280',
        '--admin-sidebar-text': '#9ca3b0',
        '--admin-active-bg': 'rgba(99,102,241,0.12)',
        '--admin-active-text': '#818cf8',
        '--admin-section-label': '#555566',
        '--admin-hover': 'rgba(255,255,255,0.04)',
        '--admin-accent': '#6366f1',
    } : {
        '--admin-bg': '#f5f5f5',
        '--admin-sidebar-bg': '#ffffff',
        '--admin-header-bg': '#ffffff',
        '--admin-card-bg': '#ffffff',
        '--admin-border': '#e5e7eb',
        '--admin-text': '#1f2937',
        '--admin-text-secondary': '#4b5563',
        '--admin-text-muted': '#9ca3af',
        '--admin-sidebar-text': '#6b7280',
        '--admin-active-bg': 'rgba(99,102,241,0.08)',
        '--admin-active-text': '#4f46e5',
        '--admin-section-label': '#9ca3af',
        '--admin-hover': 'rgba(0,0,0,0.03)',
        '--admin-accent': '#4f46e5',
    };
    return (
        <div id="admin-dashboard" style={{ display: 'flex', minHeight: '100vh', background: 'var(--admin-bg)', color: 'var(--admin-text)', ...adminVars }}>
            <style>{`
                #admin-dashboard { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; -webkit-font-smoothing: antialiased; }
                #admin-dashboard * { box-sizing: border-box; }
                #admin-dashboard .card { background: var(--admin-card-bg); border: 1px solid var(--admin-border); border-radius: 12px; padding: 24px; transition: all 0.2s; }
                #admin-dashboard .card:hover { border-color: rgba(99,102,241,0.25); }
                #admin-dashboard .data-table { width: 100%; border-collapse: collapse; }
                #admin-dashboard .data-table th, #admin-dashboard .data-table td { padding: 11px 16px; text-align: left; border-bottom: 1px solid var(--admin-border); }
                #admin-dashboard .data-table th { color: var(--admin-text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
                #admin-dashboard .data-table tr:hover td { background: var(--admin-hover); }
                #admin-dashboard .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 20px; border: none; border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                #admin-dashboard .btn-primary { background: linear-gradient(135deg, #6366f1, #818cf8); color: #fff; }
                #admin-dashboard .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
                #admin-dashboard .btn-success { background: linear-gradient(135deg, #10b981, #059669); color: #fff; }
                #admin-dashboard .btn-danger { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff; }
                #admin-dashboard .btn-outline { background: transparent; color: var(--admin-text); border: 1px solid var(--admin-border); }
                #admin-dashboard .btn-outline:hover { border-color: var(--admin-accent); background: var(--admin-active-bg); }
                #admin-dashboard .btn-sm { padding: 6px 14px; font-size: 0.8rem; }
                #admin-dashboard .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                #admin-dashboard .alert { padding: 12px 16px; border-radius: 8px; font-size: 0.88rem; margin-bottom: 16px; }
                #admin-dashboard .alert-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #ef4444; }
                #admin-dashboard .alert-success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); color: #10b981; }
                #admin-dashboard .spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid var(--admin-border); border-top-color: var(--admin-accent); border-radius: 50%; animation: adminSpin 0.6s linear infinite; }
                @keyframes adminSpin { to { transform: rotate(360deg); } }
                #admin-dashboard .loading-container { display: flex; justify-content: center; align-items: center; padding: 60px; flex-direction: column; gap: 16px; color: var(--admin-text-muted); }
                #admin-dashboard .empty-state { text-align: center; padding: 60px 20px; color: var(--admin-text-muted); }
                #admin-dashboard .form-group { margin-bottom: 16px; }
                #admin-dashboard .form-group label { display: block; font-size: 0.85rem; font-weight: 500; color: var(--admin-text-secondary); margin-bottom: 6px; }
                #admin-dashboard .form-group input, #admin-dashboard .form-group select, #admin-dashboard .form-group textarea { width: 100%; padding: 10px 14px; background: var(--admin-card-bg); border: 1px solid var(--admin-border); border-radius: 8px; color: var(--admin-text); font-family: 'Inter', sans-serif; font-size: 0.9rem; }
                #admin-dashboard .form-group input:focus, #admin-dashboard .form-group select:focus { outline: none; border-color: var(--admin-accent); }
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                @keyframes fadeScaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            `}</style>
            {/* ===== SIDEBAR ===== */}
            <aside style={{
                width: sidebarWidth, background: 'var(--admin-sidebar-bg)',
                borderRight: '1px solid var(--admin-border)',
                display: 'flex', flexDirection: 'column',
                position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 200,
                transition: 'width 0.2s ease',
                overflow: 'hidden',
            }}>
                {/* Logo + Collapse toggle */}
                <div style={{
                    padding: sidebarCollapsed ? '16px 0' : '16px 14px',
                    borderBottom: '1px solid var(--admin-border)',
                    display: 'flex', alignItems: 'center', gap: 10,
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    minHeight: 56,
                }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.9rem', fontWeight: 800, color: '#fff', flexShrink: 0,
                        cursor: 'pointer',
                    }} onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                        RT
                    </div>
                    {!sidebarCollapsed && (
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--admin-text)' }}>RetailTalk</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-muted)', letterSpacing: '0.5px' }}>ADMIN PANEL</div>
                        </div>
                    )}
                </div>
                <nav style={{ padding: sidebarCollapsed ? '8px 8px' : '8px 10px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {sidebarSections.map((section, si) => (
                        <div key={si}>
                            <SidebarSection label={section.label} collapsed={sidebarCollapsed} />
                            {section.items.map(item => (
                                <SidebarItem
                                    key={item.id}
                                    icon={item.icon}
                                    label={item.label}
                                    active={activeTab === item.id}
                                    collapsed={sidebarCollapsed}
                                    onClick={() => item.href ? (window.location.href = item.href) : setActiveTab(item.id)}
                                />
                            ))}
                        </div>
                    ))}
                </nav>
                {/* Theme toggle + user */}
                <div style={{ borderTop: '1px solid var(--admin-border)', padding: sidebarCollapsed ? '12px 0' : '12px 14px' }}>
                    {/* Theme toggle */}
                    <button onClick={toggleTheme} title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'} style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: sidebarCollapsed ? '8px 0' : '8px 16px',
                        background: 'var(--admin-hover)', border: '1px solid var(--admin-border)',
                        borderRadius: 8, cursor: 'pointer', marginBottom: 10,
                        color: 'var(--admin-sidebar-text)', fontFamily: 'Inter, sans-serif',
                        fontSize: '0.8rem', justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                        transition: 'all 0.15s',
                    }}>
                        {isDark ? <Sun size={16} /> : <Moon size={16} />}
                        {!sidebarCollapsed && (isDark ? 'Light Mode' : 'Dark Mode')}
                    </button>
                    {/* User info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'rgba(99,102,241,0.15)', color: 'var(--admin-accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
                        }}>
                            {admin?.full_name?.charAt(0)?.toUpperCase() || 'A'}
                        </div>
                        {!sidebarCollapsed && (
                            <>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--admin-text)' }}>
                                        {admin?.full_name}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--admin-text-muted)' }}>Administrator</div>
                                </div>
                                <button onClick={handleLogout} title="Logout" style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--admin-text-muted)', padding: 4,
                                }}><LogOut size={16} /></button>
                            </>
                        )}
                    </div>
                </div>
            </aside>
            {/* ===== MAIN CONTENT ===== */}
            <main style={{ marginLeft: sidebarWidth, flex: 1, transition: 'margin-left 0.2s ease', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                {/* Top header bar */}
                <header style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 32px', height: 56,
                    background: 'var(--admin-header-bg)',
                    borderBottom: '1px solid var(--admin-border)',
                    position: 'sticky', top: 0, zIndex: 100,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--admin-text)', textTransform: 'capitalize' }}>
                            {activeTab === 'departments' ? 'Stores' : activeTab}
                        </h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: 'var(--admin-hover)', border: '1px solid var(--admin-border)',
                            borderRadius: 8, padding: '6px 14px',
                        }}>
                            <Search size={14} style={{ color: 'var(--admin-text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Search..."
                                style={{
                                    background: 'transparent', border: 'none', outline: 'none',
                                    color: 'var(--admin-text)', fontFamily: 'Inter, sans-serif',
                                    fontSize: '0.82rem', width: 160,
                                }}
                            />
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 12px', borderRadius: 8,
                            background: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)',
                            color: '#10b981', fontSize: '0.82rem', fontWeight: 600,
                        }}>
                            {admin?.full_name?.split(' ')[0] || 'Admin'}
                        </div>
                    </div>
                </header>
                <div style={{ padding: '28px 32px', maxWidth: 1200, flex: 1 }}>
                    {message.text && (
                        <div className={`alert alert-${message.type}`} style={{ marginBottom: 16 }}>
                            {message.text}
                            <button onClick={() => setMessage({ type: '', text: '' })} style={{
                                float: 'right', background: 'none', border: 'none',
                                cursor: 'pointer', color: 'inherit', fontWeight: 700,
                            }}><X size={16} /></button>
                        </div>
                    )}
                    {/* ===== DASHBOARD TAB ===== */}
                    {activeTab === 'dashboard' && (
                        <div>
                            <div style={{ marginBottom: 32 }}>
                                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>
                                    Welcome back, {admin?.full_name?.split(' ')[0]}
                                </h1>
                                <p style={{ color: 'var(--admin-text-secondary)' }}>
                                    Here's what's happening with your platform today.
                                </p>
                            </div>
                            {stats ? (
                                <>
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                        gap: 16, marginBottom: 32,
                                    }}>
                                        <StatCard icon={Users} label="Total Users" value={stats.total_users} color="#6366f1" />
                                        <StatCard icon={Package} label="Active Products" value={stats.total_products} color="#0ea5e9" />
                                        <StatCard icon={ShoppingCart} label="Completed Orders" value={stats.total_orders} color="#10b981" />
                                        <StatCard icon={Receipt} label="Transaction Orders" value={stats.total_transaction_orders || 0} color="#0ea5e9" />
                                        <StatCard icon={DollarSign} label="Total Earnings" value={`PHP ${(stats.total_admin_earnings || 0).toFixed(2)}`} color="#f59e0b" />
                                        <StatCard icon={ShoppingBag} label="Total Buyers" value={stats.total_buyers || 0} color="#10b981" />
                                        <StatCard icon={Store} label="Stores" value={stats.total_departments || 0} color="#8b5cf6" />
                                        <StatCard icon={Briefcase} label="Managers" value={stats.total_managers || 0} color="#ec4899" />
                                        <StatCard icon={UserCheck} label="Staff" value={stats.total_staff || 0} color="#14b8a6" />
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
                                    <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.9rem' }}>Manage all registered users</p>
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input
                                        type="text" placeholder="Search users..."
                                        value={userSearch} onChange={e => setUserSearch(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && loadUsers(userSearch)}
                                        style={{
                                            width: 240, padding: '10px 14px', borderRadius: 10,
                                            background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                            color: 'var(--admin-text)', fontFamily: 'Inter, sans-serif',
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
                                <Truck size={16} style={{ marginRight: 4 }} /> + Add Deliveryman
                            </button>
                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th>
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
                                                <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>{u.email}</td>
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
                                                <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
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
                                    <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.9rem' }}>Manage stores, managers, and staff</p>
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
                                        <Store size={14} /> + Create Store
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
                                        <Briefcase size={14} /> + Register Manager
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
                                            background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                            borderRadius: 16, padding: 20, cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--admin-border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                            <div>
                                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>{dept.name}</h3>
                                                {dept.description && (
                                                    <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{dept.description}</p>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {dept.low_stock_count > 0 && (
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                                        padding: '4px 10px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 700,
                                                        background: 'rgba(239,68,68,0.12)', color: '#ef4444',
                                                    }}><AlertTriangle size={12} /> {dept.low_stock_count} Low</span>
                                                )}
                                                <div style={{
                                                    width: 40, height: 40, borderRadius: 10,
                                                    background: 'rgba(139,92,246,0.15)', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                                                }}><Store size={14} /></div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                                            <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--admin-card-bg)' }}>
                                                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 2 }}>Manager</p>
                                                <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{dept.manager_name || 'Unassigned'}</p>
                                            </div>
                                            <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--admin-card-bg)' }}>
                                                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 2 }}>Staff</p>
                                                <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{dept.staff_count || 0}</p>
                                            </div>
                                            <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--admin-card-bg)' }}>
                                                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 2 }}>Products</p>
                                                <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>{dept.product_count || 0}</p>
                                            </div>
                                            <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--admin-card-bg)' }}>
                                                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 2 }}>Revenue</p>
                                                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b' }}>PHP {(dept.total_revenue || 0).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {departments.length === 0 && <div className="empty-state" style={{ padding: 40 }}><p>No departments found</p></div>}
                            {/* Department Detail Modal */}
                            {(selectedDeptDetail || deptDetailLoading) && (
                                <>
                                    <div style={{
                                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                                        zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        padding: '20px',
                                    }} onClick={() => { setSelectedDeptDetail(null); }} />
                                    <div style={{
                                        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        zIndex: 301, padding: '20px', pointerEvents: 'none',
                                    }}>
                                        <div style={{
                                            background: 'var(--admin-bg)',
                                            borderRadius: 20,
                                            width: '90vw', maxWidth: 760,
                                            maxHeight: '88vh',
                                            overflowY: 'auto',
                                            padding: 32,
                                            boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
                                            animation: 'fadeScaleIn 0.2s ease-out',
                                            pointerEvents: 'auto',
                                            position: 'relative',
                                        }} onClick={e => e.stopPropagation()}>
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
                                                                <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.85rem' }}>{selectedDeptDetail.department.description}</p>
                                                            )}
                                                        </div>
                                                        <button onClick={() => setSelectedDeptDetail(null)} style={{
                                                            background: 'none', border: 'none', cursor: 'pointer',
                                                            color: 'var(--admin-text-muted)', fontSize: '1.3rem',
                                                        }}><X size={16} /></button>
                                                    </div>
                                                    {/* Department Info */}
                                                    <div style={{
                                                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20,
                                                        padding: 16, borderRadius: 12, background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                                    }}>
                                                        <div>
                                                            <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Manager</p>
                                                            <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedDeptDetail.department.manager_name || 'Unassigned'}</p>
                                                        </div>
                                                        <div>
                                                            <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Created</p>
                                                            <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{new Date(selectedDeptDetail.department.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    {/* Stats */}
                                                    <div style={{
                                                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginBottom: 20,
                                                    }}>
                                                        <StatCard icon={Users} label="Staff" value={selectedDeptDetail.total_staff || 0} color="#6366f1" />
                                                        <StatCard icon={Package} label="Products" value={selectedDeptDetail.total_products || 0} color="#0ea5e9" />
                                                        <StatCard icon={DollarSign} label="Revenue" value={`PHP ${(selectedDeptDetail.total_revenue || 0).toFixed(2)}`} color="#f59e0b" />
                                                        <StatCard icon={ShoppingCart} label="Orders" value={selectedDeptDetail.total_orders || 0} color="#10b981" />
                                                        {(selectedDeptDetail.low_stock_count || 0) > 0 && (
                                                            <StatCard icon={AlertTriangle} label="Low Stock" value={selectedDeptDetail.low_stock_count} color="#ef4444" />
                                                        )}
                                                    </div>
                                                    {/* Order Type Breakdown */}
                                                    <div style={{
                                                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20,
                                                    }}>
                                                        <div style={{ padding: 16, borderRadius: 12, background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
                                                            <DonutChart
                                                                title="Order Breakdown"
                                                                size={130}
                                                                data={[
                                                                    { label: 'Delivery', value: selectedDeptDetail.delivery_orders || 0, color: '#3b82f6' },
                                                                    { label: 'Walk-in', value: selectedDeptDetail.walkin_orders || 0, color: '#10b981' },
                                                                ]}
                                                            />
                                                        </div>
                                                        <div style={{ padding: 16, borderRadius: 12, background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                                                            <div>
                                                                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 4 }}>Delivery Orders</p>
                                                                <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b82f6' }}>{selectedDeptDetail.delivery_orders || 0}</p>
                                                            </div>
                                                            <div>
                                                                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 4 }}>Walk-in Orders</p>
                                                                <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{selectedDeptDetail.walkin_orders || 0}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Products Section */}
                                                    {selectedDeptDetail.products && selectedDeptDetail.products.length > 0 && (
                                                        <>
                                                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <Package size={16} /> Products ({selectedDeptDetail.products.length})
                                                            </h3>
                                                            <div style={{
                                                                maxHeight: 320, overflowY: 'auto', marginBottom: 20, paddingRight: 4,
                                                            }}>
                                                                <div style={{
                                                                    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
                                                                }}>
                                                                    {selectedDeptDetail.products.map(prod => {
                                                                        const prodImg = prod.images && prod.images.length > 0 ? prod.images[0] : null;
                                                                        const isLowStock = prod.stock < 5;
                                                                        return (
                                                                            <div key={prod.id} style={{
                                                                                padding: 12, borderRadius: 10,
                                                                                background: 'var(--admin-card-bg)',
                                                                                border: `1px solid ${isLowStock ? 'rgba(239,68,68,0.3)' : 'var(--admin-border)'}`,
                                                                                display: 'flex', gap: 10, alignItems: 'center',
                                                                            }}>
                                                                                <div style={{
                                                                                    width: 44, height: 44, borderRadius: 8, overflow: 'hidden',
                                                                                    background: 'var(--admin-hover)', flexShrink: 0,
                                                                                }}>
                                                                                    {prodImg ? (
                                                                                        <img src={prodImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                                            onError={e => e.target.style.display = 'none'} />
                                                                                    ) : (
                                                                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-muted)' }}>
                                                                                            <Package size={18} />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                                    <p style={{ fontWeight: 600, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                                                                                        {prod.title}
                                                                                    </p>
                                                                                    <div style={{ display: 'flex', gap: 8, fontSize: '0.7rem' }}>
                                                                                        <span style={{ color: 'var(--admin-text-muted)' }}>PHP {prod.price.toFixed(2)}</span>
                                                                                        <span style={{ color: isLowStock ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                                                                            Stock: {prod.stock}
                                                                                        </span>
                                                                                    </div>
                                                                                    <p style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 600, marginTop: 2 }}>
                                                                                        Revenue: PHP {prod.total_revenue.toFixed(2)}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                    {/* Pending Restock Requests */}
                                                    {selectedDeptDetail.pending_restocks && selectedDeptDetail.pending_restocks.length > 0 && (
                                                        <>
                                                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <ClipboardList size={16} /> Pending Restocks ({selectedDeptDetail.pending_restocks.length})
                                                            </h3>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                                                                {selectedDeptDetail.pending_restocks.map(r => (
                                                                    <div key={r.id} style={{
                                                                        padding: 12, borderRadius: 10,
                                                                        background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                    }}>
                                                                        <div>
                                                                            <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>{r.product_title}</p>
                                                                            <p style={{ fontSize: '0.72rem', color: 'var(--admin-text-muted)' }}>
                                                                                By: {r.requested_by} | Qty: {r.requested_quantity} | Stock: {r.current_stock}
                                                                            </p>
                                                                        </div>
                                                                        <span style={{
                                                                            padding: '3px 10px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600,
                                                                            background: r.status === 'approved_manager' ? 'rgba(59,130,246,0.12)' : 'rgba(251,191,36,0.12)',
                                                                            color: r.status === 'approved_manager' ? '#3b82f6' : '#fbbf24',
                                                                        }}>
                                                                            {r.status === 'approved_manager' ? 'To Be Delivered' : 'Pending'}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                    {/* Sales Charts */}
                                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Sales</h3>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 20 }}>
                                                        <div style={{ padding: 16, borderRadius: 12, background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
                                                            <LineChart
                                                                data={[...(selectedDeptDetail.daily_sales || [])].reverse().slice(-14)}
                                                                labelKey="date" valueKey="amount"
                                                                title="Daily Sales (14 Days)" color="#6366f1" height={180}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                            <div style={{ padding: 16, borderRadius: 12, background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
                                                                <LineChart
                                                                    data={selectedDeptDetail.weekly_sales || []}
                                                                    labelKey="date" valueKey="amount"
                                                                    title="Weekly Sales" color="#0ea5e9" height={160}
                                                                />
                                                            </div>
                                                            <div style={{ padding: 16, borderRadius: 12, background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
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
                                                        <div style={{ padding: 16, borderRadius: 12, background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
                                                            <LineChart
                                                                data={selectedDeptDetail.delivery_earnings || []}
                                                                labelKey="date" valueKey="amount"
                                                                title="Delivery Earnings" color="#3b82f6" height={150}
                                                            />
                                                        </div>
                                                        <div style={{ padding: 16, borderRadius: 12, background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
                                                            <LineChart
                                                                data={selectedDeptDetail.walkin_earnings || []}
                                                                labelKey="date" valueKey="amount"
                                                                title="Walk-in Earnings" color="#10b981" height={150}
                                                            />
                                                        </div>
                                                    </div>
                                                    {/* Staff List — Clickable */}
                                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Staff ({selectedDeptDetail.staff?.length || 0})</h3>
                                                    {selectedDeptDetail.staff && selectedDeptDetail.staff.length > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            {selectedDeptDetail.staff.map(s => (
                                                                <div key={s.id} style={{
                                                                    padding: 12, borderRadius: 10,
                                                                    background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                    cursor: 'pointer', transition: 'all 0.15s',
                                                                }}
                                                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--admin-border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                                                onClick={async () => {
                                                                    setStaffDetailLoading(true);
                                                                    setSelectedStaffDetail(null);
                                                                    try {
                                                                        const detail = await adminGetUserDetail(s.id);
                                                                        setSelectedStaffDetail({ ...detail, staff_info: s });
                                                                    } catch (e) {
                                                                        setMessage({ type: 'error', text: 'Failed to load staff details' });
                                                                    } finally {
                                                                        setStaffDetailLoading(false);
                                                                    }
                                                                }}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                        <div style={{
                                                                            width: 32, height: 32, borderRadius: '50%',
                                                                            background: 'rgba(99,102,241,0.15)', color: '#6366f1',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            fontWeight: 700, fontSize: '0.75rem', flexShrink: 0,
                                                                        }}>
                                                                            {s.full_name?.charAt(0)?.toUpperCase() || 'S'}
                                                                        </div>
                                                                        <div>
                                                                            <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 2 }}>{s.full_name}</p>
                                                                            <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{s.email}</p>
                                                                        </div>
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
                                                                        <span style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>
                                                                            {new Date(s.created_at).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>No staff members</p>
                                                    )}
                                                    {/* Staff Detail Popup — overlays the store detail */}
                                                    {(selectedStaffDetail || staffDetailLoading) && (
                                                        <div style={{
                                                            position: 'absolute', inset: 0, borderRadius: 20,
                                                            background: 'var(--admin-bg)', zIndex: 10,
                                                            padding: 32, overflowY: 'auto',
                                                            animation: 'fadeScaleIn 0.2s ease-out',
                                                        }}>
                                                            {staffDetailLoading ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                                                    <div className="spinner" style={{ width: 40, height: 40 }} />
                                                                </div>
                                                            ) : selectedStaffDetail ? (() => {
                                                                const sd = selectedStaffDetail;
                                                                const si = sd.staff_info || {};
                                                                // Build line graph data from transactions
                                                                const txnsByMonth = {};
                                                                const deliveriesByMonth = {};
                                                                const walkinsByMonth = {};
                                                                (sd.transactions || []).forEach(t => {
                                                                    try {
                                                                        const d = new Date(t.created_at);
                                                                        const key = d.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
                                                                        txnsByMonth[key] = (txnsByMonth[key] || 0) + 1;
                                                                        if (t.purchase_type === 'delivery') {
                                                                            deliveriesByMonth[key] = (deliveriesByMonth[key] || 0) + 1;
                                                                        } else {
                                                                            walkinsByMonth[key] = (walkinsByMonth[key] || 0) + 1;
                                                                        }
                                                                    } catch {}
                                                                });
                                                                const lineData = Object.entries(txnsByMonth)
                                                                    .map(([date, count]) => ({ date, count, deliveries: deliveriesByMonth[date] || 0, walkins: walkinsByMonth[date] || 0 }))
                                                                    .slice(-8);
                                                                const totalDeliveries = (sd.transactions || []).filter(t => t.purchase_type === 'delivery').length;
                                                                const totalWalkins = (sd.transactions || []).filter(t => t.purchase_type !== 'delivery').length;
                                                                return (
                                                                    <>
                                                                        <button onClick={() => { setSelectedStaffDetail(null); }} style={{
                                                                            display: 'flex', alignItems: 'center', gap: 6,
                                                                            background: 'none', border: '1px solid var(--admin-border)',
                                                                            cursor: 'pointer', color: 'var(--admin-text-secondary)',
                                                                            fontSize: '0.82rem', fontWeight: 600, padding: '6px 14px',
                                                                            borderRadius: 8, marginBottom: 20, fontFamily: 'Inter, sans-serif',
                                                                        }}>
                                                                            <X size={14} /> Back to Store
                                                                        </button>
                                                                        {/* Staff header */}
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                                                                            <div style={{
                                                                                width: 56, height: 56, borderRadius: '50%',
                                                                                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                                                                                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                fontWeight: 800, fontSize: '1.3rem', flexShrink: 0,
                                                                            }}>
                                                                                {si.full_name?.charAt(0)?.toUpperCase() || 'S'}
                                                                            </div>
                                                                            <div>
                                                                                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 2 }}>{si.full_name || sd.full_name}</h2>
                                                                                <p style={{ fontSize: '0.82rem', color: 'var(--admin-text-muted)' }}>
                                                                                    {si.email || sd.email} | Joined: {new Date(si.created_at || sd.created_at).toLocaleDateString()}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        {/* Staff stats */}
                                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                                                                            <div style={{
                                                                                padding: 14, borderRadius: 10,
                                                                                background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                                                                textAlign: 'center',
                                                                            }}>
                                                                                <p style={{ fontSize: '1.3rem', fontWeight: 800, color: '#6366f1' }}>{(sd.transactions || []).length}</p>
                                                                                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Total Orders</p>
                                                                            </div>
                                                                            <div style={{
                                                                                padding: 14, borderRadius: 10,
                                                                                background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                                                                textAlign: 'center',
                                                                            }}>
                                                                                <p style={{ fontSize: '1.3rem', fontWeight: 800, color: '#3b82f6' }}>{totalDeliveries}</p>
                                                                                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Deliveries</p>
                                                                            </div>
                                                                            <div style={{
                                                                                padding: 14, borderRadius: 10,
                                                                                background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                                                                textAlign: 'center',
                                                                            }}>
                                                                                <p style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>{totalWalkins}</p>
                                                                                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Walk-ins</p>
                                                                            </div>
                                                                        </div>
                                                                        {/* Activity line graph */}
                                                                        <div style={{ padding: 16, borderRadius: 12, background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)', marginBottom: 20 }}>
                                                                            <LineChart
                                                                                data={lineData}
                                                                                labelKey="date" valueKey="count"
                                                                                title="Monthly Order Activity" color="#6366f1" height={200} prefix=""
                                                                            />
                                                                        </div>
                                                                        {/* Delivery vs Walk-in line */}
                                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                                                            <div style={{ padding: 16, borderRadius: 12, background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
                                                                                <LineChart
                                                                                    data={lineData}
                                                                                    labelKey="date" valueKey="deliveries"
                                                                                    title="Delivery Orders" color="#3b82f6" height={150} prefix=""
                                                                                />
                                                                            </div>
                                                                            <div style={{ padding: 16, borderRadius: 12, background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)' }}>
                                                                                <LineChart
                                                                                    data={lineData}
                                                                                    labelKey="date" valueKey="walkins"
                                                                                    title="Walk-in Orders" color="#10b981" height={150} prefix=""
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        {/* Recent transactions */}
                                                                        {sd.transactions && sd.transactions.length > 0 && (
                                                                            <>
                                                                                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>Recent Transactions</h3>
                                                                                <div style={{ maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
                                                                                    {sd.transactions.slice(0, 15).map(t => (
                                                                                        <div key={t.id} style={{
                                                                                            padding: '10px 12px', borderRadius: 8,
                                                                                            border: '1px solid var(--admin-border)', marginBottom: 6,
                                                                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                                            fontSize: '0.8rem',
                                                                                        }}>
                                                                                            <div>
                                                                                                <p style={{ fontWeight: 600 }}>{t.product_title}</p>
                                                                                                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.72rem' }}>
                                                                                                    {t.buyer_name} | {new Date(t.created_at).toLocaleDateString()}
                                                                                                </p>
                                                                                            </div>
                                                                                            <div style={{ textAlign: 'right' }}>
                                                                                                <p style={{ fontWeight: 600 }}>PHP {(t.amount || 0).toFixed(2)}</p>
                                                                                                <span style={{
                                                                                                    padding: '2px 8px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 600,
                                                                                                    background: t.purchase_type === 'delivery' ? 'rgba(59,130,246,0.12)' : 'rgba(16,185,129,0.12)',
                                                                                                    color: t.purchase_type === 'delivery' ? '#3b82f6' : '#10b981',
                                                                                                }}>{t.purchase_type === 'delivery' ? 'Delivery' : 'Walk-in'}</span>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </>
                                                                );
                                                            })() : null}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <p style={{ color: 'var(--admin-text-muted)' }}>Failed to load department details</p>
                                            )}
                                        </div>
                                    </div>
                                    <style>{`
                                    @keyframes fadeScaleIn {
                                        from { opacity: 0; transform: scale(0.95); }
                                        to   { opacity: 1; transform: scale(1); }
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
                                            background: 'var(--admin-bg)', borderRadius: 20, padding: 32,
                                            width: 440, maxWidth: '90vw', border: '1px solid var(--admin-border)',
                                            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                                        }} onClick={e => e.stopPropagation()}>
                                            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 20 }}>Create Store</h2>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>Store Name *</label>
                                                    <input
                                                        type="text" placeholder="Enter store name"
                                                        value={newDeptName} onChange={e => setNewDeptName(e.target.value)}
                                                        style={{
                                                            width: '100%', padding: '10px 14px', borderRadius: 10,
                                                            background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                                            color: 'var(--admin-text)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>Description</label>
                                                    <textarea
                                                        placeholder="Enter description (optional)"
                                                        value={newDeptDesc} onChange={e => setNewDeptDesc(e.target.value)}
                                                        rows={3}
                                                        style={{
                                                            width: '100%', padding: '10px 14px', borderRadius: 10,
                                                            background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                                            color: 'var(--admin-text)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
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
                                            background: 'var(--admin-bg)', borderRadius: 20, padding: 32,
                                            width: 480, maxWidth: '90vw', border: '1px solid var(--admin-border)',
                                            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                                        }} onClick={e => e.stopPropagation()}>
                                            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 20 }}>Register Manager</h2>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>Full Name *</label>
                                                    <input
                                                        type="text" placeholder="Enter full name"
                                                        value={managerForm.full_name} onChange={e => setManagerForm({ ...managerForm, full_name: e.target.value })}
                                                        style={{
                                                            width: '100%', padding: '10px 14px', borderRadius: 10,
                                                            background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                                            color: 'var(--admin-text)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>Email *</label>
                                                    <input
                                                        type="email" placeholder="Enter email"
                                                        value={managerForm.email} onChange={e => setManagerForm({ ...managerForm, email: e.target.value })}
                                                        style={{
                                                            width: '100%', padding: '10px 14px', borderRadius: 10,
                                                            background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                                            color: 'var(--admin-text)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>Password *</label>
                                                    <input
                                                        type="password" placeholder="Enter password"
                                                        value={managerForm.password} onChange={e => setManagerForm({ ...managerForm, password: e.target.value })}
                                                        style={{
                                                            width: '100%', padding: '10px 14px', borderRadius: 10,
                                                            background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                                            color: 'var(--admin-text)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>Contact Number</label>
                                                    <input
                                                        type="text" placeholder="Enter contact number"
                                                        value={managerForm.contact_number} onChange={e => setManagerForm({ ...managerForm, contact_number: e.target.value })}
                                                        style={{
                                                            width: '100%', padding: '10px 14px', borderRadius: 10,
                                                            background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                                            color: 'var(--admin-text)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>Store *</label>
                                                    <select
                                                        value={managerForm.department_id} onChange={e => setManagerForm({ ...managerForm, department_id: e.target.value })}
                                                        style={{
                                                            width: '100%', padding: '10px 14px', borderRadius: 10,
                                                            background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                                            color: 'var(--admin-text)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
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
                    {/* ===== PENDING TAB ===== */}
                    {activeTab === 'pending' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <div>
                                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Pending Reviews</h1>
                                    <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.9rem' }}>Review and manage pending products and removal requests</p>
                                </div>
                            </div>
                            {/* Sub-tabs */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                                <button
                                    onClick={() => setPendingSubTab('products')}
                                    style={{
                                        padding: '8px 20px', borderRadius: 10, border: '1px solid',
                                        borderColor: pendingSubTab === 'products' ? '#fbbf24' : 'var(--admin-border)',
                                        background: pendingSubTab === 'products' ? 'rgba(251,191,36,0.15)' : 'transparent',
                                        color: pendingSubTab === 'products' ? '#fbbf24' : 'var(--admin-text-secondary)',
                                        cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                                        fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                                    }}
                                >
                                    Pending Products ({pendingProducts.length})
                                </button>
                                <button
                                    onClick={() => setPendingSubTab('removals')}
                                    style={{
                                        padding: '8px 20px', borderRadius: 10, border: '1px solid',
                                        borderColor: pendingSubTab === 'removals' ? '#ef4444' : 'var(--admin-border)',
                                        background: pendingSubTab === 'removals' ? 'rgba(239,68,68,0.15)' : 'transparent',
                                        color: pendingSubTab === 'removals' ? '#ef4444' : 'var(--admin-text-secondary)',
                                        cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                                        fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                                    }}
                                >
                                    Pending Removals ({pendingRemovals.length})
                                </button>
                            </div>
                            {/* Pending Products Sub-tab */}
                            {pendingSubTab === 'products' && (
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
                                                    <td style={{ fontWeight: 600 }}>PHP {p.price.toFixed(2)}</td>
                                                    <td>{p.stock}</td>
                                                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>{p.seller_name}</td>
                                                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
                                                        {new Date(p.created_at).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {pendingProducts.length === 0 && <div className="empty-state" style={{ padding: 40 }}><p>No pending products</p></div>}
                                </div>
                            )}
                            {/* Pending Removals Sub-tab */}
                            {pendingSubTab === 'removals' && (
                                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Title</th><th>Department</th><th>Requested By</th><th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pendingRemovals.map(r => (
                                                <tr key={r.id} style={{ cursor: 'pointer', transition: 'background 0.15s' }}
                                                    onClick={() => setSelectedRemoval(r)}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <td style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        {r.images && r.images.length > 0 && (
                                                            <img src={r.images[0]} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                                                        )}
                                                        {r.title}
                                                    </td>
                                                    <td style={{ color: 'var(--admin-text-secondary)', fontSize: '0.85rem' }}>{r.department_name || '—'}</td>
                                                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>{r.requested_by || r.seller_name || '—'}</td>
                                                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
                                                        {r.requested_at ? new Date(r.requested_at).toLocaleString() : r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {pendingRemovals.length === 0 && <div className="empty-state" style={{ padding: 40 }}><p>No pending removals</p></div>}
                                </div>
                            )}
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
                                width: 480, maxWidth: '90vw', background: 'var(--admin-bg)',
                                borderLeft: '1px solid var(--admin-border)',
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
                                        color: 'var(--admin-text-muted)', fontSize: '1.3rem',
                                    }}>No</button>
                                </div>
                                {/* Product Image */}
                                {selectedPendingProduct.images && selectedPendingProduct.images.length > 0 && (
                                    <div style={{ marginBottom: 20, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                                        <img src={selectedPendingProduct.images[0]} alt="" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                                    </div>
                                )}
                                {/* Product Details */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24,
                                    padding: 16, borderRadius: 12, background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                }}>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Product Name</p>
                                        <p style={{ fontSize: '1rem', fontWeight: 700 }}>{selectedPendingProduct.title}</p>
                                    </div>
                                    {selectedPendingProduct.description && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Description</p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)' }}>{selectedPendingProduct.description}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Price</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>PHP {selectedPendingProduct.price.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Stock</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{selectedPendingProduct.stock}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Seller</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{selectedPendingProduct.seller_name}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--admin-text-muted)' }}>{selectedPendingProduct.seller_email}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Date Added</p>
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
                                        {pendingActionLoading ? '...' : 'Yes Approve'}
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        disabled={pendingActionLoading}
                                        onClick={() => handleUnapproveProduct(selectedPendingProduct.id)}
                                        style={{ flex: 1, padding: '12px 0', fontSize: '0.9rem', fontWeight: 700, borderRadius: 10 }}
                                    >
                                        {pendingActionLoading ? '...' : 'No Unapprove'}
                                    </button>
                                </div>
                            </aside>
                        </>
                    )}
                    {/* Pending Removal Detail Slide Panel */}
                    {selectedRemoval && (
                        <>
                            <div style={{
                                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                                zIndex: 300, transition: 'opacity 0.3s',
                            }} onClick={() => setSelectedRemoval(null)} />
                            <aside style={{
                                position: 'fixed', top: 0, right: 0, bottom: 0,
                                width: 480, maxWidth: '90vw', background: 'var(--admin-bg)',
                                borderLeft: '1px solid var(--admin-border)',
                                zIndex: 301, overflowY: 'auto', padding: 32,
                                boxShadow: '-8px 0 30px rgba(0,0,0,0.3)',
                                animation: 'slideInRight 0.25s ease-out',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 4 }}>
                                            Removal Request
                                        </h2>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                                            background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                                        }}>Pending Removal</span>
                                    </div>
                                    <button onClick={() => setSelectedRemoval(null)} style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        color: 'var(--admin-text-muted)', fontSize: '1.3rem',
                                    }}><X size={16} /></button>
                                </div>
                                {/* Product Image */}
                                {selectedRemoval.images && selectedRemoval.images.length > 0 && (
                                    <div style={{ marginBottom: 20, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--admin-border)' }}>
                                        <img src={selectedRemoval.images[0]} alt="" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                                    </div>
                                )}
                                {/* Removal Details */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24,
                                    padding: 16, borderRadius: 12, background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                }}>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Product Name</p>
                                        <p style={{ fontSize: '1rem', fontWeight: 700 }}>{selectedRemoval.title}</p>
                                    </div>
                                    {selectedRemoval.description && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Description</p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)' }}>{selectedRemoval.description}</p>
                                        </div>
                                    )}
                                    <div>
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Price</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>PHP {selectedRemoval.price?.toFixed(2) || '0.00'}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Stock</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{selectedRemoval.stock}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Department</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{selectedRemoval.department_name || '—'}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Requested By</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{selectedRemoval.requested_by || selectedRemoval.seller_name || '—'}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Date Requested</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                            {selectedRemoval.requested_at ? new Date(selectedRemoval.requested_at).toLocaleString() : selectedRemoval.created_at ? new Date(selectedRemoval.created_at).toLocaleString() : '—'}
                                        </p>
                                    </div>
                                </div>
                                {/* Actions */}
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button
                                        className="btn btn-success"
                                        disabled={removalLoading}
                                        onClick={() => handleApproveRemoval(selectedRemoval.id)}
                                        style={{ flex: 1, padding: '12px 0', fontSize: '0.9rem', fontWeight: 700, borderRadius: 10 }}
                                    >
                                        {removalLoading ? '...' : 'Yes Approve Removal'}
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        disabled={removalLoading}
                                        onClick={() => handleRejectRemoval(selectedRemoval.id)}
                                        style={{ flex: 1, padding: '12px 0', fontSize: '0.9rem', fontWeight: 700, borderRadius: 10 }}
                                    >
                                        {removalLoading ? '...' : 'Reject Removal'}
                                    </button>
                                </div>
                            </aside>
                        </>
                    )}
                    {/* ===== TRANSACTIONS TAB ===== */}
                    {activeTab === 'transactions' && (() => {
                        const filteredTxns = transactions.filter(t => {
                            if (txnTypeFilter !== 'all' && t.purchase_type !== txnTypeFilter) return false;
                            if (txnStatusFilter !== 'all' && t.status !== txnStatusFilter) return false;
                            return true;
                        });
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
                        const deliveryStatuses = ['pending', 'approved', 'ondeliver', 'delivered', 'undelivered', 'completed', 'cancelled'];
                        const walkinStatuses = ['pending_walkin', 'inwork', 'ready', 'picked_up', 'completed', 'cancelled'];
                        const availableStatuses = txnTypeFilter === 'delivery' ? deliveryStatuses : txnTypeFilter === 'walkin' ? walkinStatuses : [...new Set([...deliveryStatuses, ...walkinStatuses])];
                        return (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div>
                                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Transactions</h1>
                                    <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.9rem' }}>All platform transactions</p>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        type="text" placeholder="Search..."
                                        value={txnSearch} onChange={e => setTxnSearch(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && loadTransactions(txnSearch)}
                                        style={{
                                            width: 200, padding: '10px 14px', borderRadius: 10,
                                            background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                            color: 'var(--admin-text)', fontFamily: 'Inter, sans-serif',
                                        }}
                                    />
                                    <button className="btn btn-primary btn-sm" onClick={() => loadTransactions(txnSearch)}>Search</button>
                                </div>
                            </div>
                            {/* Filter Buttons */}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginRight: 4 }}>Type:</span>
                                {[{ key: 'all', label: 'All' }, { key: 'delivery', label: 'Delivery' }, { key: 'walkin', label: 'Walk-in' }].map(f => (
                                    <button key={f.key} onClick={() => { setTxnTypeFilter(f.key); setTxnStatusFilter('all'); }} style={{
                                        padding: '6px 14px', borderRadius: 8, border: '1px solid',
                                        borderColor: txnTypeFilter === f.key ? 'var(--admin-accent)' : 'var(--admin-border)',
                                        background: txnTypeFilter === f.key ? 'var(--admin-active-bg)' : 'transparent',
                                        color: txnTypeFilter === f.key ? 'var(--admin-active-text)' : 'var(--admin-text-secondary)',
                                        fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                                        transition: 'all 0.15s',
                                    }}>{f.label}</button>
                                ))}
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginLeft: 12, marginRight: 4 }}>Status:</span>
                                <select
                                    value={txnStatusFilter}
                                    onChange={e => setTxnStatusFilter(e.target.value)}
                                    style={{
                                        padding: '6px 12px', borderRadius: 8,
                                        border: '1px solid var(--admin-border)',
                                        background: 'var(--admin-card-bg)', color: 'var(--admin-text)',
                                        fontSize: '0.78rem', fontFamily: 'Inter, sans-serif', cursor: 'pointer',
                                    }}
                                >
                                    <option value="all">All Statuses</option>
                                    {availableStatuses.map(s => (
                                        <option key={s} value={s}>{statusLabels[s] || s}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Buyer</th><th>Seller</th><th>Product</th><th>Qty</th><th>Amount</th><th>Status</th><th>Type</th><th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTxns.map(t => {
                                            const sColor = statusColors[t.status] || { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' };
                                            const sLabel = statusLabels[t.status] || t.status;
                                            const isDelivery = t.purchase_type === 'delivery';
                                            return (
                                                <tr key={t.id}>
                                                    <td style={{ fontWeight: 500 }}>{t.buyer_name}</td>
                                                    <td style={{ fontWeight: 500 }}>{t.seller_name}</td>
                                                    <td style={{ color: 'var(--admin-text-secondary)' }}>{t.product_title}</td>
                                                    <td>{t.quantity || 1}</td>
                                                    <td style={{ fontWeight: 600 }}>PHP {t.amount.toFixed(2)}</td>
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
                                                        }}>{isDelivery ? <><Truck size={14} /> Delivery</> : <><Store size={14} /> Walk-in</>}</span>
                                                    </td>
                                                    <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
                                                        {new Date(t.created_at).toLocaleString()}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {filteredTxns.length === 0 && <div className="empty-state" style={{ padding: 40 }}><p>No transactions found</p></div>}
                            </div>
                        </div>
                        );
                    })()}
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
                                        <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.9rem' }}>{products.length} products across {Object.keys(storeGroups).length} store{Object.keys(storeGroups).length !== 1 ? 's' : ''}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            type="text" placeholder="Search products..."
                                            value={productSearch} onChange={e => setProductSearch(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && loadProducts(productSearch)}
                                            style={{
                                                width: 240, padding: '10px 14px', borderRadius: 10,
                                                background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                                color: 'var(--admin-text)', fontFamily: 'Inter, sans-serif',
                                            }}
                                        />
                                        <button className="btn btn-primary btn-sm" onClick={() => loadProducts(productSearch)}>Search</button>
                                    </div>
                                </div>
                                {Object.entries(storeGroups).map(([storeName, storeProducts]) => (
                                    <div key={storeName} style={{ marginBottom: 24 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                            <span style={{ fontSize: '1.2rem' }}><Store size={14} /></span>
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
                                                                        style={{ width: 180, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--admin-border)', background: 'var(--admin-card-bg)', color: 'var(--admin-text)' }} />
                                                                ) : p.title}
                                                            </td>
                                                            <td>
                                                                {editProductId === p.id ? (
                                                                    <input type="number" defaultValue={p.price} step="0.01"
                                                                        onChange={e => setEditProductData({ ...editProductData, price: parseFloat(e.target.value) })}
                                                                        style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--admin-border)', background: 'var(--admin-card-bg)', color: 'var(--admin-text)' }} />
                                                                ) : <span style={{ fontWeight: 600 }}>PHP {p.price.toFixed(2)}</span>}
                                                            </td>
                                                            <td>
                                                                {editProductId === p.id ? (
                                                                    <input type="number" defaultValue={p.stock}
                                                                        onChange={e => setEditProductData({ ...editProductData, stock: parseInt(e.target.value) })}
                                                                        style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--admin-border)', background: 'var(--admin-card-bg)', color: 'var(--admin-text)' }} />
                                                                ) : <span style={{ color: p.stock <= 0 ? '#ef4444' : p.stock <= 5 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>{p.stock}</span>}
                                                            </td>
                                                            <td>
                                                                {editProductId === p.id ? (
                                                                    <select defaultValue={p.is_active.toString()}
                                                                        onChange={e => setEditProductData({ ...editProductData, is_active: e.target.value === 'true' })}
                                                                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--admin-border)', background: 'var(--admin-card-bg)', color: 'var(--admin-text)' }}>
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
                                                            <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
                                                                {new Date(p.created_at).toLocaleDateString()}
                                                            </td>
                                                            <td>
                                                                {editProductId === p.id ? (
                                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                                        <button className="btn btn-success btn-sm" onClick={() => handleUpdateProduct(p.id)} style={{ padding: '4px 8px' }}>Yes</button>
                                                                        <button className="btn btn-outline btn-sm" onClick={() => { setEditProductId(null); setEditProductData({}); }} style={{ padding: '4px 8px' }}>No</button>
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
                    {/* ===== INVENTORY TAB ===== */}
                    {activeTab === 'inventory' && (() => {
                        const lowStockProducts = products.filter(p => p.stock <= 5);
                        const filtered = products.filter(p => {
                            if (!inventorySearch) return true;
                            const q = inventorySearch.toLowerCase();
                            return p.title.toLowerCase().includes(q) || p.seller_name.toLowerCase().includes(q);
                        });
                        const storeGroups = {};
                        filtered.forEach(p => {
                            const store = p.seller_name || 'Independent';
                            if (!storeGroups[store]) storeGroups[store] = [];
                            storeGroups[store].push(p);
                        });
                        return (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                    <div>
                                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Inventory</h1>
                                        <p style={{ color: 'var(--admin-text-secondary)', fontSize: '0.9rem' }}>
                                            {products.length} products across {new Set(products.map(p => p.seller_name)).size} stores
                                        </p>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search by store or product name..."
                                        value={inventorySearch}
                                        onChange={e => setInventorySearch(e.target.value)}
                                        style={{
                                            width: 280, padding: '10px 14px', borderRadius: 10,
                                            background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                            color: 'var(--admin-text)', fontFamily: 'Inter, sans-serif',
                                        }}
                                    />
                                </div>
                                {/* Low Stock Alerts Section */}
                                {lowStockProducts.length > 0 && (
                                    <div style={{ marginBottom: 28 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                                            <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Low Stock Alerts</h2>
                                            <span style={{
                                                display: 'inline-block', padding: '3px 10px', borderRadius: 12,
                                                fontSize: '0.75rem', fontWeight: 600,
                                                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                            }}>{lowStockProducts.length}</span>
                                        </div>
                                        <div style={{
                                            maxHeight: 420,
                                            overflowY: 'auto',
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                            gap: 12,
                                            paddingRight: 4,
                                        }}>
                                            {lowStockProducts.map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => handleLowStockClick(p)}
                                                    style={{
                                                        background: 'var(--admin-card-bg)', border: '2px solid var(--admin-border)',
                                                        borderRadius: 12, padding: 16, cursor: p.department_id ? 'pointer' : 'default',
                                                        transition: 'all 0.2s', position: 'relative',
                                                        borderColor: p.stock === 0 ? '#ef4444' : '#f59e0b',
                                                    }}
                                                    onMouseEnter={e => {
                                                        if (p.department_id) {
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                                                        }
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.transform = 'translateY(0)';
                                                        e.currentTarget.style.boxShadow = 'none';
                                                    }}
                                                >
                                                    <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4, lineHeight: 1.3 }}>{p.title}</p>
                                                    <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.75rem', marginBottom: 8 }}><Store size={14} /> {p.seller_name}</p>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ color: p.stock === 0 ? '#ef4444' : '#f59e0b', fontWeight: 700, fontSize: '0.9rem' }}>
                                                            {p.stock === 0 ? 'Out of Stock' : `${p.stock} left`}
                                                        </span>
                                                        <span style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem' }}>PHP {p.price.toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Full Product List grouped by store */}
                                {Object.entries(storeGroups).map(([storeName, storeProducts]) => (
                                    <div key={storeName} style={{ marginBottom: 24 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                            <span style={{ fontSize: '1.2rem' }}><Store size={14} /></span>
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
                                                                        style={{ width: 180, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--admin-border)', background: 'var(--admin-card-bg)', color: 'var(--admin-text)' }} />
                                                                ) : p.title}
                                                            </td>
                                                            <td>
                                                                {editProductId === p.id ? (
                                                                    <input type="number" defaultValue={p.price} step="0.01"
                                                                        onChange={e => setEditProductData({ ...editProductData, price: parseFloat(e.target.value) })}
                                                                        style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--admin-border)', background: 'var(--admin-card-bg)', color: 'var(--admin-text)' }} />
                                                                ) : <span style={{ fontWeight: 600 }}>PHP {p.price.toFixed(2)}</span>}
                                                            </td>
                                                            <td>
                                                                {editProductId === p.id ? (
                                                                    <input type="number" defaultValue={p.stock}
                                                                        onChange={e => setEditProductData({ ...editProductData, stock: parseInt(e.target.value) })}
                                                                        style={{ width: 60, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--admin-border)', background: 'var(--admin-card-bg)', color: 'var(--admin-text)' }} />
                                                                ) : <span style={{ color: p.stock <= 0 ? '#ef4444' : p.stock <= 5 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>{p.stock}</span>}
                                                            </td>
                                                            <td>
                                                                {editProductId === p.id ? (
                                                                    <select defaultValue={p.is_active.toString()}
                                                                        onChange={e => setEditProductData({ ...editProductData, is_active: e.target.value === 'true' })}
                                                                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--admin-border)', background: 'var(--admin-card-bg)', color: 'var(--admin-text)' }}>
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
                                                            <td style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
                                                                {new Date(p.created_at).toLocaleDateString()}
                                                            </td>
                                                            <td>
                                                                {editProductId === p.id ? (
                                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                                        <button className="btn btn-success btn-sm" onClick={() => handleUpdateProduct(p.id)} style={{ padding: '4px 8px' }}>Yes</button>
                                                                        <button className="btn btn-outline btn-sm" onClick={() => { setEditProductId(null); setEditProductData({}); }} style={{ padding: '4px 8px' }}>No</button>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Financial Reports</h1>
                                {reports && (
                                    <button
                                        onClick={() => {
                                            const csv = [
                                                ['Financial Report Summary'],
                                                ['Generated on', new Date().toLocaleString()],
                                                [],
                                                ['OVERVIEW STATISTICS'],
                                                ['Metric', 'Value'],
                                                ['Total Revenue', `PHP ${reports.total_revenue.toFixed(2)}`],
                                                ['Total Orders', reports.total_orders],
                                                ['Average Order Value', `PHP ${reports.avg_transaction_value.toFixed(2)}`],
                                                [],
                                                ['TOP SELLERS'],
                                                ['Seller Name', 'Total Sales', 'Transaction Count'],
                                                ...reports.top_sellers.map(s => [s.seller_name, `PHP ${s.total_sales.toFixed(2)}`, s.transaction_count]),
                                                [],
                                                ['TOP PRODUCTS'],
                                                ['Product Title', 'Times Sold', 'Total Revenue'],
                                                ...reports.top_products.map(p => [p.product_title, p.times_sold, `PHP ${p.total_revenue.toFixed(2)}`]),
                                            ];
                                            const csvContent = csv.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
                                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                            const link = document.createElement('a');
                                            const url = URL.createObjectURL(blob);
                                            link.setAttribute('href', url);
                                            link.setAttribute('download', `admin-report-${new Date().toISOString().split('T')[0]}.csv`);
                                            link.style.visibility = 'hidden';
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)',
                                            background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                                            cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                                            fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                                    >
                                        <Download size={14} /> Export CSV
                                    </button>
                                )}
                            </div>
                            {reports ? (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                                        <StatCard icon={DollarSign} label="Total Revenue" value={`PHP ${reports.total_revenue.toFixed(2)}`} color="#f59e0b" />
                                        <StatCard icon={ShoppingCart} label="Total Orders" value={reports.total_orders} color="#10b981" />
                                        <StatCard icon={Ruler} label="Avg Order Value" value={`PHP ${reports.avg_transaction_value.toFixed(2)}`} color="#0ea5e9" />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
                                        <div className="card" style={{ padding: 24 }}>
                                            <LineChart
                                                data={[...reports.daily_income].reverse().slice(-14)}
                                                labelKey="date" valueKey="income"
                                                title="Daily Revenue (14 Days)" color="#f59e0b"
                                            />
                                        </div>
                                        <div className="card" style={{ padding: 24 }}>
                                            <LineChart
                                                data={[...(reports.monthly_income || [])].reverse().slice(-6)}
                                                labelKey="date" valueKey="income"
                                                title="Monthly Revenue" color="#6366f1"
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                        <div className="card" style={{ padding: 24 }}>
                                            <h4 style={{ marginBottom: 16, fontWeight: 700 }}>Top Sellers</h4>
                                            {reports.top_sellers.length === 0 ? (
                                                <p style={{ color: 'var(--admin-text-muted)' }}>No sellers yet</p>
                                            ) : (
                                                <table className="data-table">
                                                    <thead><tr><th>Seller</th><th>Sales</th><th>Orders</th></tr></thead>
                                                    <tbody>
                                                        {reports.top_sellers.map((s, i) => (
                                                            <tr key={i}>
                                                                <td style={{ fontWeight: 500 }}>{s.seller_name}</td>
                                                                <td style={{ color: '#10b981' }}>PHP {s.total_sales.toFixed(2)}</td>
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
                                                <p style={{ color: 'var(--admin-text-muted)' }}>No products sold yet</p>
                                            ) : (
                                                <table className="data-table">
                                                    <thead><tr><th>Product</th><th>Sold</th><th>Revenue</th></tr></thead>
                                                    <tbody>
                                                        {reports.top_products.map((p, i) => (
                                                            <tr key={i}>
                                                                <td style={{ fontWeight: 500 }}>{p.product_title}</td>
                                                                <td>{p.times_sold}x</td>
                                                                <td style={{ color: '#10b981' }}>PHP {p.total_revenue.toFixed(2)}</td>
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
                    {/* ===== DELIVERIES TAB ===== */}
                    {activeTab === 'deliveries' && (
                        <div>
                            <div style={{ marginBottom: 32 }}>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Deliveries Management</h1>
                                <p style={{ color: 'var(--admin-text-secondary)' }}>Track all deliveries and deliveryman performance</p>
                            </div>
                            {deliveriesStats ? (
                                <>
                                    {/* Overall Stats Cards */}
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                        gap: 16, marginBottom: 32,
                                    }}>
                                        <StatCard icon={Truck} label="Total Deliveries" value={deliveriesStats.total_deliveries} color="#0ea5e9" />
                                        <StatCard icon={Timer} label="Avg Delivery Time" value={deliveriesStats.avg_delivery_time ? `${deliveriesStats.avg_delivery_time.toFixed(1)}h` : 'N/A'} color="#8b5cf6" />
                                        <StatCard icon={CalendarDays} label="Deliveries This Month" value={deliveriesStats.deliveries_by_month.length > 0 ? deliveriesStats.deliveries_by_month[deliveriesStats.deliveries_by_month.length - 1].count : 0} color="#f59e0b" />
                                    </div>
                                    {/* Charts Section */}
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                                        gap: 24, marginBottom: 32,
                                    }}>
                                        <div className="card" style={{ padding: 24 }}>
                                            <LineChart
                                                data={deliveriesStats.deliveries_by_day.slice(-14)}
                                                labelKey="date"
                                                valueKey="count"
                                                title="Deliveries Per Day (Last 14 Days)"
                                                color="#0ea5e9"
                                                height={220}
                                                prefix=""
                                            />
                                        </div>
                                        <div className="card" style={{ padding: 24 }}>
                                            <LineChart
                                                data={deliveriesStats.deliveries_by_week.slice(-12)}
                                                labelKey="date"
                                                valueKey="count"
                                                title="Deliveries Per Week (Last 12 Weeks)"
                                                color="#8b5cf6"
                                                height={220}
                                                prefix=""
                                            />
                                        </div>
                                        <div className="card" style={{ padding: 24 }}>
                                            <LineChart
                                                data={deliveriesStats.deliveries_by_month}
                                                labelKey="date"
                                                valueKey="count"
                                                title="Deliveries Per Month"
                                                color="#f59e0b"
                                                height={220}
                                                prefix=""
                                            />
                                        </div>
                                    </div>
                                    {/* Deliverymen List */}
                                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                        <div style={{ padding: 24, borderBottom: '1px solid var(--admin-border)' }}>
                                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Deliverymen Performance</h3>
                                            <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem' }}>Click on a deliveryman to view detailed stats</p>
                                        </div>
                                        {deliveriesStats.deliverymen.length === 0 ? (
                                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                                                <p>No deliverymen found</p>
                                            </div>
                                        ) : (
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Name</th>
                                                        <th>Email</th>
                                                        <th>Contact</th>
                                                        <th>Total Deliveries</th>
                                                        <th>Completed</th>
                                                        <th>Avg Time</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {deliveriesStats.deliverymen.map((dm, i) => (
                                                        <tr key={i}>
                                                            <td style={{ fontWeight: 600 }}>{dm.full_name}</td>
                                                            <td style={{ fontSize: '0.85rem', color: 'var(--admin-text-muted)' }}>{dm.email}</td>
                                                            <td>{dm.contact_number || 'N/A'}</td>
                                                            <td style={{ fontWeight: 600 }}>{dm.total_deliveries}</td>
                                                            <td><span style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--accent-success)', padding: '4px 8px', borderRadius: 4, fontSize: '0.85rem' }}>{dm.completed_count}</span></td>
                                                            <td>{dm.avg_delivery_time ? `${dm.avg_delivery_time.toFixed(1)}h` : 'N/A'}</td>
                                                            <td>
                                                                <button
                                                                    onClick={() => setSelectedDeliveryman(dm)}
                                                                    style={{
                                                                        background: 'rgba(108,99,255,0.15)',
                                                                        color: 'var(--admin-accent)',
                                                                        border: 'none',
                                                                        padding: '6px 12px',
                                                                        borderRadius: 6,
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.8rem',
                                                                        fontWeight: 600,
                                                                        transition: 'all 0.2s',
                                                                    }}
                                                                    onMouseEnter={e => e.target.style.background = 'rgba(108,99,255,0.25)'}
                                                                    onMouseLeave={e => e.target.style.background = 'rgba(108,99,255,0.15)'}
                                                                >
                                                                    View Details
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="loading-container"><div className="spinner" style={{ width: 40, height: 40 }}></div><p>Loading deliveries...</p></div>
                            )}
                        </div>
                    )}
                </div>
            </main>
            {/* ===== DELIVERYMAN DETAIL MODAL ===== */}
            {selectedDeliveryman && (
                <div style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 300, padding: 20,
                }}>
                    <div style={{
                        background: 'var(--admin-card-bg)', borderRadius: 16, padding: 28,
                        maxWidth: 600, width: '100%', maxHeight: '90vh', overflow: 'auto',
                        border: '1px solid var(--admin-border)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{selectedDeliveryman.full_name}</h2>
                            <button
                                onClick={() => setSelectedDeliveryman(null)}
                                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--admin-text-muted)' }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        {/* Contact Info */}
                        <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--admin-border)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem', marginBottom: 4 }}>Email</p>
                                    <p style={{ fontWeight: 600 }}>{selectedDeliveryman.email}</p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem', marginBottom: 4 }}>Contact</p>
                                    <p style={{ fontWeight: 600 }}>{selectedDeliveryman.contact_number || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                        {/* Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
                            <div style={{ background: 'var(--admin-card-bg)', padding: 16, borderRadius: 12 }}>
                                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem', marginBottom: 6 }}>Total Deliveries</p>
                                <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--admin-accent)' }}>{selectedDeliveryman.total_deliveries}</p>
                            </div>
                            <div style={{ background: 'var(--admin-card-bg)', padding: 16, borderRadius: 12 }}>
                                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem', marginBottom: 6 }}>Completed</p>
                                <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-success)' }}>{selectedDeliveryman.completed_count}</p>
                            </div>
                            <div style={{ background: 'var(--admin-card-bg)', padding: 16, borderRadius: 12 }}>
                                <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem', marginBottom: 6 }}>Avg Time</p>
                                <p style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-warning)' }}>{selectedDeliveryman.avg_delivery_time ? `${selectedDeliveryman.avg_delivery_time.toFixed(1)}h` : 'N/A'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedDeliveryman(null)}
                            style={{
                                width: '100%', padding: '12px 20px', background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                                color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600,
                                cursor: 'pointer', fontSize: '0.95rem', transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.target.style.opacity = '0.9'}
                            onMouseLeave={e => e.target.style.opacity = '1'}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
            {/* ===== USER DETAIL SLIDE PANEL ===== */}
            {selectedUserId && (
                <>
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                        zIndex: 300, transition: 'opacity 0.3s',
                    }} onClick={closeUserPanel} />
                    <aside style={{
                        position: 'fixed', top: 0, right: 0, bottom: 0,
                        width: 520, maxWidth: '90vw', background: 'var(--admin-bg)',
                        borderLeft: '1px solid var(--admin-border)',
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
                                                {userDetail.user.is_banned ? 'Unban' : 'Ban'}
                                            </button>
                                        )}
                                        <button onClick={closeUserPanel} style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: 'var(--admin-text-muted)', fontSize: '1.3rem',
                                        }}><X size={16} /></button>
                                    </div>
                                </div>
                                {/* User Details */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24,
                                    padding: 16, borderRadius: 12, background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                                }}>
                                    <div>
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Email</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{userDetail.user.email}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Contact</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{userDetail.user.contact_number || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Balance</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>PHP {userDetail.user.balance.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Joined</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{new Date(userDetail.user.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Status</p>
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
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Total Transactions</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>{userDetail.report.total_transactions}</p>
                                    </div>
                                </div>
                                {/* Report Graphs */}
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}><TrendingUp size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />Reports</h3>
                                <div style={{ marginBottom: 24 }}>
                                    {/* Daily Bar Chart */}
                                    <div style={{
                                        padding: 16, borderRadius: 12, background: 'var(--admin-card-bg)',
                                        border: '1px solid var(--admin-border)', marginBottom: 12,
                                    }}>
                                        <h4 style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)', marginBottom: 10 }}>Daily Activity (Last 14 Days)</h4>
                                        {userDetail.report.daily.length === 0 ? (
                                            <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>No data yet</p>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100 }}>
                                                {[...userDetail.report.daily].reverse().slice(0, 14).map((d, i) => {
                                                    const max = Math.max(...userDetail.report.daily.map(x => x.amount), 1);
                                                    const h = Math.max((d.amount / max) * 100, 4);
                                                    return (
                                                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                                            <span style={{ fontSize: '0.55rem', color: 'var(--admin-text-muted)' }}>PHP {d.amount}</span>
                                                            <div style={{
                                                                width: '100%', height: `${h}%`, borderRadius: 3, minHeight: 3,
                                                                background: 'linear-gradient(to top, #6366f1, rgba(99,102,241,0.4))',
                                                            }} />
                                                            <span style={{ fontSize: '0.5rem', color: 'var(--admin-text-muted)' }}>{d.date.slice(-5)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    {/* Monthly Bar Chart */}
                                    <div style={{
                                        padding: 16, borderRadius: 12, background: 'var(--admin-card-bg)',
                                        border: '1px solid var(--admin-border)',
                                    }}>
                                        <h4 style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)', marginBottom: 10 }}>Monthly Activity</h4>
                                        {userDetail.report.monthly.length === 0 ? (
                                            <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>No data yet</p>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
                                                {[...userDetail.report.monthly].reverse().slice(0, 6).map((d, i) => {
                                                    const max = Math.max(...userDetail.report.monthly.map(x => x.amount), 1);
                                                    const h = Math.max((d.amount / max) * 100, 4);
                                                    return (
                                                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                                            <span style={{ fontSize: '0.6rem', color: 'var(--admin-text-muted)' }}>PHP {d.amount}</span>
                                                            <div style={{
                                                                width: '100%', height: `${h}%`, borderRadius: 4, minHeight: 4,
                                                                background: 'linear-gradient(to top, #f59e0b, rgba(245,158,11,0.4))',
                                                            }} />
                                                            <span style={{ fontSize: '0.6rem', color: 'var(--admin-text-muted)' }}>{d.date}</span>
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
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}><Package size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />Products ({userDetail.seller_products.length})</h3>
                                        <div style={{
                                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24,
                                        }}>
                                            {userDetail.seller_products.map(p => (
                                                <div key={p.id} style={{
                                                    padding: 10, borderRadius: 10,
                                                    background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
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
                                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--admin-text-muted)', fontSize: '0.6rem' }}>N/A</div>
                                                        )}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p style={{
                                                            fontWeight: 600, fontSize: '0.78rem', marginBottom: 3,
                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                        }}>{p.title}</p>
                                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>PHP {p.price.toFixed(2)}</span>
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
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}><Receipt size={14} /> History</h3>
                                {userDetail.transactions.length === 0 ? (
                                    <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>No transactions yet</p>
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
                                                    background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
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
                                                        <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>PHP {t.amount.toFixed(2)}</p>
                                                        <p style={{ fontSize: '0.7rem', color: 'var(--admin-text-muted)' }}>
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
                            <p style={{ color: 'var(--admin-text-muted)' }}>Failed to load user details</p>
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
            {/* ===== GLOBAL RESTOCK REQUEST MODAL ===== */}
            {restockModal && (
                <>
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                        zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px',
                    }} onClick={() => setRestockModal(null)} />
                    <div style={{
                        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 401, padding: '20px', pointerEvents: 'none',
                    }}>
                        <div style={{
                            background: 'var(--admin-bg)',
                            borderRadius: 20,
                            width: '90vw', maxWidth: 520,
                            maxHeight: '88vh',
                            overflowY: 'auto',
                            padding: 32,
                            boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
                            animation: 'fadeScaleIn 0.2s ease-out',
                            pointerEvents: 'auto',
                            border: '1px solid var(--admin-border)',
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 12,
                                        background: 'rgba(245,158,11,0.15)', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <AlertTriangle size={22} style={{ color: '#f59e0b' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 2 }}>Restock Request</h2>
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>Request inventory replenishment</p>
                                    </div>
                                </div>
                                <button onClick={() => setRestockModal(null)} style={{
                                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)',
                                }}><X size={20} /></button>
                            </div>
                            <div style={{
                                padding: 16, borderRadius: 12, marginBottom: 20,
                                background: 'var(--admin-card-bg)', border: '1px solid var(--admin-border)',
                            }}>
                                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
                                    {restockModal.images && restockModal.images.length > 0 ? (
                                        <img src={restockModal.images[0]} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                                    ) : (
                                        <div style={{ width: 56, height: 56, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Package size={24} style={{ color: '#6366f1' }} />
                                        </div>
                                    )}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 2 }}>{restockModal.title}</p>
                                        <p style={{ color: 'var(--admin-text-muted)', fontSize: '0.8rem' }}>
                                            <Store size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                            {restockModal.seller_name}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <span style={{
                                            display: 'inline-block', padding: '4px 12px', borderRadius: 8,
                                            fontSize: '0.8rem', fontWeight: 700,
                                            background: restockModal.stock === 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                            color: restockModal.stock === 0 ? '#ef4444' : '#f59e0b',
                                        }}>
                                            {restockModal.stock === 0 ? 'Out of Stock' : `${restockModal.stock} left`}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Item Name</label>
                                        <input type="text" value={restockModal.title} readOnly style={{
                                            width: '100%', padding: '10px 14px', borderRadius: 10,
                                            background: 'var(--admin-hover)', border: '1px solid var(--admin-border)',
                                            color: 'var(--admin-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', cursor: 'not-allowed',
                                        }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--admin-text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Current Price</label>
                                        <input type="text" value={`PHP ${restockModal.price.toFixed(2)}`} readOnly style={{
                                            width: '100%', padding: '10px 14px', borderRadius: 10,
                                            background: 'var(--admin-hover)', border: '1px solid var(--admin-border)',
                                            color: 'var(--admin-text-muted)', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', cursor: 'not-allowed',
                                        }} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>Requested Stock Quantity *</label>
                                    <input type="number" min="1" placeholder="Enter quantity to restock"
                                        value={restockQty} onChange={e => setRestockQty(e.target.value)}
                                        style={{
                                            width: '100%', padding: '12px 14px', borderRadius: 10,
                                            background: 'var(--admin-card-bg)', border: '2px solid var(--admin-border)',
                                            color: 'var(--admin-text)', fontFamily: 'Inter, sans-serif',
                                            fontSize: '0.95rem', fontWeight: 600, transition: 'border-color 0.2s',
                                        }}
                                        onFocus={e => e.target.style.borderColor = '#f59e0b'}
                                        onBlur={e => e.target.style.borderColor = 'var(--admin-border)'}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: 6 }}>Message (Optional)</label>
                                    <textarea placeholder="Add a note about this restock request..."
                                        value={restockMessage} onChange={e => setRestockMessage(e.target.value)}
                                        rows={3} style={{
                                            width: '100%', padding: '12px 14px', borderRadius: 10,
                                            background: 'var(--admin-card-bg)', border: '2px solid var(--admin-border)',
                                            color: 'var(--admin-text)', fontFamily: 'Inter, sans-serif',
                                            fontSize: '0.9rem', resize: 'vertical', transition: 'border-color 0.2s',
                                        }}
                                        onFocus={e => e.target.style.borderColor = '#f59e0b'}
                                        onBlur={e => e.target.style.borderColor = 'var(--admin-border)'}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button onClick={handleSubmitRestock} disabled={!restockQty}
                                    style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        padding: '12px 0', borderRadius: 10, border: 'none',
                                        background: restockQty ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(245,158,11,0.2)',
                                        color: restockQty ? '#fff' : 'var(--admin-text-muted)',
                                        fontWeight: 700, fontSize: '0.9rem', fontFamily: 'Inter, sans-serif',
                                        cursor: restockQty ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
                                    }}>
                                    <Send size={16} /> Submit Restock Request
                                </button>
                                <button onClick={() => setRestockModal(null)} className="btn btn-outline"
                                    style={{ flex: 0.5, padding: '12px 0', fontSize: '0.9rem', fontWeight: 700, borderRadius: 10 }}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
