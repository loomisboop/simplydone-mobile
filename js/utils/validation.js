// SDAPWA v1.0.0 - Validation Utilities

const Validation = {
    // Validate task name
    validateTaskName(name) {
        const errors = [];
        const { TASK_NAME_MIN, TASK_NAME_MAX } = window.CONSTANTS.VALIDATION;
        
        if (!name || name.trim().length === 0) {
            errors.push('Task name is required');
        } else if (name.trim().length < TASK_NAME_MIN) {
            errors.push(`Task name must be at least ${TASK_NAME_MIN} characters`);
        } else if (name.length > TASK_NAME_MAX) {
            errors.push(`Task name must be less than ${TASK_NAME_MAX} characters`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    },
    
    // Validate task (complete)
    validateTask(task) {
        const errors = [];
        
        // Name
        const nameValidation = this.validateTaskName(task.name);
        if (!nameValidation.valid) {
            errors.push(...nameValidation.errors);
        }
        
        // Duration
        if (task.duration_minutes < 0) {
            errors.push('Duration cannot be negative');
        }
        
        // Time-based task validation
        if (task.trigger_type === window.CONSTANTS.TRIGGER_TYPES.TIME && task.type === window.CONSTANTS.TASK_TYPES.SCHEDULED) {
            if (!task.start) {
                errors.push('Start time is required for time-based tasks');
            }
            if (!task.stop) {
                errors.push('Stop time is required for time-based tasks');
            }
            if (task.start && task.stop) {
                const start = new Date(task.start);
                const stop = new Date(task.stop);
                if (start >= stop) {
                    errors.push('Stop time must be after start time');
                }
                if (start < new Date()) {
                    errors.push('Start time cannot be in the past');
                }
            }
        }
        
        // Location-based task validation
        if (task.trigger_type === window.CONSTANTS.TRIGGER_TYPES.LOCATION) {
            if (!task.location_nickname) {
                errors.push('Location name is required');
            }
            if (!task.location_lat || !task.location_lon) {
                errors.push('Location coordinates are required');
            }
            if (task.location_radius_meters < 10) {
                errors.push('Location radius must be at least 10 meters');
            }
            if (task.location_radius_meters > 5000) {
                errors.push('Location radius must be less than 5000 meters');
            }
        }
        
        // Notes length
        if (task.notes && task.notes.length > window.CONSTANTS.VALIDATION.TASK_NOTES_MAX) {
            errors.push(`Notes must be less than ${window.CONSTANTS.VALIDATION.TASK_NOTES_MAX} characters`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    },
    
    // Validate goal name
    validateGoalName(name) {
        const errors = [];
        const { GOAL_NAME_MAX } = window.CONSTANTS.VALIDATION;
        
        if (!name || name.trim().length === 0) {
            errors.push('Goal name is required');
        } else if (name.split(' ').length > 1) {
            errors.push('Goal name must be one word');
        } else if (name.length > GOAL_NAME_MAX) {
            errors.push(`Goal name must be less than ${GOAL_NAME_MAX} characters`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    },
    
    // Validate goal
    validateGoal(goal) {
        const errors = [];
        
        // Name
        const nameValidation = this.validateGoalName(goal.name_one_word);
        if (!nameValidation.valid) {
            errors.push(...nameValidation.errors);
        }
        
        // Definition
        if (!goal.definition || goal.definition.trim().length === 0) {
            errors.push('Goal definition is required');
        } else if (goal.definition.length > window.CONSTANTS.VALIDATION.GOAL_DEFINITION_MAX) {
            errors.push(`Definition must be less than ${window.CONSTANTS.VALIDATION.GOAL_DEFINITION_MAX} characters`);
        }
        
        // Threats (optional but has max)
        if (goal.threats && goal.threats.length > window.CONSTANTS.VALIDATION.GOAL_THREATS_MAX) {
            errors.push(`Threats must be less than ${window.CONSTANTS.VALIDATION.GOAL_THREATS_MAX} characters`);
        }
        
        // Steps
        if (!goal.steps || goal.steps.length === 0) {
            errors.push('At least one step is required');
        } else {
            goal.steps.forEach((step, index) => {
                if (!step.description || step.description.trim().length === 0) {
                    errors.push(`Step ${index + 1}: Description is required`);
                }
                if (step.description && step.description.length > window.CONSTANTS.VALIDATION.GOAL_STEP_MAX) {
                    errors.push(`Step ${index + 1}: Description must be less than ${window.CONSTANTS.VALIDATION.GOAL_STEP_MAX} characters`);
                }
                if (!step.challenge_date) {
                    errors.push(`Step ${index + 1}: Challenge date is required`);
                }
                if (!step.due_date) {
                    errors.push(`Step ${index + 1}: Due date is required`);
                }
                if (step.challenge_date && step.due_date) {
                    if (step.challenge_date > step.due_date) {
                        errors.push(`Step ${index + 1}: Challenge date must be before due date`);
                    }
                }
            });
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    },
    
    // Validate health data
    validateHealthData(data) {
        const errors = [];
        const { HEALTH_STEPS_MAX, HEALTH_MINUTES_MAX } = window.CONSTANTS.VALIDATION;
        
        // Date
        if (!data.date) {
            errors.push('Date is required');
        }
        
        // Steps
        if (data.steps_walked < 0) {
            errors.push('Steps cannot be negative');
        } else if (data.steps_walked > HEALTH_STEPS_MAX) {
            errors.push(`Steps must be less than ${HEALTH_STEPS_MAX.toLocaleString()}`);
        }
        
        // Exercise minutes
        if (data.exercise_minutes < 0) {
            errors.push('Exercise minutes cannot be negative');
        } else if (data.exercise_minutes > HEALTH_MINUTES_MAX) {
            errors.push(`Exercise minutes must be less than ${HEALTH_MINUTES_MAX} (24 hours)`);
        }
        
        // Mindfulness minutes
        if (data.mindfulness_minutes < 0) {
            errors.push('Mindfulness minutes cannot be negative');
        } else if (data.mindfulness_minutes > HEALTH_MINUTES_MAX) {
            errors.push(`Mindfulness minutes must be less than ${HEALTH_MINUTES_MAX} (24 hours)`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    },
    
    // Validate email format
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
            valid: emailRegex.test(email),
            errors: emailRegex.test(email) ? [] : ['Invalid email format']
        };
    },
    
    // Validate device name
    validateDeviceName(name) {
        const errors = [];
        
        if (!name || name.trim().length === 0) {
            errors.push('Device name is required');
        } else if (name.length > 50) {
            errors.push('Device name must be less than 50 characters');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    },
    
    // Sanitize input (remove dangerous characters)
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    },
    
    // Display errors in DOM element
    displayErrors(errors, elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (errors.length === 0) {
            element.innerHTML = '';
            element.classList.add('hidden');
        } else {
            element.innerHTML = errors.map(err => 
                `<div class="form-error">${this.sanitizeInput(err)}</div>`
            ).join('');
            element.classList.remove('hidden');
        }
    },
    
    // Clear errors from DOM element
    clearErrors(elementId) {
        this.displayErrors([], elementId);
    }
};

// Export
window.Validation = Validation;

console.log('✓ Validation utils loaded');
