import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, isConfigured, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

export default function Login() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isConfigured()) {
            navigate('/settings');
        }
    }, [navigate]);

    const handleGoogleLogin = async () => {
        if (!auth || !googleProvider) return;
        setLoading(true);
        setError('');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            if (result.user) {
                localStorage.setItem('user', result.user.displayName || result.user.email);
            }
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError('Google sign-in failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container fade-in" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                {/* Logo */}
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: 'linear-gradient(135deg, var(--primary), #1e40af)',
                    borderRadius: '16px',
                    margin: '0 auto 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px'
                }}>
                    💰
                </div>

                <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>EMI Tracker</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px' }}>
                    Manage your finances with ease
                </p>

                {!isConfigured() ? (
                    <div>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                            Firebase not configured yet
                        </p>
                        <button onClick={() => navigate('/settings')} className="btn-primary" style={{ width: '100%' }}>
                            Configure Now
                        </button>
                    </div>
                ) : (
                    <div>
                        {error && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: 'var(--danger)',
                                padding: '12px',
                                borderRadius: '10px',
                                marginBottom: '20px',
                                fontSize: '14px'
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="btn-primary"
                            disabled={loading}
                            style={{ width: '100%' }}
                        >
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
                                <path d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z" fill="#34A853" />
                                <path d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                                <path d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.003 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z" fill="#EA4335" />
                            </svg>
                            {loading ? 'Signing in...' : 'Continue with Google'}
                        </button>
                    </div>
                )}

                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
                    <button
                        onClick={() => navigate('/settings')}
                        className="btn-secondary"
                        style={{ width: '100%', fontSize: '13px' }}
                    >
                        ⚙️ Settings
                    </button>
                </div>
            </div>
        </div>
    );
}
