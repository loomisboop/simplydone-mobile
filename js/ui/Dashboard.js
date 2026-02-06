// SDAPWA v1.3.0 - Dashboard Screen (Complete Rewrite)
// Features: Task details modal, separate goal tiles, drag/drop reordering, proper task visibility

const DashboardScreen = {
    tasks: [],
    goals: [],
    healthData: null,
    eventListenersAttached: false,
    draggedItem: null,
    touchTimeout: null,
    isTouchDragging: false,
    
    render(container) {
        this.loadData();
        
        container.innerHTML = `
            <div class="dashboard-screen">
                <div id="items-to-resolve-banner"></div>
                
                <div id="goals-tiles-container" class="goals-tiles-row"></div>
                
                <div class="quick-challenge-launcher">
                    <button class="qc-launch-btn" onclick="window.App.showScreen('quickchallenge')">
                        <span class="qc-launch-icon">⏱️</span>
                        <span class="qc-launch-text">Quick Challenge</span>
                    </button>
                </div>
                
                <div class="dashboard-section">
                    <div class="section-header"><h2 class="section-title">Do These 3 Now</h2></div>
                    <div id="do-these-3-now-container" class="task-list-sortable"></div>
                </div>
                <div class="dashboard-section">
                    <div class="section-header">
                        <h2 class="section-title">Before My Day Ends</h2>
                        <button class="section-toggle" id="bmde-toggle">▼ Hide</button>
                    </div>
                    <div class="section-content" id="bmde-container"></div>
                </div>
                <div id="stats-summary-container"></div>
            </div>
        `;
        
        this.setupEventListeners();
        this.checkForExpiredTasks();
        this.renderItemsToResolveBanner();
        this.renderGoalsTiles();
        this.renderDoTheseThreeNow();
        this.renderBeforeMyDayEnds();
        this.renderStats();
        
        if (!this.eventListenersAttached) {
            window.addEventListener('tasks-changed', (e) => {
                this.tasks = e.detail;
                this.checkForExpiredTasks();
                this.renderItemsToResolveBanner();
                this.renderDoTheseThreeNow();
                this.renderBeforeMyDayEnds();
                this.renderStats();
            });
            window.addEventListener('goals-changed', (e) => {
                this.goals = e.detail;
                this.renderGoalsTiles();
            });
            window.addEventListener('health-data-changed', (e) => {
                this.healthData = e.detail;
                this.renderStats();
            });
            this.eventListenersAttached = true;
        }
    },
    
    loadData() {
        if (window.syncManager) {
            this.tasks = window.syncManager.getCachedTasks();
            this.goals = window.syncManager.getCachedGoals();
            this.healthData = window.syncManager.getCachedHealthData();
        } else {
            const tasksData = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            this.tasks = tasksData.map(t => window.Task.fromFirestore(t));
            const goalsData = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.GOALS, []);
            this.goals = goalsData.map(g => window.Goal.fromFirestore(g));
            const healthDataRaw = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.HEALTH_DATA_TODAY);
            this.healthData = healthDataRaw ? window.HealthData.fromFirestore(healthDataRaw) : null;
        }
    },
    
    setupEventListeners() {
        const toggle = document.getElementById('bmde-toggle');
        if (toggle) toggle.addEventListener('click', () => this.toggleBMDE());
    },
    
    // GOALS - Separate tiles in a row
    renderGoalsTiles() {
        const container = document.getElementById('goals-tiles-container');
        if (!container) return;
        
        if (!this.goals || this.goals.length === 0) {
            container.innerHTML = '<div class="goal-tile goal-tile-empty" onclick="window.App.showScreen(\'goalsdetail\')"><div class="goal-tile-icon">🎯</div><div class="goal-tile-name">No Goals</div><div class="goal-tile-hint">Tap to add</div></div>';
            return;
        }
        
        container.innerHTML = this.goals.slice(0, 3).map(goal => {
            const progress = window.Algorithms.calculateGoalProgress(goal);
            const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
            return '<div class="goal-tile" onclick="window.App.showScreen(\'goalsdetail\')"><div class="goal-tile-name">' + goal.name_one_word + '</div><div class="goal-tile-progress"><div class="goal-tile-bar"><div class="goal-tile-fill" style="width:' + pct + '%"></div></div><span class="goal-tile-text">' + progress.completed + '/' + progress.total + '</span></div></div>';
        }).join('');
    },
    
    // DO THESE 3 NOW
    renderDoTheseThreeNow() {
        const container = document.getElementById('do-these-3-now-container');
        if (!container) return;
        
        const top3 = this.selectDoTheseThreeNow();
        
        if (top3.length === 0) {
            container.innerHTML = '<div class="empty-state"><p class="empty-state-icon">✓</p><p class="empty-state-title">No tasks right now</p><p class="empty-state-message">Add a task or wait for scheduled tasks to start</p></div>';
            return;
        }
        
        const ordered = this.applyCustomOrder(top3, 'dt3n');
        container.innerHTML = ordered.map((task, i) => this.renderTaskCard(task, false, i)).join('');
        this.setupDragAndDrop(container, 'dt3n');
    },
    
    selectDoTheseThreeNow() {
        const now = new Date();
        const locationTriggered = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.LOCATION_TRIGGERED_TASKS, []);
        const itemsToResolve = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.ITEMS_TO_RESOLVE, []);
        const eligible = this.tasks.filter(t => !t.completed_at && !t.deleted && !t.before_day_ends && t.type !== window.CONSTANTS.TASK_TYPES.RAINY_DAY && !itemsToResolve.includes(t.id));
        const result = [];
        
        // Location tasks that are triggered (stay until done)
        const locTasks = eligible.filter(t => {
            if (t.trigger_type !== window.CONSTANTS.TRIGGER_TYPES.LOCATION) return false;
            return (t.location_arrived_at && !t.completed_at) || locationTriggered.includes(t.id);
        });
        result.push(...locTasks.slice(0, 3));
        
        // Time-based tasks active now (not past their end time)
        if (result.length < 3) {
            const timeTasks = eligible.filter(t => {
                if (t.trigger_type === window.CONSTANTS.TRIGGER_TYPES.LOCATION) return false;
                if (t.type !== window.CONSTANTS.TASK_TYPES.SCHEDULED) return false;
                if (result.some(r => r.id === t.id)) return false;
                const start = window.DateTimeUtils.parseISO(t.start);
                const stop = window.DateTimeUtils.parseISO(t.stop);
                return start && stop && now >= start && now <= stop;
            });
            timeTasks.sort((a, b) => (a.duration_minutes || 9999) - (b.duration_minutes || 9999));
            result.push(...timeTasks.slice(0, 3 - result.length));
        }
        return result.slice(0, 3);
    },
    
    // BEFORE MY DAY ENDS
    renderBeforeMyDayEnds() {
        const container = document.getElementById('bmde-container');
        if (!container) return;
        
        const itemsToResolve = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.ITEMS_TO_RESOLVE, []);
        const bmdeTasks = this.tasks.filter(t => t.before_day_ends && !t.completed_at && !t.deleted && t.type !== window.CONSTANTS.TASK_TYPES.RAINY_DAY && !itemsToResolve.includes(t.id));
        
        if (bmdeTasks.length === 0) {
            container.innerHTML = '<div class="empty-state"><p class="empty-state-message">No "Before Day Ends" tasks<br>Park a task here for later today</p></div>';
            return;
        }
        
        const ordered = this.applyCustomOrder(bmdeTasks, 'bmde');
        container.innerHTML = '<div class="thumbwheel-container task-list-sortable" style="max-height:200px;overflow-y:auto;">' + 
            ordered.map((t, i) => '<div class="thumbwheel-item">' + this.renderTaskCard(t, true, i) + '</div>').join('') + 
            '</div><div style="text-align:center;color:#9E9E9E;font-size:12px;margin-top:8px;">' + bmdeTasks.length + ' task' + (bmdeTasks.length !== 1 ? 's' : '') + '</div>';
        this.setupDragAndDrop(container.querySelector('.task-list-sortable'), 'bmde');
    },
    
    // TASK CARD
    renderTaskCard(task, small, index) {
        const durColor = window.CONSTANTS.DURATION_COLORS[task.duration_minutes] || window.CONSTANTS.DURATION_COLORS[0];
        const priColor = window.CONSTANTS.PRIORITY_COLORS[task.priority];
        let timeDetails = '';
        if (task.trigger_type === window.CONSTANTS.TRIGGER_TYPES.LOCATION) {
            timeDetails = '📍 ' + (task.location_nickname || 'Location');
        } else if (task.type === window.CONSTANTS.TASK_TYPES.SCHEDULED && task.start && task.stop) {
            timeDetails = window.DateTimeUtils.formatTime(task.start) + ' - ' + window.DateTimeUtils.formatTime(task.stop);
        } else {
            timeDetails = 'Flexible timing';
        }
        const eid = task.id.replace(/'/g, "\\'");
        return '<div class="task-card ' + (small ? 'small' : '') + '" data-task-id="' + task.id + '" data-index="' + index + '" draggable="true">' +
            '<div class="drag-handle">⋮⋮</div>' +
            '<div class="task-card-header"><div class="task-card-badge" style="background-color:' + durColor + '">' + (task.duration_minutes || '∞') + 'm</div>' +
            '<div class="task-card-content"><div class="task-card-name">' + task.name + '</div><div class="task-card-details">' + timeDetails + '</div></div></div>' +
            '<div class="task-card-actions"><button class="task-btn-details" onclick="DashboardScreen.showTaskDetails(\'' + eid + '\')">Details</button>' +
            '<button class="task-btn-park" onclick="DashboardScreen.showParkMenu(\'' + eid + '\')">Park</button>' +
            '<button class="task-btn-done" onclick="DashboardScreen.completeTask(\'' + eid + '\')">✓ Done</button></div>' +
            '<div class="task-card-priority" style="background-color:' + priColor + '"></div></div>';
    },
    
    // TASK DETAILS MODAL
    showTaskDetails(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) { window.App.showToast('Task not found', 'error'); return; }
        
        const createdAt = task.created_at ? window.DateTimeUtils.formatDateTime(task.created_at) : 'Unknown';
        const startTime = task.start ? window.DateTimeUtils.formatDateTime(task.start) : 'Not set';
        const stopTime = task.stop ? window.DateTimeUtils.formatDateTime(task.stop) : 'Not set';
        
        let locationInfo = '';
        if (task.trigger_type === window.CONSTANTS.TRIGGER_TYPES.LOCATION) {
            const radiusFeet = Math.round((task.location_radius_meters || 100) * 3.28084);
            locationInfo = '<div class="detail-row"><span class="detail-label">Location:</span><span class="detail-value">' + (task.location_nickname || task.location_address || 'Unknown') + '</span></div>' +
                '<div class="detail-row"><span class="detail-label">Address:</span><span class="detail-value">' + (task.location_address || 'Not set') + '</span></div>' +
                '<div class="detail-row"><span class="detail-label">Radius:</span><span class="detail-value">' + radiusFeet + ' feet</span></div>';
            if (task.location_arrived_at) {
                locationInfo += '<div class="detail-row"><span class="detail-label">Arrived:</span><span class="detail-value">' + window.DateTimeUtils.formatDateTime(task.location_arrived_at) + '</span></div>';
            }
        }
        
        const priColors = { low: '#90CAF9', normal: '#66BB6A', high: '#FFA726', urgent: '#EF5350' };
        const priColor = priColors[task.priority] || priColors.normal;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = '<div class="modal-content task-details-modal"><div class="modal-header"><h2>Task Details</h2><button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">✕</button></div>' +
            '<div class="modal-body"><div class="task-details-name">' + task.name + '</div>' +
            '<div class="task-details-badges"><span class="badge" style="background-color:' + (window.CONSTANTS.DURATION_COLORS[task.duration_minutes] || '#808080') + '">' + (task.duration_minutes || '∞') + ' min</span>' +
            '<span class="badge" style="background-color:' + priColor + '">' + (task.priority || 'normal') + '</span>' +
            '<span class="badge badge-type">' + (task.trigger_type === window.CONSTANTS.TRIGGER_TYPES.LOCATION ? '📍 Location' : '⏰ Time-based') + '</span></div>' +
            '<div class="task-details-section">' + (task.trigger_type !== window.CONSTANTS.TRIGGER_TYPES.LOCATION ? 
                '<div class="detail-row"><span class="detail-label">Start:</span><span class="detail-value">' + startTime + '</span></div>' +
                '<div class="detail-row"><span class="detail-label">Stop:</span><span class="detail-value">' + stopTime + '</span></div>' : '') +
            locationInfo +
            '<div class="detail-row"><span class="detail-label">Created:</span><span class="detail-value">' + createdAt + '</span></div>' +
            (task.notes ? '<div class="detail-row detail-row-notes"><span class="detail-label">Notes:</span><span class="detail-value">' + task.notes + '</span></div>' : '') +
            '</div></div><div class="modal-footer"><button class="btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Close</button>' +
            '<button class="btn-primary" onclick="DashboardScreen.editTask(\'' + task.id + '\'); this.closest(\'.modal-overlay\').remove();">Edit</button></div></div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    },
    
    editTask(taskId) {
        window.App.showScreen('tasklist');
        setTimeout(() => { if (window.TaskListScreen && window.TaskListScreen.editTask) window.TaskListScreen.editTask(taskId); }, 100);
    },
    
    // PARK MENU
    showParkMenu(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = '<div class="modal-content park-menu-modal"><div class="modal-header"><h2>Park Task</h2><button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">✕</button></div>' +
            '<div class="modal-body"><p>Where would you like to park "<strong>' + task.name + '</strong>"?</p>' +
            '<div class="park-options"><button class="park-option" onclick="DashboardScreen.parkToBMDE(\'' + taskId + '\'); this.closest(\'.modal-overlay\').remove();">' +
            '<span class="park-icon">📋</span><span class="park-label">Before My Day Ends</span><span class="park-desc">Do it later today</span></button>' +
            '<button class="park-option" onclick="DashboardScreen.parkToRainyDay(\'' + taskId + '\'); this.closest(\'.modal-overlay\').remove();">' +
            '<span class="park-icon">💧</span><span class="park-label">Rainy Day</span><span class="park-desc">Save for someday</span></button></div></div></div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    },
    
    async parkToBMDE(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        const workdayEnd = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.WORKDAY_END_TIME, '17:00');
        task.before_day_ends = true;
        task.start = null;
        const today = new Date();
        const [hours, minutes] = workdayEnd.split(':').map(Number);
        today.setHours(hours, minutes, 0, 0);
        task.stop = today.toISOString();
        const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
        task.touch(deviceId);
        await this.saveTaskUpdate(task, 'Moved to Before My Day Ends');
    },
    
    async parkToRainyDay(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        task.type = window.CONSTANTS.TASK_TYPES.RAINY_DAY;
        task.trigger_type = window.CONSTANTS.TRIGGER_TYPES.MANUAL;
        task.before_day_ends = false;
        task.start = null;
        task.stop = null;
        task.duration_minutes = 0;
        const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
        task.touch(deviceId);
        await this.saveTaskUpdate(task, 'Moved to Rainy Day');
    },
    
    async saveTaskUpdate(task, successMessage) {
        try {
            const userId = window.Auth.getUserId();
            if (!userId) throw new Error('Not signed in');
            await window.db.collection('users').doc(userId).collection('tasks').doc(task.id).update(task.toFirestore());
            const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            const idx = cachedTasks.findIndex(t => t.id === task.id);
            if (idx !== -1) { cachedTasks[idx] = task.toFirestore(); window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, cachedTasks); }
            this.tasks = cachedTasks.map(t => window.Task.fromFirestore(t));
            this.renderDoTheseThreeNow();
            this.renderBeforeMyDayEnds();
            window.dispatchEvent(new CustomEvent('tasks-changed', { detail: this.tasks }));
            window.App.showToast(successMessage, 'success');
        } catch (error) {
            console.error('Error updating task:', error);
            window.App.showToast(error.code === 'resource-exhausted' ? 'Saved locally - will sync later' : 'Failed to update task', error.code === 'resource-exhausted' ? 'warning' : 'error');
        }
    },
    
    // COMPLETE TASK
    async completeTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) { console.error('Task not found:', taskId); return; }
        const taskCard = document.querySelector('[data-task-id="' + taskId + '"]');
        const doneBtn = taskCard ? taskCard.querySelector('.task-btn-done') : null;
        if (doneBtn) { doneBtn.disabled = true; doneBtn.textContent = '...'; }
        
        try {
            const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
            task.complete(deviceId);
            const points = window.Algorithms.calculateChallengePoints(task);
            const userId = window.Auth.getUserId();
            if (!userId) throw new Error('Not signed in');
            
            await window.db.collection('users').doc(userId).collection('tasks').doc(taskId).update({
                completed_at: task.completed_at, completed_on_device: task.completed_on_device,
                modified_at: task.modified_at, modified_by: task.modified_by,
                sync_version: firebase.firestore.FieldValue.increment(1)
            });
            
            // v1.3.2: Notify GeofenceMonitor to prevent re-triggering
            if (task.trigger_type === window.CONSTANTS.TRIGGER_TYPES.LOCATION) {
                const triggered = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.LOCATION_TRIGGERED_TASKS, []);
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.LOCATION_TRIGGERED_TASKS, triggered.filter(id => id !== taskId));
                
                // Tell GeofenceMonitor this task is done
                if (window.geofenceMonitor) {
                    window.geofenceMonitor.markTaskCompleted(taskId);
                }
            }
            
            // v1.3.2: Remove from Items to Resolve if it was there
            this.removeFromItemsToResolve(taskId);
            
            const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            const taskIndex = cachedTasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) { cachedTasks[taskIndex] = task.toFirestore(); window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, cachedTasks); }
            this.tasks = cachedTasks.map(t => window.Task.fromFirestore(t));
            this.renderDoTheseThreeNow();
            this.renderBeforeMyDayEnds();
            this.renderItemsToResolveBanner();
            this.renderStats();
            window.dispatchEvent(new CustomEvent('tasks-changed', { detail: this.tasks }));
            window.App.showToast(points > 0 ? window.CONSTANTS.SUCCESS_MESSAGES.TASK_COMPLETED + ' +' + points + ' points!' : window.CONSTANTS.SUCCESS_MESSAGES.TASK_COMPLETED, 'success');
        } catch (error) {
            console.error('Error completing task:', error);
            if (error.code === 'resource-exhausted') {
                const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
                const taskIndex = cachedTasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) { cachedTasks[taskIndex] = task.toFirestore(); window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, cachedTasks); }
                this.tasks = cachedTasks.map(t => window.Task.fromFirestore(t));
                this.renderDoTheseThreeNow(); this.renderBeforeMyDayEnds(); this.renderStats();
                window.App.showToast('Marked complete locally - will sync later', 'warning');
            } else {
                window.App.showToast(window.CONSTANTS.ERROR_MESSAGES.TASK_UPDATE_FAILED, 'error');
                if (doneBtn) { doneBtn.disabled = false; doneBtn.textContent = '✓ Done'; }
            }
        }
    },
    
    // DRAG AND DROP
    setupDragAndDrop(container, listType) {
        if (!container) return;
        const cards = container.querySelectorAll('.task-card');
        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => this.onDragStart(e, listType));
            card.addEventListener('dragend', (e) => this.onDragEnd(e));
            card.addEventListener('dragover', (e) => this.onDragOver(e));
            card.addEventListener('drop', (e) => this.onDrop(e, listType));
            card.addEventListener('touchstart', (e) => this.onTouchStart(e, card, listType), { passive: false });
            card.addEventListener('touchmove', (e) => this.onTouchMove(e, card), { passive: false });
            card.addEventListener('touchend', (e) => this.onTouchEnd(e, listType));
        });
    },
    
    onDragStart(e, listType) {
        this.draggedItem = e.target.closest('.task-card');
        this.draggedItem.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.draggedItem.dataset.taskId);
    },
    
    onDragEnd(e) {
        if (this.draggedItem) { this.draggedItem.classList.remove('dragging'); this.draggedItem = null; }
        document.querySelectorAll('.task-card').forEach(card => card.classList.remove('drag-over'));
    },
    
    onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const card = e.target.closest('.task-card');
        if (card && card !== this.draggedItem) {
            document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
            card.classList.add('drag-over');
        }
    },
    
    onDrop(e, listType) {
        e.preventDefault();
        const targetCard = e.target.closest('.task-card');
        if (!targetCard || !this.draggedItem || targetCard === this.draggedItem) return;
        const container = targetCard.closest('.task-list-sortable') || targetCard.parentElement;
        const cards = Array.from(container.querySelectorAll('.task-card'));
        const draggedIndex = cards.indexOf(this.draggedItem);
        const targetIndex = cards.indexOf(targetCard);
        if (draggedIndex < targetIndex) { targetCard.parentNode.insertBefore(this.draggedItem, targetCard.nextSibling); }
        else { targetCard.parentNode.insertBefore(this.draggedItem, targetCard); }
        this.saveTaskOrder(listType);
        targetCard.classList.remove('drag-over');
    },
    
    onTouchStart(e, card, listType) {
        this.touchStartY = e.touches[0].clientY;
        this.isTouchDragging = false;
        this.touchTimeout = setTimeout(() => {
            this.isTouchDragging = true;
            this.draggedItem = card;
            card.classList.add('dragging');
            if (navigator.vibrate) navigator.vibrate(50);
        }, 500);
    },
    
    onTouchMove(e, card) {
        if (this.isTouchDragging) {
            e.preventDefault();
            const elemBelow = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
            const cardBelow = elemBelow?.closest('.task-card');
            document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
            if (cardBelow && cardBelow !== this.draggedItem) cardBelow.classList.add('drag-over');
        } else { clearTimeout(this.touchTimeout); }
    },
    
    onTouchEnd(e, listType) {
        clearTimeout(this.touchTimeout);
        if (this.isTouchDragging && this.draggedItem) {
            const elemBelow = document.elementFromPoint(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
            const targetCard = elemBelow?.closest('.task-card');
            if (targetCard && targetCard !== this.draggedItem) {
                const container = targetCard.closest('.task-list-sortable') || targetCard.parentElement;
                const cards = Array.from(container.querySelectorAll('.task-card'));
                const draggedIndex = cards.indexOf(this.draggedItem);
                const targetIndex = cards.indexOf(targetCard);
                if (draggedIndex < targetIndex) { targetCard.parentNode.insertBefore(this.draggedItem, targetCard.nextSibling); }
                else { targetCard.parentNode.insertBefore(this.draggedItem, targetCard); }
                this.saveTaskOrder(listType);
            }
            this.draggedItem.classList.remove('dragging');
            document.querySelectorAll('.task-card').forEach(c => c.classList.remove('drag-over'));
        }
        this.draggedItem = null;
        this.isTouchDragging = false;
    },
    
    saveTaskOrder(listType) {
        const container = document.querySelector('#' + (listType === 'dt3n' ? 'do-these-3-now-container' : 'bmde-container') + ' .task-list-sortable') || document.getElementById(listType === 'dt3n' ? 'do-these-3-now-container' : 'bmde-container');
        if (!container) return;
        const cards = container.querySelectorAll('.task-card');
        const order = Array.from(cards).map(card => card.dataset.taskId);
        const allOrders = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASK_ORDER, {});
        allOrders[listType] = order;
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASK_ORDER, allOrders);
    },
    
    applyCustomOrder(tasks, listType) {
        const allOrders = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASK_ORDER, {});
        const order = allOrders[listType];
        if (!order || order.length === 0) return tasks;
        const orderedTasks = [];
        const remainingTasks = [...tasks];
        order.forEach(taskId => {
            const idx = remainingTasks.findIndex(t => t.id === taskId);
            if (idx !== -1) orderedTasks.push(remainingTasks.splice(idx, 1)[0]);
        });
        orderedTasks.push(...remainingTasks);
        return orderedTasks;
    },
    
    // STATS
    renderStats() {
        const container = document.getElementById('stats-summary-container');
        if (!container) return;
        const completedToday = this.tasks.filter(t => t.completed_at && window.DateTimeUtils.isToday(t.completed_at));
        let doingPoints = 0;
        completedToday.forEach(task => { doingPoints += window.Algorithms.calculateChallengePoints(task); });
        const beingPoints = this.healthData ? Math.floor((this.healthData.mindfulness_minutes || 0) * 1.5) : 0;
        const steps = this.healthData ? (this.healthData.steps_walked || 0) : 0;
        container.innerHTML = '<div class="stats-summary"><div class="stats-row"><div class="stat-item"><span class="stat-value doing">' + doingPoints + '</span><span class="stat-label">Doing</span></div><div class="stat-item"><span class="stat-value being">' + beingPoints + '</span><span class="stat-label">Being</span></div><div class="stat-item"><span class="stat-value steps">' + steps.toLocaleString() + '</span><span class="stat-label">🚶 Steps</span></div></div><div class="stats-completed">Completed Today: ' + completedToday.length + '</div></div>';
    },
    
    toggleBMDE() {
        const container = document.getElementById('bmde-container');
        const toggle = document.getElementById('bmde-toggle');
        if (!container || !toggle) return;
        const isCollapsed = container.classList.contains('collapsed');
        if (isCollapsed) { container.classList.remove('collapsed'); toggle.textContent = '▼ Hide'; }
        else { container.classList.add('collapsed'); toggle.textContent = '▶ Show'; }
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.BMDE_EXPANDED, !isCollapsed);
    },
    
    // =========================================================================
    // v1.3.2: ITEMS TO RESOLVE
    // =========================================================================
    
    checkForExpiredTasks() {
        const now = new Date();
        const itemsToResolve = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.ITEMS_TO_RESOLVE, []);
        const addedAtMap = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.ITEMS_TO_RESOLVE_ADDED_AT, {});
        let hasChanges = false;
        
        console.log('🔍 Checking for expired tasks...', this.tasks.length, 'total tasks');
        
        // Check Do These 3 Now tasks - if past end time, add to resolve
        this.tasks.forEach(task => {
            if (task.completed_at || task.deleted) return;
            if (itemsToResolve.includes(task.id)) return; // Already in resolve list
            
            // Check if it's a scheduled/time-based task past its end time (not BMDE)
            // A task qualifies if it has a stop time and is not a BMDE task
            if (task.stop && !task.before_day_ends && task.type !== 'rainy_day') {
                const stopTime = new Date(task.stop);
                if (now > stopTime) {
                    itemsToResolve.push(task.id);
                    addedAtMap[task.id] = now.toISOString();
                    hasChanges = true;
                    console.log('📋 Task expired, added to resolve:', task.name, 'stop was:', task.stop);
                }
            }
        });
        
        // Check BMDE tasks - if past workday end time TODAY, add to resolve
        const workdayEnd = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.WORKDAY_END_TIME, '17:00');
        const [endHour, endMin] = workdayEnd.split(':').map(Number);
        const workdayEndToday = new Date();
        workdayEndToday.setHours(endHour, endMin, 0, 0);
        
        if (now > workdayEndToday) {
            // Check for BMDE tasks that should have been done today
            this.tasks.forEach(task => {
                if (task.completed_at || task.deleted) return;
                if (itemsToResolve.includes(task.id)) return;
                
                if (task.before_day_ends) {
                    // BMDE task - check if its stop date is today or earlier
                    if (task.stop) {
                        const stopDate = new Date(task.stop);
                        if (stopDate <= workdayEndToday) {
                            itemsToResolve.push(task.id);
                            addedAtMap[task.id] = now.toISOString();
                            hasChanges = true;
                            console.log('📋 BMDE task expired, added to resolve:', task.name);
                            this.showBMDEReminder(task);
                        }
                    } else {
                        // BMDE task without stop time - it's for today
                        itemsToResolve.push(task.id);
                        addedAtMap[task.id] = now.toISOString();
                        hasChanges = true;
                        console.log('📋 BMDE task (no stop) expired, added to resolve:', task.name);
                        this.showBMDEReminder(task);
                    }
                }
            });
        }
        
        if (hasChanges) {
            console.log('📋 Items to resolve updated:', itemsToResolve.length, 'items');
            window.Storage.set(window.CONSTANTS.STORAGE_KEYS.ITEMS_TO_RESOLVE, itemsToResolve);
            window.Storage.set(window.CONSTANTS.STORAGE_KEYS.ITEMS_TO_RESOLVE_ADDED_AT, addedAtMap);
        }
    },
    
    showBMDEReminder(task) {
        // Show a toast notification
        if (window.App && window.App.showToast) {
            window.App.showToast('⚠️ BMDE task not completed: ' + task.name, 'warning');
        }
    },
    
    getItemsToResolve() {
        const itemIds = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.ITEMS_TO_RESOLVE, []);
        return this.tasks.filter(t => itemIds.includes(t.id) && !t.completed_at && !t.deleted);
    },
    
    hasOldItems() {
        const addedAtMap = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.ITEMS_TO_RESOLVE_ADDED_AT, {});
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        
        for (const taskId in addedAtMap) {
            const addedAt = new Date(addedAtMap[taskId]);
            if (addedAt < fiveDaysAgo) {
                return true;
            }
        }
        return false;
    },
    
    renderItemsToResolveBanner() {
        const banner = document.getElementById('items-to-resolve-banner');
        if (!banner) return;
        
        const items = this.getItemsToResolve();
        
        if (items.length === 0) {
            banner.innerHTML = '';
            return;
        }
        
        const isOld = this.hasOldItems();
        const colorClass = isOld ? 'resolve-banner-red' : 'resolve-banner-orange';
        
        banner.innerHTML = `
            <button class="resolve-banner ${colorClass}" onclick="DashboardScreen.showItemsToResolveModal()">
                <span class="resolve-count">${items.length}</span> Items to Resolve
            </button>
        `;
    },
    
    showItemsToResolveModal() {
        const items = this.getItemsToResolve();
        const addedAtMap = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.ITEMS_TO_RESOLVE_ADDED_AT, {});
        
        const itemsHTML = items.map(task => {
            const addedAt = addedAtMap[task.id] ? new Date(addedAtMap[task.id]) : new Date();
            const daysAgo = Math.floor((new Date() - addedAt) / (1000 * 60 * 60 * 24));
            const daysText = daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : daysAgo + ' days ago';
            const isOld = daysAgo >= 5;
            
            return `
                <div class="resolve-item ${isOld ? 'resolve-item-old' : ''}">
                    <div class="resolve-item-info">
                        <div class="resolve-item-name">${task.name}</div>
                        <div class="resolve-item-date">Added: ${daysText}</div>
                    </div>
                    <div class="resolve-item-actions">
                        <button class="resolve-btn resolve-btn-done" onclick="DashboardScreen.resolveTaskDone('${task.id}')">✓ Done</button>
                        <button class="resolve-btn resolve-btn-park" onclick="DashboardScreen.resolveTaskPark('${task.id}')">📅 Park</button>
                        <button class="resolve-btn resolve-btn-delete" onclick="DashboardScreen.resolveTaskDelete('${task.id}')">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'resolve-modal';
        modal.innerHTML = `
            <div class="modal-content resolve-modal">
                <div class="modal-header">
                    <h2>Items to Resolve</h2>
                    <button class="modal-close" onclick="document.getElementById('resolve-modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <p class="resolve-instructions">These tasks have passed their deadline. Mark them done, park them to a new date, or delete them.</p>
                    <div class="resolve-items-list">
                        ${itemsHTML}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    },
    
    async resolveTaskDone(taskId) {
        await this.completeTask(taskId);
        this.removeFromItemsToResolve(taskId);
        document.getElementById('resolve-modal')?.remove();
        this.showItemsToResolveModal();
        if (this.getItemsToResolve().length === 0) {
            document.getElementById('resolve-modal')?.remove();
        }
    },
    
    resolveTaskPark(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        // Show park modal with date/time pickers
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const defaultStart = tomorrow.toISOString().slice(0, 16);
        const defaultStop = new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString().slice(0, 16);
        
        const parkModal = document.createElement('div');
        parkModal.className = 'modal-overlay';
        parkModal.id = 'park-modal';
        parkModal.innerHTML = `
            <div class="modal-content park-modal">
                <div class="modal-header">
                    <h2>Park Task</h2>
                    <button class="modal-close" onclick="document.getElementById('park-modal').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <p>Reschedule "${task.name}" to a new time:</p>
                    <div class="form-group">
                        <label>New Start Time</label>
                        <input type="datetime-local" id="park-start" value="${defaultStart}">
                    </div>
                    <div class="form-group">
                        <label>New End Time</label>
                        <input type="datetime-local" id="park-stop" value="${defaultStop}">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="document.getElementById('park-modal').remove()">Cancel</button>
                    <button class="btn-primary" onclick="DashboardScreen.confirmParkTask('${taskId}')">Park Task</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(parkModal);
        parkModal.addEventListener('click', (e) => { if (e.target === parkModal) parkModal.remove(); });
    },
    
    async confirmParkTask(taskId) {
        const startInput = document.getElementById('park-start');
        const stopInput = document.getElementById('park-stop');
        
        if (!startInput.value || !stopInput.value) {
            window.App.showToast('Please set both start and end times', 'error');
            return;
        }
        
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const newStart = window.DateTimeUtils.localDateTimeToUTC(startInput.value);
        const newStop = window.DateTimeUtils.localDateTimeToUTC(stopInput.value);
        
        try {
            const userId = window.Auth.getUserId();
            await window.db.collection('users').doc(userId).collection('tasks').doc(taskId).update({
                start: newStart,
                stop: newStop,
                before_day_ends: false, // No longer a BMDE task
                modified_at: window.DateTimeUtils.utcNowISO()
            });
            
            // Update local cache
            const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            const taskIndex = cachedTasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                cachedTasks[taskIndex].start = newStart;
                cachedTasks[taskIndex].stop = newStop;
                cachedTasks[taskIndex].before_day_ends = false;
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, cachedTasks);
            }
            
            this.removeFromItemsToResolve(taskId);
            this.tasks = cachedTasks.map(t => window.Task.fromFirestore(t));
            
            document.getElementById('park-modal')?.remove();
            document.getElementById('resolve-modal')?.remove();
            
            this.renderDoTheseThreeNow();
            this.renderBeforeMyDayEnds();
            this.renderItemsToResolveBanner();
            
            window.App.showToast('Task parked to new time', 'success');
            
        } catch (error) {
            console.error('Error parking task:', error);
            window.App.showToast('Failed to park task', 'error');
        }
    },
    
    async resolveTaskDelete(taskId) {
        if (!confirm('Delete this task permanently?')) return;
        
        try {
            const userId = window.Auth.getUserId();
            await window.db.collection('users').doc(userId).collection('tasks').doc(taskId).update({
                deleted: true,
                modified_at: window.DateTimeUtils.utcNowISO()
            });
            
            // Update local cache
            const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            const taskIndex = cachedTasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                cachedTasks[taskIndex].deleted = true;
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, cachedTasks);
            }
            
            this.removeFromItemsToResolve(taskId);
            this.tasks = cachedTasks.map(t => window.Task.fromFirestore(t));
            
            // Refresh the modal
            document.getElementById('resolve-modal')?.remove();
            if (this.getItemsToResolve().length > 0) {
                this.showItemsToResolveModal();
            }
            
            this.renderDoTheseThreeNow();
            this.renderBeforeMyDayEnds();
            this.renderItemsToResolveBanner();
            
            window.App.showToast('Task deleted', 'success');
            
        } catch (error) {
            console.error('Error deleting task:', error);
            window.App.showToast('Failed to delete task', 'error');
        }
    },
    
    removeFromItemsToResolve(taskId) {
        const itemsToResolve = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.ITEMS_TO_RESOLVE, []);
        const addedAtMap = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.ITEMS_TO_RESOLVE_ADDED_AT, {});
        
        const newItems = itemsToResolve.filter(id => id !== taskId);
        delete addedAtMap[taskId];
        
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.ITEMS_TO_RESOLVE, newItems);
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.ITEMS_TO_RESOLVE_ADDED_AT, addedAtMap);
    }
};

window.DashboardScreen = DashboardScreen;
console.log('✓ DashboardScreen loaded (v1.3.2 - fixed)');
