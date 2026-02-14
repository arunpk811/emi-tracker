import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    const menuItems = [
        { path: '/tracker', icon: '📊', label: 'Tracker' },
        { path: '/income', icon: '💰', label: 'Income' },
        { path: '/borrowers', icon: '🤝', label: 'Lending' }
    ];

    const moreMenuItems = [
        { path: '/investments', icon: '🌱', label: 'Investments' },
        { path: '/upload', icon: '📂', label: 'Import' },
        { path: '/add-schedule', icon: '📅', label: 'Schedule' },
        { path: '/settings', icon: '⚙️', label: 'Settings' }
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <>
            {/* Nav Bar */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'var(--surface)',
                borderTop: '1px solid var(--border)',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                padding: '8px 0',
                zIndex: 1000,
                backdropFilter: 'blur(10px)',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
            }}>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="btn-secondary"
                    style={{
                        border: 'none',
                        background: 'transparent',
                        flexDirection: 'column',
                        gap: '4px',
                        padding: '8px',
                        borderRadius: 0,
                        color: isActive('/dashboard') ? 'var(--primary)' : 'var(--text-primary)'
                    }}
                >
                    <span style={{ fontSize: '20px' }}>🏠</span>
                    <span style={{ fontSize: '10px', fontWeight: '600' }}>Home</span>
                </button>
                {menuItems.map(item => (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className="btn-secondary"
                        style={{
                            border: 'none',
                            background: 'transparent',
                            flexDirection: 'column',
                            gap: '4px',
                            padding: '8px',
                            borderRadius: 0,
                            color: isActive(item.path) ? 'var(--primary)' : 'var(--text-primary)'
                        }}
                    >
                        <span style={{ fontSize: '20px' }}>{item.icon}</span>
                        <span style={{ fontSize: '10px', fontWeight: '600' }}>{item.label}</span>
                    </button>
                ))}
                <button
                    onClick={() => setShowMoreMenu(true)}
                    className="btn-secondary"
                    style={{
                        border: 'none',
                        background: 'transparent',
                        flexDirection: 'column',
                        gap: '4px',
                        padding: '8px',
                        borderRadius: 0
                    }}
                >
                    <span style={{ fontSize: '20px' }}>⋯</span>
                    <span style={{ fontSize: '10px', fontWeight: '600' }}>More</span>
                </button>
            </div>

            {/* More Menu Overlay */}
            {showMoreMenu && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 2000,
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                    onClick={() => setShowMoreMenu(false)}
                >
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'var(--surface)',
                            padding: '24px',
                            borderTopLeftRadius: '20px',
                            borderTopRightRadius: '20px',
                            animation: 'slideUp 0.3s ease-out'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '18px', margin: 0 }}>More Options</h2>
                            <button onClick={() => setShowMoreMenu(false)} className="btn-secondary" style={{ padding: '8px', width: '36px', height: '36px' }}>
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                            {moreMenuItems.map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => { setShowMoreMenu(false); navigate(item.path); }}
                                    className="btn-secondary"
                                    style={{
                                        justifyContent: 'flex-start',
                                        padding: '14px 16px',
                                        width: '100%',
                                        background: isActive(item.path) ? 'rgba(59, 130, 246, 0.1)' : 'var(--surface)',
                                        borderColor: isActive(item.path) ? 'var(--primary)' : 'var(--border)'
                                    }}
                                >
                                    <span style={{ fontSize: '20px' }}>{item.icon}</span>
                                    <span style={{ flex: 1, textAlign: 'left', color: isActive(item.path) ? 'var(--primary)' : 'inherit' }}>{item.label}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => { auth.signOut(); localStorage.removeItem('user'); navigate('/'); }}
                            className="btn-secondary"
                            style={{ width: '100%', color: 'var(--danger)', marginTop: '8px' }}
                        >
                            🚪 Sign Out
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
