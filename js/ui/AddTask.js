// SDAPWA v1.2.0 - Add Task Screen (with Rainy Day support)
const AddTaskScreen = {
    selectedTab: 'time',
    selectedDuration: 15,
    addressSearchTimeout: null,
    selectedLocation: null,
    selectedLabels: [],
    
    render(container) {
        container.innerHTML = `
            <div class="addtask-screen">
                <h2>Add Task</h2>
                <div class="task-type-tabs">
                    <button class="task-type-tab active" data-type="time">⏰ Time</button>
                    <button class="task-type-tab" data-type="location">📍 Location</button>
                    <button class="task-type-tab" data-type="rainy">💧 Rainy Day</button>
                </div>
                
                <!-- TIME-BASED TASK FORM -->
                <div class="task-form active" id="time-form">
                    <div class="form-group">
                        <label>Task Name</label>
                        <input type="text" id="task-name" placeholder="e.g., Call the dentist" maxlength="200">
                    </div>
                    <div class="form-group">
                        <label>Start Time (when you'll begin)</label>
                        <input type="datetime-local" id="task-start">
                    </div>
                    <div class="form-group">
                        <label>Stop Time (absolute deadline)</label>
                        <input type="datetime-local" id="task-stop">
                    </div>
                    <div class="form-group">
                        <label>Trying to get it done in...</label>
                        <div class="duration-options">
                            <button class="duration-btn" data-duration="7">7 min</button>
                            <button class="duration-btn active" data-duration="15">15 min</button>
                            <button class="duration-btn" data-duration="35">35 min</button>
                            <button class="duration-btn" data-duration="60">60 min</button>
                            <button class="duration-btn" data-duration="90">90 min</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label><input type="checkbox" id="bmde-checkbox"> Add to "Before My Day Ends"</label>
                    </div>
                    <div class="form-group">
                        <button class="btn-primary" id="create-task-btn">Create Task</button>
                    </div>
                </div>
                
                <!-- LOCATION-BASED TASK FORM -->
                <div class="task-form" id="location-form">
                    <div class="form-group">
                        <label>Task Name</label>
                        <input type="text" id="location-task-name" placeholder="e.g., Pick up groceries" maxlength="200">
                    </div>
                    <div class="form-group">
                        <label>Location Address</label>
                        <input type="text" id="location-address" placeholder="Type full address with city and zip..." autocomplete="off">
                        <div id="address-suggestions" class="address-suggestions"></div>
                        <small style="color:#757575;display:block;margin-top:4px;">Tip: Include street number, city, and zip code for best results</small>
                    </div>
                    <div class="form-group">
                        <label>Trying to get it done in...</label>
                        <div class="duration-options">
                            <button class="duration-btn" data-duration="7">7 min</button>
                            <button class="duration-btn active" data-duration="15">15 min</button>
                            <button class="duration-btn" data-duration="35">35 min</button>
                            <button class="duration-btn" data-duration="60">60 min</button>
                            <button class="duration-btn" data-duration="90">90 min</button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Geofence Radius</label>
                        <select id="geofence-radius">
                            <option value="50">50 meters</option>
                            <option value="100" selected>100 meters</option>
                            <option value="200">200 meters</option>
                            <option value="500">500 meters</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <button class="btn-primary" id="create-location-task-btn">Create Location Task</button>
                    </div>
                </div>
                
                <!-- RAINY DAY TASK FORM -->
                <div class="task-form" id="rainy-form">
                    <div class="form-group">
                        <label>Task Name</label>
                        <input type="text" id="rainy-task-name" placeholder="e.g., Organize photo albums" maxlength="200">
                    </div>
                    <div class="form-group">
                        <label>Labels (optional)</label>
                        <div class="label-picker" id="label-picker">
                            ${window.CONSTANTS.RAINY_DAY_LABELS.map(label => `
                                <label class="label-option">
                                    <input type="checkbox" value="${label.id}" class="label-checkbox">
                                    <span class="label-chip">${label.icon} ${label.label}</span>
                                </label>
                            `).join('')}
                            <div class="custom-label-group">
                                <input type="text" id="custom-label" placeholder="+ Add custom label" maxlength="20">
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <button class="btn-primary" id="create-rainy-task-btn">Create Rainy Day Task</button>
                    </div>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
        this.setDefaultTimes();
        this.selectedLabels = [];
    },
    
    setDefaultTimes() {
        const now = new Date();
        const start = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        const stop = new Date(start.getTime() + 60 * 60 * 1000); // 2 hours from now
        const startInput = document.getElementById('task-start');
        const stopInput = document.getElementById('task-stop');
        if (startInput) startInput.value = this.formatDateTimeLocal(start);
        if (stopInput) stopInput.value = this.formatDateTimeLocal(stop);
    },
    
    formatDateTimeLocal(d) {
        const pad = n => String(n).padStart(2, '0');
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    },
    
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.task-type-tab').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.type, e));
        });
        
        // Duration buttons
        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectDuration(e.target));
        });
        
        // Address search with debounce
        const addressInput = document.getElementById('location-address');
        if (addressInput) {
            addressInput.addEventListener('input', (e) => this.debouncedAddressSearch(e.target.value));
            // Hide suggestions when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.form-group')) {
                    const suggestions = document.getElementById('address-suggestions');
                    if (suggestions) suggestions.style.display = 'none';
                }
            });
        }
        
        // Create task buttons
        const createTaskBtn = document.getElementById('create-task-btn');
        if (createTaskBtn) {
            createTaskBtn.addEventListener('click', () => this.createTask());
        }
        
        const createLocationTaskBtn = document.getElementById('create-location-task-btn');
        if (createLocationTaskBtn) {
            createLocationTaskBtn.addEventListener('click', () => this.createLocationTask());
        }
        
        // Rainy day specific
        const createRainyTaskBtn = document.getElementById('create-rainy-task-btn');
        if (createRainyTaskBtn) {
            createRainyTaskBtn.addEventListener('click', () => this.createRainyDayTask());
        }
        
        // Label checkboxes
        document.querySelectorAll('.label-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.toggleLabel(e.target.value, e.target.checked));
        });
        
        // Custom label input
        const customLabelInput = document.getElementById('custom-label');
        if (customLabelInput) {
            customLabelInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addCustomLabel(customLabelInput.value.trim());
                    customLabelInput.value = '';
                }
            });
        }
    },
    
    toggleLabel(labelId, checked) {
        if (checked) {
            if (!this.selectedLabels.includes(labelId)) {
                this.selectedLabels.push(labelId);
            }
        } else {
            this.selectedLabels = this.selectedLabels.filter(l => l !== labelId);
        }
    },
    
    addCustomLabel(label) {
        if (!label || label.length < 2) return;
        const customId = 'custom_' + label.toLowerCase().replace(/\s+/g, '_');
        if (!this.selectedLabels.includes(customId)) {
            this.selectedLabels.push(customId);
            // Add visual indicator
            const picker = document.getElementById('label-picker');
            const customGroup = picker.querySelector('.custom-label-group');
            const chip = document.createElement('span');
            chip.className = 'label-chip custom-chip';
            chip.innerHTML = `🏷️ ${label} <button onclick="AddTaskScreen.removeCustomLabel('${customId}', this)">✕</button>`;
            chip.dataset.labelId = customId;
            customGroup.insertBefore(chip, customGroup.querySelector('input'));
        }
    },
    
    removeCustomLabel(labelId, btn) {
        this.selectedLabels = this.selectedLabels.filter(l => l !== labelId);
        btn.parentElement.remove();
    },
    
    switchTab(tabType, event) {
        this.selectedTab = tabType;
        document.querySelectorAll('.task-type-tab').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.task-form').forEach(form => form.classList.remove('active'));
        if (event && event.target) {
            event.target.classList.add('active');
        }
        const formId = tabType + '-form';
        const form = document.getElementById(formId);
        if (form) form.classList.add('active');
    },
    
    selectDuration(btn) {
        this.selectedDuration = parseInt(btn.dataset.duration);
        const parent = btn.closest('.duration-options');
        parent.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    },
    
    // Debounced address search - waits for user to stop typing
    debouncedAddressSearch(query) {
        // Clear any pending search
        if (this.addressSearchTimeout) {
            clearTimeout(this.addressSearchTimeout);
        }
        
        // Don't search if query is too short
        if (query.length < 5) {
            const suggestions = document.getElementById('address-suggestions');
            if (suggestions) suggestions.style.display = 'none';
            return;
        }
        
        // Wait 500ms after user stops typing before searching
        this.addressSearchTimeout = setTimeout(() => {
            this.searchAddress(query);
        }, 500);
    },
    
    async searchAddress(query) {
        const suggestions = document.getElementById('address-suggestions');
        if (!suggestions) return;
        
        // Show loading state
        suggestions.innerHTML = '<div class="suggestion-item loading">Searching...</div>';
        suggestions.style.display = 'block';
        
        try {
            // Use Nominatim with structured query for better residential results
            // Add addressdetails=1 to get better address breakdowns
            // Use featuretype=settlement,house to prioritize buildings
            const encodedQuery = encodeURIComponent(query);
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&countrycodes=us&limit=8&addressdetails=1`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'SimplyDone-PWA/1.1.2'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Search failed');
            }
            
            const results = await response.json();
            
            if (results.length === 0) {
                suggestions.innerHTML = '<div class="suggestion-item">No addresses found. Try including city and zip code.</div>';
                return;
            }
            
            // Sort results to prioritize specific addresses (houses, buildings) over streets
            const sortedResults = results.sort((a, b) => {
                const typeOrder = {
                    'house': 0,
                    'building': 1,
                    'residential': 2,
                    'commercial': 3,
                    'street': 4,
                    'road': 5
                };
                const typeA = typeOrder[a.type] ?? 10;
                const typeB = typeOrder[b.type] ?? 10;
                return typeA - typeB;
            });
            
            suggestions.innerHTML = sortedResults.map((r, idx) => {
                // Create a cleaner display name
                let displayName = r.display_name;
                // Truncate if too long
                if (displayName.length > 80) {
                    displayName = displayName.substring(0, 77) + '...';
                }
                return `<div class="suggestion-item" data-idx="${idx}" data-lat="${r.lat}" data-lon="${r.lon}" data-name="${r.display_name.replace(/"/g, '&quot;')}">${displayName}</div>`;
            }).join('');
            
            // Add click handlers to suggestions
            suggestions.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    const lat = parseFloat(item.dataset.lat);
                    const lon = parseFloat(item.dataset.lon);
                    const name = item.dataset.name;
                    this.selectAddress(lat, lon, name);
                });
            });
            
        } catch (e) {
            console.error('Address search failed:', e);
            suggestions.innerHTML = '<div class="suggestion-item">Search failed. Please try again.</div>';
        }
    },
    
    selectAddress(lat, lon, address) {
        const addressInput = document.getElementById('location-address');
        addressInput.value = address;
        this.selectedLocation = { lat, lon, address };
        document.getElementById('address-suggestions').style.display = 'none';
    },
    
    async createTask() {
        const name = document.getElementById('task-name').value.trim();
        const start = document.getElementById('task-start').value;
        const stop = document.getElementById('task-stop').value;
        const bmde = document.getElementById('bmde-checkbox').checked;
        
        // Validation
        if (!name) {
            window.App.showToast('Task name required', 'error');
            return;
        }
        if (name.length < 3) {
            window.App.showToast('Task name must be at least 3 characters', 'error');
            return;
        }
        if (!start || !stop) {
            window.App.showToast('Start and stop times required', 'error');
            return;
        }
        
        // Convert local datetime-local values to UTC ISO strings
        const startISO = window.DateTimeUtils.localDateTimeToUTC(start);
        const stopISO = window.DateTimeUtils.localDateTimeToUTC(stop);
        
        const startDate = window.DateTimeUtils.parseISO(startISO);
        const stopDate = window.DateTimeUtils.parseISO(stopISO);
        
        if (stopDate <= startDate) {
            window.App.showToast('Stop time must be after start time', 'error');
            return;
        }
        
        // Disable button to prevent double-submission
        const btn = document.getElementById('create-task-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Creating...';
        }
        
        // Create task object BEFORE try block so it's available in catch
        const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
        const task = window.Task.newScheduled(name, this.selectedDuration, startISO, stopISO, deviceId);
        task.before_day_ends = bmde;
        
        try {
            const userId = window.Auth.getUserId();
            if (!userId) {
                throw new Error('Not signed in');
            }
            
            // Try to save to Firestore
            await window.db.collection('users').doc(userId).collection('tasks').doc(task.id).set(task.toFirestore());
            
            console.log('Task created successfully:', task.id);
            
            // Update local cache
            this.updateLocalCache(task);
            
            window.App.showToast('Task created! ✓', 'success');
            window.App.showScreen('dashboard');
            
        } catch (e) {
            console.error('Error creating task:', e);
            
            // Check for quota error - save locally anyway
            if (e.code === 'resource-exhausted' || (e.message && e.message.includes('Quota'))) {
                // Save to local cache AND offline queue
                this.updateLocalCache(task);
                this.saveToOfflineQueue('create', task);
                window.App.showToast('Saved locally - will sync when quota resets', 'warning');
                window.App.showScreen('dashboard');
            } else {
                window.App.showToast('Failed to create task: ' + e.message, 'error');
            }
        } finally {
            // Re-enable button
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Create Task';
            }
        }
    },
    
    async createLocationTask() {
        const name = document.getElementById('location-task-name').value.trim();
        const radius = parseInt(document.getElementById('geofence-radius').value);
        
        // Validation
        if (!name) {
            window.App.showToast('Task name required', 'error');
            return;
        }
        if (name.length < 3) {
            window.App.showToast('Task name must be at least 3 characters', 'error');
            return;
        }
        if (!this.selectedLocation) {
            window.App.showToast('Please select an address from the suggestions', 'error');
            return;
        }
        
        const { lat, lon, address } = this.selectedLocation;
        
        // Disable button
        const btn = document.getElementById('create-location-task-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Creating...';
        }
        
        // Create task object BEFORE try block so it's available in catch
        const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
        const task = window.Task.newLocation(name, this.selectedDuration, {
            nickname: address.substring(0, 50),
            address: address.substring(0, 100),
            lat: lat,
            lon: lon,
            radius_meters: radius
        });
        
        try {
            const userId = window.Auth.getUserId();
            if (!userId) {
                throw new Error('Not signed in');
            }
            
            await window.db.collection('users').doc(userId).collection('tasks').doc(task.id).set(task.toFirestore());
            
            console.log('Location task created successfully:', task.id);
            
            // Update local cache
            this.updateLocalCache(task);
            
            window.App.showToast('Location task created! ✓', 'success');
            window.App.showScreen('dashboard');
            
        } catch (e) {
            console.error('Error creating location task:', e);
            
            if (e.code === 'resource-exhausted' || (e.message && e.message.includes('Quota'))) {
                // Save to local cache AND offline queue
                this.updateLocalCache(task);
                this.saveToOfflineQueue('create', task);
                window.App.showToast('Saved locally - will sync when quota resets', 'warning');
                window.App.showScreen('dashboard');
            } else {
                window.App.showToast('Failed to create task: ' + e.message, 'error');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Create Location Task';
            }
        }
    },
    
    async createRainyDayTask() {
        const name = document.getElementById('rainy-task-name').value.trim();
        
        // Validation
        if (!name) {
            window.App.showToast('Task name required', 'error');
            return;
        }
        if (name.length < 3) {
            window.App.showToast('Task name must be at least 3 characters', 'error');
            return;
        }
        
        // Disable button
        const btn = document.getElementById('create-rainy-task-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Creating...';
        }
        
        // Create rainy day task - no duration, no time constraints
        const task = window.Task.newRainyDay(name, 0, '', this.selectedLabels);
        
        try {
            const userId = window.Auth.getUserId();
            if (!userId) {
                throw new Error('Not signed in');
            }
            
            await window.db.collection('users').doc(userId).collection('tasks').doc(task.id).set(task.toFirestore());
            
            console.log('Rainy day task created successfully:', task.id);
            
            // Update local cache
            this.updateLocalCache(task);
            
            // Clear the form
            document.getElementById('rainy-task-name').value = '';
            this.selectedLabels = [];
            document.querySelectorAll('.label-checkbox').forEach(cb => cb.checked = false);
            document.querySelectorAll('.custom-chip').forEach(chip => chip.remove());
            
            window.App.showToast('Rainy day task created! 💧', 'success');
            window.App.showScreen('rainyday');
            
        } catch (e) {
            console.error('Error creating rainy day task:', e);
            
            if (e.code === 'resource-exhausted' || (e.message && e.message.includes('Quota'))) {
                // Save to local cache AND offline queue
                this.updateLocalCache(task);
                this.saveToOfflineQueue('create', task);
                window.App.showToast('Saved locally - will sync when quota resets', 'warning');
                window.App.showScreen('rainyday');
            } else {
                window.App.showToast('Failed to create task: ' + e.message, 'error');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Create Rainy Day Task';
            }
        }
    },

    updateLocalCache(task) {
        // Get current cached tasks
        const cachedData = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.TASKS, []);
        cachedData.push(task.toFirestore());
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS, cachedData);
        
        // Dispatch event to update UI
        const tasks = cachedData.map(t => window.Task.fromFirestore(t));
        window.dispatchEvent(new CustomEvent('tasks-changed', { detail: tasks }));
    },
    
    saveToOfflineQueue(action, task) {
        const queue = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.OFFLINE_QUEUE, []);
        queue.push({
            action: action,
            type: 'task',
            data: task.toFirestore(),
            timestamp: window.DateTimeUtils.utcNowISO()
        });
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.OFFLINE_QUEUE, queue);
    }
};

window.AddTaskScreen = AddTaskScreen;
console.log('✓ AddTaskScreen loaded');
