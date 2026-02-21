// SDAPWA v1.3.2 - Geofence Monitor (FIXED: completed tasks don't re-trigger)

class GeofenceMonitor {
    constructor(userId) {
        this.userId = userId;
        this.locationTasks = [];
        this.watchId = null;
        this.checkInterval = null;
        this.lastPosition = null;
        this.isRunning = false;
        this.completedTaskIds = new Set(); // Track completed task IDs to prevent re-triggering
    }
    
    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        console.log('📍 Starting geofence monitor...');
        
        // Load previously completed location task IDs from storage
        const completedIds = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.COMPLETED_LOCATION_TASKS, []);
        this.completedTaskIds = new Set(completedIds);
        
        // Request location permission
        if (!navigator.geolocation) {
            console.warn('Geolocation not supported');
            return;
        }
        
        // Watch position continuously
        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                this.lastPosition = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                this.checkGeofences(this.lastPosition.lat, this.lastPosition.lon);
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
        
        // Listen for task changes to update our list
        window.addEventListener('tasks-changed', (e) => {
            this.onTasksChanged(e.detail);
        });
        
        console.log('✓ Geofence monitor started');
    }
    
    // Called when tasks change - update our location tasks list
    onTasksChanged(tasks) {
        // Update completed task IDs
        tasks.forEach(task => {
            if (task.trigger_type === 'location' && task.completed_at) {
                this.completedTaskIds.add(task.id);
            }
        });
        
        // Save to storage
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.COMPLETED_LOCATION_TASKS, Array.from(this.completedTaskIds));
        
        // Update location tasks list (exclude completed)
        this.locationTasks = tasks.filter(t => 
            t.trigger_type === 'location' && 
            !t.completed_at && 
            !t.deleted &&
            !this.completedTaskIds.has(t.id)
        );
        
        console.log('📍 Location tasks updated: ' + this.locationTasks.length + ' active');
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
                .filter(t => !t.completed_at && !this.completedTaskIds.has(t.id));
            
            console.log('📍 Monitoring ' + this.locationTasks.length + ' location tasks');
        } catch (e) {
            console.error('Error loading location tasks:', e);
            // Fall back to local cache
            const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            this.locationTasks = cachedTasks
                .map(t => window.Task.fromFirestore(t))
                .filter(t => t.trigger_type === 'location' && !t.completed_at && !t.deleted && !this.completedTaskIds.has(t.id));
        }
    }
    
    checkGeofences(userLat, userLon) {
        for (const task of this.locationTasks) {
            if (!task.location_lat || !task.location_lon) continue;
            
            // Double-check: skip if completed or in completed set
            if (task.completed_at || this.completedTaskIds.has(task.id)) continue;
            
            const radiusMeters = task.location_radius_meters || 100;
            const inside = this.isInsideGeofence(userLat, userLon, task.location_lat, task.location_lon, radiusMeters);
            
            // Entry detection
            if (inside && !task.location_arrived_at) {
                this.onGeofenceEnter(task, userLat, userLon);
            }
        }
    }
    
    isInsideGeofence(userLat, userLon, targetLat, targetLon, radiusMeters) {
        // Haversine formula
        const R = 6371000; // Earth's radius in meters
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
        console.log('📍 Entered geofence for task:', task.name);
        
        // Mark arrival time
        task.location_arrived_at = window.DateTimeUtils.utcNowISO();
        
        // Add to triggered tasks list (for showing in Do These 3 Now)
        const triggeredTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.LOCATION_TRIGGERED_TASKS, []);
        if (!triggeredTasks.includes(task.id)) {
            triggeredTasks.push(task.id);
            window.Storage.set(window.CONSTANTS.STORAGE_KEYS.LOCATION_TRIGGERED_TASKS, triggeredTasks);
        }
        
        // Update task in Firestore
        try {
            const userId = window.Auth.getUserId();
            await window.db.collection('users').doc(userId).collection('tasks').doc(task.id).update({
                location_arrived_at: task.location_arrived_at,
                modified_at: window.DateTimeUtils.utcNowISO()
            });
        } catch (e) {
            console.error('Error updating task arrival:', e);
        }
        
        // Update local cache
        const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
        const taskIndex = cachedTasks.findIndex(t => t.id === task.id);
        if (taskIndex !== -1) {
            cachedTasks[taskIndex].location_arrived_at = task.location_arrived_at;
            window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, cachedTasks);
        }
        
        // Show notification
        this.showArrivalNotification(task);
        
        // Notify UI to refresh
        window.dispatchEvent(new CustomEvent('tasks-changed', { 
            detail: cachedTasks.map(t => window.Task.fromFirestore(t)) 
        }));
    }
    
    showArrivalNotification(task) {
        console.log('🔔 Showing location arrival notification for:', task.name);
        
        // Use NotificationManager if available (preferred)
        if (window.NotificationManager) {
            window.NotificationManager.showLocationArrival(task);
        } else {
            // Fallback: Play sound
            if (window.AudioSystem) {
                window.AudioSystem.playLocationArrivalChime();
            }
            
            // Fallback: Show toast
            if (window.App && window.App.showToast) {
                window.App.showToast('📍 You arrived at ' + (task.location_nickname || 'location') + '!', 'info');
            }
            
            // Fallback: Browser notification if permitted
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('SimplyDone', {
                    body: 'You arrived at ' + (task.location_nickname || 'your location') + '. Time to: ' + task.name,
                    icon: '/assets/icons/icon-192.png'
                });
            }
        }
    }
    
    // Mark a task as completed (called from Dashboard)
    markTaskCompleted(taskId) {
        this.completedTaskIds.add(taskId);
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.COMPLETED_LOCATION_TASKS, Array.from(this.completedTaskIds));
        
        // Remove from location tasks
        this.locationTasks = this.locationTasks.filter(t => t.id !== taskId);
        
        // Remove from triggered tasks
        const triggeredTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.LOCATION_TRIGGERED_TASKS, []);
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.LOCATION_TRIGGERED_TASKS, triggeredTasks.filter(id => id !== taskId));
    }
    
    async refresh() {
        await this.loadLocationTasks();
    }
}

window.GeofenceMonitor = GeofenceMonitor;
console.log('✓ GeofenceMonitor loaded (v1.3.2 - fixed re-trigger)');
