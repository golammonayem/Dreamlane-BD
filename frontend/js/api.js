// API base URL — change this for deployment
const API_BASE = window.location.origin;

async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('dreamlane_token');
    const headers = { ...(options.headers || {}) };

    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }

    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const config = { ...options, headers };

    try {
        const response = await fetch(API_BASE + endpoint, config);

        if (response.status === 401) {
            localStorage.removeItem('dreamlane_token');
            window.location.href = '/login.html';
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed.');
        }

        return data;
    } catch (err) {
        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
            throw new Error('Unable to connect to server. Please try again.');
        }
        throw err;
    }
}

// Check if user is authenticated
function requireAuth() {
    const token = localStorage.getItem('dreamlane_token');
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

function logout() {
    localStorage.removeItem('dreamlane_token');
    window.location.href = '/login.html';
}
// Global password modal functions
function openPasswordModal() {
    document.getElementById('password-form').reset();
    document.getElementById('password-modal').classList.add('active');
}

function closePasswordModal() {
    document.getElementById('password-modal').classList.remove('active');
}

async function handlePasswordChange(e) {
    e.preventDefault();
    var btn = document.getElementById('submit-password');
    var current = document.getElementById('current-password').value;
    var newPass = document.getElementById('new-password').value;
    btn.disabled = true;

    try {
        var data = await apiFetch('/api/auth/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword: current, newPassword: newPass })
        });
        if (data) {
            showToast(data.message, 'success');
            closePasswordModal();
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}
