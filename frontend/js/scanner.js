// QR Scanner page logic
document.addEventListener('DOMContentLoaded', function() {
    if (!requireAuth()) return;
    initSidebar();
    initScanner();
});

var html5QrCode = null;
var scannedProduct = null;

function initScanner() {
    var startBtn = document.getElementById('start-scanner');
    var stopBtn = document.getElementById('stop-scanner');
    var resultPanel = document.getElementById('scan-result');

    startBtn.addEventListener('click', startScanning);
    stopBtn.addEventListener('click', stopScanning);

    // Auto-start scanner
    startScanning();
}

async function startScanning() {
    var startBtn = document.getElementById('start-scanner');
    var stopBtn = document.getElementById('stop-scanner');
    var resultPanel = document.getElementById('scan-result');

    resultPanel.style.display = 'none';

    try {
        html5QrCode = new Html5Qrcode('qr-reader');

        await html5QrCode.start(
            { facingMode: 'environment' },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            onScanSuccess,
            function() {} // ignore scan failures
        );

        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
    } catch (err) {
        showToast('Could not access camera. Please grant camera permissions.', 'error');
        console.error('[Scanner]', err);
    }
}

async function stopScanning() {
    var startBtn = document.getElementById('start-scanner');
    var stopBtn = document.getElementById('stop-scanner');

    if (html5QrCode) {
        try {
            await html5QrCode.stop();
        } catch (e) { /* ignore */ }
        html5QrCode = null;
    }

    startBtn.style.display = 'inline-flex';
    stopBtn.style.display = 'none';
}

async function onScanSuccess(decodedText) {
    // Stop scanner temporarily
    await stopScanning();

    var productId = decodedText.trim();

    // Validate it looks like a product ID
    if (!productId || isNaN(productId)) {
        showToast('Invalid QR code scanned.', 'error');
        return;
    }

    try {
        var data = await apiFetch('/api/products/' + productId);
        if (!data) return;

        scannedProduct = data.product;
        showProductResult(scannedProduct);
    } catch (err) {
        showToast('Product not found for this QR code.', 'error');
    }
}

function showProductResult(product) {
    var resultPanel = document.getElementById('scan-result');
    var stockBadge = '';
    if (product.quantity === 0) stockBadge = '<span class="badge badge-danger">Out of Stock</span>';
    else if (product.quantity < 5) stockBadge = '<span class="badge badge-warning">' + product.quantity + ' left</span>';
    else stockBadge = '<span class="badge badge-success">In Stock (' + product.quantity + ')</span>';

    document.getElementById('result-content').innerHTML =
        '<div class="product-info">' +
            '<h3>' + escapeHtml(product.name) + '</h3>' +
            '<div class="info-row"><span class="label">Price</span><span class="value">Tk ' + parseFloat(product.price).toFixed(2) + '</span></div>' +
            '<div class="info-row"><span class="label">Category</span><span class="value">' + escapeHtml(product.category || 'N/A') + '</span></div>' +
            '<div class="info-row"><span class="label">Stock</span><span class="value">' + stockBadge + '</span></div>' +
        '</div>' +
        '<div class="scan-actions">' +
            '<button class="btn btn-danger btn-lg" onclick="performAction(\'sell\')" ' + (product.quantity <= 0 ? 'disabled' : '') + '>Sell (-1)</button>' +
            '<button class="btn btn-success btn-lg" onclick="performAction(\'add\')">Add Stock (+1)</button>' +
        '</div>' +
        '<button class="btn btn-outline" style="margin-top:12px;width:100%;" onclick="resumeScanner()">Scan Another</button>';

    resultPanel.style.display = 'block';
}

async function performAction(action) {
    if (!scannedProduct) return;

    var buttons = document.querySelectorAll('.scan-actions .btn');
    buttons.forEach(function(b) { b.disabled = true; });

    try {
        var data = await apiFetch('/api/scan', {
            method: 'POST',
            body: JSON.stringify({
                productId: scannedProduct.id,
                action: action
            })
        });

        if (data) {
            showToast(data.message, 'success');
            scannedProduct = data.product;
            showProductResult(data.product);
        }
    } catch (err) {
        showToast(err.message, 'error');
        buttons.forEach(function(b) { b.disabled = false; });
    }
}

function resumeScanner() {
    document.getElementById('scan-result').style.display = 'none';
    scannedProduct = null;
    startScanning();
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
