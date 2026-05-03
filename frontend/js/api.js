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
            window.location.href = '/index.html';
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
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

function logout() {
    localStorage.removeItem('dreamlane_token');
    window.location.href = '/index.html';
}
