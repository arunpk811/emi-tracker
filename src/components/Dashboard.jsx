import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();
    const user = localStorage.getItem('user') || 'User';

    return (
        <div className="container fade-in">
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Hello, {user}</h2>
                <button
                    onClick={() => { localStorage.removeItem('user'); navigate('/'); }}
                    style={{ width: 'auto', padding: '8px 16px', fontSize: '14px', background: 'rgba(255,255,255,0.1)' }}
                >
                    Logout
                </button>
            </header>

            <div style={{ display: 'grid', gap: '20px' }}>
                <div
                    className="glass-card"
                    onClick={() => navigate('/upload')}
                    style={{ cursor: 'pointer', textAlign: 'center', padding: '40px 20px' }}
                >
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>📂</div>
                    <h3>Upload EMI Schedule</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Import CSV or Excel files from banks</p>
                </div>

                <div
                    className="glass-card"
                    onClick={() => navigate('/tracker')}
                    style={{ cursor: 'pointer', textAlign: 'center', padding: '40px 20px' }}
                >
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>📊</div>
                    <h3>View Tracker</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Check monthly obligations & totals</p>
                </div>
            </div>
        </div>
    );
}
