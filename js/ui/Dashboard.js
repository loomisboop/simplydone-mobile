// SDAPWA v1.0.0 - Dashboard Screen

const DashboardScreen = {
    tasks: [],
    goals: [],
    healthData: null,
    
    render(container) {
        this.loadData();
        
        container.innerHTML = `
            <div class="dashboard-screen">
                <div id="goals-button-container"></div>
                
                <div class="dashboard-section">
                    <div class="section-header">
                        <h2 class="section-title">Do These 3 Now</h2>
                    </div>
                    <div id="do-these-3-now-container"></div>
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
        this.renderGoalsButton();
        this.renderDoTheseThreeNow();
        this.renderBeforeMyDayEnds();
        this.renderStats();
        
        window.addEventListener('tasks-changed', (e) => {
            this.tasks = e.detail;
            this.renderDoTheseThreeNow();
            this.renderBeforeMyDayEnds();
            this.renderStats();
        });
        
        window.addEventListener('goals-changed', (e) => {
            this.goals = e.detail;
            this.renderGoalsButton();
        });
        
        window.addEventListener('health-data-changed', (e) => {
            this.healthData = e.detail;
            this.renderStats();
        });
    },
    
    loadData() {
        if (window.syncManager) {
            this.tasks = window.syncManager.getCachedTasks();
            this.goals = window.syncManager.getCachedGoals();
            this.healthData = window.syncManager.getCachedHealthData();
        }
    },
    
    setupEventListeners() {
        const toggle = document.getElementById('bmde-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => this.toggleBMDE());
        }
    },
    
    renderGoalsButton() {
        const container = document.getElementById('goals-button-container');
        if (!container) return;
        
        if (this.goals.length === 0) {
            container.innerHTML = '<button class="goals-button" onclick="window.App.showScreen(\'goalsdetail\')"><div class="goals-button-top"><span class="goals-button-label">No Goals Set</span></div><p style="text-align:center;color:#757575;font-size:14px;margin-top:8px;">Tap to add your first goal</p></button>';
            return;
        }
        
        const names = this.goals.map(g => g.name_one_word).join(', ');
        const abbrev = window.Algorithms.getGoalsAbbreviation(this.goals);
        const progressBars = this.goals.map(goal => {
            const progress = window.Algorithms.calculateGoalProgress(goal);
            const percentage = (progress.completed / progress.total) * 100;
            return '<div class="goal-mini-progress"><div class="goal-mini-bar"><div class="goal-mini-fill" style="width:' + percentage + '%"></div></div><span class="goal-mini-text">' + progress.completed + '/' + progress.total + '</span></div>';
        }).join('');
        
        container.innerHTML = '<button class="goals-button" onclick="window.App.showScreen(\'goalsdetail\')"><div class="goals-button-top"><div><span class="goals-button-label">Goals: </span><span class="goals-button-names">' + names + '</span></div><span class="goals-button-abbrev">' + abbrev + '</span></div><div class="goals-button-progress">' + progressBars + '</div></button>';
    },
    
    renderDoTheseThreeNow() {
        const container = document.getElementById('do-these-3-now-container');
        if (!container) return;
        
        const top3 = window.Algorithms.selectDoTheseThreeNow(this.tasks);
        
        if (top3.length === 0) {
            container.innerHTML = '<div class="empty-state"><p class="empty-state-icon">✓</p><p class="empty-state-title">No tasks right now</p><p class="empty-state-message">Add a task or wait for scheduled tasks to start</p></div>';
            return;
        }
        
        container.innerHTML = top3.map(task => this.renderTaskCard(task)).join('');
    },
    
    renderBeforeMyDayEnds() {
        const container = document.getElementById('bmde-container');
        if (!container) return;
        
        const bmdeTasks = window.Algorithms.selectBeforeMyDayEnds(this.tasks);
        
        if (bmdeTasks.length === 0) {
            container.innerHTML = '<div class="empty-state"><p class="empty-state-message">No "Before Day Ends" tasks<br>Park a task here for later today</p></div>';
            return;
        }
        
        const cardsHTML = bmdeTasks.map(task => '<div class="thumbwheel-item">' + this.renderTaskCard(task, true) + '</div>').join('');
        container.innerHTML = '<div class="thumbwheel-container" style="max-height:200px;overflow-y:auto;">' + cardsHTML + '</div><div style="text-align:center;color:#9E9E9E;font-size:12px;margin-top:8px;">' + bmdeTasks.length + ' task' + (bmdeTasks.length !== 1 ? 's' : '') + '</div>';
    },
    
    renderTaskCard(task, small = false) {
        const durationColor = window.CONSTANTS.DURATION_COLORS[task.duration_minutes] || window.CONSTANTS.DURATION_COLORS[0];
        const priorityColor = window.CONSTANTS.PRIORITY_COLORS[task.priority];
        
        let timeDetails = '';
        if (task.type === window.CONSTANTS.TASK_TYPES.SCHEDULED && task.start && task.stop) {
            const start = window.DateTimeUtils.formatTime(task.start);
            const stop = window.DateTimeUtils.formatTime(task.stop);
            timeDetails = start + ' - ' + stop;
        } else if (task.trigger_type === window.CONSTANTS.TRIGGER_TYPES.LOCATION) {
            timeDetails = '📍 ' + (task.location_nickname || 'Location');
        } else {
            timeDetails = 'Flexible timing';
        }
        
        return '<div class="task-card ' + (small ? 'small' : '') + '" data-task-id="' + task.id + '"><div class="task-card-header"><div class="task-card-badge" style="background-color:' + durationColor + '">' + (task.duration_minutes || '∞') + 'm</div><div class="task-card-content"><div class="task-card-name">' + task.name + '</div><div class="task-card-details">' + timeDetails + '</div></div></div><div class="task-card-actions"><button class="task-btn-details" onclick="DashboardScreen.showTaskDetails(\'' + task.id + '\')">Details</button><button class="task-btn-park" onclick="DashboardScreen.showParkMenu(\'' + task.id + '\')">Park</button><button class="task-btn-done" onclick="DashboardScreen.completeTask(\'' + task.id + '\')">✓ Done</button></div><div class="task-card-priority" style="background-color:' + priorityColor + '"></div></div>';
    },
    
    renderStats() {
        const container = document.getElementById('stats-summary-container');
        if (!container) return;
        
        const doingPoints = 88;
        const beingPoints = 19;
        const steps = this.healthData ? this.healthData.steps_walked : 0;
        const completedToday = this.tasks.filter(t => t.completed_at && window.DateTimeUtils.isToday(t.completed_at)).length;
        
        container.innerHTML = '<div class="stats-summary"><div class="stats-row"><div class="stat-item"><span class="stat-value doing">' + doingPoints + '</span><span class="stat-label">Doing</span></div><div class="stat-item"><span class="stat-value being">' + beingPoints + '</span><span class="stat-label">Being</span></div><div class="stat-item"><span class="stat-value steps">' + steps.toLocaleString() + '</span><span class="stat-label">🚶 Steps</span></div></div><div class="stats-completed">Completed Today: ' + completedToday + '</div></div>';
    },
    
    toggleBMDE() {
        const container = document.getElementById('bmde-container');
        const toggle = document.getElementById('bmde-toggle');
        if (!container || !toggle) return;
        
        const isCollapsed = container.classList.contains('collapsed');
        if (isCollapsed) {
            container.classList.remove('collapsed');
            toggle.textContent = '▼ Hide';
        } else {
            container.classList.add('collapsed');
            toggle.textContent = '▶ Show';
        }
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.BMDE_EXPANDED, !isCollapsed);
    },
    
    async completeTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        try {
            const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
            task.complete(deviceId);
            
            const userId = window.Auth.getUserId();
            await window.db.collection('users/' + userId + '/tasks').doc(taskId).update({
                completed_at: task.completed_at,
                completed_on_device: task.completed_on_device,
                modified_at: task.modified_at,
                modified_by: task.modified_by,
                sync_version: firebase.firestore.FieldValue.increment(1)
            });
            
            window.App.showToast(window.CONSTANTS.SUCCESS_MESSAGES.TASK_COMPLETED, 'success');
        } catch (error) {
            console.error('Error completing task:', error);
            window.App.showToast(window.CONSTANTS.ERROR_MESSAGES.TASK_UPDATE_FAILED, 'error');
        }
    },
    
    showTaskDetails(taskId) {
        window.App.showToast('Task details coming soon', 'info');
    },
    
    showParkMenu(taskId) {
        window.App.showToast('Park menu coming soon', 'info');
    }
};

window.DashboardScreen = DashboardScreen;
console.log('✓ DashboardScreen loaded');
