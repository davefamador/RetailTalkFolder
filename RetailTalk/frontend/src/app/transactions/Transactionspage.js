'use client';

import { getTransactionHistory, getBalance, getStoredUser } from '../../lib/api';
import { useState, useEffect } from 'react';

/**
 * Transactionspage.js — Order History & Spending Dashboard
 */

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState([]);
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [spendingPeriod, setSpendingPeriod] = useState('daily');
    const [orderTypeFilter, setOrderTypeFilter] = useState('all');
    const [orderStatusFilter, setOrderStatusFilter] = useState('all');
    const [orderSearch, setOrderSearch] = useState('');

    useEffect(() => {
        const stored = getStoredUser();
        if (!stored) { window.location.href = '/login'; return; }
        setAuthChecked(true);
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [txns, bal] = await Promise.all([
                getTransactionHistory(), getBalance(),
            ]);
            setTransactions(txns);
            setBalance(bal.balance);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const user = getStoredUser();
    const myBuyerTxns = transactions.filter(t => t.buyer_id === user?.id);
    const totalSpent = myBuyerTxns.reduce((sum, t) => sum + t.amount, 0);
    const now = new Date();
    const thisMonthTxns = myBuyerTxns.filter(t => {
        const d = new Date(t.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisMonthSpent = thisMonthTxns.reduce((sum, t) => sum + t.amount, 0);

    const statusMap = {
        pending: { label: 'Pending', color: '#fbbf24' },
        approved: { label: 'Approved', color: '#8b5cf6' },
        ondeliver: { label: 'On Deliver', color: '#3b82f6' },
        delivered: { label: 'Delivered', color: '#10b981' },
        undelivered: { label: 'Undelivered', color: '#ef4444' },
        cancelled: { label: 'Cancelled', color: '#94a3b8' },
    };

    // ── Spending by period (for bar charts) ────────────────
    const getSpendingData = (period) => {
        const data = {};
        myBuyerTxns.forEach(t => {
            const d = new Date(t.created_at);
            let key;
            if (period === 'daily') {
                key = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
            } else if (period === 'weekly') {
                const oneJan = new Date(d.getFullYear(), 0, 1);
                const week = Math.ceil(((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
                key = `W${week} ${d.getFullYear()}`;
            } else {
                key = d.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
            }
            data[key] = (data[key] || 0) + t.amount;
        });

        const maxEntries = period === 'daily' ? 14 : period === 'weekly' ? 8 : 6;
        return Object.entries(data).slice(-maxEntries);
    };

    const spendingData = getSpendingData(spendingPeriod);
    const maxSpend = Math.max(...spendingData.map(([, v]) => v), 1);

    if (!authChecked || loading) {
        return (
            <div className="page">
                <div className="loading-container">
                    <div className="spinner" style={{ width: 40, height: 40 }}></div>
                    <p>Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1>📋 Order History</h1>
                <p>Your spending reports & purchase history</p>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                <MetricCard label="Wallet Balance" value={`₱${balance !== null ? parseFloat(balance).toFixed(2) : '0.00'}`} color="#10b981" icon="💰" />
                <MetricCard label="Total Spent" value={`₱${totalSpent.toFixed(2)}`} color="#ef4444" icon="🛒" />
                <MetricCard label="This Month" value={`₱${thisMonthSpent.toFixed(2)}`} color="#f59e0b" icon="📅" />
                <MetricCard label="Orders" value={myBuyerTxns.length} color="#6366f1" icon="📦" />
            </div>

            {/* Spending Breakdown — Bar Charts by Day/Week/Month */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ margin: 0 }}>📊 Spending Breakdown</h3>
                    <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary)', borderRadius: 8, padding: 3 }}>
                        {['daily', 'weekly', 'monthly'].map(p => (
                            <button key={p} onClick={() => setSpendingPeriod(p)} style={{
                                padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s',
                                background: spendingPeriod === p ? 'var(--accent-primary)' : 'transparent',
                                color: spendingPeriod === p ? '#fff' : 'var(--text-muted)',
                                textTransform: 'capitalize',
                            }}>{p}</button>
                        ))}
                    </div>
                </div>

                {spendingData.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No spending data yet</p>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 180, padding: '0 4px' }}>
                        {spendingData.map(([label, value]) => {
                            const h = Math.max((value / maxSpend) * 150, 6);
                            return (
                                <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                        ₱{value.toFixed(0)}
                                    </span>
                                    <div style={{
                                        width: '100%', maxWidth: 40, height: h, borderRadius: '5px 5px 0 0',
                                        background: 'linear-gradient(180deg, #6366f1, #8b5cf6)',
                                        transition: 'height 0.4s ease',
                                    }} />
                                    <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Order History */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                    <h3 style={{ margin: 0 }}>🛍️ Order History</h3>
                    <input
                        type="text" placeholder="Search orders..."
                        value={orderSearch} onChange={e => setOrderSearch(e.target.value)}
                        style={{
                            width: 180, padding: '8px 12px', borderRadius: 8,
                            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)', fontSize: '0.82rem',
                        }}
                    />
                </div>
                {/* Status Filter */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginRight: 2 }}>Status:</span>
                    <select
                        value={orderStatusFilter}
                        onChange={e => setOrderStatusFilter(e.target.value)}
                        style={{
                            padding: '5px 10px', borderRadius: 8,
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                            fontSize: '0.75rem', cursor: 'pointer',
                        }}
                    >
                        <option value="all">All</option>
                        {Object.entries(statusMap)
                            .map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                </div>
                {(() => {
                    let filtered = myBuyerTxns;
                    if (orderStatusFilter !== 'all') filtered = filtered.filter(t => t.status === orderStatusFilter);
                    if (orderSearch.trim()) {
                        const q = orderSearch.toLowerCase();
                        filtered = filtered.filter(t =>
                            (t.product_title || '').toLowerCase().includes(q) ||
                            (t.seller_name || '').toLowerCase().includes(q)
                        );
                    }
                    return filtered.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No orders found</p>
                    ) : (
                        <div style={{ display: 'grid', gap: 10, maxHeight: 400, overflowY: 'auto', paddingRight: 6 }}>
                            {filtered.map(t => {
                                const productImage = t.product_images && t.product_images.length > 0 ? t.product_images[0] : null;
                                const sInfo = statusMap[t.status] || { label: t.status, color: '#94a3b8' };
                                return (
                                    <div key={t.id} style={{
                                        display: 'flex', gap: 12, padding: 12, borderRadius: 10,
                                        border: '1px solid var(--border-color)', alignItems: 'center',
                                    }}>
                                        <div style={{
                                            width: 48, height: 48, borderRadius: 8, overflow: 'hidden',
                                            background: 'var(--bg-secondary)', flexShrink: 0,
                                        }}>
                                            {productImage ? (
                                                <img src={productImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={e => e.target.style.display = 'none'} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '1rem' }}>📦</div>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {t.product_title || 'Product'}
                                            </p>
                                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                {t.seller_name || 'Store'} • Qty: {t.quantity || 1} • {new Date(t.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                            </p>
                                            {t.delivery_user_name && (
                                                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    🚚 {t.delivery_user_name}
                                                </p>
                                            )}
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>₱{t.amount.toFixed(2)}</p>
                                            {t.delivery_fee > 0 && (
                                                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 1 }}>+₱{t.delivery_fee.toFixed(2)} delivery</p>
                                            )}
                                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 2 }}>
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: 10, fontSize: '0.6rem', fontWeight: 600,
                                                    background: `${sInfo.color}20`, color: sInfo.color,
                                                }}>{sInfo.label}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}


// ─── Reusable Components ──────────────────────────────────────────────
function MetricCard({ label, value, color, icon }) {
    return (
        <div className="card" style={{ padding: '20px 16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -8, right: -8, fontSize: '3rem', opacity: 0.08 }}>{icon}</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 6 }}>{label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</p>
        </div>
    );
}
