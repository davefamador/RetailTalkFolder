'use client';

import './globals.css';
import { useEffect, useState } from 'react';
import { getStoredUser, logout, getBalance, getStoredAdmin, adminLogout } from '../lib/api';

export default function RootLayout({ children }) {
    const [user, setUser] = useState(null);
    const [admin, setAdmin] = useState(null);
    const [balance, setBalance] = useState(null);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const storedUser = getStoredUser();
        const storedAdmin = getStoredAdmin();
        document.documentElement.setAttribute('data-theme', 'dark');

        if (storedUser) {
            setUser(storedUser);
            getBalance().then(b => setBalance(b.balance)).catch(() => { });
        }

        if (storedAdmin) {
            setAdmin(storedAdmin);
        }

        setHydrated(true);
    }, []);

    const handleLogout = () => {
        logout();
        setUser(null);
        setBalance(null);
        window.location.href = '/';
    };

    const handleAdminLogout = () => {
        adminLogout();
        setAdmin(null);
        window.location.href = '/admin';
    };

    return (
        <html lang="en" data-theme="dark">
            <head>
                <title>RetailTalk - An NLP for querying e-commerce product</title>
                <meta name="description" content="An NLP for querying e-commerce product. BERT-powered intelligent product search." />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body>
                <nav className="navbar">
                    <a href="/" className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src="/logo.png" alt="RetailTalk Logo" style={{ height: '32px', width: '32px' }} />
                        RetailTalk
                    </a>

                    <div className="navbar-links">
                        <a href="/search">Search</a>
                        <a href="/products">Browse</a>

                        {hydrated && (
                            <>
                                {user && user.role === 'seller' && (
                                    <>
                                        <a href="/sell">Products</a>
                                        <a href="/sell/reports">Reports</a>
                                        <a href="/transactions">Transactions</a>
                                    </>
                                )}

                                {user && user.role === 'buyer' && (
                                    <a href="/transactions">Transactions</a>
                                )}

                                {admin && (
                                    <a href="/admin/dashboard" style={{ color: 'var(--accent-danger)' }}>Admin</a>
                                )}
                            </>
                        )}
                    </div>

                    <div className="navbar-user">
                        {hydrated ? (
                            admin ? (
                                <>
                                    <span style={{
                                        color: 'var(--accent-danger)', fontWeight: 'bold', fontSize: '0.85rem',
                                        border: '1px solid var(--accent-danger)', padding: '4px 10px', borderRadius: 20,
                                    }}>
                                        ADMIN
                                    </span>
                                    <button onClick={handleAdminLogout} className="btn btn-outline btn-sm">
                                        Logout
                                    </button>
                                </>
                            ) : user ? (
                                <>
                                    {balance !== null && (
                                        <a href="/wallet" className="navbar-balance" style={{ textDecoration: 'none', color: 'inherit' }}>
                                            PHP {parseFloat(balance).toFixed(2)}
                                        </a>
                                    )}
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        {user.full_name} ({user.role})
                                    </span>
                                    <button onClick={handleLogout} className="btn btn-outline btn-sm">
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <a href="/login" className="btn btn-outline btn-sm">Login</a>
                                    <a href="/register" className="btn btn-primary btn-sm">Sign Up</a>
                                </>
                            )
                        ) : null}
                    </div>
                </nav>
                {children}
            </body>
        </html>
    );
}
