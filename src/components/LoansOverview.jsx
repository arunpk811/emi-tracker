import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import BottomNav from './BottomNav';

export default function LoansOverview() {
    const navigate = useNavigate();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
            if (!currentUser) return;

            const q = query(
                collection(db, 'emis'),
                where("uid", "==", currentUser.uid)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Filter for loans (category 'debt' or undefined)
                const data = allData.filter(item => (item.category || 'debt') === 'debt');

                // Group by bank
                const groups = {};
                data.forEach(item => {
                    if (!groups[item.bank]) {
                        groups[item.bank] = [];
                    }
                    groups[item.bank].push(item);
                });

                const today = new Date();
                const loanSummaries = Object.keys(groups).map(bank => {
                    const records = groups[bank];
                    records.sort((a, b) => new Date(a.date) - new Date(b.date));

                    const paidSoFar = records
                        .filter(r => r.status === 'paid' || (r.status === undefined && new Date(r.date) <= today))
                        .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

                    // Principal Outstanding logic
                    let outstanding = 0;
                    const current = records.find(r => {
                        const d = new Date(r.date);
                        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
                    });

                    if (current) {
                        outstanding = parseFloat(current.balance) || 0;
                    } else {
                        const latestPast = [...records].reverse().find(r => new Date(r.date) <= today);
                        if (latestPast) {
                            outstanding = parseFloat(latestPast.balance) || 0;
                        } else if (records.length > 0) {
                            outstanding = parseFloat(records[0].balance) || 0;
                        }
                    }

                    const totalPayableOutstanding = records
                        .filter(r => r.status !== 'paid' && !(r.status === undefined && new Date(r.date) <= today))
                        .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

                    return {
                        bank,
                        paidSoFar,
                        outstanding,
                        totalPayableOutstanding,
                        totalInstallments: records.length,
                        paidCount: records.filter(r => r.status === 'paid' || (r.status === undefined && new Date(r.date) <= today)).length
                    };
                });

                setLoans(loanSummaries);
                setLoading(false);
            }, (error) => {
                console.error("Firestore Error:", error);
                setLoading(false);
            });

            return () => unsubscribe();
        });

        return () => unsubscribeAuth();
    }, []);

    return (
        <div className="container fade-in" style={{ paddingBottom: '100px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px', gap: '16px' }}>
                <div
                    onClick={() => navigate('/dashboard')}
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                >
                    <span>←</span>
                </div>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800' }}>Loan Progress</h1>
            </div>

            {loading ? (
                <p style={{ textAlign: 'center' }}>Loading loans...</p>
            ) : loans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>No active loans found.</p>
                    <button onClick={() => navigate('/upload')} className="btn-primary">Import Loans</button>
                </div>
            ) : (
                <>
                    {/* Cumulative Summary Card */}
                    <div className="glass-card" style={{
                        marginBottom: '32px',
                        padding: '28px',
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(255,255,255,0.02) 100%)',
                        borderLeft: '8px solid #f87171'
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div>
                                <p style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(248, 113, 113, 0.8)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Principal Outstanding</p>
                                <h1 style={{ fontSize: '28px', margin: 0, fontWeight: '800', letterSpacing: '-0.02em', color: '#fff' }}>
                                    ₹{loans.reduce((acc, l) => acc + (l.outstanding || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </h1>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total Incl. Interest</p>
                                <h1 style={{ fontSize: '24px', margin: 0, fontWeight: '800', color: 'rgba(255,255,255,0.6)' }}>
                                    ₹{loans.reduce((acc, l) => acc + (l.totalPayableOutstanding || 0), 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </h1>
                            </div>
                        </div>
                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Average Recovery Rate</span>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#4ade80' }}>
                                {loans.length > 0 ? `${Math.round(loans.reduce((acc, l) => acc + (l.paidCount / l.totalInstallments), 0) / loans.length * 100)}%` : 'N/A'}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '16px' }}>
                        {loans.map(loan => (
                            <div
                                key={loan.bank}
                                className="glass-card"
                                onClick={() => navigate(`/schedule/${encodeURIComponent(loan.bank)}`)}
                                style={{ cursor: 'pointer', padding: '24px' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{loan.bank}</h3>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            {loan.paidCount} of {loan.totalInstallments} EMIs paid
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            background: loan.outstanding > 0 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.1)',
                                            color: loan.outstanding > 0 ? '#4ade80' : 'var(--text-muted)',
                                            border: loan.outstanding > 0 ? '1px solid rgba(74, 222, 128, 0.2)' : '1px solid rgba(255,255,255,0.2)'
                                        }}>
                                            {loan.outstanding > 0 ? 'ACTIVE' : 'CLOSED'}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
                                    <div>
                                        <p style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Paid</p>
                                        <p style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: '#fff' }}>
                                            ₹{loan.paidSoFar.toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Principal Bal</p>
                                        <p style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: '#f87171' }}>
                                            ₹{loan.outstanding.toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Total Payable</p>
                                        <p style={{ fontSize: '15px', fontWeight: '800', margin: 0, color: 'rgba(255,255,255,0.6)' }}>
                                            ₹{loan.totalPayableOutstanding.toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${(loan.paidCount / loan.totalInstallments) * 100}%`,
                                        height: '100%',
                                        background: 'var(--primary)',
                                        transition: 'width 1s ease-out'
                                    }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <BottomNav />
        </div>
    );
}
