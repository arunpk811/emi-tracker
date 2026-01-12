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
            </div>
        </div>
    );
}
