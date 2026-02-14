import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';

export default function ScheduledPayments() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('debt'); // New state for category
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name || !startDate || !endDate || !amount) {
            alert("All fields are required.");
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const monthlyAmount = parseFloat(amount);

        if (start > end) {
            alert("Start date must be before end date.");
            return;
        }

        if (isNaN(monthlyAmount) || monthlyAmount <= 0) {
            alert("Please enter a valid amount.");
            return;
        }

        setLoading(true);

        try {
            const batch = writeBatch(db);
            const collectionRef = collection(db, 'emis');

            let currentDate = new Date(start);
            // Ensure we start from the 1st of the month to avoid edge cases or keep user date?
            // Usually EMIs are on a specific day. Let's keep the user's day.

            let count = 0;
            while (currentDate <= end) {
                const docRef = doc(collectionRef);
                const docData = {
                    uid: auth.currentUser.uid,
                    bank: name,
                    date: currentDate.toISOString(),
                    amount: monthlyAmount,
                    category: category, // Save category
                    // Principal/Interest/Balance are unknown for simple schedule
                    type: 'manual_schedule',
                    createdAt: new Date().toISOString()
                };

                batch.set(docRef, docData);

                // Advance one month
                // Handle edge case: Jan 31 -> Feb 28
                const d = new Date(currentDate);
                d.setMonth(d.getMonth() + 1);
                currentDate = d;
                count++;
            }

            await batch.commit();
            alert(`Successfully scheduled ${count} payments for ${name}!`);
            navigate('/tracker');

        } catch (error) {
            console.error("Error saving schedule:", error);
            alert("Failed to save schedule.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container fade-in">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px', gap: '16px' }}>
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
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Schedule</h1>
            </div>

            <div className="glass-card">
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Description / Holder</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Car Loan, Rent, LIC"
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Monthly Amount (₹)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Type of commitment</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            <div
                                onClick={() => setCategory('debt')}
                                style={{
                                    background: category === 'debt' ? '#fff' : 'rgba(255,255,255,0.05)',
                                    color: category === 'debt' ? '#000' : 'rgba(255,255,255,0.6)',
                                    padding: '12px 8px',
                                    borderRadius: '14px',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    fontWeight: '800',
                                    fontSize: '11px',
                                    border: category === 'debt' ? '1px solid #fff' : '1px solid transparent',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                Loan / Debt
                            </div>
                            <div
                                onClick={() => setCategory('planned')}
                                style={{
                                    background: category === 'planned' ? '#fff' : 'rgba(255,255,255,0.05)',
                                    color: category === 'planned' ? '#000' : 'rgba(255,255,255,0.6)',
                                    padding: '12px 8px',
                                    borderRadius: '14px',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    fontWeight: '800',
                                    fontSize: '11px',
                                    border: category === 'planned' ? '1px solid #fff' : '1px solid transparent',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                Planned Expense
                            </div>
                            <div
                                onClick={() => setCategory('investment')}
                                style={{
                                    background: category === 'investment' ? '#fff' : 'rgba(255,255,255,0.05)',
                                    color: category === 'investment' ? '#000' : 'rgba(255,255,255,0.6)',
                                    padding: '12px 8px',
                                    borderRadius: '14px',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    fontWeight: '800',
                                    fontSize: '11px',
                                    border: category === 'investment' ? '1px solid #fff' : '1px solid transparent',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                Investment
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ height: '60px', fontSize: '18px', background: '#fff', color: '#000' }}
                    >
                        {loading ? 'Building Amortization...' : 'Deploy Schedule'}
                    </button>
                </form>
            </div>
        </div>
    );
}
