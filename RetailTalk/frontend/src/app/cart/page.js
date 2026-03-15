'use client';

import { useState, useEffect } from 'react';
import { getCart, updateCartItem, removeFromCart, clearCart, checkoutCart, getStoredUser, getMyContact, setMyContact } from '../../lib/api';

export default function CartPage() {
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checkingOut, setCheckingOut] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const [showContactModal, setShowContactModal] = useState(false);
    const [contactNumber, setContactNumber] = useState('');
    const [contactSaving, setContactSaving] = useState(false);

    useEffect(() => {
        setUser(getStoredUser());
        loadCart();
    }, []);

    const loadCart = async () => {
        setLoading(true);
        try {
            const data = await getCart();
            setCart(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateQty = async (productId, qty) => {
        try {
            await updateCartItem(productId, qty);
            await loadCart();
        } catch (err) { setError(err.message); }
    };

    const handleRemove = async (productId) => {
        try {
            await removeFromCart(productId);
            await loadCart();
        } catch (err) { setError(err.message); }
    };

    const handleClear = async () => {
        try {
            await clearCart();
            await loadCart();
            setMessage('Cart cleared');
        } catch (err) { setError(err.message); }
    };

    const handleCheckout = async () => {
        setCheckingOut(true);
        setError('');
        setMessage('');
        try {
            const result = await checkoutCart();
            setMessage(`${result.message} Total: PHP ${result.grand_total.toFixed(2)}`);
            await loadCart();
        } catch (err) {
            if (err.message && err.message.includes('contact number')) {
                setShowContactModal(true);
            } else {
                setError(err.message);
            }
        } finally {
            setCheckingOut(false);
        }
    };

    const handleSaveContact = async () => {
        if (!contactNumber.trim() || contactNumber.trim().length < 7) {
            setError('Please enter a valid contact number');
            return;
        }
        setContactSaving(true);
        try {
            await setMyContact(contactNumber.trim());
            setShowContactModal(false);
            setMessage('Contact number saved! You can now proceed to checkout.');
        } catch (err) { setError(err.message); }
        finally { setContactSaving(false); }
    };

    if (!user) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                    <h2>Please log in to view your cart</h2>
                    <a href="/login" className="btn btn-primary" style={{ marginTop: 16 }}>Login</a>
                </div>
            </div>
        );
    }

    // Group items by seller
    const sellerGroups = {};
    if (cart && cart.items) {
        cart.items.forEach(item => {
            if (!sellerGroups[item.seller_id]) {
                sellerGroups[item.seller_id] = { seller_name: item.seller_name, items: [], subtotal: 0 };
            }
            sellerGroups[item.seller_id].items.push(item);
            sellerGroups[item.seller_id].subtotal += item.subtotal;
        });
    }

    const statusColor = { background: 'rgba(0,212,170,0.1)', color: '#00d4aa', border: '1px solid rgba(0,212,170,0.3)' };
    const DELIVERY_FEE = cart?.delivery_fee_per_seller || 90;

    return (
        <div style={{ minHeight: '100vh', padding: '100px 20px 40px' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>🛒 Shopping Cart</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
                    {cart?.items?.length || 0} item{(cart?.items?.length || 0) !== 1 ? 's' : ''} from {cart?.sellers_count || 0} seller{(cart?.sellers_count || 0) !== 1 ? 's' : ''}
                </p>

                {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
                {message && <div className="alert" style={{ ...statusColor, marginBottom: 16 }}>{message}</div>}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>
                ) : !cart || cart.items.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🛒</div>
                        <h3>Your cart is empty</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Browse products and add items to your cart.</p>
                        <a href="/products" className="btn btn-primary" style={{ marginTop: 16 }}>Browse Products</a>
                    </div>
                ) : (
                    <>
                        {/* Items grouped by seller */}
                        {Object.entries(sellerGroups).map(([sellerId, group]) => (
                            <div key={sellerId} className="card" style={{ marginBottom: 16, padding: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                    <span style={{ fontWeight: 700 }}>🏪 {group.seller_name}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', padding: '3px 10px', borderRadius: 20, background: 'rgba(108,99,255,0.1)' }}>
                                        + PHP {DELIVERY_FEE.toFixed(2)} delivery
                                    </span>
                                </div>

                                {group.items.map(item => (
                                    <div key={item.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
                                        borderTop: '1px solid rgba(255,255,255,0.06)',
                                    }}>
                                        <div style={{
                                            width: 60, height: 60, borderRadius: 10, overflow: 'hidden',
                                            background: 'var(--bg-secondary)', flexShrink: 0,
                                        }}>
                                            {item.image_url ? (
                                                <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.7rem' }}>No img</div>
                                            )}
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{item.title}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--accent-secondary)', fontWeight: 700 }}>
                                                PHP {parseFloat(item.price).toFixed(2)} × {item.quantity} = PHP {item.subtotal.toFixed(2)}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button className="btn btn-outline btn-sm" onClick={() => handleUpdateQty(item.product_id, Math.max(1, item.quantity - 1))}>−</button>
                                            <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }}>{item.quantity}</span>
                                            <button className="btn btn-outline btn-sm" onClick={() => handleUpdateQty(item.product_id, item.quantity + 1)}>+</button>
                                            <button className="btn btn-sm" onClick={() => handleRemove(item.product_id)}
                                                style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', marginLeft: 8 }}>✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}

                        {/* Summary */}
                        <div className="card" style={{ padding: 24, marginTop: 8 }}>
                            <h3 style={{ marginBottom: 14, fontWeight: 700 }}>Order Summary</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem' }}>
                                <span>Products Total</span><span>PHP {cart.products_total.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem' }}>
                                <span>Delivery Fee ({cart.sellers_count} seller{cart.sellers_count !== 1 ? 's' : ''} × PHP {DELIVERY_FEE.toFixed(2)})</span>
                                <span>PHP {cart.total_delivery_fee.toFixed(2)}</span>
                            </div>
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, marginTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
                                <span>Grand Total</span>
                                <span style={{ color: 'var(--accent-secondary)' }}>PHP {cart.grand_total.toFixed(2)}</span>
                            </div>

                            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                                <button className="btn btn-outline" onClick={handleClear} style={{ flex: 1 }}>Clear Cart</button>
                                <button className="btn btn-primary" onClick={handleCheckout} disabled={checkingOut} style={{ flex: 2 }}>
                                    {checkingOut ? <span className="spinner" /> : '🛍️ Place Order'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Contact Number Modal */}
            {showContactModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
                }} onClick={() => setShowContactModal(false)}>
                    <div className="card" style={{ maxWidth: 420, width: '100%', padding: 32 }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: 8 }}>📱 Contact Number Required</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
                            Please add your contact number before placing an order.
                        </p>
                        <div className="form-group">
                            <label>Contact Number</label>
                            <input type="tel" value={contactNumber} onChange={e => setContactNumber(e.target.value)}
                                placeholder="e.g. 09171234567" />
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSaveContact} disabled={contactSaving}>
                            {contactSaving ? <span className="spinner" /> : 'Save & Continue'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
