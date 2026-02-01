// SDAPWA v1.3.0 - Geofence Monitor (iOS compatible)

class GeofenceMonitor {
    constructor(userId) {
        this.userId = userId;
        this.watchId = null;
        this.locationTasks = [];
        this.checkInterval = null;
        this.isRunning = false;
        this.lastPosition = null;
    }
    
    async start() {
        if (this.isRunning) { console.log('Geofence monitor already running'); return; }
        console.log('📍 Starting geofence monitor...');
        
        // Check for geolocation support
        if (!('geolocation' in navigator)) {
            console.warn('Geolocation not supported');
            return;
        }
        
        // Request permission
        try {
            const position = await this.getCurrentPosition();
            this.lastPosition = position;
            console.log('📍 Initial position:', position.lat, position.lon);
        } catch (e) {
            console.warn('Could not get initial position:', e.message);
        }
        
        this.isRunning = true;
        
        // Start watching position
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const pos = { lat: position.coords.latitude, lon: position.coords.longitude, accuracy: position.coords.accuracy };
                this.lastPosition = pos;
                this.checkGeofences(pos.lat, pos.lon);
            },
            (error) => {
                console.error('Location watch error:', error.message);
                // On iOS, watchPosition can fail - fall back to periodic polling
                if (!this.checkInterval) {
                    this.startPolling();
                }
            },
            { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
        );
        
        // Also poll periodically as backup (important for iOS)
        this.startPolling();
        
        // Load location tasks
        await this.loadLocationTasks();
        
        console.log('✓ Geofence monitor started');
    }
    
    startPolling() {
        if (this.checkInterval) return;
        
        this.checkInterval = setInterval(async () => {
            try {
                const pos = await this.getCurrentPosition();
                this.lastPosition = pos;
                this.checkGeofences(pos.lat, pos.lon);
            } catch (e) {
                console.log('Polling location failed:', e.message);
            }
        }, 30000); // Check every 30 seconds
    }
    
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude, accuracy: position.coords.accuracy }),
                (error) => reject(error),
                { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 }
            );
        });
    }
    
    stop() {
        console.log('⏹️ Stopping geofence monitor...');
        this.isRunning = false;
        
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
        console.log('✓ Geofence monitor stopped');
    }
    
    async loadLocationTasks() {
        try {
            const snapshot = await window.db
                .collection('users/' + this.userId + '/tasks')
                .where('trigger_type', '==', 'location')
                .where('deleted', '==', false)
                .get();
            
            this.locationTasks = snapshot.docs
                .map(doc => window.Task.fromFirestore({ id: doc.id, ...doc.data() }))
                .filter(t => !t.completed_at);
            
            console.log('📍 Monitoring ' + this.locationTasks.length + ' location tasks');
        } catch (e) {
            console.error('Error loading location tasks:', e);
            // Fall back to local cache
            const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            this.locationTasks = cachedTasks
                .map(t => window.Task.fromFirestore(t))
                .filter(t => t.trigger_type === 'location' && !t.completed_at && !t.deleted);
        }
    }
    
    checkGeofences(userLat, userLon) {
        for (const task of this.locationTasks) {
            if (!task.location_lat || !task.location_lon) continue;
            if (task.completed_at) continue;
            
            const radiusMeters = task.location_radius_meters || 100;
            const inside = this.isInsideGeofence(userLat, userLon, task.location_lat, task.location_lon, radiusMeters);
            
            // Entry detection
            if (inside && !task.location_arrived_at) {
                this.onGeofenceEnter(task, userLat, userLon);
            }
            // Exit detection (optional - location tasks stay until done)
            // We don't auto-remove location tasks when leaving
        }
    }
    
    isInsideGeofence(userLat, userLon, targetLat, targetLon, radiusMeters) {
        // Haversine formula
        const R = 6371000; // Earth radius in meters
        const dLat = (targetLat - userLat) * Math.PI / 180;
        const dLon = (targetLon - userLon) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(userLat * Math.PI / 180) * Math.cos(targetLat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        
        return distance <= radiusMeters;
    }
    
    async onGeofenceEnter(task, userLat, userLon) {
        console.log('📍 Entered geofence: ' + task.name);
        
        try {
            const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
            const arrivalTime = window.DateTimeUtils.utcNowISO();
            
            // Update task in Firestore
            await window.db.collection('users/' + this.userId + '/tasks').doc(task.id).update({
                location_arrived_at: arrivalTime,
                modified_at: arrivalTime,
                modified_by: deviceId,
                sync_version: firebase.firestore.FieldValue.increment(1)
            });
            
            // Update local task
            task.location_arrived_at = arrivalTime;
            
            // Add to triggered tasks list (for Do These 3 Now)
            const triggered = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.LOCATION_TRIGGERED_TASKS, []);
            if (!triggered.includes(task.id)) {
                triggered.push(task.id);
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.LOCATION_TRIGGERED_TASKS, triggered);
            }
            
            // Update local cache
            const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            const idx = cachedTasks.findIndex(t => t.id === task.id);
            if (idx !== -1) {
                cachedTasks[idx].location_arrived_at = arrivalTime;
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, cachedTasks);
            }
            
            // Notify UI to refresh
            window.dispatchEvent(new CustomEvent('tasks-changed', { 
                detail: cachedTasks.map(t => window.Task.fromFirestore(t))
            }));
            
            // Show notification
            this.showArrivalNotification(task);
            
            console.log('✓ Task triggered: ' + task.id);
            
        } catch (e) {
            console.error('Error updating task arrival:', e);
            
            // Still add to triggered list locally
            const triggered = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.LOCATION_TRIGGERED_TASKS, []);
            if (!triggered.includes(task.id)) {
                triggered.push(task.id);
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.LOCATION_TRIGGERED_TASKS, triggered);
            }
        }
    }
    
    showArrivalNotification(task) {
        // Play sound
        if (window.AudioSystem) {
            window.AudioSystem.init();
            window.AudioSystem.playLocationArrivalChime(0.6);
        }
        
        // Show notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('📍 Location Task', {
                body: 'You\'re near: ' + task.name,
                icon: 'assets/icons/icon-192.png',
                tag: 'location-' + task.id,
                requireInteraction: true
            });
        }
        
        // Also show in-app toast
        if (window.App) {
            window.App.showToast('📍 You\'re near: ' + task.name, 'info');
        }
    }
    
    async refresh() {
        await this.loadLocationTasks();
    }
}

window.GeofenceMonitor = GeofenceMonitor;
console.log('✓ GeofenceMonitor loaded (v1.3.0)');
