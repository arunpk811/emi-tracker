import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';

export default function Income() {
    const navigate = useNavigate();
    const today = new Date();
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');

    // For filtering the list
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    // For the form
    const [inputMonth, setInputMonth] = useState(today.getMonth());
    const [inputYear, setInputYear] = useState(today.getFullYear());

    const [incomes, setIncomes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
            if (!currentUser) return;

            const q = query(collection(db, 'income'), where("uid", "==", currentUser.uid));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setIncomes(fetched);
                setLoading(false);
            });

            return () => unsubscribe();
        });

        return () => unsubscribeAuth();
    }, []);

    const handleAddIncome = async (e) => {
        e.preventDefault();
        if (!name || !amount) return;

        try {
            const incomeDate = new Date(inputYear, inputMonth, 1).toISOString();

            if (editingId) {
                await updateDoc(doc(db, 'income', editingId), {
                    name,
                    amount: parseFloat(amount),
                    date: incomeDate,
                    updatedAt: new Date().toISOString()
                });
                setEditingId(null);
            } else {
                await addDoc(collection(db, 'income'), {
                    uid: auth.currentUser.uid,
                    name,
                    amount: parseFloat(amount),
                    date: incomeDate,
                    createdAt: new Date().toISOString()
                });
            }

            setName('');
            setAmount('');
            setShowForm(false);
        } catch (error) {
            console.error("Error saving income:", error);
            alert("Failed to save income.");
        }
    };

    const handleEdit = (item) => {
        const itemDate = new Date(item.date || item.createdAt);
        setName(item.name);
        setAmount(item.amount);
        setInputMonth(itemDate.getMonth());
        setInputYear(itemDate.getFullYear());
        setEditingId(item.id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteIncome = async (id) => {
        if (!window.confirm("Delete this income source?")) return;
        try {
            await deleteDoc(doc(db, 'income', id));
        } catch (error) {
            console.error("Error deleting income:", error);
        }
    };

    const handleCopyPreviousMonth = async () => {
        // Calculate previous month
        let prevM = selectedMonth - 1;
        let prevY = selectedYear;
        if (prevM < 0) {
            prevM = 11;
            prevY = selectedYear - 1;
        }

        const prevIncomes = incomes.filter(inc => {
            const d = new Date(inc.date || inc.createdAt);
            return d.getMonth() === prevM && d.getFullYear() === prevY;
        });

        if (prevIncomes.length === 0) {
            alert(`No records found for ${months[prevM]} ${prevY} to copy.`);
            return;
        }

        if (!window.confirm(`Copy ${prevIncomes.length} records from ${months[prevM]} to ${months[selectedMonth]}?`)) {
            return;
        }

        try {
            const batch = writeBatch(db);
            const currentDate = new Date(selectedYear, selectedMonth, 1).toISOString();

            prevIncomes.forEach(item => {
                const newDocRef = doc(collection(db, 'income'));
                batch.set(newDocRef, {
                    uid: auth.currentUser.uid,
                    name: item.name,
                    amount: item.amount,
                    date: currentDate,
                    createdAt: new Date().toISOString(),
                    isCopy: true
                });
            });

            await batch.commit();
            alert("Incomes copied successfully!");
        } catch (error) {
            console.error("Error copying incomes:", error);
            alert("Failed to copy incomes.");
        }
    };

    const filteredIncomes = incomes.filter(inc => {
        const d = new Date(inc.date || inc.createdAt);
        return d.getMonth() === parseInt(selectedMonth) && d.getFullYear() === parseInt(selectedYear);
    });

    const totalIncome = filteredIncomes.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const years = Array.from({ length: 11 }, (_, i) => today.getFullYear() - 5 + i);

    return (
        <div className="container fade-in">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                        onClick={() => navigate('/dashboard')}
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '16px',
                            background: 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        <span style={{ fontSize: '20px' }}>←</span>
                    </div>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Income</h1>
                </div>
                <div
                    onClick={() => {
                        if (showForm) {
                            setEditingId(null);
                            setName('');
                            setAmount('');
                        }
                        setShowForm(!showForm);
                    }}
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '20px',
                        background: '#4ade80',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 8px 16px rgba(74, 222, 128, 0.3)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                >
                    <span style={{ fontSize: '32px', color: '#000', fontWeight: '400', lineHeight: 1 }}>{showForm ? '×' : '+'}</span>
                </div>
            </div>

            {/* Filter Section */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{ flex: 1 }}
                >
                    {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    style={{ flex: 1 }}
                >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>

            <button
                onClick={handleCopyPreviousMonth}
                style={{ width: '100%', marginBottom: '20px', padding: '10px', background: 'rgba(255,255,255,0.05)', fontSize: '12px' }}
            >
                📋 Copy from Previous Month
            </button>

            <div className="glass-card" style={{
                marginBottom: '32px',
                borderLeft: '8px solid #4ade80',
                background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.1) 0%, rgba(255,255,255,0.02) 100%)',
                padding: '28px'
            }}>
                <p style={{ fontSize: '12px', color: 'rgba(74, 222, 128, 0.8)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.05em' }}>
                    Monthly Total ({months[selectedMonth]} {selectedYear})
                </p>
                <h2 style={{ fontSize: 'clamp(28px, 9vw, 36px)', margin: 0, fontWeight: '800', letterSpacing: '-0.02em' }}>
                    {totalIncome.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </h2>
            </div>

            {showForm && (
                <div className="glass-card" style={{ marginBottom: '32px', border: editingId ? '2px solid #4ade80' : '1px solid rgba(255,255,255,0.1)', padding: '28px' }}>
                    <h3 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '700' }}>{editingId ? 'Edit Income' : 'Add New Income'}</h3>
                    <form onSubmit={handleAddIncome}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Source Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Primary Salary"
                                required
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Month</label>
                                <select value={inputMonth} onChange={(e) => setInputMonth(parseInt(e.target.value))}>
                                    {months.map((m, i) => <option key={m} value={i} style={{ background: '#222' }}>{m}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Year</label>
                                <select value={inputYear} onChange={(e) => setInputYear(parseInt(e.target.value))}>
                                    {years.map(y => <option key={y} value={y} style={{ background: '#222' }}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Monthly Amount (₹)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" className="btn-primary" style={{ flex: 2, background: '#4ade80', color: '#000' }}>
                                {editingId ? 'Update Income' : 'Add Income'}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={() => { setEditingId(null); setShowForm(false); setName(''); setAmount(''); }}
                                    style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            <div style={{ display: 'grid', gap: '10px' }}>
                {loading ? <p style={{ textAlign: 'center' }}>Loading...</p> :
                    filteredIncomes.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No income records for this period.</p> :
                        filteredIncomes.map(item => (
                            <div key={item.id} className="glass-card" style={{ padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ fontWeight: '500', fontSize: '16px' }}>{item.name}</p>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {months[new Date(item.date || item.createdAt).getMonth()]} {new Date(item.date || item.createdAt).getFullYear()}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontWeight: '600', color: '#4ade80', marginRight: '5px' }}>
                                        {item.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                    </span>
                                    <button
                                        onClick={() => handleEdit(item)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
                                        title="Edit"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => handleDeleteIncome(item.id)}
                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}
                                        title="Delete"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))
                }
            </div>
        </div>
    );
}
