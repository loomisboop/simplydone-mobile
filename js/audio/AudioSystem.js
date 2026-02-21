// SDAPWA v1.3.0 - Audio System (Web Audio API)
// Generates nature sounds, binaural beats, and notification chimes programmatically

const AudioSystem = {
    audioContext: null,
    activeNodes: [],
    isPlaying: false,
    currentSound: null,
    
    // Initialize audio context (must be called after user interaction)
    init() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Resume if suspended (iOS requirement)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        return this.audioContext;
    },
    
    // Stop all active sounds
    stopAll() {
        this.activeNodes.forEach(node => {
            try {
                if (node.stop) node.stop();
                if (node.disconnect) node.disconnect();
            } catch (e) {}
        });
        this.activeNodes = [];
        this.isPlaying = false;
        this.currentSound = null;
        
        // Also stop the 528Hz audio element if playing
        if (this.audioElement528) {
            this.audioElement528.pause();
            this.audioElement528.currentTime = 0;
        }
    },
    
    // ============================================================================
    // NATURE SOUNDS (Procedurally generated)
    // ============================================================================
    
    playRain(volume = 0.5) {
        this.init();
        this.stopAll();
        this.currentSound = 'rain';
        this.isPlaying = true;
        
        const ctx = this.audioContext;
        
        // Rain is created with filtered noise
        const createRainDrop = () => {
            if (!this.isPlaying || this.currentSound !== 'rain') return;
            
            const bufferSize = ctx.sampleRate * 0.1;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
            }
            
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 800 + Math.random() * 400;
            filter.Q.value = 1;
            
            const gain = ctx.createGain();
            gain.gain.value = volume * (0.1 + Math.random() * 0.2);
            
            source.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            
            source.start();
            this.activeNodes.push(source);
            
            setTimeout(createRainDrop, 20 + Math.random() * 50);
        };
        
        // Background rain noise
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;
        
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 1000;
        
        const noiseGain = ctx.createGain();
        noiseGain.gain.value = volume * 0.3;
        
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseSource.start();
        this.activeNodes.push(noiseSource);
        
        createRainDrop();
    },
    
    playOcean(volume = 0.5) {
        this.init();
        this.stopAll();
        this.currentSound = 'ocean';
        this.isPlaying = true;
        
        const ctx = this.audioContext;
        
        // Create continuous ocean waves
        const createWave = () => {
            if (!this.isPlaying || this.currentSound !== 'ocean') return;
            
            const duration = 4 + Math.random() * 4;
            const bufferSize = ctx.sampleRate * duration;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                const t = i / ctx.sampleRate;
                const envelope = Math.sin(Math.PI * t / duration);
                data[i] = (Math.random() * 2 - 1) * envelope;
            }
            
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 400 + Math.random() * 200;
            
            const gain = ctx.createGain();
            gain.gain.value = volume * 0.4;
            
            source.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            source.start();
            this.activeNodes.push(source);
            
            setTimeout(createWave, duration * 500);
        };
        
        createWave();
        setTimeout(createWave, 2000);
    },
    
    playForest(volume = 0.5) {
        this.init();
        this.stopAll();
        this.currentSound = 'forest';
        this.isPlaying = true;
        
        const ctx = this.audioContext;
        
        // Bird chirps
        const createBird = () => {
            if (!this.isPlaying || this.currentSound !== 'forest') return;
            
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = 2000 + Math.random() * 2000;
            
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(volume * 0.2, ctx.currentTime + 0.05);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
            this.activeNodes.push(osc);
            
            setTimeout(createBird, 1000 + Math.random() * 4000);
        };
        
        // Rustling leaves (filtered noise)
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;
        
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 2000;
        
        const noiseGain = ctx.createGain();
        noiseGain.gain.value = volume * 0.1;
        
        // LFO for rustling effect
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.5;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = volume * 0.05;
        lfo.connect(lfoGain);
        lfoGain.connect(noiseGain.gain);
        lfo.start();
        
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseSource.start();
        this.activeNodes.push(noiseSource, lfo);
        
        createBird();
    },
    
    playStream(volume = 0.5) {
        this.init();
        this.stopAll();
        this.currentSound = 'stream';
        this.isPlaying = true;
        
        const ctx = this.audioContext;
        
        // Flowing water noise
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;
        
        const filter1 = ctx.createBiquadFilter();
        filter1.type = 'bandpass';
        filter1.frequency.value = 600;
        filter1.Q.value = 0.5;
        
        const filter2 = ctx.createBiquadFilter();
        filter2.type = 'bandpass';
        filter2.frequency.value = 1200;
        filter2.Q.value = 0.5;
        
        const gain = ctx.createGain();
        gain.gain.value = volume * 0.4;
        
        // Modulation for burbling
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 2;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 200;
        lfo.connect(lfoGain);
        lfoGain.connect(filter1.frequency);
        lfo.start();
        
        noiseSource.connect(filter1);
        filter1.connect(filter2);
        filter2.connect(gain);
        gain.connect(ctx.destination);
        noiseSource.start();
        this.activeNodes.push(noiseSource, lfo);
    },
    
    playWhiteNoise(volume = 0.5) {
        this.init();
        this.stopAll();
        this.currentSound = 'whitenoise';
        this.isPlaying = true;
        
        const ctx = this.audioContext;
        
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }
        
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;
        
        const gain = ctx.createGain();
        gain.gain.value = volume * 0.3;
        
        noiseSource.connect(gain);
        gain.connect(ctx.destination);
        noiseSource.start();
        this.activeNodes.push(noiseSource);
    },
    
    // ============================================================================
    // BINAURAL BEATS (For focus and relaxation)
    // ============================================================================
    
    // Alpha waves (8-12 Hz) - Relaxation, calm focus
    playAlphaBinaural(volume = 0.4) {
        this.playBinaural(200, 10, volume); // 200Hz base, 10Hz beat (Alpha)
    },
    
    // Theta waves (4-8 Hz) - Deep relaxation, meditation
    playThetaBinaural(volume = 0.4) {
        this.playBinaural(180, 6, volume); // 180Hz base, 6Hz beat (Theta)
    },
    
    // Beta waves (12-30 Hz) - Alertness, concentration
    playBetaBinaural(volume = 0.4) {
        this.playBinaural(220, 18, volume); // 220Hz base, 18Hz beat (Beta)
    },
    
    // Generic binaural beat generator
    playBinaural(baseFreq, beatFreq, volume = 0.4) {
        this.init();
        this.stopAll();
        this.currentSound = 'binaural';
        this.isPlaying = true;
        
        const ctx = this.audioContext;
        
        // Left ear - base frequency
        const oscLeft = ctx.createOscillator();
        oscLeft.type = 'sine';
        oscLeft.frequency.value = baseFreq;
        
        // Right ear - base + beat frequency
        const oscRight = ctx.createOscillator();
        oscRight.type = 'sine';
        oscRight.frequency.value = baseFreq + beatFreq;
        
        // Create stereo panner for left
        const panLeft = ctx.createStereoPanner();
        panLeft.pan.value = -1;
        
        // Create stereo panner for right
        const panRight = ctx.createStereoPanner();
        panRight.pan.value = 1;
        
        // Gain nodes
        const gainLeft = ctx.createGain();
        gainLeft.gain.value = volume;
        
        const gainRight = ctx.createGain();
        gainRight.gain.value = volume;
        
        // Connect
        oscLeft.connect(gainLeft);
        gainLeft.connect(panLeft);
        panLeft.connect(ctx.destination);
        
        oscRight.connect(gainRight);
        gainRight.connect(panRight);
        panRight.connect(ctx.destination);
        
        oscLeft.start();
        oscRight.start();
        
        this.activeNodes.push(oscLeft, oscRight);
    },
    
    // ============================================================================
    // NOTIFICATION SOUNDS
    // ============================================================================
    
    // Play a pleasant chime for meditation end
    playMeditationEndChime(volume = 0.6) {
        this.init();
        const ctx = this.audioContext;
        
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major chord)
        
        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            const gain = ctx.createGain();
            const startTime = ctx.currentTime + (i * 0.1);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(volume, startTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 2);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 2.5);
        });
    },
    
    // Play notification sound for task alerts
    playNotificationChime(volume = 0.5) {
        this.init();
        const ctx = this.audioContext;
        
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.1);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    },
    
    // Play location arrival chime
    playLocationArrivalChime(volume = 0.6) {
        this.init();
        const ctx = this.audioContext;
        
        // Three ascending notes
        const notes = [440, 554.37, 659.25]; // A4, C#5, E5
        
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            
            const gain = ctx.createGain();
            const startTime = ctx.currentTime + (i * 0.15);
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(volume, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.5);
        });
    },
    
    // ============================================================================
    // HELPER: Play sound by name
    // ============================================================================
    
    // Play 528Hz Ethereal Ambient Binaural (from MP3 file)
    play528HzEthereal(volume = 0.5) {
        this.init();
        this.stopAll();
        this.currentSound = '528hz';
        this.isPlaying = true;
        
        // Create audio element for MP3 playback
        if (!this.audioElement528) {
            this.audioElement528 = new Audio('assets/sounds/ethereal_ambient_528hz_binaural.mp3');
            this.audioElement528.loop = true;
        }
        
        this.audioElement528.volume = volume;
        this.audioElement528.currentTime = 0;
        this.audioElement528.play().catch(e => {
            console.error('Error playing 528Hz audio:', e);
        });
        
        console.log('🎵 Playing 528Hz Ethereal Ambient Binaural');
    },
    
    play(soundName, volume = 0.5) {
        switch (soundName) {
            case 'rain':
                this.playRain(volume);
                break;
            case 'ocean':
                this.playOcean(volume);
                break;
            case 'forest':
                this.playForest(volume);
                break;
            case 'stream':
                this.playStream(volume);
                break;
            case 'whitenoise':
                this.playWhiteNoise(volume);
                break;
            case 'alpha':
                this.playAlphaBinaural(volume);
                break;
            case 'theta':
                this.playThetaBinaural(volume);
                break;
            case 'beta':
                this.playBetaBinaural(volume);
                break;
            case '528hz':
                this.play528HzEthereal(volume);
                break;
            case 'chime':
                this.playMeditationEndChime(volume);
                break;
            case 'notification':
                this.playNotificationChime(volume);
                break;
            case 'location':
                this.playLocationArrivalChime(volume);
                break;
            default:
                console.warn('Unknown sound:', soundName);
        }
    }
};

// Export
window.AudioSystem = AudioSystem;
console.log('✓ AudioSystem loaded (Web Audio API + 528Hz)');
