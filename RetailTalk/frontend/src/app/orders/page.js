'use client';

import { getTransactionHistory, getStoredUser, buyerConfirmWalkin, cancelOrder } from '../../lib/api';
import { useState, useEffect } from 'react';
import { Package, ShoppingCart, Truck } from 'lucide-react';

export default function OrdersPage() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderFilter, setOrderFilter] = useState('all');
    const [confirming, setConfirming] = useState(false);
    const [cancelling, setCancelling] = useState(null);
    const [msg, setMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        const stored = getStoredUser();
        if (!stored) { window.location.href = '/login'; return; }
        setAuthChecked(true);
        loadData();
    }, []);

    const handleConfirmWalkin = async (txnId) => {
        setConfirming(true);
        setMsg({ type: '', text: '' });
        try {
            const res = await buyerConfirmWalkin(txnId);
            setMsg({ type: 'success', text: res.message || 'Pickup verified!' });
            await loadData();
        } catch (err) {
            setMsg({ type: 'error', text: err.message || 'Failed to verify pickup' });
        }
        finally { setConfirming(false); }
    };

    const handleCancelOrder = async (txn) => {
        const walkin = isWalkin(txn);
        const hasFee = !walkin && txn.status === 'ondeliver';
        const confirmMsg = hasFee
            ? 'Are you sure you want to cancel this order? A \u20B150 cancellation fee will be deducted from your refund.'
            : 'Are you sure you want to cancel this order? You will receive a full refund.';
        if (!window.confirm(confirmMsg)) return;
        setCancelling(txn.id);
        setMsg({ type: '', text: '' });
        try {
            const res = await cancelOrder(txn.id);
            const parts = [];
            if (res.message) parts.push(res.message);
            if (res.refund_amount != null) parts.push(`Refund: \u20B1${res.refund_amount.toFixed(2)}`);
            if (res.cancellation_fee) parts.push(`Fee: \u20B1${res.cancellation_fee.toFixed(2)}`);
            setMsg({ type: 'success', text: parts.join(' | ') || 'Order cancelled.' });
            setSelectedOrder(null);
            await loadData();
        } catch (err) {
            setMsg({ type: 'error', text: err.message || 'Failed to cancel order' });
        } finally {
            setCancelling(null);
        }
    };

    const canCancelOrder = (t) => {
        const walkin = isWalkin(t);
        if (walkin) return t.status === 'pending_walkin';
        return ['pending', 'approved', 'ondeliver'].includes(t.status);
    };

    const loadData = async () => {
        try {
            const txns = await getTransactionHistory();
            setTransactions(txns);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const user = getStoredUser();
    const myBuyerTxns = transactions.filter(t => t.buyer_id === user?.id);

    const walkinOnlyStatuses = ['pending_walkin', 'inwork', 'ready', 'picked_up'];
    const isWalkin = (t) => t.purchase_type === 'walkin' || walkinOnlyStatuses.includes(t.status);
    const walkinOrders = myBuyerTxns.filter(t => isWalkin(t));
    const deliveryOrders = myBuyerTxns.filter(t => !isWalkin(t));

    const filteredOrders = orderFilter === 'walkin' ? walkinOrders
        : orderFilter === 'delivery' ? deliveryOrders
        : myBuyerTxns;

    const statusMap = {
        pending: { label: 'Pending', color: '#fbbf24', progress: 10 },
        approved: { label: 'Approved', color: '#8b5cf6', progress: 20 },
        ondeliver: { label: 'On Deliver', color: '#3b82f6', progress: 50 },
        delivered: { label: 'Delivered', color: '#10b981', progress: 100 },
        undelivered: { label: 'Undelivered', color: '#ef4444', progress: 0 },
        cancelled: { label: 'Cancelled', color: '#94a3b8', progress: 0 },
        pending_walkin: { label: 'Pending', color: '#fbbf24', progress: 10 },
        inwork: { label: 'In Work', color: '#3b82f6', progress: 40 },
        ready: { label: 'Ready for Pickup', color: '#8b5cf6', progress: 60 },
        picked_up: { label: 'Picked Up', color: '#0ea5e9', progress: 85 },
        completed: { label: 'Completed', color: '#10b981', progress: 100 },
    };

    if (!authChecked || loading) {
        return (
            <div className="page">
                <div className="loading-container">
                    <div className="spinner" style={{ width: 40, height: 40 }}></div>
                    <p>Loading your orders...</p>
                </div>
            </div>
        );
    }

    const renderOrderCard = (t) => {
        const sInfo = statusMap[t.status] || { label: t.status, color: '#94a3b8', progress: 0 };
        const productImage = t.product_images && t.product_images.length > 0 ? t.product_images[0] : null;
        const walkin = isWalkin(t);
        const isReadyForPickup = walkin && t.status === 'ready';

        return (
            <div key={t.id} onClick={() => setSelectedOrder(t)} style={{
                display: 'flex', gap: 12, padding: 14, borderRadius: 12, cursor: 'pointer',
                border: isReadyForPickup ? '1px solid rgba(16,185,129,0.4)' : '1px solid var(--border-color)',
                background: isReadyForPickup ? 'rgba(16,185,129,0.04)' : 'var(--card-bg)',
                transition: 'border-color 0.2s, transform 0.15s',
            }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = isReadyForPickup ? 'rgba(16,185,129,0.6)' : 'var(--accent-primary)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isReadyForPickup ? 'rgba(16,185,129,0.4)' : 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
                <div style={{
                    width: 56, height: 56, borderRadius: 10, overflow: 'hidden',
                    background: 'var(--bg-secondary)', flexShrink: 0,
                }}>
                    {productImage ? (
                        <img src={productImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => e.target.style.display = 'none'} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Package size={24} /></div>
                    )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                            <p style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {t.product_title || 'Product'}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {t.seller_name || 'Seller'} • {new Date(t.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                            </p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                {/* Walk-in / Delivery type badge */}
                                <span style={{
                                    padding: '2px 8px', borderRadius: 10, fontSize: '0.68rem', fontWeight: 600,
                                    background: walkin ? 'rgba(251,191,36,0.12)' : 'rgba(59,130,246,0.12)',
                                    color: walkin ? '#f59e0b' : '#3b82f6',
                                }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{walkin ? <><ShoppingCart size={12} /> Walk-in</> : <><Truck size={12} /> Delivery</>}</span></span>
                                {/* Status badge */}
                                <span style={{
                                    padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600,
                                    background: `${sInfo.color}20`, color: sInfo.color,
                                }}>{sInfo.label}</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: 0 }}>₱{t.amount.toFixed(2)}</p>
                        </div>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: 'var(--border-color)' }}>
                        <div style={{
                            height: '100%', borderRadius: 2, width: `${sInfo.progress}%`,
                            background: sInfo.color, transition: 'width 0.5s',
                        }} />
                    </div>
                    {t.delivery_user_name && (
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Truck size={12} /> {t.delivery_user_name}
                        </p>
                    )}
                </div>

                {/* Confirm Pickup button on the right side for ready walk-in orders */}
                {isReadyForPickup && (
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <button
                            onClick={e => { e.stopPropagation(); handleConfirmWalkin(t.id); }}
                            disabled={confirming}
                            style={{
                                padding: '10px 18px', borderRadius: 10, border: 'none',
                                background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                                fontWeight: 700, fontSize: '0.8rem',
                                cursor: confirming ? 'not-allowed' : 'pointer',
                                opacity: confirming ? 0.6 : 1,
                                transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                            }}
                            onMouseEnter={e => { if (!confirming) e.currentTarget.style.transform = 'scale(1.05)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            {confirming ? 'Confirming...' : '✅ Confirm Pickup'}
                        </button>
                    </div>
                )}

                {/* Cancel Order button */}
                {canCancelOrder(t) && (
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <button
                            onClick={e => { e.stopPropagation(); handleCancelOrder(t); }}
                            disabled={cancelling === t.id}
                            style={{
                                padding: '8px 14px', borderRadius: 10, border: 'none',
                                background: (!isWalkin(t) && t.status === 'ondeliver')
                                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                    : 'linear-gradient(135deg, #ef4444, #dc2626)',
                                color: '#fff',
                                fontWeight: 700, fontSize: '0.75rem',
                                cursor: cancelling === t.id ? 'not-allowed' : 'pointer',
                                opacity: cancelling === t.id ? 0.6 : 1,
                                transition: 'all 0.2s', fontFamily: 'Inter, sans-serif',
                                whiteSpace: 'nowrap',
                                boxShadow: (!isWalkin(t) && t.status === 'ondeliver')
                                    ? '0 2px 8px rgba(245,158,11,0.3)'
                                    : '0 2px 8px rgba(239,68,68,0.3)',
                            }}
                            onMouseEnter={e => { if (cancelling !== t.id) e.currentTarget.style.transform = 'scale(1.05)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            {cancelling === t.id ? 'Cancelling...'
                                : (!isWalkin(t) && t.status === 'ondeliver') ? 'Cancel Order (\u20B150 fee)'
                                : 'Cancel Order'}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Package size={28} /> My Orders</h1>
                <p>Track your orders and verify walk-in pickups</p>
            </div>

            {msg.text && (
                <div style={{
                    padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: '0.85rem', fontWeight: 600,
                    background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    color: msg.type === 'success' ? '#10b981' : '#ef4444',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    {msg.text}
                    <button onClick={() => setMsg({ type: '', text: '' })} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700, fontSize: '1rem',
                    }}>✕</button>
                </div>
            )}

            {/* Order Type Filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[
                    { key: 'all', label: 'All', count: myBuyerTxns.length },
                    { key: 'delivery', label: 'Delivery', count: deliveryOrders.length },
                    { key: 'walkin', label: 'Walk-in', count: walkinOrders.length },
                ].map(f => (
                    <button key={f.key} onClick={() => setOrderFilter(f.key)} style={{
                        padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.2s',
                        background: orderFilter === f.key ? 'rgba(108,99,255,0.2)' : 'var(--card-bg)',
                        color: orderFilter === f.key ? 'var(--accent-primary)' : 'var(--text-muted)',
                        border: orderFilter === f.key ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    }}>{f.label} ({f.count})</button>
                ))}
            </div>

            {/* Orders needing action */}
            {walkinOrders.filter(o => o.status === 'ready').length > 0 && (
                <div style={{
                    padding: 16, borderRadius: 12, marginBottom: 16,
                    background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: '#8b5cf6', marginBottom: 8 }}>
                        Action Required — Verify Pickup
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                        These walk-in orders are ready. Verify that you picked up the product.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {walkinOrders.filter(o => o.status === 'ready').map(t => renderOrderCard(t))}
                    </div>
                </div>
            )}

            {/* Active vs History toggle */}
            {(() => {
                const activeStatuses = ['pending', 'approved', 'ondeliver', 'pending_walkin', 'inwork', 'ready', 'picked_up'];
                const historyStatuses = ['delivered', 'completed', 'cancelled', 'undelivered'];
                const activeOrders = filteredOrders.filter(t => activeStatuses.includes(t.status));
                const historyOrders = filteredOrders.filter(t => historyStatuses.includes(t.status))
                    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

                return (
                    <>
                        {/* Active Orders */}
                        <div className="card" style={{ marginBottom: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <ShoppingCart size={18} /> Active Orders
                                    <span style={{
                                        fontSize: '0.75rem', fontWeight: 700,
                                        padding: '2px 10px', borderRadius: 12,
                                        background: 'rgba(59,130,246,0.12)', color: '#3b82f6',
                                    }}>{activeOrders.length}</span>
                                </h3>
                            </div>
                            {activeOrders.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40 }}>
                                    <Package size={40} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 12 }} />
                                    <p style={{ color: 'var(--text-muted)' }}>No active orders right now</p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Start shopping to see your orders here!</p>
                                </div>
                            ) : (
                                <div style={{ maxHeight: 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 6 }}>
                                    {activeOrders.map(t => renderOrderCard(t))}
                                </div>
                            )}
                        </div>

                        {/* Purchase History */}
                        <div className="card" style={{ marginBottom: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    📋 Purchase History
                                    <span style={{
                                        fontSize: '0.75rem', fontWeight: 700,
                                        padding: '2px 10px', borderRadius: 12,
                                        background: 'rgba(16,185,129,0.12)', color: '#10b981',
                                    }}>{historyOrders.length}</span>
                                </h3>
                            </div>
                            {historyOrders.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40 }}>
                                    <Package size={40} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 12 }} />
                                    <p style={{ color: 'var(--text-muted)' }}>No purchase history yet</p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Completed and cancelled orders will appear here</p>
                                </div>
                            ) : (
                                <div style={{ maxHeight: 600, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 6 }}>
                                    {historyOrders.map(t => renderOrderCard(t))}
                                </div>
                            )}
                        </div>
                    </>
                );
            })()}

            {/* Order Detail Modal */}
            {selectedOrder && (() => {
                const sInfo = statusMap[selectedOrder.status] || { label: selectedOrder.status, color: '#94a3b8' };
                return (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
                    }} onClick={() => setSelectedOrder(null)}>
                        <div className="card" style={{ maxWidth: 480, width: '100%', padding: 32 }} onClick={e => e.stopPropagation()}>
                            <h3 style={{ marginBottom: 4 }}>Order Details</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 20 }}>
                                {new Date(selectedOrder.created_at).toLocaleString()}
                            </p>

                            {selectedOrder.product_images && selectedOrder.product_images[0] && (
                                <div style={{ width: '100%', height: 160, borderRadius: 12, overflow: 'hidden', marginBottom: 16, background: 'var(--bg-secondary)' }}>
                                    <img src={selectedOrder.product_images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            )}

                            <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Product</span>
                                    <span style={{ fontWeight: 600 }}>{selectedOrder.product_title}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Seller</span>
                                    <span style={{ fontWeight: 600 }}>{selectedOrder.seller_name || '—'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Quantity</span>
                                    <span>{selectedOrder.quantity || 1}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Amount</span>
                                    <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>₱{selectedOrder.amount.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Type</span>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
                                        textTransform: 'capitalize',
                                        background: isWalkin(selectedOrder) ? 'rgba(251,191,36,0.1)' : 'rgba(59,130,246,0.1)',
                                        color: isWalkin(selectedOrder) ? '#fbbf24' : '#3b82f6',
                                    }}>{isWalkin(selectedOrder) ? 'walk-in' : 'delivery'}</span>
                                </div>
                                {selectedOrder.delivery_fee > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Delivery Fee</span>
                                        <span>₱{selectedOrder.delivery_fee.toFixed(2)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Status</span>
                                    <span style={{
                                        padding: '3px 10px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 700,
                                        background: `${sInfo.color}20`, color: sInfo.color,
                                    }}>{sInfo.label}</span>
                                </div>
                            </div>

                            {/* Delivery Info (for delivery orders) */}
                            {!isWalkin(selectedOrder) && (
                                selectedOrder.delivery_user_name ? (
                                    <div style={{
                                        padding: 16, borderRadius: 10, background: 'rgba(59,130,246,0.08)',
                                        border: '1px solid rgba(59,130,246,0.2)', marginBottom: 16,
                                    }}>
                                        <h4 style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}><Truck size={16} /> Delivery Man Info</h4>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Name</span>
                                            <span style={{ fontWeight: 600 }}>{selectedOrder.delivery_user_name}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Contact</span>
                                            <span style={{ fontWeight: 600 }}>{selectedOrder.delivery_user_contact || 'N/A'}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: 14, borderRadius: 10, background: 'rgba(148,163,184,0.08)',
                                        textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16,
                                    }}>No delivery man assigned yet</div>
                                )
                            )}

                            {/* Walk-in: Verify Pickup button */}
                            {isWalkin(selectedOrder) && selectedOrder.status === 'ready' && (
                                <button
                                    onClick={() => { handleConfirmWalkin(selectedOrder.id); setSelectedOrder(null); }}
                                    disabled={confirming}
                                    style={{
                                        width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                                        background: '#10b981', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                                        cursor: confirming ? 'not-allowed' : 'pointer', marginBottom: 8,
                                        fontFamily: 'Inter, sans-serif',
                                    }}
                                >
                                    {confirming ? 'Confirming...' : 'Verify Pickup'}
                                </button>
                            )}

                            {/* Walk-in: Picked up info */}
                            {isWalkin(selectedOrder) && selectedOrder.status === 'picked_up' && (
                                <div style={{
                                    padding: 14, borderRadius: 10, background: 'rgba(14,165,233,0.08)',
                                    border: '1px solid rgba(14,165,233,0.2)', marginBottom: 16,
                                    textAlign: 'center', fontSize: '0.85rem', color: '#0ea5e9', fontWeight: 600,
                                }}>Pickup verified — waiting for store to complete</div>
                            )}

                            <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => setSelectedOrder(null)}>Close</button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
