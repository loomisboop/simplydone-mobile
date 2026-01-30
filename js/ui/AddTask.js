// SDAPWA v1.1.0 - Add Task Screen (COMPLETE)
const AddTaskScreen={
    selectedTab:'time',
    selectedDuration:15,
    
    render(a){
        a.innerHTML='<div class="addtask-screen"><h2>Add Task</h2><div class="task-type-tabs"><button class="task-type-tab active" data-type="time">⏰ Time</button><button class="task-type-tab" data-type="location">📍 Location</button></div><div class="task-form active" id="time-form"><div class="form-group"><label>Task Name</label><input type="text" id="task-name" placeholder="e.g., Call the dentist" maxlength="200"></div><div class="form-group"><label>Start Time (when you\'ll begin)</label><input type="datetime-local" id="task-start"></div><div class="form-group"><label>Stop Time (absolute deadline)</label><input type="datetime-local" id="task-stop"></div><div class="form-group"><label>Trying to get it done in...</label><div class="duration-options"><button class="duration-btn" data-duration="7">7 min</button><button class="duration-btn active" data-duration="15">15 min</button><button class="duration-btn" data-duration="35">35 min</button><button class="duration-btn" data-duration="60">60 min</button><button class="duration-btn" data-duration="90">90 min</button></div></div><div class="form-group"><label><input type="checkbox" id="bmde-checkbox"> Add to "Before My Day Ends"</label></div><div class="form-group"><button class="btn-primary" onclick="AddTaskScreen.createTask()">Create Task</button></div></div><div class="task-form" id="location-form"><div class="form-group"><label>Task Name</label><input type="text" id="location-task-name" placeholder="e.g., Pick up groceries" maxlength="200"></div><div class="form-group"><label>Location Address</label><input type="text" id="location-address" placeholder="Start typing an address..." autocomplete="off"><div id="address-suggestions" class="address-suggestions"></div></div><div class="form-group"><label>Trying to get it done in...</label><div class="duration-options"><button class="duration-btn" data-duration="7">7 min</button><button class="duration-btn active" data-duration="15">15 min</button><button class="duration-btn" data-duration="35">35 min</button><button class="duration-btn" data-duration="60">60 min</button><button class="duration-btn" data-duration="90">90 min</button></div></div><div class="form-group"><label>Geofence Radius</label><select id="geofence-radius"><option value="50">50 meters</option><option value="100" selected>100 meters</option><option value="200">200 meters</option><option value="500">500 meters</option></select></div><div class="form-group"><button class="btn-primary" onclick="AddTaskScreen.createLocationTask()">Create Location Task</button></div></div></div>';
        this.setupEventListeners();
        this.setDefaultTimes();
    },
    
    setDefaultTimes(){
        const now=new Date();
        const start=new Date(now.getTime()+60*60*1000);
        const stop=new Date(start.getTime()+60*60*1000);
        const startInput=document.getElementById('task-start');
        const stopInput=document.getElementById('task-stop');
        if(startInput)startInput.value=this.formatDateTimeLocal(start);
        if(stopInput)stopInput.value=this.formatDateTimeLocal(stop);
    },
    
    formatDateTimeLocal(d){
        const pad=n=>String(n).padStart(2,'0');
        return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
    },
    
    setupEventListeners(){
        document.querySelectorAll('.task-type-tab').forEach(b=>b.addEventListener('click',()=>this.switchTab(b.dataset.type)));
        document.querySelectorAll('.duration-btn').forEach(b=>b.addEventListener('click',()=>this.selectDuration(b)));
        const addressInput=document.getElementById('location-address');
        if(addressInput){
            addressInput.addEventListener('input',()=>this.searchAddress(addressInput.value));
        }
    },
    
    switchTab(a){
        this.selectedTab=a;
        document.querySelectorAll('.task-type-tab').forEach(b=>b.classList.remove('active'));
        document.querySelectorAll('.task-form').forEach(b=>b.classList.remove('active'));
        event.target.classList.add('active');
        document.getElementById(a+'-form').classList.add('active');
    },
    
    selectDuration(a){
        this.selectedDuration=parseInt(a.dataset.duration);
        const parent=a.closest('.duration-options');
        parent.querySelectorAll('.duration-btn').forEach(b=>b.classList.remove('active'));
        a.classList.add('active');
    },
    
    async searchAddress(query){
        if(query.length<3)return;
        const suggestions=document.getElementById('address-suggestions');
        if(!suggestions)return;
        try{
            const response=await fetch('https://nominatim.openstreetmap.org/search?format=json&q='+encodeURIComponent(query)+'&countrycodes=us&limit=5');
            const results=await response.json();
            if(results.length===0){
                suggestions.innerHTML='<div class="suggestion-item">No addresses found</div>';
                suggestions.style.display='block';
                return;
            }
            suggestions.innerHTML=results.map(r=>'<div class="suggestion-item" onclick="AddTaskScreen.selectAddress('+r.lat+','+r.lon+',\''+r.display_name.replace(/'/g,"\\'")+'\')">' +r.display_name+'</div>').join('');
            suggestions.style.display='block';
        }catch(e){
            console.error('Address search failed:',e);
        }
    },
    
    selectAddress(lat,lon,address){
        document.getElementById('location-address').value=address;
        document.getElementById('location-address').dataset.lat=lat;
        document.getElementById('location-address').dataset.lon=lon;
        document.getElementById('address-suggestions').style.display='none';
    },
    
    async createTask(){
        const name=document.getElementById('task-name').value.trim();
        const start=document.getElementById('task-start').value;
        const stop=document.getElementById('task-stop').value;
        const bmde=document.getElementById('bmde-checkbox').checked;
        
        if(!name){
            window.App.showToast('Task name required','error');
            return;
        }
        if(!start||!stop){
            window.App.showToast('Start and stop times required','error');
            return;
        }
        
        const startDate=new Date(start);
        const stopDate=new Date(stop);
        
        if(stopDate<=startDate){
            window.App.showToast('Stop time must be after start time','error');
            return;
        }
        
        try{
            const deviceId=window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
            const task=window.Task.newScheduled(name,this.selectedDuration,startDate.toISOString(),stopDate.toISOString(),deviceId);
            task.before_day_ends=bmde;
            
            const userId=window.Auth.getUserId();
            await window.db.collection('users/'+userId+'/tasks').doc(task.id).set(task.toFirestore());
            
            // CRITICAL FIX: Update cache immediately and trigger refresh
            if(window.syncManager){
                const cached=window.syncManager.getCachedTasks();
                cached.push(task);
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS_CACHE,JSON.stringify(cached));
                window.dispatchEvent(new CustomEvent('tasks-changed',{detail:cached}));
            }
            
            window.App.showToast('Task created!','success');
            window.App.showScreen('dashboard');
        }catch(e){
            console.error('Error creating task:',e);
            window.App.showToast('Failed to create task','error');
        }
    },
    
    async createLocationTask(){
        const name=document.getElementById('location-task-name').value.trim();
        const addressInput=document.getElementById('location-address');
        const address=addressInput.value.trim();
        const lat=parseFloat(addressInput.dataset.lat);
        const lon=parseFloat(addressInput.dataset.lon);
        const radius=parseInt(document.getElementById('geofence-radius').value);
        
        if(!name){
            window.App.showToast('Task name required','error');
            return;
        }
        if(!address||isNaN(lat)||isNaN(lon)){
            window.App.showToast('Please select a valid address from suggestions','error');
            return;
        }
        
        try{
            const deviceId=window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
            const task=window.Task.newLocation(name,this.selectedDuration,address.substring(0,100),lat,lon,radius,deviceId);
            
            const userId=window.Auth.getUserId();
            await window.db.collection('users/'+userId+'/tasks').doc(task.id).set(task.toFirestore());
            
            // Update cache and trigger refresh
            if(window.syncManager){
                const cached=window.syncManager.getCachedTasks();
                cached.push(task);
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS_CACHE,JSON.stringify(cached));
                window.dispatchEvent(new CustomEvent('tasks-changed',{detail:cached}));
            }
            
            window.App.showToast('Location task created!','success');
            window.App.showScreen('dashboard');
        }catch(e){
            console.error('Error creating location task:',e);
            window.App.showToast('Failed to create task','error');
        }
    }
};
window.AddTaskScreen=AddTaskScreen;
console.log('✓ AddTaskScreen loaded');
