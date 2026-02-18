// SDAPWA v1.3.0 - Add Task Screen (FIXED: tabs + timezone)

const AddTaskScreen = {
    currentTab: 'scheduled',
    selectedLocation: null,
    selectedLabel: 'fun',
    autocompleteTimeout: null,
    
    render(container) {
        container.innerHTML = `
            <div class="addtask-screen">
                <div class="addtask-tabs">
                    <button class="addtask-tab active" data-tab="scheduled">⏰ Scheduled</button>
                    <button class="addtask-tab" data-tab="location">📍 Location</button>
                    <button class="addtask-tab" data-tab="bmde">📋 BMDE</button>
                    <button class="addtask-tab" data-tab="rainy">💧 Rainy Day</button>
                </div>
                <div class="addtask-content">
                    <div class="addtask-tab-content active" id="scheduled-content"></div>
                    <div class="addtask-tab-content" id="location-content"></div>
                    <div class="addtask-tab-content" id="bmde-content"></div>
                    <div class="addtask-tab-content" id="rainy-content"></div>
                </div>
            </div>
        `;
        this.renderScheduledTab();
        this.renderLocationTab();
        this.renderBMDETab();
        this.renderRainyTab();
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        document.querySelectorAll('.addtask-tab').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(btn.dataset.tab, e));
        });
    },
    
    switchTab(tab, e) {
        this.currentTab = tab;
        // Update tab buttons
        document.querySelectorAll('.addtask-tab').forEach(btn => btn.classList.remove('active'));
        if (e && e.target) e.target.classList.add('active');
        // Update tab content
        document.querySelectorAll('.addtask-tab-content').forEach(c => c.classList.remove('active'));
        const content = document.getElementById(tab + '-content');
        if (content) content.classList.add('active');
    },
    
    renderScheduledTab() {
        const now = new Date();
        const startDefault = new Date(now.getTime() + 5 * 60000);
        const stopDefault = new Date(now.getTime() + 65 * 60000);
        const startVal = this.formatDateTimeLocal(startDefault);
        const stopVal = this.formatDateTimeLocal(stopDefault);
        
        document.getElementById('scheduled-content').innerHTML = `
            <form id="scheduled-form" class="addtask-form">
                <div class="form-group">
                    <label>Task Name *</label>
                    <input type="text" id="sched-name" placeholder="What do you need to do?" required>
                </div>
                <div class="form-group">
                    <label>Challenge Duration</label>
                    <div class="duration-pills">
                        <button type="button" class="duration-pill" data-duration="7">7 min</button>
                        <button type="button" class="duration-pill active" data-duration="15">15 min</button>
                        <button type="button" class="duration-pill" data-duration="35">35 min</button>
                        <button type="button" class="duration-pill" data-duration="0">Any</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Start Time *</label>
                    <input type="datetime-local" id="sched-start" value="${startVal}" required>
                </div>
                <div class="form-group">
                    <label>Stop Time *</label>
                    <input type="datetime-local" id="sched-stop" value="${stopVal}" required>
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <select id="sched-priority">
                        <option value="low">Low</option>
                        <option value="normal" selected>Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="sched-notes" rows="2" placeholder="Optional details..."></textarea>
                </div>
                <button type="submit" class="btn-primary btn-block">Create Task</button>
            </form>
        `;
        
        this.setupDurationPills('#scheduled-content');
        document.getElementById('scheduled-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createScheduledTask();
        });
    },
    
    renderLocationTab() {
        document.getElementById('location-content').innerHTML = `
            <form id="location-form" class="addtask-form">
                <div class="form-group">
                    <label>Task Name *</label>
                    <input type="text" id="loc-name" placeholder="What to do when you arrive?" required>
                </div>
                <div class="form-group">
                    <label>Challenge Duration</label>
                    <div class="duration-pills">
                        <button type="button" class="duration-pill" data-duration="7">7 min</button>
                        <button type="button" class="duration-pill active" data-duration="15">15 min</button>
                        <button type="button" class="duration-pill" data-duration="35">35 min</button>
                        <button type="button" class="duration-pill" data-duration="0">Any</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Location Nickname *</label>
                    <input type="text" id="loc-nickname" placeholder="e.g., Home, Office, Gym" required>
                </div>
                <div class="form-group">
                    <label>Address *</label>
                    <input type="text" id="loc-address" placeholder="Start typing an address..." autocomplete="off">
                    <div id="loc-suggestions" class="address-suggestions"></div>
                </div>
                <div class="form-group">
                    <label>Geofence Radius (feet)</label>
                    <input type="number" id="loc-radius" value="300" min="100" max="2000">
                    <p class="form-hint">You'll be notified when within this distance</p>
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <select id="loc-priority">
                        <option value="low">Low</option>
                        <option value="normal" selected>Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="loc-notes" rows="2" placeholder="Optional details..."></textarea>
                </div>
                <button type="submit" class="btn-primary btn-block">Create Location Task</button>
            </form>
        `;
        
        this.setupDurationPills('#location-content');
        document.getElementById('loc-address')?.addEventListener('input', (e) => this.handleAddressInput(e.target.value));
        document.getElementById('location-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createLocationTask();
        });
    },
    
    renderBMDETab() {
        const workdayEnd = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.WORKDAY_END_TIME, '17:00');
        
        document.getElementById('bmde-content').innerHTML = `
            <form id="bmde-form" class="addtask-form">
                <div class="form-group">
                    <label>Task Name *</label>
                    <input type="text" id="bmde-name" placeholder="What needs to get done today?" required>
                </div>
                <div class="form-group">
                    <label>Challenge Duration</label>
                    <div class="duration-pills">
                        <button type="button" class="duration-pill" data-duration="7">7 min</button>
                        <button type="button" class="duration-pill active" data-duration="15">15 min</button>
                        <button type="button" class="duration-pill" data-duration="35">35 min</button>
                        <button type="button" class="duration-pill" data-duration="0">Any</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Workday Ends At</label>
                    <div class="workday-display">
                        <span id="bmde-workday-time">${workdayEnd}</span>
                        <p class="form-hint">Task will be due by this time. <a href="#" onclick="window.App.showScreen('settings'); return false;">Change in Settings</a></p>
                    </div>
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <select id="bmde-priority">
                        <option value="low">Low</option>
                        <option value="normal" selected>Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="bmde-notes" rows="2" placeholder="Optional details..."></textarea>
                </div>
                <button type="submit" class="btn-primary btn-block">Add to Before My Day Ends</button>
            </form>
        `;
        
        this.setupDurationPills('#bmde-content');
        document.getElementById('bmde-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createBMDETask();
        });
    },
    
    renderRainyTab() {
        const labels = window.CONSTANTS.RAINY_DAY_LABELS;
        const labelButtons = labels.map(l => 
            `<button type="button" class="label-pill${l.id === this.selectedLabel ? ' active' : ''}" data-label="${l.id}">${l.icon} ${l.label}</button>`
        ).join('');
        
        document.getElementById('rainy-content').innerHTML = `
            <form id="rainy-form" class="addtask-form">
                <div class="form-group">
                    <label>Task Name *</label>
                    <input type="text" id="rainy-name" placeholder="What would you like to do someday?" required>
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <div class="label-pills">${labelButtons}</div>
                </div>
                <div class="form-group">
                    <label>Custom Label (optional)</label>
                    <input type="text" id="rainy-custom-label" placeholder="Or add your own...">
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="rainy-notes" rows="2" placeholder="Optional details..."></textarea>
                </div>
                <button type="submit" class="btn-primary btn-block">Add to Rainy Day</button>
            </form>
        `;
        
        document.querySelectorAll('#rainy-content .label-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#rainy-content .label-pill').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedLabel = e.target.dataset.label;
            });
        });
        document.getElementById('rainy-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createRainyDayTask();
        });
    },
    
    // Setup duration pills with visual feedback
    setupDurationPills(containerSelector) {
        document.querySelectorAll(`${containerSelector} .duration-pill`).forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active from all pills in this container
                document.querySelectorAll(`${containerSelector} .duration-pill`).forEach(b => b.classList.remove('active'));
                // Add active to clicked pill
                e.target.classList.add('active');
            });
        });
    },
    
    formatDateTimeLocal(date) {
        const pad = n => n.toString().padStart(2, '0');
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
    },
    
    handleAddressInput(query) {
        clearTimeout(this.autocompleteTimeout);
        if (query.length < 3) {
            document.getElementById('loc-suggestions').innerHTML = '';
            return;
        }
        
        this.autocompleteTimeout = setTimeout(async () => {
            try {
                const response = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(query) + '&limit=5');
                const results = await response.json();
                
                const suggestionsEl = document.getElementById('loc-suggestions');
                if (results.length === 0) {
                    suggestionsEl.innerHTML = '<div class="suggestion-item">No results found</div>';
                    return;
                }
                
                suggestionsEl.innerHTML = results.map(r => 
                    `<div class="suggestion-item" data-lat="${r.lat}" data-lon="${r.lon}" data-address="${r.display_name}">${r.display_name}</div>`
                ).join('');
                
                suggestionsEl.querySelectorAll('.suggestion-item').forEach(item => {
                    item.addEventListener('click', () => {
                        document.getElementById('loc-address').value = item.dataset.address;
                        this.selectedLocation = {
                            lat: parseFloat(item.dataset.lat),
                            lon: parseFloat(item.dataset.lon),
                            address: item.dataset.address
                        };
                        suggestionsEl.innerHTML = '';
                    });
                });
            } catch (e) {
                console.error('Geocoding error:', e);
            }
        }, 500);
    },
    
    // FIXED: Use localDateTimeToUTC for proper timezone handling
    async createScheduledTask() {
        const name = document.getElementById('sched-name').value.trim();
        const duration = parseInt(document.querySelector('#scheduled-content .duration-pill.active').dataset.duration);
        const startLocal = document.getElementById('sched-start').value;
        const stopLocal = document.getElementById('sched-stop').value;
        const priority = document.getElementById('sched-priority').value;
        const notes = document.getElementById('sched-notes').value.trim();
        
        if (!name) { window.App.showToast('Please enter a task name', 'error'); return; }
        if (!startLocal || !stopLocal) { window.App.showToast('Please set start and stop times', 'error'); return; }
        
        // FIXED: Convert local datetime to UTC ISO string using DateTimeUtils
        const startISO = window.DateTimeUtils.localDateTimeToUTC(startLocal);
        const stopISO = window.DateTimeUtils.localDateTimeToUTC(stopLocal);
        
        const task = new window.Task({
            name,
            type: 'scheduled',
            trigger_type: 'time',
            duration_minutes: duration,
            start: startISO,
            stop: stopISO,
            priority,
            notes,
            before_day_ends: false
        });
        
        await this.saveTask(task);
    },
    
    async createLocationTask() {
        const name = document.getElementById('loc-name').value.trim();
        const duration = parseInt(document.querySelector('#location-content .duration-pill.active').dataset.duration);
        const nickname = document.getElementById('loc-nickname').value.trim();
        const radiusFeet = parseInt(document.getElementById('loc-radius').value) || 300;
        const priority = document.getElementById('loc-priority').value;
        const notes = document.getElementById('loc-notes').value.trim();
        
        if (!name) { window.App.showToast('Please enter a task name', 'error'); return; }
        if (!nickname) { window.App.showToast('Please enter a location nickname', 'error'); return; }
        if (!this.selectedLocation) { window.App.showToast('Please select an address', 'error'); return; }
        
        const task = new window.Task({
            name,
            type: 'scheduled',
            trigger_type: 'location',
            duration_minutes: duration,
            location_nickname: nickname,
            location_address: this.selectedLocation.address,
            location_lat: this.selectedLocation.lat,
            location_lon: this.selectedLocation.lon,
            location_radius_meters: Math.round(radiusFeet * 0.3048),
            priority,
            notes,
            before_day_ends: false
        });
        
        await this.saveTask(task);
        this.selectedLocation = null;
    },
    
    async createBMDETask() {
        const name = document.getElementById('bmde-name').value.trim();
        const duration = parseInt(document.querySelector('#bmde-content .duration-pill.active').dataset.duration);
        const priority = document.getElementById('bmde-priority').value;
        const notes = document.getElementById('bmde-notes').value.trim();
        
        if (!name) { window.App.showToast('Please enter a task name', 'error'); return; }
        
        // Get workday end time and create stop time for today
        const workdayEnd = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.WORKDAY_END_TIME, '17:00');
        const today = new Date();
        const [hours, minutes] = workdayEnd.split(':').map(Number);
        today.setHours(hours, minutes, 0, 0);
        
        const task = new window.Task({
            name,
            type: 'scheduled',
            trigger_type: 'time',
            duration_minutes: duration,
            start: null,
            stop: today.toISOString(),
            priority,
            notes,
            before_day_ends: true
        });
        
        await this.saveTask(task);
    },
    
    async createRainyDayTask() {
        const name = document.getElementById('rainy-name').value.trim();
        const customLabel = document.getElementById('rainy-custom-label').value.trim();
        const notes = document.getElementById('rainy-notes').value.trim();
        
        if (!name) { window.App.showToast('Please enter a task name', 'error'); return; }
        
        const label = customLabel || this.selectedLabel;
        
        const task = new window.Task({
            name,
            type: 'rainy_day',
            trigger_type: 'manual',
            duration_minutes: 0,
            category_tags: [label],
            notes,
            before_day_ends: false
        });
        
        await this.saveTask(task);
    },
    
    async saveTask(task) {
        try {
            const userId = window.Auth.getUserId();
            if (!userId) { window.App.showToast('Please sign in first', 'error'); return; }
            
            await window.db.collection('users').doc(userId).collection('tasks').doc(task.id).set(task.toFirestore());
            
            // Update local cache - check for duplicates first
            const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
            const existingIndex = cachedTasks.findIndex(t => t.id === task.id);
            if (existingIndex !== -1) {
                cachedTasks[existingIndex] = task.toFirestore();
            } else {
                cachedTasks.push(task.toFirestore());
            }
            window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, cachedTasks);
            
            window.dispatchEvent(new CustomEvent('tasks-changed', { detail: cachedTasks.map(t => window.Task.fromFirestore(t)) }));
            
            window.App.showToast(window.CONSTANTS.SUCCESS_MESSAGES.TASK_CREATED, 'success');
            window.App.showScreen('dashboard');
        } catch (e) {
            console.error('Error creating task:', e);
            if (e.code === 'resource-exhausted') {
                const cachedTasks = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
                const existingIndex = cachedTasks.findIndex(t => t.id === task.id);
                if (existingIndex !== -1) {
                    cachedTasks[existingIndex] = task.toFirestore();
                } else {
                    cachedTasks.push(task.toFirestore());
                }
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, cachedTasks);
                window.dispatchEvent(new CustomEvent('tasks-changed', { detail: cachedTasks.map(t => window.Task.fromFirestore(t)) }));
                window.App.showToast('Task saved locally - will sync later', 'warning');
                window.App.showScreen('dashboard');
            } else {
                window.App.showToast('Failed to create task', 'error');
            }
        }
    }
};

window.AddTaskScreen = AddTaskScreen;
console.log('✓ AddTaskScreen loaded (v1.3.2 - no duplicates)');
