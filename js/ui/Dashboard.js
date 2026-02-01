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
                <div id="goals-tiles-container" class="goals-tiles-row"></div>
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
        this.renderGoalsTiles();
        this.renderDoTheseThreeNow();
        this.renderBeforeMyDayEnds();
        this.renderStats();
        
        if (!this.eventListenersAttached) {
            window.addEventListener('tasks-changed', (e) => {
                this.tasks = e.detail;
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
        const eligible = this.tasks.filter(t => !t.completed_at && !t.deleted && !t.before_day_ends && t.type !== window.CONSTANTS.TASK_TYPES.RAINY_DAY);
        const result = [];
        
        // Location tasks that are triggered (stay until done)
        const locTasks = eligible.filter(t => {
            if (t.trigger_type !== window.CONSTANTS.TRIGGER_TYPES.LOCATION) return false;
            return (t.location_arrived_at && !t.completed_at) || locationTriggered.includes(t.id);
        });
        result.push(...locTasks.slice(0, 3));
        
        // Time-based tasks active now
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
        
        const bmdeTasks = this.tasks.filter(t => t.before_day_ends && !t.completed_at && !t.deleted && t.type !== window.CONSTANTS.TASK_TYPES.RAINY_DAY);
        
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
            
            if (task.trigger_type === window.CONSTANTS.TRIGGER_TYPES.LOCATION) {
                const triggered = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.LOCATION_TRIGGERED_TASKS, []);
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.LOCATION_TRIGGERED_TASKS, triggered.filter(id => id !== taskId));
            }
            
            const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            const taskIndex = cachedTasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) { cachedTasks[taskIndex] = task.toFirestore(); window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, cachedTasks); }
            this.tasks = cachedTasks.map(t => window.Task.fromFirestore(t));
            this.renderDoTheseThreeNow();
            this.renderBeforeMyDayEnds();
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
    }
};

window.DashboardScreen = DashboardScreen;
console.log('✓ DashboardScreen loaded (v1.3.0)');
