// SDAPWA v1.3.1 - Authentication (FIXED: correct method names)

const Auth = {
    currentUser: null,
    authStateListenerAdded: false,
    
    isIOSPWA() {
        return (window.navigator.standalone === true) || 
               (window.matchMedia('(display-mode: standalone)').matches && /iPhone|iPad|iPod/.test(navigator.userAgent));
    },
    
    // Initialize auth state listener
    init() {
        if (this.authStateListenerAdded) return;
        this.authStateListenerAdded = true;
        
        // Handle redirect result for iOS PWA
        window.auth.getRedirectResult().then((result) => {
            if (result && result.user) {
                console.log('📱 Redirect sign-in successful');
            }
        }).catch((error) => {
            console.error('Redirect error:', error);
        });
        
        // Listen for auth state changes
        window.auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user ? user.email : 'signed out');
            this.currentUser = user;
            
            if (user) {
                this.onSignedIn(user);
            } else {
                this.onSignedOut();
            }
        });
    },
    
    // Sign in with Google
    async signIn() {
        try {
            console.log('Starting Google sign-in...');
            
            // Check if iOS PWA - use redirect instead of popup
            if (this.isIOSPWA()) {
                console.log('📱 iOS PWA detected - using redirect method');
                await window.auth.signInWithRedirect(window.googleProvider);
                // Page will redirect, so no code after this runs
                return null;
            } else {
                // Use popup for desktop/browser
                const result = await window.auth.signInWithPopup(window.googleProvider);
                console.log('Sign-in successful:', result.user.email);
                this.showToast('Signed in successfully! ✓', 'success');
                return result.user;
            }
        } catch (error) {
            console.error('Sign-in error:', error);
            
            // Handle specific errors
            if (error.code === 'auth/popup-blocked') {
                this.showToast('Popup blocked. Please allow popups.', 'error');
            } else if (error.code === 'auth/popup-closed-by-user') {
                this.showToast('Sign-in cancelled', 'info');
            } else if (error.code === 'auth/cancelled-popup-request') {
                // Ignore - this happens when multiple popups are requested
            } else if (error.code === 'auth/network-request-failed') {
                this.showToast('Network error. Please check your connection.', 'error');
            } else if (error.code === 'auth/unauthorized-domain') {
                // Try redirect method as fallback
                console.log('Trying redirect method as fallback...');
                try {
                    await window.auth.signInWithRedirect(window.googleProvider);
                } catch (redirectError) {
                    console.error('Redirect also failed:', redirectError);
                    this.showToast('Sign-in failed. Please try again.', 'error');
                }
            } else {
                this.showToast('Sign-in failed: ' + error.message, 'error');
            }
            return null;
        }
    },
    
    // Sign out
    async signOut() {
        try {
            // Stop sync
            if (window.syncManager) {
                window.syncManager.stopListening();
            }
            
            // Stop geofence monitor
            if (window.geofenceMonitor) {
                window.geofenceMonitor.stop();
            }
            
            await window.auth.signOut();
            this.showToast('Signed out', 'info');
        } catch (error) {
            console.error('Sign-out error:', error);
            this.showToast('Sign-out failed', 'error');
        }
    },
    
    // Get current user ID
    getUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    },
    
    // Get current user email
    getUserEmail() {
        return this.currentUser ? this.currentUser.email : null;
    },
    
    // Callback when user signs in
    async onSignedIn(user) {
        console.log('📱 User signed in, initializing app...');
        
        try {
            // Register device
            await this.registerDevice(user.uid);
            console.log('✓ Device registered');
            
            // Initialize sync
            if (window.SyncManager && window.db) {
                console.log('Creating SyncManager...');
                window.syncManager = new window.SyncManager(window.db, user.uid);
                window.syncManager.startListening(); // FIXED: was startSync()
                console.log('✓ SyncManager started');
            } else {
                console.warn('SyncManager or db not available');
            }
            
            // Initialize geofence monitor
            if (window.GeofenceMonitor) {
                console.log('Creating GeofenceMonitor...');
                window.geofenceMonitor = new window.GeofenceMonitor(user.uid);
                window.geofenceMonitor.start();
                console.log('✓ GeofenceMonitor started');
            }
            
            // Show dashboard
            if (window.App) {
                window.App.showScreen(window.CONSTANTS.SCREENS.DASHBOARD);
                console.log('✓ Dashboard shown');
            }
            
            // Hide loading screen
            this.hideLoadingScreen();
            console.log('✓ App initialization complete');
            
        } catch (error) {
            console.error('Error initializing app after sign-in:', error);
            console.error('Error details:', error.message, error.stack);
            this.showToast('Failed to initialize app: ' + error.message, 'error');
            // Still try to show dashboard even if initialization partially failed
            if (window.App) {
                window.App.showScreen(window.CONSTANTS.SCREENS.DASHBOARD);
            }
            this.hideLoadingScreen();
        }
    },
    
    // Callback when user signs out
    onSignedOut() {
        console.log('User signed out, showing sign-in screen');
        
        // Show sign-in screen
        if (window.App) {
            window.App.showScreen(window.CONSTANTS.SCREENS.SIGNIN);
        }
        
        // Hide loading screen
        this.hideLoadingScreen();
    },
    
    // Register device in Firestore
    async registerDevice(userId) {
        try {
            // Get or create device info
            let deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
            
            if (!deviceId) {
                deviceId = 'pwa-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID, deviceId);
            }
            
            // Determine device name
            const userAgent = navigator.userAgent;
            let deviceName = 'PWA';
            if (/iPhone/.test(userAgent)) deviceName = 'iPhone PWA';
            else if (/iPad/.test(userAgent)) deviceName = 'iPad PWA';
            else if (/Android/.test(userAgent)) deviceName = 'Android PWA';
            else if (/Mac/.test(userAgent)) deviceName = 'Mac PWA';
            else if (/Windows/.test(userAgent)) deviceName = 'Windows PWA';
            
            window.Storage.set(window.CONSTANTS.STORAGE_KEYS.DEVICE_NAME, deviceName);
            
            // Register in Firestore
            await window.db.collection('users').doc(userId).collection('devices').doc(deviceId).set({
                device_id: deviceId,
                device_name: deviceName,
                platform: 'pwa',
                created_at: window.DateTimeUtils.utcNowISO(),
                last_sync: window.DateTimeUtils.utcNowISO(),
                app_version: window.CONSTANTS.APP_VERSION
            }, { merge: true });
            
            console.log('Device registered:', deviceId);
            
        } catch (error) {
            console.error('Error registering device:', error);
            // Don't throw - device registration failure shouldn't block app
        }
    },
    
    // Show toast message
    showToast(message, type = 'info') {
        if (window.App && window.App.showToast) {
            window.App.showToast(message, type);
        } else {
            console.log(`Toast (${type}): ${message}`);
        }
    },
    
    // Show loading screen
    showLoadingScreen() {
        const loading = document.getElementById('loading-screen');
        if (loading) loading.style.display = 'flex';
    },
    
    // Hide loading screen
    hideLoadingScreen() {
        const loading = document.getElementById('loading-screen');
        if (loading) loading.style.display = 'none';
    }
};

window.Auth = Auth;
console.log('✓ Auth module loaded (v1.3.1 fixed)');
