'use client';

import { useState, useEffect } from 'react';
import {
    getStoredUser, getAvailableOrders, getActiveDeliveries, pickOrder,
    updateDeliveryStatus, getDeliveryEarnings, getDeliveryHistory,
    deliveryWithdraw, getMyContact, setMyContact,
    getRestockDeliveryQueue, acceptRestockDelivery, completeRestockDelivery, getActiveRestockDeliveries,
    getRestockDeliveryHistory, logout
} from '../../lib/api';

const STATUS_COLORS = {
    approved: { bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
    ondeliver: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
    delivered: { bg: 'rgba(0,212,170,0.12)', color: '#00d4aa' },
    undelivered: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
    cancelled: { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
};

const RESTOCK_STATUS_COLORS = {
    approved_manager: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
    accepted_delivery: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
    in_transit: { bg: 'rgba(168,85,247,0.12)', color: '#a855f7' },
    delivered: { bg: 'rgba(0,212,170,0.12)', color: '#00d4aa' },
};

const RESTOCK_STATUS_LABEL = {
    approved_manager: 'Awaiting Pickup',
    accepted_delivery: 'Accepted',
    in_transit: 'In Transit',
    delivered: 'Delivered',
};

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
                    background: 'var(--accent-primary)', color: '#fff',
                    fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px',
                    borderRadius: 12, minWidth: 20, textAlign: 'center',
                }}>{badge}</span>
            )}
        </button>
    );
}

export default function DeliveryPage() {
    const [user, setUser] = useState(null);
    const [activeSection, setActiveSection] = useState('dashboard');
    const [available, setAvailable] = useState([]);
    const [active, setActive] = useState([]);
    const [earnings, setEarnings] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    const [err, setErr] = useState('');
    const [withdrawAmt, setWithdrawAmt] = useState('');
    const [contactModal, setContactModal] = useState(false);
    const [contactNum, setContactNum] = useState('');
    const [graphPeriod, setGraphPeriod] = useState('daily');
    const [restockQueue, setRestockQueue] = useState([]);
    const [restockActive, setRestockActive] = useState([]);
    const [restockHistory, setRestockHistory] = useState([]);
    const [historyFilter, setHistoryFilter] = useState('delivery');

    useEffect(() => {
        const u = getStoredUser();
        setUser(u);
        if (u && u.role === 'delivery') loadAll();
        else setLoading(false);
    }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [avail, act, earn, hist, rQueue, rActive, rHist] = await Promise.all([
                getAvailableOrders(), getActiveDeliveries(), getDeliveryEarnings(), getDeliveryHistory(),
                getRestockDeliveryQueue().catch(() => []), getActiveRestockDeliveries().catch(() => []),
                getRestockDeliveryHistory().catch(() => [])
            ]);
            setAvailable(avail); setActive(act); setEarnings(earn); setHistory(hist);
            setRestockQueue(rQueue); setRestockActive(rActive); setRestockHistory(rHist);
        } catch (e) { setErr(e.message); }
        finally { setLoading(false); }
    };

    const handlePick = async (txnId) => {
        setErr(''); setMsg('');
        try {
            const r = await pickOrder(txnId);
            setMsg(r.message); await loadAll();
        } catch (e) {
            if (e.message?.includes('contact number')) setContactModal(true);
            else setErr(e.message);
        }
    };

    const handleStatus = async (txnId, status) => {
        setErr(''); setMsg('');
        try {
            const r = await updateDeliveryStatus(txnId, status);
            setMsg(r.message); await loadAll();
        } catch (e) { setErr(e.message); }
    };

    const handleWithdraw = async () => {
        const amt = parseFloat(withdrawAmt);
        if (!amt || amt <= 0) { setErr('Enter a valid amount'); return; }
        try {
            const r = await deliveryWithdraw(amt);
            setMsg(r.message); setWithdrawAmt(''); await loadAll();
        } catch (e) { setErr(e.message); }
    };

    const handleSaveContact = async () => {
        try {
            await setMyContact(contactNum.trim());
            setContactModal(false); setMsg('Contact saved!');
        } catch (e) { setErr(e.message); }
    };

    const handleAcceptRestock = async (id) => {
        setErr(''); setMsg('');
        try {
            const r = await acceptRestockDelivery(id);
            setMsg(r.message || 'Restock delivery accepted'); await loadAll();
        } catch (e) { setErr(e.message); }
    };

    const handleCompleteRestock = async (id) => {
        setErr(''); setMsg('');
        try {
            const r = await completeRestockDelivery(id);
            setMsg(r.message || 'Restock marked as delivered'); await loadAll();
        } catch (e) { setErr(e.message); }
    };

    const handleLogout = () => { logout(); window.location.href = '/login'; };

    if (!user || user.role !== 'delivery') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <h2>Delivery Dashboard</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Please log in as a delivery user.</p>
                    <a href="/login" className="btn btn-primary" style={{ marginTop: 16 }}>Login</a>
                </div>
            </div>
        );
    }

    // Line chart component (right = newest, left = oldest)
    const LineChart = ({ data, valueKey = 'amount' }) => {
        if (!data || data.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data yet</p>;
        // Take last 14 items, reversed so index 0 = oldest (leftmost), last = newest (rightmost)
        const chartData = data.slice(0, 14).reverse();
        const maxVal = Math.max(...chartData.map(d => d[valueKey] || 0), 1);
        const svgW = 560, svgH = 140, padX = 10, padY = 20;
        const plotW = svgW - padX * 2, plotH = svgH - padY * 2;
        const points = chartData.map((d, i) => ({
            x: padX + (chartData.length > 1 ? (i / (chartData.length - 1)) * plotW : plotW / 2),
            y: padY + plotH - ((d[valueKey] || 0) / maxVal) * plotH,
            val: d[valueKey] || 0,
            date: d.date?.slice(-5) || '',
        }));
        // Build smooth SVG path
        let linePath = '';
        if (points.length === 1) {
            linePath = `M${points[0].x},${points[0].y}`;
        } else {
            linePath = `M${points[0].x},${points[0].y}`;
            for (let i = 1; i < points.length; i++) {
                const cpx = (points[i - 1].x + points[i].x) / 2;
                linePath += ` C${cpx},${points[i - 1].y} ${cpx},${points[i].y} ${points[i].x},${points[i].y}`;
            }
        }
        // Area fill path (fill under the line)
        const areaPath = linePath + ` L${points[points.length - 1].x},${padY + plotH} L${points[0].x},${padY + plotH} Z`;
        const gradId = `lineGrad_${valueKey}`;
        return (
            <div style={{ position: 'relative', width: '100%' }}>
                <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: '100%', height: 'auto' }} preserveAspectRatio="xMidYMid meet">
                    <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(108,99,255,0.35)" />
                            <stop offset="100%" stopColor="rgba(108,99,255,0.02)" />
                        </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
                        <line key={i} x1={padX} y1={padY + plotH * (1 - frac)} x2={padX + plotW} y2={padY + plotH * (1 - frac)}
                            stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    ))}
                    {/* Area fill */}
                    <path d={areaPath} fill={`url(#${gradId})`} />
                    {/* Line */}
                    <path d={linePath} fill="none" stroke="var(--accent-primary, #6c63ff)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Data points */}
                    {points.map((p, i) => (
                        <g key={i}>
                            <circle cx={p.x} cy={p.y} r="4" fill="var(--accent-primary, #6c63ff)" stroke="#1a1a2e" strokeWidth="2" />
                            {/* Value label */}
                            <text x={p.x} y={p.y - 10} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="8" fontWeight="600" fontFamily="Inter, sans-serif">
                                {valueKey === 'amount' ? `₱${p.val}` : p.val}
                            </text>
                        </g>
                    ))}
                    {/* X-axis labels */}
                    {points.map((p, i) => (
                        <text key={`lbl-${i}`} x={p.x} y={svgH - 2} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="Inter, sans-serif">
                            {p.date}
                        </text>
                    ))}
                </svg>
            </div>
        );
    };

    // Render product image helper
    const renderProductImage = (images) => {
        const img = images && images.length > 0 ? images[0] : null;
        if (!img) return null;
        return (
            <div style={{
                width: 64, height: 64, borderRadius: 10, overflow: 'hidden',
                background: 'var(--bg-secondary)', flexShrink: 0,
            }}>
                <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => e.target.style.display = 'none'} />
            </div>
        );
    };

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
                    <SidebarItem icon="🚚" label="Delivery" active={activeSection === 'delivery'} onClick={() => setActiveSection('delivery')} badge={active.length + available.length + restockActive.length + restockQueue.length} />

                    <div style={{ height: 1, background: 'var(--border-color)', margin: '8px 0' }} />

                    <SidebarItem icon="💰" label="Transactions" active={activeSection === 'transactions'} onClick={() => setActiveSection('transactions')} />
                </nav>

                <div style={{
                    padding: '16px 20px', borderTop: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', gap: 12,
                }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'rgba(59,130,246,0.15)', color: '#3b82f6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.85rem',
                    }}>
                        {user?.full_name?.charAt(0)?.toUpperCase() || 'D'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.full_name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Delivery</div>
                    </div>
                    <button onClick={handleLogout} title="Logout" style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: '1.1rem',
                    }}>🚪</button>
                </div>
            </aside>

            {/* ===== MAIN CONTENT ===== */}
            <main style={{ marginLeft: 260, flex: 1, padding: '32px 40px', maxWidth: 1200 }}>
                {err && (
                    <div className="alert alert-error" style={{ marginBottom: 16 }}>
                        {err}
                        <button onClick={() => setErr('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}>✕</button>
                    </div>
                )}
                {msg && (
                    <div className="alert alert-success" style={{ marginBottom: 16 }}>
                        {msg}
                        <button onClick={() => setMsg('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}>✕</button>
                    </div>
                )}

                {loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
                        <div className="spinner" style={{ width: 40, height: 40 }}></div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading data...</p>
                    </div>
                )}

                {/* ===== DASHBOARD ===== */}
                {activeSection === 'dashboard' && !loading && (
                    <div>
                        <div style={{ marginBottom: 24 }}>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Dashboard</h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Overview of your delivery activity</p>
                        </div>

                        {/* Summary cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
                            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Active Deliveries</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>{active.length}/5</div>
                            </div>
                            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Available Orders</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>{available.length}</div>
                            </div>
                            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Earnings</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>PHP {earnings?.total_earnings?.toFixed(2) || '0.00'}</div>
                            </div>
                            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Wallet Balance</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>PHP {earnings?.wallet_balance?.toFixed(2) || '0.00'}</div>
                            </div>
                        </div>

                        {/* Total Deliveries */}
                        <div className="card" style={{ padding: 20, marginBottom: 24, textAlign: 'center' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Deliveries Completed</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{earnings?.total_deliveries || 0}</div>
                        </div>

                        {/* Restock summary */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Active Restock</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a855f7' }}>{restockActive.length}</div>
                            </div>
                            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Restock Queue</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>{restockQueue.length}</div>
                            </div>
                        </div>

                        {/* Report Section — Earnings & Delivery Count Graphs */}
                        {earnings && (
                            <>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: 28, marginBottom: 12 }}>Delivery Report</h2>
                                {/* Graph period toggle */}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                    {['daily', 'weekly', 'monthly'].map(p => (
                                        <button key={p} onClick={() => setGraphPeriod(p)} style={{
                                            padding: '8px 18px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600,
                                            border: '1px solid',
                                            borderColor: graphPeriod === p ? 'var(--accent-primary)' : 'var(--border-color)',
                                            background: graphPeriod === p ? 'rgba(99,102,241,0.15)' : 'transparent',
                                            color: graphPeriod === p ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                            cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                                        }}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>
                                    ))}
                                </div>

                                {/* Earnings graph */}
                                <div className="card" style={{ padding: 20, marginBottom: 16 }}>
                                    <h4 style={{ marginBottom: 10, fontWeight: 700 }}>Earnings ({graphPeriod})</h4>
                                    <LineChart data={earnings[graphPeriod]} valueKey="amount" />
                                </div>

                                {/* Delivery count graph */}
                                <div className="card" style={{ padding: 20 }}>
                                    <h4 style={{ marginBottom: 10, fontWeight: 700 }}>Deliveries Count ({graphPeriod})</h4>
                                    <LineChart data={earnings[`${graphPeriod}_delivery_count`]} valueKey="count" />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ===== DELIVERY ===== */}
                {activeSection === 'delivery' && !loading && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Delivery</h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Manage your product and restock deliveries</p>
                            </div>
                            <button className="btn btn-outline btn-sm" onClick={loadAll}>Refresh</button>
                        </div>

                        {/* Filter buttons */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            {[
                                { key: 'delivery', label: 'Product Delivery' },
                                { key: 'restock', label: 'Restock Delivery' },
                                { key: 'history', label: 'History' },
                            ].map(f => (
                                <button key={f.key} onClick={() => setHistoryFilter(f.key)} style={{
                                    padding: '8px 18px', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600,
                                    border: '1px solid',
                                    borderColor: historyFilter === f.key ? 'var(--accent-primary)' : 'var(--border-color)',
                                    background: historyFilter === f.key ? 'rgba(99,102,241,0.15)' : 'transparent',
                                    color: historyFilter === f.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                                }}>{f.label}</button>
                            ))}
                        </div>

                        {/* === Product Delivery === */}
                        {historyFilter === 'delivery' && (
                            <div>
                                {/* Active Deliveries */}
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>
                                    Active Deliveries ({active.length}/5)
                                </h2>
                                {active.length === 0 ? (
                                    <div className="card" style={{ padding: 24, textAlign: 'center', marginBottom: 24, color: 'var(--text-muted)' }}>No active deliveries</div>
                                ) : (
                                    <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
                                        {active.map(o => (
                                            <div key={o.transaction_id} className="card" style={{ padding: 20 }}>
                                                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                                                    {renderProductImage(o.product_images)}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{o.product_title}</h4>
                                                            <span style={{ ...STATUS_COLORS.ondeliver, padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>On Deliver</span>
                                                        </div>
                                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                            Buyer: {o.buyer_name} | Seller: {o.seller_name} | Fee: PHP {o.delivery_fee.toFixed(2)}
                                                        </p>
                                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                                            📞 {o.buyer_contact || 'N/A'}
                                                        </p>
                                                        <p style={{ fontSize: '0.8rem', color: o.delivery_address ? 'var(--accent-primary)' : 'var(--text-muted)', marginTop: 4, fontWeight: o.delivery_address ? 600 : 400 }}>
                                                            📍 {o.delivery_address || 'No address set'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button className="btn btn-sm" onClick={() => handleStatus(o.transaction_id, 'delivered')}
                                                        style={{ background: 'rgba(0,212,170,0.15)', color: '#00d4aa', border: 'none', fontWeight: 600 }}>Delivered</button>
                                                    <button className="btn btn-sm" onClick={() => handleStatus(o.transaction_id, 'undelivered')}
                                                        style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', fontWeight: 600 }}>Undelivered</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Available Orders */}
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>
                                    Available for Pickup ({available.length})
                                </h2>
                                {available.length === 0 ? (
                                    <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No orders available for pickup</div>
                                ) : (
                                    <div style={{ display: 'grid', gap: 12 }}>
                                        {available.map(o => (
                                            <div key={o.transaction_id} className="card" style={{ padding: 20 }}>
                                                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                                                    {renderProductImage(o.product_images)}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{o.product_title}</h4>
                                                            <span style={{ ...STATUS_COLORS.approved, padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>Approved</span>
                                                        </div>
                                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                            Buyer: {o.buyer_name} | Seller: {o.seller_name} | Qty: {o.quantity} | Fee: PHP {o.delivery_fee.toFixed(2)}
                                                        </p>
                                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                                            📞 {o.buyer_contact || 'N/A'}
                                                        </p>
                                                        <p style={{ fontSize: '0.8rem', color: o.delivery_address ? 'var(--accent-primary)' : 'var(--text-muted)', marginTop: 4, fontWeight: o.delivery_address ? 600 : 400 }}>
                                                            📍 {o.delivery_address || 'No address set'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button className="btn btn-primary btn-sm" onClick={() => handlePick(o.transaction_id)}
                                                    disabled={active.length >= 5} style={{ fontWeight: 600 }}>
                                                    {active.length >= 5 ? 'Max deliveries reached' : 'Pick Up'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* === Restock Delivery === */}
                        {historyFilter === 'restock' && (
                            <div>
                                {/* Active Restock Deliveries */}
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>
                                    Active Restock Deliveries ({restockActive.length})
                                </h2>
                                {restockActive.length === 0 ? (
                                    <div className="card" style={{ padding: 24, textAlign: 'center', marginBottom: 24, color: 'var(--text-muted)' }}>No active restock deliveries</div>
                                ) : (
                                    <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
                                        {restockActive.map(r => (
                                            <div key={r.id} className="card" style={{ padding: 20 }}>
                                                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                                                    {renderProductImage(r.product_images)}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{r.product_title || 'Product'}</h4>
                                                            <span style={{
                                                                ...(RESTOCK_STATUS_COLORS[r.status] || {}),
                                                                padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
                                                            }}>{RESTOCK_STATUS_LABEL[r.status] || r.status}</span>
                                                        </div>
                                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                            Dept: {r.department_name || 'N/A'} | By: {r.staff_name || 'Staff'} | Qty: {r.quantity || r.approved_quantity || r.requested_quantity}
                                                        </p>
                                                        {r.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>Note: {r.notes}</p>}
                                                    </div>
                                                </div>
                                                <button className="btn btn-sm" onClick={() => handleCompleteRestock(r.id)}
                                                    style={{ background: 'rgba(0,212,170,0.15)', color: '#00d4aa', border: 'none', fontWeight: 600 }}>
                                                    Mark Delivered
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Available Restock Queue */}
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>
                                    Available Restock Requests ({restockQueue.length})
                                </h2>
                                {restockQueue.length === 0 ? (
                                    <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No restock requests available</div>
                                ) : (
                                    <div style={{ display: 'grid', gap: 12 }}>
                                        {restockQueue.map(r => (
                                            <div key={r.id} className="card" style={{ padding: 20 }}>
                                                <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                                                    {renderProductImage(r.product_images)}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{r.product_title || 'Product'}</h4>
                                                            <span style={{
                                                                ...RESTOCK_STATUS_COLORS.approved_manager,
                                                                padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
                                                            }}>Approved</span>
                                                        </div>
                                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                            Dept: {r.department_name || 'N/A'} | By: {r.staff_name || 'Staff'} | Qty: {r.quantity || r.approved_quantity || r.requested_quantity}
                                                        </p>
                                                        {r.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>Note: {r.notes}</p>}
                                                        {r.manager_notes && <p style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginTop: 4 }}>Manager: {r.manager_notes}</p>}
                                                    </div>
                                                </div>
                                                <button className="btn btn-primary btn-sm" onClick={() => handleAcceptRestock(r.id)} style={{ fontWeight: 600 }}>
                                                    Accept Restock
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* === History === */}
                        {historyFilter === 'history' && (
                            <div>
                                {/* Sub-filter for delivery vs restock history */}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                    {[{ key: 'delivery', label: 'Product Delivery' }, { key: 'restock', label: 'Restock' }].map(f => (
                                        <button key={f.key} onClick={() => setHistoryFilter('history_' + f.key)} className="btn btn-sm" style={{
                                            background: historyFilter === 'history_' + f.key ? 'rgba(108,99,255,0.2)' : 'rgba(255,255,255,0.05)',
                                            color: historyFilter === 'history_' + f.key ? 'var(--accent-primary)' : 'var(--text-muted)',
                                            border: historyFilter === 'history_' + f.key ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                            fontWeight: 600,
                                        }}>{f.label}</button>
                                    ))}
                                </div>

                                {/* Show product delivery history by default */}
                                {history.length === 0 && restockHistory.length === 0 ? (
                                    <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No history yet</div>
                                ) : (
                                    <div style={{ display: 'grid', gap: 12 }}>
                                        {history.map(h => (
                                            <div key={h.transaction_id} className="card" style={{ padding: 20 }}>
                                                <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                                                    {renderProductImage(h.product_images)}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{h.product_title}</h4>
                                                            <span style={{
                                                                ...(STATUS_COLORS[h.status] || {}),
                                                                padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
                                                            }}>{h.status}</span>
                                                        </div>
                                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                            Fee: PHP {h.delivery_fee.toFixed(2)} | Seller: {h.seller_name}
                                                        </p>
                                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                            Buyer: {h.buyer_name} | Contact: {h.buyer_contact}
                                                        </p>
                                                        <p style={{ fontSize: '0.8rem', color: h.delivery_address ? 'var(--accent-primary)' : 'var(--text-muted)', marginTop: 4, fontWeight: h.delivery_address ? 600 : 400 }}>
                                                            📍 {h.delivery_address || 'No address set'}
                                                        </p>
                                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                                            {new Date(h.created_at).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {historyFilter === 'history_delivery' && (
                            history.length === 0 ? (
                                <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No delivery history yet</div>
                            ) : (
                                <div style={{ display: 'grid', gap: 12 }}>
                                    {history.map(h => (
                                        <div key={h.transaction_id} className="card" style={{ padding: 20 }}>
                                            <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                                                {renderProductImage(h.product_images)}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{h.product_title}</h4>
                                                        <span style={{
                                                            ...(STATUS_COLORS[h.status] || {}),
                                                            padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
                                                        }}>{h.status}</span>
                                                    </div>
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                        Fee: PHP {h.delivery_fee.toFixed(2)} | Seller: {h.seller_name}
                                                    </p>
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                        Buyer: {h.buyer_name} | Contact: {h.buyer_contact}
                                                    </p>
                                                    <p style={{ fontSize: '0.8rem', color: h.delivery_address ? 'var(--accent-primary)' : 'var(--text-muted)', marginTop: 4, fontWeight: h.delivery_address ? 600 : 400 }}>
                                                        📍 {h.delivery_address || 'No address set'}
                                                    </p>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{new Date(h.created_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {historyFilter === 'history_restock' && (
                            restockHistory.length === 0 ? (
                                <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No restock history yet</div>
                            ) : (
                                <div style={{ display: 'grid', gap: 12 }}>
                                    {restockHistory.map(r => (
                                        <div key={r.id} className="card" style={{ padding: 20 }}>
                                            <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                                                {renderProductImage(r.product_images)}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{r.product_title || 'Product'}</h4>
                                                        <span style={{
                                                            ...(RESTOCK_STATUS_COLORS[r.status] || {}),
                                                            padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, flexShrink: 0,
                                                        }}>{RESTOCK_STATUS_LABEL[r.status] || r.status}</span>
                                                    </div>
                                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                        Dept: {r.department_name} | By: {r.staff_name} | Qty: {r.quantity}
                                                    </p>
                                                    {r.notes && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>Note: {r.notes}</p>}
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                                        {r.delivered_at ? new Date(r.delivered_at).toLocaleString() : new Date(r.created_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                )}

                {/* ===== TRANSACTIONS ===== */}
                {activeSection === 'transactions' && !loading && earnings && (
                    <div>
                        <div style={{ marginBottom: 24 }}>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Transactions</h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Your delivery earnings and wallet</p>
                        </div>

                        {/* Summary cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
                            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Earnings</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>PHP {earnings.total_earnings.toFixed(2)}</div>
                            </div>
                            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Deliveries</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{earnings.total_deliveries}</div>
                            </div>
                            <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Wallet Balance</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>PHP {earnings.wallet_balance.toFixed(2)}</div>
                            </div>
                        </div>

                        {/* Withdraw */}
                        <div className="card" style={{ padding: 20 }}>
                            <h3 style={{ marginBottom: 12, fontWeight: 700 }}>Withdraw Earnings</h3>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <input type="number" placeholder="Amount" value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)} style={{ flex: 1 }} />
                                <button className="btn btn-primary" onClick={handleWithdraw}>Withdraw</button>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            {/* Contact Modal */}
            {contactModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                    onClick={() => setContactModal(false)}>
                    <div className="card" style={{ maxWidth: 400, width: '100%', padding: 32 }} onClick={e => e.stopPropagation()}>
                        <h3>Add Contact Number</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 16 }}>Required before accepting deliveries.</p>
                        <input type="tel" placeholder="e.g. 09171234567" value={contactNum} onChange={e => setContactNum(e.target.value)} style={{ marginBottom: 12, width: '100%' }} />
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSaveContact}>Save</button>
                    </div>
                </div>
            )}
        </div>
    );
}
