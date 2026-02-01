// SDAPWA v1.0.0 - Firebase Configuration

// Firebase configuration for project "simplydonesync"
const firebaseConfig = {
    apiKey: "AIzaSyDKmj5YhwFNK90dLq3Um-nMkqqU9Yu5R0E",
    authDomain: "simplydonesync.firebaseapp.com",
    projectId: "simplydonesync",
    storageBucket: "simplydonesync.firebasestorage.app",
    messagingSenderId: "389712724470",
    appId: "1:389712724470:web:0a3f48dde195c1de29c7d7",
    measurementId: "G-ZCCCT2F8R8"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('✓ Firebase initialized');
    console.log('  Project:', firebaseConfig.projectId);
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
}

// Initialize Firebase services
window.auth = firebase.auth();
window.db = firebase.firestore();

// Configure Firestore settings
window.db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// Enable offline persistence
window.db.enablePersistence()
    .then(() => {
        console.log('✓ Firestore offline persistence enabled');
    })
    .catch((error) => {
        if (error.code === 'failed-precondition') {
            console.warn('⚠️ Persistence failed: Multiple tabs open');
        } else if (error.code === 'unimplemented') {
            console.warn('⚠️ Persistence not supported by this browser');
        } else {
            console.error('❌ Persistence error:', error);
        }
    });

// Google Auth Provider
window.googleProvider = new firebase.auth.GoogleAuthProvider();

// Export Firebase instances
window.firebase = firebase;

console.log('✓ Firebase config loaded');

// Firebase configuration is now active and ready to use!
// This connects to your existing "simplydonesync" Firebase project.
