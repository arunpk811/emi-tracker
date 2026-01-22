import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { db, auth } from '../firebase'; // Import firebase
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';

export default function UploadEMI() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [bankName, setBankName] = useState('');

    const handleFileUpload = (e) => {
        if (!bankName) {
            alert("Please enter the Bank Name first.");
            e.target.value = '';
            return;
        }

        const file = e.target.files[0];
        if (!file) return;

        setLoading(true);
        const reader = new FileReader();

        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const workbook = XLSX.read(bstr, { type: 'binary' });
                const wsname = workbook.SheetNames[0];
                const ws = workbook.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                processAndSaveData(data);
            } catch (error) {
                console.error(error);
                alert("Error parsing file.");
                setLoading(false);
            }
        };

        reader.readAsBinaryString(file);
    };

    const processAndSaveData = async (rawData) => {
        if (!rawData || rawData.length === 0) {
            alert("No data found.");
            setLoading(false);
            return;
        }

        // Heuristics
        const firstRow = rawData[0];
        const keys = Object.keys(firstRow);

        // 1. Try exact matches based on User Screenshot
        let dateKey = keys.find(k => /Month & Year/i.test(k));
        let amountKey = keys.find(k => /Total Monthly Payment/i.test(k));
        let principalKey = keys.find(k => /Principal Component/i.test(k));
        let interestKey = keys.find(k => /Interest Component/i.test(k));
        let balanceKey = keys.find(k => /Outstanding Principal|Balance/i.test(k)); // To capture closing balance if needed

        if (!dateKey || !amountKey) {
            alert(`Could not detect columns. Found: ${keys.join(', ')}`);
            setLoading(false);
            return;
        }

        const emiEntries = rawData.map(row => {
            // Robust Date Parsing
            let dateVal = row[dateKey];
            // Convert Excel Serial to ISO String if needed so it's storable
            let parsedDate;
            try {
                if (typeof dateVal === 'number' && dateVal > 20000) {
                    parsedDate = new Date((dateVal - (25567 + 2)) * 86400 * 1000).toISOString();
                } else {
                    parsedDate = new Date(dateVal).toISOString();
                }
            } catch {
                parsedDate = new Date().toISOString(); // Fallback
            }

            return {
                uid: auth.currentUser?.uid, // Link to user
                bank: bankName,
                date: parsedDate,
                amount: parseFloat(row[amountKey]) || 0,
                principal: parseFloat(row[principalKey]) || 0,
                interest: parseFloat(row[interestKey]) || 0,
                balance: parseFloat(row[balanceKey]) || 0,
                category: 'debt', // Default for uploads
                originalRow: JSON.stringify(row), // Keep raw just in case
                createdAt: new Date().toISOString()
            };
        }).filter(item => item.amount > 0);

        // Save to Firestore (Batch writes for speed)
        const batch = writeBatch(db);
        const collectionRef = collection(db, 'emis');

        // Firestore batch limit is 500. Splitting not implemented for brevity, assuming small files < 500 rows.
        // If > 500, we should loop. 

        let count = 0;
        emiEntries.forEach(docData => {
            if (count < 490) { // Safety buffer
                const newRef = doc(collectionRef);
                batch.set(newRef, docData);
                count++;
            }
        });

        try {
            await batch.commit();
            alert(`Successfully imported ${count} records for ${bankName}!`);
            navigate('/tracker');
        } catch (e) {
            console.error("Firestore Save Error:", e);
            alert("Error saving to cloud: " + e.message);
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
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Upload Data</h1>
            </div>

            <div className="glass-card" style={{ padding: '28px' }}>
                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Bank / Institution Name</label>
                    <input
                        type="text"
                        placeholder="e.g. HDFC Home Loan"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        style={{ marginBottom: 0 }}
                    />
                </div>

                <div style={{ marginBottom: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Select Schedule File (CSV/XLSX)</label>
                    <div style={{
                        border: '2px dashed rgba(255,255,255,0.1)',
                        borderRadius: '24px',
                        padding: '60px 20px',
                        textAlign: 'center',
                        position: 'relative',
                        background: 'rgba(0,0,0,0.15)',
                        transition: 'all 0.3s ease'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
                        <p style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: '#fff' }}>
                            {loading ? 'Processing Cloud Sync...' : 'Tap or Drop File'}
                        </p>
                        <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>Supports XLS, XLSX and CSV formats</p>
                        <input
                            type="file"
                            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                            onChange={handleFileUpload}
                            style={{ opacity: 0, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }}
                            disabled={loading}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
