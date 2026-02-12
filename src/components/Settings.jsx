import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
    const navigate = useNavigate();
    const [config, setConfig] = useState({
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
    });

    useEffect(() => {
        const stored = localStorage.getItem('firebaseConfig');
        if (stored) {
            setConfig(JSON.parse(stored));
        }
    }, []);

    const handleChange = (e) => {
        setConfig({ ...config, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        localStorage.setItem('firebaseConfig', JSON.stringify(config));
        alert("Configuration Saved! Reloading app...");
        window.location.href = '/'; // Force reload to re-init firebase
    };

    return (
        <div className="container fade-in">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={() => navigate('/')} style={{ width: 'auto', padding: '8px', marginRight: '10px' }}>←</button>
                <h2>Settings</h2>
            </div>

            <div className="glass-card">
                <h3>Firebase Configuration</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Create a free project at <a href="https://console.firebase.google.com" target="_blank" style={{ color: '#fff' }}>console.firebase.google.com</a>.
                    <br />Go to Project Settings and copy the "firebaseConfig" values here.
                </p>

                {Object.keys(config).map((key) => (
                    <div key={key} style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '12px', textTransform: 'capitalize' }}>{key}</label>
                        <input
                            type="text"
                            name={key}
                            value={config[key]}
                            onChange={handleChange}
                            placeholder={`Enter ${key}`}
                        />
                    </div>
                ))}

                <button onClick={handleSave} className="btn-primary">Save & Reload</button>

                <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px' }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Current Session Info</h3>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '5px' }}>Logged in as:</p>
                    <p style={{ fontSize: '14px', fontWeight: '700', wordBreak: 'break-all' }}>{auth?.currentUser?.email || 'Not logged in'}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '10px', marginBottom: '5px' }}>User ID (UID):</p>
                    <code style={{ fontSize: '11px', background: '#000', padding: '4px 8px', borderRadius: '4px', display: 'block', wordBreak: 'break-all' }}>
                        {auth?.currentUser?.uid || 'N/A'}
                    </code>
                    <p style={{ fontSize: '10px', color: '#4ade80', marginTop: '10px' }}>
                        💡 If your data is missing, it's likely linked to your OLD UID.
                    </p>
                </div>

                <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

                <h3 style={{ color: '#ef4444' }}>Danger Zone</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    This will delete ALL your uploaded EMIs and Investments. This action cannot be undone.
                </p>
                <button
                    onClick={async () => {
                        if (confirm("Are you SURE you want to delete ALL your data? This cannot be undone.")) {
                            try {
                                const { collection, query, where, getDocs, writeBatch, deleteDoc } = await import('firebase/firestore');
                                const { db, auth } = await import('../firebase');

                                if (!auth.currentUser) return;

                                const batch = writeBatch(db);
                                // Delete EMIs
                                const q1 = query(collection(db, 'emis'), where("uid", "==", auth.currentUser.uid));
                                const snap1 = await getDocs(q1);
                                snap1.forEach(doc => batch.delete(doc.ref));

                                // Delete Investments
                                const q2 = query(collection(db, 'investments'), where("uid", "==", auth.currentUser.uid));
                                const snap2 = await getDocs(q2);
                                snap2.forEach(doc => batch.delete(doc.ref));

                                await batch.commit();
                                alert("All data deleted.");
                                window.location.href = '/';
                            } catch (e) {
                                console.error(e);
                                alert("Error deleting data. You might have too many records. Deleting what I can...");
                            }
                        }
                    }}
                    style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        padding: '12px',
                        borderRadius: '12px',
                        width: '100%',
                        cursor: 'pointer'
                    }}
                >
                    Reset & Delete All Data
                </button>
            </div>
        </div>
    );
}
