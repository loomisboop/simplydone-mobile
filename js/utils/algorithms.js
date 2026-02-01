// SDAPWA v1.0.0 - Task Selection Algorithms (SDPC v0.84 Parity)

const Algorithms = {
    // Select "Do These 3 Now" tasks (exact SDPC algorithm)
    selectDoTheseThreeNow(tasks) {
        const now = new Date();
        
        // Filter: Not completed, not deleted, not before_day_ends
        const eligible = tasks.filter(task => 
            !task.completed_at &&
            !task.deleted &&
            !task.before_day_ends
        );
        
        // 1. Get scheduled tasks that are active NOW
        const scheduledNow = eligible.filter(task => {
            if (task.type !== window.CONSTANTS.TASK_TYPES.SCHEDULED) return false;
            return this._isEligibleNow(task, now);
        });
        
        // Sort scheduled tasks: duration (shortest first), then start time
        scheduledNow.sort((a, b) => {
            const durationA = a.duration_minutes || 9999;
            const durationB = b.duration_minutes || 9999;
            
            if (durationA !== durationB) {
                return durationA - durationB;
            }
            
            // If durations equal, sort by start time
            const startA = window.DateTimeUtils.parseISO(a.start) || now;
            const startB = window.DateTimeUtils.parseISO(b.start) || now;
            return startA - startB;
        });
        
        // Take up to 3 scheduled tasks
        let top3 = scheduledNow.slice(0, 3);
        
        // 2. Fill remaining slots with rainy day tasks
        if (top3.length < 3) {
            const rainyDay = eligible.filter(task => 
                task.type === window.CONSTANTS.TASK_TYPES.RAINY_DAY
            );
            
            // Sort rainy day: duration (shortest first), then created_at
            rainyDay.sort((a, b) => {
                const durationA = a.duration_minutes || 9999;
                const durationB = b.duration_minutes || 9999;
                
                if (durationA !== durationB) {
                    return durationA - durationB;
                }
                
                // If durations equal, sort by created date (oldest first)
                const createdA = window.DateTimeUtils.parseISO(a.created_at) || now;
                const createdB = window.DateTimeUtils.parseISO(b.created_at) || now;
                return createdA - createdB;
            });
            
            const needed = 3 - top3.length;
            top3 = top3.concat(rainyDay.slice(0, needed));
        }
        
        return top3;
    },
    
    // Select "Before My Day Ends" tasks
    selectBeforeMyDayEnds(tasks) {
        return tasks.filter(task =>
            task.before_day_ends &&
            !task.completed_at &&
            !task.deleted
        );
    },
    
    // Check if task is eligible now (time window check)
    _isEligibleNow(task, now) {
        if (task.type === window.CONSTANTS.TASK_TYPES.RAINY_DAY) {
            return true; // Rainy day tasks always eligible
        }
        
        if (task.type === window.CONSTANTS.TASK_TYPES.SCHEDULED) {
            const start = window.DateTimeUtils.parseISO(task.start);
            const stop = window.DateTimeUtils.parseISO(task.stop);
            
            if (!start || !stop) return false;
            
            return now >= start && now <= stop;
        }
        
        return false;
    },
    
    // Sort tasks by various criteria
    sortTasks(tasks, sortBy) {
        const sorted = [...tasks]; // Create copy
        
        switch (sortBy) {
            case window.CONSTANTS.TASK_SORT.DATE_DESC:
                sorted.sort((a, b) => {
                    const dateA = window.DateTimeUtils.parseISO(a.created_at) || new Date(0);
                    const dateB = window.DateTimeUtils.parseISO(b.created_at) || new Date(0);
                    return dateB - dateA; // Newest first
                });
                break;
                
            case window.CONSTANTS.TASK_SORT.DATE_ASC:
                sorted.sort((a, b) => {
                    const dateA = window.DateTimeUtils.parseISO(a.created_at) || new Date(0);
                    const dateB = window.DateTimeUtils.parseISO(b.created_at) || new Date(0);
                    return dateA - dateB; // Oldest first
                });
                break;
                
            case window.CONSTANTS.TASK_SORT.PRIORITY:
                const priorityOrder = {
                    [window.CONSTANTS.PRIORITIES.URGENT]: 0,
                    [window.CONSTANTS.PRIORITIES.HIGH]: 1,
                    [window.CONSTANTS.PRIORITIES.NORMAL]: 2,
                    [window.CONSTANTS.PRIORITIES.LOW]: 3
                };
                sorted.sort((a, b) => {
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                });
                break;
                
            case window.CONSTANTS.TASK_SORT.DURATION:
                sorted.sort((a, b) => {
                    const durationA = a.duration_minutes || 9999;
                    const durationB = b.duration_minutes || 9999;
                    return durationA - durationB; // Shortest first
                });
                break;
                
            case window.CONSTANTS.TASK_SORT.NAME:
                sorted.sort((a, b) => {
                    return a.name.localeCompare(b.name);
                });
                break;
        }
        
        return sorted;
    },
    
    // Filter tasks by status
    filterTasks(tasks, filter) {
        switch (filter) {
            case window.CONSTANTS.TASK_FILTERS.ALL:
                return tasks;
                
            case window.CONSTANTS.TASK_FILTERS.ACTIVE:
                return tasks.filter(task => 
                    !task.completed_at && !task.deleted
                );
                
            case window.CONSTANTS.TASK_FILTERS.COMPLETED:
                return tasks.filter(task => 
                    task.completed_at && !task.deleted
                );
                
            case window.CONSTANTS.TASK_FILTERS.RAINY:
                return tasks.filter(task =>
                    task.type === window.CONSTANTS.TASK_TYPES.RAINY_DAY &&
                    !task.completed_at &&
                    !task.deleted
                );
                
            default:
                return tasks;
        }
    },
    
    // Search tasks by query
    searchTasks(tasks, query) {
        if (!query || query.trim().length === 0) {
            return tasks;
        }
        
        const lowerQuery = query.toLowerCase();
        
        return tasks.filter(task => {
            // Search in name
            if (task.name.toLowerCase().includes(lowerQuery)) {
                return true;
            }
            
            // Search in notes
            if (task.notes && task.notes.toLowerCase().includes(lowerQuery)) {
                return true;
            }
            
            // Search in location nickname
            if (task.location_nickname && task.location_nickname.toLowerCase().includes(lowerQuery)) {
                return true;
            }
            
            // Search in tags
            if (task.tags && task.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
                return true;
            }
            
            return false;
        });
    },
    
    // Group tasks by date (for task list display)
    groupTasksByDate(tasks) {
        const now = new Date();
        const today = window.DateTimeUtils.getStartOfDay(now);
        const yesterday = window.DateTimeUtils.addDays(today, -1);
        const tomorrow = window.DateTimeUtils.addDays(today, 1);
        const weekStart = window.DateTimeUtils.addDays(today, -7);
        
        const groups = {
            'Today': [],
            'Yesterday': [],
            'Tomorrow': [],
            'This Week': [],
            'Older': []
        };
        
        tasks.forEach(task => {
            const taskDate = window.DateTimeUtils.parseISO(task.created_at || task.start);
            if (!taskDate) {
                groups['Older'].push(task);
                return;
            }
            
            const taskDay = window.DateTimeUtils.getStartOfDay(taskDate);
            
            if (taskDay.getTime() === today.getTime()) {
                groups['Today'].push(task);
            } else if (taskDay.getTime() === yesterday.getTime()) {
                groups['Yesterday'].push(task);
            } else if (taskDay.getTime() === tomorrow.getTime()) {
                groups['Tomorrow'].push(task);
            } else if (taskDay >= weekStart) {
                groups['This Week'].push(task);
            } else {
                groups['Older'].push(task);
            }
        });
        
        // Remove empty groups
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) {
                delete groups[key];
            }
        });
        
        return groups;
    },
    
    // Calculate points for challenge completion
    calculateChallengePoints(task) {
        // NEW: Points based on completion time vs challenge time
        if (!task.completed_at || !task.start || !task.stop) {
            return 0;
        }
        
        const completedTime = window.DateTimeUtils.parseISO(task.completed_at);
        const startTime = window.DateTimeUtils.parseISO(task.start);
        const stopTime = window.DateTimeUtils.parseISO(task.stop);
        const challengeTime = new Date(startTime.getTime() + (task.duration_minutes * 60 * 1000));
        
        // Completed before challenge time = HIGHER points
        if (completedTime <= challengeTime) {
            const durationBonus = Math.floor(task.duration_minutes / 10);
            return 10 + durationBonus; // Base 10 + bonus for longer tasks
        }
        
        // Completed after challenge but before deadline = LOWER points  
        if (completedTime <= stopTime) {
            return 5;
        }
        
        // Completed after deadline = No points
        return 0;
    },
    
    // Calculate goal progress
    calculateGoalProgress(goal) {
        if (!goal.steps || goal.steps.length === 0) {
            return {
                completed: 0,
                total: 0,
                percentage: 0
            };
        }
        
        const total = goal.steps.length;
        const completed = goal.steps.filter(step => step.completed).length;
        const percentage = Math.round((completed / total) * 100);
        
        return {
            completed,
            total,
            percentage
        };
    },
    
    // Get goal abbreviation (first letter of each goal name)
    getGoalsAbbreviation(goals) {
        if (!goals || goals.length === 0) return '';
        
        return goals
            .map(goal => goal.name_one_word[0])
            .join('')
            .toUpperCase();
    },
    
    // Check if location-based task should trigger
    shouldTriggerLocationTask(task, userLat, userLon) {
        if (task.trigger_type !== window.CONSTANTS.TRIGGER_TYPES.LOCATION) {
            return false;
        }
        
        if (!task.location_lat || !task.location_lon) {
            return false;
        }
        
        if (task.completed_at || task.deleted) {
            return false;
        }
        
        const radiusMeters = task.location_radius_meters || window.CONSTANTS.GEOFENCE_SETTINGS.DEFAULT_RADIUS_METERS;
        
        return window.Geolocation.isInsideGeofence(
            userLat,
            userLon,
            task.location_lat,
            task.location_lon,
            radiusMeters
        );
    }
};

// Export
window.Algorithms = Algorithms;

console.log('✓ Algorithms loaded');
