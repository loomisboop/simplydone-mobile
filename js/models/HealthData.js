// SDAPWA v1.0.0 - Health Data Model (SDPC v0.84 Parity with Multi-Source)

class HealthData {
    constructor(data = {}) {
        this.date = data.date || window.DateTimeUtils.getTodayDateString();
        this.steps_walked = data.steps_walked || 0;
        this.exercise_minutes = data.exercise_minutes || 0;
        this.mindfulness_minutes = data.mindfulness_minutes || 0;
        this.last_updated = data.last_updated || window.DateTimeUtils.utcNowISO();
        this.source_device = data.source_device || null;
        this.merged_at = data.merged_at || null;
        this.sources = data.sources || {};
    }
    
    // Update data from single source
    updateFromSource(sourceData, deviceId, sourceType) {
        // Create source key: {device_type}-{source_type}-{device_id}
        const deviceType = deviceId.split('-')[0]; // e.g., "android"
        const sourceKey = `${deviceType}-${sourceType}-${deviceId}`;
        
        // Add/update this source
        this.sources[sourceKey] = {
            steps: sourceData.steps || 0,
            exercise: sourceData.exercise || 0,
            mindfulness: sourceData.mindfulness || 0,
            timestamp: window.DateTimeUtils.utcNowISO()
        };
        
        // Recalculate aggregated values
        this._recalculateAggregates();
        
        // Update metadata
        this.last_updated = window.DateTimeUtils.utcNowISO();
        this.source_device = deviceId;
        this.merged_at = window.DateTimeUtils.utcNowISO();
    }
    
    // Recalculate aggregated values from all sources
    _recalculateAggregates() {
        // Steps: SUM all sources
        this.steps_walked = Object.values(this.sources)
            .reduce((sum, source) => sum + (source.steps || 0), 0);
        
        // Exercise: LATEST timestamp wins
        const exerciseSources = Object.values(this.sources)
            .filter(s => s.exercise > 0)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        this.exercise_minutes = exerciseSources.length > 0 ? exerciseSources[0].exercise : 0;
        
        // Mindfulness: LATEST timestamp wins
        const mindfulnessSources = Object.values(this.sources)
            .filter(s => s.mindfulness > 0)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        this.mindfulness_minutes = mindfulnessSources.length > 0 ? mindfulnessSources[0].mindfulness : 0;
    }
    
    // Get source count
    getSourceCount() {
        return Object.keys(this.sources).length;
    }
    
    // Get sources list
    getSourcesList() {
        return Object.entries(this.sources).map(([key, data]) => ({
            key,
            ...data
        }));
    }
    
    // Check if has data
    hasData() {
        return this.steps_walked > 0 || 
               this.exercise_minutes > 0 || 
               this.mindfulness_minutes > 0;
    }
    
    // Convert to Firestore format
    toFirestore() {
        return {
            date: this.date,
            steps_walked: this.steps_walked,
            exercise_minutes: this.exercise_minutes,
            mindfulness_minutes: this.mindfulness_minutes,
            last_updated: this.last_updated,
            source_device: this.source_device,
            merged_at: this.merged_at,
            sources: this.sources
        };
    }
    
    // Create from Firestore data
    static fromFirestore(data) {
        return new HealthData(data);
    }
    
    // Factory: Create new health data entry
    static newEntry(date, steps = 0, exercise = 0, mindfulness = 0) {
        return new HealthData({
            date: date || window.DateTimeUtils.getTodayDateString(),
            steps_walked: steps,
            exercise_minutes: exercise,
            mindfulness_minutes: mindfulness
        });
    }
    
    // Factory: Create from manual entry
    static fromManualEntry(date, steps, exercise, mindfulness, deviceId) {
        const health = new HealthData({ date });
        health.updateFromSource(
            { steps, exercise, mindfulness },
            deviceId,
            window.CONSTANTS.SOURCE_TYPES.MANUAL
        );
        return health;
    }
    
    // Factory: Create from sensor data
    static fromSensorData(date, steps, deviceId) {
        const health = new HealthData({ date });
        health.updateFromSource(
            { steps, exercise: 0, mindfulness: 0 },
            deviceId,
            window.CONSTANTS.SOURCE_TYPES.SENSOR
        );
        return health;
    }
    
    // Validate health data
    validate() {
        return window.Validation.validateHealthData(this);
    }
}

// Export
window.HealthData = HealthData;

console.log('✓ HealthData model loaded');
