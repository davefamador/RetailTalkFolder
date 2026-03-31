'use client';

import { useState, useEffect, useRef } from 'react';
import {
    getStoredUser, logout,
    managerGetDashboard, managerGetStaff, managerRegisterStaff,
    managerGetStaffDetail, managerRemoveStaff, managerGetRestockRequests,
    managerApproveRestock, managerRejectRestock,
    managerGetProducts, managerGetTransactions,
    createProduct, uploadProductImage,
    getManagerDeliveryOrders, managerUpdateDeliveryOrderStatus,
    getManagerWalkinOrders, managerUpdateWalkinOrderStatus,
    managerRequestProductRemoval,
} from '../../../lib/api';
import {
    LayoutDashboard, Users, Package, ShoppingCart, Truck, Tag,
    CreditCard, Search, TrendingUp, LogOut, Trash2,
} from 'lucide-react';
import SearchContent from '../../components/SearchContent';
import ReportsContent from '../../components/ReportsContent';

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
function SidebarItem({ icon: Icon, label, active, onClick }) {
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
            <span style={{ width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {typeof Icon === 'string' ? Icon : <Icon size={20} strokeWidth={1.8} />}
            </span>
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


export default function ManagerDashboard() {
    const [manager, setManager] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');

    const [dashLoading, setDashLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [staff, setStaff] = useState([]);
    const [staffSearch, setStaffSearch] = useState('');
    const [restockRequests, setRestockRequests] = useState([]);
    const [restockFilter, setRestockFilter] = useState('pending_manager');
    const [message, setMessage] = useState({ type: '', text: '' });

    // Products & Transactions
    const [mgrProducts, setMgrProducts] = useState([]);
    const [mgrProductSearch, setMgrProductSearch] = useState('');
    const [mgrTransactions, setMgrTransactions] = useState([]);
    const [mgrTxnSearch, setMgrTxnSearch] = useState('');

    // Create product modal
    const [showCreateProduct, setShowCreateProduct] = useState(false);
    const [productForm, setProductForm] = useState({ title: '', description: '', price: '', stock: '' });
    const [productImages, setProductImages] = useState([]);
    const [productUploading, setProductUploading] = useState(false);
    const [productCreating, setProductCreating] = useState(false);

    // Staff registration modal
    const [showRegisterStaff, setShowRegisterStaff] = useState(false);
    const [staffForm, setStaffForm] = useState({ full_name: '', email: '', password: '', contact_number: '' });

    // Staff detail panel
    const [selectedStaffId, setSelectedStaffId] = useState(null);
    const [staffDetail, setStaffDetail] = useState(null);
    const [staffDetailLoading, setStaffDetailLoading] = useState(false);

    // Delivery orders
    const [mgrDeliveryOrders, setMgrDeliveryOrders] = useState([]);
    const [deliveryOrderLoading, setDeliveryOrderLoading] = useState(false);
    const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('all');
    const [deliverySearch, setDeliverySearch] = useState('');

    // Walk-in orders
    const [mgrWalkinOrders, setMgrWalkinOrders] = useState([]);
    const [walkinOrderLoading, setWalkinOrderLoading] = useState(false);
    const [walkinStatusFilter, setWalkinStatusFilter] = useState('all');
    const [walkinSearch, setWalkinSearch] = useState('');

    // Product removal
    const [removalLoading, setRemovalLoading] = useState(false);

    // Staff removal
    const [removeStaffLoading, setRemoveStaffLoading] = useState(false);

    // Restock approve/reject inline forms
    const [approveId, setApproveId] = useState(null);
    const [approveData, setApproveData] = useState({ approved_quantity: '', manager_notes: '' });
    const [rejectId, setRejectId] = useState(null);
    const [rejectNotes, setRejectNotes] = useState('');
    const [restockActionLoading, setRestockActionLoading] = useState(false);

    useEffect(() => {
        const stored = getStoredUser();
        if (!stored || stored.role !== 'manager') {
            window.location.href = '/login';
            return;
        }
        setManager(stored);
        setAuthChecked(true);
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        setDashLoading(true);
        try { setStats(await managerGetDashboard()); } catch (e) { console.error(e); }
        finally { setDashLoading(false); }
    };
    const loadStaff = async (search = '') => {
        try { setStaff(await managerGetStaff(search)); } catch (e) { console.error(e); }
    };
    const loadRestockRequests = async (status = 'pending_manager') => {
        try { setRestockRequests(await managerGetRestockRequests(status)); } catch (e) { console.error(e); }
    };
    const loadMgrProducts = async (search = '') => {
        try { setMgrProducts(await managerGetProducts(search)); } catch (e) { console.error(e); }
    };
    const loadMgrTransactions = async (search = '') => {
        try { setMgrTransactions(await managerGetTransactions(search)); } catch (e) { console.error(e); }
    };
    const loadMgrDeliveryOrders = async () => {
        try { setMgrDeliveryOrders(await getManagerDeliveryOrders()); } catch (e) { console.error(e); }
    };
    const handleMgrDeliveryStatusUpdate = async (txnId) => {
        setDeliveryOrderLoading(true);
        try {
            await managerUpdateDeliveryOrderStatus(txnId, 'approved');
            setMessage({ type: 'success', text: 'Order marked as ready for delivery pickup' });
            loadMgrDeliveryOrders();
            loadDashboard();
        } catch (e) { setMessage({ type: 'error', text: e.message }); }
        finally { setDeliveryOrderLoading(false); }
    };
    const loadMgrWalkinOrders = async () => {
        try { setMgrWalkinOrders(await getManagerWalkinOrders()); } catch (e) { console.error(e); }
    };
    const handleMgrWalkinStatusUpdate = async (txnId, status) => {
        setWalkinOrderLoading(true);
        try {
            await managerUpdateWalkinOrderStatus(txnId, status);
            setMessage({ type: 'success', text: `Walk-in order updated to ${status}` });
            loadMgrWalkinOrders();
            if (status === 'completed') loadDashboard();
        } catch (e) { setMessage({ type: 'error', text: e.message }); }
        finally { setWalkinOrderLoading(false); }
    };

    const handleRequestRemoval = async (productId) => {
        if (!window.confirm('Are you sure you want to request removal of this product?')) return;
        setRemovalLoading(true);
        try {
            await managerRequestProductRemoval(productId);
            setMessage({ type: 'success', text: 'Product removal request submitted successfully!' });
            loadMgrProducts(mgrProductSearch);
        } catch (e) {
            setMessage({ type: 'error', text: e.message });
        } finally {
            setRemovalLoading(false);
        }
    };

    useEffect(() => {
        if (!authChecked) return;
        if (activeTab === 'staff') loadStaff();
        if (activeTab === 'restock') loadRestockRequests(restockFilter);
        if (activeTab === 'products') loadMgrProducts();
        if (activeTab === 'transactions') loadMgrTransactions();
        if (activeTab === 'delivery_orders') loadMgrDeliveryOrders();
        if (activeTab === 'walkin_orders') loadMgrWalkinOrders();
    }, [activeTab, authChecked]);

    useEffect(() => {
        if (activeTab === 'restock' && authChecked) loadRestockRequests(restockFilter);
    }, [restockFilter]);

    const handleRegisterStaff = async () => {
        try {
            await managerRegisterStaff(staffForm);
            setMessage({ type: 'success', text: 'Staff member registered successfully!' });
            setShowRegisterStaff(false);
            setStaffForm({ full_name: '', email: '', password: '', contact_number: '' });
            loadStaff(staffSearch);
            loadDashboard();
        } catch (e) { setMessage({ type: 'error', text: e.message }); }
    };

    const handleStaffClick = async (userId) => {
        setSelectedStaffId(userId);
        setStaffDetailLoading(true);
        setStaffDetail(null);
        try {
            const detail = await managerGetStaffDetail(userId);
            setStaffDetail(detail);
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to load staff details: ' + e.message });
            setSelectedStaffId(null);
        } finally {
            setStaffDetailLoading(false);
        }
    };

    const closeStaffPanel = () => {
        setSelectedStaffId(null);
        setStaffDetail(null);
    };

    const handleRemoveStaff = async (userId, staffName) => {
        if (!window.confirm(`Are you sure you want to remove "${staffName}" from your department? They will be unassigned but their account will not be deleted.`)) return;
        setRemoveStaffLoading(true);
        try {
            await managerRemoveStaff(userId);
            setMessage({ type: 'success', text: `Staff member "${staffName}" has been removed from the department.` });
            closeStaffPanel();
            loadStaff(staffSearch);
            loadDashboard();
        } catch (e) {
            setMessage({ type: 'error', text: e.message });
        } finally {
            setRemoveStaffLoading(false);
        }
    };

    const handleApproveRestock = async (requestId) => {
        setRestockActionLoading(true);
        try {
            const payload = {};
            if (approveData.approved_quantity) payload.approved_quantity = parseInt(approveData.approved_quantity);
            if (approveData.manager_notes) payload.manager_notes = approveData.manager_notes;
            await managerApproveRestock(requestId, payload);
            setMessage({ type: 'success', text: 'Restock request approved!' });
            setApproveId(null);
            setApproveData({ approved_quantity: '', manager_notes: '' });
            loadRestockRequests(restockFilter);
        } catch (e) { setMessage({ type: 'error', text: e.message }); }
        finally { setRestockActionLoading(false); }
    };

    const handleRejectRestock = async (requestId) => {
        setRestockActionLoading(true);
        try {
            const payload = {};
            if (rejectNotes) payload.manager_notes = rejectNotes;
            await managerRejectRestock(requestId, payload);
            setMessage({ type: 'success', text: 'Restock request rejected.' });
            setRejectId(null);
            setRejectNotes('');
            loadRestockRequests(restockFilter);
        } catch (e) { setMessage({ type: 'error', text: e.message }); }
        finally { setRestockActionLoading(false); }
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (productImages.length + files.length > 5) {
            setMessage({ type: 'error', text: 'Maximum 5 images allowed' });
            return;
        }
        setProductUploading(true);
        try {
            for (const file of files) {
                const result = await uploadProductImage(file);
                setProductImages(prev => [...prev, result.url]);
            }
        } catch (err) { setMessage({ type: 'error', text: err.message }); }
        finally { setProductUploading(false); }
    };

    const handleCreateProduct = async () => {
        if (!productForm.title.trim() || !productForm.price || !productForm.stock) {
            setMessage({ type: 'error', text: 'Title, price, and stock are required' });
            return;
        }
        if (productImages.length === 0) {
            setMessage({ type: 'error', text: 'At least one product image is required' });
            return;
        }
        setProductCreating(true);
        try {
            await createProduct({
                title: productForm.title.trim(),
                description: productForm.description.trim(),
                price: parseFloat(productForm.price),
                stock: parseInt(productForm.stock),
                images: productImages,
            });
            setMessage({ type: 'success', text: 'Product created successfully!' });
            setShowCreateProduct(false);
            setProductForm({ title: '', description: '', price: '', stock: '' });
            setProductImages([]);
            loadMgrProducts(mgrProductSearch);
            loadDashboard();
        } catch (err) { setMessage({ type: 'error', text: err.message }); }
        finally { setProductCreating(false); }
    };

    const handleLogout = () => { logout(); window.location.href = '/login'; };

    if (!authChecked) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: 40, height: 40 }}></div>
            </div>
        );
    }

    const sidebarItems = [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'staff', icon: Users, label: 'Staff' },
        { id: 'restock', icon: Package, label: 'Restock' },
        { id: 'walkin_orders', icon: ShoppingCart, label: 'Walk-in Orders' },
        { id: 'delivery_orders', icon: Truck, label: 'Delivery Orders' },
        { id: 'products', icon: Tag, label: 'Products' },
        { id: 'transactions', icon: CreditCard, label: 'Transactions' },
        { id: 'divider' },
        { id: 'search', icon: Search, label: 'Search' },
        { id: 'reports', icon: TrendingUp, label: 'Reports' },
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
                    padding: '20px 16px 16px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', gap: 10,
                }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: 'var(--gradient-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.3rem', fontWeight: 800, color: '#fff',
                    }}>RT</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>RetailTalk</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Manager</div>
                    </div>
                </div>
                <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {sidebarItems.map(item =>
                        item.id === 'divider' ? (
                            <div key="divider" style={{ height: 1, background: 'var(--border-color)', margin: '8px 0' }} />
                        ) : (
                            <SidebarItem
                                key={item.id}
                                icon={item.icon}
                                label={item.label}
                                active={activeTab === item.id}
                                onClick={() => setActiveTab(item.id)}
                            />
                        )
                    )}
                </nav>

                <div style={{
                    padding: '16px 20px', borderTop: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', gap: 12,
                }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'rgba(139,92,246,0.15)', color: '#8b5cf6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.85rem',
                    }}>
                        {manager?.full_name?.charAt(0)?.toUpperCase() || 'M'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {manager?.full_name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Manager</div>
                    </div>
                    <button onClick={handleLogout} title="Logout" style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: '1.1rem',
                    }}><LogOut size={18} /></button>
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

                {/* ===== SEARCH TAB (embedded) ===== */}
                {activeTab === 'search' && <SearchContent />}

                {/* ===== REPORTS TAB (embedded) ===== */}
                {activeTab === 'reports' && <ReportsContent />}

                {/* ===== DASHBOARD TAB ===== */}
                {activeTab === 'dashboard' && dashLoading && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
                        <div className="spinner" style={{ width: 40, height: 40 }}></div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading dashboard...</p>
                    </div>
                )}
                {activeTab === 'dashboard' && !dashLoading && (
                    <div>
                        <div style={{ marginBottom: 32 }}>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 4 }}>
                                Welcome back, {manager?.full_name?.split(' ')[0]} 👋
                            </h1>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                Here's your department overview.
                            </p>
                        </div>

                        {stats ? (
                            <>
                                {/* Department name */}
                                {stats.department && (
                                    <div style={{
                                        padding: '16px 20px', borderRadius: 12, marginBottom: 24,
                                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                        display: 'flex', alignItems: 'center', gap: 12,
                                    }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 10,
                                            background: 'rgba(139,92,246,0.15)', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                                        }}>🏢</div>
                                        <div>
                                            <p style={{ fontWeight: 700, fontSize: '1.05rem' }}>{stats.department.name}</p>
                                            {stats.department.description && (
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{stats.department.description}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                    gap: 16, marginBottom: 32,
                                }}>
                                    <StatCard icon="👥" label="Total Staff" value={stats.total_staff || 0} color="#6366f1" />
                                    <StatCard icon="📦" label="Total Products" value={stats.total_products || 0} color="#0ea5e9" />
                                    <StatCard icon="💰" label="Total Revenue" value={`₱${(stats.total_revenue || 0).toFixed(2)}`} color="#f59e0b" />
                                    <StatCard icon="🔄" label="Pending Restocks" value={stats.pending_restocks || 0} color="#ef4444" />
                                </div>

                                {/* Charts */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                                    <div className="card" style={{ padding: 24 }}>
                                        <LineChart
                                            data={[...(stats.daily_sales || [])].slice(-14)}
                                            labelKey="date" valueKey="amount"
                                            title="📈 Daily Sales (14 Days)" color="#6366f1"
                                        />
                                    </div>
                                    <div className="card" style={{ padding: 24 }}>
                                        <LineChart
                                            data={stats.monthly_sales || []}
                                            labelKey="date" valueKey="amount"
                                            title="📊 Monthly Sales" color="#f59e0b"
                                        />
                                    </div>
                                </div>

                                <div className="card" style={{ padding: 24 }}>
                                    <LineChart
                                        data={stats.weekly_sales || []}
                                        labelKey="date" valueKey="amount"
                                        title="📅 Weekly Sales" color="#0ea5e9"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="loading-container"><div className="spinner" style={{ width: 40, height: 40 }}></div><p>Loading...</p></div>
                        )}
                    </div>
                )}

                {/* ===== STAFF TAB ===== */}
                {activeTab === 'staff' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Staff Management</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage your department staff</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input
                                    type="text" placeholder="Search staff..."
                                    value={staffSearch} onChange={e => setStaffSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && loadStaff(staffSearch)}
                                    style={{
                                        width: 240, padding: '10px 14px', borderRadius: 10,
                                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif',
                                    }}
                                />
                                <button className="btn btn-primary btn-sm" onClick={() => loadStaff(staffSearch)}>Search</button>
                            </div>
                        </div>

                        {/* Add Staff Button */}
                        <button
                            onClick={() => setShowRegisterStaff(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
                                padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)',
                                background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                                cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
                                fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                        >
                            👥 + Add Staff
                        </button>

                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Name</th><th>Email</th><th>Status</th><th>Joined</th><th style={{ width: 100, textAlign: 'center' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {staff.map(s => (
                                        <tr key={s.id} style={{ ...(s.is_banned ? { opacity: 0.5 } : {}), cursor: 'pointer', transition: 'background 0.15s' }}
                                            onClick={() => handleStaffClick(s.id)}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(108,99,255,0.06)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ fontWeight: 500 }}>{s.full_name}</td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{s.email}</td>
                                            <td>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                                    padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                                                    background: s.is_banned ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                                    color: s.is_banned ? '#ef4444' : '#10b981',
                                                }}>
                                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.is_banned ? '#ef4444' : '#10b981' }}></span>
                                                    {s.is_banned ? 'Banned' : 'Active'}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                {new Date(s.created_at).toLocaleDateString()}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveStaff(s.id, s.full_name); }}
                                                    disabled={removeStaffLoading}
                                                    title="Remove from department"
                                                    style={{
                                                        padding: '5px 12px', borderRadius: 8,
                                                        border: '1px solid rgba(239,68,68,0.3)',
                                                        background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                                                        cursor: removeStaffLoading ? 'not-allowed' : 'pointer',
                                                        fontWeight: 600, fontSize: '0.75rem',
                                                        fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                                                        opacity: removeStaffLoading ? 0.5 : 1,
                                                    }}
                                                    onMouseEnter={e => { if (!removeStaffLoading) e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {staff.length === 0 && <div className="empty-state" style={{ padding: 40 }}><p>No staff found</p></div>}
                        </div>

                        {/* Register Staff Modal */}
                        {showRegisterStaff && (
                            <>
                                <div style={{
                                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                                    zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }} onClick={() => setShowRegisterStaff(false)}>
                                    <div style={{
                                        background: 'var(--bg-primary)', borderRadius: 20, padding: 32,
                                        width: 480, maxWidth: '90vw', border: '1px solid var(--border-color)',
                                        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                                    }} onClick={e => e.stopPropagation()}>
                                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 20 }}>Register Staff</h2>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Full Name *</label>
                                                <input
                                                    type="text" placeholder="Enter full name"
                                                    value={staffForm.full_name} onChange={e => setStaffForm({ ...staffForm, full_name: e.target.value })}
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
                                                    value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
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
                                                    value={staffForm.password} onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
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
                                                    value={staffForm.contact_number} onChange={e => setStaffForm({ ...staffForm, contact_number: e.target.value })}
                                                    style={{
                                                        width: '100%', padding: '10px 14px', borderRadius: 10,
                                                        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                                        color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                                            <button className="btn btn-primary" onClick={handleRegisterStaff}
                                                style={{ flex: 1, padding: '12px 0', fontSize: '0.9rem', fontWeight: 700, borderRadius: 10 }}>
                                                Register Staff
                                            </button>
                                            <button className="btn btn-outline" onClick={() => setShowRegisterStaff(false)}
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

                {/* ===== WALK-IN ORDERS TAB ===== */}
                {activeTab === 'walkin_orders' && (() => {
                    const walkinColors = {
                        pending_walkin: { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', label: 'Pending' },
                        inwork: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'In Work' },
                        ready: { bg: 'rgba(139,92,246,0.1)', color: '#8b5cf6', label: 'Ready' },
                        picked_up: { bg: 'rgba(14,165,233,0.1)', color: '#0ea5e9', label: 'Picked Up' },
                        completed: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Completed' },
                    };
                    let filteredWalkin = mgrWalkinOrders;
                    if (walkinStatusFilter !== 'all') filteredWalkin = filteredWalkin.filter(o => o.status === walkinStatusFilter);
                    if (walkinSearch.trim()) {
                        const q = walkinSearch.toLowerCase();
                        filteredWalkin = filteredWalkin.filter(o =>
                            (o.product_title || '').toLowerCase().includes(q) ||
                            (o.buyer_name || '').toLowerCase().includes(q) ||
                            (o.seller_name || '').toLowerCase().includes(q)
                        );
                    }
                    const nextStatus = { pending_walkin: 'inwork', inwork: 'ready', picked_up: 'completed' };
                    const nextLabel = { pending_walkin: 'Start Working', inwork: 'Mark Ready', picked_up: 'Mark Completed' };
                    return (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Walk-in Orders</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage walk-in orders — buyer must confirm to complete</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    type="text" placeholder="Search orders..."
                                    value={walkinSearch} onChange={e => setWalkinSearch(e.target.value)}
                                    style={{
                                        width: 180, padding: '8px 12px', borderRadius: 8,
                                        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)', fontSize: '0.82rem',
                                    }}
                                />
                                <button className="btn btn-outline btn-sm" onClick={loadMgrWalkinOrders}>Refresh</button>
                            </div>
                        </div>
                        {/* Status Filter */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                            {[{ key: 'all', label: 'All' }, ...Object.entries(walkinColors).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
                                <button key={f.key} onClick={() => setWalkinStatusFilter(f.key)} style={{
                                    padding: '5px 14px', borderRadius: 8, border: '1px solid',
                                    borderColor: walkinStatusFilter === f.key ? 'var(--accent-primary)' : 'var(--border-color)',
                                    background: walkinStatusFilter === f.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                                    color: walkinStatusFilter === f.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                    fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                                }}>{f.label}</button>
                            ))}
                        </div>
                        {filteredWalkin.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                                <h3>No walk-in orders</h3>
                                <p>Walk-in orders from buyers will appear here</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: 12 }}>
                                {filteredWalkin.map(order => {
                                    const wc = walkinColors[order.status] || { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', label: order.status };
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
                                                            background: wc.bg, color: wc.color, flexShrink: 0,
                                                        }}>{wc.label}</span>
                                                    </div>
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                        Buyer: {order.buyer_name} | Staff: {order.seller_name} | Qty: {order.quantity} | PHP {order.amount.toFixed(2)}
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
                                                        disabled={walkinOrderLoading}
                                                        onClick={() => handleMgrWalkinStatusUpdate(order.id, nextStatus[order.status])}
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
                    );
                })()}

                {/* ===== DELIVERY ORDERS TAB ===== */}
                {activeTab === 'delivery_orders' && (() => {
                    const deliveryColors = {
                        pending: { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24', label: 'Pending' },
                        approved: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Ready for Pickup' },
                        ondeliver: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'On Delivery' },
                        delivered: { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Delivered' },
                        undelivered: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', label: 'Undelivered' },
                        cancelled: { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', label: 'Cancelled' },
                    };
                    let filteredDelivery = mgrDeliveryOrders;
                    if (deliveryStatusFilter !== 'all') filteredDelivery = filteredDelivery.filter(o => o.status === deliveryStatusFilter);
                    if (deliverySearch.trim()) {
                        const q = deliverySearch.toLowerCase();
                        filteredDelivery = filteredDelivery.filter(o =>
                            (o.product_title || '').toLowerCase().includes(q) ||
                            (o.buyer_name || '').toLowerCase().includes(q) ||
                            (o.seller_name || '').toLowerCase().includes(q)
                        );
                    }
                    return (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Delivery Orders</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage delivery orders — mark as ready for pickup</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    type="text" placeholder="Search orders..."
                                    value={deliverySearch} onChange={e => setDeliverySearch(e.target.value)}
                                    style={{
                                        width: 180, padding: '8px 12px', borderRadius: 8,
                                        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)', fontSize: '0.82rem',
                                    }}
                                />
                                <button className="btn btn-outline btn-sm" onClick={loadMgrDeliveryOrders}>Refresh</button>
                            </div>
                        </div>
                        {/* Status Filter */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
                            {[{ key: 'all', label: 'All' }, ...Object.entries(deliveryColors).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
                                <button key={f.key} onClick={() => setDeliveryStatusFilter(f.key)} style={{
                                    padding: '5px 14px', borderRadius: 8, border: '1px solid',
                                    borderColor: deliveryStatusFilter === f.key ? 'var(--accent-primary)' : 'var(--border-color)',
                                    background: deliveryStatusFilter === f.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                                    color: deliveryStatusFilter === f.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                    fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                                }}>{f.label}</button>
                            ))}
                        </div>
                        {filteredDelivery.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                                <h3>No delivery orders</h3>
                                <p>Delivery orders from buyers will appear here</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: 12 }}>
                                {filteredDelivery.map(order => {
                                    const sc = deliveryColors[order.status] || { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', label: order.status };
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
                                                        Buyer: {order.buyer_name} | Staff: {order.seller_name} | Qty: {order.quantity} | PHP {order.amount.toFixed(2)}
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
                                                        disabled={deliveryOrderLoading}
                                                        onClick={() => handleMgrDeliveryStatusUpdate(order.id)}
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
                    );
                })()}

                {/* ===== RESTOCK TAB ===== */}
                {activeTab === 'restock' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Restock Requests</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Review and manage restock requests from staff</p>
                            </div>
                            <span style={{
                                padding: '6px 14px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 700,
                                background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
                            }}>
                                {restockRequests.length} {restockFilter === 'pending_manager' ? 'Pending' : 'Requests'}
                            </span>
                        </div>

                        {/* Status Filter Buttons */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            {[
                                { key: 'pending_manager', label: 'Pending' },
                                { key: 'approved_manager', label: 'Approved' },
                                { key: 'rejected_manager', label: 'Rejected' },
                                { key: '', label: 'All' },
                            ].map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setRestockFilter(f.key)}
                                    style={{
                                        padding: '8px 18px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600,
                                        border: '1px solid',
                                        borderColor: restockFilter === f.key ? 'var(--accent-primary)' : 'var(--border-color)',
                                        background: restockFilter === f.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                                        color: restockFilter === f.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                        fontFamily: 'Inter, sans-serif',
                                    }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Restock Request Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {restockRequests.map(r => (
                                <div key={r.id} style={{
                                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                    borderRadius: 16, padding: 20, transition: 'all 0.2s',
                                }}>
                                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
                                        {r.product_images && r.product_images.length > 0 && (
                                            <div style={{
                                                width: 64, height: 64, borderRadius: 10, overflow: 'hidden',
                                                background: 'var(--bg-secondary)', flexShrink: 0,
                                            }}>
                                                <img src={r.product_images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={e => e.target.style.display = 'none'} />
                                            </div>
                                        )}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>{r.product_title}</h3>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                Requested by <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{r.staff_name}</span>
                                            </p>
                                        </div>
                                        <span style={{
                                            padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                                            background: r.status === 'pending_manager' ? 'rgba(251,191,36,0.15)' :
                                                r.status === 'approved_manager' ? 'rgba(16,185,129,0.1)' :
                                                r.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(148,163,184,0.1)',
                                            color: r.status === 'pending_manager' ? '#fbbf24' :
                                                r.status === 'approved_manager' ? '#10b981' :
                                                r.status === 'rejected' ? '#ef4444' : '#94a3b8',
                                            textTransform: 'capitalize',
                                        }}>
                                            {r.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div style={{
                                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10,
                                        padding: 12, borderRadius: 10, background: 'var(--bg-secondary)', marginBottom: 12,
                                    }}>
                                        <div>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 2 }}>Price</p>
                                            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-secondary)' }}>₱{(r.product_price || 0).toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 2 }}>Current Stock</p>
                                            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: r.current_stock <= 0 ? '#ef4444' : '#f59e0b' }}>{r.current_stock}</p>
                                        </div>
                                        <div>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 2 }}>Requested Qty</p>
                                            <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>{r.requested_quantity}</p>
                                        </div>
                                        {r.approved_quantity != null && r.approved_quantity > 0 && (
                                            <div>
                                                <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 2 }}>Approved Qty</p>
                                                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>{r.approved_quantity}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: 2 }}>Date</p>
                                            <p style={{ fontSize: '0.8rem', fontWeight: 500 }}>{new Date(r.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    {r.notes && (
                                        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Staff Notes</p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.notes}</p>
                                        </div>
                                    )}

                                    {r.manager_notes && (
                                        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.1)' }}>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Manager Notes</p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.manager_notes}</p>
                                        </div>
                                    )}

                                    {/* Actions for pending requests */}
                                    {r.status === 'pending_manager' && (
                                        <div>
                                            {/* Approve inline form */}
                                            {approveId === r.id ? (
                                                <div style={{
                                                    padding: 14, borderRadius: 10, background: 'rgba(16,185,129,0.05)',
                                                    border: '1px solid rgba(16,185,129,0.2)', marginBottom: 8,
                                                }}>
                                                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', marginBottom: 10 }}>Approve Request</p>
                                                    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                                                        <div style={{ flex: 1 }}>
                                                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>Approved Quantity (optional, defaults to requested)</label>
                                                            <input
                                                                type="number" placeholder={r.requested_quantity.toString()}
                                                                value={approveData.approved_quantity}
                                                                onChange={e => setApproveData({ ...approveData, approved_quantity: e.target.value })}
                                                                style={{
                                                                    width: '100%', padding: '8px 12px', borderRadius: 8,
                                                                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                                                    color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem',
                                                                }}
                                                            />
                                                        </div>
                                                        <div style={{ flex: 2 }}>
                                                            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>Manager Notes (optional)</label>
                                                            <input
                                                                type="text" placeholder="Add notes..."
                                                                value={approveData.manager_notes}
                                                                onChange={e => setApproveData({ ...approveData, manager_notes: e.target.value })}
                                                                style={{
                                                                    width: '100%', padding: '8px 12px', borderRadius: 8,
                                                                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                                                    color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem',
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button className="btn btn-success btn-sm" disabled={restockActionLoading}
                                                            onClick={() => handleApproveRestock(r.id)}
                                                            style={{ padding: '8px 20px', fontSize: '0.8rem', fontWeight: 700, borderRadius: 8 }}>
                                                            {restockActionLoading ? '...' : 'Confirm Approve'}
                                                        </button>
                                                        <button className="btn btn-outline btn-sm"
                                                            onClick={() => { setApproveId(null); setApproveData({ approved_quantity: '', manager_notes: '' }); }}
                                                            style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 8 }}>
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : rejectId === r.id ? (
                                                /* Reject inline form */
                                                <div style={{
                                                    padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.05)',
                                                    border: '1px solid rgba(239,68,68,0.2)', marginBottom: 8,
                                                }}>
                                                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', marginBottom: 10 }}>Reject Request</p>
                                                    <div style={{ marginBottom: 10 }}>
                                                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>Reason / Notes (optional)</label>
                                                        <input
                                                            type="text" placeholder="Reason for rejection..."
                                                            value={rejectNotes}
                                                            onChange={e => setRejectNotes(e.target.value)}
                                                            style={{
                                                                width: '100%', padding: '8px 12px', borderRadius: 8,
                                                                background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                                                color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem',
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button className="btn btn-danger btn-sm" disabled={restockActionLoading}
                                                            onClick={() => handleRejectRestock(r.id)}
                                                            style={{ padding: '8px 20px', fontSize: '0.8rem', fontWeight: 700, borderRadius: 8 }}>
                                                            {restockActionLoading ? '...' : 'Confirm Reject'}
                                                        </button>
                                                        <button className="btn btn-outline btn-sm"
                                                            onClick={() => { setRejectId(null); setRejectNotes(''); }}
                                                            style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: 8 }}>
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Action buttons */
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button
                                                        className="btn btn-success btn-sm"
                                                        onClick={() => { setApproveId(r.id); setRejectId(null); setApproveData({ approved_quantity: '', manager_notes: '' }); }}
                                                        style={{ padding: '8px 20px', fontSize: '0.8rem', fontWeight: 700, borderRadius: 8 }}
                                                    >
                                                        ✓ Approve
                                                    </button>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => { setRejectId(r.id); setApproveId(null); setRejectNotes(''); }}
                                                        style={{ padding: '8px 20px', fontSize: '0.8rem', fontWeight: 700, borderRadius: 8 }}
                                                    >
                                                        ✕ Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {restockRequests.length === 0 && (
                            <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
                                <p style={{ color: 'var(--text-muted)' }}>No restock requests found</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ===== PRODUCTS TAB ===== */}
                {activeTab === 'products' && (() => {
                    const staffGroups = {};
                    mgrProducts.forEach(p => {
                        const name = p.seller_name || 'Unknown';
                        if (!staffGroups[name]) staffGroups[name] = [];
                        staffGroups[name].push(p);
                    });
                    return (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Store Products</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{mgrProducts.length} product{mgrProducts.length !== 1 ? 's' : ''}</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setShowCreateProduct(true)} style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10,
                                    border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: '#10b981',
                                    cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', fontFamily: 'Inter, sans-serif',
                                }}>+ Add Product</button>
                                <input type="text" placeholder="Search products..."
                                    value={mgrProductSearch} onChange={e => setMgrProductSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && loadMgrProducts(mgrProductSearch)}
                                    style={{ width: 220, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}
                                />
                                <button className="btn btn-primary btn-sm" onClick={() => loadMgrProducts(mgrProductSearch)}>Search</button>
                            </div>
                        </div>

                        {Object.entries(staffGroups).map(([staffName, prods]) => (
                            <div key={staffName} style={{ marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                    <span style={{ fontSize: '1rem' }}>👤</span>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{staffName}</h3>
                                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600, background: 'rgba(108,99,255,0.1)', color: '#6366f1' }}>
                                        {prods.length}
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                                    {prods.map(p => (
                                        <div key={p.id} style={{
                                            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                            borderRadius: 12, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start',
                                        }}>
                                            <div style={{
                                                width: 56, height: 56, borderRadius: 10, overflow: 'hidden',
                                                background: 'var(--bg-secondary)', flexShrink: 0,
                                            }}>
                                                {p.images && p.images[0] ? (
                                                    <img src={p.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.6rem' }}>N/A</div>
                                                )}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>₱{p.price.toFixed(2)}</span>
                                                    <span style={{
                                                        fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                                                        background: p.stock > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                        color: p.stock > 0 ? '#10b981' : '#ef4444',
                                                    }}>{p.stock} stock</span>
                                                    <span style={{
                                                        fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                                                        background: p.status === 'approved' ? 'rgba(16,185,129,0.1)' : p.status === 'pending' ? 'rgba(251,191,36,0.1)' : p.status === 'pending_removal' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                                                        color: p.status === 'approved' ? '#10b981' : p.status === 'pending' ? '#fbbf24' : p.status === 'pending_removal' ? '#f59e0b' : '#ef4444',
                                                    }}>{p.status === 'pending_removal' ? 'pending removal' : p.status}</span>
                                                </div>
                                                {p.status === 'approved' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRequestRemoval(p.id); }}
                                                        disabled={removalLoading}
                                                        style={{
                                                            marginTop: 6, padding: '4px 10px', borderRadius: 6,
                                                            border: '1px solid rgba(239,68,68,0.3)',
                                                            background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                                            cursor: removalLoading ? 'not-allowed' : 'pointer',
                                                            fontWeight: 600, fontSize: '0.7rem',
                                                            fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                                                            opacity: removalLoading ? 0.6 : 1,
                                                        }}
                                                        onMouseEnter={e => { if (!removalLoading) e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                                    >
                                                        {removalLoading ? '...' : 'Request Removal'}
                                                    </button>
                                                )}
                                                {p.status === 'pending_removal' && (
                                                    <span style={{
                                                        display: 'inline-block', marginTop: 6, padding: '4px 10px', borderRadius: 6,
                                                        background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                                                        color: '#f59e0b', fontWeight: 600, fontSize: '0.7rem',
                                                    }}>
                                                        Removal Pending
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {mgrProducts.length === 0 && <div className="empty-state" style={{ padding: 40 }}><p style={{ color: 'var(--text-muted)' }}>No products found</p></div>}

                        {/* Create Product Modal */}
                        {showCreateProduct && (
                            <div style={{
                                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                                zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }} onClick={() => setShowCreateProduct(false)}>
                                <div style={{
                                    background: 'var(--bg-primary)', borderRadius: 20, padding: 32,
                                    width: 500, maxWidth: '90vw', border: '1px solid var(--border-color)',
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)', maxHeight: '90vh', overflowY: 'auto',
                                }} onClick={e => e.stopPropagation()}>
                                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 20 }}>Add Product</h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Product Name *</label>
                                            <input type="text" placeholder="Enter product name"
                                                value={productForm.title} onChange={e => setProductForm({ ...productForm, title: e.target.value })}
                                                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Description</label>
                                            <textarea placeholder="Enter description (optional)" rows={3}
                                                value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                                                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', resize: 'vertical' }}
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Price (PHP) *</label>
                                                <input type="number" placeholder="0.00" step="0.01" min="0"
                                                    value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Stock *</label>
                                                <input type="number" placeholder="0" min="1"
                                                    value={productForm.stock} onChange={e => setProductForm({ ...productForm, stock: e.target.value })}
                                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem' }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Images * (max 5)</label>
                                            <input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={productUploading || productImages.length >= 5}
                                                style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}
                                            />
                                            {productUploading && <p style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginTop: 4 }}>Uploading...</p>}
                                            {productImages.length > 0 && (
                                                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                                                    {productImages.map((url, i) => (
                                                        <div key={i} style={{ position: 'relative', width: 64, height: 64 }}>
                                                            <img src={url} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                                                            <button onClick={() => setProductImages(prev => prev.filter((_, idx) => idx !== i))}
                                                                style={{
                                                                    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                                                                    background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer',
                                                                    fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                }}>x</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                                        <button className="btn btn-primary" onClick={handleCreateProduct} disabled={productCreating}
                                            style={{ flex: 1, padding: '12px 0', fontSize: '0.9rem', fontWeight: 700, borderRadius: 10 }}>
                                            {productCreating ? 'Creating...' : 'Create Product'}
                                        </button>
                                        <button className="btn btn-outline" onClick={() => setShowCreateProduct(false)}
                                            style={{ flex: 1, padding: '12px 0', fontSize: '0.9rem', fontWeight: 700, borderRadius: 10 }}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    );
                })()}

                {/* ===== TRANSACTIONS TAB ===== */}
                {activeTab === 'transactions' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Transactions</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>All department transactions</p>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input type="text" placeholder="Search..."
                                    value={mgrTxnSearch} onChange={e => setMgrTxnSearch(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && loadMgrTransactions(mgrTxnSearch)}
                                    style={{ width: 220, padding: '10px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}
                                />
                                <button className="btn btn-primary btn-sm" onClick={() => loadMgrTransactions(mgrTxnSearch)}>Search</button>
                            </div>
                        </div>
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Buyer</th><th>Staff</th><th>Product</th><th>Qty</th><th>Amount</th><th>Type</th><th>Status</th><th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mgrTransactions.map(t => {
                                        const statusClr = {
                                            ondeliver: '#3b82f6', delivered: '#10b981', completed: '#10b981',
                                            undelivered: '#ef4444', cancelled: '#ef4444',
                                            pending_walkin: '#fbbf24', inwork: '#8b5cf6', ready: '#0ea5e9',
                                            picked_up: '#0ea5e9',
                                        };
                                        return (
                                            <tr key={t.id}>
                                                <td style={{ fontWeight: 500 }}>{t.buyer_name}</td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t.seller_name}</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{t.product_title}</td>
                                                <td>{t.quantity}</td>
                                                <td style={{ fontWeight: 600 }}>₱{t.amount.toFixed(2)}</td>
                                                <td>
                                                    <span style={{
                                                        padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600,
                                                        textTransform: 'capitalize',
                                                        background: t.purchase_type === 'walkin' ? 'rgba(251,191,36,0.1)' : 'rgba(59,130,246,0.1)',
                                                        color: t.purchase_type === 'walkin' ? '#fbbf24' : '#3b82f6',
                                                    }}>{t.purchase_type}</span>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '3px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600,
                                                        background: `${statusClr[t.status] || '#94a3b8'}15`,
                                                        color: statusClr[t.status] || '#94a3b8',
                                                    }}>{t.status.replace('_', ' ')}</span>
                                                </td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                                    {new Date(t.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {mgrTransactions.length === 0 && <div className="empty-state" style={{ padding: 40 }}><p>No transactions found</p></div>}
                        </div>
                    </div>
                )}
            </main>

            {/* ===== STAFF DETAIL SLIDE PANEL ===== */}
            {selectedStaffId && (
                <>
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                        zIndex: 300, transition: 'opacity 0.3s',
                    }} onClick={closeStaffPanel} />
                    <aside style={{
                        position: 'fixed', top: 0, right: 0, bottom: 0,
                        width: 520, maxWidth: '90vw', background: 'var(--bg-primary)',
                        borderLeft: '1px solid var(--border-color)',
                        zIndex: 301, overflowY: 'auto', padding: 32,
                        boxShadow: '-8px 0 30px rgba(0,0,0,0.3)',
                        animation: 'slideInRight 0.25s ease-out',
                    }}>
                        {staffDetailLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <div className="spinner" style={{ width: 40, height: 40 }} />
                            </div>
                        ) : staffDetail ? (
                            <>
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>
                                            {staffDetail.user.full_name}
                                        </h2>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                                            textTransform: 'capitalize',
                                            background: 'rgba(108,99,255,0.1)', color: '#6366f1',
                                        }}>{staffDetail.user.role}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <button
                                            onClick={() => handleRemoveStaff(staffDetail.user.id, staffDetail.user.full_name)}
                                            disabled={removeStaffLoading}
                                            style={{
                                                padding: '8px 16px', borderRadius: 10,
                                                border: '1px solid rgba(239,68,68,0.3)',
                                                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                                cursor: removeStaffLoading ? 'not-allowed' : 'pointer',
                                                fontWeight: 700, fontSize: '0.8rem',
                                                fontFamily: 'Inter, sans-serif', transition: 'all 0.2s',
                                                opacity: removeStaffLoading ? 0.5 : 1,
                                                display: 'flex', alignItems: 'center', gap: 6,
                                            }}
                                            onMouseEnter={e => { if (!removeStaffLoading) e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
                                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                        >
                                            <Trash2 size={16} /> {removeStaffLoading ? 'Removing...' : 'Remove Staff'}
                                        </button>
                                        <button onClick={closeStaffPanel} style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: 'var(--text-muted)', fontSize: '1.3rem',
                                        }}>✕</button>
                                    </div>
                                </div>

                                {/* Staff Details */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24,
                                    padding: 16, borderRadius: 12, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                }}>
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Email</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{staffDetail.user.email}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Contact</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{staffDetail.user.contact_number || '—'}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Joined</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>{new Date(staffDetail.user.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Status</p>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                                            background: staffDetail.user.is_banned ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                                            color: staffDetail.user.is_banned ? '#ef4444' : '#10b981',
                                        }}>
                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: staffDetail.user.is_banned ? '#ef4444' : '#10b981' }} />
                                            {staffDetail.user.is_banned ? 'Banned' : 'Active'}
                                        </span>
                                    </div>
                                    <div>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 4 }}>Total Transactions</p>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>{staffDetail.report?.total_transactions || 0}</p>
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
                                        {!staffDetail.report?.daily || staffDetail.report.daily.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No data yet</p>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100 }}>
                                                {[...staffDetail.report.daily].reverse().slice(0, 14).map((d, i) => {
                                                    const max = Math.max(...staffDetail.report.daily.map(x => x.amount), 1);
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
                                        {!staffDetail.report?.monthly || staffDetail.report.monthly.length === 0 ? (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No data yet</p>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
                                                {[...staffDetail.report.monthly].reverse().slice(0, 6).map((d, i) => {
                                                    const max = Math.max(...staffDetail.report.monthly.map(x => x.amount), 1);
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

                                {/* Staff Products */}
                                {staffDetail.products && staffDetail.products.length > 0 && (
                                    <>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>📦 Products ({staffDetail.products.length})</h3>
                                        <div style={{
                                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24,
                                        }}>
                                            {staffDetail.products.map(p => (
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
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>₱{(p.price || 0).toFixed(2)}</span>
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
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>🧾 Recent Transactions</h3>
                                {!staffDetail.transactions || staffDetail.transactions.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>No transactions yet</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {staffDetail.transactions.slice(0, 20).map(t => {
                                            const statusClr = {
                                                pending: '#fbbf24', approved: '#6366f1', ondeliver: '#3b82f6',
                                                delivered: '#10b981', undelivered: '#ef4444', disapproved: '#ef4444',
                                                completed: '#10b981', cancelled: '#ef4444',
                                            };
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
                                                                background: `${statusClr[t.status] || '#94a3b8'}15`,
                                                                color: statusClr[t.status] || '#94a3b8',
                                                                fontWeight: 600,
                                                            }}>{t.status}</span>
                                                            {t.purchase_type && (
                                                                <span style={{
                                                                    padding: '2px 8px', borderRadius: 10,
                                                                    background: 'rgba(148,163,184,0.1)',
                                                                    color: '#94a3b8', fontWeight: 600,
                                                                    textTransform: 'capitalize',
                                                                }}>{t.purchase_type}</span>
                                                            )}
                                                            {t.quantity && (
                                                                <span style={{ color: 'var(--text-muted)' }}>x{t.quantity}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>₱{(t.amount || 0).toFixed(2)}</p>
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
                            <p style={{ color: 'var(--text-muted)' }}>Failed to load staff details</p>
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
