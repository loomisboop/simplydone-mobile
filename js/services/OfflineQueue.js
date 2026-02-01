// SDAPWA v1.0.0 - Offline Queue Service

class OfflineQueue {
    constructor() {
        this.queue = this.loadQueue();
    }
    
    // Load queue from localStorage
    loadQueue() {
        const stored = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.OFFLINE_QUEUE, []);
        return stored;
    }
    
    // Save queue to localStorage
    saveQueue() {
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.OFFLINE_QUEUE, this.queue);
    }
    
    // Add action to queue
    addAction(actionType, data) {
        const action = {
            id: this._generateId(),
            action: actionType,
            data: data,
            timestamp: window.DateTimeUtils.utcNowISO()
        };
        
        this.queue.push(action);
        this.saveQueue();
        
        console.log(`📋 Queued: ${actionType}`, action.id);
        
        // Update UI counter
        this._updateQueueCounter();
        
        return action.id;
    }
    
    // Process entire queue
    async processQueue(userId) {
        if (this.queue.length === 0) {
            console.log('📤 Queue is empty');
            return;
        }
        
        console.log(`📤 Processing ${this.queue.length} queued actions...`);
        
        const errors = [];
        
        for (const item of this.queue) {
            try {
                await this._processAction(userId, item);
                console.log(`✅ Synced: ${item.action} (${item.id})`);
            } catch (error) {
                console.error(`❌ Failed to sync ${item.action} (${item.id}):`, error);
                errors.push(item);
            }
        }
        
        // Keep only failed items
        this.queue = errors;
        this.saveQueue();
        
        if (errors.length === 0) {
            console.log('✅ All queued actions synced!');
            if (window.App && window.App.showToast) {
                window.App.showToast('All offline changes synced!', 'success');
            }
        } else {
            console.log(`⚠️ ${errors.length} actions failed to sync`);
        }
        
        // Update UI counter
        this._updateQueueCounter();
    }
    
    // Process single action
    async _processAction(userId, item) {
        const db = window.db;
        
        switch (item.action) {
            case 'add_task':
                await db.collection(`users/${userId}/tasks`)
                    .doc(item.data.id)
                    .set(item.data);
                break;
                
            case 'update_task':
                await db.collection(`users/${userId}/tasks`)
                    .doc(item.data.id)
                    .update(item.data.updates);
                break;
                
            case 'complete_task':
                await db.collection(`users/${userId}/tasks`)
                    .doc(item.data.taskId)
                    .update({
                        completed_at: item.data.completed_at,
                        completed_on_device: item.data.completed_on_device,
                        modified_at: item.data.modified_at,
                        modified_by: item.data.modified_by,
                        sync_version: firebase.firestore.FieldValue.increment(1)
                    });
                break;
                
            case 'delete_task':
                await db.collection(`users/${userId}/tasks`)
                    .doc(item.data.taskId)
                    .update({
                        deleted: true,
                        modified_at: item.data.modified_at,
                        modified_by: item.data.modified_by,
                        sync_version: firebase.firestore.FieldValue.increment(1)
                    });
                break;
                
            case 'add_goal':
                await db.collection(`users/${userId}/goals`)
                    .doc(item.data.id)
                    .set(item.data);
                break;
                
            case 'update_goal':
                await db.collection(`users/${userId}/goals`)
                    .doc(item.data.id)
                    .update(item.data.updates);
                break;
                
            case 'add_health':
                // Get existing data
                const healthDoc = await db.collection(`users/${userId}/health_data`)
                    .doc(item.data.date)
                    .get();
                
                let merged;
                if (healthDoc.exists) {
                    // Merge with existing
                    const existing = window.HealthData.fromFirestore(healthDoc.data());
                    merged = window.HealthMerger.merge(
                        existing,
                        item.data.sourceData,
                        item.data.deviceId,
                        item.data.sourceType
                    );
                } else {
                    // Create new
                    merged = window.HealthData.fromFirestore(item.data);
                }
                
                await db.collection(`users/${userId}/health_data`)
                    .doc(item.data.date)
                    .set(merged.toFirestore());
                break;
                
            default:
                console.warn(`Unknown action type: ${item.action}`);
        }
    }
    
    // Get queue count
    getQueueCount() {
        return this.queue.length;
    }
    
    // Clear queue
    clearQueue() {
        this.queue = [];
        this.saveQueue();
        this._updateQueueCounter();
        console.log('✓ Queue cleared');
    }
    
    // Update UI counter
    _updateQueueCounter() {
        const counter = document.getElementById('offline-queue-count');
        if (counter) {
            const count = this.getQueueCount();
            counter.textContent = count > 0 ? ` - ${count} pending` : '';
        }
    }
    
    // Generate unique ID
    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Create global instance
window.offlineQueue = new OfflineQueue();

// Export
window.OfflineQueue = OfflineQueue;

console.log('✓ OfflineQueue loaded');
