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
        const debug = (msg) => {
            console.log(msg);
            alert(msg);  // Alert blocks until you click OK - can't miss it
        };
        
        debug('Init: Starting...');
        debug('Init: iOS PWA = ' + this.isIOSPWA());
        
        // Check if notifications are supported
        if (!this.checkNotificationSupport()) {
            debug('Init: Notifications NOT supported');
            if (!this.isIOSPWA()) {
                return false;
            }
            debug('Init: But iOS PWA, continuing...');
        } else {
            debug('Init: Notifications OK');
        }
        
        if (!('serviceWorker' in navigator)) {
            debug('Init: SW NOT supported');
            return false;
        }
        debug('Init: SW OK');
        
        // Check if Firebase is available
        if (typeof firebase === 'undefined') {
            debug('Init: firebase is UNDEFINED');
            return false;
        }
        debug('Init: firebase exists');
        
        // Check if Firebase Messaging is available
        debug('Init: typeof firebase.messaging = ' + typeof firebase.messaging);
        if (!firebase.messaging) {
            debug('Init: firebase.messaging is MISSING');
            return false;
        }
        debug('Init: firebase.messaging exists');
        
        try {
            debug('Init: Creating messaging instance...');
            this.messaging = firebase.messaging();
            this.isSupported = true;
            debug('Init: SUCCESS!');
            
            // Handle foreground messages
            this.messaging.onMessage((payload) => {
                console.log('📩 Foreground message received:', payload);
                this.handleForegroundMessage(payload);
            });
            
            return true;
            
        } catch (error) {
            debug('Init ERROR: ' + error.message);
            return false;
        }
    },
    
    // Request permission and get FCM token
    async requestPermissionAndToken() {
        console.log('🔔 Requesting notification permission...');
        
        const showToast = (msg) => {
            if (window.App && window.App.showToast) {
                window.App.showToast(msg, 'info');
            }
        };
        
        try {
            // Make sure FCM is initialized
            if (!this.messaging) {
                showToast('4a: FCM not init, initializing...');
                const initResult = await this.init();
                showToast('4b: Init result = ' + initResult);
                if (!initResult && !this.isIOSPWA()) {
                    throw new Error('FCM initialization failed');
                }
            }
            
            // Check current permission
            showToast('4c: Checking permission...');
            const currentPerm = typeof Notification !== 'undefined' ? Notification.permission : 'undefined';
            showToast('4d: Current perm = ' + currentPerm);
            
            // Request permission
            let permission;
            if (typeof Notification !== 'undefined' && Notification.requestPermission) {
                if (currentPerm === 'granted') {
                    permission = 'granted';
                    showToast('4e: Already granted');
                } else {
                    showToast('4e: Requesting...');
                    permission = await Notification.requestPermission();
                    showToast('4f: Result = ' + permission);
                }
            } else {
                throw new Error('Notification API not available');
            }
            
            if (permission !== 'granted') {
                showToast('4g: Permission denied');
                return null;
            }
            
            showToast('4h: Getting SW registration...');
            const swRegistration = await navigator.serviceWorker.ready;
            showToast('4i: SW ready');
            
            // Check VAPID key
            const vapidKey = this.getVapidKey();
            showToast('4j: VAPID = ' + (vapidKey ? 'present' : 'MISSING'));
            
            if (!vapidKey) {
                throw new Error('VAPID key is missing');
            }
            
            // Get FCM token
            showToast('4k: Getting FCM token...');
            try {
                const token = await this.messaging.getToken({
                    vapidKey: vapidKey,
                    serviceWorkerRegistration: swRegistration
                });
                
                showToast('4l: Token result = ' + (token ? 'got it' : 'null'));
                
                if (token) {
                    this.token = token;
                    showToast('4m: Registering with backend...');
                    await this.registerTokenWithBackend(token);
                    showToast('4n: Done!');
                    return token;
                } else {
                    return null;
                }
            } catch (tokenError) {
                showToast('4-ERR: ' + tokenError.message);
                throw new Error('FCM token error: ' + tokenError.message);
            }
            
        } catch (error) {
            showToast('4-CATCH: ' + error.message);
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
