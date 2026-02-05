// SDAPWA v1.3.1 - Goals Detail Screen (with full CRUD)

const GoalsDetailScreen = {
    goals: [],
    
    render(container) {
        this.loadGoals();
        container.innerHTML = '<div class="goals-detail-screen" id="goals-container"></div>';
        this.renderGoals();
        
        window.addEventListener('goals-changed', (e) => {
            this.goals = e.detail;
            this.renderGoals();
        });
    },
    
    loadGoals() {
        if (window.syncManager) {
            this.goals = window.syncManager.getCachedGoals();
        } else {
            const data = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.GOALS, []);
            this.goals = data.map(g => window.Goal.fromFirestore(g));
        }
    },
    
    renderGoals() {
        const container = document.getElementById('goals-container');
        if (!container) return;
        
        if (this.goals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p class="empty-state-icon">🎯</p>
                    <p class="empty-state-title">No Goals Yet</p>
                    <p class="empty-state-message">Add your first goal to get started</p>
                    <button class="btn-primary" style="margin-top:16px;" onclick="GoalsDetailScreen.showAddGoalModal()">+ Add Goal</button>
                </div>
            `;
            return;
        }
        
        const goalsHTML = this.goals.map(goal => this.renderGoalCard(goal)).join('');
        container.innerHTML = goalsHTML + `
            <button class="add-goal-card" onclick="GoalsDetailScreen.showAddGoalModal()">
                <div class="add-goal-icon">+</div>
                <div class="add-goal-text">Add New Goal</div>
            </button>
        `;
    },
    
    renderGoalCard(goal) {
        const progress = window.Algorithms.calculateGoalProgress(goal);
        const percentage = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
        const goalId = goal.id.replace(/'/g, "\\'");
        
        const stepsHTML = goal.steps.map((step, index) => `
            <div class="goal-step ${step.completed ? 'completed' : ''}">
                <div class="goal-step-checkbox ${step.completed ? 'checked' : ''}" 
                     onclick="GoalsDetailScreen.toggleStep('${goalId}', ${index})"></div>
                <div class="goal-step-content">
                    <div class="goal-step-description">${step.description}</div>
                    <div class="goal-step-date">Due: ${step.due_date || 'No date'}</div>
                </div>
                <button class="goal-step-delete" onclick="GoalsDetailScreen.deleteStep('${goalId}', ${index})">✕</button>
            </div>
        `).join('');
        
        return `
            <div class="goal-card" data-goal-id="${goal.id}">
                <div class="goal-card-header">
                    <div class="goal-card-top">
                        <div>
                            <div class="goal-card-label">Goal</div>
                            <div class="goal-card-name">${goal.name_one_word}</div>
                        </div>
                        <div class="goal-card-actions">
                            <button class="goal-edit-btn" onclick="GoalsDetailScreen.showEditGoalModal('${goalId}')">✏️</button>
                            <button class="goal-delete-btn" onclick="GoalsDetailScreen.deleteGoal('${goalId}')">🗑️</button>
                        </div>
                    </div>
                    <div class="goal-card-definition">${goal.definition}</div>
                </div>
                <div class="goal-progress-bar">
                    <div class="goal-progress-fill" style="width:${percentage}%"></div>
                </div>
                <div class="goal-progress-text">${progress.completed} of ${progress.total} steps complete</div>
                <div class="goal-steps">
                    ${stepsHTML}
                    <button class="add-step-btn" onclick="GoalsDetailScreen.showAddStepModal('${goalId}')">
                        + Add Step
                    </button>
                </div>
            </div>
        `;
    },
    
    // Toggle step completion
    async toggleStep(goalId, stepIndex) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;
        
        goal.steps[stepIndex].completed = !goal.steps[stepIndex].completed;
        goal.updated_at = window.DateTimeUtils.utcNowISO();
        
        try {
            const userId = window.Auth.getUserId();
            await window.db.collection('users').doc(userId).collection('goals').doc(goalId).update({
                steps: goal.steps.map(s => s.toObject ? s.toObject() : s),
                updated_at: goal.updated_at
            });
            
            this.updateLocalGoal(goal);
            window.App.showToast('Step updated!', 'success');
        } catch (error) {
            console.error('Error updating step:', error);
            window.App.showToast('Failed to update step', 'error');
        }
    },
    
    // Show Add Goal Modal
    showAddGoalModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content goal-modal">
                <div class="modal-header">
                    <h2>Add New Goal</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Goal Name (one word)</label>
                        <input type="text" id="goal-name" placeholder="e.g., Health, Career, Learning" maxlength="20">
                    </div>
                    <div class="form-group">
                        <label>Definition</label>
                        <textarea id="goal-definition" rows="2" placeholder="What does this goal mean to you?"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="btn-primary" onclick="GoalsDetailScreen.createGoal()">Create Goal</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        document.getElementById('goal-name').focus();
    },
    
    // Create new goal
    async createGoal() {
        const name = document.getElementById('goal-name').value.trim();
        const definition = document.getElementById('goal-definition').value.trim();
        
        if (!name) {
            window.App.showToast('Please enter a goal name', 'error');
            return;
        }
        
        if (this.goals.length >= 3) {
            window.App.showToast('Maximum 3 goals allowed', 'error');
            return;
        }
        
        const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
        const goal = new window.Goal({
            name_one_word: name,
            definition: definition || name,
            steps: [],
            created_by: deviceId
        });
        
        try {
            const userId = window.Auth.getUserId();
            await window.db.collection('users').doc(userId).collection('goals').doc(goal.id).set(goal.toFirestore());
            
            this.goals.push(goal);
            this.updateLocalGoals();
            
            document.querySelector('.modal-overlay')?.remove();
            window.App.showToast('Goal created!', 'success');
            this.renderGoals();
        } catch (error) {
            console.error('Error creating goal:', error);
            window.App.showToast('Failed to create goal', 'error');
        }
    },
    
    // Show Edit Goal Modal
    showEditGoalModal(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content goal-modal">
                <div class="modal-header">
                    <h2>Edit Goal</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Goal Name (one word)</label>
                        <input type="text" id="edit-goal-name" value="${goal.name_one_word}" maxlength="20">
                    </div>
                    <div class="form-group">
                        <label>Definition</label>
                        <textarea id="edit-goal-definition" rows="2">${goal.definition}</textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="btn-primary" onclick="GoalsDetailScreen.updateGoal('${goalId}')">Save Changes</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    },
    
    // Update goal
    async updateGoal(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;
        
        const name = document.getElementById('edit-goal-name').value.trim();
        const definition = document.getElementById('edit-goal-definition').value.trim();
        
        if (!name) {
            window.App.showToast('Please enter a goal name', 'error');
            return;
        }
        
        goal.name_one_word = name;
        goal.definition = definition || name;
        goal.updated_at = window.DateTimeUtils.utcNowISO();
        
        try {
            const userId = window.Auth.getUserId();
            await window.db.collection('users').doc(userId).collection('goals').doc(goalId).update({
                name_one_word: goal.name_one_word,
                definition: goal.definition,
                updated_at: goal.updated_at
            });
            
            this.updateLocalGoals();
            document.querySelector('.modal-overlay')?.remove();
            window.App.showToast('Goal updated!', 'success');
            this.renderGoals();
        } catch (error) {
            console.error('Error updating goal:', error);
            window.App.showToast('Failed to update goal', 'error');
        }
    },
    
    // Delete goal
    async deleteGoal(goalId) {
        if (!confirm('Delete this goal and all its steps?')) return;
        
        try {
            const userId = window.Auth.getUserId();
            await window.db.collection('users').doc(userId).collection('goals').doc(goalId).update({
                archived: true,
                updated_at: window.DateTimeUtils.utcNowISO()
            });
            
            this.goals = this.goals.filter(g => g.id !== goalId);
            this.updateLocalGoals();
            
            window.App.showToast('Goal deleted', 'success');
            this.renderGoals();
        } catch (error) {
            console.error('Error deleting goal:', error);
            window.App.showToast('Failed to delete goal', 'error');
        }
    },
    
    // Show Add Step Modal
    showAddStepModal(goalId) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content goal-modal">
                <div class="modal-header">
                    <h2>Add Step</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Step Description</label>
                        <input type="text" id="step-description" placeholder="What needs to be done?">
                    </div>
                    <div class="form-group">
                        <label>Due Date</label>
                        <input type="date" id="step-due-date">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="btn-primary" onclick="GoalsDetailScreen.addStep('${goalId}')">Add Step</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        document.getElementById('step-description').focus();
    },
    
    // Add step to goal
    async addStep(goalId) {
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;
        
        const description = document.getElementById('step-description').value.trim();
        const dueDate = document.getElementById('step-due-date').value;
        
        if (!description) {
            window.App.showToast('Please enter a step description', 'error');
            return;
        }
        
        const newStep = {
            description: description,
            due_date: dueDate || null,
            challenge_date: null,
            completed: false
        };
        
        goal.steps.push(newStep);
        goal.updated_at = window.DateTimeUtils.utcNowISO();
        
        try {
            const userId = window.Auth.getUserId();
            await window.db.collection('users').doc(userId).collection('goals').doc(goalId).update({
                steps: goal.steps.map(s => s.toObject ? s.toObject() : s),
                updated_at: goal.updated_at
            });
            
            this.updateLocalGoals();
            document.querySelector('.modal-overlay')?.remove();
            window.App.showToast('Step added!', 'success');
            this.renderGoals();
        } catch (error) {
            console.error('Error adding step:', error);
            window.App.showToast('Failed to add step', 'error');
        }
    },
    
    // Delete step
    async deleteStep(goalId, stepIndex) {
        if (!confirm('Delete this step?')) return;
        
        const goal = this.goals.find(g => g.id === goalId);
        if (!goal) return;
        
        goal.steps.splice(stepIndex, 1);
        goal.updated_at = window.DateTimeUtils.utcNowISO();
        
        try {
            const userId = window.Auth.getUserId();
            await window.db.collection('users').doc(userId).collection('goals').doc(goalId).update({
                steps: goal.steps.map(s => s.toObject ? s.toObject() : s),
                updated_at: goal.updated_at
            });
            
            this.updateLocalGoals();
            window.App.showToast('Step deleted', 'success');
            this.renderGoals();
        } catch (error) {
            console.error('Error deleting step:', error);
            window.App.showToast('Failed to delete step', 'error');
        }
    },
    
    // Update local storage
    updateLocalGoal(goal) {
        const index = this.goals.findIndex(g => g.id === goal.id);
        if (index !== -1) {
            this.goals[index] = goal;
        }
        this.updateLocalGoals();
    },
    
    updateLocalGoals() {
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.GOALS, this.goals.map(g => g.toFirestore ? g.toFirestore() : g));
        window.dispatchEvent(new CustomEvent('goals-changed', { detail: this.goals }));
    }
};

window.GoalsDetailScreen = GoalsDetailScreen;
console.log('✓ GoalsDetailScreen loaded (v1.3.1 - full CRUD)');
