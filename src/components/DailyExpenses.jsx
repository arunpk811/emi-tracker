import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, orderBy } from 'firebase/firestore';
import BottomNav from './BottomNav';

export default function DailyExpenses() {
    const navigate = useNavigate();
    const today = new Date().toISOString().split('T')[0];
    
    const [amount, setAmount] = useState('');
    const [name, setName] = useState('');
    const [date, setDate] = useState(today);
    const [category, setCategory] = useState('Daily');
    const [type, setType] = useState('Expense'); // 'Expense' or 'Income'
    
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);

    const categories = {
        Expense: ['Food', 'Daily', 'Health', 'Toys', 'Skincare', 'Digital Subscription', 'Other Expenses'],
        Income: ['Daily Income', 'Other Income']
    };

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
            if (!currentUser) return;

            // Fetch daily records
            const q = query(
                collection(db, 'daily_records'), 
                where("uid", "==", currentUser.uid)
            );
            const unsubRecords = onSnapshot(q, (snapshot) => {
                const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Sort by date (desc), then by submission time (desc) if dates are same
                fetched.sort((a, b) => {
                    const dateDiff = new Date(b.date) - new Date(a.date);
                    if (dateDiff !== 0) return dateDiff;
                    
                    const timeA = new Date(a.createdAt || a.updatedAt || 0);
                    const timeB = new Date(b.createdAt || b.updatedAt || 0);
                    return timeB - timeA;
                });
                setRecords(fetched);
                setLoading(false);
            }, (err) => {
                console.error("Daily records listener error:", err);
                setLoading(false);
            });

            return () => unsubRecords();
        });

        return () => unsubscribeAuth();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || !date || !category) return;

        try {
            const data = {
                uid: auth.currentUser.uid,
                amount: parseFloat(amount),
                name,
                date,
                category,
                type,
                updatedAt: new Date().toISOString()
            };

            if (editingId) {
                await updateDoc(doc(db, 'daily_records', editingId), data);
                setEditingId(null);
            } else {
                await addDoc(collection(db, 'daily_records'), {
                    ...data,
                    createdAt: new Date().toISOString()
                });
            }

            setAmount('');
            setName('');
            setDate(today);
            setCategory(type === 'Expense' ? 'Daily' : 'Daily Income');
        } catch (error) {
            console.error("Error saving record:", error);
            alert("Failed to save record.");
        }
    };

    const handleEdit = (item) => {
        setAmount(item.amount);
        setName(item.name || '');
        setDate(item.date);
        setType(item.type || 'Expense');
        setCategory(item.category);
        setEditingId(item.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this entry?")) return;
        try {
            await deleteDoc(doc(db, 'daily_records', id));
        } catch (error) {
            console.error("Error deleting record:", error);
        }
    };

    const currentMonthRecords = records.filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
    });

    const totalDailyExpenses = currentMonthRecords
        .filter(r => r.type === 'Expense')
        .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    
    const totalDailyIncome = currentMonthRecords
        .filter(r => r.type === 'Income')
        .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

    return (
        <div className="container fade-in" style={{ paddingBottom: '100px' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800' }}>Daily Expenses</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Track your everyday spending</p>
            </div>

            <div className="glass-card" style={{ 
                background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', 
                border: 'none',
                color: 'white',
                padding: '28px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '12px', opacity: 0.8, fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                            Daily Expenses (This Month)
                        </div>
                        <div style={{ fontSize: '36px', fontWeight: '800' }}>
                            ₹{totalDailyExpenses.toLocaleString('en-IN')}
                        </div>
                    </div>
                    {totalDailyIncome > 0 && (
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: '600', marginBottom: '4px' }}>Daily Income</div>
                            <div style={{ fontSize: '18px', fontWeight: '700', color: '#4ade80' }}>+₹{totalDailyIncome.toLocaleString('en-IN')}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Form */}
            <div className="glass-card" style={{ marginTop: '24px' }}>
                <h3 style={{ marginBottom: '20px' }}>{editingId ? 'Edit Entry' : 'Add New Entry'}</h3>
                
                {/* Type Toggle */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <button 
                        onClick={() => { setType('Expense'); setCategory('Daily'); }}
                        style={{ 
                            flex: 1, 
                            background: type === 'Expense' ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface)',
                            color: type === 'Expense' ? '#ef4444' : 'var(--text-secondary)',
                            border: `1px solid ${type === 'Expense' ? '#ef4444' : 'var(--border)'}`,
                            padding: '10px'
                        }}
                    >
                        💸 Expense
                    </button>
                    <button 
                        onClick={() => { setType('Income'); setCategory('Daily Income'); }}
                        style={{ 
                            flex: 1, 
                            background: type === 'Income' ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface)',
                            color: type === 'Income' ? '#10b981' : 'var(--text-secondary)',
                            border: `1px solid ${type === 'Income' ? '#10b981' : 'var(--border)'}`,
                            padding: '10px'
                        }}
                    >
                        💰 Income
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label className="label">Amount (₹)</label>
                        <input 
                            type="number" 
                            value={amount} 
                            onChange={(e) => setAmount(e.target.value)} 
                            placeholder="0.00" 
                            required 
                        />
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                        <label className="label">Custom Name (optional)</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            placeholder="e.g. Lunch with team, Groceries..." 
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label className="label">Category</label>
                        <select 
                            value={category} 
                            onChange={(e) => setCategory(e.target.value)}
                        >
                            {categories[type].map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label className="label">Date</label>
                        <input 
                            type="date" 
                            value={date} 
                            onChange={(e) => setDate(e.target.value)} 
                            required 
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button type="submit" className="btn-primary" style={{ flex: 2 }}>
                            {editingId ? 'Update Entry' : 'Submit Entry'}
                        </button>
                        {editingId && (
                            <button 
                                type="button" 
                                className="btn-secondary" 
                                style={{ flex: 1 }}
                                onClick={() => {
                                    setEditingId(null);
                                    setAmount('');
                                    setName('');
                                    setDate(today);
                                    setType('Expense');
                                    setCategory('Daily');
                                }}
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* List */}
            <div style={{ marginTop: '32px' }}>
                <h3 style={{ marginBottom: '16px' }}>Recent Entries</h3>
                {loading ? <p>Loading...</p> : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {records.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>No entries found.</p>
                        ) : records.map(item => (
                            <div key={item.id} className="glass-card" style={{ 
                                padding: '16px', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                borderLeft: `4px solid ${item.type === 'Income' ? 'var(--success)' : 'var(--danger)'}`
                            }}>
                                <div>
                                    <div style={{ fontWeight: '700', fontSize: '16px' }}>{item.name || item.category}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        {item.name ? `${item.category} • ` : ''}{item.date}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ fontWeight: '800', fontSize: '18px', color: item.type === 'Income' ? 'var(--success)' : 'white' }}>
                                        {item.type === 'Income' ? '+' : '-'}₹{parseFloat(item.amount).toLocaleString('en-IN')}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                            onClick={() => handleEdit(item)}
                                            style={{ padding: '8px', minHeight: 'auto', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}
                                        >
                                            ✏️
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(item.id)}
                                            style={{ padding: '8px', minHeight: 'auto', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    );
}
