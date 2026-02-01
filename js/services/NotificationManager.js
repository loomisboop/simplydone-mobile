// SDAPWA v1.0.0 - Notification Manager Service

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
        console.log(`🔔 Current permission: ${this.permission}`);
        
        return true;
    }
    
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
    }
    
    // Show notification
    show(title, body, options = {}) {
        if (this.permission !== 'granted') {
            console.log('Cannot show notification - permission not granted');
            return null;
        }
        
        const defaultOptions = {
            body: body,
            icon: '/assets/icons/icon-192.png',
            badge: '/assets/icons/icon-96.png',
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
            
            console.log(`🔔 Notification shown: ${title}`);
            return notification;
            
        } catch (error) {
            console.error('Error showing notification:', error);
            return null;
        }
    }
    
    // Handle notification click
    _handleNotificationClick(tag) {
        // Tag format: "task-{id}" or "goal-{id}" or screen name
        if (tag.startsWith('task-')) {
            // Navigate to task list
            window.App.showScreen(window.CONSTANTS.SCREENS.TASK_LIST);
        } else if (tag.startsWith('goal-')) {
            // Navigate to goals
            window.App.showScreen(window.CONSTANTS.SCREENS.GOALS_DETAIL);
        } else if (tag === 'health') {
            // Navigate to mindfulness/health tab
            window.App.showScreen(window.CONSTANTS.SCREENS.MINDFULNESS);
        }
    }
    
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
                    `Time to: ${task.name}`,
                    {
                        tag: `task-${task.id}`,
                        requireInteraction: true
                    }
                );
            }, delay);
            
            console.log(`🔔 Scheduled notification for task: ${task.name}`);
        }
    }
    
    // Show location arrival notification
    showLocationArrival(task) {
        this.show(
            'Location Reached',
            `You're near: ${task.name}`,
            {
                tag: `task-${task.id}`,
                icon: '/assets/icons/icon-192.png'
            }
        );
    }
    
    // Show "Before My Day Ends" reminder
    showBeforeDayEndsReminder(tasks) {
        if (tasks.length === 0) return;
        
        const count = tasks.length;
        const taskNames = tasks.slice(0, 3).map(t => t.name).join(', ');
        
        this.show(
            'Before Day Ends Reminder',
            `${count} task${count !== 1 ? 's' : ''} pending: ${taskNames}${count > 3 ? '...' : ''}`,
            {
                tag: 'bmde-reminder',
                requireInteraction: true
            }
        );
    }
    
    // Show daily step goal reminder
    showStepGoalReminder(currentSteps, goalSteps) {
        const percentage = Math.round((currentSteps / goalSteps) * 100);
        
        this.show(
            'Step Goal Progress',
            `You're at ${percentage}% of your daily step goal (${currentSteps.toLocaleString()}/${goalSteps.toLocaleString()})`,
            {
                tag: 'health-steps',
                icon: '/assets/icons/icon-192.png'
            }
        );
    }
    
    // Show mindfulness reminder
    showMindfulnessReminder() {
        this.show(
            'Time for Mindfulness',
            'Take a few minutes to breathe and relax',
            {
                tag: 'health',
                icon: '/assets/icons/icon-192.png'
            }
        );
    }
    
    // Show sync success (first time only)
    showSyncSuccess() {
        this.show(
            'SimplyDone',
            'Successfully synced with your PC! ✓',
            {
                tag: 'sync-success',
                requireInteraction: false
            }
        );
    }
    
    // Show sync error
    showSyncError() {
        this.show(
            'Sync Error',
            'Unable to sync data. Will retry when online.',
            {
                tag: 'sync-error',
                requireInteraction: false
            }
        );
    }
    
    // Show achievement notification
    showAchievement(title, message) {
        this.show(
            `🎉 ${title}`,
            message,
            {
                tag: 'achievement',
                vibrate: [200, 100, 200, 100, 200],
                requireInteraction: false
            }
        );
    }
    
    // Check if permission is granted
    isGranted() {
        return this.permission === 'granted';
    }
    
    // Check if permission is denied
    isDenied() {
        return this.permission === 'denied';
    }
    
    // Check if permission can be requested
    canRequest() {
        return this.permission === 'default';
    }
};

// Initialize
NotificationManager.init();

// Export
window.NotificationManager = NotificationManager;

console.log('✓ NotificationManager loaded');
