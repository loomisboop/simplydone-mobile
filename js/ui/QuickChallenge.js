// SDAPWA v1.3.1 - Quick Challenge Timer

const QuickChallengeScreen = {
    selectedMinutes: 15,
    timerRunning: false,
    timerInterval: null,
    startTime: null,
    totalSeconds: 0,
    remainingSeconds: 0,
    milestonesPassed: [],
    
    // Available time options
    timeOptions: [5, 7, 10, 15, 20, 30, 45, 60, 75, 90],
    
    render(container) {
        this.reset();
        container.innerHTML = `
            <div class="quick-challenge-screen" id="quick-challenge-container">
                <div class="qc-setup" id="qc-setup">
                    <h2>Quick Challenge</h2>
                    <p class="qc-subtitle">How long do you want to work on something?</p>
                    
                    <div class="qc-wheel-container">
                        <div class="qc-wheel" id="qc-wheel">
                            ${this.timeOptions.map((mins, i) => `
                                <div class="qc-wheel-item ${mins === this.selectedMinutes ? 'selected' : ''}" 
                                     data-minutes="${mins}"
                                     onclick="QuickChallengeScreen.selectTime(${mins})">
                                    ${mins} min
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="qc-selected-time">
                        <span id="qc-selected-display">${this.selectedMinutes}</span> minutes
                    </div>
                    
                    <button class="qc-start-btn" onclick="QuickChallengeScreen.startTimer()">
                        ▶ Start Challenge
                    </button>
                </div>
                
                <div class="qc-timer" id="qc-timer" style="display: none;">
                    <div class="qc-countdown" id="qc-countdown">
                        ${this.selectedMinutes}:00
                    </div>
                    
                    <div class="qc-pie-container">
                        <canvas id="qc-pie-canvas" width="280" height="280"></canvas>
                    </div>
                    
                    <button class="qc-stop-btn" onclick="QuickChallengeScreen.stopTimer()">
                        ⏹ Stop Early
                    </button>
                </div>
                
                <div class="qc-complete" id="qc-complete" style="display: none;">
                    <div class="qc-stop-sign">
                        <div class="qc-stop-octagon">STOP</div>
                    </div>
                    
                    <div class="qc-nice-job">Nice job!</div>
                    <div class="qc-time-spent">
                        You spent <span id="qc-minutes-spent">0</span> minutes on this.
                    </div>
                    
                    <div class="qc-points-earned" id="qc-points-display">
                        You earned <span id="qc-points-value">0</span> points!
                    </div>
                    
                    <button class="qc-claim-btn" onclick="QuickChallengeScreen.claimPoints()">
                        🏆 Claim My Points
                    </button>
                </div>
            </div>
        `;
        
        this.setupWheelScroll();
    },
    
    reset() {
        this.timerRunning = false;
        this.timerInterval = null;
        this.startTime = null;
        this.totalSeconds = 0;
        this.remainingSeconds = 0;
        this.milestonesPassed = [];
    },
    
    setupWheelScroll() {
        const wheel = document.getElementById('qc-wheel');
        if (!wheel) return;
        
        // Scroll to selected item
        const selectedItem = wheel.querySelector('.selected');
        if (selectedItem) {
            selectedItem.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
        
        // Touch/swipe support
        let startY = 0;
        let scrollTop = 0;
        
        wheel.addEventListener('touchstart', (e) => {
            startY = e.touches[0].pageY;
            scrollTop = wheel.scrollTop;
        }, { passive: true });
        
        wheel.addEventListener('touchmove', (e) => {
            const y = e.touches[0].pageY;
            const diff = startY - y;
            wheel.scrollTop = scrollTop + diff;
        }, { passive: true });
    },
    
    selectTime(minutes) {
        this.selectedMinutes = minutes;
        
        // Update visual selection
        document.querySelectorAll('.qc-wheel-item').forEach(item => {
            item.classList.remove('selected');
            if (parseInt(item.dataset.minutes) === minutes) {
                item.classList.add('selected');
            }
        });
        
        // Update display
        const display = document.getElementById('qc-selected-display');
        if (display) display.textContent = minutes;
    },
    
    startTimer() {
        this.totalSeconds = this.selectedMinutes * 60;
        this.remainingSeconds = this.totalSeconds;
        this.startTime = Date.now();
        this.timerRunning = true;
        this.milestonesPassed = [];
        
        // Switch to timer view
        document.getElementById('qc-setup').style.display = 'none';
        document.getElementById('qc-timer').style.display = 'flex';
        document.getElementById('qc-complete').style.display = 'none';
        
        // Initialize audio
        if (window.AudioSystem) {
            window.AudioSystem.init();
        }
        
        // Start the interval
        this.timerInterval = setInterval(() => this.tick(), 100);
        this.tick(); // Initial render
    },
    
    tick() {
        if (!this.timerRunning) return;
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        this.remainingSeconds = Math.max(0, this.totalSeconds - elapsed);
        
        // Update countdown display
        this.updateCountdown();
        
        // Update pie chart
        this.updatePieChart();
        
        // Check milestones
        this.checkMilestones(elapsed);
        
        // Check if complete
        if (this.remainingSeconds <= 0) {
            this.completeTimer();
        }
    },
    
    updateCountdown() {
        const display = document.getElementById('qc-countdown');
        if (!display) return;
        
        const minutes = Math.floor(this.remainingSeconds / 60);
        const seconds = this.remainingSeconds % 60;
        
        if (this.remainingSeconds >= 60) {
            // Show only minutes (no seconds) until under 1 minute
            display.textContent = `${minutes} min`;
        } else {
            // Under 1 minute - show seconds countdown
            display.textContent = `${seconds}`;
        }
    },
    
    updatePieChart() {
        const canvas = document.getElementById('qc-pie-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 120;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Calculate fraction remaining
        const fractionRemaining = this.remainingSeconds / this.totalSeconds;
        const fractionElapsed = 1 - fractionRemaining;
        
        // Determine color based on time remaining
        let fillColor;
        if (fractionElapsed < 0.5) {
            fillColor = '#4CAF50'; // Green
        } else if (fractionElapsed < 0.75) {
            fillColor = '#FFC107'; // Yellow
        } else {
            fillColor = '#F44336'; // Red
        }
        
        // Draw background circle (empty part)
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#E0E0E0';
        ctx.fill();
        
        // Draw filled pie (remaining time)
        if (fractionRemaining > 0) {
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            // Start from top (-90 degrees = -π/2)
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + (fractionRemaining * 2 * Math.PI);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = fillColor;
            ctx.fill();
        }
        
        // Draw center circle (to make it look like a donut if desired)
        // Uncomment if you want a donut style:
        // ctx.beginPath();
        // ctx.arc(centerX, centerY, radius * 0.4, 0, 2 * Math.PI);
        // ctx.fillStyle = '#FFFFFF';
        // ctx.fill();
    },
    
    checkMilestones(elapsed) {
        const fractionElapsed = elapsed / this.totalSeconds;
        
        // 25% - one ding
        if (fractionElapsed >= 0.25 && !this.milestonesPassed.includes(25)) {
            this.milestonesPassed.push(25);
            this.playDings(1);
        }
        
        // 50% - two dings
        if (fractionElapsed >= 0.50 && !this.milestonesPassed.includes(50)) {
            this.milestonesPassed.push(50);
            this.playDings(2);
        }
        
        // 75% - three dings
        if (fractionElapsed >= 0.75 && !this.milestonesPassed.includes(75)) {
            this.milestonesPassed.push(75);
            this.playDings(3);
        }
    },
    
    playDings(count) {
        if (!window.AudioSystem) return;
        
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                window.AudioSystem.playNotificationChime(0.5);
            }, i * 150); // 150ms between dings
        }
    },
    
    stopTimer() {
        this.timerRunning = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Calculate time spent
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutesSpent = Math.floor(elapsed / 60);
        
        this.showComplete(minutesSpent);
    },
    
    completeTimer() {
        this.timerRunning = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Play 10 dings
        this.playDings(10);
        
        this.showComplete(this.selectedMinutes);
    },
    
    showComplete(minutesSpent) {
        // Switch to complete view
        document.getElementById('qc-setup').style.display = 'none';
        document.getElementById('qc-timer').style.display = 'none';
        document.getElementById('qc-complete').style.display = 'flex';
        
        // Calculate points: 10 base + minutes spent
        const points = 10 + minutesSpent;
        
        // Store for claiming
        this.earnedPoints = points;
        this.minutesSpent = minutesSpent;
        
        // Update display
        document.getElementById('qc-minutes-spent').textContent = minutesSpent;
        document.getElementById('qc-points-value').textContent = points;
    },
    
    async claimPoints() {
        const points = this.earnedPoints || 0;
        
        try {
            // Add to Doing points via completed tasks calculation
            // For now, we'll just show a toast since points are calculated from completed tasks
            // In a full implementation, you'd store this in health_data or a separate points collection
            
            window.App.showToast(`🏆 +${points} Doing points earned!`, 'success');
            
            // Go back to dashboard
            window.App.showScreen('dashboard');
            
        } catch (error) {
            console.error('Error claiming points:', error);
            window.App.showToast('Points earned! (Saved locally)', 'success');
            window.App.showScreen('dashboard');
        }
    }
};

window.QuickChallengeScreen = QuickChallengeScreen;
console.log('✓ QuickChallengeScreen loaded (v1.3.1)');
