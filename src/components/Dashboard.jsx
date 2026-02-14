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
    const [summary, setSummary] = useState({
        total: 0,
        paid: 0,
        percentage: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0
    });

    useEffect(() => {
        let unsubEmis, unsubIncomes, unsubBorrowers;

        const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
            if (unsubEmis) unsubEmis();
            if (unsubIncomes) unsubIncomes();
            if (unsubBorrowers) unsubBorrowers();

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
        });

        return () => {
            unsubscribeAuth();
            if (unsubEmis) unsubEmis();
            if (unsubIncomes) unsubIncomes();
            if (unsubBorrowers) unsubBorrowers();
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

                {/* Balance Card */}
                <div className="glass-card" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #1e40af 100%)', border: 'none', marginBottom: '16px' }}>
                    <div className="label" style={{ color: 'rgba(255,255,255,0.8)' }}>Available Balance</div>
                    <div className="stat-value" style={{ color: 'white', marginTop: '4px', marginBottom: '20px', fontSize: '36px' }}>
                        ₹{remaining.toLocaleString('en-IN')}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.15)', padding: '14px', borderRadius: '12px' }}>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginBottom: '4px', fontWeight: '600' }}>Income</div>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>
                                ₹{summary.monthlyIncome.toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.15)', padding: '14px', borderRadius: '12px' }}>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginBottom: '4px', fontWeight: '600' }}>Expenses</div>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: 'white' }}>
                                ₹{summary.monthlyExpenses.toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Debt Progress */}
                <div
                    className="glass-card"
                    onClick={() => navigate('/tracker')}
                    style={{ cursor: 'pointer' }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div className="label" style={{ marginBottom: 0 }}>Debt Progress</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)' }}>
                            {Math.round(summary.percentage)}%
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
                        <span>₹{summary.paid.toLocaleString('en-IN')} paid</span>
                        <span>₹{summary.total.toLocaleString('en-IN')} total</span>
                    </div>
                </div>

                {/* Lending Overview */}
                {allBorrowers.length > 0 && (
                    <div className="glass-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div className="label" style={{ marginBottom: 0 }}>Lending</div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 12px', borderRadius: '20px' }}>
                                {allBorrowers.filter(b => b.status === 'active').length} Active
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Lent</div>
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
                )}
            </div>



            {/* Bottom Nav Component */}
            <BottomNav />
        </>
    );
}
