// Shop page logic — public, no auth required
const SHOP_API = window.location.origin;
let selectedProduct = null;

document.addEventListener('DOMContentLoaded', function() {
    loadShopProducts();
    loadShopCategories();
    initOrderForm();
    initSearch();
});

// ===== Load Products =====
async function loadShopProducts() {
    const search = document.getElementById('shop-search').value.trim();
    const category = document.getElementById('shop-category').value;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category && category !== 'all') params.set('category', category);

    const grid = document.getElementById('shop-products');
    grid.innerHTML = '<div class="spinner"></div>';

    try {
        const response = await fetch(SHOP_API + '/api/shop/products?' + params.toString());
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Failed to load products.');

        if (data.products.length === 0) {
            grid.innerHTML = '<div class="shop-empty"><p>No products found</p></div>';
            return;
        }

        grid.innerHTML = data.products.map(function(p) {
            var inStock = p.quantity > 0;
            var stockText = '';
            var stockClass = '';
            if (p.quantity === 0) {
                stockText = 'Out of Stock';
                stockClass = 'out-of-stock';
            } else if (p.quantity < 5) {
                stockText = 'Only ' + p.quantity + ' left';
                stockClass = 'low-stock';
            } else {
                stockText = 'In Stock';
                stockClass = 'in-stock';
            }

            var imgHtml = p.image_url
                ? '<img src="' + p.image_url + '" alt="' + escapeHtml(p.name) + '" loading="lazy">'
                : '<div class="shop-no-img"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>';

            return '<div class="shop-card">' +
                '<div class="shop-card-img">' + imgHtml +
                    '<span class="stock-badge ' + stockClass + '">' + stockText + '</span>' +
                '</div>' +
                '<div class="shop-card-body">' +
                    '<div class="shop-card-category">' + escapeHtml(p.category || 'General') + '</div>' +
                    '<h3 class="shop-card-title">' + escapeHtml(p.name) + '</h3>' +
                    '<div class="shop-card-price">৳ ' + parseFloat(p.price).toFixed(2) + '</div>' +
                    '<button class="btn btn-primary shop-order-btn" ' +
                        (inStock ? 'onclick="openOrderModal(' + p.id + ')"' : 'disabled') + '>' +
                        (inStock ? 'Order Now' : 'Out of Stock') +
                    '</button>' +
                '</div>' +
            '</div>';
        }).join('');
    } catch (err) {
        grid.innerHTML = '<div class="shop-empty"><p>Failed to load products. Please try again.</p></div>';
        console.error('[Shop]', err);
    }
}

// ===== Load Categories =====
async function loadShopCategories() {
    try {
        const response = await fetch(SHOP_API + '/api/shop/categories');
        const data = await response.json();
        if (!response.ok) return;

        var select = document.getElementById('shop-category');
        data.categories.forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            select.appendChild(opt);
        });
    } catch (err) { /* ignore */ }
}

// ===== Search =====
function initSearch() {
    var searchInput = document.getElementById('shop-search');
    var categoryFilter = document.getElementById('shop-category');
    var timer;

    searchInput.addEventListener('input', function() {
        clearTimeout(timer);
        timer = setTimeout(loadShopProducts, 400);
    });

    categoryFilter.addEventListener('change', loadShopProducts);
}

// ===== Order Modal =====
async function openOrderModal(productId) {
    try {
        const response = await fetch(SHOP_API + '/api/shop/products/' + productId);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        selectedProduct = data.product;

        document.getElementById('order-product-info').innerHTML =
            '<div class="order-product-name">' + escapeHtml(selectedProduct.name) + '</div>' +
            '<div class="order-product-price">৳ ' + parseFloat(selectedProduct.price).toFixed(2) + ' each</div>' +
            '<div class="order-product-stock">' + selectedProduct.quantity + ' available</div>';

        document.getElementById('order-qty').value = 1;
        document.getElementById('order-qty').max = selectedProduct.quantity;
        updateOrderTotal();

        document.getElementById('order-form').reset();
        document.getElementById('order-qty').value = 1;
        updateOrderTotal();

        document.getElementById('order-modal').classList.add('active');
    } catch (err) {
        alert('Could not load product details. Please try again.');
        console.error('[Shop]', err);
    }
}

function updateOrderTotal() {
    if (!selectedProduct) return;
    var qty = parseInt(document.getElementById('order-qty').value) || 1;
    var total = qty * parseFloat(selectedProduct.price);
    document.getElementById('order-total').textContent = '৳ ' + total.toFixed(2);
}

function initOrderForm() {
    var modal = document.getElementById('order-modal');
    var form = document.getElementById('order-form');
    var closeBtn = document.getElementById('close-order-modal');
    var cancelBtn = document.getElementById('cancel-order');
    var qtyInput = document.getElementById('order-qty');
    var successModal = document.getElementById('success-modal');
    var closeSuccess = document.getElementById('close-success');

    closeBtn.addEventListener('click', function() { modal.classList.remove('active'); });
    cancelBtn.addEventListener('click', function() { modal.classList.remove('active'); });
    modal.addEventListener('click', function(e) { if (e.target === modal) modal.classList.remove('active'); });

    qtyInput.addEventListener('input', updateOrderTotal);

    closeSuccess.addEventListener('click', function() { successModal.classList.remove('active'); });
    successModal.addEventListener('click', function(e) { if (e.target === successModal) successModal.classList.remove('active'); });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!selectedProduct) return;

        var submitBtn = document.getElementById('submit-order');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Placing Order...';

        var orderData = {
            customer_name: document.getElementById('order-name').value.trim(),
            customer_phone: document.getElementById('order-phone').value.trim(),
            customer_address: document.getElementById('order-address').value.trim(),
            product_id: selectedProduct.id,
            quantity: parseInt(document.getElementById('order-qty').value) || 1
        };

        try {
            const response = await fetch(SHOP_API + '/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to place order.');
            }

            // Close order modal, show success
            modal.classList.remove('active');
            document.getElementById('success-message').textContent =
                'Order #' + data.order.id + ' placed successfully for ' + escapeHtml(data.order.product_name) +
                '. Total: ৳ ' + parseFloat(data.order.total_price).toFixed(2) + '. We will contact you shortly!';
            successModal.classList.add('active');

            // Refresh products to update stock
            loadShopProducts();
        } catch (err) {
            alert(err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Place Order';
        }
    });
}

// ===== Utility =====
function escapeHtml(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(function(link) {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        var target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});
