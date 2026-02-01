// SDAPWA v1.3.0 - Notification Manager Service (with audio integration)

const NotificationManager = {
    permission: 'default',
    
    // Initialize
    async init() {
        console.log('🔔 Initializing NotificationManager...');
        
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.warn('⚠️ Notifications not supported by this browser');
            return false;
        }
        
        this.permission = Notification.permission;
        console.log('🔔 Current permission: ' + this.permission);
        
        return true;
    },
    
    // Request permission
    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('⚠️ Notifications not supported');
            return false;
        }
        
        if (this.permission === 'granted') {
            console.log('✓ Notification permission already granted');
            return true;
        }
        
        if (this.permission === 'denied') {
            console.warn('⚠️ Notification permission denied');
            return false;
        }
        
        console.log('🔔 Requesting notification permission...');
        
        try {
            const permission = await Notification.requestPermission();
            this.permission = permission;
            
            if (permission === 'granted') {
                console.log('✓ Notification permission granted');
                return true;
            } else {
                console.warn('⚠️ Notification permission denied');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    },
    
    // Show notification (v1.3.0: with audio)
    show(title, body, options = {}) {
        // Play notification sound
        if (window.AudioSystem && options.playSound !== false) {
            window.AudioSystem.init();
            window.AudioSystem.playNotificationChime(0.5);
        }
        
        if (this.permission !== 'granted') {
            console.log('Cannot show notification - permission not granted');
            // Still show in-app toast
            if (window.App && window.App.showToast) {
                window.App.showToast(body, 'info');
            }
            return null;
        }
        
        const defaultOptions = {
            body: body,
            icon: 'assets/icons/icon-192.png',
            badge: 'assets/icons/icon-96.png',
            vibrate: [200, 100, 200],
            requireInteraction: false,
            ...options
        };
        
        try {
            const notification = new Notification(title, defaultOptions);
            
            // Handle click
            notification.onclick = () => {
                window.focus();
                notification.close();
                
                // Navigate to relevant screen if tag provided
                if (options.tag && window.App) {
                    this._handleNotificationClick(options.tag);
                }
            };
            
            console.log('🔔 Notification shown: ' + title);
            return notification;
            
        } catch (error) {
            console.error('Error showing notification:', error);
            return null;
        }
    },
    
    // Handle notification click
    _handleNotificationClick(tag) {
        // Tag format: "task-{id}" or "goal-{id}" or screen name
        if (tag.startsWith('task-')) {
            // Navigate to dashboard (tasks)
            window.App.showScreen(window.CONSTANTS.SCREENS.DASHBOARD);
        } else if (tag.startsWith('goal-')) {
            // Navigate to goals
            window.App.showScreen(window.CONSTANTS.SCREENS.GOALS_DETAIL);
        } else if (tag === 'health') {
            // Navigate to mindfulness/health tab
            window.App.showScreen(window.CONSTANTS.SCREENS.MINDFULNESS);
        } else if (tag === 'bmde-reminder') {
            window.App.showScreen(window.CONSTANTS.SCREENS.DASHBOARD);
        }
    },
    
    // Schedule task reminder
    scheduleTaskReminder(task) {
        if (!task.notify_at_time) return;
        
        const start = window.DateTimeUtils.parseISO(task.start);
        if (!start) return;
        
        const now = new Date();
        const delay = start - now;
        
        if (delay > 0 && delay < 24 * 60 * 60 * 1000) { // Within 24 hours
            setTimeout(() => {
                this.show(
                    'Task Starting',
                    'Time to: ' + task.name,
                    {
                        tag: 'task-' + task.id,
                        requireInteraction: true
                    }
                );
            }, delay);
            
            console.log('🔔 Scheduled notification for task: ' + task.name);
        }
    },
    
    // Show location arrival notification (v1.3.0: with location chime)
    showLocationArrival(task) {
        // Play location-specific chime
        if (window.AudioSystem) {
            window.AudioSystem.init();
            window.AudioSystem.playLocationArrivalChime(0.6);
        }
        
        this.show(
            '📍 Location Task',
            'You\'re near: ' + task.name,
            {
                tag: 'task-' + task.id,
                icon: 'assets/icons/icon-192.png',
                requireInteraction: true,
                playSound: false // Already played location chime
            }
        );
    },
    
    // Show "Before My Day Ends" reminder
    showBeforeDayEndsReminder(tasks) {
        if (tasks.length === 0) return;
        
        const count = tasks.length;
        const taskNames = tasks.slice(0, 3).map(t => t.name).join(', ');
        
        this.show(
            '⏰ Before Day Ends Reminder',
            count + ' task' + (count !== 1 ? 's' : '') + ' pending: ' + taskNames + (count > 3 ? '...' : ''),
            {
                tag: 'bmde-reminder',
                requireInteraction: true
            }
        );
    },
    
    // Show "Do These 3 Now" notification when tasks become active
    showDoThese3Now(tasks) {
        if (tasks.length === 0) return;
        
        const taskList = tasks.map(t => '• ' + t.name).join('\n');
        
        this.show(
            '✓ Do These 3 Now',
            tasks.length + ' task' + (tasks.length > 1 ? 's' : '') + ' ready:\n' + taskList,
            {
                tag: 'dt3n',
                requireInteraction: false
            }
        );
    },
    
    // Show goal step reminder
    showGoalStepDue(goal, step) {
        this.show(
            '🎯 Goal Step Due',
            goal.name_one_word + ': ' + step.description,
            {
                tag: 'goal-' + goal.id,
                requireInteraction: true
            }
        );
    },
    
    // Schedule BMDE reminder (1 hour before workday ends)
    scheduleBMDEReminder() {
        const workdayEnd = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.WORKDAY_END_TIME, '17:00');
        const [hours, minutes] = workdayEnd.split(':').map(Number);
        
        const now = new Date();
        const reminderTime = new Date();
        reminderTime.setHours(hours - 1, minutes, 0, 0); // 1 hour before
        
        if (reminderTime > now) {
            const delay = reminderTime - now;
            setTimeout(() => {
                const tasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, [])
                    .map(t => window.Task.fromFirestore(t))
                    .filter(t => t.before_day_ends && !t.completed_at && !t.deleted);
                
                if (tasks.length > 0) {
                    this.showBeforeDayEndsReminder(tasks);
                }
            }, delay);
            
            console.log('🔔 Scheduled BMDE reminder for ' + reminderTime.toLocaleTimeString());
        }
    },
    
    // Check if we can send notifications
    canNotify() {
        return 'Notification' in window && this.permission === 'granted';
    },
    
    // Get permission status for display
    getStatus() {
        if (!('Notification' in window)) return 'Not supported';
        if (this.permission === 'granted') return '✓ Enabled';
        if (this.permission === 'denied') return '✗ Denied';
        return 'Not requested';
    }
};

window.NotificationManager = NotificationManager;
console.log('✓ NotificationManager loaded (v1.3.0)');
