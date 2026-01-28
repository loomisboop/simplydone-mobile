// SDAPWA v1.0.0 - Sync Manager

class SyncManager {
    constructor(userId) {
        this.userId = userId;
        this.db = window.db;
        this.listeners = [];
        this.syncInterval = null;
        this.isOnline = navigator.onLine;
        
        // Listen for online/offline events
        window.addEventListener('online', () => this.onOnline());
        window.addEventListener('offline', () => this.onOffline());
        
        console.log('🔄 SyncManager initialized for user:', userId);
    }
    
    // Start real-time sync
    startSync() {
        console.log('🔄 Starting sync...');
        
        // Real-time listeners (immediate updates)
        this.listenToTasks();
        this.listenToGoals();
        this.listenToHealthData();
        
        // Periodic sync (backup, every 30 seconds)
        this.syncInterval = setInterval(() => {
            this.forceSyncAll();
        }, window.CONSTANTS.SYNC_SETTINGS.INTERVAL_MS);
        
        // Initial sync
        this.forceSyncAll();
        
        console.log('✓ Sync started');
    }
    
    // Stop sync (on sign out)
    stopSync() {
        console.log('⏹️ Stopping sync...');
        
        // Unsubscribe from listeners
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
        
        // Clear interval
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        console.log('✓ Sync stopped');
    }
    
    // Real-time task listener
    listenToTasks() {
        const unsubscribe = this.db
            .collection(`users/${this.userId}/tasks`)
            .onSnapshot((snapshot) => {
                console.log(`📥 Tasks updated: ${snapshot.size} tasks`);
                
                const tasks = [];
                snapshot.forEach((doc) => {
                    tasks.push(window.Task.fromFirestore({ id: doc.id, ...doc.data() }));
                });
                
                // Update local cache
                this.updateLocalTasks(tasks);
                
                // Notify UI
                this.notifyTasksChanged(tasks);
                
            }, (error) => {
                console.error('Task listener error:', error);
            });
        
        this.listeners.push(unsubscribe);
    }
    
    // Real-time goal listener
    listenToGoals() {
        const unsubscribe = this.db
            .collection(`users/${this.userId}/goals`)
            .where('archived', '==', false)
            .limit(3)
            .onSnapshot((snapshot) => {
                console.log(`📥 Goals updated: ${snapshot.size} goals`);
                
                const goals = [];
                snapshot.forEach((doc) => {
                    goals.push(window.Goal.fromFirestore({ id: doc.id, ...doc.data() }));
                });
                
                // Update local cache
                this.updateLocalGoals(goals);
                
                // Notify UI
                this.notifyGoalsChanged(goals);
                
            }, (error) => {
                console.error('Goal listener error:', error);
            });
        
        this.listeners.push(unsubscribe);
    }
    
    // Real-time health data listener (today only)
    listenToHealthData() {
        const today = window.DateTimeUtils.getTodayDateString();
        
        const unsubscribe = this.db
            .collection(`users/${this.userId}/health_data`)
            .doc(today)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    console.log(`📥 Health data updated: ${today}`);
                    const healthData = window.HealthData.fromFirestore({ date: doc.id, ...doc.data() });
                    
                    // Update local cache
                    this.updateLocalHealthData(healthData);
                    
                    // Notify UI
                    this.notifyHealthDataChanged(healthData);
                }
            }, (error) => {
                console.error('Health data listener error:', error);
            });
        
        this.listeners.push(unsubscribe);
    }
    
    // Force sync all data (backup method)
    async forceSyncAll() {
        if (!this.isOnline) {
            console.log('📵 Offline - skipping sync');
            return;
        }
        
        console.log('🔄 Force syncing all data...');
        
        try {
            // Sync tasks
            const tasksSnapshot = await this.db
                .collection(`users/${this.userId}/tasks`)
                .get();
            const tasks = tasksSnapshot.docs.map(doc => 
                window.Task.fromFirestore({ id: doc.id, ...doc.data() })
            );
            this.updateLocalTasks(tasks);
            
            // Sync goals
            const goalsSnapshot = await this.db
                .collection(`users/${this.userId}/goals`)
                .where('archived', '==', false)
                .limit(3)
                .get();
            const goals = goalsSnapshot.docs.map(doc => 
                window.Goal.fromFirestore({ id: doc.id, ...doc.data() })
            );
            this.updateLocalGoals(goals);
            
            // Sync today's health data
            const today = window.DateTimeUtils.getTodayDateString();
            const healthDoc = await this.db
                .collection(`users/${this.userId}/health_data`)
                .doc(today)
                .get();
            if (healthDoc.exists) {
                const healthData = window.HealthData.fromFirestore({ date: healthDoc.id, ...healthDoc.data() });
                this.updateLocalHealthData(healthData);
            }
            
            // Update device last_sync
            await this.updateDeviceSync();
            
            // Process offline queue if available
            if (window.offlineQueue) {
                await window.offlineQueue.processQueue(this.userId);
            }
            
            console.log('✅ Sync complete!');
            
            // Update last sync time
            window.Storage.set(window.CONSTANTS.STORAGE_KEYS.LAST_SYNC, window.DateTimeUtils.utcNowISO());
            
        } catch (error) {
            console.error('❌ Sync error:', error);
        }
    }
    
    // Update device last_sync timestamp
    async updateDeviceSync() {
        const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
        if (!deviceId) return;
        
        try {
            await this.db
                .collection(`users/${this.userId}/devices`)
                .doc(deviceId)
                .update({
                    last_sync: window.DateTimeUtils.utcNowISO()
                });
        } catch (error) {
            console.error('Error updating device sync:', error);
        }
    }
    
    // Online/offline handlers
    onOnline() {
        console.log('🌐 Back online');
        this.isOnline = true;
        this.forceSyncAll();
        this.showToast('Back online! Syncing...', 'success');
        this.hideOfflineBanner();
    }
    
    onOffline() {
        console.log('📵 Went offline');
        this.isOnline = false;
        this.showToast('Offline mode - changes will sync when online', 'warning');
        this.showOfflineBanner();
    }
    
    // Local cache methods
    updateLocalTasks(tasks) {
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, tasks.map(t => t.toFirestore()));
    }
    
    updateLocalGoals(goals) {
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.GOALS, goals.map(g => g.toFirestore()));
    }
    
    updateLocalHealthData(healthData) {
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.HEALTH_DATA_TODAY, healthData.toFirestore());
    }
    
    // Get cached tasks
    getCachedTasks() {
        const data = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
        return data.map(t => window.Task.fromFirestore(t));
    }
    
    // Get cached goals
    getCachedGoals() {
        const data = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.GOALS, []);
        return data.map(g => window.Goal.fromFirestore(g));
    }
    
    // Get cached health data
    getCachedHealthData() {
        const data = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.HEALTH_DATA_TODAY);
        return data ? window.HealthData.fromFirestore(data) : null;
    }
    
    // UI notification methods
    notifyTasksChanged(tasks) {
        window.dispatchEvent(new CustomEvent('tasks-changed', { detail: tasks }));
    }
    
    notifyGoalsChanged(goals) {
        window.dispatchEvent(new CustomEvent('goals-changed', { detail: goals }));
    }
    
    notifyHealthDataChanged(healthData) {
        window.dispatchEvent(new CustomEvent('health-data-changed', { detail: healthData }));
    }
    
    // Toast notification
    showToast(message, type = 'info') {
        if (window.App && window.App.showToast) {
            window.App.showToast(message, type);
        }
    }
    
    // Offline banner
    showOfflineBanner() {
        const banner = document.getElementById('offline-banner');
        if (banner) {
            banner.style.display = 'flex';
            this.updateOfflineQueueCount();
        }
    }
    
    hideOfflineBanner() {
        const banner = document.getElementById('offline-banner');
        if (banner) {
            banner.style.display = 'none';
        }
    }
    
    updateOfflineQueueCount() {
        const counter = document.getElementById('offline-queue-count');
        if (counter && window.offlineQueue) {
            const count = window.offlineQueue.getQueueCount();
            counter.textContent = count > 0 ? ` - ${count} pending` : '';
        }
    }
}

// Export
window.SyncManager = SyncManager;

console.log('✓ SyncManager loaded');
