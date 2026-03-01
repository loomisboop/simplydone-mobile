// SDAPWA v1.3.2 - Authentication (with Email/Password support for iOS PWA)

const Auth = {
    currentUser: null,
    isInitialized: false,
    
    // Detect if running as iOS PWA (standalone mode)
    isIOSPWA() {
        return (window.navigator.standalone === true) || 
               (window.matchMedia('(display-mode: standalone)').matches && /iPhone|iPad|iPod/.test(navigator.userAgent));
    },
    
    // Initialize auth state listener
    async init() {
        console.log('🔐 Initializing authentication...');
        
        if (this.isInitialized) {
            console.log('Auth already initialized');
            return;
        }
        this.isInitialized = true;
        
        // Check for redirect result (for non-PWA iOS Safari)
        try {
            const result = await window.auth.getRedirectResult();
            if (result && result.user) {
                console.log('✓ Redirect sign-in successful:', result.user.email);
            }
        } catch (error) {
            if (error.code !== 'auth/null-user') {
                console.log('Redirect result:', error.code);
            }
        }
        
        // Set up auth state listener
        window.auth.onAuthStateChanged((user) => {
            console.log('🔐 Auth state changed:', user ? user.email : 'no user');
            
            if (user) {
                this.currentUser = user;
                console.log('✓ User authenticated:', user.uid);
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.USER_ID, user.uid);
                this.onSignedIn(user);
            } else {
                this.currentUser = null;
                console.log('User not authenticated');
                this.onSignedOut();
            }
        });
    },
    
    // =========================================================================
    // EMAIL/PASSWORD AUTHENTICATION
    // =========================================================================
    
    // Sign in with Email/Password
    async signInWithEmail(email, password) {
        try {
            console.log('🔐 Signing in with email:', email);
            
            const result = await window.auth.signInWithEmailAndPassword(email, password);
            console.log('✓ Email sign-in successful');
            this.showToast('Signed in successfully!', 'success');
            return result.user;
            
        } catch (error) {
            console.error('❌ Email sign-in failed:', error.code, error.message);
            
            let message = 'Sign-in failed';
            switch (error.code) {
                case 'auth/user-not-found':
                    message = 'No account found with this email. Please create an account.';
                    break;
                case 'auth/wrong-password':
                    message = 'Incorrect password. Please try again.';
                    break;
                case 'auth/invalid-email':
                    message = 'Invalid email address.';
                    break;
                case 'auth/user-disabled':
                    message = 'This account has been disabled.';
                    break;
                case 'auth/too-many-requests':
                    message = 'Too many failed attempts. Please try again later.';
                    break;
                case 'auth/invalid-credential':
                    message = 'Invalid email or password. Please try again.';
                    break;
                default:
                    message = error.message;
            }
            
            this.showToast(message, 'error');
            throw error;
        }
    },
    
    // Sign up with Email/Password
    async signUpWithEmail(email, password) {
        try {
            console.log('🔐 Creating account for:', email);
            
            const result = await window.auth.createUserWithEmailAndPassword(email, password);
            console.log('✓ Account created successfully');
            this.showToast('Account created! Welcome to SimplyDone!', 'success');
            return result.user;
            
        } catch (error) {
            console.error('❌ Sign-up failed:', error.code, error.message);
            
            let message = 'Account creation failed';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    message = 'An account with this email already exists. Please sign in.';
                    break;
                case 'auth/invalid-email':
                    message = 'Invalid email address.';
                    break;
                case 'auth/weak-password':
                    message = 'Password is too weak. Please use at least 6 characters.';
                    break;
                case 'auth/operation-not-allowed':
                    message = 'Email/password accounts are not enabled.';
                    break;
                default:
                    message = error.message;
            }
            
            this.showToast(message, 'error');
            throw error;
        }
    },
    
    // Send password reset email
    async sendPasswordReset(email) {
        try {
            console.log('🔐 Sending password reset to:', email);
            
            await window.auth.sendPasswordResetEmail(email);
            console.log('✓ Password reset email sent');
            this.showToast('Password reset email sent! Check your inbox.', 'success');
            return true;
            
        } catch (error) {
            console.error('❌ Password reset failed:', error.code, error.message);
            
            let message = 'Failed to send reset email';
            switch (error.code) {
                case 'auth/user-not-found':
                    message = 'No account found with this email.';
                    break;
                case 'auth/invalid-email':
                    message = 'Invalid email address.';
                    break;
                default:
                    message = error.message;
            }
            
            this.showToast(message, 'error');
            throw error;
        }
    },
    
    // =========================================================================
    // GOOGLE AUTHENTICATION
    // =========================================================================
    
    // Sign in with Google
    async signInWithGoogle() {
        try {
            console.log('🔐 Starting Google Sign-In...');
            console.log('  iOS PWA:', this.isIOSPWA());
            
            const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
            
            if (this.isIOSPWA()) {
                // iOS PWA - OAuth redirect doesn't work, try popup
                console.log('📱 iOS PWA - attempting popup (redirect is broken in iOS PWA)');
                
                try {
                    const result = await window.auth.signInWithPopup(window.googleProvider);
                    if (result && result.user) {
                        console.log('✓ Google sign-in successful');
                        this.showToast('Signed in successfully!', 'success');
                        return result.user;
                    }
                } catch (popupError) {
                    console.log('Popup failed:', popupError.code);
                    
                    // Show helpful message for iOS PWA users
                    this.showToast('Google sign-in unavailable in Home Screen mode. Please use Email/Password instead.', 'error');
                    throw popupError;
                }
            } else if (isIOS) {
                // Regular iOS Safari - use redirect
                console.log('📱 iOS Safari - using redirect');
                await window.auth.signInWithRedirect(window.googleProvider);
                return null;
            } else {
                // Desktop/Android - use popup
                console.log('💻 Desktop/Android - using popup');
                const result = await window.auth.signInWithPopup(window.googleProvider);
                console.log('✓ Google sign-in successful');
                this.showToast('Signed in successfully!', 'success');
                return result.user;
            }
        } catch (error) {
            console.error('❌ Google sign-in failed:', error.code, error.message);
            
            let message = 'Sign-in failed';
            switch (error.code) {
                case 'auth/popup-closed-by-user':
                case 'auth/cancelled-popup-request':
                    message = 'Sign-in cancelled';
                    break;
                case 'auth/popup-blocked':
                    message = 'Popup blocked. Please use Email/Password sign-in.';
                    break;
                case 'auth/network-request-failed':
                    message = 'Network error. Please check your connection.';
                    break;
                default:
                    if (this.isIOSPWA()) {
                        message = 'Google sign-in unavailable. Please use Email/Password.';
                    }
            }
            
            this.showToast(message, 'error');
            throw error;
        }
    },
    
    // =========================================================================
    // SIGN OUT
    // =========================================================================
    
    async signOut() {
        try {
            console.log('🔐 Signing out...');
            
            if (!confirm('Are you sure you want to sign out?')) {
                return false;
            }
            
            // Stop services
            if (window.syncManager) {
                window.syncManager.stopSync();
                window.syncManager = null;
            }
            
            if (window.geofenceMonitor) {
                window.geofenceMonitor.stop();
                window.geofenceMonitor = null;
            }
            
            // Clear local data
            this.clearLocalData();
            
            // Sign out from Firebase
            await window.auth.signOut();
            
            console.log('✓ Signed out');
            this.showToast('Signed out successfully');
            
            return true;
        } catch (error) {
            console.error('❌ Sign-out failed:', error);
            this.showToast('Sign-out failed', 'error');
            throw error;
        }
    },
    
    // =========================================================================
    // HELPERS
    // =========================================================================
    
    getCurrentUser() {
        return this.currentUser || window.auth.currentUser;
    },
    
    getUserId() {
        const user = this.getCurrentUser();
        return user ? user.uid : null;
    },
    
    isSignedIn() {
        return this.getCurrentUser() !== null;
    },
    
    async onSignedIn(user) {
        console.log('📱 User signed in, initializing app...');
        
        try {
            // Register device
            await this.registerDevice(user.uid);
            
            // Initialize NotificationManager
            if (window.NotificationManager) {
                await window.NotificationManager.init();
                console.log('✓ NotificationManager initialized');
            }
            
            // Initialize FCM Client for push notifications
            if (window.FCMClient) {
                await window.FCMClient.init();
                // Request permission and token (will prompt user)
                const hasToken = window.Storage.get('fcm_token');
                if (!hasToken) {
                    // Don't auto-request on first sign-in, let Settings handle it
                    console.log('ℹ️ FCM initialized, token not yet requested');
                } else {
                    // Refresh token if we had one before
                    await window.FCMClient.requestPermissionAndToken();
                }
            }
            
            // Initialize sync
            if (window.SyncManager && !window.syncManager) {
                window.syncManager = new window.SyncManager(user.uid);
                window.syncManager.startSync();
            }
            
            // Initialize geofence monitor
            if (window.GeofenceMonitor && !window.geofenceMonitor) {
                window.geofenceMonitor = new window.GeofenceMonitor(user.uid);
                window.geofenceMonitor.start();
            }
            
            // Initialize TaskMonitor for scheduled task notifications
            if (window.TaskMonitor) {
                window.taskMonitor = new window.TaskMonitor();
                window.taskMonitor.start();
                console.log('✓ TaskMonitor started');
            }
            
            // Show dashboard
            if (window.App) {
                window.App.showScreen(window.CONSTANTS.SCREENS.DASHBOARD);
            }
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            console.log('✓ App initialized successfully');
            
        } catch (error) {
            console.error('Error initializing app after sign-in:', error);
            this.showToast('Failed to initialize app', 'error');
            this.hideLoadingScreen();
        }
    },
    
    onSignedOut() {
        console.log('User signed out, showing sign-in screen');
        
        if (window.App) {
            window.App.showScreen(window.CONSTANTS.SCREENS.SIGNIN);
        }
        
        this.hideLoadingScreen();
    },
    
    async registerDevice(userId) {
        try {
            let deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
            let deviceInfo;
            
            if (!deviceId) {
                deviceInfo = new window.DeviceInfo();
                deviceId = deviceInfo.device_id;
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID, deviceId);
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.DEVICE_NAME, deviceInfo.device_name);
                console.log('✓ New device registered:', deviceId);
            } else {
                const deviceName = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_NAME);
                deviceInfo = new window.DeviceInfo({
                    device_id: deviceId,
                    device_name: deviceName
                });
                console.log('✓ Existing device loaded:', deviceId);
            }
            
            deviceInfo.touch();
            
            await window.db
                .collection(`users/${userId}/devices`)
                .doc(deviceId)
                .set(deviceInfo.toFirestore());
            
            console.log('✓ Device synced to Firestore');
            return deviceInfo;
        } catch (error) {
            console.error('Error registering device:', error);
        }
    },
    
    clearLocalData() {
        const keysToKeep = [
            window.CONSTANTS.STORAGE_KEYS.DEVICE_ID,
            window.CONSTANTS.STORAGE_KEYS.DEVICE_NAME
        ];
        
        const allKeys = window.Storage.keys();
        allKeys.forEach(key => {
            if (!keysToKeep.includes(key)) {
                window.Storage.remove(key);
            }
        });
        
        console.log('✓ Local data cleared');
    },
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const appContainer = document.getElementById('app');
        
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
        
        if (appContainer) {
            appContainer.style.display = 'flex';
        }
    },
    
    showToast(message, type = 'info') {
        if (window.App && window.App.showToast) {
            window.App.showToast(message, type);
        } else {
            console.log(`Toast (${type}): ${message}`);
        }
    }
};

// Initialize auth when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Auth.init());
} else {
    Auth.init();
}

window.Auth = Auth;
console.log('✓ Auth loaded (v1.3.2 - Email/Password support)');
