// SDAPWA v1.3.0 - Settings Screen (with Workday End Time)

const SettingsScreen = {
    render(container) {
        const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID) || 'Unknown';
        const deviceName = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_NAME) || 'My Device';
        const lastSync = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.LAST_SYNC);
        const lastSyncFormatted = lastSync ? window.DateTimeUtils.getRelativeTimeString(lastSync) : 'Never';
        const user = window.Auth.getCurrentUser();
        const userEmail = user ? user.email : 'Not signed in';
        const workdayEndTime = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.WORKDAY_END_TIME, '17:00');
        const syncStatus = this.getSyncStatus();
        
        container.innerHTML = `
            <div class="settings-screen">
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
                    <button class="btn-danger" id="sign-out-btn" style="width:100%;margin-top:16px;">Sign Out</button>
                </div>
                
                <div class="settings-section">
                    <h3 class="settings-section-title">Workday Settings</h3>
                    <div class="settings-item">
                        <div class="settings-item-label">Workday Ends At</div>
                        <div class="settings-item-desc">Tasks parked to "Before My Day Ends" will have this as their deadline</div>
                        <input type="time" id="workday-end-input" value="${workdayEndTime}" style="width:100%;padding:12px;margin-top:8px;border:1px solid #E0E0E0;border-radius:4px;font-size:16px;">
                        <button class="btn-primary" id="save-workday-btn" style="width:100%;margin-top:8px;">Save Workday End Time</button>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3 class="settings-section-title">Device</h3>
                    <div class="settings-item">
                        <div class="settings-item-label">Device ID</div>
                        <div class="settings-item-value" style="font-family:monospace;font-size:12px;">${deviceId.substring(0, 20)}...</div>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-label">Device Name</div>
                        <input type="text" id="device-name-input" value="${deviceName}" style="width:100%;padding:8px;margin-top:8px;border:1px solid #E0E0E0;border-radius:4px;">
                        <button class="btn-primary" id="save-device-name-btn" style="width:100%;margin-top:8px;">Save Name</button>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-label">App Version</div>
                        <div class="settings-item-value">SDAPWA v${window.CONSTANTS.APP_VERSION}</div>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h3 class="settings-section-title">Sync</h3>
                    <div class="settings-item">
                        <div class="settings-item-label">Status</div>
                        <div class="settings-item-value" id="sync-status-display">${syncStatus.html}</div>
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
                    <button class="btn-secondary" id="sync-now-btn" style="width:100%;margin-top:16px;">Sync Now</button>
                </div>
                
                <div class="settings-section">
                    <h3 class="settings-section-title">Notifications</h3>
                    <div class="settings-item">
                        <div class="settings-item-label">Permission Status</div>
                        <div class="settings-item-value" id="notification-status">${this.getNotificationStatus()}</div>
                    </div>
                    <button class="btn-secondary" id="request-notification-btn" style="width:100%;margin-top:8px;">Request Permission</button>
                    <button class="btn-secondary" id="test-notification-btn" style="width:100%;margin-top:8px;">Test Notification</button>
                </div>
                
                <div class="settings-section">
                    <h3 class="settings-section-title">Location</h3>
                    <div class="settings-item">
                        <div class="settings-item-label">Permission Status</div>
                        <div class="settings-item-value" id="location-status">Checking...</div>
                    </div>
                    <button class="btn-secondary" id="request-location-btn" style="width:100%;margin-top:8px;">Request Permission</button>
                    <button class="btn-secondary" id="test-location-btn" style="width:100%;margin-top:8px;">Test Location</button>
                </div>
                
                <div class="settings-section">
                    <h3 class="settings-section-title">Data Management</h3>
                    <button class="btn-secondary" id="clear-cache-btn" style="width:100%;">Clear Local Cache</button>
                    <button class="btn-secondary" id="export-data-btn" style="width:100%;margin-top:8px;">Export Data (JSON)</button>
                </div>
                
                <div class="settings-section">
                    <h3 class="settings-section-title">About</h3>
                    <div class="settings-item">
                        <div class="settings-item-label">SimplyDone PWA</div>
                        <div class="settings-item-value">ADHD-friendly task management</div>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-label">Sync Compatible With</div>
                        <div class="settings-item-value">SDPC v0.84+</div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
        this.checkLocationPermission();
    },
    
    setupEventListeners() {
        document.getElementById('sign-out-btn')?.addEventListener('click', () => this.signOut());
        document.getElementById('save-device-name-btn')?.addEventListener('click', () => this.saveDeviceName());
        document.getElementById('save-workday-btn')?.addEventListener('click', () => this.saveWorkdayEndTime());
        document.getElementById('sync-now-btn')?.addEventListener('click', () => this.syncNow());
        document.getElementById('request-notification-btn')?.addEventListener('click', () => this.requestNotificationPermission());
        document.getElementById('test-notification-btn')?.addEventListener('click', () => this.testNotification());
        document.getElementById('request-location-btn')?.addEventListener('click', () => this.requestLocationPermission());
        document.getElementById('test-location-btn')?.addEventListener('click', () => this.testLocation());
        document.getElementById('clear-cache-btn')?.addEventListener('click', () => this.clearCache());
        document.getElementById('export-data-btn')?.addEventListener('click', () => this.exportData());
    },
    
    getSyncStatus() {
        if (!navigator.onLine) return { html: '<span style="color:#FF9800">⚠️ Offline</span>', status: 'offline' };
        if (window.syncManager && window.syncManager.quotaExceeded) return { html: '<span style="color:#FF9800">⚠️ Quota Exceeded (resets at midnight UTC)</span>', status: 'quota' };
        if (window.syncManager && window.syncManager.isSyncing) return { html: '<span style="color:#2196F3">🔄 Syncing...</span>', status: 'syncing' };
        return { html: '<span style="color:#4CAF50">✓ Connected</span>', status: 'connected' };
    },
    
    getOfflineQueueCount() {
        const queue = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.OFFLINE_QUEUE, []);
        return queue.length > 0 ? queue.length + ' pending' : 'Empty';
    },
    
    getNotificationStatus() {
        if (!('Notification' in window)) return 'Not supported';
        return Notification.permission === 'granted' ? '✓ Enabled' : Notification.permission === 'denied' ? '✗ Denied' : 'Not requested';
    },
    
    async checkLocationPermission() {
        const statusEl = document.getElementById('location-status');
        if (!statusEl) return;
        
        if (!('geolocation' in navigator)) {
            statusEl.textContent = 'Not supported';
            return;
        }
        
        try {
            const result = await navigator.permissions.query({ name: 'geolocation' });
            statusEl.textContent = result.state === 'granted' ? '✓ Enabled' : result.state === 'denied' ? '✗ Denied' : 'Not requested';
        } catch (e) {
            statusEl.textContent = 'Unknown';
        }
    },
    
    async signOut() {
        try { await window.Auth.signOut(); }
        catch (e) { console.error('Sign out error:', e); }
    },
    
    async saveDeviceName() {
        const input = document.getElementById('device-name-input');
        const newName = input?.value?.trim();
        if (!newName) { window.App.showToast('Device name cannot be empty', 'error'); return; }
        
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.DEVICE_NAME, newName);
        
        try {
            const userId = window.Auth.getUserId();
            const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
            if (userId && deviceId) {
                await window.db.collection('users').doc(userId).collection('devices').doc(deviceId).update({ device_name: newName, last_sync: window.DateTimeUtils.utcNowISO() });
            }
            window.App.showToast('Device name saved!', 'success');
        } catch (e) {
            console.error('Error saving device name:', e);
            window.App.showToast('Saved locally', 'warning');
        }
    },
    
    saveWorkdayEndTime() {
        const input = document.getElementById('workday-end-input');
        const time = input?.value;
        if (!time) { window.App.showToast('Please select a time', 'error'); return; }
        
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.WORKDAY_END_TIME, time);
        window.App.showToast('Workday end time saved: ' + time, 'success');
    },
    
    async syncNow() {
        const btn = document.getElementById('sync-now-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Syncing...'; }
        
        try {
            if (window.syncManager) {
                window.syncManager.quotaExceeded = false;
                await window.syncManager.forceSyncAll();
            }
            window.App.showToast('Sync complete!', 'success');
        } catch (e) {
            console.error('Sync error:', e);
            window.App.showToast('Sync failed', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Sync Now'; }
            this.updateSyncStatus();
        }
    },
    
    updateSyncStatus() {
        const statusEl = document.getElementById('sync-status-display');
        const lastSyncEl = document.getElementById('last-sync-display');
        const queueEl = document.getElementById('offline-queue-count');
        
        if (statusEl) statusEl.innerHTML = this.getSyncStatus().html;
        if (lastSyncEl) {
            const lastSync = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.LAST_SYNC);
            lastSyncEl.textContent = lastSync ? window.DateTimeUtils.getRelativeTimeString(lastSync) : 'Never';
        }
        if (queueEl) queueEl.textContent = this.getOfflineQueueCount();
    },
    
    async requestNotificationPermission() {
        if (!('Notification' in window)) { window.App.showToast('Notifications not supported', 'error'); return; }
        
        try {
            const permission = await Notification.requestPermission();
            document.getElementById('notification-status').textContent = permission === 'granted' ? '✓ Enabled' : permission === 'denied' ? '✗ Denied' : 'Not requested';
            window.App.showToast(permission === 'granted' ? 'Notifications enabled!' : 'Notifications ' + permission, permission === 'granted' ? 'success' : 'warning');
        } catch (e) {
            console.error('Notification permission error:', e);
            window.App.showToast('Failed to request permission', 'error');
        }
    },
    
    testNotification() {
        if (Notification.permission !== 'granted') { window.App.showToast('Notifications not enabled', 'warning'); return; }
        
        // Play notification sound
        if (window.AudioSystem) { window.AudioSystem.init(); window.AudioSystem.playNotificationChime(0.5); }
        
        new Notification('SimplyDone Test', { body: 'Notifications are working! 🎉', icon: 'assets/icons/icon-192.png' });
        window.App.showToast('Test notification sent!', 'success');
    },
    
    async requestLocationPermission() {
        if (!('geolocation' in navigator)) { window.App.showToast('Location not supported', 'error'); return; }
        
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
            });
            document.getElementById('location-status').textContent = '✓ Enabled';
            window.App.showToast('Location enabled!', 'success');
        } catch (e) {
            console.error('Location permission error:', e);
            document.getElementById('location-status').textContent = e.code === 1 ? '✗ Denied' : 'Error';
            window.App.showToast('Location permission denied or error', 'error');
        }
    },
    
    async testLocation() {
        if (!('geolocation' in navigator)) { window.App.showToast('Location not supported', 'error'); return; }
        
        window.App.showToast('Getting location...', 'info');
        
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 15000, enableHighAccuracy: true });
            });
            
            const lat = position.coords.latitude.toFixed(6);
            const lon = position.coords.longitude.toFixed(6);
            const accuracy = Math.round(position.coords.accuracy);
            
            window.App.showToast(`Location: ${lat}, ${lon} (±${accuracy}m)`, 'success');
        } catch (e) {
            console.error('Location test error:', e);
            window.App.showToast('Failed to get location: ' + e.message, 'error');
        }
    },
    
    clearCache() {
        if (!confirm('Clear all local data? You will need to sync again.')) return;
        
        const keysToKeep = [window.CONSTANTS.STORAGE_KEYS.DEVICE_ID, window.CONSTANTS.STORAGE_KEYS.DEVICE_NAME, window.CONSTANTS.STORAGE_KEYS.USER_ID, window.CONSTANTS.STORAGE_KEYS.WORKDAY_END_TIME];
        const allKeys = window.Storage.keys();
        allKeys.forEach(key => { if (!keysToKeep.includes(key)) window.Storage.remove(key); });
        
        window.App.showToast('Cache cleared. Syncing...', 'success');
        if (window.syncManager) window.syncManager.forceSyncAll();
    },
    
    exportData() {
        const data = {
            tasks: window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []),
            goals: window.Storage.get(window.CONSTANTS.STORAGE_KEYS.GOALS, []),
            healthData: window.Storage.get(window.CONSTANTS.STORAGE_KEYS.HEALTH_DATA_TODAY),
            deviceId: window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID),
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'simplydone-export-' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);
        
        window.App.showToast('Data exported!', 'success');
    }
};

window.SettingsScreen = SettingsScreen;
console.log('✓ SettingsScreen loaded (v1.3.0)');
