// SDAPWA v1.0.0 - Settings Screen

const SettingsScreen = {
    render(container) {
        const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID) || 'Unknown';
        const deviceName = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_NAME) || 'My Device';
        const lastSync = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.LAST_SYNC);
        const lastSyncFormatted = lastSync ? window.DateTimeUtils.getRelativeTimeString(lastSync) : 'Never';
        const user = window.Auth.getCurrentUser();
        const userEmail = user ? user.email : 'Not signed in';
        
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
                        <div class="settings-item-value" style="font-family:monospace;font-size:12px;">${user ? user.uid : 'N/A'}</div>
                    </div>
                    <button class="btn-danger" onclick="SettingsScreen.signOut()" style="width:100%;margin-top:16px;">
                        Sign Out
                    </button>
                </div>
                
                <!-- Device Section -->
                <div class="settings-section">
                    <h3 class="settings-section-title">Device</h3>
                    <div class="settings-item">
                        <div class="settings-item-label">Device ID</div>
                        <div class="settings-item-value" style="font-family:monospace;font-size:12px;">${deviceId}</div>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-label">Device Name</div>
                        <input type="text" id="device-name-input" value="${deviceName}" 
                               style="width:100%;padding:8px;margin-top:8px;border:1px solid #E0E0E0;border-radius:4px;">
                        <button class="btn-primary" onclick="SettingsScreen.saveDeviceName()" 
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
                        <div class="settings-item-value">
                            <span style="color:#4CAF50;">● Connected</span>
                        </div>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-label">Last Sync</div>
                        <div class="settings-item-value">${lastSyncFormatted}</div>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-label">Firebase Project</div>
                        <div class="settings-item-value">simplydonesync</div>
                    </div>
                    <button class="btn-secondary" onclick="SettingsScreen.syncNow()" style="width:100%;margin-top:16px;">
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
                    <button class="btn-outline" onclick="SettingsScreen.clearCache()" style="width:100%;margin-bottom:8px;">
                        Clear Local Cache
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
        if (!window.syncManager) {
            window.App.showToast('Sync manager not initialized', 'error');
            return;
        }
        
        window.App.showToast('Syncing...', 'info');
        await window.syncManager.forceSyncAll();
        window.App.showToast('Sync complete!', 'success');
    },
    
    clearCache() {
        if (!confirm('Clear local cache? Your data will re-sync from Firebase.')) {
            return;
        }
        
        const keysToKeep = [
            window.CONSTANTS.STORAGE_KEYS.DEVICE_ID,
            window.CONSTANTS.STORAGE_KEYS.DEVICE_NAME,
            window.CONSTANTS.STORAGE_KEYS.USER_ID
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
    }
};

window.SettingsScreen = SettingsScreen;
console.log('✓ SettingsScreen loaded');
