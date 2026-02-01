// SDAPWA v1.1.2 - Settings Screen (FIXED)

const SettingsScreen = {
    render(container) {
        const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID) || 'Unknown';
        const deviceName = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_NAME) || 'My Device';
        const lastSync = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.LAST_SYNC);
        const lastSyncFormatted = lastSync ? window.DateTimeUtils.getRelativeTimeString(lastSync) : 'Never';
        const user = window.Auth.getCurrentUser();
        const userEmail = user ? user.email : 'Not signed in';
        
        // Determine sync status based on syncManager state
        const syncStatus = this.getSyncStatus();
        
        container.innerHTML = `
            <div class="settings-screen">
                <!-- Account Section -->
                <div class="settings-section">
                    <h3 class="settings-section-title">Account</h3>
                    <div class="settings-item">
                        <div class="settings-item-label">Signed in as</div>
                        <div class="settings-item-value">${userEmail}</div>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-label">User ID</div>
                        <div class="settings-item-value" style="font-family:monospace;font-size:12px;">${user ? user.uid.substring(0, 20) + '...' : 'N/A'}</div>
                    </div>
                    <button class="btn-danger" id="sign-out-btn" style="width:100%;margin-top:16px;">
                        Sign Out
                    </button>
                </div>
                
                <!-- Device Section -->
                <div class="settings-section">
                    <h3 class="settings-section-title">Device</h3>
                    <div class="settings-item">
                        <div class="settings-item-label">Device ID</div>
                        <div class="settings-item-value" style="font-family:monospace;font-size:12px;">${deviceId.substring(0, 20)}...</div>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-label">Device Name</div>
                        <input type="text" id="device-name-input" value="${deviceName}" 
                               style="width:100%;padding:8px;margin-top:8px;border:1px solid #E0E0E0;border-radius:4px;">
                        <button class="btn-primary" id="save-device-name-btn" 
                                style="width:100%;margin-top:8px;">
                            Save Name
                        </button>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-label">App Version</div>
                        <div class="settings-item-value">SDAPWA v${window.CONSTANTS.APP_VERSION}</div>
                    </div>
                </div>
                
                <!-- Sync Section -->
                <div class="settings-section">
                    <h3 class="settings-section-title">Sync</h3>
                    <div class="settings-item">
                        <div class="settings-item-label">Status</div>
                        <div class="settings-item-value" id="sync-status-display">
                            ${syncStatus.html}
                        </div>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-label">Last Sync</div>
                        <div class="settings-item-value" id="last-sync-display">${lastSyncFormatted}</div>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-label">Firebase Project</div>
                        <div class="settings-item-value">simplydonesync</div>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-label">Offline Queue</div>
                        <div class="settings-item-value" id="offline-queue-count">${this.getOfflineQueueCount()}</div>
                    </div>
                    <button class="btn-secondary" id="sync-now-btn" style="width:100%;margin-top:16px;">
                        Sync Now
                    </button>
                </div>
                
                <!-- Notifications Section -->
                <div class="settings-section">
                    <h3 class="settings-section-title">Notifications</h3>
                    <div class="settings-item settings-toggle">
                        <div class="settings-item-label">Task Reminders</div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="notify-tasks" checked>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="settings-item settings-toggle">
                        <div class="settings-item-label">Location Alerts</div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="notify-location" checked>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
                
                <!-- Data Section -->
                <div class="settings-section">
                    <h3 class="settings-section-title">Data & Privacy</h3>
                    <button class="btn-outline" id="clear-cache-btn" style="width:100%;margin-bottom:8px;">
                        Clear Local Cache
                    </button>
                    <button class="btn-outline" id="process-queue-btn" style="width:100%;margin-bottom:8px;">
                        Process Offline Queue
                    </button>
                    <div style="font-size:12px;color:#757575;text-align:center;margin-top:16px;">
                        Storage used: ${window.Storage.getSizeFormatted()}
                    </div>
                </div>
                
                <!-- About Section -->
                <div class="settings-section">
                    <h3 class="settings-section-title">About</h3>
                    <div style="text-align:center;padding:16px;color:#757575;font-size:14px;">
                        <p>SimplyDone Mobile PWA</p>
                        <p>Version ${window.CONSTANTS.APP_VERSION}</p>
                        <p style="margin-top:8px;">Built for ADHD-friendly task management</p>
                        <p style="margin-top:8px;font-size:12px;">© 2026 SimplyDone</p>
                    </div>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        document.getElementById('sign-out-btn')?.addEventListener('click', () => this.signOut());
        document.getElementById('save-device-name-btn')?.addEventListener('click', () => this.saveDeviceName());
        document.getElementById('sync-now-btn')?.addEventListener('click', () => this.syncNow());
        document.getElementById('clear-cache-btn')?.addEventListener('click', () => this.clearCache());
        document.getElementById('process-queue-btn')?.addEventListener('click', () => this.processOfflineQueue());
    },
    
    getSyncStatus() {
        if (!window.syncManager) {
            return {
                status: 'initializing',
                html: '<span style="color:#FFA726;">● Initializing...</span>'
            };
        }
        
        if (!navigator.onLine) {
            return {
                status: 'offline',
                html: '<span style="color:#9E9E9E;">● Offline</span>'
            };
        }
        
        return {
            status: 'connected',
            html: '<span style="color:#4CAF50;">● Connected</span>'
        };
    },
    
    getOfflineQueueCount() {
        const queue = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.OFFLINE_QUEUE, []);
        if (queue.length === 0) {
            return 'Empty';
        }
        return `${queue.length} item${queue.length !== 1 ? 's' : ''} pending`;
    },
    
    async signOut() {
        await window.Auth.signOut();
    },
    
    saveDeviceName() {
        const input = document.getElementById('device-name-input');
        if (!input) return;
        
        const newName = input.value.trim();
        if (!newName) {
            window.App.showToast('Device name cannot be empty', 'error');
            return;
        }
        
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.DEVICE_NAME, newName);
        window.App.showToast('Device name saved!', 'success');
    },
    
    async syncNow() {
        const btn = document.getElementById('sync-now-btn');
        const statusDisplay = document.getElementById('sync-status-display');
        
        if (!window.syncManager) {
            // Try to initialize sync manager if not ready
            const userId = window.Auth.getUserId();
            if (userId && window.SyncManager) {
                window.App.showToast('Initializing sync...', 'info');
                window.syncManager = new window.SyncManager(userId);
                window.syncManager.startSync();
                
                // Wait a moment for initialization
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                window.App.showToast('Please sign in first', 'error');
                return;
            }
        }
        
        // Update UI
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Syncing...';
        }
        if (statusDisplay) {
            statusDisplay.innerHTML = '<span style="color:#2196F3;">● Syncing...</span>';
        }
        
        try {
            await window.syncManager.forceSyncAll();
            
            // Update last sync display
            const lastSyncDisplay = document.getElementById('last-sync-display');
            if (lastSyncDisplay) {
                lastSyncDisplay.textContent = 'Just now';
            }
            
            // Update sync status
            if (statusDisplay) {
                statusDisplay.innerHTML = '<span style="color:#4CAF50;">● Connected</span>';
            }
            
            window.App.showToast('Sync complete! ✓', 'success');
            
        } catch (error) {
            console.error('Sync error:', error);
            
            if (error.code === 'resource-exhausted') {
                window.App.showToast('Firebase quota exceeded. Try again later.', 'error');
                if (statusDisplay) {
                    statusDisplay.innerHTML = '<span style="color:#EF5350;">● Quota Exceeded</span>';
                }
            } else {
                window.App.showToast('Sync failed: ' + error.message, 'error');
                if (statusDisplay) {
                    statusDisplay.innerHTML = '<span style="color:#EF5350;">● Error</span>';
                }
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Sync Now';
            }
        }
    },
    
    clearCache() {
        if (!confirm('Clear local cache? Your data will re-sync from Firebase.')) {
            return;
        }
        
        const keysToKeep = [
            window.CONSTANTS.STORAGE_KEYS.DEVICE_ID,
            window.CONSTANTS.STORAGE_KEYS.DEVICE_NAME,
            window.CONSTANTS.STORAGE_KEYS.USER_ID,
            window.CONSTANTS.STORAGE_KEYS.OFFLINE_QUEUE // Keep offline queue!
        ];
        
        const allKeys = window.Storage.keys();
        allKeys.forEach(key => {
            if (!keysToKeep.includes(key)) {
                window.Storage.remove(key);
            }
        });
        
        window.App.showToast('Cache cleared!', 'success');
        
        // Force sync to reload data
        if (window.syncManager) {
            window.syncManager.forceSyncAll();
        }
    },
    
    async processOfflineQueue() {
        const queue = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.OFFLINE_QUEUE, []);
        
        if (queue.length === 0) {
            window.App.showToast('Offline queue is empty', 'info');
            return;
        }
        
        if (!navigator.onLine) {
            window.App.showToast('Cannot process queue while offline', 'error');
            return;
        }
        
        const btn = document.getElementById('process-queue-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Processing...';
        }
        
        try {
            const userId = window.Auth.getUserId();
            if (!userId) {
                throw new Error('Not signed in');
            }
            
            let processed = 0;
            let failed = 0;
            
            for (const item of queue) {
                try {
                    if (item.type === 'task') {
                        if (item.action === 'create') {
                            await window.db.collection('users').doc(userId).collection('tasks')
                                .doc(item.data.id).set(item.data);
                        } else if (item.action === 'update') {
                            await window.db.collection('users').doc(userId).collection('tasks')
                                .doc(item.data.id).update(item.data);
                        }
                    }
                    processed++;
                } catch (e) {
                    console.error('Failed to process queue item:', e);
                    failed++;
                }
            }
            
            // Clear processed items (keep failed ones)
            if (failed === 0) {
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.OFFLINE_QUEUE, []);
            }
            
            // Update display
            const queueDisplay = document.getElementById('offline-queue-count');
            if (queueDisplay) {
                queueDisplay.textContent = this.getOfflineQueueCount();
            }
            
            window.App.showToast(`Processed ${processed} items, ${failed} failed`, processed > 0 ? 'success' : 'warning');
            
        } catch (error) {
            console.error('Error processing queue:', error);
            window.App.showToast('Failed to process queue', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Process Offline Queue';
            }
        }
    }
};

window.SettingsScreen = SettingsScreen;
console.log('✓ SettingsScreen loaded');
