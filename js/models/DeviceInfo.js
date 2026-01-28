// SDAPWA v1.0.0 - FavoriteLocation and DeviceInfo Models

// ============================================================================
// FavoriteLocation Model
// ============================================================================

class FavoriteLocation {
    constructor(data = {}) {
        this.id = data.id || this._generateId();
        this.nickname = data.nickname || '';
        this.address = data.address || '';
        this.lat = data.lat || 0;
        this.lon = data.lon || 0;
        this.radius_meters = data.radius_meters || 100;
        this.use_count = data.use_count || 0;
        this.last_used = data.last_used || null;
        this.created_at = data.created_at || window.DateTimeUtils.utcNowISO();
    }
    
    // Touch (update last_used and increment use_count)
    touch() {
        this.last_used = window.DateTimeUtils.utcNowISO();
        this.use_count += 1;
    }
    
    // Convert to JSON
    toJSON() {
        return {
            id: this.id,
            nickname: this.nickname,
            address: this.address,
            lat: this.lat,
            lon: this.lon,
            radius_meters: this.radius_meters,
            use_count: this.use_count,
            last_used: this.last_used,
            created_at: this.created_at
        };
    }
    
    // Create from JSON
    static fromJSON(data) {
        return new FavoriteLocation(data);
    }
    
    // Factory: Create new favorite location
    static newLocation(nickname, address, lat, lon, radiusMeters = 100) {
        return new FavoriteLocation({
            nickname,
            address,
            lat,
            lon,
            radius_meters: radiusMeters
        });
    }
    
    // Private: Generate UUID
    _generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

// ============================================================================
// DeviceInfo Model
// ============================================================================

class DeviceInfo {
    constructor(data = {}) {
        this.device_id = data.device_id || this._generateDeviceId();
        this.device_name = data.device_name || this._getDefaultDeviceName();
        this.device_type = data.device_type || this._detectDeviceType();
        this.last_sync = data.last_sync || null;
        this.app_version = data.app_version || window.CONSTANTS.APP_VERSION;
        this.created_at = data.created_at || window.DateTimeUtils.utcNowISO();
    }
    
    // Touch (update last_sync)
    touch() {
        this.last_sync = window.DateTimeUtils.utcNowISO();
    }
    
    // Update device name
    setName(name) {
        this.device_name = name;
    }
    
    // Convert to Firestore format
    toFirestore() {
        return {
            device_id: this.device_id,
            device_name: this.device_name,
            device_type: this.device_type,
            last_sync: this.last_sync,
            app_version: this.app_version,
            created_at: this.created_at
        };
    }
    
    // Create from Firestore data
    static fromFirestore(data) {
        return new DeviceInfo(data);
    }
    
    // Private: Generate device ID
    _generateDeviceId() {
        const deviceType = this._detectDeviceType();
        const model = this._detectDeviceModel();
        const random = this._generateRandomString(8);
        return `${deviceType}-${model}-${random}`;
    }
    
    // Private: Detect device type
    _detectDeviceType() {
        const ua = navigator.userAgent.toLowerCase();
        
        if (ua.includes('android')) {
            return window.CONSTANTS.DEVICE_TYPES.ANDROID;
        } else if (ua.includes('iphone') || ua.includes('ipad')) {
            return window.CONSTANTS.DEVICE_TYPES.IOS;
        } else {
            return window.CONSTANTS.DEVICE_TYPES.ANDROID; // Default to android for PWA
        }
    }
    
    // Private: Detect device model
    _detectDeviceModel() {
        const ua = navigator.userAgent.toLowerCase();
        
        // Try to parse model from user agent
        if (ua.includes('pixel')) {
            return 'pixel';
        } else if (ua.includes('samsung')) {
            return 'samsung';
        } else if (ua.includes('iphone')) {
            return 'iphone';
        } else if (ua.includes('ipad')) {
            return 'ipad';
        } else {
            return 'mobile';
        }
    }
    
    // Private: Get default device name
    _getDefaultDeviceName() {
        const type = this._detectDeviceType();
        const model = this._detectDeviceModel();
        
        return `My ${model.charAt(0).toUpperCase() + model.slice(1)}`;
    }
    
    // Private: Generate random string
    _generateRandomString(length) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}

// Export
window.FavoriteLocation = FavoriteLocation;
window.DeviceInfo = DeviceInfo;

console.log('✓ FavoriteLocation and DeviceInfo models loaded');
