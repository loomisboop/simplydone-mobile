// SDAPWA v1.0.0 - Geolocation Utilities

const Geolocation = {
    // Request current location
    async getCurrentPosition() {
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by this browser');
        }
        
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    });
                },
                (error) => {
                    reject(this._getErrorMessage(error));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        });
    },
    
    // Watch position (returns watchId)
    watchPosition(callback, errorCallback) {
        if (!navigator.geolocation) {
            if (errorCallback) {
                errorCallback(new Error('Geolocation is not supported'));
            }
            return null;
        }
        
        return navigator.geolocation.watchPosition(
            (position) => {
                callback({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                });
            },
            (error) => {
                if (errorCallback) {
                    errorCallback(this._getErrorMessage(error));
                }
            },
            {
                enableHighAccuracy: false, // Less battery drain for watching
                timeout: 10000,
                maximumAge: 60000 // Cache for 1 minute
            }
        );
    },
    
    // Stop watching position
    clearWatch(watchId) {
        if (watchId && navigator.geolocation) {
            navigator.geolocation.clearWatch(watchId);
        }
    },
    
    // Calculate distance between two points (Haversine formula)
    // Returns distance in meters
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const φ1 = this._toRadians(lat1);
        const φ2 = this._toRadians(lat2);
        const Δφ = this._toRadians(lat2 - lat1);
        const Δλ = this._toRadians(lon2 - lon1);
        
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return R * c; // Distance in meters
    },
    
    // Check if point is inside geofence
    isInsideGeofence(userLat, userLon, targetLat, targetLon, radiusMeters) {
        const distance = this.calculateDistance(userLat, userLon, targetLat, targetLon);
        return distance <= radiusMeters;
    },
    
    // Format distance for display
    formatDistance(meters) {
        if (meters < 1000) {
            return `${Math.round(meters)} meters`;
        } else {
            const km = meters / 1000;
            return `${km.toFixed(1)} km`;
        }
    },
    
    // Format distance in human-readable units (with blocks for small distances)
    formatDistanceHuman(meters) {
        if (meters < 100) {
            return `${Math.round(meters)} m`;
        } else if (meters < 500) {
            const blocks = Math.round(meters / 80); // Rough city block approximation
            return `~${blocks} block${blocks !== 1 ? 's' : ''}`;
        } else if (meters < 1000) {
            return `${Math.round(meters)} m`;
        } else {
            return `${(meters / 1000).toFixed(1)} km`;
        }
    },
    
    // Request location permission
    async requestPermission() {
        try {
            const position = await this.getCurrentPosition();
            return {
                granted: true,
                position
            };
        } catch (error) {
            return {
                granted: false,
                error: error.message || error
            };
        }
    },
    
    // Check if permission is granted (best effort)
    async checkPermission() {
        if (!navigator.permissions) {
            // Fallback: try to get position
            try {
                await this.getCurrentPosition();
                return 'granted';
            } catch {
                return 'denied';
            }
        }
        
        try {
            const result = await navigator.permissions.query({ name: 'geolocation' });
            return result.state; // 'granted', 'denied', or 'prompt'
        } catch {
            return 'prompt';
        }
    },
    
    // Geocode address to coordinates (mock - would need API)
    // For v1.0, returns null (requires external geocoding API)
    async geocodeAddress(address) {
        console.warn('Geocoding not implemented - requires external API');
        // In production, would call Google Maps Geocoding API or similar
        return null;
    },
    
    // Reverse geocode coordinates to address (mock - would need API)
    async reverseGeocode(lat, lon) {
        console.warn('Reverse geocoding not implemented - requires external API');
        // In production, would call Google Maps Geocoding API or similar
        return null;
    },
    
    // Get compass bearing from point A to point B
    getBearing(lat1, lon1, lat2, lon2) {
        const φ1 = this._toRadians(lat1);
        const φ2 = this._toRadians(lat2);
        const Δλ = this._toRadians(lon2 - lon1);
        
        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) -
                  Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        const θ = Math.atan2(y, x);
        
        return (this._toDegrees(θ) + 360) % 360; // Normalize to 0-360
    },
    
    // Get compass direction from bearing
    getDirection(bearing) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(bearing / 45) % 8;
        return directions[index];
    },
    
    // Format coordinates for display
    formatCoordinates(lat, lon) {
        const latDir = lat >= 0 ? 'N' : 'S';
        const lonDir = lon >= 0 ? 'E' : 'W';
        return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lon).toFixed(6)}°${lonDir}`;
    },
    
    // Private: Convert degrees to radians
    _toRadians(degrees) {
        return degrees * Math.PI / 180;
    },
    
    // Private: Convert radians to degrees
    _toDegrees(radians) {
        return radians * 180 / Math.PI;
    },
    
    // Private: Get error message from GeolocationPositionError
    _getErrorMessage(error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                return new Error('Location permission denied');
            case error.POSITION_UNAVAILABLE:
                return new Error('Location information unavailable');
            case error.TIMEOUT:
                return new Error('Location request timed out');
            default:
                return new Error('Unknown location error');
        }
    }
};

// Export
window.Geolocation = Geolocation;

console.log('✓ Geolocation utils loaded');
