import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Helper to get config from Settings
const getConfig = () => {
    const stored = localStorage.getItem('firebaseConfig');
    return stored ? JSON.parse(stored) : null;
};

let app, db, auth;

const config = getConfig();

if (config) {
    try {
        app = initializeApp(config);
        db = getFirestore(app);
        auth = getAuth(app);
    } catch (error) {
        console.error("Firebase Initialization Error:", error);
    }
}

export { db, auth };
export const isConfigured = () => !!app;
