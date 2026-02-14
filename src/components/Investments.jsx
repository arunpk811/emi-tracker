import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import BottomNav from './BottomNav';

export default function Investments() {
    const navigate = useNavigate();
    const [investments, setInvestments] = useState([]);
    const [form, setForm] = useState({ name: '', principal: '', roi: '', tenure: '' });
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        if (!auth.currentUser) return;
        const q = query(collection(db, 'investments'), where("uid", "==", auth.currentUser.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setInvestments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!form.name || !form.principal || !form.roi || !form.tenure) return;

        const principal = parseFloat(form.principal);
        const rate = parseFloat(form.roi) / 100;
        const time = parseFloat(form.tenure); // in years

        // Simple Interest Formula for MVP (A = P(1 + rt)) or Compound?
        // Let's assume Compound Interest Annually: A = P(1 + r/n)^(nt) where n=1
        const amount = principal * Math.pow((1 + rate), time);

        await addDoc(collection(db, 'investments'), {
            uid: auth.currentUser.uid,
            name: form.name,
            principal,
            roi: parseFloat(form.roi),
            tenure: time,
            maturityAmount: amount,
            createdAt: new Date().toISOString()
        });

        setForm({ name: '', principal: '', roi: '', tenure: '' });
        setShowForm(false);
    };

    return (
        <div className="container fade-in" style={{ paddingBottom: '100px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Investment</h1>
                </div>
                <div
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '20px',
                        background: '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                >
                    <span style={{ fontSize: '32px', color: '#fff', fontWeight: '400', lineHeight: 1 }}>{showForm ? '×' : '+'}</span>
                </div>
            </div>

            {showForm && (
                <div className="glass-card" style={{ marginBottom: '32px', padding: '28px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <h3 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '700' }}>Add New Plan</h3>
                    <form onSubmit={handleAdd}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Asset Name</label>
                            <input
                                type="text" placeholder="e.g. FD, SIP, Mutual Fund"
                                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Principal Amount (₹)</label>
                            <input
                                type="number" placeholder="0.00"
                                value={form.principal} onChange={e => setForm({ ...form, principal: e.target.value })}
                                required
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>ROI (%)</label>
                                <input
                                    type="number" step="0.1" placeholder="8.5"
                                    value={form.roi} onChange={e => setForm({ ...form, roi: e.target.value })}
                                    required
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Tenure (Yrs)</label>
                                <input
                                    type="number" placeholder="5"
                                    value={form.tenure} onChange={e => setForm({ ...form, tenure: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn-primary" style={{ background: '#6366f1', color: '#fff' }}>Save Investment</button>
                    </form>
                </div>
            )}

            <div style={{ display: 'grid', gap: '16px' }}>
                {investments.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🌱</div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>No investments added yet.</p>
                    </div>
                ) : (
                    investments.map(inv => (
                        <div key={inv.id} className="glass-card" style={{ padding: '24px', borderLeft: '8px solid #6366f1' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'flex-start' }}>
                                <h3 style={{ fontSize: '18px', margin: 0, fontWeight: '700' }}>{inv.name}</h3>
                                <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                                    {inv.roi}% RoI
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div>
                                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>Invested</p>
                                    <p style={{ fontSize: '16px', fontWeight: '600' }}>{inv.principal.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>Maturity</p>
                                    <p style={{ fontSize: '22px', fontWeight: '800', color: '#fff', letterSpacing: '-0.01em' }}>
                                        {Math.round(inv.maturityAmount).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <BottomNav />
        </div>
    );
}
