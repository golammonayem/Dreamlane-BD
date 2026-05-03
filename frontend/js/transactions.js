// Transactions page logic
document.addEventListener('DOMContentLoaded', function() {
    if (!requireAuth()) return;
    initSidebar();
    loadTransactions();
});

async function loadTransactions() {
    var tbody = document.getElementById('transactions-body');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;"><div class="spinner"></div></td></tr>';

    try {
        var data = await apiFetch('/api/transactions?limit=100');
        if (!data) return;

        if (data.transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:40px;">No transactions recorded yet.</td></tr>';
            return;
        }

        tbody.innerHTML = data.transactions.map(function(t) {
            var actionClass = t.action_type === 'sell' ? 'badge-danger' : 'badge-success';
            var actionLabel = t.action_type === 'sell' ? 'Sell' : 'Add Stock';
            var date = new Date(t.created_at).toLocaleString();
            return '<tr>' +
                '<td>' + t.id + '</td>' +
                '<td>' + escapeHtml(t.product_name) + '</td>' +
                '<td><span class="badge ' + actionClass + '">' + actionLabel + '</span></td>' +
                '<td>' + t.quantity + '</td>' +
                '<td>' + date + '</td>' +
                '</tr>';
        }).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--danger);padding:40px;">Failed to load transactions.</td></tr>';
        showToast(err.message, 'error');
    }
}

function escapeHtml(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function initSidebar() {
    var hamburger = document.getElementById('hamburger');
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
    }
    if (overlay) {
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }
}
