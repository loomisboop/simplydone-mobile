// SDAPWA v1.0.0 - Storage Utilities (localStorage wrapper)

const Storage = {
    // Get item from localStorage with JSON parsing
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            if (item === null) return defaultValue;
            return JSON.parse(item);
        } catch (error) {
            console.error(`Storage.get error for key "${key}":`, error);
            return defaultValue;
        }
    },
    
    // Set item in localStorage with JSON stringification
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Storage.set error for key "${key}":`, error);
            return false;
        }
    },
    
    // Remove item from localStorage
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Storage.remove error for key "${key}":`, error);
            return false;
        }
    },
    
    // Clear all localStorage
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Storage.clear error:', error);
            return false;
        }
    },
    
    // Check if key exists
    has(key) {
        return localStorage.getItem(key) !== null;
    },
    
    // Get all keys
    keys() {
        try {
            return Object.keys(localStorage);
        } catch (error) {
            console.error('Storage.keys error:', error);
            return [];
        }
    },
    
    // Get storage size estimate (in bytes)
    getSize() {
        try {
            let total = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length + key.length;
                }
            }
            return total;
        } catch (error) {
            console.error('Storage.getSize error:', error);
            return 0;
        }
    },
    
    // Get human-readable storage size
    getSizeFormatted() {
        const bytes = this.getSize();
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / 1048576).toFixed(2)} MB`;
    }
};

// Export
window.Storage = Storage;

console.log('✓ Storage utils loaded');
