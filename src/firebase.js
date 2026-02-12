import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Helper to get config from Settings
const getConfig = () => {
    const stored = localStorage.getItem('firebaseConfig');
    return stored ? JSON.parse(stored) : null;
};

let app, db, auth, googleProvider;

const config = getConfig();

if (config) {
    try {
        app = initializeApp(config);
        db = getFirestore(app);
        auth = getAuth(app);
        googleProvider = new GoogleAuthProvider();
    } catch (error) {
        console.error("Firebase Initialization Error:", error);
    }
}

export { db, auth, googleProvider };
export const isConfigured = () => !!app;
