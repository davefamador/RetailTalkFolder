'use client';

import { useState, useEffect } from 'react';
import { getMyProducts, getTransactionHistory, getStoredUser } from '../../../lib/api';

/**
 * SellerReportspage.js — Seller Insights & Reports Dashboard
 * 
 * Two sections:
 * 1. Financials — GMV, Net Revenue, AOV, Revenue Trend
 * 2. Operations/Logistics — Stock Levels, Top-Selling, Tracking, Fulfillment, Incoming Orders
 */

export default function SellerReportsPage() {
    const [products, setProducts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('financials');

    useEffect(() => {
        const stored = getStoredUser();
        if (!stored) {
            window.location.href = '/login';
            return;
        }
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [prods, txns] = await Promise.all([
                getMyProducts(),
                getTransactionHistory(),
            ]);
            setProducts(prods);
            setTransactions(txns);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ── Compute Financial Metrics ──────────────────────────
    const mySellerTxns = transactions.filter(t => t.seller_id === getStoredUser()?.id);
    const gmv = mySellerTxns.reduce((sum, t) => sum + t.amount, 0);
    const netRevenue = mySellerTxns.reduce((sum, t) => sum + t.seller_amount, 0);
    const totalCommission = mySellerTxns.reduce((sum, t) => sum + t.admin_commission, 0);
    const aov = mySellerTxns.length > 0 ? gmv / mySellerTxns.length : 0;
    const totalOrders = mySellerTxns.length;

    // ── Revenue by Day (for mini chart) ──────────────────────
    const revenueByDay = {};
    mySellerTxns.forEach(t => {
        const day = new Date(t.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
        revenueByDay[day] = (revenueByDay[day] || 0) + t.seller_amount;
    });
    const revenueDays = Object.entries(revenueByDay).slice(-7);
    const maxDayRevenue = Math.max(...revenueDays.map(([, v]) => v), 1);

    // ── Product Stock Insights ──────────────────────────────
    const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= 5);
    const outOfStockProducts = products.filter(p => p.stock === 0);
    const healthyStockProducts = products.filter(p => p.stock > 5);
    const productsWithTracking = products.filter(p => p.tracking_number);

    // ── Top-Selling Products ────────────────────────────────
    const productSalesMap = {};
    mySellerTxns.forEach(t => {
        if (!productSalesMap[t.product_id]) {
            productSalesMap[t.product_id] = { title: t.product_title, count: 0, revenue: 0 };
        }
        productSalesMap[t.product_id].count += 1;
        productSalesMap[t.product_id].revenue += t.amount;
    });
    const topSellingProducts = Object.entries(productSalesMap)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    if (loading) {
        return (
            <div className="page">
                <div className="loading-container">
                    <div className="spinner" style={{ width: 40, height: 40 }}></div>
                    <p>Loading seller insights...</p>
                </div>
            </div>
        );
    }

    const tabs = [
        { key: 'financials', label: '💰 Financials', icon: '📊' },
        { key: 'operations', label: '📦 Operations', icon: '🚚' },
    ];

    return (
        <div className="page">
            <div className="page-header">
                <h1>📈 Seller Insights & Reports</h1>
                <p>Comprehensive analytics to grow your business</p>
            </div>

            {/* Tab Navigation */}
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
                            flex: 1, minWidth: 120, padding: '12px 16px',
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
            {/* SECTION 1: FINANCIALS                                 */}
            {/* ═══════════════════════════════════════════════════════ */}
            {activeTab === 'financials' && (
                <div>
                    {/* Metric Cards Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                        <MetricCard
                            label="Gross Merchandise Value"
                            value={`PHP ${gmv.toFixed(2)}`}
                            subtitle="Total sales value including commissions"
                            color="#10b981"
                            icon="💎"
                        />
                        <MetricCard
                            label="Net Revenue (90%)"
                            value={`PHP ${netRevenue.toFixed(2)}`}
                            subtitle="Your earnings after 10% platform commission"
                            color="#6366f1"
                            icon="💵"
                        />
                        <MetricCard
                            label="Average Order Value"
                            value={`PHP ${aov.toFixed(2)}`}
                            subtitle={`Across ${totalOrders} order${totalOrders !== 1 ? 's' : ''}`}
                            color="#f59e0b"
                            icon="📊"
                        />
                        <MetricCard
                            label="Platform Commission"
                            value={`PHP ${totalCommission.toFixed(2)}`}
                            subtitle="10% of GMV retained by RetailTalk"
                            color="#ef4444"
                            icon="🏦"
                        />
                    </div>

                    {/* Revenue Trend Mini Bar Chart */}
                    <div className="card" style={{ marginBottom: 24 }}>
                        <h3 style={{ marginBottom: 16 }}>📈 Revenue Trend (Last 7 Days)</h3>
                        {revenueDays.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No revenue data yet</p>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160, padding: '0 8px' }}>
                                {revenueDays.map(([day, value]) => (
                                    <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            PHP {value.toFixed(0)}
                                        </span>
                                        <div style={{
                                            width: '100%', maxWidth: 48, borderRadius: '6px 6px 0 0',
                                            height: `${Math.max((value / maxDayRevenue) * 120, 8)}px`,
                                            background: 'linear-gradient(180deg, #6366f1, #8b5cf6)',
                                            transition: 'height 0.5s ease',
                                        }} />
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{day}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Transaction Breakdown Table */}
                    <div className="card">
                        <h3 style={{ marginBottom: 16 }}>🧾 Recent Sales</h3>
                        {mySellerTxns.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No sales yet</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                            <th style={thStyle}>Product</th>
                                            <th style={thStyle}>Amount</th>
                                            <th style={thStyle}>Your Share</th>
                                            <th style={thStyle}>Commission</th>
                                            <th style={thStyle}>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mySellerTxns.slice(0, 10).map(t => (
                                            <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={tdStyle}>{t.product_title || 'Unknown'}</td>
                                                <td style={tdStyle}>PHP {t.amount.toFixed(2)}</td>
                                                <td style={{ ...tdStyle, color: '#10b981', fontWeight: 600 }}>PHP {t.seller_amount.toFixed(2)}</td>
                                                <td style={{ ...tdStyle, color: '#ef4444' }}>PHP {t.admin_commission.toFixed(2)}</td>
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

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SECTION 2: OPERATIONS / LOGISTICS                     */}
            {/* ═══════════════════════════════════════════════════════ */}
            {activeTab === 'operations' && (
                <div>
                    {/* Stock Overview Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                        <MetricCard label="Total Products" value={products.length} color="#6366f1" icon="📦" />
                        <MetricCard label="Healthy Stock (>5)" value={healthyStockProducts.length} color="#10b981" icon="✅" />
                        <MetricCard label="Low Stock (1-5)" value={lowStockProducts.length} color="#f59e0b" icon="⚠️" />
                        <MetricCard label="Out of Stock" value={outOfStockProducts.length} color="#ef4444" icon="🚫" />
                    </div>

                    {/* Top-Selling Products */}
                    <div className="card" style={{ marginBottom: 24 }}>
                        <h3 style={{ marginBottom: 16 }}>🏆 Top-Selling Products</h3>
                        {topSellingProducts.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No sales data yet</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {topSellingProducts.map((prod, i) => {
                                    const maxCount = topSellingProducts[0]?.count || 1;
                                    return (
                                        <div key={prod.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span style={{
                                                width: 28, height: 28, borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.8rem', fontWeight: 700,
                                                background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : 'var(--border-color)',
                                                color: i < 3 ? '#fff' : 'var(--text-secondary)',
                                            }}>
                                                {i + 1}
                                            </span>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontWeight: 600, marginBottom: 4, fontSize: '0.9rem' }}>{prod.title || 'Untitled'}</p>
                                                <div style={{
                                                    height: 6, borderRadius: 3, background: 'var(--border-color)',
                                                    overflow: 'hidden',
                                                }}>
                                                    <div style={{
                                                        height: '100%', borderRadius: 3,
                                                        width: `${(prod.count / maxCount) * 100}%`,
                                                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                                        transition: 'width 0.5s ease',
                                                    }} />
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', minWidth: 80 }}>
                                                <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{prod.count} sold</p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PHP {prod.revenue.toFixed(0)}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Tracking Number Status */}
                    <div className="card" style={{ marginBottom: 24 }}>
                        <h3 style={{ marginBottom: 16 }}>🚚 Tracking Number Status</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div style={{
                                padding: 16, borderRadius: 8, textAlign: 'center',
                                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                            }}>
                                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{productsWithTracking.length}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>With Tracking</p>
                            </div>
                            <div style={{
                                padding: 16, borderRadius: 8, textAlign: 'center',
                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                            }}>
                                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{products.length - productsWithTracking.length}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Without Tracking</p>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            💡 Fulfillment Rate: <strong style={{ color: 'var(--text-primary)' }}>
                                {products.length > 0 ? ((productsWithTracking.length / products.length) * 100).toFixed(0) : 0}%
                            </strong> of products have tracking numbers assigned.
                        </p>
                    </div>

                    {/* Low Stock Alerts */}
                    {lowStockProducts.length > 0 && (
                        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
                            <h3 style={{ marginBottom: 12 }}>⚠️ Low Stock Alerts</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {lowStockProducts.map(p => (
                                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                                        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{p.title}</span>
                                        <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.85rem' }}>{p.stock} left</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Incoming Orders from Buyers */}
                    <div className="card" style={{ marginTop: 24 }}>
                        <h3 style={{ marginBottom: 16 }}>🛒 Incoming Orders</h3>
                        {mySellerTxns.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No orders received yet</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                                            <th style={thStyle}>Product</th>
                                            <th style={thStyle}>Qty</th>
                                            <th style={thStyle}>Amount</th>
                                            <th style={thStyle}>Your Share</th>
                                            <th style={thStyle}>Status</th>
                                            <th style={thStyle}>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mySellerTxns.map(t => (
                                            <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={tdStyle}>{t.product_title || 'Unknown'}</td>
                                                <td style={tdStyle}>{t.quantity || 1}</td>
                                                <td style={tdStyle}>PHP {t.amount.toFixed(2)}</td>
                                                <td style={{ ...tdStyle, color: '#10b981', fontWeight: 600 }}>PHP {t.seller_amount.toFixed(2)}</td>
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
                                                    {new Date(t.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
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


// ─── Reusable Metric Card Component ──────────────────────────────────
function MetricCard({ label, value, subtitle, color, icon }) {
    return (
        <div className="card" style={{ padding: '20px 16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{
                position: 'absolute', top: -8, right: -8,
                fontSize: '3rem', opacity: 0.08,
            }}>
                {icon}
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 6 }}>{label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</p>
            {subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{subtitle}</p>}
        </div>
    );
}

// Table styles
const thStyle = { padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 };
const tdStyle = { padding: '10px 12px' };
