import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import BottomNav from './BottomNav';

export default function Borrowers() {
    const navigate = useNavigate();
    const today = new Date();

    // Borrowers state
    const [borrowers, setBorrowers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingBorrower, setEditingBorrower] = useState(null);

    // Form state
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [borrowedDate, setBorrowedDate] = useState(today.toISOString().split('T')[0]);

    // Settlement state
    const [settlementModal, setSettlementModal] = useState(null); // Borrower ID
    const [settleAmount, setSettleAmount] = useState('');
    const [settleDate, setSettleDate] = useState(today.toISOString().split('T')[0]);
    const [settleNote, setSettleNote] = useState('');

    // Closure state
    const [closureModal, setClosureModal] = useState(null); // Borrower ID
    const [closureDesc, setClosureDesc] = useState('');

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
            if (!currentUser) return;

            const q = query(collection(db, 'borrowers'), where("uid", "==", currentUser.uid));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Sort by status (active first) then date
                fetched.sort((a, b) => {
                    if (a.status === 'active' && b.status === 'closed') return -1;
                    if (a.status === 'closed' && b.status === 'active') return 1;
                    return new Date(b.borrowedDate) - new Date(a.borrowedDate);
                });
                setBorrowers(fetched);
                setLoading(false);
            });

            return () => unsubscribe();
        });

        return () => unsubscribeAuth();
    }, []);

    const handleSaveBorrower = async (e) => {
        e.preventDefault();
        if (!name || !amount) return;

        try {
            if (editingBorrower) {
                await updateDoc(doc(db, 'borrowers', editingBorrower.id), {
                    name,
                    amount: parseFloat(amount),
                    borrowedDate,
                    updatedAt: new Date().toISOString()
                });
                setEditingBorrower(null);
            } else {
                await addDoc(collection(db, 'borrowers'), {
                    uid: auth.currentUser.uid,
                    name,
                    amount: parseFloat(amount),
                    borrowedDate,
                    status: 'active',
                    settlements: [],
                    createdAt: new Date().toISOString()
                });
            }

            setName('');
            setAmount('');
            setBorrowedDate(today.toISOString().split('T')[0]);
            setShowForm(false);
        } catch (error) {
            console.error("Error saving borrower:", error);
            alert("Failed to save borrower.");
        }
    };

    const handleAddSettlement = async (e) => {
        e.preventDefault();
        if (!settleAmount || !settlementModal) return;

        try {
            const borrowerRef = doc(db, 'borrowers', settlementModal);
            await updateDoc(borrowerRef, {
                settlements: arrayUnion({
                    amount: parseFloat(settleAmount),
                    date: settleDate,
                    note: settleNote,
                    id: Date.now().toString()
                })
            });
            setSettlementModal(null);
            setSettleAmount('');
            setSettleNote('');
        } catch (error) {
            console.error("Error adding settlement:", error);
            alert("Failed to add settlement.");
        }
    };

    const handleCloseBorrower = async (e) => {
        e.preventDefault();
        if (!closureModal) return;

        try {
            const borrowerRef = doc(db, 'borrowers', closureModal);
            await updateDoc(borrowerRef, {
                status: 'closed',
                closureDescription: closureDesc,
                closedAt: new Date().toISOString()
            });
            setClosureModal(null);
            setClosureDesc('');
        } catch (error) {
            console.error("Error closing borrower:", error);
            alert("Failed to close borrower.");
        }
    };

    const handleDeleteBorrower = async (id) => {
        if (!window.confirm("Delete this borrower record?")) return;
        try {
            await deleteDoc(doc(db, 'borrowers', id));
        } catch (error) {
            console.error("Error deleting borrower:", error);
        }
    };

    const totalLent = borrowers.reduce((acc, b) => acc + (parseFloat(b.amount) || 0), 0);
    const totalRecovered = borrowers.reduce((acc, b) => {
        const settled = b.settlements?.reduce((s, set) => s + (parseFloat(set.amount) || 0), 0) || 0;
        return acc + settled;
    }, 0);
    const outstanding = totalLent - totalRecovered;

    return (
        <div className="container fade-in" style={{ paddingBottom: '100px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Borrowers</h1>
                </div>
                <div
                    onClick={() => {
                        if (showForm) setEditingBorrower(null);
                        setShowForm(!showForm);
                    }}
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

            {/* Summary Card */}
            <div className="glass-card" style={{
                marginBottom: '32px',
                borderLeft: '8px solid #6366f1',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(255,255,255,0.02) 100%)',
                padding: '28px'
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                        <p style={{ fontSize: '11px', color: 'rgba(99, 102, 241, 0.8)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Total Lent</p>
                        <h2 style={{ fontSize: '24px', margin: 0, fontWeight: '800' }}>₹{totalLent.toLocaleString('en-IN')}</h2>
                    </div>
                    <div>
                        <p style={{ fontSize: '11px', color: '#4ade80', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Recovered</p>
                        <h2 style={{ fontSize: '24px', margin: 0, fontWeight: '800', color: '#4ade80' }}>₹{totalRecovered.toLocaleString('en-IN')}</h2>
                    </div>
                </div>
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>Outstanding Balance</p>
                    <h2 style={{ fontSize: '32px', margin: 0, fontWeight: '800', color: '#f87171' }}>₹{outstanding.toLocaleString('en-IN')}</h2>
                </div>
            </div>

            {showForm && (
                <div className="glass-card" style={{ marginBottom: '32px', border: editingBorrower ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)', padding: '28px' }}>
                    <h3 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '700' }}>{editingBorrower ? 'Edit Record' : 'Lend Money'}</h3>
                    <form onSubmit={handleSaveBorrower}>
                        <div style={{ marginBottom: '20px' }}>
                            <label className="label">Borrower Name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Who is borrowing?" required />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label className="label">Amount (₹)</label>
                            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label className="label">Date</label>
                            <input type="date" value={borrowedDate} onChange={(e) => setBorrowedDate(e.target.value)} required />
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" className="btn-primary" style={{ flex: 1, background: '#6366f1' }}>{editingBorrower ? 'Update' : 'Save'}</button>
                            <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditingBorrower(null); }} style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div style={{ display: 'grid', gap: '16px' }}>
                {loading ? <p style={{ textAlign: 'center' }}>Loading...</p> :
                    borrowers.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No borrower records found.</p> :
                        borrowers.map(b => {
                            const recovered = b.settlements?.reduce((s, set) => s + (parseFloat(set.amount) || 0), 0) || 0;
                            const bal = (parseFloat(b.amount) || 0) - recovered;
                            const isClosed = b.status === 'closed';

                            return (
                                <div key={b.id} className="glass-card" style={{ padding: '24px', position: 'relative', opacity: isClosed ? 0.6 : 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>{b.name}</h3>
                                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Borrowed on {new Date(b.borrowedDate).toLocaleDateString()}</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{
                                                fontSize: '10px',
                                                fontWeight: '900',
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                background: isClosed ? 'rgba(255,255,255,0.05)' : 'rgba(99, 102, 241, 0.2)',
                                                color: isClosed ? 'rgba(255,255,255,0.4)' : '#6366f1',
                                                textTransform: 'uppercase'
                                            }}>
                                                {b.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                                        <div>
                                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Principal</p>
                                            <p style={{ fontWeight: '700' }}>₹{parseFloat(b.amount).toLocaleString('en-IN')}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Settled</p>
                                            <p style={{ fontWeight: '700', color: '#4ade80' }}>₹{recovered.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Balance</p>
                                            <p style={{ fontWeight: '700', color: bal > 0 ? '#f87171' : '#4ade80' }}>₹{bal.toLocaleString('en-IN')}</p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', marginBottom: '20px' }}>
                                        <div style={{
                                            width: `${Math.min(100, (recovered / parseFloat(b.amount)) * 100)}%`,
                                            height: '100%',
                                            background: '#4ade80',
                                            transition: 'width 1s ease'
                                        }} />
                                    </div>

                                    {!isClosed && (
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button className="btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '12px' }} onClick={() => setSettlementModal(b.id)}>Recover</button>
                                            <button className="btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '12px' }} onClick={() => setClosureModal(b.id)}>Close</button>
                                        </div>
                                    )}

                                    {isClosed && b.closureDescription && (
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                                            " {b.closureDescription} "
                                        </div>
                                    )}

                                    {/* Sub-list of settlements */}
                                    {b.settlements?.length > 0 && (
                                        <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px' }}>History</p>
                                            {b.settlements.map(s => (
                                                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                                                    <span>{new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} <span style={{ opacity: 0.4, fontSize: '11px' }}> - {s.note}</span></span>
                                                    <span style={{ fontWeight: '600', color: '#4ade80' }}>+₹{s.amount.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '8px' }}>
                                        <button onClick={() => { setEditingBorrower(b); setName(b.name); setAmount(b.amount); setBorrowedDate(b.borrowedDate); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3 }}>✏️</button>
                                        <button onClick={() => handleDeleteBorrower(b.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.3 }}>🗑️</button>
                                    </div>
                                </div>
                            );
                        })
                }
            </div>

            {/* Recovery Modal */}
            {settlementModal && (
                <div className="modal-overlay" onClick={() => setSettlementModal(null)}>
                    <div className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '400px' }}>
                        <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '700' }}>Add Settlement</h3>
                        <form onSubmit={handleAddSettlement}>
                            <div style={{ marginBottom: '16px' }}>
                                <label className="label">Amount Received (₹)</label>
                                <input type="number" value={settleAmount} onChange={e => setSettleAmount(e.target.value)} required placeholder="0.00" />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label className="label">Date</label>
                                <input type="date" value={settleDate} onChange={e => setSettleDate(e.target.value)} required />
                            </div>
                            <div style={{ marginBottom: '24px' }}>
                                <label className="label">Note</label>
                                <input type="text" value={settleNote} onChange={e => setSettleNote(e.target.value)} placeholder="e.g. UPI, Cash" />
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1, background: '#4ade80', color: '#000' }}>Save</button>
                                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setSettlementModal(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Closure Modal */}
            {closureModal && (
                <div className="modal-overlay" onClick={() => setClosureModal(null)}>
                    <div className="glass-card modal-content" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '400px' }}>
                        <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '700' }}>Close Settlement</h3>
                        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '20px' }}>Are you sure you want to close this record? No more recoveries can be added.</p>
                        <form onSubmit={handleCloseBorrower}>
                            <div style={{ marginBottom: '24px' }}>
                                <label className="label">Closing Description</label>
                                <textarea
                                    value={closureDesc}
                                    onChange={e => setClosureDesc(e.target.value)}
                                    placeholder="e.g. Account settled in full"
                                    style={{ width: '100%', height: '80px', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="submit" className="btn-primary" style={{ flex: 1, background: '#f87171' }}>Close Now</button>
                                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setClosureModal(null)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.8);
                    backdrop-filter: blur(10px);
                    z-index: 3000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .label {
                    display: block;
                    margin-bottom: 8px;
                    font-size: 13px;
                    font-weight: 700;
                    color: rgba(255,255,255,0.5);
                    text-transform: uppercase;
                }
            `}</style>
            <BottomNav />
        </div>
    );
}
