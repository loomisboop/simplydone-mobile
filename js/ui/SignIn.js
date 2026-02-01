// SDAPWA v1.0.0 - Sign In Screen

const SignInScreen = {
    render(container) {
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
                        <span class="signin-feature-text">Secure with Google</span>
                    </div>
                </div>
                
                <button class="signin-google-btn" id="signin-google-btn">
                    Sign in with Google
                </button>
                
                <div class="signin-footer">
                    Your data stays synced across all your devices automatically
                </div>
            </div>
        `;
        
        // Add event listener
        const btn = document.getElementById('signin-google-btn');
        if (btn) {
            btn.addEventListener('click', () => this.handleSignIn());
        }
    },
    
    async handleSignIn() {
        try {
            await window.Auth.signInWithGoogle();
        } catch (error) {
            console.error('Sign-in error:', error);
        }
    }
};

window.SignInScreen = SignInScreen;
console.log('✓ SignInScreen loaded');
