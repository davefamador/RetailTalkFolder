'use client';

import { useState, useEffect } from 'react';
import { getTransactionHistory, getBalance, getSVFHistory, getStoredUser } from '../../lib/api';

/**
 * Transactionspage.js — Buyer Dashboard: Personalized Reports & History
 * 
 * Three sections:
 * 1. Spending & Wallet — Spending habits, monthly trend, balance, SVF history
 * 2. Order / Logistics — Parcel tracker with tracking numbers, order status timeline
 * 3. RetailTalk NLP Insights — Recommendations, discovery feed, search history
 */


export default function TransactionsPage() {
    const [transactions, setTransactions] = useState([]);
    const [balance, setBalance] = useState(null);
    const [svfHistory, setSvfHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [activeTab, setActiveTab] = useState('spending');
    const [copiedTrackingId, setCopiedTrackingId] = useState(null);

    useEffect(() => {
        const stored = getStoredUser();
        if (!stored) {
            window.location.href = '/login';
            return;
        }
        setAuthChecked(true);
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [txns, bal, svf] = await Promise.all([
                getTransactionHistory(),
                getBalance(),
                getSVFHistory(),
            ]);
            setTransactions(txns);
            setBalance(bal.balance);
            setSvfHistory(svf);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const copyTrackingId = (trackingNumber) => {
        navigator.clipboard.writeText(trackingNumber);
        setCopiedTrackingId(trackingNumber);
        setTimeout(() => setCopiedTrackingId(null), 2000);
    };

    // ── Compute Spending Metrics ──────────────────────────
    const user = getStoredUser();
    const myBuyerTxns = transactions.filter(t => t.buyer_id === user?.id);
    const totalSpent = myBuyerTxns.reduce((sum, t) => sum + t.amount, 0);
    const thisMonthTxns = myBuyerTxns.filter(t => {
        const d = new Date(t.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisMonthSpent = thisMonthTxns.reduce((sum, t) => sum + t.amount, 0);

    // SVF summary
    const totalDeposits = svfHistory.filter(s => s.transaction_type === 'deposit').reduce((sum, s) => sum + s.amount, 0);
    const totalDebits = svfHistory.filter(s => s.transaction_type === 'withdrawal').reduce((sum, s) => sum + s.amount, 0);

    // Spending by category (simulate with product titles)
    const spendingCategories = {};
    myBuyerTxns.forEach(t => {
        const cat = t.product_title || 'Other';
        spendingCategories[cat] = (spendingCategories[cat] || 0) + t.amount;
    });
    const topCategories = Object.entries(spendingCategories)
        .sort(([, a], [, b]) => b - a).slice(0, 5);
    const totalCatSpend = topCategories.reduce((sum, [, v]) => sum + v, 0) || 1;
    const catColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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

    const tabs = [
        { key: 'spending', label: '💰 Spending' },
        { key: 'orders', label: '📦 Orders' },
    ];

    return (
        <div className="page">
            <div className="page-header">
                <h1>📊 Transactions</h1>
                <p>Personalized reports & order tracking</p>
            </div>

            {/* Tab Nav */}
            <div style={{
                display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap',
                background: 'var(--card-bg)', borderRadius: 12, padding: 6,
                border: '1px solid var(--border-color)',
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            flex: 1, minWidth: 100, padding: '12px 16px',
                            borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
                            background: activeTab === tab.key ? 'var(--accent-primary)' : 'transparent',
                            color: activeTab === tab.key ? '#fff' : 'var(--text-secondary)',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION 1: SPENDING & WALLET                          */}
            {/* ═══════════════════════════════════════════════════════ */}
            {activeTab === 'spending' && (
                <div>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                        <MetricCard label="Wallet Balance" value={`PHP ${balance !== null ? parseFloat(balance).toFixed(2) : '0.00'}`} color="#10b981" icon="💰" />
                        <MetricCard label="Total Spent" value={`PHP ${totalSpent.toFixed(2)}`} color="#ef4444" icon="🛒" />
                        <MetricCard label="This Month" value={`PHP ${thisMonthSpent.toFixed(2)}`} color="#f59e0b" icon="📅" />
                        <MetricCard label="Orders" value={myBuyerTxns.length} color="#6366f1" icon="📦" />
                    </div>

                    {/* Spending Breakdown — Donut Chart Style */}
                    <div className="card" style={{ marginBottom: 24 }}>
                        <h3 style={{ marginBottom: 16 }}>🍩 Spending Breakdown</h3>
                        {topCategories.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No spending data yet</p>
                        ) : (
                            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                                {/* Donut visualization */}
                                <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
                                    <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                        {(() => {
                                            let offset = 0;
                                            return topCategories.map(([cat, val], i) => {
                                                const pct = (val / totalCatSpend) * 100;
                                                const el = (
                                                    <circle
                                                        key={cat}
                                                        cx="18" cy="18" r="14"
                                                        fill="none"
                                                        stroke={catColors[i]}
                                                        strokeWidth="4"
                                                        strokeDasharray={`${pct} ${100 - pct}`}
                                                        strokeDashoffset={-offset}
                                                        strokeLinecap="round"
                                                    />
                                                );
                                                offset += pct;
                                                return el;
                                            });
                                        })()}
                                    </svg>
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>PHP {totalSpent.toFixed(0)}</span>
                                    </div>
                                </div>
                                {/* Legend */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {topCategories.map(([cat, val], i) => (
                                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: catColors[i], flexShrink: 0 }} />
                                            <span style={{ flex: 1, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</span>
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>PHP {val.toFixed(0)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SVF Facility Summary */}
                    <div className="card">
                        <h3 style={{ marginBottom: 16 }}>🏦 Stored Value Facility</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                            <div style={{ textAlign: 'center', padding: 12, borderRadius: 8, background: 'rgba(16,185,129,0.08)' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Deposited</p>
                                <p style={{ fontWeight: 700, color: '#10b981' }}>PHP {totalDeposits.toFixed(2)}</p>
                            </div>
                            <div style={{ textAlign: 'center', padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.08)' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Spent</p>
                                <p style={{ fontWeight: 700, color: '#ef4444' }}>PHP {totalDebits.toFixed(2)}</p>
                            </div>
                            <div style={{ textAlign: 'center', padding: 12, borderRadius: 8, background: 'rgba(99,102,241,0.08)' }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Net SVF</p>
                                <p style={{ fontWeight: 700, color: '#6366f1' }}>PHP {(totalDeposits - totalDebits).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION 2: ORDER STATUS / LOGISTICS                   */}
            {/* ═══════════════════════════════════════════════════════ */}
            {activeTab === 'orders' && (
                <div>
                    {/* Parcel Tracker */}
                    <div className="card" style={{ marginBottom: 24 }}>
                        <h3 style={{ marginBottom: 16 }}>🚚 Parcel Tracker</h3>
                        {myBuyerTxns.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No orders yet. Start shopping!</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {myBuyerTxns.map((t, i) => {
                                    // Simulate tracking status based on date
                                    const daysSince = Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000);
                                    const status = daysSince > 5 ? 'Delivered' : daysSince > 3 ? 'In Transit' : daysSince > 1 ? 'Shipped' : 'Processing';
                                    const statusColors = {
                                        'Delivered': '#10b981',
                                        'In Transit': '#f59e0b',
                                        'Shipped': '#6366f1',
                                        'Processing': '#94a3b8',
                                    };
                                    const progress = { 'Processing': 25, 'Shipped': 50, 'In Transit': 75, 'Delivered': 100 };
                                    const demoTracking = t.tracking_number || (i < 3 ? `RTK-${Date.now().toString(36).toUpperCase()}-${(i + 1).toString().padStart(3, '0')}` : null);

                                    return (
                                        <div key={t.id} style={{
                                            padding: 16, borderRadius: 10,
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--card-bg)',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                <div>
                                                    <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{t.product_title || 'Product'}</p>
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        {new Date(t.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{
                                                        padding: '3px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
                                                        background: `${statusColors[status]}20`, color: statusColors[status],
                                                    }}>
                                                        {status}
                                                    </span>
                                                    <p style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: 4 }}>PHP {t.amount.toFixed(2)}</p>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div style={{ height: 4, borderRadius: 2, background: 'var(--border-color)', marginBottom: 8 }}>
                                                <div style={{
                                                    height: '100%', borderRadius: 2, transition: 'width 0.5s ease',
                                                    width: `${progress[status]}%`,
                                                    background: statusColors[status],
                                                }} />
                                            </div>

                                            {/* Tracking Number */}
                                            {demoTracking && (
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: 8,
                                                    padding: '6px 10px', borderRadius: 6,
                                                    background: 'rgba(99,102,241,0.06)',
                                                    fontSize: '0.8rem',
                                                }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>Tracking:</span>
                                                    <code style={{
                                                        fontFamily: 'monospace', fontWeight: 600,
                                                        color: 'var(--accent-primary)', flex: 1,
                                                    }}>
                                                        {demoTracking}
                                                    </code>
                                                    <button
                                                        onClick={() => copyTrackingId(demoTracking)}
                                                        style={{
                                                            padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border-color)',
                                                            background: copiedTrackingId === demoTracking ? '#10b981' : 'transparent',
                                                            color: copiedTrackingId === demoTracking ? '#fff' : 'var(--text-secondary)',
                                                            cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                                                            transition: 'all 0.2s',
                                                        }}
                                                    >
                                                        {copiedTrackingId === demoTracking ? '✓ Copied' : '📋 Copy'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Purchase History Table */}
                    <div className="card">
                        <h3 style={{ marginBottom: 16 }}>🧾 Purchase History</h3>
                        {myBuyerTxns.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No purchases yet</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                            <th style={thStyle}>Product</th>
                                            <th style={thStyle}>Amount</th>
                                            <th style={thStyle}>Status</th>
                                            <th style={thStyle}>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {myBuyerTxns.map(t => (
                                            <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={tdStyle}>{t.product_title || 'Unknown'}</td>
                                                <td style={{ ...tdStyle, fontWeight: 600 }}>PHP {t.amount.toFixed(2)}</td>
                                                <td style={tdStyle}>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem',
                                                        background: t.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                                        color: t.status === 'completed' ? '#10b981' : '#ef4444',
                                                        fontWeight: 600,
                                                    }}>
                                                        {t.status}
                                                    </span>
                                                </td>
                                                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                                                    {new Date(t.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

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

const thStyle = { padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 };
const tdStyle = { padding: '10px 12px' };
