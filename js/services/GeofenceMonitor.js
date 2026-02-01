// SDAPWA v1.0.0 - Geofence Monitor Service

class GeofenceMonitor {
    constructor(userId) {
        this.userId = userId;
        this.watchId = null;
        this.locationTasks = [];
        this.checkInterval = null;
        this.isRunning = false;
    }
    
    // Start monitoring
    async start() {
        if (this.isRunning) {
            console.log('⚠️ Geofence monitor already running');
            return;
        }
        
        console.log('📍 Starting geofence monitor...');
        
        // Request location permission
        const permission = await window.Geolocation.requestPermission();
        if (!permission.granted) {
            console.warn('📍 Location permission denied');
            return;
        }
        
        this.isRunning = true;
        
        // Watch user location
        this.watchId = window.Geolocation.watchPosition(
            (position) => {
                this.checkGeofences(position.lat, position.lon);
            },
            (error) => {
                console.error('Location watch error:', error);
            }
        );
        
        // Also check periodically (backup)
        this.checkInterval = setInterval(() => {
            this.getCurrentLocationAndCheck();
        }, window.CONSTANTS.GEOFENCE_SETTINGS.CHECK_INTERVAL_MS);
        
        // Load location-based tasks
        await this.loadLocationTasks();
        
        console.log('✓ Geofence monitor started');
    }
    
    // Stop monitoring
    stop() {
        console.log('⏹️ Stopping geofence monitor...');
        
        this.isRunning = false;
        
        if (this.watchId) {
            window.Geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
        console.log('✓ Geofence monitor stopped');
    }
    
    // Load location-based tasks from Firestore
    async loadLocationTasks() {
        try {
            const snapshot = await window.db
                .collection(`users/${this.userId}/tasks`)
                .where('trigger_type', '==', window.CONSTANTS.TRIGGER_TYPES.LOCATION)
                .where('completed_at', '==', null)
                .where('deleted', '==', false)
                .get();
            
            this.locationTasks = snapshot.docs.map(doc => 
                window.Task.fromFirestore({ id: doc.id, ...doc.data() })
            );
            
            console.log(`📍 Monitoring ${this.locationTasks.length} location tasks`);
        } catch (error) {
            console.error('Error loading location tasks:', error);
        }
    }
    
    // Get current location and check geofences
    async getCurrentLocationAndCheck() {
        try {
            const position = await window.Geolocation.getCurrentPosition();
            this.checkGeofences(position.lat, position.lon);
        } catch (error) {
            console.error('Location error:', error);
        }
    }
    
    // Check all geofences against current position
    checkGeofences(userLat, userLon) {
        for (const task of this.locationTasks) {
            if (!task.location_lat || !task.location_lon) continue;
            
            const radiusMeters = task.location_radius_meters || 
                                 window.CONSTANTS.GEOFENCE_SETTINGS.DEFAULT_RADIUS_METERS;
            
            const inside = window.Geolocation.isInsideGeofence(
                userLat,
                userLon,
                task.location_lat,
                task.location_lon,
                radiusMeters
            );
            
            // Check for entry
            if (inside && !task.location_arrived_at) {
                this.onGeofenceEnter(task, userLat, userLon);
            }
            // Check for exit
            else if (!inside && task.location_arrived_at && !task.location_left_at) {
                this.onGeofenceExit(task);
            }
        }
    }
    
    // Handle geofence entry
    async onGeofenceEnter(task, userLat, userLon) {
        console.log(`📍 Entered geofence: ${task.name}`);
        
        try {
            // Update task with arrival time
            const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
            const arrivalTime = window.DateTimeUtils.utcNowISO();
            
            await window.db
                .collection(`users/${this.userId}/tasks`)
                .doc(task.id)
                .update({
                    location_arrived_at: arrivalTime,
                    modified_at: arrivalTime,
                    modified_by: deviceId,
                    sync_version: firebase.firestore.FieldValue.increment(1)
                });
            
            // Update local task
            task.location_arrived_at = arrivalTime;
            
            // Show notification
            if (task.notify_on_arrival) {
                this.showArrivalNotification(task);
            }
            
            console.log(`✓ Updated task arrival: ${task.id}`);
            
        } catch (error) {
            console.error('Error updating task arrival:', error);
        }
    }
    
    // Handle geofence exit
    async onGeofenceExit(task) {
        console.log(`📍 Left geofence: ${task.name}`);
        
        try {
            // Update task with departure time
            const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
            const departureTime = window.DateTimeUtils.utcNowISO();
            
            await window.db
                .collection(`users/${this.userId}/tasks`)
                .doc(task.id)
                .update({
                    location_left_at: departureTime,
                    modified_at: departureTime,
                    modified_by: deviceId,
                    sync_version: firebase.firestore.FieldValue.increment(1)
                });
            
            // Update local task
            task.location_left_at = departureTime;
            
            console.log(`✓ Updated task departure: ${task.id}`);
            
        } catch (error) {
            console.error('Error updating task departure:', error);
        }
    }
    
    // Show arrival notification
    showArrivalNotification(task) {
        if (window.NotificationManager) {
            window.NotificationManager.showNotification(
                'Location Task',
                `You're near: ${task.name}`,
                task.id
            );
        }
    }
    
    // Refresh location tasks list
    async refresh() {
        await this.loadLocationTasks();
    }
}

// Export
window.GeofenceMonitor = GeofenceMonitor;

console.log('✓ GeofenceMonitor loaded');
