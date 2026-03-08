'use client';

import { useEffect, useState } from 'react';
import { getStoredUser } from '../lib/api';

export default function HomePage() {
    const [user, setUser] = useState(null);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        setUser(getStoredUser());
        setHydrated(true);
    }, []);

    return (
        <div style={{ minHeight: '100vh' }}>
            {/* ========== HERO ========== */}
            <section style={{
                padding: '120px 20px 100px', textAlign: 'center',
                position: 'relative', overflow: 'hidden',
                background: 'radial-gradient(ellipse at 50% 0%, rgba(108,99,255,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(0,212,170,0.08) 0%, transparent 50%)',
            }}>
                {/* Animated glow orbs */}
                <div style={{
                    position: 'absolute', top: '10%', left: '15%', width: 300, height: 300,
                    borderRadius: '50%', background: 'rgba(108,99,255,0.06)', filter: 'blur(80px)',
                    animation: 'float 6s ease-in-out infinite', pointerEvents: 'none',
                }}></div>
                <div style={{
                    position: 'absolute', bottom: '10%', right: '15%', width: 250, height: 250,
                    borderRadius: '50%', background: 'rgba(0,212,170,0.05)', filter: 'blur(80px)',
                    animation: 'float 8s ease-in-out infinite reverse', pointerEvents: 'none',
                }}></div>

                <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto' }}>
                    <div style={{
                        display: 'inline-block', padding: '6px 18px', borderRadius: 20,
                        background: 'rgba(108,99,255,0.12)', color: '#a5b4fc',
                        fontSize: '0.85rem', fontWeight: 600, marginBottom: 28,
                        border: '1px solid rgba(108,99,255,0.2)',
                        letterSpacing: '0.5px',
                    }}>
                        Powered by BERT AI
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(2.8rem, 6vw, 4.5rem)', fontWeight: 800,
                        lineHeight: 1.05, marginBottom: 24, letterSpacing: '-0.02em',
                    }}>
                        <span style={{
                            background: 'linear-gradient(135deg, #fff 0%, #e0e7ff 50%, #a5b4fc 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>Search It.</span>{' '}
                        <span style={{
                            background: 'linear-gradient(135deg, #6c63ff 0%, #a5b4fc 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>Find It.</span>{' '}
                        <span style={{
                            background: 'linear-gradient(135deg, #00d4aa 0%, #10b981 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>Buy It.</span>
                    </h1>

                    <p style={{
                        fontSize: 'clamp(1.05rem, 2vw, 1.3rem)', color: 'var(--text-secondary)',
                        maxWidth: 560, margin: '0 auto 44px', lineHeight: 1.7,
                    }}>
                        An NLP for querying e-commerce product. Intelligent product search
                        powered by BERT embeddings and machine learning.
                    </p>

                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a href="/search" className="btn btn-primary" style={{
                            padding: '16px 36px', fontSize: '1.05rem', borderRadius: 14,
                        }}>
                            Try AI Search
                        </a>
                        <a href="/products" className="btn btn-outline" style={{
                            padding: '16px 36px', fontSize: '1.05rem', borderRadius: 14,
                        }}>
                            Browse Products
                        </a>
                    </div>
                </div>
            </section>

            {/* ========== FEATURES (Rocket-style numbered cards) ========== */}
            <section style={{ padding: '100px 20px', maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: 60 }}>
                    <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 12, letterSpacing: '-0.01em' }}>
                        How RetailTalk Works
                    </h2>
                    <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
                        Our AI understands your search intent and finds exactly what you need
                    </p>
                </div>

                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24,
                }}>
                    {[
                        {
                            num: '01', color: '#6c63ff',
                            title: 'BERT-Powered Search',
                            desc: 'Uses multilingual BERT embeddings to understand product meaning, not just keywords. Describe what you need in natural language.',
                            details: ['Semantic understanding', 'Multi-language support', 'Context-aware matching'],
                        },
                        {
                            num: '02', color: '#00d4aa',
                            title: 'Smart Classification',
                            desc: 'Products are automatically classified as Exact Match, Substitute, or Complement using our trained classifier model.',
                            details: ['Exact / Substitute / Complement', 'Confidence scoring', 'Relevance ranking'],
                        },
                        {
                            num: '03', color: '#f59e0b',
                            title: 'Instant Transactions',
                            desc: 'Full marketplace with wallets, instant purchases, and complete transaction history. Secure and fast.',
                            details: ['Digital wallet system', 'PHP currency', 'Complete purchase history'],
                        },
                    ].map((f) => (
                        <div key={f.num} className="card" style={{ padding: 32, position: 'relative', overflow: 'hidden' }}>
                            <div style={{
                                position: 'absolute', top: -10, right: -5,
                                fontSize: '5rem', fontWeight: 900, color: `${f.color}08`,
                                lineHeight: 1, letterSpacing: '-0.05em',
                            }}>{f.num}</div>
                            <div style={{
                                width: 44, height: 44, borderRadius: 10, marginBottom: 20,
                                background: `${f.color}18`, border: `1px solid ${f.color}30`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1rem', fontWeight: 800, color: f.color,
                            }}>{f.num}</div>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 12 }}>{f.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: 16 }}>
                                {f.desc}
                            </p>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {f.details.map((d, i) => (
                                    <li key={i} style={{
                                        padding: '6px 0', fontSize: '0.82rem', color: 'var(--text-muted)',
                                        display: 'flex', alignItems: 'center', gap: 8,
                                    }}>
                                        <span style={{
                                            width: 6, height: 6, borderRadius: '50%', background: f.color,
                                            flexShrink: 0, opacity: 0.7,
                                        }}></span>
                                        {d}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            {/* ========== HAPPINESS SPEAKS (Static Testimonials) ========== */}
            <section style={{
                padding: '80px 20px',
                background: 'linear-gradient(180deg, transparent 0%, rgba(108,99,255,0.04) 50%, transparent 100%)',
            }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 48 }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 12 }}>
                            A Precise Search Engine
                        </h2>
                        <p style={{ color: 'var(--text-muted)', maxWidth: 450, margin: '0 auto' }}>
                            Discover exactly what you need with semantic understanding
                        </p>
                    </div>

                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20,
                    }}>
                        {[
                            {
                                name: 'Maria Santos', role: 'Buyer',
                                text: 'RetailTalk\'s AI search is incredible. I just type what I need in plain language and it finds exactly the right products. No more scrolling through pages of irrelevant items!',
                            },
                            {
                                name: 'Juan dela Cruz', role: 'Seller',
                                text: 'My products get discovered by the right buyers now. The BERT-powered matching means my listings show up when people actually need them. Sales have been amazing.',
                            },
                            {
                                name: 'Angela Reyes', role: 'Buyer',
                                text: 'The classification feature is what sold me. Knowing if something is an exact match or a substitute helps me make better purchasing decisions every time.',
                            },
                            {
                                name: 'Carlos Mendoza', role: 'Seller',
                                text: 'Setting up my store was so easy. Just list products with images and prices, and the AI handles the rest. The wallet system makes transactions seamless.',
                            },
                            {
                                name: 'Sofia Garcia', role: 'Buyer',
                                text: 'I love that I can search in natural language. "Comfortable headphones for studying" actually returns headphones perfect for studying, not just any headphones.',
                            },
                            {
                                name: 'Rafael Cruz', role: 'Seller',
                                text: 'The transaction history and balance tracking make it simple to manage my business. I always know exactly what I\'ve sold and earned. Highly recommend!',
                            },
                        ].map((t, i) => (
                            <div key={i} style={{
                                padding: 28, borderRadius: 14,
                                background: 'rgba(26,26,46,0.6)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                transition: 'all 0.3s',
                            }}>
                                <p style={{
                                    color: 'var(--text-secondary)', fontSize: '0.9rem',
                                    lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic',
                                }}>
                                    "{t.text}"
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 38, height: 38, borderRadius: '50%',
                                        background: `linear-gradient(135deg, ${i % 2 === 0 ? '#6c63ff' : '#00d4aa'}, ${i % 2 === 0 ? '#a5b4fc' : '#10b981'})`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 700, fontSize: '0.85rem', color: '#fff',
                                    }}>
                                        {t.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 600, fontSize: '0.88rem', margin: 0 }}>{t.name}</p>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========== CTA ========== */}
            <section style={{
                padding: '80px 20px', textAlign: 'center',
                background: 'radial-gradient(ellipse at 50% 50%, rgba(108,99,255,0.1) 0%, transparent 60%)',
            }}>
                <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 16 }}>
                    For Educational Purpose Only
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 36, maxWidth: 400, margin: '0 auto 36px' }}>
                    Join RetailTalk and experience AI-powered product discovery
                </p>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {hydrated && !user ? (
                        <>
                            <a href="/register" className="btn btn-primary" style={{
                                padding: '16px 36px', fontSize: '1.05rem', borderRadius: 14,
                            }}>Create Account</a>
                            <a href="/login" className="btn btn-outline" style={{
                                padding: '16px 36px', fontSize: '1.05rem', borderRadius: 14,
                            }}>Login</a>
                        </>
                    ) : hydrated ? (
                        <a href="/search" className="btn btn-primary" style={{
                            padding: '16px 36px', fontSize: '1.05rem', borderRadius: 14,
                        }}>Go to Search</a>
                    ) : null}
                </div>
            </section>

            {/* ========== FOOTER with Social Links ========== */}
            <footer style={{
                padding: '40px 20px 32px', textAlign: 'center',
                borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div style={{ marginBottom: 20 }}>
                    <span style={{
                        fontWeight: 800, fontSize: '1.2rem',
                        background: 'linear-gradient(135deg, #6c63ff, #3b82f6)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>RetailTalk</span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
                    An NLP for querying e-commerce product
                </p>
                {/* Social Media Links */}
                <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 24 }}>
                    {[
                        /*{ name: 'Facebook', href: '#', icon: 'f' },
                        { name: 'Twitter', href: '#', icon: 'X' },
                        { name: 'Instagram', href: '#', icon: 'in' },*/
                        { name: 'LinkedIn', href: 'https://www.linkedin.com/in/dave-moissan-famador-4246412a1/', icon: 'Li' },
                        { name: 'GitHub', href: 'https://github.com/davefamador', icon: 'GH' },
                    ].map((s) => (
                        <a key={s.name} href={s.href} title={s.name} style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700,
                            textDecoration: 'none', transition: 'all 0.2s',
                        }}>{s.icon}</a>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                    <a href="/products" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Products</a>
                    <a href="/search" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Search</a>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>
                    &copy; 2026 RetailTalk. All rights reserved.
                </p>
            </footer>

            {/* Float animation keyframe via style tag */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
            `}</style>
        </div>
    );
}
