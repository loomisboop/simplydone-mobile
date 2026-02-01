// SDAPWA v1.2.0 - Rainy Day Tasks List Screen

const RainyDayListScreen = {
    tasks: [],
    currentFilter: 'all', // all, or a specific label
    
    render(container) {
        this.loadTasks();
        
        // Get unique labels from tasks for filter buttons
        const labels = this.getUniqueLabels();
        
        container.innerHTML = `
            <div class="rainyday-screen">
                <div class="rainyday-header">
                    <h2>💧 Rainy Day Tasks</h2>
                    <p class="rainyday-subtitle">Tasks saved for whenever you have time</p>
                </div>
                
                <div class="rainyday-filters">
                    <button class="filter-chip ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
                    ${labels.map(label => `
                        <button class="filter-chip ${this.currentFilter === label.id ? 'active' : ''}" data-filter="${label.id}">
                            ${label.icon} ${label.label}
                        </button>
                    `).join('')}
                </div>
                
                <div class="rainyday-content" id="rainyday-content"></div>
                
                <div class="rainyday-add-cta">
                    <button class="btn-primary" onclick="window.App.showScreen('addtask'); setTimeout(() => AddTaskScreen.switchTab('rainy', null), 100);">
                        + Add Rainy Day Task
                    </button>
                </div>
            </div>
        `;
        
        this.renderTasks();
        this.setupEventListeners();
        
        // Listen for task changes
        window.addEventListener('tasks-changed', (e) => {
            this.tasks = e.detail.filter(t => t.type === window.CONSTANTS.TASK_TYPES.RAINY_DAY);
            this.renderTasks();
        });
    },
    
    loadTasks() {
        let allTasks = [];
        if (window.syncManager) {
            allTasks = window.syncManager.getCachedTasks();
        } else {
            const tasksData = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            allTasks = tasksData.map(t => window.Task.fromFirestore(t));
        }
        
        // Filter to only rainy day tasks
        this.tasks = allTasks.filter(t => 
            t.type === window.CONSTANTS.TASK_TYPES.RAINY_DAY && 
            !t.deleted
        );
    },
    
    getUniqueLabels() {
        const labelIds = new Set();
        this.tasks.forEach(task => {
            if (task.category_tags) {
                task.category_tags.forEach(tag => labelIds.add(tag));
            }
        });
        
        // Map to full label objects
        return window.CONSTANTS.RAINY_DAY_LABELS.filter(label => labelIds.has(label.id));
    },
    
    setupEventListeners() {
        document.querySelectorAll('.filter-chip').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchFilter(e.target.dataset.filter, e.target));
        });
    },
    
    switchFilter(filter, btn) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderTasks();
    },
    
    renderTasks() {
        const container = document.getElementById('rainyday-content');
        if (!container) return;
        
        // Filter tasks
        let filtered = this.tasks.filter(t => !t.completed_at);
        
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(t => 
                t.category_tags && t.category_tags.includes(this.currentFilter)
            );
        }
        
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="empty-state-icon">💧</p>
                    <p class="empty-state-title">No rainy day tasks yet</p>
                    <p class="empty-state-message">
                        Save tasks here for when you have extra time
                    </p>
                </div>
            `;
            return;
        }
        
        // Group by labels
        const uncategorized = filtered.filter(t => !t.category_tags || t.category_tags.length === 0);
        const categorized = {};
        
        window.CONSTANTS.RAINY_DAY_LABELS.forEach(label => {
            const tasksWithLabel = filtered.filter(t => 
                t.category_tags && t.category_tags.includes(label.id)
            );
            if (tasksWithLabel.length > 0) {
                categorized[label.id] = {
                    label: label,
                    tasks: tasksWithLabel
                };
            }
        });
        
        let html = '';
        
        // Render categorized tasks
        Object.values(categorized).forEach(group => {
            html += `
                <div class="rainyday-group">
                    <div class="rainyday-group-header">
                        ${group.label.icon} ${group.label.label}
                        <span class="rainyday-count">${group.tasks.length}</span>
                    </div>
                    ${group.tasks.map(task => this.renderTaskCard(task)).join('')}
                </div>
            `;
        });
        
        // Render uncategorized
        if (uncategorized.length > 0) {
            html += `
                <div class="rainyday-group">
                    <div class="rainyday-group-header">
                        📋 Uncategorized
                        <span class="rainyday-count">${uncategorized.length}</span>
                    </div>
                    ${uncategorized.map(task => this.renderTaskCard(task)).join('')}
                </div>
            `;
        }
        
        container.innerHTML = html;
    },
    
    renderTaskCard(task) {
        const escapedId = task.id.replace(/'/g, "\\'");
        const tags = (task.category_tags || []).map(tagId => {
            const label = window.CONSTANTS.RAINY_DAY_LABELS.find(l => l.id === tagId);
            return label ? `<span class="task-tag">${label.icon}</span>` : '';
        }).join('');
        
        return `
            <div class="rainyday-card" data-task-id="${task.id}">
                <div class="rainyday-card-content">
                    <div class="rainyday-card-name">${task.name}</div>
                    <div class="rainyday-card-tags">${tags}</div>
                </div>
                <div class="rainyday-card-actions">
                    <button class="rainyday-btn-do" onclick="RainyDayListScreen.promoteTask('${escapedId}')" title="Do it now">
                        ▶️
                    </button>
                    <button class="rainyday-btn-done" onclick="RainyDayListScreen.completeTask('${escapedId}')" title="Mark complete">
                        ✓
                    </button>
                    <button class="rainyday-btn-delete" onclick="RainyDayListScreen.deleteTask('${escapedId}')" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    },
    
    // Promote rainy day task to "Do it now" (add to scheduled for today)
    async promoteTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        // Set start time to now, stop time to 2 hours from now
        const now = new Date();
        const stop = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        
        task.type = window.CONSTANTS.TASK_TYPES.SCHEDULED;
        task.trigger_type = window.CONSTANTS.TRIGGER_TYPES.TIME;
        task.start = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
        task.stop = stop.toISOString().replace(/\.\d{3}Z$/, 'Z');
        task.duration_minutes = 15; // Default duration
        
        const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
        task.touch(deviceId);
        
        try {
            const userId = window.Auth.getUserId();
            await window.db.collection('users').doc(userId).collection('tasks').doc(taskId).update(task.toFirestore());
            
            // Update local cache
            const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            const idx = cachedTasks.findIndex(t => t.id === taskId);
            if (idx !== -1) {
                cachedTasks[idx] = task.toFirestore();
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, cachedTasks);
            }
            
            window.dispatchEvent(new CustomEvent('tasks-changed', { 
                detail: cachedTasks.map(t => window.Task.fromFirestore(t)) 
            }));
            
            window.App.showToast('Task moved to "Do These 3 Now"! ✓', 'success');
            window.App.showScreen('dashboard');
            
        } catch (e) {
            console.error('Error promoting task:', e);
            if (e.code === 'resource-exhausted') {
                window.App.showToast('Saved locally - will sync later', 'warning');
                window.App.showScreen('dashboard');
            } else {
                window.App.showToast('Failed to update task', 'error');
            }
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
                completed_at: task.completed_at,
                completed_on_device: task.completed_on_device,
                modified_at: task.modified_at,
                modified_by: task.modified_by,
                sync_version: firebase.firestore.FieldValue.increment(1)
            });
            
            // Update local cache
            const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            const idx = cachedTasks.findIndex(t => t.id === taskId);
            if (idx !== -1) {
                cachedTasks[idx] = task.toFirestore();
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, cachedTasks);
            }
            
            // Remove from local list
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.renderTasks();
            
            window.dispatchEvent(new CustomEvent('tasks-changed', { 
                detail: cachedTasks.map(t => window.Task.fromFirestore(t)) 
            }));
            
            window.App.showToast('Task completed! ✓', 'success');
            
        } catch (e) {
            console.error('Error completing task:', e);
            if (e.code === 'resource-exhausted') {
                // Still update locally
                this.tasks = this.tasks.filter(t => t.id !== taskId);
                this.renderTasks();
                window.App.showToast('Marked complete locally', 'warning');
            } else {
                window.App.showToast('Failed to complete task', 'error');
            }
        }
    },
    
    async deleteTask(taskId) {
        if (!confirm('Delete this rainy day task?')) return;
        
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
        task.markDeleted(deviceId);
        
        try {
            const userId = window.Auth.getUserId();
            await window.db.collection('users').doc(userId).collection('tasks').doc(taskId).update({
                deleted: true,
                modified_at: task.modified_at,
                modified_by: task.modified_by,
                sync_version: firebase.firestore.FieldValue.increment(1)
            });
            
            // Update local cache
            const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            const filtered = cachedTasks.filter(t => t.id !== taskId);
            window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, filtered);
            
            // Remove from local list
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.renderTasks();
            
            window.dispatchEvent(new CustomEvent('tasks-changed', { 
                detail: filtered.map(t => window.Task.fromFirestore(t)) 
            }));
            
            window.App.showToast('Task deleted', 'success');
            
        } catch (e) {
            console.error('Error deleting task:', e);
            if (e.code === 'resource-exhausted') {
                this.tasks = this.tasks.filter(t => t.id !== taskId);
                this.renderTasks();
                window.App.showToast('Deleted locally', 'warning');
            } else {
                window.App.showToast('Failed to delete task', 'error');
            }
        }
    }
};

window.RainyDayListScreen = RainyDayListScreen;
console.log('✓ RainyDayListScreen loaded');
