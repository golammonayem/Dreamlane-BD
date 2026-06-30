// Orders page logic (admin)
document.addEventListener('DOMContentLoaded', function() {
    if (!requireAuth()) return;
    initSidebar();
    loadOrderStats();
    loadOrders();

    document.getElementById('order-status-filter').addEventListener('change', loadOrders);
});

async function loadOrderStats() {
    try {
        var data = await apiFetch('/api/orders/stats');
        if (!data) return;

        document.getElementById('stat-pending').textContent = data.pendingOrders || 0;
        document.getElementById('stat-today-orders').textContent = data.todayOrders || 0;
        document.getElementById('stat-order-revenue').textContent = 'Tk ' + (data.todayOrderRevenue || 0).toFixed(2);
    } catch (err) {
        console.error('[Orders] Stats error:', err);
    }
}

async function loadOrders() {
    var tbody = document.getElementById('orders-body');
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;"><div class="spinner"></div></td></tr>';

    var status = document.getElementById('order-status-filter').value;
    var params = status && status !== 'all' ? '?status=' + status : '';

    try {
        var data = await apiFetch('/api/orders' + params);
        if (!data) return;

        if (data.orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:40px;">No orders found.</td></tr>';
            return;
        }

        tbody.innerHTML = data.orders.map(function(o) {
            var statusBadge = getStatusBadge(o.status);
            var date = new Date(o.created_at).toLocaleString();
            var actions = getStatusActions(o);

            return '<tr>' +
                '<td>#' + o.id + '</td>' +
                '<td>' + escapeHtml(o.customer_name) + '</td>' +
                '<td><a href="tel:' + o.customer_phone + '">' + escapeHtml(o.customer_phone) + '</a></td>' +
                '<td>' + escapeHtml(o.product_name) + '</td>' +
                '<td>' + o.quantity + '</td>' +
                '<td>Tk ' + parseFloat(o.total_price).toFixed(2) + '</td>' +
                '<td>' + statusBadge + '</td>' +
                '<td>' + date + '</td>' +
                '<td>' + actions + '</td>' +
                '</tr>';
        }).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--danger);padding:40px;">Failed to load orders.</td></tr>';
        showToast(err.message, 'error');
    }
}

function getStatusBadge(status) {
    var map = {
        'pending': '<span class="badge badge-warning">Pending</span>',
        'confirmed': '<span class="badge badge-primary">Confirmed</span>',
        'delivered': '<span class="badge badge-success">Delivered</span>',
        'cancelled': '<span class="badge badge-danger">Cancelled</span>'
    };
    return map[status] || '<span class="badge">' + status + '</span>';
}

function getStatusActions(order) {
    if (order.status === 'delivered' || order.status === 'cancelled') {
        return '<span style="color:var(--text-muted);font-size:0.8rem;">—</span>';
    }

    var buttons = '';

    if (order.status === 'pending') {
        buttons += '<button class="btn btn-primary btn-sm" onclick="updateOrderStatus(' + order.id + ',\'confirmed\')">Confirm</button> ';
    }

    if (order.status === 'confirmed') {
        buttons += '<button class="btn btn-success btn-sm" onclick="updateOrderStatus(' + order.id + ',\'delivered\')">Delivered</button> ';
    }

    if (order.status !== 'cancelled') {
        buttons += '<button class="btn btn-danger btn-sm" onclick="updateOrderStatus(' + order.id + ',\'cancelled\')">Cancel</button>';
    }

    return '<div style="display:flex;gap:4px;flex-wrap:wrap;">' + buttons + '</div>';
}

async function updateOrderStatus(orderId, newStatus) {
    if (newStatus === 'cancelled') {
        if (!confirm('Are you sure you want to cancel order #' + orderId + '? Stock will be restored.')) return;
    }

    try {
        var data = await apiFetch('/api/orders/' + orderId + '/status', {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });

        if (data) {
            showToast(data.message, 'success');
            loadOrders();
            loadOrderStats();
        }
    } catch (err) {
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
