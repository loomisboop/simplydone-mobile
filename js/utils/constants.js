// SDAPWA v1.1.2 - Constants

// App Information
const APP_VERSION = '1.1.2';
const APP_NAME = 'SimplyDone';

// Firebase Collection Names
const COLLECTIONS = {
    TASKS: 'tasks',
    GOALS: 'goals',
    HEALTH_DATA: 'health_data',
    DEVICES: 'devices',
    FAVORITE_LOCATIONS: 'favorite_locations'
};

// Task Types
const TASK_TYPES = {
    SCHEDULED: 'scheduled',
    RAINY_DAY: 'rainy_day'
};

// Trigger Types
const TRIGGER_TYPES = {
    TIME: 'time',
    LOCATION: 'location',
    MANUAL: 'manual'
};

// Priority Levels (SDPC parity)
const PRIORITIES = {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent'
};

// Priority Colors (SDPC parity)
const PRIORITY_COLORS = {
    low: '#90CAF9',
    normal: '#66BB6A',
    high: '#FFA726',
    urgent: '#EF5350'
};

// Duration Values (SDPC parity)
const DURATIONS = {
    QUICK: 7,
    MEDIUM: 15,
    LONG: 35,
    ANY: 0
};

// Duration Colors (SDPC parity)
const DURATION_COLORS = {
    7: '#009900',   // Green
    15: '#FFCC00',  // Yellow
    35: '#CC0000',  // Red
    0: '#808080'    // Gray
};

// Duration Labels
const DURATION_LABELS = {
    7: '7 minutes',
    15: '15 minutes',
    35: '35 minutes',
    0: 'any time'
};

// Breathing Patterns
const BREATH_PATTERNS = {
    '4-4-6': [4, 4, 6],
    '4-7-8': [4, 7, 8],
    '5-0-7': [5, 0, 7],
    '6-0-8': [6, 0, 8]
};

// Meditation Durations (minutes)
const MEDITATION_DURATIONS = [3, 5, 10, 15, 20, 30];

// Challenge Timer Durations (minutes)
const CHALLENGE_DURATIONS = [7, 15, 35];

// Nature Sounds
const NATURE_SOUNDS = {
    NONE: { label: 'None', file: null },
    RAIN: { label: 'Rain', file: 'assets/sounds/rain.mp3' },
    OCEAN: { label: 'Ocean', file: 'assets/sounds/ocean.mp3' },
    FOREST: { label: 'Forest', file: 'assets/sounds/forest.mp3' },
    STREAM: { label: 'Stream', file: 'assets/sounds/stream.mp3' },
    WHITE_NOISE: { label: 'White Noise', file: 'assets/sounds/whitenoise.mp3' }
};

// Sync Settings - v1.1.2: Reduced frequency to prevent quota issues
const SYNC_SETTINGS = {
    INTERVAL_MS: 60000,  // 60 seconds (was 30, reduced to prevent quota issues)
    RETRY_DELAY_MS: 10000, // 10 seconds (was 5)
    DEBOUNCE_MS: 2000 // New: Debounce writes
};

// Geofence Settings
const GEOFENCE_SETTINGS = {
    DEFAULT_RADIUS_METERS: 100,
    CHECK_INTERVAL_MS: 30000  // 30 seconds
};

// Notification Settings
const NOTIFICATION_SETTINGS = {
    BMDE_WARNING_HOURS: 1  // Alert 1 hour before day ends
};

// Local Storage Keys
const STORAGE_KEYS = {
    USER_ID: 'user_id',
    DEVICE_ID: 'device_id',
    DEVICE_NAME: 'device_name',
    TASKS: 'tasks',
    GOALS: 'goals',
    HEALTH_DATA_TODAY: 'health_data_today',
    FAVORITE_LOCATIONS: 'favorite_locations',
    OFFLINE_QUEUE: 'offline_queue',
    SETTINGS: 'settings',
    LAST_SYNC: 'last_sync',
    CURRENT_TAB: 'current_tab',
    BMDE_EXPANDED: 'bmde_expanded'
};

// Health Data Source Types
const SOURCE_TYPES = {
    SENSOR: 'sensor',
    MANUAL: 'manual',
    IMPORTED: 'imported'
};

// Device Types
const DEVICE_TYPES = {
    ANDROID: 'android',
    IOS: 'ios',
    PC: 'pc'
};

// Screen Names
const SCREENS = {
    SIGNIN: 'signin',
    DASHBOARD: 'dashboard',
    ADD_TASK: 'addtask',
    TASK_LIST: 'tasklist',
    MINDFULNESS: 'mindfulness',
    GOALS_DETAIL: 'goalsdetail',
    CHALLENGE_TIMER: 'challenge',
    SETTINGS: 'settings'
};

// Task Filters
const TASK_FILTERS = {
    ALL: 'all',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    RAINY: 'rainy'
};

// Task Sort Options
const TASK_SORT = {
    DATE_DESC: 'date_desc',
    DATE_ASC: 'date_asc',
    PRIORITY: 'priority',
    DURATION: 'duration',
    NAME: 'name'
};

// Validation Limits
const VALIDATION = {
    TASK_NAME_MIN: 3,
    TASK_NAME_MAX: 100,
    TASK_NOTES_MAX: 500,
    GOAL_NAME_MAX: 20,
    GOAL_DEFINITION_MAX: 200,
    GOAL_THREATS_MAX: 200,
    GOAL_STEP_MAX: 100,
    MAX_GOALS: 3,
    HEALTH_STEPS_MAX: 100000,
    HEALTH_MINUTES_MAX: 1440  // 24 hours
};

// Error Messages
const ERROR_MESSAGES = {
    AUTH_FAILED: 'Sign-in failed. Please try again.',
    SYNC_FAILED: 'Sync failed. Changes will be saved when online.',
    TASK_CREATE_FAILED: 'Failed to create task. Please try again.',
    TASK_UPDATE_FAILED: 'Failed to update task. Please try again.',
    GOAL_CREATE_FAILED: 'Failed to create goal. Please try again.',
    HEALTH_UPDATE_FAILED: 'Failed to update health data. Please try again.',
    LOCATION_PERMISSION_DENIED: 'Location permission denied.',
    NOTIFICATION_PERMISSION_DENIED: 'Notification permission denied.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    QUOTA_EXCEEDED: 'Firebase quota exceeded. Data saved locally, will sync later.',
    SYNC_NOT_READY: 'Sync initializing, please wait...'
};

// Success Messages
const SUCCESS_MESSAGES = {
    TASK_CREATED: 'Task created! ✓',
    TASK_COMPLETED: 'Task completed! ✓',
    TASK_DELETED: 'Task deleted',
    GOAL_CREATED: 'Goal created! ✓',
    GOAL_UPDATED: 'Goal updated! ✓',
    HEALTH_UPDATED: 'Health data updated! ✓',
    SYNC_COMPLETE: 'Sync complete! ✓',
    SIGNED_IN: 'Signed in successfully! ✓',
    SIGNED_OUT: 'Signed out'
};

// Export all constants
window.CONSTANTS = {
    APP_VERSION,
    APP_NAME,
    COLLECTIONS,
    TASK_TYPES,
    TRIGGER_TYPES,
    PRIORITIES,
    PRIORITY_COLORS,
    DURATIONS,
    DURATION_COLORS,
    DURATION_LABELS,
    BREATH_PATTERNS,
    MEDITATION_DURATIONS,
    CHALLENGE_DURATIONS,
    NATURE_SOUNDS,
    SYNC_SETTINGS,
    GEOFENCE_SETTINGS,
    NOTIFICATION_SETTINGS,
    STORAGE_KEYS,
    SOURCE_TYPES,
    DEVICE_TYPES,
    SCREENS,
    TASK_FILTERS,
    TASK_SORT,
    VALIDATION,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES
};

console.log('✓ Constants loaded');
