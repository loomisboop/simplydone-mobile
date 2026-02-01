// SDAPWA v1.0.0 - Task Model (32 fields - SDPC v0.84 Parity)

class Task {
    constructor(data = {}) {
        // Core identification
        this.id = data.id || this._generateId();
        this.name = data.name || '';
        this.type = data.type || window.CONSTANTS.TASK_TYPES.SCHEDULED;
        
        // Time-based scheduling
        this.duration_minutes = data.duration_minutes || 15;
        this.start = data.start || null;
        this.stop = data.stop || null;
        this.before_day_ends = data.before_day_ends || false;
        
        // Location-based scheduling
        this.trigger_type = data.trigger_type || window.CONSTANTS.TRIGGER_TYPES.TIME;
        this.location_nickname = data.location_nickname || null;
        this.location_address = data.location_address || null;
        this.location_lat = data.location_lat || null;
        this.location_lon = data.location_lon || null;
        this.location_radius_meters = data.location_radius_meters || 100;
        this.location_notes = data.location_notes || null;
        this.location_arrived_at = data.location_arrived_at || null;
        this.location_left_at = data.location_left_at || null;
        
        // Task metadata
        this.priority = data.priority || window.CONSTANTS.PRIORITIES.NORMAL;
        this.details = data.details || '';
        this.notes = data.notes || null;
        this.category_tags = data.category_tags || [];
        this.tags = data.tags || [];
        this.estimated_duration_minutes = data.estimated_duration_minutes || null;
        
        // Notifications
        this.notify_on_arrival = data.notify_on_arrival !== undefined ? data.notify_on_arrival : true;
        this.notify_at_time = data.notify_at_time !== undefined ? data.notify_at_time : true;
        this.notification_sound = data.notification_sound || null;
        
        // Sync & versioning
        this.created_at = data.created_at || window.DateTimeUtils.utcNowISO();
        this.modified_at = data.modified_at || null;
        this.modified_by = data.modified_by || null;
        this.sync_version = data.sync_version || 0;
        this.deleted = data.deleted || false;
        
        // Completion
        this.completed_at = data.completed_at || null;
        this.completed_on_device = data.completed_on_device || null;
        
        // Mobile features
        this.attachments = data.attachments || [];
        
        // Legacy/deprecated (keep for SDPC compatibility)
        this.gps_lat = data.gps_lat || null;
        this.gps_lon = data.gps_lon || null;
        this.updated_at = data.updated_at || null;
    }
    
    // Touch (update modification timestamp)
    touch(deviceId) {
        this.modified_at = window.DateTimeUtils.utcNowISO();
        this.updated_at = this.modified_at; // Keep legacy field in sync
        this.modified_by = deviceId;
        this.sync_version += 1;
    }
    
    // Mark as completed
    complete(deviceId) {
        this.completed_at = window.DateTimeUtils.utcNowISO();
        this.completed_on_device = deviceId;
        this.touch(deviceId);
    }
    
    // Check if completed
    isCompleted() {
        return this.completed_at !== null;
    }
    
    // Check if deleted
    isDeleted() {
        return this.deleted === true;
    }
    
    // Check if active (not completed, not deleted)
    isActive() {
        return !this.isCompleted() && !this.isDeleted();
    }
    
    // Soft delete
    markDeleted(deviceId) {
        this.deleted = true;
        this.touch(deviceId);
    }
    
    // Convert to Firestore format
    toFirestore() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            duration_minutes: this.duration_minutes,
            start: this.start,
            stop: this.stop,
            before_day_ends: this.before_day_ends,
            trigger_type: this.trigger_type,
            location_nickname: this.location_nickname,
            location_address: this.location_address,
            location_lat: this.location_lat,
            location_lon: this.location_lon,
            location_radius_meters: this.location_radius_meters,
            location_notes: this.location_notes,
            location_arrived_at: this.location_arrived_at,
            location_left_at: this.location_left_at,
            priority: this.priority,
            details: this.details,
            notes: this.notes,
            category_tags: this.category_tags,
            tags: this.tags,
            estimated_duration_minutes: this.estimated_duration_minutes,
            notify_on_arrival: this.notify_on_arrival,
            notify_at_time: this.notify_at_time,
            notification_sound: this.notification_sound,
            created_at: this.created_at,
            modified_at: this.modified_at,
            modified_by: this.modified_by,
            sync_version: this.sync_version,
            deleted: this.deleted,
            completed_at: this.completed_at,
            completed_on_device: this.completed_on_device,
            attachments: this.attachments,
            gps_lat: this.gps_lat,
            gps_lon: this.gps_lon,
            updated_at: this.updated_at
        };
    }
    
    // Create from Firestore data
    static fromFirestore(data) {
        return new Task(data);
    }
    
    // Factory: Create new scheduled task
    static newScheduled(name, durationMinutes, startISO, stopISO, details = '') {
        const task = new Task({
            name,
            type: window.CONSTANTS.TASK_TYPES.SCHEDULED,
            duration_minutes: durationMinutes,
            start: startISO,
            stop: stopISO,
            details,
            trigger_type: window.CONSTANTS.TRIGGER_TYPES.TIME
        });
        return task;
    }
    
    // Factory: Create new rainy day task
    static newRainyDay(name, durationMinutes, details = '', tags = []) {
        const task = new Task({
            name,
            type: window.CONSTANTS.TASK_TYPES.RAINY_DAY,
            duration_minutes: durationMinutes,
            details,
            category_tags: tags,
            trigger_type: window.CONSTANTS.TRIGGER_TYPES.MANUAL
        });
        return task;
    }
    
    // Factory: Create new location-based task
    static newLocation(name, durationMinutes, locationData) {
        const task = new Task({
            name,
            type: window.CONSTANTS.TASK_TYPES.SCHEDULED,
            duration_minutes: durationMinutes,
            trigger_type: window.CONSTANTS.TRIGGER_TYPES.LOCATION,
            location_nickname: locationData.nickname,
            location_address: locationData.address,
            location_lat: locationData.lat,
            location_lon: locationData.lon,
            location_radius_meters: locationData.radius_meters || 100
        });
        return task;
    }
    
    // Private: Generate UUID
    _generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // Validate task
    validate() {
        return window.Validation.validateTask(this);
    }
}

// Export
window.Task = Task;

console.log('✓ Task model loaded');
