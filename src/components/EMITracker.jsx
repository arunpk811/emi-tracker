import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc } from 'firebase/firestore';
import BottomNav from './BottomNav';

export default function EMITracker() {
    const navigate = useNavigate();
    const [data, setData] = useState([]);
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth()); // 0-11
    const [loading, setLoading] = useState(true);

    const togglePaidStatus = async (id, currentStatus) => {
        try {
            const docRef = doc(db, 'emis', id);
            await updateDoc(docRef, {
                status: currentStatus === 'paid' ? 'unpaid' : 'paid'
            });
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
            if (!currentUser) return;

            // Real-time Listener
            const q = query(
                collection(db, 'emis'),
                where("uid", "==", currentUser.uid)
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
        });

        return () => unsubscribeAuth();
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
    const paid = filtered.filter(i => i.status === 'paid' || (i.status === undefined && new Date(i.date) <= new Date()))
        .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    // Derive available years
    const currentYear = new Date().getFullYear();
    const uniqueYears = new Set(data.map(item => {
        try { return new Date(item.date).getFullYear() } catch { return currentYear }
    }));
    uniqueYears.add(currentYear);
    uniqueYears.add(year); // Ensure selected year is always an option

    const availableYears = [...uniqueYears].sort().filter(y => !isNaN(y) && y > 1900 && y < 2100);

    return (
        <div className="container fade-in" style={{ paddingBottom: '100px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>My Tracker</h1>
                </div>
            </div>

            <div className="glass-card" style={{ marginBottom: '32px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <p style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analysis period</p>
                    <select value={year} onChange={e => setYear(parseInt(e.target.value))} style={{ width: 'auto', padding: '6px 16px', fontSize: '14px', background: 'rgba(255,255,255,0.1)', border: 'none', marginBottom: 0, height: '36px' }}>
                        {availableYears.map(y => <option key={y} value={y} style={{ background: '#222' }}>{y}</option>)}
                    </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    {months.map((m, idx) => (
                        <div
                            key={m}
                            onClick={() => setMonth(idx)}
                            style={{
                                padding: '12px 0',
                                textAlign: 'center',
                                borderRadius: '14px',
                                fontSize: '13px',
                                fontWeight: month === idx ? '700' : '500',
                                cursor: 'pointer',
                                background: month === idx ? '#fff' : 'rgba(255,255,255,0.05)',
                                color: month === idx ? '#000' : 'rgba(255,255,255,0.6)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                border: month === idx ? '1px solid #fff' : '1px solid transparent',
                                transform: month === idx ? 'scale(1.05)' : 'scale(1)'
                            }}
                        >
                            {m}
                        </div>
                    ))}
                </div>
            </div>

            <div className="glass-card" style={{
                marginBottom: '32px',
                background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.15) 0%, rgba(255,255,255,0.02) 100%)',
                borderLeft: '8px solid #4ade80',
                padding: '28px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <p style={{ fontSize: '11px', color: 'rgba(74, 222, 128, 0.8)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>Total Obligations ({months[month]} {year})</p>
                        <h1 style={{ fontSize: '32px', margin: 0, fontWeight: '800', letterSpacing: '-0.02em' }}>
                            {total.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                        </h1>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>Paid</p>
                        <h1 style={{ fontSize: '24px', margin: 0, fontWeight: '800', color: '#4ade80' }}>
                            {paid.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                        </h1>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '20px' }}>
                {loading ? <p style={{ textAlign: 'center' }}>Loading from Cloud...</p> :
                    filtered.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No EMIs found for this period.</p>
                    ) : (
                        ['debt', 'planned', 'investment'].map(cat => {
                            const items = filtered.filter(f => (f.category || 'debt') === cat);
                            if (items.length === 0) return null;

                            return (
                                <div key={cat} style={{ marginBottom: '32px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <div style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            textTransform: 'uppercase',
                                            background: cat === 'debt' ? 'rgba(239, 68, 68, 0.1)' : cat === 'planned' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                            color: cat === 'debt' ? 'var(--danger)' : cat === 'planned' ? 'var(--primary)' : 'var(--success)',
                                            border: '1px solid currentColor'
                                        }}>
                                            {cat === 'debt' ? 'Loans' : cat === 'planned' ? 'Planned Expenses' : 'Investments'}
                                        </div>
                                        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                                    </div>
                                    {items.map((item, index) => {
                                        const isPaid = item.status === 'paid' || (item.status === undefined && new Date(item.date) <= new Date());
                                        return (
                                            <div
                                                key={item.id || index}
                                                className="glass-card"
                                                onClick={() => navigate(`/schedule/${encodeURIComponent(item.bank)}`)}
                                                style={{
                                                    padding: '16px',
                                                    marginBottom: '10px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    cursor: 'pointer',
                                                    opacity: isPaid ? 0.7 : 1
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                    <div
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePaidStatus(item.id, item.status);
                                                        }}
                                                        style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            borderRadius: '50%',
                                                            border: isPaid ? 'none' : '2px solid rgba(255,255,255,0.2)',
                                                            background: isPaid ? '#4ade80' : 'transparent',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.3s ease'
                                                        }}
                                                    >
                                                        {isPaid && <span style={{ color: '#000', fontSize: '14px', fontWeight: '900' }}>✓</span>}
                                                    </div>
                                                    <div>
                                                        <h4 style={{ marginBottom: '4px', textDecoration: isPaid ? 'line-through' : 'none', color: isPaid ? 'rgba(255,255,255,0.4)' : '#fff' }}>{item.bank}</h4>
                                                        <p style={{ fontSize: '12px', color: isPaid ? '#4ade80' : 'var(--text-muted)', fontWeight: isPaid ? '700' : '400' }}>
                                                            {isPaid ? 'PAID' : new Date(item.date).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div style={{ fontWeight: 600, fontSize: '18px', textDecoration: isPaid ? 'line-through' : 'none', color: isPaid ? 'rgba(255,255,255,0.4)' : '#fff' }}>
                                                    {item.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })
                    )}
            </div>
            <BottomNav />
        </div>
    );
}
