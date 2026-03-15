'use client';

import { useState, useEffect } from 'react';
import {
    getStoredUser, getAvailableOrders, getActiveDeliveries, pickOrder,
    updateDeliveryStatus, getDeliveryEarnings, getDeliveryHistory,
    deliveryWithdraw, getMyContact, setMyContact
} from '../../lib/api';

const STATUS_COLORS = {
    ondeliver: { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
    delivered: { bg: 'rgba(0,212,170,0.12)', color: '#00d4aa' },
    undelivered: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
    cancelled: { bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
};

export default function DeliveryPage() {
    const [user, setUser] = useState(null);
    const [tab, setTab] = useState('main');
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

    useEffect(() => {
        const u = getStoredUser();
        setUser(u);
        if (u && u.role === 'delivery') loadAll();
        else setLoading(false);
    }, []);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [avail, act, earn, hist] = await Promise.all([
                getAvailableOrders(), getActiveDeliveries(), getDeliveryEarnings(), getDeliveryHistory()
            ]);
            setAvailable(avail); setActive(act); setEarnings(earn); setHistory(hist);
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

    // Little bar chart component
    const BarChart = ({ data, label, valueKey = 'amount' }) => {
        if (!data || data.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data yet</p>;
        const maxVal = Math.max(...data.map(d => d[valueKey] || 0), 1);
        return (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, padding: '10px 0' }}>
                {data.slice(0, 14).reverse().map((d, i) => {
                    const h = Math.max(((d[valueKey] || 0) / maxVal) * 100, 4);
                    return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                                {valueKey === 'amount' ? `₱${d[valueKey]}` : d[valueKey]}
                            </span>
                            <div style={{
                                width: '100%', height: `${h}%`, borderRadius: 4, minHeight: 4,
                                background: 'linear-gradient(to top, var(--accent-primary), rgba(108,99,255,0.4))',
                            }} />
                            <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: 40 }}>
                                {d.date?.slice(-5)}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const tabBtn = (t, label) => (
        <button onClick={() => setTab(t)} style={{
            padding: '10px 20px', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer',
            borderRadius: '10px 10px 0 0',
            background: tab === t ? 'rgba(108,99,255,0.2)' : 'transparent',
            color: tab === t ? 'var(--accent-primary)' : 'var(--text-muted)',
            borderBottom: tab === t ? '2px solid var(--accent-primary)' : '2px solid transparent',
        }}>{label}</button>
    );

    return (
        <div style={{ minHeight: '100vh', padding: '100px 20px 40px' }}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>🚚 Delivery Dashboard</h1>
                {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}
                {msg && <div className="alert" style={{ background: 'rgba(0,212,170,0.1)', color: '#00d4aa', border: '1px solid rgba(0,212,170,0.3)', marginBottom: 12 }}>{msg}</div>}

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                    {tabBtn('main', '📦 Main')}
                    {tabBtn('transactions', '💰 Transactions')}
                    {tabBtn('history', '📋 History')}
                </div>

                {loading ? <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div> : (
                    <>
                        {/* ===== MAIN TAB ===== */}
                        {tab === 'main' && (
                            <div>
                                {/* Active Deliveries */}
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>
                                    🟢 Active Deliveries ({active.length}/5)
                                </h2>
                                {active.length === 0 ? (
                                    <div className="card" style={{ padding: 24, textAlign: 'center', marginBottom: 24, color: 'var(--text-muted)' }}>
                                        No active deliveries
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
                                        {active.map(o => (
                                            <div key={o.transaction_id} className="card" style={{ padding: 16 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                    <span style={{ fontWeight: 700 }}>{o.product_title}</span>
                                                    <span style={{ ...STATUS_COLORS.ondeliver, padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700 }}>
                                                        On Deliver
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                                                    Buyer: {o.buyer_name} • Seller: {o.seller_name} • Fee: PHP {o.delivery_fee.toFixed(2)}
                                                </div>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button className="btn btn-sm" onClick={() => handleStatus(o.transaction_id, 'delivered')}
                                                        style={{ background: 'rgba(0,212,170,0.15)', color: '#00d4aa', border: 'none' }}>✓ Delivered</button>
                                                    <button className="btn btn-sm" onClick={() => handleStatus(o.transaction_id, 'undelivered')}
                                                        style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none' }}>✗ Undelivered</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Available Orders */}
                                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>
                                    📦 Available for Pickup ({available.length})
                                </h2>
                                {available.length === 0 ? (
                                    <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No orders available for pickup
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gap: 12 }}>
                                        {available.map(o => (
                                            <div key={o.transaction_id} className="card" style={{ padding: 16 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                    <span style={{ fontWeight: 700 }}>{o.product_title}</span>
                                                    <span style={{ ...STATUS_COLORS.approved, padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700 }}>
                                                        Approved
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                                                    Buyer: {o.buyer_name} • Seller: {o.seller_name} • Qty: {o.quantity} • Fee: PHP {o.delivery_fee.toFixed(2)}
                                                </div>
                                                <button className="btn btn-primary btn-sm" onClick={() => handlePick(o.transaction_id)}
                                                    disabled={active.length >= 5}>
                                                    {active.length >= 5 ? 'Max deliveries reached' : '🚚 Pick Up'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ===== TRANSACTIONS TAB ===== */}
                        {tab === 'transactions' && earnings && (
                            <div>
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
                                <div className="card" style={{ padding: 20, marginBottom: 24 }}>
                                    <h3 style={{ marginBottom: 12, fontWeight: 700 }}>💳 Withdraw Earnings</h3>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <input type="number" placeholder="Amount" value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)} style={{ flex: 1 }} />
                                        <button className="btn btn-primary" onClick={handleWithdraw}>Withdraw</button>
                                    </div>
                                </div>

                                {/* Graph period toggle */}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                    {['daily', 'weekly', 'monthly'].map(p => (
                                        <button key={p} onClick={() => setGraphPeriod(p)} className="btn btn-sm" style={{
                                            background: graphPeriod === p ? 'rgba(108,99,255,0.2)' : 'transparent',
                                            color: graphPeriod === p ? 'var(--accent-primary)' : 'var(--text-muted)',
                                            border: graphPeriod === p ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.1)',
                                        }}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>
                                    ))}
                                </div>

                                {/* Earnings graph */}
                                <div className="card" style={{ padding: 20, marginBottom: 16 }}>
                                    <h4 style={{ marginBottom: 10, fontWeight: 700 }}>💰 Earnings ({graphPeriod})</h4>
                                    <BarChart data={earnings[graphPeriod]} valueKey="amount" />
                                </div>

                                {/* Delivery count graph */}
                                <div className="card" style={{ padding: 20 }}>
                                    <h4 style={{ marginBottom: 10, fontWeight: 700 }}>📊 Deliveries Count ({graphPeriod})</h4>
                                    <BarChart data={earnings[`${graphPeriod}_delivery_count`]} valueKey="count" />
                                </div>
                            </div>
                        )}

                        {/* ===== HISTORY TAB ===== */}
                        {tab === 'history' && (
                            <div>
                                {history.length === 0 ? (
                                    <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No delivery history yet
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gap: 12 }}>
                                        {history.map(h => (
                                            <div key={h.transaction_id} className="card" style={{ padding: 16 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                    <span style={{ fontWeight: 700 }}>{h.product_title}</span>
                                                    <span style={{
                                                        ...(STATUS_COLORS[h.status] || {}),
                                                        padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 700,
                                                    }}>
                                                        {h.status}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    <div>💰 Price: PHP {h.product_price.toFixed(2)} • Fee: PHP {h.delivery_fee.toFixed(2)}</div>
                                                    <div>🏪 Seller: {h.seller_name}</div>
                                                    <div>🛒 Buyer: {h.buyer_name} • 📱 {h.buyer_contact}</div>
                                                    <div style={{ fontSize: '0.75rem', marginTop: 4 }}>{new Date(h.created_at).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Contact Modal */}
            {contactModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                    onClick={() => setContactModal(false)}>
                    <div className="card" style={{ maxWidth: 400, width: '100%', padding: 32 }} onClick={e => e.stopPropagation()}>
                        <h3>📱 Add Contact Number</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 16 }}>Required before accepting deliveries.</p>
                        <input type="tel" placeholder="e.g. 09171234567" value={contactNum} onChange={e => setContactNum(e.target.value)} style={{ marginBottom: 12, width: '100%' }} />
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSaveContact}>Save</button>
                    </div>
                </div>
            )}
        </div>
    );
}
