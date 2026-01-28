// SDAPWA v1.0.0 - Date/Time Utilities

// Generate ISO string with Z suffix (matches SDPC)
function utcNowISO() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// Parse ISO string to Date object
function parseISO(isoString) {
    if (!isoString) return null;
    try {
        const cleaned = isoString.replace('Z', '');
        return new Date(cleaned);
    } catch (error) {
        console.error('Error parsing ISO date:', error);
        return null;
    }
}

// Format date for display (local time)
function formatLocalDateTime(date) {
    if (!date) return '';
    if (typeof date === 'string') {
        date = parseISO(date);
    }
    if (!date) return '';
    
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear().toString().slice(-2);
    
    return `${displayHours}:${displayMinutes} ${ampm} ${month}/${day}/${year}`;
}

// Format date for display (date only)
function formatLocalDate(date) {
    if (!date) return '';
    if (typeof date === 'string') {
        date = parseISO(date);
    }
    if (!date) return '';
    
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${month}/${day}/${year}`;
}

// Format time only
function formatTime(date) {
    if (!date) return '';
    if (typeof date === 'string') {
        date = parseISO(date);
    }
    if (!date) return '';
    
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${ampm}`;
}

// Get date string in YYYY-MM-DD format
function getDateString(date) {
    if (!date) date = new Date();
    if (typeof date === 'string') {
        date = parseISO(date);
    }
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// Get today's date string
function getTodayDateString() {
    return getDateString(new Date());
}

// Check if date is today
function isToday(date) {
    if (typeof date === 'string') {
        date = parseISO(date);
    }
    if (!date) return false;
    
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

// Check if date is in the past
function isPast(date) {
    if (typeof date === 'string') {
        date = parseISO(date);
    }
    if (!date) return false;
    
    return date < new Date();
}

// Check if date is in the future
function isFuture(date) {
    if (typeof date === 'string') {
        date = parseISO(date);
    }
    if (!date) return false;
    
    return date > new Date();
}

// Get relative time string (e.g., "2 hours ago", "in 3 days")
function getRelativeTimeString(date) {
    if (typeof date === 'string') {
        date = parseISO(date);
    }
    if (!date) return '';
    
    const now = new Date();
    const diffMs = date - now;
    const diffSec = Math.abs(Math.floor(diffMs / 1000));
    const isPast = diffMs < 0;
    
    let value, unit;
    
    if (diffSec < 60) {
        value = diffSec;
        unit = 'second';
    } else if (diffSec < 3600) {
        value = Math.floor(diffSec / 60);
        unit = 'minute';
    } else if (diffSec < 86400) {
        value = Math.floor(diffSec / 3600);
        unit = 'hour';
    } else if (diffSec < 604800) {
        value = Math.floor(diffSec / 86400);
        unit = 'day';
    } else if (diffSec < 2592000) {
        value = Math.floor(diffSec / 604800);
        unit = 'week';
    } else {
        value = Math.floor(diffSec / 2592000);
        unit = 'month';
    }
    
    const plural = value !== 1 ? 's' : '';
    
    if (isPast) {
        return `${value} ${unit}${plural} ago`;
    } else {
        return `in ${value} ${unit}${plural}`;
    }
}

// Round time to nearest 15 minutes
function roundToNearest15Minutes(date) {
    if (!date) date = new Date();
    const ms = 1000 * 60 * 15; // 15 minutes in milliseconds
    return new Date(Math.ceil(date.getTime() / ms) * ms);
}

// Add minutes to date
function addMinutes(date, minutes) {
    if (typeof date === 'string') {
        date = parseISO(date);
    }
    if (!date) return null;
    
    return new Date(date.getTime() + minutes * 60000);
}

// Add hours to date
function addHours(date, hours) {
    return addMinutes(date, hours * 60);
}

// Add days to date
function addDays(date, days) {
    if (typeof date === 'string') {
        date = parseISO(date);
    }
    if (!date) return null;
    
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

// Get start of day
function getStartOfDay(date) {
    if (!date) date = new Date();
    if (typeof date === 'string') {
        date = parseISO(date);
    }
    if (!date) return null;
    
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

// Get end of day
function getEndOfDay(date) {
    if (!date) date = new Date();
    if (typeof date === 'string') {
        date = parseISO(date);
    }
    if (!date) return null;
    
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

// Format duration in minutes to human readable
function formatDuration(minutes) {
    if (!minutes || minutes === 0) return 'any time';
    if (minutes < 60) return `${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (mins === 0) {
        return `${hours} hr${hours !== 1 ? 's' : ''}`;
    } else {
        return `${hours} hr${hours !== 1 ? 's' : ''} ${mins} min`;
    }
}

// Format countdown timer (MM:SS)
function formatCountdown(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Check if time is now (within time window)
function isTimeNow(startISO, stopISO) {
    const start = parseISO(startISO);
    const stop = parseISO(stopISO);
    
    if (!start || !stop) return false;
    
    const now = new Date();
    return now >= start && now <= stop;
}

// Get day name
function getDayName(date) {
    if (typeof date === 'string') {
        date = parseISO(date);
    }
    if (!date) return '';
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
}

// Get month name
function getMonthName(date) {
    if (typeof date === 'string') {
        date = parseISO(date);
    }
    if (!date) return '';
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[date.getMonth()];
}

// Export all functions
window.DateTimeUtils = {
    utcNowISO,
    parseISO,
    formatLocalDateTime,
    formatLocalDate,
    formatTime,
    getDateString,
    getTodayDateString,
    isToday,
    isPast,
    isFuture,
    getRelativeTimeString,
    roundToNearest15Minutes,
    addMinutes,
    addHours,
    addDays,
    getStartOfDay,
    getEndOfDay,
    formatDuration,
    formatCountdown,
    isTimeNow,
    getDayName,
    getMonthName
};

console.log('✓ DateTimeUtils loaded');
