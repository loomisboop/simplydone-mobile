// SDAPWA v1.3.2 - Authentication (iOS PWA compatible - FIXED sign-in loop)

const Auth = {
    currentUser: null,
    isInitialized: false,
    isProcessingRedirect: false,
    
    // Detect if running as iOS PWA (standalone mode)
    isIOSPWA() {
        return (window.navigator.standalone === true) || 
               (window.matchMedia('(display-mode: standalone)').matches && /iPhone|iPad|iPod/.test(navigator.userAgent));
    },
    
    // Initialize auth state listener
    async init() {
        console.log('🔐 Initializing authentication...');
        
        // Prevent double initialization
        if (this.isInitialized) {
            console.log('Auth already initialized');
            return;
        }
        this.isInitialized = true;
        
        // Check for redirect result FIRST and AWAIT it (for iOS PWA)
        try {
            this.isProcessingRedirect = true;
            const result = await window.auth.getRedirectResult();
            if (result && result.user) {
                console.log('✓ Redirect sign-in successful:', result.user.email);
                // The onAuthStateChanged will handle the rest
            }
        } catch (error) {
            // Ignore "no redirect operation" errors - they're expected on normal page loads
            if (error.code !== 'auth/null-user') {
                console.error('Redirect result error:', error.code, error.message);
            }
        } finally {
            this.isProcessingRedirect = false;
        }
        
        // NOW set up the auth state listener
        window.auth.onAuthStateChanged((user) => {
            console.log('🔐 Auth state changed:', user ? user.email : 'no user');
            
            if (user) {
                // User is signed in
                this.currentUser = user;
                console.log('✓ User authenticated:', user.uid);
                console.log('  Email:', user.email);
                console.log('  Name:', user.displayName);
                
                // Store user ID
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.USER_ID, user.uid);
                
                // Initialize app with user
                this.onSignedIn(user);
            } else {
                // User is signed out
                this.currentUser = null;
                console.log('User not authenticated');
                
                // Only show sign-in screen if not processing a redirect
                if (!this.isProcessingRedirect) {
                    this.onSignedOut();
                }
            }
        });
    },
    
    // Sign in with Google (auto-detect best method)
    async signInWithGoogle() {
        try {
            console.log('🔐 Starting Google Sign-In...');
            console.log('  iOS PWA:', this.isIOSPWA());
            console.log('  Standalone:', window.navigator.standalone);
            
            const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
            
            // For iOS PWA: popup doesn't work well, redirect doesn't work at all
            // Best approach: open in Safari browser for auth, then return
            if (this.isIOSPWA()) {
                console.log('📱 iOS PWA detected - using popup method (redirect broken on iOS PWA)');
                
                // Try popup first - it sometimes works on iOS PWA
                try {
                    const result = await window.auth.signInWithPopup(window.googleProvider);
                    if (result && result.user) {
                        console.log('✓ Popup sign-in successful');
                        this.showToast(window.CONSTANTS.SUCCESS_MESSAGES.SIGNED_IN, 'success');
                        return result.user;
                    }
                } catch (popupError) {
                    console.log('Popup failed on iOS PWA:', popupError.code);
                    
                    // If popup fails, show instruction to user
                    if (popupError.code === 'auth/popup-blocked' || 
                        popupError.code === 'auth/popup-closed-by-user' ||
                        popupError.code === 'auth/cancelled-popup-request') {
                        
                        // Show helpful message
                        alert('To sign in from the Home Screen app:\n\n1. Open SimplyDone in Safari browser\n2. Sign in there\n3. Return to this Home Screen app\n\nThe sign-in will sync automatically.');
                        
                        // Open the app URL in Safari
                        window.open(window.location.href, '_blank');
                        return null;
                    }
                    throw popupError;
                }
            } else if (isIOS) {
                // Regular iOS Safari (not PWA) - use redirect
                console.log('📱 iOS Safari detected - using redirect method');
                window.Storage.set('auth_redirect_pending', 'true');
                await window.auth.signInWithRedirect(window.googleProvider);
                return null;
            } else {
                // Desktop or Android - use popup
                console.log('💻 Using popup method');
                const result = await window.auth.signInWithPopup(window.googleProvider);
                const user = result.user;
                
                console.log('✓ Sign-in successful');
                console.log('  User:', user.email);
                console.log('  UID:', user.uid);
                
                this.showToast(window.CONSTANTS.SUCCESS_MESSAGES.SIGNED_IN, 'success');
                return user;
            }
        } catch (error) {
            console.error('❌ Sign-in failed:', error.code, error.message);
            
            let message = window.CONSTANTS.ERROR_MESSAGES.AUTH_FAILED;
            
            if (error.code === 'auth/popup-closed-by-user') {
                message = 'Sign-in cancelled';
            } else if (error.code === 'auth/popup-blocked') {
                message = 'Popup blocked. Please allow popups or try in Safari.';
            } else if (error.code === 'auth/operation-not-supported-in-this-environment') {
                message = 'Please open in Safari to sign in.';
            } else if (error.code === 'auth/cancelled-popup-request') {
                message = 'Sign-in cancelled';
            } else if (error.code === 'auth/network-request-failed') {
                message = 'Network error. Please check your connection.';
            }
            
            this.showToast(message, 'error');
            throw error;
        }
    },
    
    // Sign out
    async signOut() {
        try {
            console.log('🔐 Signing out...');
            
            // Confirm with user
            if (!confirm('Are you sure you want to sign out?')) {
                return false;
            }
            
            // Stop sync
            if (window.syncManager) {
                window.syncManager.stopSync();
            }
            
            // Stop geofence monitor
            if (window.geofenceMonitor) {
                window.geofenceMonitor.stop();
            }
            
            // Clear local data
            this.clearLocalData();
            
            // Sign out from Firebase
            await window.auth.signOut();
            
            console.log('✓ Signed out');
            this.showToast(window.CONSTANTS.SUCCESS_MESSAGES.SIGNED_OUT);
            
            return true;
        } catch (error) {
            console.error('❌ Sign-out failed:', error);
            this.showToast('Sign-out failed', 'error');
            throw error;
        }
    },
    
    // Get current user
    getCurrentUser() {
        return this.currentUser || window.auth.currentUser;
    },
    
    // Get user ID
    getUserId() {
        const user = this.getCurrentUser();
        return user ? user.uid : null;
    },
    
    // Check if signed in
    isSignedIn() {
        return this.getCurrentUser() !== null;
    },
    
    // Callback when user signs in
    async onSignedIn(user) {
        console.log('📱 User signed in, initializing app...');
        
        // Clear any redirect pending flag
        window.Storage.remove('auth_redirect_pending');
        
        try {
            // Show success toast if coming from redirect
            this.showToast(window.CONSTANTS.SUCCESS_MESSAGES.SIGNED_IN, 'success');
            
            // Register device
            await this.registerDevice(user.uid);
            
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
    
    // Callback when user signs out
    onSignedOut() {
        console.log('User signed out, showing sign-in screen');
        
        // Clean up
        window.syncManager = null;
        window.geofenceMonitor = null;
        
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
            let deviceInfo;
            
            if (!deviceId) {
                // Create new device
                deviceInfo = new window.DeviceInfo();
                deviceId = deviceInfo.device_id;
                
                // Save device ID locally
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID, deviceId);
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.DEVICE_NAME, deviceInfo.device_name);
                
                console.log('✓ New device registered:', deviceId);
            } else {
                // Load existing device info
                const deviceName = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_NAME);
                deviceInfo = new window.DeviceInfo({
                    device_id: deviceId,
                    device_name: deviceName
                });
                
                console.log('✓ Existing device loaded:', deviceId);
            }
            
            // Update last_sync
            deviceInfo.touch();
            
            // Save to Firestore
            await window.db
                .collection(`users/${userId}/devices`)
                .doc(deviceId)
                .set(deviceInfo.toFirestore());
            
            console.log('✓ Device synced to Firestore');
            
            return deviceInfo;
        } catch (error) {
            console.error('Error registering device:', error);
            // Don't throw - device registration failure shouldn't block sign-in
        }
    },
    
    // Clear local data on sign out
    clearLocalData() {
        const keysToKeep = [
            window.CONSTANTS.STORAGE_KEYS.DEVICE_ID,
            window.CONSTANTS.STORAGE_KEYS.DEVICE_NAME
        ];
        
        // Get all keys
        const allKeys = window.Storage.keys();
        
        // Remove all except device info
        allKeys.forEach(key => {
            if (!keysToKeep.includes(key)) {
                window.Storage.remove(key);
            }
        });
        
        console.log('✓ Local data cleared');
    },
    
    // Hide loading screen
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
    
    // Show toast notification
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

// Export
window.Auth = Auth;

console.log('✓ Auth loaded (v1.3.2 - fixed sign-in loop)');
