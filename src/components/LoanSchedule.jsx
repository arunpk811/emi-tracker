import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, writeBatch, getDocs } from 'firebase/firestore';

export default function LoanSchedule() {
    const navigate = useNavigate();
    const { bankName } = useParams(); // Get bank name from URL
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    const handleDeleteLoan = async () => {
        if (!window.confirm(`Are you sure you want to delete all records for ${decodeURIComponent(bankName)}? This cannot be undone.`)) {
            return;
        }

        try {
            const decodedBankName = decodeURIComponent(bankName);
            const q = query(
                collection(db, 'emis'),
                where("uid", "==", auth.currentUser.uid),
                where("bank", "==", decodedBankName)
            );

            const snapshot = await getDocs(q);
            const batch = writeBatch(db);

            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            alert('Loan deleted successfully.');
            navigate('/tracker');
        } catch (error) {
            console.error("Error deleting loan:", error);
            alert("Failed to delete loan.");
        }
    };

    useEffect(() => {
        if (!auth.currentUser || !bankName) return;

        // Decode bank name since it might be URL encoded
        const decodedBankName = decodeURIComponent(bankName);

        const q = query(
            collection(db, 'emis'),
            where("uid", "==", auth.currentUser.uid),
            where("bank", "==", decodedBankName)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Client-side sort by date (descending)
            fetched.sort((a, b) => new Date(b.date) - new Date(a.date));
            setData(fetched);
            setLoading(false);
        }, (error) => {
            console.error("Firestore Error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [bankName]);

    return (
        <div className="container fade-in">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                    <div
                        onClick={() => navigate('/tracker')}
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '16px',
                            background: 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: '1px solid rgba(255,255,255,0.1)',
                            flexShrink: 0
                        }}
                    >
                        <span style={{ fontSize: '20px' }}>←</span>
                    </div>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {decodeURIComponent(bankName)}
                    </h1>
                </div>
                <button
                    onClick={handleDeleteLoan}
                    style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        padding: '12px 16px',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '800',
                        width: 'auto'
                    }}
                >
                    PURGE
                </button>
            </div>

            <div className="glass-card" style={{ marginBottom: '32px', padding: '28px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>Total Obligations</p>
                        <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
                            {data.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)
                                .toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                        </h2>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>Outstanding</p>
                        <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#f87171', letterSpacing: '-0.02em' }}>
                            {(() => {
                                const today = new Date();
                                // Data is sorted by date DESCENDING properly in useEffect

                                // 1. Try to find the record for the current month
                                const current = data.find(r => {
                                    const d = new Date(r.date);
                                    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                                });

                                if (current) return (parseFloat(current.balance) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

                                // 2. If valid past records exist (loan started), take the latest one (which is data[0] if we filter for < today)
                                const latestPast = data.find(r => new Date(r.date) <= today);
                                if (latestPast) return (parseFloat(latestPast.balance) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

                                // 3. If no past records (future loan), take the earliest record (which is data[data.length-1])
                                const firstRecord = data[data.length - 1];
                                return (parseFloat(firstRecord?.balance) || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
                            })()}
                        </h2>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px' }}>Tenure</p>
                        <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>{data.length} <span style={{ fontSize: '13px', fontWeight: '500', opacity: 0.5 }}>M</span></h2>
                    </div>
                </div>

                {data.length > 0 && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '12px', fontWeight: '700' }}>
                            <span style={{ color: '#4ade80' }}>Paid: {
                                data.filter(i => new Date(i.date) <= new Date())
                                    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)
                                    .toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
                            }</span>
                            <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                                {Math.round((data.filter(i => new Date(i.date) <= new Date()).length / data.length) * 100)}% Complete
                            </span>
                        </div>
                        <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${Math.min(100, (data.filter(i => new Date(i.date) <= new Date()).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) / data.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 1)) * 100)}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #4ade80, #22c55e)',
                                transition: 'width 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                            }} />
                        </div>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: '600', marginTop: '8px', textAlign: 'right', textTransform: 'uppercase' }}>
                            RECOVERY RATE: {((data.filter(i => new Date(i.date) <= new Date()).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0) / data.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 1)) * 100).toFixed(1)}%
                        </p>
                    </div>
                )}
            </div>
            <div>
                {loading ? <p style={{ textAlign: 'center' }}>Loading...</p> :
                    data.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No records found.</p>
                    ) : (
                        data.map((item) => (
                            <div key={item.id} className="glass-card" style={{ padding: '16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ fontSize: '14px', fontWeight: '500' }}>
                                        {new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </p>
                                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        {new Date(item.date) > new Date() ? 'UPCOMING' : 'PAID'}
                                    </p>
                                </div>
                                <div style={{ fontWeight: 600, fontSize: '16px' }}>
                                    {item.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                                </div>
                            </div>
                        ))
                    )}
            </div>
        </div>
    );
}
