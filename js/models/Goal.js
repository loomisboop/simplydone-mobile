// SDAPWA v1.0.0 - Goal Model (SDPC v0.84 Parity)

class GoalStep {
    constructor(data = {}) {
        this.description = data.description || '';
        this.challenge_date = data.challenge_date || window.DateTimeUtils.getTodayDateString();
        this.due_date = data.due_date || window.DateTimeUtils.getTodayDateString();
        this.completed = data.completed || false;
    }
    
    // Toggle completion
    toggleCompleted() {
        this.completed = !this.completed;
    }
    
    // Convert to plain object
    toObject() {
        return {
            description: this.description,
            challenge_date: this.challenge_date,
            due_date: this.due_date,
            completed: this.completed
        };
    }
    
    // Create from plain object
    static fromObject(data) {
        return new GoalStep(data);
    }
}

class Goal {
    constructor(data = {}) {
        this.id = data.id || this._generateId();
        this.name_one_word = data.name_one_word || '';
        this.definition = data.definition || '';
        this.threats = data.threats || '';
        this.steps = (data.steps || []).map(step => 
            step instanceof GoalStep ? step : GoalStep.fromObject(step)
        );
        this.created_at = data.created_at || window.DateTimeUtils.utcNowISO();
        this.updated_at = data.updated_at || null;
        this.archived = data.archived || false;
    }
    
    // Touch (update modification timestamp)
    touch() {
        this.updated_at = window.DateTimeUtils.utcNowISO();
    }
    
    // Add step
    addStep(description, challengeDate, dueDate) {
        const step = new GoalStep({
            description,
            challenge_date: challengeDate,
            due_date: dueDate,
            completed: false
        });
        this.steps.push(step);
        this.touch();
    }
    
    // Remove step by index
    removeStep(index) {
        if (index >= 0 && index < this.steps.length) {
            this.steps.splice(index, 1);
            this.touch();
        }
    }
    
    // Toggle step completion
    toggleStepCompletion(index) {
        if (index >= 0 && index < this.steps.length) {
            this.steps[index].toggleCompleted();
            this.touch();
        }
    }
    
    // Get progress
    getProgress() {
        return window.Algorithms.calculateGoalProgress(this);
    }
    
    // Get latest due date (from all steps)
    getLatestDueDate() {
        if (!this.steps || this.steps.length === 0) return null;
        
        const dueDates = this.steps
            .map(step => step.due_date)
            .filter(date => date)
            .sort();
        
        return dueDates.length > 0 ? dueDates[dueDates.length - 1] : null;
    }
    
    // Check if completed (all steps done)
    isCompleted() {
        if (!this.steps || this.steps.length === 0) return false;
        return this.steps.every(step => step.completed);
    }
    
    // Archive goal
    archive() {
        this.archived = true;
        this.touch();
    }
    
    // Unarchive goal
    unarchive() {
        this.archived = false;
        this.touch();
    }
    
    // Convert to Firestore format
    toFirestore() {
        return {
            id: this.id,
            name_one_word: this.name_one_word,
            definition: this.definition,
            threats: this.threats,
            steps: this.steps.map(step => step.toObject()),
            created_at: this.created_at,
            updated_at: this.updated_at,
            archived: this.archived
        };
    }
    
    // Create from Firestore data
    static fromFirestore(data) {
        return new Goal(data);
    }
    
    // Factory: Create new goal
    static newGoal(nameOneWord, definition, threats = '', steps = []) {
        return new Goal({
            name_one_word: nameOneWord,
            definition,
            threats,
            steps: steps.map(s => GoalStep.fromObject(s))
        });
    }
    
    // Private: Generate UUID
    _generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    // Validate goal
    validate() {
        return window.Validation.validateGoal(this);
    }
}

// Export
window.GoalStep = GoalStep;
window.Goal = Goal;

console.log('✓ Goal model loaded');
