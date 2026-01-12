import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

export default function EMITracker() {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth()); // 0-11
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth.currentUser) return;

        // Real-time Listener
        const q = query(
            collection(db, 'emis'),
            where("uid", "==", auth.currentUser.uid)
            // orderBy("date", "desc") // Requires index in Firestore, skipping for simple no-index start
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setData(fetched);
            setLoading(false);
        }, (error) => {
            console.error("Firestore Error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const getFilteredData = () => {
        return data.filter(item => {
            try {
                const d = new Date(item.date);
                if (isNaN(d.getTime())) return false;
                return d.getFullYear() === parseInt(year) && d.getMonth() === month;
            } catch (e) { return false; }
        });
    };

    const filtered = getFilteredData();
    const total = filtered.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    // Derive available years
    const availableYears = [...new Set(data.map(item => {
        try { return new Date(item.date).getFullYear() } catch { return new Date().getFullYear() }
    }))].sort().filter(y => !isNaN(y) && y > 1900 && y < 2100);

    if (availableYears.length === 0) availableYears.push(new Date().getFullYear());

    return (
        <div className="container fade-in">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => navigate('/dashboard')} style={{ width: 'auto', padding: '8px', marginRight: '10px' }}>←</button>
                    <h2>My EMIs</h2>
                </div>
                {/* Clear button removed or needs detailed implementation to delete from Firestore */}
            </div>

            <div className="glass-card">
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ flex: 1, marginBottom: 0 }}>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                    {months.map((m, idx) => (
                        <div
                            key={m}
                            onClick={() => setMonth(idx)}
                            style={{
                                padding: '8px 4px',
                                textAlign: 'center',
                                borderRadius: '8px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                background: month === idx ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                border: month === idx ? '1px solid white' : '1px solid transparent'
                            }}
                        >
                            {m}
                        </div>
                    ))}
                </div>
            </div>

            <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)', borderLeft: '4px solid #4ade80' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Total Obligations for {months[month]} {year}</p>
                <h1 style={{ fontSize: '32px', marginTop: '4px' }}>
                    {total.toLocaleString('en-US', { style: 'currency', currency: 'INR' })}
                </h1>
            </div>

            <div style={{ marginTop: '20px' }}>
                {loading ? <p style={{ textAlign: 'center' }}>Loading from Cloud...</p> :
                    filtered.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No EMIs found for this period.</p>
                    ) : (
                        filtered.map((item, index) => (
                            <div key={index} className="glass-card" style={{ padding: '16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h4 style={{ marginBottom: '4px' }}>{item.bank}</h4>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {new Date(item.date).toLocaleDateString()}
                                    </p>
                                </div>
                                <div style={{ fontWeight: 600, fontSize: '18px' }}>
                                    {item.amount.toLocaleString('en-US', { style: 'currency', currency: 'INR' })}
                                </div>
                            </div>
                        ))
                    )}
            </div>
        </div>
    );
}
