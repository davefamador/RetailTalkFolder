'use client';

import { useState, useEffect, useRef } from 'react';
import { createProduct, getMyProducts, updateProduct, deleteProduct, getStoredUser, uploadProductImage } from '../../lib/api';

export default function SellPage() {
    const [user, setUser] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [products, setProducts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('1');
    const [imageFiles, setImageFiles] = useState([]); // { file, preview, url }
    const [loading, setLoading] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const stored = getStoredUser();
        if (!stored) {
            window.location.href = '/login';
            return;
        }
        if (stored.role !== 'seller') {
            window.location.href = '/';
            return;
        }
        setUser(stored);
        setAuthChecked(true);
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const data = await getMyProducts();
            setProducts(data);
        } catch (err) {
            console.error(err);
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setPrice('');
        setStock('1');
        setImageFiles([]);
        setEditingProduct(null);
        setShowForm(false);
    };

    const startEdit = (product) => {
        setEditingProduct(product);
        setTitle(product.title);
        setDescription(product.description || '');
        setPrice(product.price.toString());
        setStock((product.stock || 0).toString());
        // Convert existing URLs to preview objects
        const existing = (product.images || []).map(url => ({ file: null, preview: url, url }));
        setImageFiles(existing);
        setShowForm(true);
        setError('');
        setSuccess('');
    };

    // --- Drag & Drop ---
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        if (e.type === 'dragleave') setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        addFiles(files);
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
        addFiles(files);
        e.target.value = '';
    };

    const addFiles = (files) => {
        const remaining = 5 - imageFiles.length;
        if (remaining <= 0) {
            setError('Maximum 5 images allowed');
            return;
        }
        const toAdd = files.slice(0, remaining);
        const newItems = toAdd.map(f => ({
            file: f,
            preview: URL.createObjectURL(f),
            url: null,
        }));
        setImageFiles(prev => [...prev, ...newItems]);
    };

    const removeImage = (index) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validate
        if (!title.trim()) { setError('Product title is required'); return; }
        if (!description.trim()) { setError('Product description is required'); return; }
        if (!price || parseFloat(price) <= 0) { setError('Price must be greater than 0'); return; }
        if (!stock || parseInt(stock) < 1) { setError('Stock must be at least 1'); return; }
        if (imageFiles.length === 0) { setError('At least one product image is required'); return; }

        setLoading(true);

        try {
            // 1. Upload any new files (those without a URL yet)
            setUploadingImages(true);
            const imageUrls = [];
            for (const img of imageFiles) {
                if (img.url) {
                    imageUrls.push(img.url);
                } else if (img.file) {
                    const result = await uploadProductImage(img.file);
                    imageUrls.push(result.url);
                }
            }
            setUploadingImages(false);

            // 2. Create or update product
            const productData = {
                title: title.trim(),
                description: description.trim(),
                price: parseFloat(price),
                stock: parseInt(stock),
                images: imageUrls,
            };

            if (editingProduct) {
                await updateProduct(editingProduct.id, productData);
                setSuccess('Product updated successfully!');
            } else {
                await createProduct(productData);
                setSuccess('Product created successfully!');
            }
            resetForm();
            loadProducts();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setUploadingImages(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await deleteProduct(id);
            loadProducts();
        } catch (err) {
            setError(err.message);
        }
    };

    if (!authChecked) {
        return (
            <div className="page">
                <div className="loading-container">
                    <div className="spinner" style={{ width: 40, height: 40 }}></div>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Seller Dashboard</h1>
                    <p>Manage your product listings</p>
                </div>
                <button className="btn btn-primary" onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}>
                    {showForm ? 'Cancel' : '+ New Product'}
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Create / Edit Product Form */}
            {showForm && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <h3 style={{ marginBottom: 16 }}>
                        {editingProduct ? 'Edit Product' : 'Create New Product'}
                    </h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Product Title *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Wireless Bluetooth Headphones"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Description *</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe your product in detail..."
                                rows={3}
                                required
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group">
                                <label>Price (PHP) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="299.00"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Stock Quantity *</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={stock}
                                    onChange={(e) => setStock(e.target.value)}
                                    placeholder="10"
                                    required
                                />
                            </div>
                        </div>

                        {/* Image Upload — Drag & Drop */}
                        <div className="form-group">
                            <label>Product Images * (max 5)</label>
                            <div
                                className={`dropzone ${dragActive ? 'active' : ''}`}
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    multiple
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📁</div>
                                <p style={{ fontWeight: 500, marginBottom: 4 }}>
                                    Drag & drop images here or click to browse
                                </p>
                                <p style={{ fontSize: '0.8rem' }}>
                                    JPEG, PNG, WebP, GIF — Max 5MB each — {imageFiles.length}/5 uploaded
                                </p>
                            </div>

                            {/* Image Previews */}
                            {imageFiles.length > 0 && (
                                <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                                    {imageFiles.map((img, i) => (
                                        <div key={i} style={{ position: 'relative' }}>
                                            <img
                                                src={img.preview}
                                                alt={`Preview ${i + 1}`}
                                                style={{
                                                    width: 80, height: 80, objectFit: 'cover',
                                                    borderRadius: 8, border: '2px solid var(--border-color)',
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(i)}
                                                style={{
                                                    position: 'absolute', top: -6, right: -6,
                                                    width: 22, height: 22, borderRadius: '50%',
                                                    background: 'var(--accent-danger)', color: 'white',
                                                    border: 'none', cursor: 'pointer', fontSize: '0.7rem',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}
                                            >✕</button>
                                            {i === 0 && (
                                                <div style={{
                                                    position: 'absolute', bottom: 2, left: 2, right: 2,
                                                    background: 'rgba(0,0,0,0.7)', color: 'white',
                                                    fontSize: '0.6rem', textAlign: 'center',
                                                    borderRadius: '0 0 6px 6px', padding: '2px 0',
                                                }}>Main</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button type="submit" className="btn btn-success" disabled={loading} style={{ marginTop: 8 }}>
                            {loading ? (
                                <><span className="spinner"></span> {uploadingImages ? 'Uploading images...' : 'Saving...'}</>
                            ) : (
                                editingProduct ? 'Update Product' : 'Create Product'
                            )}
                        </button>
                    </form>
                </div>
            )}

            {/* Products List */}
            {products.length === 0 ? (
                <div className="empty-state">
                    <h3>No products yet</h3>
                    <p>Click "+ New Product" to create your first listing</p>
                </div>
            ) : (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Title</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((p) => (
                            <tr key={p.id}>
                                <td>
                                    {p.images && p.images.length > 0 ? (
                                        <img
                                            src={p.images[0]}
                                            alt={p.title}
                                            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }}
                                            onError={(e) => {
                                                e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect fill="%23333" width="48" height="48"/><text fill="%23888" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="10">No img</text></svg>';
                                            }}
                                        />
                                    ) : (
                                        <div style={{
                                            width: 48, height: 48, background: 'var(--glass-bg)', borderRadius: 6,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.7rem', color: 'var(--text-muted)',
                                        }}>No img</div>
                                    )}
                                </td>
                                <td style={{ fontWeight: 500 }}>{p.title}</td>
                                <td style={{ color: 'var(--accent-secondary)' }}>PHP {parseFloat(p.price).toFixed(2)}</td>
                                <td>
                                    <span style={{
                                        fontWeight: 600,
                                        color: (p.stock || 0) > 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
                                    }}>
                                        {p.stock || 0}
                                    </span>
                                </td>
                                <td>
                                    {!p.is_active ? (
                                        <span className="label" style={{ background: 'rgba(255,71,87,0.15)', color: 'var(--accent-danger)' }}>
                                            Deleted
                                        </span>
                                    ) : (
                                        <span className="label" style={
                                            p.status === 'approved'
                                                ? { background: 'rgba(16,185,129,0.15)', color: '#10b981' }
                                                : p.status === 'unapproved'
                                                    ? { background: 'rgba(239,68,68,0.15)', color: '#ef4444' }
                                                    : { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }
                                        }>
                                            {p.status === 'approved' ? 'Approved' : p.status === 'unapproved' ? 'Unapproved' : 'Pending'}
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {p.is_active && (
                                            <>
                                                <button className="btn btn-outline btn-sm" onClick={() => startEdit(p)}>Edit</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
