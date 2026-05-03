// Dashboard page logic
document.addEventListener('DOMContentLoaded', function() {
    if (!requireAuth()) return;
    initSidebar();
    loadDashboard();
});

async function loadDashboard() {
    try {
        var data = await apiFetch('/api/transactions/dashboard');
        if (!data) return;

        document.getElementById('stat-products').textContent = data.totalProducts || 0;
        document.getElementById('stat-sales').textContent = data.todaySales || 0;
        document.getElementById('stat-revenue').textContent = 'Tk ' + (data.todayRevenue || 0).toFixed(2);
        document.getElementById('stat-lowstock').textContent = data.lowStockCount || 0;

        // Render recent transactions
        var tbody = document.getElementById('recent-transactions');
        if (data.recentTransactions && data.recentTransactions.length > 0) {
            tbody.innerHTML = data.recentTransactions.map(function(t) {
                var actionClass = t.action_type === 'sell' ? 'badge-danger' : 'badge-success';
                var actionLabel = t.action_type === 'sell' ? 'Sell' : 'Add Stock';
                var date = new Date(t.created_at).toLocaleString();
                return '<tr>' +
                    '<td>' + escapeHtml(t.product_name) + '</td>' +
                    '<td><span class="badge ' + actionClass + '">' + actionLabel + '</span></td>' +
                    '<td>' + t.quantity + '</td>' +
                    '<td>' + date + '</td>' +
                    '</tr>';
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:32px;">No transactions yet.</td></tr>';
        }

        // Render low stock list
        var lowList = document.getElementById('low-stock-list');
        if (data.lowStockProducts && data.lowStockProducts.length > 0) {
            lowList.innerHTML = data.lowStockProducts.map(function(p) {
                var badgeClass = p.quantity === 0 ? 'badge-danger' : 'badge-warning';
                var label = p.quantity === 0 ? 'Out of Stock' : p.quantity + ' left';
                return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-color);">' +
                    '<span style="font-weight:500;">' + escapeHtml(p.name) + '</span>' +
                    '<span class="badge ' + badgeClass + '">' + label + '</span>' +
                    '</div>';
            }).join('');
        } else {
            lowList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">All products are well stocked.</p>';
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function escapeHtml(str) {
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
