'use client';

import { useState, useEffect } from 'react';
import { listProducts, getStoredUser, buyProduct } from '../../lib/api';

// Static demo products shown when DB is empty so user can see the UI
const DEMO_PRODUCTS = [
    {
        id: 'demo-1', title: 'Wireless Noise-Cancelling Headphones',
        description: 'Premium over-ear headphones with active noise cancellation, 30-hour battery life, and Hi-Res audio support. Features adaptive sound control and speak-to-chat technology.',
        price: 2499.00, stock: 15,
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'],
        is_active: true, created_at: new Date().toISOString(), seller_name: 'TechStore PH', _demo: true,
    },
    {
        id: 'demo-2', title: 'Smart Fitness Watch Pro',
        description: 'Track your health with heart rate monitoring, GPS, sleep tracking, and 7-day battery life. Water-resistant up to 50m with over 100 workout modes.',
        price: 3999.00, stock: 8,
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop'],
        is_active: true, created_at: new Date().toISOString(), seller_name: 'GadgetHub', _demo: true,
    },
    {
        id: 'demo-3', title: 'Portable Bluetooth Speaker',
        description: 'Waterproof, 360° surround sound, 20-hour playtime. Perfect for outdoor adventures. Built-in microphone for hands-free calls.',
        price: 1299.00, stock: 25,
        images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=400&fit=crop'],
        is_active: true, created_at: new Date().toISOString(), seller_name: 'AudioWorld', _demo: true,
    },
    {
        id: 'demo-4', title: 'Mechanical Gaming Keyboard',
        description: 'RGB backlit, hot-swappable switches, aluminum frame. Built for competitive gamers with N-key rollover and programmable macros.',
        price: 4599.00, stock: 12,
        images: ['https://images.unsplash.com/photo-1541140532154-b024d1b23bef?w=400&h=400&fit=crop'],
        is_active: true, created_at: new Date().toISOString(), seller_name: 'GameZone', _demo: true,
    },
    {
        id: 'demo-5', title: 'Minimalist Leather Backpack',
        description: 'Handcrafted genuine leather, padded laptop compartment, anti-theft design. Fits up to 15.6" laptops with multiple organizer pockets.',
        price: 2899.00, stock: 6,
        images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop'],
        is_active: true, created_at: new Date().toISOString(), seller_name: 'UrbanCraft', _demo: true,
    },
    {
        id: 'demo-6', title: 'Organic Coffee Beans 1kg',
        description: 'Single-origin Arabica beans from Benguet highlands. Medium roast, chocolatey notes with hints of citrus and caramel.',
        price: 599.00, stock: 50,
        images: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop'],
        is_active: true, created_at: new Date().toISOString(), seller_name: 'BeanBrew Co.', _demo: true,
    },
];


export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [usingDemo, setUsingDemo] = useState(false);

    // Modal state
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [purchased, setPurchased] = useState(false);
    const [selectedImage, setSelectedImage] = useState(0);
    const [purchaseError, setPurchaseError] = useState('');

    useEffect(() => {
        setUser(getStoredUser());
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const data = await listProducts();
            if (data.length === 0) {
                setProducts(DEMO_PRODUCTS);
                setUsingDemo(true);
            } else {
                setProducts(data);
                setUsingDemo(false);
            }
        } catch (err) {
            setProducts(DEMO_PRODUCTS);
            setUsingDemo(true);
        } finally {
            setLoading(false);
        }
    };

    const openProduct = (product) => {
        setSelectedProduct(product);
        setQuantity(1);
        setPurchased(false);
        setSelectedImage(0);
        setPurchaseError('');
    };

    const closeModal = () => {
        setSelectedProduct(null);
        setPurchased(false);
    };

    const handlePurchase = async () => {
        if (!user) {
            setPurchaseError('Please log in to purchase items.');
            return;
        }
        setPurchaseError('');

        try {
            await buyProduct(selectedProduct.id, quantity);

            // Deduct locally for immediate UI update
            setProducts(products.map(p =>
                p.id === selectedProduct.id
                    ? { ...p, stock: p.stock - quantity }
                    : p
            ));
            setSelectedProduct({ ...selectedProduct, stock: selectedProduct.stock - quantity });

            setPurchased(true);
        } catch (err) {
            alert(err.message || 'Failed to complete purchase. Check balance or stock.');
        }
    };

    if (loading) {
        return (
            <div className="page">
                <div className="loading-container">
                    <div className="spinner" style={{ width: 40, height: 40 }}></div>
                    <p>Loading products...</p>
                </div>
            </div>
        );
    }

    const totalPrice = selectedProduct ? (parseFloat(selectedProduct.price) * quantity).toFixed(2) : '0.00';

    return (
        <div className="page">
            <div className="page-header">
                <h1>Browse Products</h1>
                <p>Discover products from our marketplace</p>
            </div>

            {usingDemo && (
                <div className="alert" style={{
                    background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.3)',
                    color: 'var(--accent-primary)', marginBottom: 24,
                }}>
                    ✨ These are demo products for preview. Sign up as a seller to add real products!
                </div>
            )}

            <div className="product-grid">
                {products.filter(p => !p.stock || p.stock > 0).map((p) => {
                    const firstImage = p.images && p.images.length > 0 ? p.images[0] : null;

                    return (
                        <div
                            key={p.id}
                            onClick={() => openProduct(p)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="card product-card" style={{ height: '100%' }}>
                                {/* Product Image */}
                                <div style={{
                                    width: '100%', height: 200, borderRadius: 8, overflow: 'hidden',
                                    marginBottom: 14, background: 'var(--bg-secondary)',
                                }}>
                                    {firstImage ? (
                                        <img
                                            src={firstImage}
                                            alt={p.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: '100%', height: '100%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'var(--text-muted)', fontSize: '0.85rem',
                                        }}>No Image</div>
                                    )}
                                </div>

                                {/* Product Info */}
                                <div className="product-title">{p.title}</div>
                                <p style={{
                                    color: 'var(--text-secondary)', fontSize: '0.85rem',
                                    marginBottom: 12, lineHeight: 1.5,
                                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                }}>
                                    {p.description || 'No description available'}
                                </p>

                                <div className="product-price">PHP {parseFloat(p.price).toFixed(2)}</div>

                                <div className="product-meta">
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {p.seller_name || 'Seller'}
                                    </span>
                                    <span style={{
                                        marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 600,
                                        color: (p.stock || 0) > 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                                    }}>
                                        {(p.stock || 0) > 0 ? `${p.stock} in stock` : 'Out of stock'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ===== PRODUCT DETAIL MODAL ===== */}
            {selectedProduct && (
                <div
                    onClick={closeModal}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        background: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 24,
                        animation: 'fadeIn 0.2s ease',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'rgba(26, 26, 46, 0.85)',
                            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 20,
                            maxWidth: 720, width: '100%', maxHeight: '90vh',
                            overflow: 'auto',
                            boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                            animation: 'slideUp 0.3s ease',
                        }}
                    >
                        {/* Purchased Confirmation */}
                        {purchased ? (
                            <div style={{
                                padding: 60, textAlign: 'center',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                            }}>
                                <div style={{
                                    width: 80, height: 80, borderRadius: '50%',
                                    background: 'rgba(16,185,129,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '2.5rem',
                                    animation: 'scaleIn 0.4s ease',
                                }}>✓</div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Purchase Confirmed!</h2>
                                <p style={{ color: 'var(--text-secondary)', maxWidth: 360, lineHeight: 1.6 }}>
                                    You bought <strong>{quantity}x {selectedProduct.title}</strong> for a total of
                                    <strong style={{ color: 'var(--accent-secondary)' }}> PHP {totalPrice}</strong>.
                                </p>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                    (This is a demo — no actual purchase was made)
                                </p>
                                <button
                                    className="btn btn-primary"
                                    onClick={closeModal}
                                    style={{ marginTop: 12, padding: '12px 40px' }}
                                >
                                    Continue Shopping
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Close Button */}
                                <button
                                    onClick={closeModal}
                                    style={{
                                        position: 'absolute', top: 16, right: 16, zIndex: 10,
                                        width: 36, height: 36, borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.1)', border: 'none',
                                        color: 'var(--text-secondary)', cursor: 'pointer',
                                        fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                                    onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                                >✕</button>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', position: 'relative' }}>
                                    {/* Left — Image */}
                                    <div style={{ padding: 24 }}>
                                        <div style={{
                                            width: '100%', aspectRatio: '1', borderRadius: 14, overflow: 'hidden',
                                            background: 'rgba(0,0,0,0.3)',
                                        }}>
                                            {selectedProduct.images && selectedProduct.images.length > 0 ? (
                                                <img
                                                    src={selectedProduct.images[selectedImage] || selectedProduct.images[0]}
                                                    alt={selectedProduct.title}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <div style={{
                                                    width: '100%', height: '100%', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center',
                                                    color: 'var(--text-muted)',
                                                }}>No Image</div>
                                            )}
                                        </div>
                                        {/* Thumbnails */}
                                        {selectedProduct.images && selectedProduct.images.length > 1 && (
                                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                                {selectedProduct.images.map((img, i) => (
                                                    <div key={i} onClick={() => setSelectedImage(i)} style={{
                                                        width: 52, height: 52, borderRadius: 8, overflow: 'hidden',
                                                        cursor: 'pointer',
                                                        border: `2px solid ${i === selectedImage ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)'}`,
                                                    }}>
                                                        <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right — Details */}
                                    <div style={{ padding: '28px 24px 28px 0', display: 'flex', flexDirection: 'column' }}>
                                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8, lineHeight: 1.3 }}>
                                            {selectedProduct.title}
                                        </h2>

                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
                                            Sold by <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                {selectedProduct.seller_name || 'Seller'}
                                            </span>
                                        </p>

                                        <div style={{
                                            fontSize: '1.8rem', fontWeight: 800,
                                            color: 'var(--accent-secondary)', marginBottom: 16,
                                        }}>
                                            PHP {parseFloat(selectedProduct.price).toFixed(2)}
                                        </div>

                                        {/* Stock Badge */}
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 8, width: 'fit-content',
                                            padding: '6px 14px', borderRadius: 20, marginBottom: 16,
                                            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                                        }}>
                                            <span style={{
                                                width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-success)',
                                            }}></span>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-success)' }}>
                                                {selectedProduct.stock} in stock
                                            </span>
                                        </div>

                                        {/* Description */}
                                        <div style={{
                                            padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.08)',
                                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                                            marginBottom: 20, flex: 1,
                                        }}>
                                            <p style={{
                                                fontSize: '0.85rem', color: 'var(--text-secondary)',
                                                fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px',
                                            }}>Description</p>
                                            <p style={{
                                                color: 'rgba(240,240,245,0.85)', lineHeight: 1.7, fontSize: '0.9rem',
                                            }}>
                                                {selectedProduct.description}
                                            </p>
                                        </div>

                                        {/* Quantity & Buy */}
                                        <div style={{
                                            background: 'rgba(255,255,255,0.04)', borderRadius: 14,
                                            padding: 16,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Qty:</span>
                                                <div style={{ display: 'flex', alignItems: 'center', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                    <button
                                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                        style={{
                                                            width: 36, height: 36, border: 'none', cursor: 'pointer',
                                                            background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)',
                                                            fontSize: '1rem', fontWeight: 700,
                                                        }}
                                                    >−</button>
                                                    <span style={{
                                                        width: 44, textAlign: 'center', fontWeight: 700,
                                                        fontSize: '0.95rem', background: 'rgba(255,255,255,0.03)',
                                                        height: 36, lineHeight: '36px',
                                                    }}>
                                                        {quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))}
                                                        style={{
                                                            width: 36, height: 36, border: 'none', cursor: 'pointer',
                                                            background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)',
                                                            fontSize: '1rem', fontWeight: 700,
                                                        }}
                                                    >+</button>
                                                </div>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    max {selectedProduct.stock}
                                                </span>
                                            </div>

                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                marginBottom: 14, paddingBottom: 14,
                                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                            }}>
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total</span>
                                                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>
                                                    PHP {totalPrice}
                                                </span>
                                            </div>

                                            {purchaseError && (
                                                <div style={{
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    color: '#ef4444',
                                                    padding: '10px 14px',
                                                    borderRadius: 8,
                                                    marginBottom: 14,
                                                    fontSize: '0.85rem'
                                                }}>
                                                    {purchaseError}
                                                </div>
                                            )}

                                            {(!user || user.role !== 'seller') && (
                                                <button
                                                    className="btn btn-success"
                                                    onClick={handlePurchase}
                                                    style={{
                                                        width: '100%', padding: '14px', fontSize: '0.95rem',
                                                        fontWeight: 700, borderRadius: 12,
                                                    }}
                                                >
                                                    {!user ? 'Login to Purchase' : `Purchase — PHP ${totalPrice}`}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Inline keyframe animations */}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(30px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes scaleIn {
                    from { transform: scale(0); }
                    to { transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
