// SDAPWA v1.1.2 - Sync Manager (FIXED with quota handling)

class SyncManager {
    constructor(userId) {
        this.userId = userId;
        this.db = window.db;
        this.listeners = [];
        this.syncInterval = null;
        this.isOnline = navigator.onLine;
        this.isSyncing = false;
        this.quotaExceeded = false;
        this.lastSyncAttempt = null;
        this.syncErrorCount = 0;
        
        // Listen for online/offline events
        window.addEventListener('online', () => this.onOnline());
        window.addEventListener('offline', () => this.onOffline());
        
        console.log('🔄 SyncManager initialized for user:', userId);
    }
    
    // Start real-time sync
    startSync() {
        console.log('🔄 Starting sync...');
        
        // Reset quota flag on fresh start
        this.quotaExceeded = false;
        this.syncErrorCount = 0;
        
        // Real-time listeners (immediate updates)
        this.listenToTasks();
        this.listenToGoals();
        this.listenToHealthData();
        
        // Periodic sync (backup, every 60 seconds - increased from 30 to reduce quota usage)
        this.syncInterval = setInterval(() => {
            if (!this.quotaExceeded) {
                this.forceSyncAll();
            }
        }, window.CONSTANTS.SYNC_SETTINGS.INTERVAL_MS);
        
        // Initial sync
        this.forceSyncAll();
        
        console.log('✓ Sync started');
    }
    
    // Stop sync (on sign out)
    stopSync() {
        console.log('⏹️ Stopping sync...');
        
        // Unsubscribe from listeners
        this.listeners.forEach(unsubscribe => {
            try {
                unsubscribe();
            } catch (e) {
                console.error('Error unsubscribing:', e);
            }
        });
        this.listeners = [];
        
        // Clear interval
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        console.log('✓ Sync stopped');
    }
    
    // Real-time task listener with error handling
    listenToTasks() {
        try {
            const unsubscribe = this.db
                .collection('users').doc(this.userId).collection('tasks')
                .onSnapshot((snapshot) => {
                    console.log(`📥 Tasks updated: ${snapshot.size} tasks`);
                    
                    const serverTasks = [];
                    snapshot.forEach((doc) => {
                        serverTasks.push(window.Task.fromFirestore({ id: doc.id, ...doc.data() }));
                    });
                    
                    // FIXED v1.3.1: Merge with local to preserve newer completions
                    const mergedTasks = this.mergeTasksWithLocal(serverTasks);
                    
                    // Update local cache
                    this.updateLocalTasks(mergedTasks);
                    
                    // Notify UI
                    this.notifyTasksChanged(mergedTasks);
                    
                    // Reset error count on success
                    this.syncErrorCount = 0;
                    
                }, (error) => {
                    this.handleSyncError('Task listener', error);
                });
            
            this.listeners.push(unsubscribe);
        } catch (error) {
            console.error('Failed to set up task listener:', error);
        }
    }
    
    // ADDED v1.3.1: Merge server tasks with local, keeping newer local changes
    mergeTasksWithLocal(serverTasks) {
        const localTasksRaw = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
        const localTaskMap = new Map();
        
        // Build map of local tasks
        localTasksRaw.forEach(t => {
            localTaskMap.set(t.id, t);
        });
        
        // Merge: use server version unless local has a newer completion
        const merged = serverTasks.map(serverTask => {
            const localTask = localTaskMap.get(serverTask.id);
            
            if (localTask) {
                // If local task is completed but server task isn't, keep local
                if (localTask.completed_at && !serverTask.completed_at) {
                    console.log(`📍 Keeping local completion for task: ${serverTask.name}`);
                    return window.Task.fromFirestore(localTask);
                }
                
                // If local has newer modified_at, keep local
                const localModified = new Date(localTask.modified_at || 0);
                const serverModified = new Date(serverTask.modified_at || 0);
                if (localModified > serverModified) {
                    console.log(`📍 Keeping newer local version for task: ${serverTask.name}`);
                    return window.Task.fromFirestore(localTask);
                }
            }
            
            return serverTask;
        });
        
        return merged;
    }
    
    // Real-time goal listener
    listenToGoals() {
        try {
            const unsubscribe = this.db
                .collection('users').doc(this.userId).collection('goals')
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
                    this.handleSyncError('Goal listener', error);
                });
            
            this.listeners.push(unsubscribe);
        } catch (error) {
            console.error('Failed to set up goal listener:', error);
        }
    }
    
    // Real-time health data listener (today only)
    listenToHealthData() {
        try {
            const today = window.DateTimeUtils.getTodayDateString();
            
            const unsubscribe = this.db
                .collection('users').doc(this.userId).collection('health_data')
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
                    this.handleSyncError('Health data listener', error);
                });
            
            this.listeners.push(unsubscribe);
        } catch (error) {
            console.error('Failed to set up health data listener:', error);
        }
    }
    
    // Handle sync errors with quota detection
    handleSyncError(source, error) {
        console.error(`${source} error:`, error);
        
        this.syncErrorCount++;
        
        // Detect quota exceeded error
        if (error.code === 'resource-exhausted' || 
            (error.message && error.message.includes('Quota exceeded'))) {
            
            console.warn('⚠️ Firebase quota exceeded - pausing sync');
            this.quotaExceeded = true;
            
            // Show user-friendly message (only once)
            if (this.syncErrorCount === 1) {
                this.showToast('Sync paused: Daily quota exceeded. Data saved locally.', 'warning');
            }
            
            // Stop real-time listeners to prevent further quota usage
            this.listeners.forEach(unsubscribe => {
                try {
                    unsubscribe();
                } catch (e) {}
            });
            this.listeners = [];
        }
    }
    
    // Force sync all data (backup method) with throttling
    async forceSyncAll() {
        // Don't sync if offline
        if (!this.isOnline) {
            console.log('📵 Offline - skipping sync');
            return;
        }
        
        // Don't sync if quota exceeded
        if (this.quotaExceeded) {
            console.log('⚠️ Quota exceeded - skipping sync');
            return;
        }
        
        // Don't sync if already syncing
        if (this.isSyncing) {
            console.log('🔄 Already syncing - skipping');
            return;
        }
        
        // Throttle: Don't sync more than once per 10 seconds
        const now = Date.now();
        if (this.lastSyncAttempt && (now - this.lastSyncAttempt) < 10000) {
            console.log('🔄 Sync throttled - too soon');
            return;
        }
        
        this.isSyncing = true;
        this.lastSyncAttempt = now;
        
        console.log('🔄 Force syncing all data...');
        
        try {
            // Sync tasks
            const tasksSnapshot = await this.db
                .collection('users').doc(this.userId).collection('tasks')
                .get();
            const tasks = tasksSnapshot.docs.map(doc => 
                window.Task.fromFirestore({ id: doc.id, ...doc.data() })
            );
            this.updateLocalTasks(tasks);
            this.notifyTasksChanged(tasks);
            
            // Sync goals
            const goalsSnapshot = await this.db
                .collection('users').doc(this.userId).collection('goals')
                .where('archived', '==', false)
                .limit(3)
                .get();
            const goals = goalsSnapshot.docs.map(doc => 
                window.Goal.fromFirestore({ id: doc.id, ...doc.data() })
            );
            this.updateLocalGoals(goals);
            this.notifyGoalsChanged(goals);
            
            // Sync today's health data
            const today = window.DateTimeUtils.getTodayDateString();
            const healthDoc = await this.db
                .collection('users').doc(this.userId).collection('health_data')
                .doc(today)
                .get();
            if (healthDoc.exists) {
                const healthData = window.HealthData.fromFirestore({ date: healthDoc.id, ...healthDoc.data() });
                this.updateLocalHealthData(healthData);
                this.notifyHealthDataChanged(healthData);
            }
            
            // Update device last_sync (with error handling)
            try {
                await this.updateDeviceSync();
            } catch (e) {
                console.warn('Device sync update failed (non-critical):', e);
            }
            
            // Process offline queue if available
            if (window.offlineQueue) {
                await window.offlineQueue.processQueue(this.userId);
            }
            
            console.log('✅ Sync complete!');
            
            // Update last sync time
            window.Storage.set(window.CONSTANTS.STORAGE_KEYS.LAST_SYNC, window.DateTimeUtils.utcNowISO());
            
            // Reset error count on success
            this.syncErrorCount = 0;
            
        } catch (error) {
            console.error('❌ Sync error:', error);
            this.handleSyncError('Force sync', error);
        } finally {
            this.isSyncing = false;
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
            // Don't treat device update failure as critical
            console.warn('Error updating device sync (non-critical):', error);
        }
    }
    
    // Online/offline handlers
    onOnline() {
        console.log('🌐 Back online');
        this.isOnline = true;
        
        // Reset quota flag when coming back online (quota resets daily)
        // User might have been offline overnight when quota reset
        this.quotaExceeded = false;
        this.syncErrorCount = 0;
        
        // Restart listeners
        this.listenToTasks();
        this.listenToGoals();
        this.listenToHealthData();
        
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
    
    // Check if sync is ready
    isReady() {
        return this.userId && this.db && !this.quotaExceeded;
    }
}

// Export
window.SyncManager = SyncManager;

console.log('✓ SyncManager loaded');
