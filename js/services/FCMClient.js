// SDAPWA v1.3.3 - Firebase Cloud Messaging Client
// Handles push notification registration and receiving

const FCMClient = {
    messaging: null,
    token: null,
    isSupported: false,
    
    // Initialize FCM
    async init() {
        console.log('🔔 Initializing FCM Client...');
        
        // Check if FCM is supported
        if (!('Notification' in window)) {
            console.warn('⚠️ Notifications not supported');
            return false;
        }
        
        if (!('serviceWorker' in navigator)) {
            console.warn('⚠️ Service Workers not supported');
            return false;
        }
        
        // Check if Firebase Messaging is available
        if (!firebase.messaging) {
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
            // Request permission
            const permission = await Notification.requestPermission();
            
            if (permission !== 'granted') {
                console.warn('⚠️ Notification permission denied');
                return null;
            }
            
            console.log('✓ Notification permission granted');
            
            // Get service worker registration
            const swRegistration = await navigator.serviceWorker.ready;
            
            // Get FCM token
            const token = await this.messaging.getToken({
                vapidKey: this.getVapidKey(),
                serviceWorkerRegistration: swRegistration
            });
            
            if (token) {
                console.log('✓ FCM Token obtained');
                this.token = token;
                
                // Register token with backend
                await this.registerTokenWithBackend(token);
                
                return token;
            } else {
                console.warn('⚠️ No FCM token available');
                return null;
            }
            
        } catch (error) {
            console.error('Error getting FCM token:', error);
            return null;
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
        if (Notification.permission === 'granted') {
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
               Notification.permission === 'granted' && 
               this.token !== null;
    },
    
    // Get current status for display
    getStatus() {
        if (!this.isSupported) return 'Not supported';
        if (Notification.permission === 'denied') return '✗ Denied';
        if (Notification.permission === 'granted' && this.token) return '✓ Enabled (Push)';
        if (Notification.permission === 'granted') return '⚠️ Needs setup';
        return 'Not requested';
    }
};

window.FCMClient = FCMClient;
console.log('✓ FCMClient loaded');
