import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import BottomNav from './BottomNav';

export default function Dashboard() {
    const navigate = useNavigate();
    const today = new Date();
    const [user, setUser] = useState(localStorage.getItem('user') || 'User');
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [allEmis, setAllEmis] = useState([]);
    const [allIncomes, setAllIncomes] = useState([]);
    const [allBorrowers, setAllBorrowers] = useState([]);
    const [allInvestments, setAllInvestments] = useState([]);
    const [allDailyRecords, setAllDailyRecords] = useState([]);
    const [showBalanceBreakdown, setShowBalanceBreakdown] = useState(false);
    const [summary, setSummary] = useState({
        total: 0,
        paid: 0,
        percentage: 0,
        monthlyIncome: 0,
        dailyIncome: 0,
        scheduledExpenses: 0,
        totalSpent: 0,
        expectedBankBalance: 0,
        breakingDown: {
            income: 0,
            dailyIncome: 0,
            monthlyPaid: 0,
            dailyExpenses: 0,
            invested: 0
        },
        totalInvested: 0,
        expectedMaturity: 0,
        categoryBreakdown: []
    });

    useEffect(() => {
        let unsubEmis, unsubIncomes, unsubBorrowers, unsubInvestments, unsubDaily;

        const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
            if (unsubEmis) unsubEmis();
            if (unsubIncomes) unsubIncomes();
            if (unsubBorrowers) unsubBorrowers();
            if (unsubInvestments) unsubInvestments();

            if (!currentUser) return;

            unsubEmis = onSnapshot(
                query(collection(db, 'emis'), where("uid", "==", currentUser.uid)),
                (snapshot) => setAllEmis(snapshot.docs.map(doc => doc.data())),
                (err) => console.error("EMI Listener Error:", err)
            );

            unsubIncomes = onSnapshot(
                query(collection(db, 'income'), where("uid", "==", currentUser.uid)),
                (snapshot) => setAllIncomes(snapshot.docs.map(doc => doc.data())),
                (err) => console.error("Income Listener Error:", err)
            );

            unsubBorrowers = onSnapshot(
                query(collection(db, 'borrowers'), where("uid", "==", currentUser.uid)),
                (snapshot) => setAllBorrowers(snapshot.docs.map(doc => doc.data())),
                (err) => console.error("Borrower Listener Error:", err)
            );

            unsubInvestments = onSnapshot(
                query(collection(db, 'investments'), where("uid", "==", currentUser.uid)),
                (snapshot) => setAllInvestments(snapshot.docs.map(doc => doc.data())),
                (err) => console.error("Investments Listener Error:", err)
            );

            unsubDaily = onSnapshot(
                query(collection(db, 'daily_records'), where("uid", "==", currentUser.uid)),
                (snapshot) => setAllDailyRecords(snapshot.docs.map(doc => doc.data())),
                (err) => console.error("Daily Records Listener Error:", err)
            );
        });

        return () => {
            unsubscribeAuth();
            if (unsubEmis) unsubEmis();
            if (unsubIncomes) unsubIncomes();
            if (unsubBorrowers) unsubBorrowers();
            if (unsubInvestments) unsubInvestments();
            if (unsubDaily) unsubDaily();
        };
    }, []);

    useEffect(() => {
        const debtDocs = allEmis.filter(d => (d.category || 'debt') === 'debt');
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
        const paid = debtDocs.filter(d => d.status === 'paid' || (d.status === undefined && new Date(d.date) <= today))
            .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

        const monthlyEmisList = allEmis.filter(d => {
            const dDate = new Date(d.date);
            return dDate.getMonth() === selectedMonth && dDate.getFullYear() === selectedYear;
        });

        const monthlyExpenses = monthlyEmisList.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
        const monthlyPaid = monthlyEmisList
            .filter(d => d.status === 'paid' || d.status === 'done' || (d.status === undefined && new Date(d.date) <= today))
            .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

        const monthlyIncome = allIncomes.filter(inc => {
            const d = new Date(inc.date || inc.createdAt);
            // Treat undefined (old records) as credited by default for better migration, 
            // but exclude if explicitly set to false
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && inc.credited !== false;
        }).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

        const monthlyDailyExpenses = allDailyRecords.filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && (r.type === 'Expense' || !r.type);
        }).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

        const monthlyDailyIncome = allDailyRecords.filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && r.type === 'Income';
        }).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

        const categoryGrouping = {};
        const currentMonthDailyExpenses = allDailyRecords.filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && (r.type === 'Expense' || !r.type);
        });

        currentMonthDailyExpenses.forEach(r => {
            const cat = r.category || 'Other Expenses';
            categoryGrouping[cat] = (categoryGrouping[cat] || 0) + (parseFloat(r.amount) || 0);
        });

        const sortedCategories = Object.entries(categoryGrouping)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const monthlyInvestmentsList = allInvestments.filter(inv => {
            const d = new Date(inv.date || inv.createdAt);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });
        const monthlyInvestedAmount = monthlyInvestmentsList.reduce((acc, curr) => acc + (parseFloat(curr.principal) || 0), 0);

        setSummary({
            total: finalTotal,
            paid,
            percentage: finalTotal > 0 ? (paid / finalTotal) * 100 : 0,
            monthlyIncome,
            dailyIncome: monthlyDailyIncome,
            scheduledExpenses: monthlyExpenses + monthlyInvestedAmount,
            totalSpent: monthlyPaid + monthlyDailyExpenses + monthlyInvestedAmount,
            expectedBankBalance: (monthlyIncome + monthlyDailyIncome) - (monthlyPaid + monthlyDailyExpenses + monthlyInvestedAmount),
            breakingDown: {
                income: monthlyIncome,
                dailyIncome: monthlyDailyIncome,
                monthlyPaid: monthlyPaid,
                dailyExpenses: monthlyDailyExpenses,
                invested: monthlyInvestedAmount
            },
            totalInvested: allInvestments.reduce((acc, curr) => acc + (parseFloat(curr.principal) || 0), 0),
            expectedMaturity: allInvestments.reduce((acc, curr) => acc + (parseFloat(curr.maturityAmount) || 0), 0),
            categoryBreakdown: sortedCategories
        });
    }, [allEmis, allIncomes, allInvestments, allDailyRecords, selectedMonth, selectedYear]);

    const remaining = (summary.monthlyIncome + summary.dailyIncome) - (summary.scheduledExpenses + (allDailyRecords.filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && (r.type === 'Expense' || !r.type);
    }).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)));

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 1 + i);

    const moreMenuItems = [
        { path: '/investments', icon: '🌱', label: 'Investments' },
        { path: '/upload', icon: '📂', label: 'Import' },
        { path: '/add-schedule', icon: '�', label: 'Schedule' },
        { path: '/settings', icon: '⚙️', label: 'Settings' }
    ];

    return (
        <>
            <div className="container fade-in" style={{ paddingBottom: '100px' }}>
                {/* Header */}
                <div style={{ marginBottom: '24px' }}>
                    <div className="label" style={{ marginBottom: '4px' }}>Dashboard</div>
                    <h1 style={{ fontSize: '24px', marginTop: '0' }}>Hi, {user.split(' ')[0]} 👋</h1>
                </div>

                {/* Month/Year Selector */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        style={{ flex: 1, marginBottom: 0 }}
                    >
                        {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        style={{ width: '100px', marginBottom: 0 }}
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>

                {/* Unified Finance Command Card */}
                <div
                    className="glass-card"
                    style={{
                        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        padding: '24px',
                        marginBottom: '24px',
                        color: 'white'
                    }}
                >
                    {/* Primary Balances */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                        <div onClick={() => navigate('/tracker')} style={{ cursor: 'pointer' }}>
                            <div className="label" style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Budget Forecast</div>
                            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--primary)' }}>
                                ₹{(remaining || 0).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Ideal End Balance</div>
                        </div>
                        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '20px' }}>
                            <div className="label" style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Expected Bank Balance</div>
                            <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>
                                ₹{summary.expectedBankBalance.toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>Current Liquidity</div>
                        </div>
                    </div>

                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: '20px' }} />

                    {/* Secondary Breakdown */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontWeight: '600' }}>TOTAL INCOME</div>
                            <div style={{ fontSize: '18px', fontWeight: '700' }}>₹{(summary.monthlyIncome + summary.dailyIncome).toLocaleString('en-IN')}</div>
                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>Main + Daily</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', fontWeight: '600' }}>TOTAL PLANNED</div>
                            <div style={{ fontSize: '18px', fontWeight: '700' }}>
                                ₹{(summary.scheduledExpenses + (allDailyRecords.filter(r => {
                                    const d = new Date(r.date);
                                    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && (r.type === 'Expense' || !r.type);
                                }).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0))).toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>Loans + Daily + Inv.</div>
                        </div>
                    </div>

                    {/* Daily Tracking Info Section */}
                    <div
                        onClick={() => navigate('/daily-expenses')}
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            padding: '16px',
                            borderRadius: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}
                    >
                        <div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>Daily Spend Tracking</div>
                            <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '2px' }}>
                                ₹{(allDailyRecords.filter(r => {
                                    const d = new Date(r.date);
                                    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && (r.type === 'Expense' || !r.type);
                                }).reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)).toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>PAID SO FAR</div>
                            <div style={{ fontSize: '18px', fontWeight: '800', marginTop: '2px', color: '#fda4af' }}>
                                ₹{summary.totalSpent.toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>

                    {/* Breakdown Toggle */}
                    <div style={{ marginTop: '16px', textAlign: 'center' }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowBalanceBreakdown(!showBalanceBreakdown); }}
                            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            {showBalanceBreakdown ? 'Hide Details' : 'View Calculation Breakdown'}
                        </button>
                    </div>

                    {showBalanceBreakdown && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', fontSize: '12px', marginTop: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Bank Income (A):</span>
                                <span style={{ fontWeight: '700' }}>+₹{summary.breakingDown.income.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Daily Income (B):</span>
                                <span style={{ fontWeight: '700' }}>+₹{summary.breakingDown.dailyIncome.toLocaleString()}</span>
                            </div>
                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '10px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Loans Paid (C):</span>
                                <span style={{ fontWeight: '700', color: '#fda4af' }}>-₹{summary.breakingDown.monthlyPaid.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Daily Spend (D):</span>
                                <span style={{ fontWeight: '700', color: '#fda4af' }}>-₹{summary.breakingDown.dailyExpenses.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Invested (E):</span>
                                <span style={{ fontWeight: '700', color: '#fda4af' }}>-₹{summary.breakingDown.invested.toLocaleString()}</span>
                            </div>
                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', margin: '10px 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '800', color: '#10b981' }}>
                                <span>Exp. Bank Bal (A+B-C-D-E):</span>
                                <span>₹{summary.expectedBankBalance.toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Category Breakdown Section */}
                {summary.categoryBreakdown.length > 0 && (
                    <div className="glass-card" style={{ marginBottom: '24px' }}>
                        <div className="label" style={{ marginBottom: '16px' }}>Expense by Category</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {summary.categoryBreakdown.map((cat, idx) => (
                                <div key={cat.name}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px' }}>
                                        <div style={{ fontWeight: '600' }}>{cat.name}</div>
                                        <div style={{ fontWeight: '700' }}>₹{cat.value.toLocaleString('en-IN')}</div>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{
                                            width: `${(cat.value / summary.breakingDown.dailyExpenses) * 100}%`,
                                            height: '100%',
                                            background: idx === 0 ? 'var(--primary)' : 'var(--text-secondary)',
                                            opacity: Math.max(0.3, 1 - (idx * 0.15)),
                                            borderRadius: '10px'
                                        }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. Loan Progress */}
                <div
                    className="glass-card"
                    onClick={() => navigate('/loans-overview')}
                    style={{ cursor: 'pointer', marginBottom: '16px' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div className="label" style={{ marginBottom: 0 }}>Loan Progress</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)' }}>
                            {Math.round(summary.percentage || 0)}%
                        </div>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
                        <div style={{
                            width: `${summary.percentage}%`,
                            height: '100%',
                            background: 'var(--primary)',
                            transition: 'width 1s ease-out'
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-secondary)' }}>
                        <span>₹{(summary.paid || 0).toLocaleString('en-IN')} cleared</span>
                        <span>₹{(summary.total || 0).toLocaleString('en-IN')} outstanding</span>
                    </div>
                </div>

                {/* 3. Investments Tracker */}
                <div
                    className="glass-card"
                    onClick={() => navigate('/investments')}
                    style={{ cursor: 'pointer', marginBottom: '16px', borderLeft: '8px solid var(--success)' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div className="label" style={{ marginBottom: 0 }}>Investments Tracker</div>
                        <div style={{ fontSize: '24px' }}>🌱</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Invested</div>
                            <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--success)' }}>
                                ₹{(summary.totalInvested || 0).toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Expected Yield</div>
                            <div style={{ fontSize: '22px', fontWeight: '700' }}>
                                ₹{(summary.expectedMaturity || 0).toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Lending Overview */}
                <div
                    className="glass-card"
                    onClick={() => navigate('/borrowers')}
                    style={{ cursor: 'pointer', marginBottom: '16px' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div className="label" style={{ marginBottom: 0 }}>Lending Overall</div>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 12px', borderRadius: '20px' }}>
                            {allBorrowers.filter(b => b.status === 'active').length} Active Borrowers
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Principal Lent</div>
                            <div style={{ fontSize: '22px', fontWeight: '700' }}>
                                ₹{allBorrowers.reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0).toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Outstanding</div>
                            <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--danger)' }}>
                                ₹{(allBorrowers.reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0) -
                                    allBorrowers.reduce((acc, b) => acc + (b.settlements?.reduce((s, set) => s + (parseFloat(set.amount) || 0), 0) || 0), 0)
                                ).toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>



            {/* Bottom Nav Component */}
            <BottomNav />
        </>
    );
}
