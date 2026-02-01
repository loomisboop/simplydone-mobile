// SDAPWA v1.3.0 - All Tasks Screen (with proper location task editing)

const TaskListScreen = {
    tasks: [],
    currentFilter: 'all',
    editingTaskId: null,
    
    render(container) {
        this.loadTasks();
        container.innerHTML = '<div class="tasklist-screen"><div class="tasklist-filters"><button class="filter-tab active" data-filter="all">All</button><button class="filter-tab" data-filter="active">Active</button><button class="filter-tab" data-filter="completed">Complete</button><button class="filter-tab" data-filter="rainy">Rainy</button></div><div class="tasklist-content" id="tasklist-content"></div></div>';
        this.renderTasks();
        this.setupEventListeners();
        window.addEventListener('tasks-changed', e => { this.tasks = e.detail; this.renderTasks(); });
    },
    
    loadTasks() {
        if (window.syncManager) { this.tasks = window.syncManager.getCachedTasks(); }
        else {
            const tasksData = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            this.tasks = tasksData.map(t => window.Task.fromFirestore(t));
        }
    },
    
    setupEventListeners() {
        document.querySelectorAll('.filter-tab').forEach(btn => btn.addEventListener('click', (e) => this.switchFilter(btn.dataset.filter, e)));
    },
    
    switchFilter(filter, e) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-tab').forEach(btn => btn.classList.remove('active'));
        if (e && e.target) e.target.classList.add('active');
        this.renderTasks();
    },
    
    renderTasks() {
        const container = document.getElementById('tasklist-content');
        if (!container) return;
        
        let filtered = window.Algorithms.filterTasks(this.tasks, this.currentFilter);
        filtered = window.Algorithms.sortTasks(filtered, 'date_desc');
        
        if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No tasks found</p></div>';
            return;
        }
        
        const grouped = window.Algorithms.groupTasksByDate(filtered);
        container.innerHTML = Object.entries(grouped).map(([date, tasks]) =>
            '<div class="tasklist-group"><div class="tasklist-group-header">' + date + '</div>' +
            tasks.map(task => this.renderTaskCard(task)).join('') + '</div>'
        ).join('');
    },
    
    renderTaskCard(task) {
        const completed = task.completed_at ? 'completed' : '';
        const durationColor = window.CONSTANTS.DURATION_COLORS[task.duration_minutes] || window.CONSTANTS.DURATION_COLORS[0];
        
        let timeInfo = '';
        if (task.trigger_type === window.CONSTANTS.TRIGGER_TYPES.LOCATION) {
            timeInfo = '📍 ' + (task.location_nickname || 'Location');
        } else if (task.type === window.CONSTANTS.TASK_TYPES.RAINY_DAY) {
            const label = task.category_tags && task.category_tags[0] ? task.category_tags[0] : 'Rainy Day';
            timeInfo = '💧 ' + label;
        } else if (task.start && task.stop) {
            timeInfo = window.DateTimeUtils.formatTime(task.start) + ' - ' + window.DateTimeUtils.formatTime(task.stop);
        }
        
        const eid = task.id.replace(/'/g, "\\'");
        return '<div class="tasklist-card ' + completed + '" data-task-id="' + task.id + '">' +
            '<div class="tasklist-card-main" onclick="TaskListScreen.showTaskOptions(\'' + eid + '\')">' +
            '<div class="tasklist-card-badge" style="background-color:' + durationColor + '">' + (task.duration_minutes || '∞') + '</div>' +
            '<div class="tasklist-card-info"><div class="tasklist-card-name">' + task.name + '</div>' +
            '<div class="tasklist-card-time">' + timeInfo + '</div></div>' +
            (task.completed_at ? '<div class="tasklist-card-check">✓</div>' : '') +
            '</div></div>';
    },
    
    showTaskOptions(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = '<div class="modal-content task-options-modal"><div class="modal-header"><h2>' + task.name + '</h2><button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">✕</button></div>' +
            '<div class="modal-body"><div class="task-options">' +
            '<button class="task-option" onclick="TaskListScreen.editTask(\'' + taskId + '\'); this.closest(\'.modal-overlay\').remove();"><span>✏️</span> Edit Task</button>' +
            (task.completed_at ? '' : '<button class="task-option" onclick="TaskListScreen.completeTask(\'' + taskId + '\'); this.closest(\'.modal-overlay\').remove();"><span>✓</span> Mark Complete</button>') +
            (task.completed_at ? '<button class="task-option" onclick="TaskListScreen.uncompleteTask(\'' + taskId + '\'); this.closest(\'.modal-overlay\').remove();"><span>↩️</span> Mark Incomplete</button>' : '') +
            '<button class="task-option task-option-danger" onclick="TaskListScreen.deleteTask(\'' + taskId + '\'); this.closest(\'.modal-overlay\').remove();"><span>🗑️</span> Delete Task</button>' +
            '</div></div></div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    },
    
    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        this.editingTaskId = taskId;
        
        const isLocation = task.trigger_type === window.CONSTANTS.TRIGGER_TYPES.LOCATION;
        const isRainyDay = task.type === window.CONSTANTS.TASK_TYPES.RAINY_DAY;
        const radiusFeet = Math.round((task.location_radius_meters || 100) * 3.28084);
        
        // Build time fields only for non-location tasks
        let timeFields = '';
        if (!isLocation && !isRainyDay) {
            const startVal = task.start ? window.DateTimeUtils.formatForInput(task.start) : '';
            const stopVal = task.stop ? window.DateTimeUtils.formatForInput(task.stop) : '';
            timeFields = '<div class="form-group"><label>Start Time</label><input type="datetime-local" id="edit-start" value="' + startVal + '"></div>' +
                '<div class="form-group"><label>Stop Time</label><input type="datetime-local" id="edit-stop" value="' + stopVal + '"></div>';
        }
        
        // Build location fields only for location tasks
        let locationFields = '';
        if (isLocation) {
            locationFields = '<div class="form-group"><label>Location Nickname</label><input type="text" id="edit-location-nickname" value="' + (task.location_nickname || '') + '"></div>' +
                '<div class="form-group"><label>Address</label><input type="text" id="edit-location-address" value="' + (task.location_address || '') + '" readonly></div>' +
                '<div class="form-group"><label>Radius (feet)</label><input type="number" id="edit-location-radius" value="' + radiusFeet + '" min="100" max="2000"></div>';
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = '<div class="modal-content edit-task-modal"><div class="modal-header"><h2>Edit Task</h2><button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">✕</button></div>' +
            '<div class="modal-body"><form id="edit-task-form">' +
            '<div class="form-group"><label>Task Name</label><input type="text" id="edit-name" value="' + task.name + '" required></div>' +
            '<div class="form-group"><label>Duration (minutes)</label><select id="edit-duration"><option value="7"' + (task.duration_minutes === 7 ? ' selected' : '') + '>7 min (Quick)</option><option value="15"' + (task.duration_minutes === 15 ? ' selected' : '') + '>15 min (Medium)</option><option value="35"' + (task.duration_minutes === 35 ? ' selected' : '') + '>35 min (Long)</option><option value="0"' + (task.duration_minutes === 0 ? ' selected' : '') + '>Any time</option></select></div>' +
            '<div class="form-group"><label>Priority</label><select id="edit-priority"><option value="low"' + (task.priority === 'low' ? ' selected' : '') + '>Low</option><option value="normal"' + (task.priority === 'normal' ? ' selected' : '') + '>Normal</option><option value="high"' + (task.priority === 'high' ? ' selected' : '') + '>High</option><option value="urgent"' + (task.priority === 'urgent' ? ' selected' : '') + '>Urgent</option></select></div>' +
            timeFields + locationFields +
            '<div class="form-group"><label>Notes</label><textarea id="edit-notes" rows="3">' + (task.notes || '') + '</textarea></div>' +
            '</form></div><div class="modal-footer"><button class="btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
            '<button class="btn-primary" onclick="TaskListScreen.saveEditedTask()">Save Changes</button></div></div>';
        document.body.appendChild(modal);
    },
    
    async saveEditedTask() {
        const task = this.tasks.find(t => t.id === this.editingTaskId);
        if (!task) return;
        
        task.name = document.getElementById('edit-name').value.trim();
        task.duration_minutes = parseInt(document.getElementById('edit-duration').value);
        task.priority = document.getElementById('edit-priority').value;
        task.notes = document.getElementById('edit-notes').value.trim();
        
        // Only update time fields if they exist (non-location tasks)
        const startInput = document.getElementById('edit-start');
        const stopInput = document.getElementById('edit-stop');
        if (startInput && stopInput) {
            task.start = startInput.value ? new Date(startInput.value).toISOString() : null;
            task.stop = stopInput.value ? new Date(stopInput.value).toISOString() : null;
        }
        
        // Update location fields if they exist
        const nicknameInput = document.getElementById('edit-location-nickname');
        const radiusInput = document.getElementById('edit-location-radius');
        if (nicknameInput) task.location_nickname = nicknameInput.value.trim();
        if (radiusInput) task.location_radius_meters = Math.round(parseInt(radiusInput.value) * 0.3048);
        
        const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
        task.touch(deviceId);
        
        try {
            const userId = window.Auth.getUserId();
            await window.db.collection('users').doc(userId).collection('tasks').doc(task.id).update(task.toFirestore());
            
            const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            const idx = cachedTasks.findIndex(t => t.id === task.id);
            if (idx !== -1) { cachedTasks[idx] = task.toFirestore(); window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, cachedTasks); }
            
            this.tasks = cachedTasks.map(t => window.Task.fromFirestore(t));
            window.dispatchEvent(new CustomEvent('tasks-changed', { detail: this.tasks }));
            
            document.querySelector('.modal-overlay')?.remove();
            window.App.showToast('Task updated!', 'success');
            this.renderTasks();
        } catch (e) {
            console.error('Error saving task:', e);
            window.App.showToast('Failed to save task', 'error');
        }
    },
    
    async completeTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
        task.complete(deviceId);
        
        try {
            const userId = window.Auth.getUserId();
            await window.db.collection('users').doc(userId).collection('tasks').doc(taskId).update({
                completed_at: task.completed_at, completed_on_device: task.completed_on_device,
                modified_at: task.modified_at, modified_by: task.modified_by,
                sync_version: firebase.firestore.FieldValue.increment(1)
            });
            
            const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            const idx = cachedTasks.findIndex(t => t.id === taskId);
            if (idx !== -1) { cachedTasks[idx] = task.toFirestore(); window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, cachedTasks); }
            
            this.tasks = cachedTasks.map(t => window.Task.fromFirestore(t));
            window.dispatchEvent(new CustomEvent('tasks-changed', { detail: this.tasks }));
            window.App.showToast('Task completed!', 'success');
            this.renderTasks();
        } catch (e) {
            console.error('Error completing task:', e);
            window.App.showToast('Failed to complete task', 'error');
        }
    },
    
    async uncompleteTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        task.completed_at = null;
        task.completed_on_device = null;
        const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
        task.touch(deviceId);
        
        try {
            const userId = window.Auth.getUserId();
            await window.db.collection('users').doc(userId).collection('tasks').doc(taskId).update({
                completed_at: null, completed_on_device: null,
                modified_at: task.modified_at, modified_by: task.modified_by,
                sync_version: firebase.firestore.FieldValue.increment(1)
            });
            
            const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            const idx = cachedTasks.findIndex(t => t.id === taskId);
            if (idx !== -1) { cachedTasks[idx] = task.toFirestore(); window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, cachedTasks); }
            
            this.tasks = cachedTasks.map(t => window.Task.fromFirestore(t));
            window.dispatchEvent(new CustomEvent('tasks-changed', { detail: this.tasks }));
            window.App.showToast('Task marked incomplete', 'success');
            this.renderTasks();
        } catch (e) {
            console.error('Error:', e);
            window.App.showToast('Failed to update task', 'error');
        }
    },
    
    async deleteTask(taskId) {
        if (!confirm('Delete this task?')) return;
        
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        task.deleted = true;
        const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
        task.touch(deviceId);
        
        try {
            const userId = window.Auth.getUserId();
            await window.db.collection('users').doc(userId).collection('tasks').doc(taskId).update({
                deleted: true, modified_at: task.modified_at, modified_by: task.modified_by,
                sync_version: firebase.firestore.FieldValue.increment(1)
            });
            
            const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            const idx = cachedTasks.findIndex(t => t.id === taskId);
            if (idx !== -1) { cachedTasks[idx] = task.toFirestore(); window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, cachedTasks); }
            
            this.tasks = cachedTasks.map(t => window.Task.fromFirestore(t));
            window.dispatchEvent(new CustomEvent('tasks-changed', { detail: this.tasks }));
            window.App.showToast('Task deleted', 'success');
            this.renderTasks();
        } catch (e) {
            console.error('Error deleting task:', e);
            window.App.showToast('Failed to delete task', 'error');
        }
    }
};

window.TaskListScreen = TaskListScreen;
console.log('✓ TaskListScreen loaded (v1.3.0)');
