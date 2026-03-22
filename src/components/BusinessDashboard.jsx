import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import BottomNav from './BottomNav';

export default function BusinessDashboard() {
    const navigate = useNavigate();
    const [allBusinessRecords, setAllBusinessRecords] = useState([]);
    const [summary, setSummary] = useState({
        totalInvestment: 0,
        totalEarned: 0,
        netResult: 0
    });

    useEffect(() => {
        let unsubscribe;
        const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
            if (unsubscribe) unsubscribe();
            if (!currentUser) return;

            const q = query(
                collection(db, 'daily_records'),
                where("uid", "==", currentUser.uid)
            );

            unsubscribe = onSnapshot(q, (snapshot) => {
                const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const records = allDocs.filter(r => r.category === 'Business');
                
                // Sort in-memory
                records.sort((a, b) => new Date(b.date) - new Date(a.date));
                setAllBusinessRecords(records);

                const investment = records
                    .filter(r => r.type === 'Expense' || !r.type)
                    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
                
                const earned = records
                    .filter(r => r.type === 'Income')
                    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

                setSummary({
                    totalInvestment: investment,
                    totalEarned: earned,
                    netResult: earned - investment
                });
            }, (err) => console.error("Business Records Error:", err));
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribe) unsubscribe();
        };
    }, []);

    return (
        <>
            <div className="container fade-in" style={{ paddingBottom: '100px' }}>
                {/* Header */}
                <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className="btn-secondary"
                        style={{ padding: '8px', width: '36px', height: '36px', borderRadius: '50%' }}
                    >
                        ←
                    </button>
                    <div>
                        <div className="label" style={{ marginBottom: '2px' }}>Enterprise Tracking</div>
                        <h1 style={{ fontSize: '24px', margin: 0 }}>Business Dashboard 💼</h1>
                    </div>
                </div>

                {/* All-time Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                    <div className="glass-card" style={{ borderLeft: '4px solid #fda4af' }}>
                        <div className="label" style={{ fontSize: '11px', marginBottom: '8px' }}>TOTAL INVESTMENT</div>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: '#fda4af' }}>
                            ₹{summary.totalInvestment.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>All-time Spend</div>
                    </div>
                    <div className="glass-card" style={{ borderLeft: '4px solid #10b981' }}>
                        <div className="label" style={{ fontSize: '11px', marginBottom: '8px' }}>TOTAL EARNED</div>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: '#10b981' }}>
                            ₹{summary.totalEarned.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>All-time Returns</div>
                    </div>
                </div>

                {/* Net Result Card */}
                <div className="glass-card" style={{ 
                    marginBottom: '24px', 
                    background: summary.netResult >= 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(244, 63, 94, 0.05)',
                    border: '1px solid ' + (summary.netResult >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)')
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="label">Overall Net Result</div>
                            <div style={{ 
                                fontSize: '28px', 
                                fontWeight: '900', 
                                color: summary.netResult >= 0 ? '#10b981' : '#f43f5e',
                                marginTop: '4px'
                            }}>
                                {summary.netResult >= 0 ? '+' : ''}₹{summary.netResult.toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div style={{ fontSize: '32px' }}>
                            {summary.netResult >= 0 ? '📈' : '📉'}
                        </div>
                    </div>
                </div>

                {/* Transaction List */}
                <div className="glass-card">
                    <div className="label" style={{ marginBottom: '16px' }}>Business Transactions</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {allBusinessRecords.length > 0 ? (
                            allBusinessRecords.map(record => (
                                <div key={record.id} style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{record.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{record.date}</div>
                                    </div>
                                    <div style={{ 
                                        fontWeight: '700', 
                                        color: record.type === 'Income' ? '#10b981' : '#fda4af' 
                                    }}>
                                        {record.type === 'Income' ? '+' : '-'}₹{parseFloat(record.amount).toLocaleString('en-IN')}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                                No business transactions found.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <BottomNav />
        </>
    );
}
