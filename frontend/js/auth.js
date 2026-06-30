// Login page logic
document.addEventListener('DOMContentLoaded', function() {
    // If already logged in and on login page, redirect to dashboard
    if (localStorage.getItem('dreamlane_token') && window.location.pathname.includes('login')) {
        window.location.href = '/dashboard.html';
        return;
    }

    var form = document.getElementById('login-form');
    var emailInput = document.getElementById('login-email');
    var passwordInput = document.getElementById('login-password');
    var errorEl = document.getElementById('login-error');
    var submitBtn = document.getElementById('login-btn');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        errorEl.textContent = '';

        var email = emailInput.value.trim();
        var password = passwordInput.value;

        if (!email || !password) {
            errorEl.textContent = 'Please enter both email and password.';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';

        try {
            var data = await apiFetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email: email, password: password })
            });

            if (data && data.token) {
                localStorage.setItem('dreamlane_token', data.token);
                window.location.href = '/dashboard.html';
            }
        } catch (err) {
            errorEl.textContent = err.message;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    });
});
