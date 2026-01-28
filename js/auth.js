// SDAPWA v1.0.0 - Authentication

const Auth = {
    currentUser: null,
    
    // Initialize auth state listener
    init() {
        console.log('🔐 Initializing authentication...');
        
        window.auth.onAuthStateChanged((user) => {
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
                
                // Show sign-in screen
                this.onSignedOut();
            }
        });
    },
    
    // Sign in with Google
    async signInWithGoogle() {
        try {
            console.log('🔐 Starting Google Sign-In...');
            
            const result = await window.auth.signInWithPopup(window.googleProvider);
            const user = result.user;
            
            console.log('✓ Sign-in successful');
            console.log('  User:', user.email);
            console.log('  UID:', user.uid);
            
            // Show success toast
            this.showToast(window.CONSTANTS.SUCCESS_MESSAGES.SIGNED_IN, 'success');
            
            return user;
        } catch (error) {
            console.error('❌ Sign-in failed:', error);
            
            // Handle specific errors
            let message = window.CONSTANTS.ERROR_MESSAGES.AUTH_FAILED;
            
            if (error.code === 'auth/popup-closed-by-user') {
                message = 'Sign-in cancelled';
            } else if (error.code === 'auth/popup-blocked') {
                message = 'Popup blocked. Please allow popups for this site.';
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
        
        try {
            // Register device
            await this.registerDevice(user.uid);
            
            // Initialize sync
            if (window.SyncManager) {
                window.syncManager = new window.SyncManager(user.uid);
                window.syncManager.startSync();
            }
            
            // Initialize geofence monitor
            if (window.GeofenceMonitor) {
                window.geofenceMonitor = new window.GeofenceMonitor(user.uid);
                window.geofenceMonitor.start();
            }
            
            // Show dashboard
            if (window.App) {
                window.App.showScreen(window.CONSTANTS.SCREENS.DASHBOARD);
            }
            
            // Hide loading screen
            this.hideLoadingScreen();
            
        } catch (error) {
            console.error('Error initializing app after sign-in:', error);
            this.showToast('Failed to initialize app', 'error');
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

console.log('✓ Auth loaded');
