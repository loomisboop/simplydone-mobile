// SDAPWA v1.0.0 - Main Application

const App = {
    currentScreen: null,
    currentUser: null,
    
    // Initialize application
    init() {
        console.log('🚀 Initializing SimplyDone Mobile v' + window.CONSTANTS.APP_VERSION);
        
        // Setup bottom navigation
        this.setupBottomNav();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Wait for auth to initialize
        // Auth.js will call showScreen() when ready
        
        console.log('✓ App initialized');
    },
    
    // Setup bottom navigation
    setupBottomNav() {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const screen = item.dataset.screen;
                if (screen) {
                    this.showScreen(screen);
                }
            });
        });
    },
    
    // Setup global event listeners
    setupEventListeners() {
        // Listen for data changes
        window.addEventListener('tasks-changed', (e) => {
            console.log('Tasks changed:', e.detail.length);
            this.onTasksChanged(e.detail);
        });
        
        window.addEventListener('goals-changed', (e) => {
            console.log('Goals changed:', e.detail.length);
            this.onGoalsChanged(e.detail);
        });
        
        window.addEventListener('health-data-changed', (e) => {
            console.log('Health data changed');
            this.onHealthDataChanged(e.detail);
        });
    },
    
    // Show screen
    showScreen(screenName) {
        console.log('Navigating to:', screenName);
        
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;
        
        // Clear current content
        mainContent.innerHTML = '';
        
        // Update navigation
        this.updateBottomNav(screenName);
        
        // Render screen
        switch (screenName) {
            case window.CONSTANTS.SCREENS.SIGNIN:
                if (window.SignInScreen) {
                    window.SignInScreen.render(mainContent);
                }
                break;
                
            case window.CONSTANTS.SCREENS.DASHBOARD:
                if (window.DashboardScreen) {
                    window.DashboardScreen.render(mainContent);
                }
                break;
                
            case window.CONSTANTS.SCREENS.ADD_TASK:
                if (window.AddTaskScreen) {
                    window.AddTaskScreen.render(mainContent);
                }
                break;
                
            case window.CONSTANTS.SCREENS.TASK_LIST:
                if (window.TaskListScreen) {
                    window.TaskListScreen.render(mainContent);
                }
                break;
                
            case window.CONSTANTS.SCREENS.RAINY_DAY_LIST:
                if (window.RainyDayListScreen) {
                    window.RainyDayListScreen.render(mainContent);
                }
                break;
                
            case window.CONSTANTS.SCREENS.MINDFULNESS:
                if (window.MindfulnessScreen) {
                    window.MindfulnessScreen.render(mainContent);
                }
                break;
                
            case window.CONSTANTS.SCREENS.GOALS_DETAIL:
                if (window.GoalsDetailScreen) {
                    window.GoalsDetailScreen.render(mainContent);
                }
                break;
                
            case window.CONSTANTS.SCREENS.CHALLENGE_TIMER:
                if (window.ChallengeTimerScreen) {
                    window.ChallengeTimerScreen.render(mainContent);
                }
                break;
                
            case window.CONSTANTS.SCREENS.QUICK_CHALLENGE:
                if (window.QuickChallengeScreen) {
                    window.QuickChallengeScreen.render(mainContent);
                }
                break;
                
            case window.CONSTANTS.SCREENS.SETTINGS:
                if (window.SettingsScreen) {
                    window.SettingsScreen.render(mainContent);
                }
                break;
                
            default:
                console.warn('Unknown screen:', screenName);
                mainContent.innerHTML = '<div class="empty-state"><p>Screen not found</p></div>';
        }
        
        this.currentScreen = screenName;
        
        // Save current screen
        window.Storage.set(window.CONSTANTS.STORAGE_KEYS.CURRENT_TAB, screenName);
    },
    
    // Update bottom navigation active state
    updateBottomNav(screenName) {
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            if (item.dataset.screen === screenName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },
    
    // Data change handlers
    onTasksChanged(tasks) {
        // Refresh current screen if it displays tasks
        if (this.currentScreen === window.CONSTANTS.SCREENS.DASHBOARD ||
            this.currentScreen === window.CONSTANTS.SCREENS.TASK_LIST) {
            // Screens should listen to this event and update themselves
        }
    },
    
    onGoalsChanged(goals) {
        // Refresh current screen if it displays goals
        if (this.currentScreen === window.CONSTANTS.SCREENS.DASHBOARD ||
            this.currentScreen === window.CONSTANTS.SCREENS.GOALS_DETAIL) {
            // Screens should listen to this event and update themselves
        }
    },
    
    onHealthDataChanged(healthData) {
        // Refresh current screen if it displays health data
        if (this.currentScreen === window.CONSTANTS.SCREENS.DASHBOARD ||
            this.currentScreen === window.CONSTANTS.SCREENS.MINDFULNESS) {
            // Screens should listen to this event and update themselves
        }
    },
    
    // Show toast notification
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('animate-fade-out');
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, 3000);
    },
    
    // Show loading indicator
    showLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    },
    
    // Hide loading indicator
    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}

// Export
window.App = App;

console.log('✓ App controller loaded');
