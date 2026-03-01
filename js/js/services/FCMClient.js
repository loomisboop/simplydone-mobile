// SDAPWA v1.3.3 - Firebase Cloud Messaging Client
// Handles push notification registration and receiving

const FCMClient = {
    messaging: null,
    token: null,
    isSupported: false,
    
    // Check if running as iOS PWA
    isIOSPWA() {
        return (window.navigator.standalone === true) || 
               (window.matchMedia('(display-mode: standalone)').matches && /iPhone|iPad|iPod/.test(navigator.userAgent));
    },
    
    // Check if notifications are available
    checkNotificationSupport() {
        // Check basic support
        if (typeof Notification === 'undefined') {
            console.warn('⚠️ Notification API not available');
            return false;
        }
        
        if (!('Notification' in window)) {
            console.warn('⚠️ Notification not in window');
            return false;
        }
        
        return true;
    },
    
    // Initialize FCM
    async init() {
        console.log('🔔 Initializing FCM Client...');
        console.log('🔔 iOS PWA mode:', this.isIOSPWA());
        console.log('🔔 Notification in window:', 'Notification' in window);
        console.log('🔔 typeof Notification:', typeof Notification);
        
        // Check if notifications are supported
        if (!this.checkNotificationSupport()) {
            console.warn('⚠️ Notifications not supported on this device/browser');
            // On iOS PWA, notifications might still work - continue anyway
            if (!this.isIOSPWA()) {
                return false;
            }
            console.log('🔔 iOS PWA detected - continuing despite notification check');
        }
        
        if (!('serviceWorker' in navigator)) {
            console.warn('⚠️ Service Workers not supported');
            return false;
        }
        
        // Check if Firebase Messaging is available
        if (typeof firebase === 'undefined' || !firebase.messaging) {
            console.warn('⚠️ Firebase Messaging not loaded');
            return false;
        }
        
        try {
            // Initialize Firebase Messaging
            this.messaging = firebase.messaging();
            this.isSupported = true;
            
            // Handle foreground messages
            this.messaging.onMessage((payload) => {
                console.log('📩 Foreground message received:', payload);
                this.handleForegroundMessage(payload);
            });
            
            console.log('✓ FCM Client initialized');
            return true;
            
        } catch (error) {
            console.error('Error initializing FCM:', error);
            return false;
        }
    },
    
    // Request permission and get FCM token
    async requestPermissionAndToken() {
        console.log('🔔 Requesting notification permission...');
        
        try {
            // Make sure FCM is initialized
            if (!this.messaging) {
                console.log('🔔 FCM not initialized, initializing now...');
                const initResult = await this.init();
                console.log('🔔 Init result:', initResult);
                if (!initResult && !this.isIOSPWA()) {
                    throw new Error('FCM initialization failed');
                }
            }
            
            // Check current permission
            console.log('🔔 Current permission:', typeof Notification !== 'undefined' ? Notification.permission : 'Notification undefined');
            
            // Request permission
            let permission;
            if (typeof Notification !== 'undefined' && Notification.requestPermission) {
                permission = await Notification.requestPermission();
                console.log('🔔 Permission result:', permission);
            } else {
                throw new Error('Notification API not available');
            }
            
            if (permission !== 'granted') {
                console.warn('⚠️ Notification permission denied');
                return null;
            }
            
            console.log('✓ Notification permission granted');
            
            // Get service worker registration
            console.log('🔔 Getting service worker registration...');
            const swRegistration = await navigator.serviceWorker.ready;
            console.log('✓ Service Worker ready:', swRegistration.scope);
            
            // Check VAPID key
            const vapidKey = this.getVapidKey();
            console.log('🔔 VAPID key present:', vapidKey ? 'Yes (' + vapidKey.substring(0, 20) + '...)' : 'NO - MISSING!');
            
            if (!vapidKey) {
                throw new Error('VAPID key is missing');
            }
            
            // Get FCM token
            console.log('🔔 Requesting FCM token...');
            try {
                const token = await this.messaging.getToken({
                    vapidKey: vapidKey,
                    serviceWorkerRegistration: swRegistration
                });
                
                if (token) {
                    console.log('✓ FCM Token obtained:', token.substring(0, 20) + '...');
                    this.token = token;
                    
                    // Register token with backend
                    await this.registerTokenWithBackend(token);
                    
                    return token;
                } else {
                    console.warn('⚠️ No FCM token returned (token is null/undefined)');
                    return null;
                }
            } catch (tokenError) {
                console.error('❌ Error getting FCM token:', tokenError);
                console.error('❌ Token error name:', tokenError.name);
                console.error('❌ Token error message:', tokenError.message);
                console.error('❌ Token error stack:', tokenError.stack);
                throw new Error('FCM token error: ' + tokenError.message);
            }
            
        } catch (error) {
            console.error('Error getting FCM token:', error);
            throw error;
        }
    },
    
    // Get VAPID key (you'll need to generate this in Firebase Console)
    getVapidKey() {
        // This key is generated in Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
        // You'll need to replace this with your actual VAPID key
        return window.FIREBASE_VAPID_KEY || '';
    },
    
    // Register token with backend Cloud Function
    async registerTokenWithBackend(token) {
        try {
            // Call the Cloud Function to register the token
            const registerFCMToken = firebase.functions().httpsCallable('registerFCMToken');
            await registerFCMToken({ token });
            
            console.log('✓ FCM token registered with backend');
            
            // Also store locally
            window.Storage.set('fcm_token', token);
            
        } catch (error) {
            console.error('Error registering token with backend:', error);
            
            // Store locally anyway, will retry later
            window.Storage.set('fcm_token_pending', token);
        }
    },
    
    // Handle foreground messages (when app is open)
    handleForegroundMessage(payload) {
        const { notification, data } = payload;
        
        // Play notification sound
        if (window.AudioSystem) {
            window.AudioSystem.init();
            window.AudioSystem.playNotificationChime(0.5);
        }
        
        // Show in-app toast
        if (window.App && window.App.showToast) {
            window.App.showToast(notification.body || 'New notification', 'info');
        }
        
        // Also show browser notification (since we're in foreground, this is optional)
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            const notif = new Notification(notification.title, {
                body: notification.body,
                icon: '/assets/icons/icon-192.png',
                badge: '/assets/icons/icon-96.png',
                tag: data?.type || 'fcm-notification',
                data: data
            });
            
            notif.onclick = () => {
                window.focus();
                notif.close();
                
                // Refresh dashboard
                if (window.DashboardScreen && window.DashboardScreen.refresh) {
                    window.DashboardScreen.refresh();
                }
            };
        }
        
        // Refresh dashboard if it's the active screen
        if (window.DashboardScreen && window.DashboardScreen.refresh) {
            window.DashboardScreen.refresh();
        }
    },
    
    // Send test notification (calls Cloud Function)
    async sendTestNotification() {
        try {
            const sendTest = firebase.functions().httpsCallable('sendTestNotification');
            await sendTest();
            console.log('✓ Test notification sent');
            return true;
        } catch (error) {
            console.error('Error sending test notification:', error);
            throw error;
        }
    },
    
    // Update workday end time on server
    async updateWorkdayEndTime(time) {
        try {
            const updateTime = firebase.functions().httpsCallable('updateWorkdayEndTime');
            await updateTime({ workdayEndTime: time });
            console.log('✓ Workday end time updated on server');
            return true;
        } catch (error) {
            console.error('Error updating workday end time:', error);
            return false;
        }
    },
    
    // Check if push notifications are enabled
    isEnabled() {
        return this.isSupported && 
               (typeof Notification !== 'undefined' && Notification.permission === 'granted') && 
               this.token !== null;
    },
    
    // Get current status for display
    getStatus() {
        if (!this.isSupported && !this.isIOSPWA()) return 'Not supported';
        if (typeof Notification === 'undefined') return 'Not available';
        if (Notification.permission === 'denied') return '✗ Denied';
        if (Notification.permission === 'granted' && this.token) return '✓ Enabled (Push)';
        if (Notification.permission === 'granted') return '⚠️ Needs setup';
        return 'Not requested';
    }
};

window.FCMClient = FCMClient;
console.log('✓ FCMClient loaded');
