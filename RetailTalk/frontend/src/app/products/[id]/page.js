'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getProduct, buyProduct, getStoredUser } from '../../../lib/api';

export default function ProductDetailPage() {
    const params = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [buying, setBuying] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedImage, setSelectedImage] = useState(0);

    useEffect(() => {
        setUser(getStoredUser());
        loadProduct();
    }, []);

    const loadProduct = async () => {
        try {
            const data = await getProduct(params.id);
            setProduct(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = async () => {
        if (!user) {
            window.location.href = '/login';
            return;
        }
        if (user.role !== 'buyer') {
            setError('Only buyer accounts can purchase products.');
            return;
        }
        setBuying(true);
        setError('');
        setSuccess('');
        try {
            await buyProduct(product.id, quantity);
            setSuccess(`Successfully purchased ${quantity}x ${product.title}!`);
            // Refresh product data to get updated stock
            const updated = await getProduct(params.id);
            setProduct(updated);
            setQuantity(1);
        } catch (err) {
            setError(err.message);
        } finally {
            setBuying(false);
        }
    };

    if (loading) {
        return (
            <div className="page">
                <div className="loading-container">
                    <div className="spinner" style={{ width: 40, height: 40 }}></div>
                    <p>Loading product...</p>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="page">
                <div className="empty-state">
                    <h3>Product Not Found</h3>
                    <p>{error || 'This product may have been removed.'}</p>
                    <a href="/products" className="btn btn-primary" style={{ marginTop: 16 }}>Back to Browse</a>
                </div>
            </div>
        );
    }

    const images = product.images || [];
    const totalPrice = (parseFloat(product.price) * quantity).toFixed(2);
    const inStock = (product.stock || 0) > 0;

    return (
        <div className="page" style={{ maxWidth: 1000 }}>
            <a href="/products" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
                ← Back to Browse
            </a>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: images.length > 0 ? '1fr 1fr' : '1fr', gap: 40 }}>
                {/* Left: Images */}
                {images.length > 0 && (
                    <div>
                        {/* Main Image */}
                        <div style={{
                            width: '100%', aspectRatio: '1', borderRadius: 12, overflow: 'hidden',
                            background: 'var(--bg-card)', border: '1px solid var(--border-color)', marginBottom: 12,
                        }}>
                            <img
                                src={images[selectedImage]}
                                alt={product.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>
                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                {images.map((img, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setSelectedImage(i)}
                                        style={{
                                            width: 64, height: 64, borderRadius: 8, overflow: 'hidden',
                                            cursor: 'pointer', border: `2px solid ${i === selectedImage ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                            transition: 'border-color 0.2s',
                                        }}
                                    >
                                        <img src={img} alt={`Thumb ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Right: Product Info */}
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>{product.title}</h1>

                    {product.seller_name && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 16 }}>
                            Sold by <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{product.seller_name}</span>
                        </p>
                    )}

                    <div style={{
                        fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent-secondary)',
                        marginBottom: 20,
                    }}>
                        PHP {parseFloat(product.price).toFixed(2)}
                    </div>

                    {/* Stock Status */}
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '8px 16px', borderRadius: 20, marginBottom: 20,
                        background: inStock ? 'rgba(16,185,129,0.1)' : 'rgba(255,71,87,0.1)',
                        border: `1px solid ${inStock ? 'rgba(16,185,129,0.3)' : 'rgba(255,71,87,0.3)'}`,
                    }}>
                        <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: inStock ? 'var(--accent-success)' : 'var(--accent-danger)',
                        }}></span>
                        <span style={{
                            fontWeight: 600, fontSize: '0.85rem',
                            color: inStock ? 'var(--accent-success)' : 'var(--accent-danger)',
                        }}>
                            {inStock ? `${product.stock} in stock` : 'Out of stock'}
                        </span>
                    </div>

                    {/* Description */}
                    <div style={{
                        padding: '16px 0', borderTop: '1px solid var(--border-color)',
                        borderBottom: '1px solid var(--border-color)', marginBottom: 24,
                    }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                            Description
                        </h3>
                        <p style={{ color: 'var(--text-primary)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                            {product.description || 'No description provided.'}
                        </p>
                    </div>

                    {/* Buy Section */}
                    {inStock && (
                        <div className="card" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                                <label style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Quantity:</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm"
                                        style={{ borderRadius: '8px 0 0 8px', padding: '8px 14px' }}
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    >−</button>
                                    <input
                                        type="number"
                                        min="1"
                                        max={product.stock}
                                        value={quantity}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 1;
                                            setQuantity(Math.min(Math.max(1, val), product.stock));
                                        }}
                                        style={{
                                            width: 60, textAlign: 'center', padding: '8px',
                                            border: '1px solid var(--border-color)', borderLeft: 'none', borderRight: 'none',
                                            background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                                            fontFamily: 'Inter, sans-serif', fontWeight: 600,
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-sm"
                                        style={{ borderRadius: '0 8px 8px 0', padding: '8px 14px' }}
                                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                                    >+</button>
                                </div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    (max {product.stock})
                                </span>
                            </div>

                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '12px 0', borderTop: '1px solid var(--border-color)', marginBottom: 12,
                            }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Total:</span>
                                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>
                                    PHP {totalPrice}
                                </span>
                            </div>

                            {user ? (
                                user.role === 'buyer' ? (
                                    <button
                                        className="btn btn-success"
                                        onClick={handleBuy}
                                        disabled={buying}
                                        style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
                                    >
                                        {buying ? <><span className="spinner"></span> Processing...</> : `Buy Now — PHP ${totalPrice}`}
                                    </button>
                                ) : (
                                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        {user.role === 'seller' ? 'Sellers cannot purchase products. Switch to a buyer account.' : ''}
                                    </p>
                                )
                            ) : (
                                <a href="/login" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem', textAlign: 'center' }}>
                                    Login to Buy
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
