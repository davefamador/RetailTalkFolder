'use client';

import { searchProducts, getStoredUser, buyProduct } from '../../lib/api';
import { useState, useEffect } from 'react';

export default function SearchPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);

    // Modal state for purchasing
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [purchased, setPurchased] = useState(false);
    const [purchaseError, setPurchaseError] = useState('');

    // Load user on mount
    useEffect(() => {
        setUser(getStoredUser());
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError('');
        try {
            const data = await searchProducts(query.trim());
            setResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const openProduct = (product) => {
        setSelectedProduct(product);
        setQuantity(1);
        setPurchased(false);
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
            setPurchased(true);
        } catch (err) {
            setPurchaseError(err.message || 'Failed to complete purchase. Check balance or stock.');
        }
    };

    const getLabelClass = (label) => {
        const map = {
            Exact: 'label-exact',
            Substitute: 'label-substitute',
            Complement: 'label-complement',
        };
        return `label ${map[label] || ''}`;
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>AI-Powered Search</h1>
                <p>Find products with BERT-powered intelligent matching</p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="search-container" style={{ marginBottom: 32 }}>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search for products... (e.g. wireless headphones)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{ paddingLeft: 16 }}
                />
            </form>

            {error && <div className="alert alert-error">{error}</div>}

            {loading && (
                <div className="loading-container">
                    <div className="spinner" style={{ width: 40, height: 40 }}></div>
                    <p>AI is analyzing products...</p>
                </div>
            )}

            {results && !loading && (
                <div>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
                        Found {results.total_results} relevant products for "{results.query}"
                    </p>

                    {results.total_results === 0 ? (
                        <div className="empty-state">
                            <h3>{results.message || 'No products found'}</h3>
                            <p>Try a different search term</p>
                        </div>
                    ) : (
                        <div className="product-grid">
                            {results.results.filter(p => !p.stock || p.stock > 0).map((product) => (
                                <div
                                    key={product.id}
                                    className="card product-card"
                                    onClick={() => openProduct(product)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    {product.image_url && (
                                        <div style={{ marginBottom: 12, borderRadius: 8, overflow: 'hidden' }}>
                                            <img
                                                src={product.image_url}
                                                alt={product.title}
                                                style={{
                                                    width: '100%', height: 160, objectFit: 'cover', display: 'block',
                                                }}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        </div>
                                    )}
                                    <div style={{ marginBottom: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <span className={getLabelClass(product.relevance_label)}>
                                                {product.relevance_label}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(76, 175, 80, 0.15)', color: '#4caf50' }}>
                                                E: {(product.exact_prob * 100).toFixed(1)}%
                                            </span>
                                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(255, 193, 7, 0.15)', color: '#ffc107' }}>
                                                S: {(product.substitute_prob * 100).toFixed(1)}%
                                            </span>
                                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(33, 150, 243, 0.15)', color: '#2196f3' }}>
                                                C: {(product.complement_prob * 100).toFixed(1)}%
                                            </span>
                                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(244, 67, 54, 0.15)', color: '#f44336' }}>
                                                I: {(product.irrelevant_prob * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className="product-title">{product.title}</h3>
                                    {product.description && (
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 12 }}>
                                            {product.description.slice(0, 120)}
                                            {product.description.length > 120 ? '...' : ''}
                                        </p>
                                    )}
                                    <div className="product-meta">
                                        <span className="product-price">PHP {product.price.toFixed(2)}</span>
                                    </div>

                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

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
                            maxWidth: 500, width: '100%',
                            boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                            animation: 'slideUp 0.3s ease',
                            position: 'relative',
                        }}
                    >
                        <button
                            onClick={closeModal}
                            style={{
                                position: 'absolute', top: 16, right: 16, zIndex: 10,
                                width: 32, height: 32, borderRadius: '50%',
                                background: 'rgba(255,255,255,0.1)', border: 'none',
                                color: 'var(--text-secondary)', cursor: 'pointer',
                            }}
                        >✕</button>

                        {purchased ? (
                            <div style={{ padding: 40, textAlign: 'center' }}>
                                <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
                                <h2>Purchase Confirmed!</h2>
                                <p style={{ color: 'var(--text-secondary)' }}>
                                    You bought {quantity}x {selectedProduct.title}
                                </p>
                            </div>
                        ) : (
                            <div style={{ padding: 32 }}>
                                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 16, paddingRight: 32 }}>
                                    {selectedProduct.title}
                                </h2>

                                <div style={{ marginBottom: 24 }}>
                                    {selectedProduct.image_url && (
                                        <div style={{ height: 200, borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                                            <img
                                                src={selectedProduct.image_url}
                                                alt={selectedProduct.title}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        </div>
                                    )}
                                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>
                                        PHP {parseFloat(selectedProduct.price).toFixed(2)}
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 12 }}>
                                        {selectedProduct.description}
                                    </p>
                                </div>

                                <div style={{
                                    background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 16,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Quantity:</span>
                                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>
                                            <button
                                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                style={{ width: 36, height: 36, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                                            >−</button>
                                            <span style={{ width: 44, textAlign: 'center', fontWeight: 'bold' }}>{quantity}</span>
                                            <button
                                                onClick={() => setQuantity(quantity + 1)}
                                                style={{ width: 36, height: 36, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                                            >+</button>
                                        </div>
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
                                            style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
                                        >
                                            {!user ? 'Login to Purchase' : `Buy for PHP ${(parseFloat(selectedProduct.price) * quantity).toFixed(2)}`}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
