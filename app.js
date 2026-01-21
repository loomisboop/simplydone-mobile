// SimplyDone Mobile App - Compatibility Version
// Works on all browsers, no ES6 modules needed

// Wait for page to load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('SimplyDone Mobile starting...');
    
    // Wait for Firebase to load from CDN
    if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded! Check script tags in index.html');
        showToast('Error: Firebase not loaded');
        return;
    }
    
    console.log('✓ Firebase library loaded');
    
    // Initialize Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyDKmj5YhwFNK90dLq3Um-nMkqqU9Yu5R0E",
        authDomain: "simplydonesync.firebaseapp.com",
        projectId: "simplydonesync",
        storageBucket: "simplydonesync.firebasestorage.app",
        messagingSenderId: "389712724470",
        appId: "1:389712724470:web:0a3f48dde195c1de29c7d7",
        measurementId: "G-ZCCCT2F8R8"
    };
    
    try {
        firebase.initializeApp(firebaseConfig);
        window.db = firebase.firestore();
        console.log('🔥 Firebase initialized! Project:', firebaseConfig.projectId);
    } catch (error) {
        console.error('Firebase init error:', error);
        showToast('Firebase connection failed');
    }
    
    // Initialize app
    initializeApp();
});

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

let currentScreen = 'tasks';
let deviceId = null;
const USER_UID = 'vV0pIk5X0hPggrCwmtluuyAkk3E2'; // Your User UID from PC
let healthData = {
    steps: 0,
    exercise: 0,
    mindfulness: 0,
    date: new Date().toISOString().split('T')[0]
};

// ============================================================================
// INITIALIZATION
// ============================================================================

async function initializeApp() {
    // Generate or load device ID
    deviceId = getOrCreateDeviceId();
    document.getElementById('device-id').textContent = deviceId;
    
    // Set device name
    let deviceName = localStorage.getItem('device-name');
    if (!deviceName) {
        deviceName = prompt('Enter a name for this device:', 'My Tablet') || 'My Tablet';
        localStorage.setItem('device-name', deviceName);
    }
    document.getElementById('device-name').textContent = deviceName;
    
    console.log('📱 Device ID:', deviceId);
    console.log('👤 User UID:', USER_UID);
    console.log('✓ Using your PC User UID - ready to sync!');
    
    // Load cached data
    loadCachedHealthData();
    
    // Start syncing
    startAutoSync();
    
    // Check for geolocation permission
    checkLocationPermission();
    
    // Show welcome message
    setTimeout(() => {
        showToast('Welcome to SimplyDone Mobile! 📱');
        showToast('Connected to Firebase! ☁️');
    }, 500);
}

// ============================================================================
// DEVICE ID MANAGEMENT
// ============================================================================

function getOrCreateDeviceId() {
    let id = localStorage.getItem('device-id');
    if (!id) {
        const model = detectDeviceModel();
        const random = Math.random().toString(36).substring(2, 10);
        id = `android-${model}-${random}`;
        localStorage.setItem('device-id', id);
    }
    return id;
}

function detectDeviceModel() {
    const ua = navigator.userAgent;
    if (/tablet/i.test(ua)) return 'tablet';
    if (/mobile/i.test(ua)) return 'phone';
    return 'device';
}

// ============================================================================
// AUTO SYNC
// ============================================================================

function startAutoSync() {
    // Sync immediately
    syncFromFirebase();
    
    // Sync every 30 seconds
    setInterval(syncFromFirebase, 30000);
    
    console.log('✓ Auto-sync started (every 30 seconds)');
}

async function syncFromFirebase() {
    console.log('🔄 Syncing from Firebase...');
    
    try {
        // Load tasks
        await loadTasksFromFirebase();
        
        // Load goals
        await loadGoalsFromFirebase();
        
        // Load health data
        await loadHealthFromFirebase();
        
        // Update sync status
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('last-sync-time').textContent = timeStr;
        document.getElementById('sync-status-badge').textContent = 'Synced';
        document.getElementById('sync-status-badge').className = 'status-badge status-synced';
        
        console.log('✓ Sync complete!');
        
    } catch (error) {
        console.error('Sync error:', error);
        document.getElementById('sync-status-badge').textContent = 'Offline';
        document.getElementById('sync-status-badge').className = 'status-badge status-offline';
    }
}

// ============================================================================
// SCREEN NAVIGATION - MAKE THESE GLOBAL!
// ============================================================================

window.showScreen = function(screenName) {
    console.log('Navigating to:', screenName);
    
    // Hide all screens
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    // Show selected screen
    document.getElementById(`screen-${screenName}`).classList.add('active');
    
    // Update nav highlighting
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');
    
    currentScreen = screenName;
    
    // Load data for this screen
    if (screenName === 'tasks') loadTasks();
    if (screenName === 'health') loadHealth();
    if (screenName === 'goals') loadGoals();
};

// ============================================================================
// HEALTH DATA MANAGEMENT
// ============================================================================

function loadCachedHealthData() {
    const cached = localStorage.getItem('health-data');
    if (cached) {
        healthData = JSON.parse(cached);
        updateHealthDisplay();
    }
}

function updateHealthDisplay() {
    // Update steps
    document.getElementById('steps-count').textContent = healthData.steps.toLocaleString();
    const stepsPercent = Math.min(100, (healthData.steps / 10000) * 100);
    document.getElementById('steps-progress').style.width = stepsPercent + '%';
    
    // Update exercise
    document.getElementById('exercise-count').textContent = healthData.exercise;
    const exercisePercent = Math.min(100, (healthData.exercise / 30) * 100);
    document.getElementById('exercise-progress').style.width = exercisePercent + '%';
    
    // Update mindfulness
    document.getElementById('mindfulness-count').textContent = healthData.mindfulness;
    const mindfulnessPercent = Math.min(100, (healthData.mindfulness / 15) * 100);
    document.getElementById('mindfulness-progress').style.width = mindfulnessPercent + '%';
    
    // Save to cache
    localStorage.setItem('health-data', JSON.stringify(healthData));
    
    // Update sync status
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById('health-sync-status').textContent = `Last updated: ${timeStr}`;
}

async function loadHealthFromFirebase() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const docRef = window.db.collection(`users/${USER_UID}/health_data`).doc(today);
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
            const data = docSnap.data();
            healthData.steps = data.steps_walked || 0;
            healthData.exercise = data.exercise_minutes || 0;
            healthData.mindfulness = data.mindfulness_minutes || 0;
            healthData.date = today;
            
            updateHealthDisplay();
            console.log('✓ Health data loaded from Firebase');
        }
    } catch (error) {
        console.error('Error loading health data:', error);
    }
}

// Make these functions global so buttons can call them
window.addSteps = function() {
    const steps = prompt('How many steps?', '1000');
    if (steps && !isNaN(steps)) {
        healthData.steps += parseInt(steps);
        updateHealthDisplay();
        showToast(`Added ${steps} steps! 👟`);
        syncHealthToFirebase();
    }
};

window.addExercise = function() {
    const minutes = prompt('How many minutes of exercise?', '15');
    if (minutes && !isNaN(minutes)) {
        healthData.exercise += parseInt(minutes);
        updateHealthDisplay();
        showToast(`Added ${minutes} minutes of exercise! 💪`);
        syncHealthToFirebase();
    }
};

window.addMindfulness = function() {
    const minutes = prompt('How many minutes of mindfulness?', '5');
    if (minutes && !isNaN(minutes)) {
        healthData.mindfulness += parseInt(minutes);
        updateHealthDisplay();
        showToast(`Added ${minutes} minutes of mindfulness! 🧘`);
        syncHealthToFirebase();
    }
};

async function syncHealthToFirebase() {
    console.log('📤 Syncing health data to Firebase...');
    
    try {
        const sourceKey = `android-manual-${deviceId}`;
        const timestamp = new Date().toISOString();
        
        // Get existing data first
        const docRef = window.db.collection(`users/${USER_UID}/health_data`).doc(healthData.date);
        const docSnap = await docRef.get();
        
        let existingSources = {};
        if (docSnap.exists && docSnap.data().sources) {
            existingSources = docSnap.data().sources;
        }
        
        // Add our source
        existingSources[sourceKey] = {
            steps: healthData.steps,
            exercise: healthData.exercise,
            mindfulness: healthData.mindfulness,
            timestamp: timestamp
        };
        
        // Calculate totals
        let totalSteps = 0;
        let latestExercise = { value: 0, time: '' };
        let latestMindfulness = { value: 0, time: '' };
        
        for (const [key, source] of Object.entries(existingSources)) {
            totalSteps += source.steps || 0;
            
            if ((source.exercise || 0) > 0 && source.timestamp > latestExercise.time) {
                latestExercise = { value: source.exercise, time: source.timestamp };
            }
            
            if ((source.mindfulness || 0) > 0 && source.timestamp > latestMindfulness.time) {
                latestMindfulness = { value: source.mindfulness, time: source.timestamp };
            }
        }
        
        // Prepare data
        const dataToSync = {
            date: healthData.date,
            steps_walked: totalSteps,
            exercise_minutes: latestExercise.value,
            mindfulness_minutes: latestMindfulness.value,
            last_updated: timestamp,
            source_device: deviceId,
            sources: existingSources,
            merged_at: timestamp
        };
        
        // Save to Firestore
        await docRef.set(dataToSync);
        
        console.log('✓ Health data synced to Firebase!');
        showToast('Synced with PC! ☁️');
        
    } catch (error) {
        console.error('Sync error:', error);
        showToast('Sync failed - check connection');
    }
}

// ============================================================================
// TASKS MANAGEMENT
// ============================================================================

function loadTasks() {
    loadTasksFromFirebase();
}

async function loadTasksFromFirebase() {
    try {
        const snapshot = await window.db.collection(`users/${USER_UID}/tasks`).get();
        
        const tasks = [];
        snapshot.forEach((doc) => {
            const task = doc.data();
            // PC v0.84 uses completed_at (null = incomplete, timestamp = completed)
            if (!task.completed_at && !task.deleted) {
                tasks.push({ id: doc.id, ...task });
            }
        });
        
        localStorage.setItem('tasks', JSON.stringify(tasks));
        displayTasks(tasks);
        
        console.log(`✓ Loaded ${tasks.length} tasks from Firebase`);
        
    } catch (error) {
        console.error('Error loading tasks:', error);
        loadTasksFromCache();
    }
}

function loadTasksFromCache() {
    const cached = localStorage.getItem('tasks');
    if (cached) {
        const tasks = JSON.parse(cached);
        displayTasks(tasks);
    } else {
        document.getElementById('tasks-list').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📝</div>
                <div class="empty-text">No tasks yet</div>
                <div class="empty-subtext">Tasks from your PC will appear here</div>
            </div>
        `;
    }
}

function displayTasks(tasks) {
    const container = document.getElementById('tasks-list');
    
    if (!tasks || tasks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <div class="empty-text">All done!</div>
                <div class="empty-subtext">You're all caught up</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tasks.map(task => `
        <div class="task-card">
            <div class="task-name">
                ${getTaskIcon(task)} ${task.name}
            </div>
            <div class="task-details">
                ${getTaskDetails(task)}
            </div>
            <button class="btn btn-primary" onclick="completeTask('${task.id}')">
                ✓ Mark Done
            </button>
        </div>
    `).join('');
}

function getTaskIcon(task) {
    if (task.trigger_type === 'location') return '📍';
    if (task.trigger_type === 'time') return '⏰';
    return '📋';
}

function getTaskDetails(task) {
    let details = [];
    if (task.notes) details.push(task.notes);
    if (task.trigger_type === 'time' && task.start) {
        const date = new Date(task.start);
        details.push(date.toLocaleString());
    }
    if (task.trigger_type === 'location' && task.location_nickname) {
        details.push(`At: ${task.location_nickname}`);
    }
    return details.join('<br>') || 'No additional details';
}

window.completeTask = async function(taskId) {
    if (confirm('Mark this task as complete?')) {
        try {
            await window.db.collection(`users/${USER_UID}/tasks`).doc(taskId).update({
                completed: true,
                completed_at: new Date().toISOString(),
                completed_by: deviceId
            });
            
            showToast('Task completed! ✅');
            loadTasksFromFirebase();
            
        } catch (error) {
            console.error('Error completing task:', error);
            showToast('Failed to complete task');
        }
    }
};

// ============================================================================
// GOALS MANAGEMENT
// ============================================================================

function loadGoals() {
    loadGoalsFromFirebase();
}

async function loadGoalsFromFirebase() {
    try {
        const snapshot = await window.db.collection(`users/${USER_UID}/goals`).get();
        
        const goals = [];
        snapshot.forEach((doc) => {
            goals.push({ id: doc.id, ...doc.data() });
        });
        
        localStorage.setItem('goals', JSON.stringify(goals));
        displayGoals(goals);
        
        console.log(`✓ Loaded ${goals.length} goals from Firebase`);
        
    } catch (error) {
        console.error('Error loading goals:', error);
        loadGoalsFromCache();
    }
}

function loadGoalsFromCache() {
    const cached = localStorage.getItem('goals');
    if (cached) {
        const goals = JSON.parse(cached);
        displayGoals(goals);
    } else {
        document.getElementById('goals-list').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎯</div>
                <div class="empty-text">No goals yet</div>
                <div class="empty-subtext">Goals from your PC will appear here</div>
            </div>
        `;
    }
}

function displayGoals(goals) {
    const container = document.getElementById('goals-list');
    
    if (!goals || goals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎯</div>
                <div class="empty-text">No active goals</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = goals.map(goal => {
        const completed = goal.steps.filter(s => s.completed).length;
        const total = goal.steps.length;
        const percent = total > 0 ? (completed / total * 100) : 0;
        
        return `
            <div class="health-card">
                <div class="health-title">
                    <span class="health-icon">✨</span>
                    <span>${goal.name}</span>
                </div>
                <div class="progress-text">${completed} / ${total} steps</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%"></div>
                </div>
                <div class="task-details" style="margin-top: 12px;">
                    ${goal.description || 'No description'}
                </div>
            </div>
        `;
    }).join('');
}

// ============================================================================
// SYNC FUNCTIONALITY
// ============================================================================

window.syncNow = async function() {
    const btn = document.getElementById('sync-btn-text');
    const originalText = btn.textContent;
    btn.innerHTML = '<span class="loading"></span> Syncing...';
    
    await syncFromFirebase();
    
    btn.textContent = originalText;
    showToast('Synced successfully! 🔄');
};

window.showSyncStatus = function() {
    const status = document.getElementById('sync-status-badge').textContent;
    const lastSync = document.getElementById('last-sync-time').textContent;
    alert(`Sync Status\n\nLast sync: ${lastSync}\nStatus: ${status}\nDevice: ${deviceId}\nUser: ${USER_UID}`);
};

window.showSettings = function() {
    showScreen('settings');
};

function loadHealth() {
    loadHealthFromFirebase();
}

// ============================================================================
// LOCATION SERVICES
// ============================================================================

function checkLocationPermission() {
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('✓ Location permission granted');
                localStorage.setItem('last-location', JSON.stringify({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    timestamp: Date.now()
                }));
            },
            (error) => {
                console.warn('Location permission denied:', error);
            }
        );
    }
}

// ============================================================================
// UI HELPERS
// ============================================================================

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 88px;
        left: 50%;
        transform: translateX(-50%);
        background: #323232;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ============================================================================
// SERVICE WORKER FOR OFFLINE SUPPORT
// ============================================================================

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
        console.log('Service Worker registration failed:', err);
    });
}

console.log('SimplyDone Mobile ready! 🚀');
console.log('Compatibility mode - works on all browsers!');


