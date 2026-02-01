// SDAPWA v1.0.0 - Health Data Merger Service

const HealthMerger = {
    // Merge health data from new source into existing data
    // Returns merged HealthData object
    merge(existingData, newSourceData, deviceId, sourceType) {
        // If no existing data, create new
        if (!existingData) {
            const health = new window.HealthData({
                date: newSourceData.date || window.DateTimeUtils.getTodayDateString()
            });
            health.updateFromSource(newSourceData, deviceId, sourceType);
            return health;
        }
        
        // Ensure existingData is HealthData instance
        if (!(existingData instanceof window.HealthData)) {
            existingData = window.HealthData.fromFirestore(existingData);
        }
        
        // Update from new source
        existingData.updateFromSource(newSourceData, deviceId, sourceType);
        
        return existingData;
    },
    
    // Merge strategy for steps: SUM all sources
    mergeSteps(sources) {
        return Object.values(sources)
            .reduce((sum, source) => sum + (source.steps || 0), 0);
    },
    
    // Merge strategy for exercise: LATEST timestamp wins
    mergeExercise(sources) {
        const exerciseSources = Object.values(sources)
            .filter(s => s.exercise > 0)
            .sort((a, b) => {
                const dateA = new Date(a.timestamp);
                const dateB = new Date(b.timestamp);
                return dateB - dateA; // Descending (newest first)
            });
        
        return exerciseSources.length > 0 ? exerciseSources[0].exercise : 0;
    },
    
    // Merge strategy for mindfulness: LATEST timestamp wins
    mergeMindfulness(sources) {
        const mindfulnessSources = Object.values(sources)
            .filter(s => s.mindfulness > 0)
            .sort((a, b) => {
                const dateA = new Date(a.timestamp);
                const dateB = new Date(b.timestamp);
                return dateB - dateA; // Descending (newest first)
            });
        
        return mindfulnessSources.length > 0 ? mindfulnessSources[0].mindfulness : 0;
    },
    
    // Get merged health data for a specific date from Firestore
    async getMergedHealthData(userId, date) {
        try {
            const docRef = window.db
                .collection(`users/${userId}/health_data`)
                .doc(date);
            
            const doc = await docRef.get();
            
            if (!doc.exists) {
                return null;
            }
            
            return window.HealthData.fromFirestore(doc.data());
        } catch (error) {
            console.error('Error getting health data:', error);
            throw error;
        }
    },
    
    // Save merged health data to Firestore
    async saveMergedHealthData(userId, healthData) {
        try {
            const docRef = window.db
                .collection(`users/${userId}/health_data`)
                .doc(healthData.date);
            
            await docRef.set(healthData.toFirestore());
            
            console.log(`✓ Saved health data for ${healthData.date}`);
            return true;
        } catch (error) {
            console.error('Error saving health data:', error);
            throw error;
        }
    },
    
    // Update health data with new source data (convenience method)
    async updateHealthData(userId, date, sourceData, deviceId, sourceType) {
        try {
            // Get existing data
            const existing = await this.getMergedHealthData(userId, date);
            
            // Merge with new source
            const merged = this.merge(existing, sourceData, deviceId, sourceType);
            
            // Save back to Firestore
            await this.saveMergedHealthData(userId, merged);
            
            return merged;
        } catch (error) {
            console.error('Error updating health data:', error);
            throw error;
        }
    },
    
    // Add sensor data (steps only)
    async addSensorData(userId, date, steps, deviceId) {
        return this.updateHealthData(
            userId,
            date,
            { steps, exercise: 0, mindfulness: 0 },
            deviceId,
            window.CONSTANTS.SOURCE_TYPES.SENSOR
        );
    },
    
    // Add manual data (any combination)
    async addManualData(userId, date, steps, exercise, mindfulness, deviceId) {
        return this.updateHealthData(
            userId,
            date,
            { steps, exercise, mindfulness },
            deviceId,
            window.CONSTANTS.SOURCE_TYPES.MANUAL
        );
    },
    
    // Add mindfulness minutes (from meditation timer)
    async addMindfulnessMinutes(userId, minutes, deviceId) {
        const today = window.DateTimeUtils.getTodayDateString();
        return this.updateHealthData(
            userId,
            today,
            { steps: 0, exercise: 0, mindfulness: minutes },
            deviceId,
            window.CONSTANTS.SOURCE_TYPES.MANUAL
        );
    },
    
    // Get today's health data
    async getTodayHealthData(userId) {
        const today = window.DateTimeUtils.getTodayDateString();
        return this.getMergedHealthData(userId, today);
    },
    
    // Example of merge logic for testing/debugging
    exampleMerge() {
        console.log('=== Health Data Merge Example ===');
        
        // Create initial data from Android sensor
        const health = new window.HealthData({
            date: '2026-01-21'
        });
        
        console.log('1. Initial (empty):', {
            steps: health.steps_walked,
            exercise: health.exercise_minutes,
            mindfulness: health.mindfulness_minutes
        });
        
        // Add sensor data
        health.updateFromSource(
            { steps: 5000, exercise: 0, mindfulness: 0 },
            'android-pixel8-abc123',
            window.CONSTANTS.SOURCE_TYPES.SENSOR
        );
        
        console.log('2. After sensor data:', {
            steps: health.steps_walked, // 5000
            exercise: health.exercise_minutes,
            mindfulness: health.mindfulness_minutes
        });
        
        // Add manual exercise from mobile
        health.updateFromSource(
            { steps: 0, exercise: 20, mindfulness: 0 },
            'android-pixel8-abc123',
            window.CONSTANTS.SOURCE_TYPES.MANUAL
        );
        
        console.log('3. After manual exercise:', {
            steps: health.steps_walked, // 5000
            exercise: health.exercise_minutes, // 20
            mindfulness: health.mindfulness_minutes
        });
        
        // Add manual data from PC
        health.updateFromSource(
            { steps: 1000, exercise: 30, mindfulness: 15 },
            'pc-desktop-xyz789',
            window.CONSTANTS.SOURCE_TYPES.MANUAL
        );
        
        console.log('4. After PC manual data:', {
            steps: health.steps_walked, // 6000 (SUM: 5000 + 0 + 1000)
            exercise: health.exercise_minutes, // 30 (LATEST: PC timestamp)
            mindfulness: health.mindfulness_minutes, // 15 (LATEST: PC timestamp)
            sources: health.getSourceCount() // 3
        });
        
        console.log('Sources:', health.getSourcesList());
    }
};

// Export
window.HealthMerger = HealthMerger;

console.log('✓ HealthMerger service loaded');
