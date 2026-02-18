// SDAPWA v1.3.2 - Sign In Screen (with Email/Password for iOS PWA)

const SignInScreen = {
    isIOSPWA() {
        return (window.navigator.standalone === true) || 
               (window.matchMedia('(display-mode: standalone)').matches && /iPhone|iPad|iPod/.test(navigator.userAgent));
    },
    
    render(container) {
        const isIOSPWA = this.isIOSPWA();
        
        container.innerHTML = `
            <div class="signin-screen">
                <div class="signin-logo">📱</div>
                
                <h1 class="signin-title">Welcome to SimplyDone</h1>
                
                <p class="signin-subtitle">
                    Your ADHD-friendly task manager that syncs with your PC
                </p>
                
                <div class="signin-features">
                    <div class="signin-feature">
                        <span class="signin-feature-icon">📱</span>
                        <span class="signin-feature-text">Sync with your PC version</span>
                    </div>
                    <div class="signin-feature">
                        <span class="signin-feature-icon">✅</span>
                        <span class="signin-feature-text">Same tasks, goals, and data</span>
                    </div>
                    <div class="signin-feature">
                        <span class="signin-feature-icon">🔒</span>
                        <span class="signin-feature-text">Secure authentication</span>
                    </div>
                </div>
                
                <!-- Email/Password Sign In (shown for iOS PWA, or as alternative) -->
                <div class="signin-email-section" id="signin-email-section">
                    <div class="signin-tabs">
                        <button class="signin-tab active" data-tab="signin">Sign In</button>
                        <button class="signin-tab" data-tab="signup">Create Account</button>
                    </div>
                    
                    <div class="signin-form" id="signin-form">
                        <input type="email" id="signin-email" class="signin-input" placeholder="Email address" autocomplete="email">
                        <input type="password" id="signin-password" class="signin-input" placeholder="Password" autocomplete="current-password">
                        <button class="signin-email-btn" id="signin-email-btn">Sign In</button>
                        <button class="signin-forgot-btn" id="signin-forgot-btn">Forgot Password?</button>
                    </div>
                    
                    <div class="signup-form" id="signup-form" style="display: none;">
                        <input type="email" id="signup-email" class="signin-input" placeholder="Email address" autocomplete="email">
                        <input type="password" id="signup-password" class="signin-input" placeholder="Password (min 6 characters)" autocomplete="new-password">
                        <input type="password" id="signup-password-confirm" class="signin-input" placeholder="Confirm password" autocomplete="new-password">
                        <button class="signin-email-btn" id="signup-email-btn">Create Account</button>
                    </div>
                </div>
                
                <div class="signin-divider">
                    <span>or</span>
                </div>
                
                <!-- Google Sign In -->
                <button class="signin-google-btn" id="signin-google-btn">
                    <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                </button>
                
                ${isIOSPWA ? `
                <p class="signin-ios-note">
                    <strong>Note:</strong> If Google sign-in doesn't work, please use Email/Password above, 
                    or sign in via Safari browser first.
                </p>
                ` : ''}
                
                <div class="signin-footer">
                    Your data stays synced across all your devices automatically
                </div>
            </div>
        `;
        
        this.setupEventListeners();
    },
    
    setupEventListeners() {
        // Tab switching
        const tabs = document.querySelectorAll('.signin-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
        
        // Google sign in
        const googleBtn = document.getElementById('signin-google-btn');
        if (googleBtn) {
            googleBtn.addEventListener('click', () => this.handleGoogleSignIn());
        }
        
        // Email sign in
        const signinBtn = document.getElementById('signin-email-btn');
        if (signinBtn) {
            signinBtn.addEventListener('click', () => this.handleEmailSignIn());
        }
        
        // Email sign up
        const signupBtn = document.getElementById('signup-email-btn');
        if (signupBtn) {
            signupBtn.addEventListener('click', () => this.handleEmailSignUp());
        }
        
        // Forgot password
        const forgotBtn = document.getElementById('signin-forgot-btn');
        if (forgotBtn) {
            forgotBtn.addEventListener('click', () => this.handleForgotPassword());
        }
        
        // Enter key support
        const signinPassword = document.getElementById('signin-password');
        if (signinPassword) {
            signinPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleEmailSignIn();
            });
        }
        
        const signupPasswordConfirm = document.getElementById('signup-password-confirm');
        if (signupPasswordConfirm) {
            signupPasswordConfirm.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleEmailSignUp();
            });
        }
    },
    
    switchTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.signin-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        
        // Show/hide forms
        const signinForm = document.getElementById('signin-form');
        const signupForm = document.getElementById('signup-form');
        
        if (tab === 'signin') {
            signinForm.style.display = 'block';
            signupForm.style.display = 'none';
        } else {
            signinForm.style.display = 'none';
            signupForm.style.display = 'block';
        }
    },
    
    async handleGoogleSignIn() {
        const btn = document.getElementById('signin-google-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Signing in...';
        }
        
        try {
            await window.Auth.signInWithGoogle();
        } catch (error) {
            console.error('Google sign-in error:', error);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `
                    <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                `;
            }
        }
    },
    
    async handleEmailSignIn() {
        const email = document.getElementById('signin-email').value.trim();
        const password = document.getElementById('signin-password').value;
        
        if (!email || !password) {
            window.App.showToast('Please enter email and password', 'error');
            return;
        }
        
        const btn = document.getElementById('signin-email-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Signing in...';
        }
        
        try {
            await window.Auth.signInWithEmail(email, password);
        } catch (error) {
            console.error('Email sign-in error:', error);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Sign In';
            }
        }
    },
    
    async handleEmailSignUp() {
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const passwordConfirm = document.getElementById('signup-password-confirm').value;
        
        if (!email || !password) {
            window.App.showToast('Please enter email and password', 'error');
            return;
        }
        
        if (password !== passwordConfirm) {
            window.App.showToast('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 6) {
            window.App.showToast('Password must be at least 6 characters', 'error');
            return;
        }
        
        const btn = document.getElementById('signup-email-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Creating account...';
        }
        
        try {
            await window.Auth.signUpWithEmail(email, password);
        } catch (error) {
            console.error('Email sign-up error:', error);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Create Account';
            }
        }
    },
    
    async handleForgotPassword() {
        const email = document.getElementById('signin-email').value.trim();
        
        if (!email) {
            window.App.showToast('Please enter your email address first', 'error');
            return;
        }
        
        try {
            await window.Auth.sendPasswordReset(email);
        } catch (error) {
            console.error('Password reset error:', error);
        }
    }
};

window.SignInScreen = SignInScreen;
console.log('✓ SignInScreen loaded (v1.3.2 - Email/Password support)');
