import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, isConfigured } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // If not configured, bounce to settings (handled by user logic, but good double check)
        if (!isConfigured()) {
            navigate('/settings');
        }
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!auth) return;

        setLoading(true);
        setError('');

        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError('Invalid email or password. (Check Firebase Console -> Auth to create a user first!)');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container fade-in" style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="glass-card" style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>EMI Tracker</h1>

                {!isConfigured() ? (
                    <p>Please configure the app first.</p>
                ) : (
                    <form onSubmit={handleLogin}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        {error && <p style={{ color: '#ff6b6b', fontSize: '12px', marginBottom: '10px' }}>{error}</p>}

                        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem', opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'Signing in...' : 'Login'}
                        </button>
                    </form>
                )}

                <div style={{ marginTop: '20px' }}>
                    <button
                        onClick={() => navigate('/settings')}
                        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}
                    >
                        ⚙ Configure Firebase
                    </button>
                </div>
            </div>
        </div>
    );
}
