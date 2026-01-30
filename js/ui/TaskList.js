// SDAPWA v1.1.0 - All Tasks Screen (COMPLETE)
const TaskListScreen={
    tasks:[],
    currentFilter:'all',
    
    render(container){
        this.loadTasks();
        container.innerHTML='<div class="tasklist-screen"><div class="tasklist-filters"><button class="filter-tab active" data-filter="all">All</button><button class="filter-tab" data-filter="active">Active</button><button class="filter-tab" data-filter="completed">Complete</button><button class="filter-tab" data-filter="rainy">Rainy</button></div><div class="tasklist-content" id="tasklist-content"></div></div>';
        this.renderTasks();
        this.setupEventListeners();
        window.addEventListener('tasks-changed',e=>{this.tasks=e.detail;this.renderTasks()});
    },
    
    loadTasks(){
        if(window.syncManager){
            this.tasks=window.syncManager.getCachedTasks();
        }
    },
    
    setupEventListeners(){
        document.querySelectorAll('.filter-tab').forEach(btn=>btn.addEventListener('click',()=>this.switchFilter(btn.dataset.filter)));
    },
    
    switchFilter(filter){
        this.currentFilter=filter;
        document.querySelectorAll('.filter-tab').forEach(btn=>btn.classList.remove('active'));
        event.target.classList.add('active');
        this.renderTasks();
    },
    
    renderTasks(){
        const container=document.getElementById('tasklist-content');
        if(!container)return;
        
        let filtered=window.Algorithms.filterTasks(this.tasks,this.currentFilter);
        filtered=window.Algorithms.sortTasks(filtered,'date_desc');
        
        if(filtered.length===0){
            container.innerHTML='<div class="empty-state"><p>No tasks found</p></div>';
            return;
        }
        
        const grouped=window.Algorithms.groupTasksByDate(filtered);
        const html=Object.entries(grouped).map(([date,tasks])=>
            '<div class="tasklist-group"><div class="tasklist-group-header">'+date+'</div>'+
            tasks.map(task=>this.renderTaskCard(task)).join('')+
            '</div>'
        ).join('');
        container.innerHTML=html;
    },
    
    renderTaskCard(task){
        const completed=task.completed_at?'completed':'';
        const durationColor=window.CONSTANTS.DURATION_COLORS[task.duration_minutes]||window.CONSTANTS.DURATION_COLORS[0];
        
        let timeInfo='';
        if(task.type===window.CONSTANTS.TASK_TYPES.SCHEDULED&&task.start&&task.stop){
            const start=window.DateTimeUtils.formatTime(task.start);
            const stop=window.DateTimeUtils.formatTime(task.stop);
            timeInfo=start+' - '+stop;
        }else if(task.trigger_type===window.CONSTANTS.TRIGGER_TYPES.LOCATION){
            timeInfo='📍 '+(task.location_nickname||'Location');
        }else{
            timeInfo='Flexible';
        }
        
        const actionButtons=task.completed_at?
            '<button class="task-action-btn delete" onclick="TaskListScreen.deleteTask(\''+task.id+'\')">🗑️ Delete</button>':
            '<button class="task-action-btn edit" onclick="TaskListScreen.editTask(\''+task.id+'\')">✏️ Edit</button>'+
            '<button class="task-action-btn complete" onclick="TaskListScreen.completeTask(\''+task.id+'\')">✓ Done</button>'+
            '<button class="task-action-btn delete" onclick="TaskListScreen.deleteTask(\''+task.id+'\')">🗑️</button>';
        
        return '<div class="tasklist-card '+completed+'" data-task-id="'+task.id+'">'+
            '<div class="tasklist-card-header">'+
            '<div class="task-card-badge" style="background-color:'+durationColor+'">'+(task.duration_minutes||'∞')+'m</div>'+
            '<div class="tasklist-card-content">'+
            '<div class="tasklist-card-name">'+task.name+'</div>'+
            '<div class="tasklist-card-time">'+timeInfo+'</div>'+
            '</div></div>'+
            '<div class="tasklist-card-actions">'+actionButtons+'</div>'+
            '</div>';
    },
    
    editTask(taskId){
        const task=this.tasks.find(t=>t.id===taskId);
        if(!task)return;
        
        const modal=document.createElement('div');
        modal.className='modal-overlay';
        modal.innerHTML='<div class="modal-content"><div class="modal-header"><h2>Edit Task</h2><button class="modal-close" onclick="this.closest(\'.modal-overlay\').remove()">✕</button></div><div class="modal-body">'+
            '<div class="form-group"><label>Task Name</label><input type="text" id="edit-task-name" value="'+task.name+'" maxlength="200"></div>'+
            (task.type===window.CONSTANTS.TASK_TYPES.SCHEDULED?
                '<div class="form-group"><label>Start Time</label><input type="datetime-local" id="edit-start" value="'+this.toDateTimeLocal(task.start)+'"></div>'+
                '<div class="form-group"><label>Stop Time</label><input type="datetime-local" id="edit-stop" value="'+this.toDateTimeLocal(task.stop)+'"></div>':'')+
            '<div class="form-group"><label>Trying to get it done in...</label><select id="edit-duration">'+
            '<option value="7" '+(task.duration_minutes===7?'selected':'')+'>7 min</option>'+
            '<option value="15" '+(task.duration_minutes===15?'selected':'')+'>15 min</option>'+
            '<option value="35" '+(task.duration_minutes===35?'selected':'')+'>35 min</option>'+
            '<option value="60" '+(task.duration_minutes===60?'selected':'')+'>60 min</option>'+
            '<option value="90" '+(task.duration_minutes===90?'selected':'')+'>90 min</option>'+
            '</select></div>'+
            '</div><div class="modal-footer">'+
            '<button class="btn-secondary" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>'+
            '<button class="btn-primary" onclick="TaskListScreen.saveEdit(\''+taskId+'\')">Save</button>'+
            '</div></div>';
        document.body.appendChild(modal);
    },
    
    toDateTimeLocal(isoString){
        if(!isoString)return'';
        const d=new Date(isoString);
        const pad=n=>String(n).padStart(2,'0');
        return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
    },
    
    async saveEdit(taskId){
        const task=this.tasks.find(t=>t.id===taskId);
        if(!task)return;
        
        const name=document.getElementById('edit-task-name').value.trim();
        if(!name){
            window.App.showToast('Task name required','error');
            return;
        }
        
        task.name=name;
        if(task.type===window.CONSTANTS.TASK_TYPES.SCHEDULED){
            const start=document.getElementById('edit-start')?.value;
            const stop=document.getElementById('edit-stop')?.value;
            if(start)task.start=new Date(start).toISOString();
            if(stop)task.stop=new Date(stop).toISOString();
        }
        task.duration_minutes=parseInt(document.getElementById('edit-duration').value);
        
        const deviceId=window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
        task.touch(deviceId);
        
        try{
            const userId=window.Auth.getUserId();
            await window.db.collection('users/'+userId+'/tasks').doc(taskId).update(task.toFirestore());
            
            if(window.syncManager){
                const cached=window.syncManager.getCachedTasks();
                const idx=cached.findIndex(t=>t.id===taskId);
                if(idx!==-1){
                    cached[idx]=task;
                    window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS_CACHE,JSON.stringify(cached));
                }
            }
            
            this.renderTasks();
            window.dispatchEvent(new CustomEvent('tasks-changed',{detail:this.tasks}));
            document.querySelector('.modal-overlay')?.remove();
            window.App.showToast('Task updated!','success');
        }catch(e){
            console.error('Error updating task:',e);
            window.App.showToast('Failed to update task','error');
        }
    },
    
    async completeTask(taskId){
        const task=this.tasks.find(t=>t.id===taskId);
        if(!task)return;
        
        const deviceId=window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
        task.complete(deviceId);
        
        try{
            const userId=window.Auth.getUserId();
            await window.db.collection('users/'+userId+'/tasks').doc(taskId).update({
                completed_at:task.completed_at,
                completed_on_device:task.completed_on_device,
                modified_at:task.modified_at,
                modified_by:task.modified_by,
                sync_version:firebase.firestore.FieldValue.increment(1)
            });
            
            if(window.syncManager){
                const cached=window.syncManager.getCachedTasks();
                const idx=cached.findIndex(t=>t.id===taskId);
                if(idx!==-1){
                    cached[idx]=task;
                    window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS_CACHE,JSON.stringify(cached));
                }
            }
            
            this.renderTasks();
            window.dispatchEvent(new CustomEvent('tasks-changed',{detail:this.tasks}));
            window.App.showToast('Task completed!','success');
        }catch(e){
            console.error('Error:',e);
            window.App.showToast('Failed to complete task','error');
        }
    },
    
    async deleteTask(taskId){
        if(!confirm('Delete this task?'))return;
        
        const task=this.tasks.find(t=>t.id===taskId);
        if(!task)return;
        
        const deviceId=window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
        task.markDeleted(deviceId);
        
        try{
            const userId=window.Auth.getUserId();
            await window.db.collection('users/'+userId+'/tasks').doc(taskId).update({
                deleted:true,
                modified_at:task.modified_at,
                modified_by:task.modified_by,
                sync_version:firebase.firestore.FieldValue.increment(1)
            });
            
            if(window.syncManager){
                const cached=window.syncManager.getCachedTasks().filter(t=>t.id!==taskId);
                window.Storage.set(window.CONSTANTS.STORAGE_KEYS.TASKS_CACHE,JSON.stringify(cached));
                this.tasks=cached;
            }
            
            this.renderTasks();
            window.dispatchEvent(new CustomEvent('tasks-changed',{detail:this.tasks}));
            window.App.showToast('Task deleted','success');
        }catch(e){
            console.error('Error:',e);
            window.App.showToast('Failed to delete task','error');
        }
    }
};
window.TaskListScreen=TaskListScreen;
console.log('✓ TaskListScreen loaded');
