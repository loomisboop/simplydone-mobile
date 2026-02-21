// SDAPWA v1.3.3 - Task Monitor Service
// Monitors scheduled tasks and triggers notifications when they become active

class TaskMonitor {
    constructor() {
        this.checkInterval = null;
        this.notifiedTasks = new Set(); // Track tasks we've already notified about
        this.isRunning = false;
        this.lastCheck = null;
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        console.log('⏰ Starting TaskMonitor...');
        
        // Load previously notified tasks from storage
        const notified = window.Storage.get('notified_task_starts', []);
        this.notifiedTasks = new Set(notified);
        
        // Check immediately
        this.checkTasks();
        
        // Check every 30 seconds for task start times
        this.checkInterval = setInterval(() => {
            this.checkTasks();
        }, 30000);
        
        // Also listen for task changes
        window.addEventListener('tasks-changed', () => {
            // Small delay to let data settle
            setTimeout(() => this.checkTasks(), 500);
        });
        
        console.log('✓ TaskMonitor started');
    }
    
    stop() {
        console.log('⏹️ Stopping TaskMonitor...');
        this.isRunning = false;
        
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
    
    checkTasks() {
        const now = new Date();
        this.lastCheck = now;
        
        // Get all tasks from storage
        const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
        const tasks = cachedTasks.map(t => window.Task.fromFirestore(t));
        
        // Check each task
        for (const task of tasks) {
            // Skip if already completed, deleted, or already notified
            if (task.completed_at || task.deleted) continue;
            if (this.notifiedTasks.has(task.id)) continue;
            
            // Check scheduled time-based tasks
            if (task.trigger_type === 'time' && task.start) {
                this.checkScheduledTask(task, now);
            }
            
            // Check BMDE tasks near end of day
            if (task.before_day_ends) {
                this.checkBMDETask(task, now);
            }
        }
        
        // Clean up old notified tasks (older than 24 hours)
        this.cleanupNotifiedTasks(tasks);
    }
    
    checkScheduledTask(task, now) {
        const start = window.DateTimeUtils.parseISO(task.start);
        if (!start) return;
        
        const stop = task.stop ? window.DateTimeUtils.parseISO(task.stop) : null;
        
        // Check if task just became active (within last 2 minutes)
        const timeSinceStart = now - start;
        const justStarted = timeSinceStart >= 0 && timeSinceStart < 120000; // Within 2 minutes of start
        
        // Also check if we're within the active window
        const isActive = now >= start && (!stop || now <= stop);
        
        if (justStarted && isActive) {
            this.notifyTaskStart(task);
        }
        
        // Check for upcoming tasks (5 minute warning)
        const timeUntilStart = start - now;
        const fiveMinutes = 5 * 60 * 1000;
        const almostStarting = timeUntilStart > 0 && timeUntilStart <= fiveMinutes;
        
        if (almostStarting && !this.notifiedTasks.has('upcoming-' + task.id)) {
            this.notifyTaskUpcoming(task, Math.round(timeUntilStart / 60000));
        }
    }
    
    checkBMDETask(task, now) {
        const workdayEnd = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.WORKDAY_END_TIME, '17:00');
        const [hours, minutes] = workdayEnd.split(':').map(Number);
        
        const endTime = new Date();
        endTime.setHours(hours, minutes, 0, 0);
        
        // One hour warning
        const oneHourBefore = new Date(endTime);
        oneHourBefore.setHours(oneHourBefore.getHours() - 1);
        
        const timeSinceWarning = now - oneHourBefore;
        const justHitWarning = timeSinceWarning >= 0 && timeSinceWarning < 120000;
        
        if (justHitWarning && !this.notifiedTasks.has('bmde-warning-' + task.id)) {
            this.notifyBMDEWarning(task);
        }
    }
    
    notifyTaskStart(task) {
        console.log('🔔 Task starting notification:', task.name);
        
        // Mark as notified
        this.notifiedTasks.add(task.id);
        this.saveNotifiedTasks();
        
        // Show notification
        if (window.NotificationManager && window.NotificationManager.canNotify()) {
            window.NotificationManager.show(
                '✓ Task Starting Now',
                task.name,
                {
                    tag: 'task-start-' + task.id,
                    requireInteraction: true,
                    data: { taskId: task.id, type: 'task-start' }
                }
            );
        }
        
        // Also refresh the dashboard if visible
        this.refreshDashboard();
    }
    
    notifyTaskUpcoming(task, minutesUntil) {
        console.log('🔔 Task upcoming notification:', task.name, 'in', minutesUntil, 'minutes');
        
        // Mark as notified for upcoming
        this.notifiedTasks.add('upcoming-' + task.id);
        this.saveNotifiedTasks();
        
        // Show notification
        if (window.NotificationManager && window.NotificationManager.canNotify()) {
            window.NotificationManager.show(
                '⏰ Task Starting Soon',
                task.name + ' starts in ' + minutesUntil + ' minute' + (minutesUntil !== 1 ? 's' : ''),
                {
                    tag: 'task-upcoming-' + task.id,
                    requireInteraction: false,
                    data: { taskId: task.id, type: 'task-upcoming' }
                }
            );
        }
    }
    
    notifyBMDEWarning(task) {
        console.log('🔔 BMDE warning notification:', task.name);
        
        // Mark as notified
        this.notifiedTasks.add('bmde-warning-' + task.id);
        this.saveNotifiedTasks();
        
        // Show notification
        if (window.NotificationManager && window.NotificationManager.canNotify()) {
            window.NotificationManager.show(
                '⚠️ Task Due Soon',
                task.name + ' - due before your day ends!',
                {
                    tag: 'bmde-' + task.id,
                    requireInteraction: true,
                    data: { taskId: task.id, type: 'bmde-warning' }
                }
            );
        }
    }
    
    refreshDashboard() {
        // Dispatch event to refresh dashboard
        window.dispatchEvent(new CustomEvent('refresh-dashboard'));
        
        // Also try direct refresh if dashboard is visible
        if (window.DashboardScreen && typeof window.DashboardScreen.refresh === 'function') {
            window.DashboardScreen.refresh();
        }
    }
    
    saveNotifiedTasks() {
        // Save to storage, but only keep recent ones
        window.Storage.set('notified_task_starts', Array.from(this.notifiedTasks));
    }
    
    cleanupNotifiedTasks(currentTasks) {
        // Remove notifications for tasks that no longer exist or are completed
        const currentIds = new Set(currentTasks.map(t => t.id));
        
        for (const notifiedId of this.notifiedTasks) {
            // Extract base task ID (remove prefixes like 'upcoming-' or 'bmde-warning-')
            const baseId = notifiedId.replace('upcoming-', '').replace('bmde-warning-', '');
            
            // If task doesn't exist or is completed, remove from notified set
            const task = currentTasks.find(t => t.id === baseId);
            if (!task || task.completed_at || task.deleted) {
                this.notifiedTasks.delete(notifiedId);
            }
        }
        
        this.saveNotifiedTasks();
    }
    
    // Clear notification state for a specific task (e.g., when rescheduled)
    clearTaskNotification(taskId) {
        this.notifiedTasks.delete(taskId);
        this.notifiedTasks.delete('upcoming-' + taskId);
        this.notifiedTasks.delete('bmde-warning-' + taskId);
        this.saveNotifiedTasks();
    }
}

window.TaskMonitor = TaskMonitor;
console.log('✓ TaskMonitor loaded (v1.3.3)');
