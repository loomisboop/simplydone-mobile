// SDAPWA v1.3.0 - Mindfulness Screen (with working audio)
const MindfulnessScreen = {
    currentTab: 'breathe',
    breathTimer: null,
    breathPattern: [4, 4, 6],
    breathPhaseIndex: 0,
    breathTimeLeft: 0,
    breathPhases: ['Inhale', 'Hold', 'Exhale'],
    meditateTimer: null,
    meditateTimeLeft: 0,
    meditateRunning: false,
    selectedSound: 'none',
    
    render(container) {
        container.innerHTML = '<div class="mindfulness-screen"><div class="mindfulness-tabs"><button class="mindfulness-tab active" data-tab="breathe">Breathe</button><button class="mindfulness-tab" data-tab="meditate">Meditate</button><button class="mindfulness-tab" data-tab="health">Health</button></div><div class="mindfulness-content"><div class="mindfulness-tab-content active" id="breathe-content"></div><div class="mindfulness-tab-content" id="meditate-content"></div><div class="mindfulness-tab-content" id="health-content"></div></div></div>';
        this.renderBreathe();
        this.renderMeditate();
        this.renderHealth();
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        document.querySelectorAll('.mindfulness-tab').forEach(btn => btn.addEventListener('click', () => this.switchTab(btn.dataset.tab)));
    },
    
    switchTab(tab) {
        this.currentTab = tab;
        this.stopBreathe();
        this.stopMeditate();
        document.querySelectorAll('.mindfulness-tab').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.mindfulness-tab-content').forEach(content => content.classList.remove('active'));
        event.target.classList.add('active');
        document.getElementById(tab + '-content').classList.add('active');
    },
    
    renderBreathe() {
        const container = document.getElementById('breathe-content');
        if (!container) return;
        
        container.innerHTML = '<div class="breathe-container"><div class="pattern-selector"><label>Pattern (Inhale-Hold-Exhale):</label><select id="breath-pattern"><option value="4-4-6">4-4-6 (Relaxing)</option><option value="4-7-8">4-7-8 (Sleep)</option><option value="5-0-7">5-0-7 (Energizing)</option><option value="6-0-8">6-0-8 (Deep)</option></select></div><div class="breath-balloon-container"><canvas id="breath-balloon" width="300" height="300"></canvas><div class="breath-status" id="breath-status">Ready</div><div class="breath-timer" id="breath-timer">--</div></div><div class="breath-controls"><button class="btn-primary" id="start-breath">Start</button><button class="btn-secondary" id="stop-breath" style="display:none;">Stop</button></div></div>';
        
        document.getElementById('start-breath')?.addEventListener('click', () => this.startBreathe());
        document.getElementById('stop-breath')?.addEventListener('click', () => this.stopBreathe());
        document.getElementById('breath-pattern')?.addEventListener('change', e => this.updatePattern(e.target.value));
        
        this.drawBalloon(0.3);
    },
    
    updatePattern(pattern) {
        this.breathPattern = pattern.split('-').map(n => parseInt(n));
    },
    
    startBreathe() {
        // Initialize audio on user interaction
        if (window.AudioSystem) window.AudioSystem.init();
        
        this.breathPhaseIndex = 0;
        this.breathTimeLeft = this.breathPattern[0];
        document.getElementById('start-breath').style.display = 'none';
        document.getElementById('stop-breath').style.display = 'block';
        this.breathTimer = setInterval(() => this.breathTick(), 1000);
        this.breathTick();
    },
    
    stopBreathe() {
        if (this.breathTimer) {
            clearInterval(this.breathTimer);
            this.breathTimer = null;
        }
        document.getElementById('start-breath').style.display = 'block';
        document.getElementById('stop-breath').style.display = 'none';
        document.getElementById('breath-status').textContent = 'Ready';
        document.getElementById('breath-timer').textContent = '--';
        this.drawBalloon(0.3);
    },
    
    breathTick() {
        const phase = this.breathPhases[this.breathPhaseIndex];
        const total = this.breathPattern[this.breathPhaseIndex];
        const progress = 1 - (this.breathTimeLeft / total);
        
        document.getElementById('breath-status').textContent = phase;
        document.getElementById('breath-timer').textContent = this.breathTimeLeft + 's';
        
        let scale;
        if (phase === 'Inhale') {
            scale = 0.3 + (progress * 0.7);
        } else if (phase === 'Hold') {
            scale = 1.0;
        } else {
            scale = 1.0 - (progress * 0.7);
        }
        this.drawBalloon(scale);
        
        this.breathTimeLeft--;
        if (this.breathTimeLeft < 0) {
            this.breathPhaseIndex = (this.breathPhaseIndex + 1) % this.breathPattern.length;
            this.breathTimeLeft = this.breathPattern[this.breathPhaseIndex];
        }
    },
    
    drawBalloon(scale) {
        const canvas = document.getElementById('breath-balloon');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const centerX = 150;
        const centerY = 150;
        const maxRadius = 120;
        const radius = maxRadius * scale;
        
        ctx.clearRect(0, 0, 300, 300);
        
        const gradient = ctx.createRadialGradient(centerX, centerY - 30, 20, centerX, centerY, radius);
        gradient.addColorStop(0, '#64B5F6');
        gradient.addColorStop(1, '#1976D2');
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = '#0D47A1';
        ctx.lineWidth = 2;
        ctx.stroke();
    },
    
    renderMeditate() {
        const container = document.getElementById('meditate-content');
        if (!container) return;
        
        // Build sound options with binaural beats
        const soundOptions = `
            <optgroup label="None">
                <option value="none">None</option>
            </optgroup>
            <optgroup label="Nature Sounds">
                <option value="rain">🌧️ Rain</option>
                <option value="ocean">🌊 Ocean Waves</option>
                <option value="forest">🌲 Forest</option>
                <option value="stream">💧 Stream</option>
                <option value="whitenoise">📻 White Noise</option>
            </optgroup>
            <optgroup label="Binaural Beats">
                <option value="alpha">🧠 Alpha (Relaxation - 10Hz)</option>
                <option value="theta">🧘 Theta (Deep Meditation - 6Hz)</option>
                <option value="beta">⚡ Beta (Focus - 18Hz)</option>
                <option value="528hz">✨ 528Hz Ethereal (Love/Healing)</option>
            </optgroup>
        `;
        
        container.innerHTML = '<div class="meditate-container"><div class="duration-selector"><label>Meditation Duration:</label><div class="duration-options"><button class="duration-btn active" data-duration="5">5 min</button><button class="duration-btn" data-duration="10">10 min</button><button class="duration-btn" data-duration="15">15 min</button><button class="duration-btn" data-duration="20">20 min</button></div></div><div class="sound-selector"><label>Background Sound:</label><select id="meditation-sound">' + soundOptions + '</select><p class="sound-hint">🎧 Binaural beats work best with headphones</p></div><div class="meditation-timer-display"><div class="meditation-time" id="meditation-time">5:00</div><div class="meditation-progress-ring"><svg width="200" height="200"><circle cx="100" cy="100" r="90" fill="none" stroke="#E0E0E0" stroke-width="8"/><circle id="meditation-progress-circle" cx="100" cy="100" r="90" fill="none" stroke="#4CAF50" stroke-width="8" stroke-dasharray="565.5" stroke-dashoffset="565.5" transform="rotate(-90 100 100)"/></svg></div></div><div class="meditation-controls"><button class="btn-primary" id="start-meditate">Start Meditation</button><button class="btn-secondary" id="stop-meditate" style="display:none;">Stop</button></div></div>';
        
        document.querySelectorAll('#meditate-content .duration-btn').forEach(btn => btn.addEventListener('click', e => {
            document.querySelectorAll('#meditate-content .duration-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const mins = parseInt(e.target.dataset.duration);
            document.getElementById('meditation-time').textContent = mins + ':00';
        }));
        
        document.getElementById('start-meditate')?.addEventListener('click', () => this.startMeditate());
        document.getElementById('stop-meditate')?.addEventListener('click', () => this.stopMeditate());
    },
    
    startMeditate() {
        // Initialize audio on user interaction (required for iOS)
        if (window.AudioSystem) window.AudioSystem.init();
        
        const duration = parseInt(document.querySelector('#meditate-content .duration-btn.active').dataset.duration);
        this.meditateTimeLeft = duration * 60;
        const totalSeconds = this.meditateTimeLeft;
        
        document.getElementById('start-meditate').style.display = 'none';
        document.getElementById('stop-meditate').style.display = 'block';
        
        // Play selected sound
        this.selectedSound = document.getElementById('meditation-sound').value;
        if (this.selectedSound && this.selectedSound !== 'none' && window.AudioSystem) {
            window.AudioSystem.play(this.selectedSound, 0.5);
        }
        
        this.meditateRunning = true;
        this.meditateTimer = setInterval(() => {
            this.meditateTimeLeft--;
            const mins = Math.floor(this.meditateTimeLeft / 60);
            const secs = this.meditateTimeLeft % 60;
            document.getElementById('meditation-time').textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
            
            const progress = 1 - (this.meditateTimeLeft / totalSeconds);
            const circumference = 565.5;
            const offset = circumference - (progress * circumference);
            document.getElementById('meditation-progress-circle').style.strokeDashoffset = offset;
            
            if (this.meditateTimeLeft <= 0) {
                this.onMeditationComplete();
            }
        }, 1000);
    },
    
    onMeditationComplete() {
        // Stop background sound
        if (window.AudioSystem) {
            window.AudioSystem.stopAll();
            // Play completion chime
            window.AudioSystem.playMeditationEndChime(0.6);
        }
        
        this.meditateRunning = false;
        if (this.meditateTimer) {
            clearInterval(this.meditateTimer);
            this.meditateTimer = null;
        }
        
        document.getElementById('start-meditate').style.display = 'block';
        document.getElementById('stop-meditate').style.display = 'none';
        
        const duration = parseInt(document.querySelector('#meditate-content .duration-btn.active').dataset.duration);
        document.getElementById('meditation-time').textContent = duration + ':00';
        document.getElementById('meditation-progress-circle').style.strokeDashoffset = '565.5';
        
        // Update mindfulness minutes
        this.addMindfulnessMinutes(duration);
        
        window.App.showToast('Meditation complete! 🧘 +' + Math.floor(duration * 1.5) + ' Being points', 'success');
    },
    
    stopMeditate() {
        if (this.meditateTimer) {
            clearInterval(this.meditateTimer);
            this.meditateTimer = null;
        }
        
        // Stop audio
        if (window.AudioSystem) {
            window.AudioSystem.stopAll();
        }
        
        document.getElementById('start-meditate').style.display = 'block';
        document.getElementById('stop-meditate').style.display = 'none';
        this.meditateRunning = false;
        
        const duration = parseInt(document.querySelector('#meditate-content .duration-btn.active').dataset.duration);
        document.getElementById('meditation-time').textContent = duration + ':00';
        document.getElementById('meditation-progress-circle').style.strokeDashoffset = '565.5';
    },
    
    async addMindfulnessMinutes(minutes) {
        const today = window.DateTimeUtils.getTodayDateString();
        const userId = window.Auth.getUserId();
        const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
        
        try {
            // Get current health data
            const doc = await window.db.collection('users').doc(userId).collection('health_data').doc(today).get();
            const currentData = doc.exists ? doc.data() : { steps_walked: 0, exercise_minutes: 0, mindfulness_minutes: 0 };
            
            // Add minutes
            const newMindfulness = (currentData.mindfulness_minutes || 0) + minutes;
            
            await window.db.collection('users').doc(userId).collection('health_data').doc(today).set({
                ...currentData,
                date: today,
                mindfulness_minutes: newMindfulness,
                last_updated: window.DateTimeUtils.utcNowISO(),
                source_device: deviceId
            }, { merge: true });
            
            // Dispatch event to update UI
            window.dispatchEvent(new CustomEvent('health-data-changed', { 
                detail: { ...currentData, mindfulness_minutes: newMindfulness }
            }));
            
        } catch (e) {
            console.error('Error updating mindfulness minutes:', e);
        }
    },
    
    renderHealth() {
        const container = document.getElementById('health-content');
        if (!container) return;
        
        this.loadTodayHealth().then(data => {
            container.innerHTML = '<div class="health-container"><h3>Today\'s Health Data</h3><div class="health-stats"><div class="health-stat"><div class="health-stat-icon">🚶</div><div class="health-stat-value" id="steps-value">' + (data.steps_walked || 0) + '</div><div class="health-stat-label">Steps</div></div><div class="health-stat"><div class="health-stat-icon">💪</div><div class="health-stat-value" id="exercise-value">' + (data.exercise_minutes || 0) + '</div><div class="health-stat-label">Exercise (min)</div></div><div class="health-stat"><div class="health-stat-icon">🧘</div><div class="health-stat-value" id="mindfulness-value">' + (data.mindfulness_minutes || 0) + '</div><div class="health-stat-label">Mindfulness (min)</div></div></div><div class="health-manual-entry"><h4>Manual Entry</h4><div class="form-group"><label>Steps:</label><input type="number" id="manual-steps" placeholder="0" min="0" value="' + (data.steps_walked || '') + '"></div><div class="form-group"><label>Exercise (minutes):</label><input type="number" id="manual-exercise" placeholder="0" min="0" value="' + (data.exercise_minutes || '') + '"></div><div class="form-group"><label>Mindfulness (minutes):</label><input type="number" id="manual-mindfulness" placeholder="0" min="0" value="' + (data.mindfulness_minutes || '') + '"></div><button class="btn-primary" onclick="MindfulnessScreen.saveHealthData()">Save Health Data</button></div><div class="health-info"><p style="color:#757575;font-size:14px;margin:16px 0;">Note: Apple Health integration is not available in web apps. Please enter your health data manually, or check your iPhone\'s Health app for accurate data.</p></div></div>';
        });
    },
    
    async loadTodayHealth() {
        const today = window.DateTimeUtils.getTodayDateString();
        const userId = window.Auth.getUserId();
        try {
            const doc = await window.db.collection('users').doc(userId).collection('health_data').doc(today).get();
            return doc.exists ? doc.data() : { steps_walked: 0, exercise_minutes: 0, mindfulness_minutes: 0 };
        } catch (e) {
            console.error('Error loading health:', e);
            return { steps_walked: 0, exercise_minutes: 0, mindfulness_minutes: 0 };
        }
    },
    
    async saveHealthData() {
        const steps = parseInt(document.getElementById('manual-steps')?.value || 0);
        const exercise = parseInt(document.getElementById('manual-exercise')?.value || 0);
        const mindfulness = parseInt(document.getElementById('manual-mindfulness')?.value || 0);
        
        const today = window.DateTimeUtils.getTodayDateString();
        const deviceId = window.Storage.get(window.CONSTANTS.STORAGE_KEYS.DEVICE_ID);
        const userId = window.Auth.getUserId();
        
        const healthData = {
            date: today,
            steps_walked: steps,
            exercise_minutes: exercise,
            mindfulness_minutes: mindfulness,
            last_updated: window.DateTimeUtils.utcNowISO(),
            source_device: deviceId
        };
        
        try {
            await window.db.collection('users').doc(userId).collection('health_data').doc(today).set(healthData, { merge: true });
            
            // Dispatch event to update dashboard
            window.dispatchEvent(new CustomEvent('health-data-changed', { detail: healthData }));
            
            window.App.showToast('Health data saved!', 'success');
            this.renderHealth();
        } catch (e) {
            console.error('Error saving health:', e);
            window.App.showToast('Failed to save health data', 'error');
        }
    }
};

window.MindfulnessScreen = MindfulnessScreen;
console.log('✓ MindfulnessScreen loaded (v1.3.0)');
