'use client';

import { useState, useEffect } from 'react';
import { listProducts, getStoredUser, getStoredAdmin, buyProduct, getBuyerRecommendations, addToCart, getMyContact, setMyContact } from '../../lib/api';

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

    // Recommendations state
    const [recommendations, setRecommendations] = useState([]);
    const [recsBasedOn, setRecsBasedOn] = useState('');
    const [recsLoading, setRecsLoading] = useState(false);

    // Modal state
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [purchased, setPurchased] = useState(false);
    const [selectedImage, setSelectedImage] = useState(0);
    const [purchaseError, setPurchaseError] = useState('');
    const [cartMessage, setCartMessage] = useState({ type: '', text: '' });
    const [purchaseType, setPurchaseType] = useState('delivery');
    const [addressModal, setAddressModal] = useState(false);
    const [contactNum, setContactNum] = useState('');
    const [deliveryAddress, setDeliveryAddress] = useState('');

    useEffect(() => {
        const storedUser = getStoredUser() || getStoredAdmin();
        setUser(storedUser);
        loadProducts();
        if (storedUser) {
            loadRecommendations();
        }
    }, []);

    const loadRecommendations = async () => {
        setRecsLoading(true);
        try {
            const data = await getBuyerRecommendations();
            setRecommendations(data.recommendations || []);
            setRecsBasedOn(data.based_on || '');
        } catch (err) {
            // Silently fail — recommendations are optional
            setRecommendations([]);
        } finally {
            setRecsLoading(false);
        }
    };

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
        setCartMessage({ type: '', text: '' });
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
            await buyProduct(selectedProduct.id, quantity, purchaseType);

            // Deduct locally for immediate UI update
            setProducts(products.map(p =>
                p.id === selectedProduct.id
                    ? { ...p, stock: p.stock - quantity }
                    : p
            ));
            setSelectedProduct({ ...selectedProduct, stock: selectedProduct.stock - quantity });

            setPurchased(true);
        } catch (err) {
            const msg = err.message || '';
            if (msg.includes('delivery address') || msg.includes('contact number')) {
                // Load existing contact info and show modal
                try {
                    const c = await getMyContact();
                    setContactNum(c.contact_number || '');
                    setDeliveryAddress(c.delivery_address || '');
                } catch (_) {}
                setAddressModal(true);
            } else {
                setPurchaseError(msg || 'Failed to complete purchase. Check balance or stock.');
            }
        }
    };

    const handleSaveAddressAndBuy = async () => {
        if (!contactNum.trim()) { setPurchaseError('Contact number is required.'); return; }
        if (purchaseType === 'delivery' && !deliveryAddress.trim()) { setPurchaseError('Delivery address is required.'); return; }
        try {
            await setMyContact(contactNum.trim(), deliveryAddress.trim());
            setAddressModal(false);
            // Retry the purchase
            await buyProduct(selectedProduct.id, quantity, purchaseType);
            setProducts(products.map(p =>
                p.id === selectedProduct.id ? { ...p, stock: p.stock - quantity } : p
            ));
            setSelectedProduct({ ...selectedProduct, stock: selectedProduct.stock - quantity });
            setPurchased(true);
        } catch (err) {
            setPurchaseError(err.message || 'Failed to complete purchase.');
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

    const productTotal = selectedProduct ? (parseFloat(selectedProduct.price) * quantity) : 0;
    const deliveryFee = purchaseType === 'delivery' ? 90 : 0;
    const grandTotal = (productTotal + deliveryFee).toFixed(2);
    const totalPrice = productTotal.toFixed(2);

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

            {/* ===== RECOMMENDED FOR YOU ===== */}
            {user && recommendations.length > 0 && (
                <div style={{
                    marginBottom: 36, padding: 28, borderRadius: 18,
                    background: 'linear-gradient(135deg, rgba(108,99,255,0.08) 0%, rgba(0,212,170,0.06) 100%)',
                    border: '1px solid rgba(108,99,255,0.15)',
                }}>
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <span style={{ fontSize: '1.15rem' }}>✨</span>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                                Recommended For You
                            </h2>
                        </div>
                        <p style={{
                            color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, paddingLeft: 30,
                        }}>
                            {recsBasedOn && recsBasedOn !== 'popular'
                                ? <>Based on your search for "<span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{recsBasedOn}</span>"</>
                                : 'Popular products you might like'
                            }
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: 16,
                    }}>
                        {recommendations.map((p) => {
                            const firstImage = p.images && p.images.length > 0 ? p.images[0] : null;
                            return (
                                <div
                                    key={p.id}
                                    onClick={() => openProduct(p)}
                                    style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div style={{
                                        borderRadius: 14, overflow: 'hidden',
                                        background: 'rgba(26,26,46,0.7)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        height: '100%',
                                    }}>
                                        <div style={{
                                            width: '100%', height: 150, overflow: 'hidden',
                                            background: 'var(--bg-secondary)',
                                        }}>
                                            {firstImage ? (
                                                <img
                                                    src={firstImage} alt={p.title}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            ) : (
                                                <div style={{
                                                    width: '100%', height: '100%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'var(--text-muted)', fontSize: '0.8rem',
                                                }}>No Image</div>
                                            )}
                                        </div>
                                        <div style={{ padding: '12px 14px' }}>
                                            <div style={{
                                                fontSize: '0.88rem', fontWeight: 700,
                                                marginBottom: 6, lineHeight: 1.35,
                                                display: '-webkit-box', WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                            }}>{p.title}</div>
                                            <div style={{
                                                fontSize: '1rem', fontWeight: 800,
                                                color: 'var(--accent-secondary)',
                                            }}>
                                                PHP {parseFloat(p.price).toFixed(2)}
                                            </div>
                                            <div style={{
                                                fontSize: '0.75rem', color: 'var(--text-muted)',
                                                marginTop: 4,
                                            }}>{p.seller_name || 'Seller'}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
                                    <strong style={{ color: 'var(--accent-secondary)' }}> PHP {grandTotal}</strong>.
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
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                    {deliveryFee > 0 ? `Subtotal: PHP ${totalPrice} + PHP ${deliveryFee.toFixed(2)} delivery` : 'Total'}
                                                </span>
                                                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>
                                                    PHP {grandTotal}
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

                                            {user && user.role === 'buyer' && (
                                                <>
                                                    {/* Walk-in / Delivery selector */}
                                                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPurchaseType('delivery')}
                                                            style={{
                                                                flex: 1, padding: '10px', borderRadius: 8, border: '1px solid',
                                                                borderColor: purchaseType === 'delivery' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)',
                                                                background: purchaseType === 'delivery' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                                                                color: purchaseType === 'delivery' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                                cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                                                            }}
                                                        >
                                                            Delivery
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPurchaseType('walkin')}
                                                            style={{
                                                                flex: 1, padding: '10px', borderRadius: 8, border: '1px solid',
                                                                borderColor: purchaseType === 'walkin' ? 'var(--accent-warning)' : 'rgba(255,255,255,0.1)',
                                                                background: purchaseType === 'walkin' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                                                                color: purchaseType === 'walkin' ? 'var(--accent-warning)' : 'var(--text-secondary)',
                                                                cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                                                            }}
                                                        >
                                                            Walk-in
                                                        </button>
                                                    </div>
                                                    {purchaseType === 'delivery' && (
                                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                                                            + PHP 90.00 delivery fee per department store
                                                        </p>
                                                    )}
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button
                                                            className="btn"
                                                            onClick={async () => {
                                                                if (selectedProduct._demo) { setCartMessage({ type: 'error', text: 'This is a demo product' }); return; }
                                                                try {
                                                                    setCartMessage({ type: '', text: '' });
                                                                    await addToCart(selectedProduct.id, quantity);
                                                                    setCartMessage({ type: 'success', text: `Added ${quantity}x to cart!` });
                                                                } catch (err) {
                                                                    setCartMessage({ type: 'error', text: err.message });
                                                                }
                                                            }}
                                                            style={{
                                                                flex: 1, padding: '14px', fontSize: '0.95rem',
                                                                fontWeight: 700, borderRadius: 12,
                                                                background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.4)',
                                                                color: '#818cf8', cursor: 'pointer',
                                                            }}
                                                        >
                                                            Add to Cart
                                                        </button>
                                                        <button
                                                            className="btn btn-success"
                                                            onClick={handlePurchase}
                                                            style={{
                                                                flex: 1, padding: '14px', fontSize: '0.95rem',
                                                                fontWeight: 700, borderRadius: 12,
                                                            }}
                                                        >
                                                            Buy — PHP {grandTotal}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                            {!user && (
                                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                    Please log in to purchase items.
                                                </p>
                                            )}

                                            {cartMessage.text && (
                                                <div style={{
                                                    marginTop: 8, padding: '8px 14px', borderRadius: 8, fontSize: '0.82rem',
                                                    fontWeight: 600, textAlign: 'center',
                                                    background: cartMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                                    border: `1px solid ${cartMessage.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                                    color: cartMessage.type === 'success' ? '#10b981' : '#ef4444',
                                                }}>
                                                    {cartMessage.text}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ===== DELIVERY ADDRESS MODAL ===== */}
            {addressModal && (
                <div
                    onClick={() => setAddressModal(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1100,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 24,
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'var(--bg-primary)', borderRadius: 20, padding: 32,
                            width: 440, maxWidth: '90vw', border: '1px solid var(--border-color)',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        }}
                    >
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8 }}>📍 Delivery Address Required</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
                            Please provide your contact number and delivery address to place a delivery order.
                        </p>

                        {purchaseError && (
                            <div style={{
                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                color: '#ef4444', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: '0.85rem',
                            }}>{purchaseError}</div>
                        )}

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Contact Number *</label>
                            <input
                                type="tel" placeholder="e.g. 09171234567"
                                value={contactNum} onChange={(e) => setContactNum(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 14px', borderRadius: 10,
                                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Delivery Address *</label>
                            <textarea
                                placeholder="Enter your full delivery address"
                                value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)}
                                rows={3}
                                style={{
                                    width: '100%', padding: '10px 14px', borderRadius: 10,
                                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
                                    resize: 'vertical',
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="btn btn-primary" onClick={handleSaveAddressAndBuy}
                                style={{ flex: 1, padding: '12px 0', fontSize: '0.9rem', fontWeight: 700, borderRadius: 10 }}>Save & Buy</button>
                            <button className="btn btn-outline" onClick={() => setAddressModal(false)}
                                style={{ flex: 1, padding: '12px 0', fontSize: '0.9rem', fontWeight: 700, borderRadius: 10 }}>Cancel</button>
                        </div>
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
