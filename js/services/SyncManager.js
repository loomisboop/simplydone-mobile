// SDAPWA v1.3.1 - Sync Manager (FIXED: Don't overwrite local completions)

class SyncManager {
    constructor(db, userId) {
        this.db = db;
        this.userId = userId;
        this.listeners = [];
        this.quotaExceeded = false;
        this.syncErrorCount = 0;
        this.maxSyncErrors = 5;
        this.isSyncing = false;
        this.lastSyncTime = null;
        this.pendingLocalChanges = new Set(); // Track tasks being updated locally
    }
    
    // Start real-time listeners
    startListening() {
        console.log('🔄 Starting sync listeners...');
        
        // Tasks listener
        const tasksListener = this.db
            .collection('users').doc(this.userId).collection('tasks')
            .where('deleted', '==', false)
            .onSnapshot((snapshot) => {
                console.log(`📥 Tasks updated: ${snapshot.size} tasks`);
                
                const serverTasks = [];
                snapshot.forEach((doc) => {
                    serverTasks.push(window.Task.fromFirestore({ id: doc.id, ...doc.data() }));
                });
                
                // FIXED: Merge server tasks with local, preserving newer local completions
                const mergedTasks = this.mergeTasksWithLocal(serverTasks);
                
                this.updateLocalTasks(mergedTasks);
                this.notifyTasksChanged(mergedTasks);
                this.syncErrorCount = 0;
                
            }, (error) => {
                this.handleSyncError('Task listener', error);
            });
        
        this.listeners.push(tasksListener);
        
        // Goals listener
        const goalsListener = this.db
            .collection('users').doc(this.userId).collection('goals')
            .where('archived', '==', false)
            .limit(3)
            .onSnapshot((snapshot) => {
                console.log(`📥 Goals updated: ${snapshot.size} goals`);
                
                const goals = [];
                snapshot.forEach((doc) => {
                    goals.push(window.Goal.fromFirestore({ id: doc.id, ...doc.data() }));
                });
                
                this.updateLocalGoals(goals);
                this.notifyGoalsChanged(goals);
                
            }, (error) => {
                this.handleSyncError('Goals listener', error);
            });
        
        this.listeners.push(goalsListener);
        
        // Health data listener for today
        const today = window.DateTimeUtils.getTodayDateString();
        const healthListener = this.db
            .collection('users').doc(this.userId).collection('health_data')
            .doc(today)
            .onSnapshot((doc) => {
                if (doc.exists) {
                    console.log('📥 Health data updated');
                    const healthData = window.HealthData.fromFirestore({ id: doc.id, ...doc.data() });
                    this.updateLocalHealthData(healthData);
                    this.notifyHealthDataChanged(healthData);
                }
            }, (error) => {
                this.handleSyncError('Health listener', error);
            });
        
        this.listeners.push(healthListener);
        
        console.log('✓ Sync listeners started');
    }
    
    // FIXED: Merge server tasks with local, keeping newer local changes
    mergeTasksWithLocal(serverTasks) {
        const localTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
        const localTaskMap = new Map();
        
        // Build map of local tasks
        localTasks.forEach(t => {
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
    
    // Stop all listeners
    stopListening() {
        console.log('⏹️ Stopping sync listeners...');
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
        console.log('✓ Sync listeners stopped');
    }
    
    // Force sync all data
    async forceSyncAll() {
        if (this.isSyncing) {
            console.log('⏳ Sync already in progress');
            return;
        }
        
        this.isSyncing = true;
        console.log('🔄 Force syncing all data...');
        
        try {
            // Sync tasks
            const tasksSnapshot = await this.db
                .collection('users').doc(this.userId).collection('tasks')
                .where('deleted', '==', false)
                .get();
            const serverTasks = tasksSnapshot.docs.map(doc => 
                window.Task.fromFirestore({ id: doc.id, ...doc.data() })
            );
            const mergedTasks = this.mergeTasksWithLocal(serverTasks);
            this.updateLocalTasks(mergedTasks);
            this.notifyTasksChanged(mergedTasks);
            
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
                const healthData = window.HealthData.fromFirestore({ id: healthDoc.id, ...healthDoc.data() });
                this.updateLocalHealthData(healthData);
                this.notifyHealthDataChanged(healthData);
            }
            
            // Update last sync time
            this.lastSyncTime = new Date();
            window.Storage.set(window.CONSTANTS.STORAGE_KEYS.LAST_SYNC, this.lastSyncTime.toISOString());
            
            // Update device sync record
            await this.updateDeviceSync();
            
            console.log('✓ Force sync complete');
            this.quotaExceeded = false;
            this.syncErrorCount = 0;
            
        } catch (error) {
            this.handleSyncError('Force sync', error);
            throw error;
        } finally {
            this.isSyncing = false;
        }
    }
    
    // Handle sync errors
    handleSyncError(context, error) {
        console.error(`Sync error in ${context}:`, error);
        
        if (error.code === 'resource-exhausted') {
            this.quotaExceeded = true;
            console.warn('⚠️ Firebase quota exceeded. Sync paused until midnight UTC.');
        }
        
        this.syncErrorCount++;
        
        if (this.syncErrorCount >= this.maxSyncErrors) {
            console.error('❌ Too many sync errors. Stopping listeners.');
            this.stopListening();
        }
    }
    
    // Update device sync timestamp
    async updateDeviceSync() {
        try {
            const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
            const deviceName = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_NAME) || 'PWA';
            
            await this.db
                .collection('users').doc(this.userId).collection('devices')
                .doc(deviceId)
                .set({
                    device_id: deviceId,
                    device_name: deviceName,
                    platform: 'pwa',
                    last_sync: window.DateTimeUtils.utcNowISO(),
                    app_version: window.CONSTANTS.APP_VERSION
                }, { merge: true });
                
        } catch (error) {
            console.error('Error updating device sync:', error);
        }
    }
    
    // Local storage updates
    updateLocalTasks(tasks) {
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, tasks.map(t => t.toFirestore ? t.toFirestore() : t));
    }
    
    updateLocalGoals(goals) {
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.GOALS, goals.map(g => g.toFirestore ? g.toFirestore() : g));
    }
    
    updateLocalHealthData(healthData) {
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.HEALTH_DATA_TODAY, healthData.toFirestore ? healthData.toFirestore() : healthData);
    }
    
    // Get cached data
    getCachedTasks() {
        const data = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
        return data.map(t => window.Task.fromFirestore(t));
    }
    
    getCachedGoals() {
        const data = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.GOALS, []);
        return data.map(g => window.Goal.fromFirestore(g));
    }
    
    getCachedHealthData() {
        const data = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.HEALTH_DATA_TODAY);
        return data ? window.HealthData.fromFirestore(data) : null;
    }
    
    // Notify UI of changes
    notifyTasksChanged(tasks) {
        window.dispatchEvent(new CustomEvent('tasks-changed', { detail: tasks }));
    }
    
    notifyGoalsChanged(goals) {
        window.dispatchEvent(new CustomEvent('goals-changed', { detail: goals }));
    }
    
    notifyHealthDataChanged(healthData) {
        window.dispatchEvent(new CustomEvent('health-data-changed', { detail: healthData }));
    }
}

window.SyncManager = SyncManager;
console.log('✓ SyncManager loaded (v1.3.1 - merge fix)');
