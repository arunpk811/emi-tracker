import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function Dashboard() {
    const navigate = useNavigate();
    const today = new Date();
    const [user, setUser] = useState(localStorage.getItem('user') || 'User');
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [allEmis, setAllEmis] = useState([]);
    const [allIncomes, setAllIncomes] = useState([]);
    const [summary, setSummary] = useState({
        total: 0,
        paid: 0,
        percentage: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0
    });

    useEffect(() => {
        if (!auth.currentUser) return;

        const qEmis = query(collection(db, 'emis'), where("uid", "==", auth.currentUser.uid));
        const unsubscribeEmis = onSnapshot(qEmis, (snapshot) => {
            setAllEmis(snapshot.docs.map(doc => doc.data()));
        });

        const qIncome = query(collection(db, 'income'), where("uid", "==", auth.currentUser.uid));
        const unsubscribeIncomes = onSnapshot(qIncome, (snapshot) => {
            setAllIncomes(snapshot.docs.map(doc => doc.data()));
        });

        return () => {
            unsubscribeEmis();
            unsubscribeIncomes();
        };
    }, []);

    useEffect(() => {
        // Budget calculations
        const debtDocs = allEmis.filter(d => d.category !== 'investment');

        // Lifetime calculations (always relative to 'today' for progress)
        const bankGroups = {};
        debtDocs.forEach(doc => {
            if (!bankGroups[doc.bank]) bankGroups[doc.bank] = [];
            bankGroups[doc.bank].push(doc);
        });

        let totalCurrentDebt = 0;
        Object.keys(bankGroups).forEach(bank => {
            const records = bankGroups[bank];
            records.sort((a, b) => new Date(a.date) - new Date(b.date));
            const currentRecord = records.find(r => {
                const d = new Date(r.date);
                return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
            });

            if (currentRecord) {
                totalCurrentDebt += (parseFloat(currentRecord.balance) || 0);
            } else {
                const pastRecords = records.filter(r => new Date(r.date) < today);
                if (pastRecords.length > 0) {
                    totalCurrentDebt += (parseFloat(pastRecords[pastRecords.length - 1].balance) || 0);
                } else if (records.length > 0) {
                    totalCurrentDebt += (parseFloat(records[0].balance) || 0);
                }
            }
        });

        const hasBalanceData = debtDocs.some(d => d.balance !== undefined);
        const totalPayable = debtDocs.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
        const finalTotal = hasBalanceData && totalCurrentDebt > 0 ? totalCurrentDebt : totalPayable;
        const paid = debtDocs.filter(d => new Date(d.date) <= today)
            .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

        // Monthly calculations based on selected month
        const monthlyExpenses = allEmis.filter(d => {
            const dDate = new Date(d.date);
            return dDate.getMonth() === selectedMonth && dDate.getFullYear() === selectedYear;
        }).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

        const monthlyIncome = allIncomes.filter(inc => {
            const d = new Date(inc.date || inc.createdAt);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        }).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

        setSummary({
            total: finalTotal,
            paid,
            percentage: finalTotal > 0 ? (paid / finalTotal) * 100 : 0,
            monthlyIncome,
            monthlyExpenses
        });
    }, [allEmis, allIncomes, selectedMonth, selectedYear]);

    const remaining = summary.monthlyIncome - summary.monthlyExpenses;
    const expensePercentage = summary.monthlyIncome > 0 ? (summary.monthlyExpenses / summary.monthlyIncome) * 100 : 0;

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 1 + i);

    const menuItems = [
        { path: '/tracker', icon: '📊', label: 'View Tracker', sub: 'EMI List' },
        { path: '/income', icon: '💰', label: 'Manage Income', sub: 'Earnings' },
        { path: '/investments', icon: '🌱', label: 'Investments', sub: 'Assets' },
        { path: '/upload', icon: '📂', label: 'Upload EMI', sub: 'Import' },
        { path: '/add-schedule', icon: '📅', label: 'Schedule', sub: 'Manual' }
    ];

    return (
        <div className="container fade-in" style={{ padding: '24px 20px 180px', minHeight: '100vh', position: 'relative' }}>
            <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: '400', marginBottom: '2px' }}>Welcome back,</p>
                    <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0, letterSpacing: '-0.02em' }}>{user}</h1>
                </div>
                <div
                    onClick={() => setIsMenuOpen(true)}
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '20px',
                        background: 'rgba(255,255,255,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.1)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                    }}
                >
                    <div style={{ width: '24px', height: '3px', background: '#fff', borderRadius: '3px' }} />
                    <div style={{ width: '24px', height: '3px', background: '#fff', borderRadius: '3px' }} />
                    <div style={{ width: '16px', height: '3px', background: '#fff', borderRadius: '3px', marginLeft: '8px' }} />
                </div>
            </header>

            {/* Hamburger Menu Overlay */}
            {isMenuOpen && (
                <div
                    className="fade-in"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(15px)',
                        zIndex: 2000,
                        display: 'flex',
                        justifyContent: 'flex-end'
                    }}
                    onClick={() => setIsMenuOpen(false)}
                >
                    <div
                        style={{
                            width: '85%',
                            maxWidth: '320px',
                            height: '100%',
                            background: '#111',
                            padding: '40px 24px',
                            boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
                            display: 'flex',
                            flexDirection: 'column',
                            borderLeft: '1px solid rgba(255,255,255,0.05)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '800' }}>Explore</h2>
                            <div
                                onClick={() => setIsMenuOpen(false)}
                                style={{ fontSize: '32px', cursor: 'pointer', lineHeight: '1', color: 'rgba(255,255,255,0.5)' }}
                            >
                                &times;
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                            {menuItems.map((item) => (
                                <div
                                    key={item.path}
                                    onClick={() => { setIsMenuOpen(false); navigate(item.path); }}
                                    style={{
                                        padding: '20px',
                                        borderRadius: '20px',
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <span style={{ fontSize: '28px' }}>{item.icon}</span>
                                    <div>
                                        <p style={{ margin: 0, fontWeight: '700', fontSize: '17px' }}>{item.label}</p>
                                        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => { localStorage.removeItem('user'); navigate('/'); }}
                            style={{
                                marginTop: '20px',
                                padding: '18px',
                                borderRadius: '20px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                fontWeight: '800',
                                fontSize: '16px'
                            }}
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            )}



            {/* Monthly Budget Summary Card */}
            <div className="glass-card" style={{
                marginBottom: '32px',
                background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.2) 0%, rgba(255,255,255,0.05) 100%)',
                borderLeft: '8px solid #4ade80',
                padding: '28px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(74, 222, 128, 0.1)', filter: 'blur(40px)', borderRadius: '50%' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                        <p style={{ fontSize: '12px', color: 'rgba(74, 222, 128, 0.8)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>
                            Monthly Budget
                        </p>
                        <h2 style={{ fontSize: '22px', margin: 0, fontWeight: '700' }}>{months[selectedMonth]} {selectedYear}</h2>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontWeight: '600', textTransform: 'uppercase' }}>Available</p>
                        <h2 style={{ fontSize: 'clamp(24px, 8vw, 30px)', margin: 0, fontWeight: '800', color: remaining >= 0 ? '#fff' : '#ef4444', letterSpacing: '-0.02em' }}>
                            ₹{remaining.toLocaleString('en-IN')}
                        </h2>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '600' }}>Income</p>
                        <p style={{ fontWeight: '800', color: '#4ade80', fontSize: '22px', margin: 0, letterSpacing: '-0.01em' }}>
                            ₹{summary.monthlyIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '600' }}>Expenses</p>
                        <p style={{ fontWeight: '800', color: '#ef4444', fontSize: '22px', margin: 0, letterSpacing: '-0.01em' }}>
                            ₹{summary.monthlyExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                    </div>
                </div>

                <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px' }}>
                    <div style={{
                        width: `${Math.min(expensePercentage, 100)}%`,
                        height: '100%',
                        background: expensePercentage > 90 ? '#ef4444' : 'linear-gradient(90deg, #4ade80, #22c55e)',
                        transition: 'width 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase' }}>Income Utilized</p>
                    <p style={{ fontSize: '16px', fontWeight: '800', color: expensePercentage > 90 ? '#ef4444' : '#4ade80' }}>
                        {expensePercentage.toFixed(1)}%
                    </p>
                </div>
            </div>

            {/* Lifetime Progress Card */}
            <div className="glass-card" style={{
                marginBottom: '40px',
                background: 'rgba(255,255,255,0.02)',
                borderLeft: '8px solid #6366f1',
                padding: '28px',
                position: 'relative'
            }}>
                <p style={{ fontSize: '12px', color: 'rgba(99, 102, 241, 1)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>Lifetime Debt Repayment</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
                    <div>
                        <h2 style={{ fontSize: 'clamp(28px, 9vw, 36px)', fontWeight: '800', marginBottom: '4px', letterSpacing: '-0.03em' }}>
                            {summary.paid.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                        </h2>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: '400' }}>
                            out of {summary.total.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '32px', fontWeight: '800', color: '#6366f1', letterSpacing: '-0.03em' }}>{Math.round(summary.percentage)}%</div>
                    </div>
                </div>
                <div style={{ width: '100%', height: '14px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ width: `${summary.percentage}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', transition: 'width 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
                </div>
            </div>
            {/* Premium Selector - Fixed to bottom for thumb access */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '20px',
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                zIndex: 1000,
                boxShadow: '0 -20px 40px rgba(0,0,0,0.4)',
                borderTopLeftRadius: '32px',
                borderTopRightRadius: '32px'
            }}>
                <div style={{ maxWidth: '440px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <p style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Forecast Period</p>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            style={{
                                width: 'auto',
                                padding: '4px 12px',
                                fontSize: '13px',
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                marginBottom: 0,
                                height: '28px',
                                borderRadius: '10px'
                            }}
                        >
                            {years.map(y => <option key={y} value={y} style={{ background: '#333' }}>{y}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '10px' }}>
                        {shortMonths.slice(0, 4).map((m, i) => (
                            <div
                                key={m}
                                onClick={() => setSelectedMonth(i)}
                                style={{
                                    padding: '10px 0',
                                    textAlign: 'center',
                                    borderRadius: '14px',
                                    fontSize: '12px',
                                    fontWeight: selectedMonth === i ? '700' : '500',
                                    cursor: 'pointer',
                                    background: selectedMonth === i ? '#fff' : 'rgba(255,255,255,0.05)',
                                    color: selectedMonth === i ? '#000' : 'rgba(255,255,255,0.6)',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    border: selectedMonth === i ? '1px solid #fff' : '1px solid rgba(255,255,255,0.05)',
                                }}
                            >
                                {m}
                            </div>
                        ))}
                    </div>
                    <div>
                        <select
                            value={selectedMonth > 3 ? selectedMonth : ''}
                            onChange={(e) => {
                                if (e.target.value !== '') {
                                    setSelectedMonth(parseInt(e.target.value));
                                }
                            }}
                            style={{
                                width: '100%',
                                padding: '10px 16px',
                                fontSize: '13px',
                                background: selectedMonth > 3 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                                border: selectedMonth > 3 ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '14px',
                                color: selectedMonth > 3 ? '#fff' : 'rgba(255,255,255,0.5)',
                                fontWeight: selectedMonth > 3 ? '700' : '500'
                            }}
                        >
                            <option value="" disabled>{selectedMonth <= 3 ? 'Select other month...' : months[selectedMonth]}</option>
                            {months.slice(4).map((m, i) => (
                                <option key={m} value={i + 4} style={{ background: '#333', color: '#fff' }}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
