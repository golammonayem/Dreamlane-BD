// Products page logic
document.addEventListener('DOMContentLoaded', function() {
    if (!requireAuth()) return;
    initSidebar();
    loadCategories();
    loadProducts();
    initProductForm();
});

var currentEditId = null;

async function loadProducts() {
    var search = document.getElementById('search-input').value.trim();
    var category = document.getElementById('filter-category').value;
    var params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category && category !== 'all') params.set('category', category);

    var grid = document.getElementById('products-grid');
    grid.innerHTML = '<div class="spinner"></div>';

    try {
        var data = await apiFetch('/api/products?' + params.toString());
        if (!data) return;

        if (data.products.length === 0) {
            grid.innerHTML = '<div class="empty-state"><p>No products found.</p></div>';
            return;
        }

        grid.innerHTML = data.products.map(function(p) {
            var stockBadge = '';
            if (p.quantity === 0) stockBadge = '<span class="badge badge-danger">Out of Stock</span>';
            else if (p.quantity < 5) stockBadge = '<span class="badge badge-warning">' + p.quantity + ' left</span>';
            else stockBadge = '<span class="badge badge-success">In Stock</span>';

            var imgHtml = p.image_url
                ? '<img src="' + p.image_url + '" alt="' + escapeHtml(p.name) + '">'
                : '<span class="no-img">No Image</span>';

            return '<div class="product-card">' +
                '<div class="product-card-img">' + imgHtml + '</div>' +
                '<div class="product-card-body">' +
                    '<h3>' + escapeHtml(p.name) + '</h3>' +
                    '<div class="product-category">' + escapeHtml(p.category || 'Uncategorized') + '</div>' +
                    '<div class="product-meta">' +
                        '<span class="product-price">Tk ' + parseFloat(p.price).toFixed(2) + '</span>' +
                        stockBadge +
                    '</div>' +
                    '<div style="font-size:0.8rem;color:var(--text-muted);">Qty: ' + p.quantity + '</div>' +
                '</div>' +
                '<div class="product-card-actions">' +
                    '<button class="btn btn-outline btn-sm" onclick="editProduct(' + p.id + ')">Edit</button>' +
                    '<button class="btn btn-danger btn-sm" onclick="deleteProduct(' + p.id + ',\'' + escapeHtml(p.name).replace(/'/g, "\\'") + '\')">Delete</button>' +
                '</div>' +
                '</div>';
        }).join('');
    } catch (err) {
        grid.innerHTML = '<div class="empty-state"><p>Failed to load products.</p></div>';
        showToast(err.message, 'error');
    }
}

async function loadCategories() {
    try {
        var data = await apiFetch('/api/products/categories');
        if (!data) return;
        var select = document.getElementById('filter-category');
        data.categories.forEach(function(c) {
            var opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            select.appendChild(opt);
        });
    } catch (err) { /* ignore */ }
}

function initProductForm() {
    var modal = document.getElementById('product-modal');
    var form = document.getElementById('product-form');
    var addBtn = document.getElementById('add-product-btn');
    var closeBtn = modal.querySelector('.modal-close');
    var cancelBtn = document.getElementById('cancel-product');
    var imageInput = document.getElementById('product-image');
    var previewArea = document.getElementById('image-preview');
    var searchInput = document.getElementById('search-input');
    var categoryFilter = document.getElementById('filter-category');

    addBtn.addEventListener('click', function() {
        currentEditId = null;
        form.reset();
        previewArea.innerHTML = '<p>Click or drag to upload image</p>';
        modal.querySelector('.modal-header h3').textContent = 'Add Product';
        document.getElementById('submit-product').textContent = 'Add Product';
        modal.classList.add('active');
    });

    closeBtn.addEventListener('click', function() { modal.classList.remove('active'); });
    cancelBtn.addEventListener('click', function() { modal.classList.remove('active'); });
    modal.addEventListener('click', function(e) { if (e.target === modal) modal.classList.remove('active'); });

    imageInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            var reader = new FileReader();
            reader.onload = function(e) {
                previewArea.innerHTML = '<img class="preview-img" src="' + e.target.result + '" alt="Preview">';
            };
            reader.readAsDataURL(this.files[0]);
        }
    });

    searchInput.addEventListener('input', debounce(loadProducts, 400));
    categoryFilter.addEventListener('change', loadProducts);

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        var submitBtn = document.getElementById('submit-product');
        submitBtn.disabled = true;

        var formData = new FormData();
        formData.append('name', document.getElementById('product-name').value);
        formData.append('price', document.getElementById('product-price').value);
        formData.append('quantity', document.getElementById('product-quantity').value);
        formData.append('category', document.getElementById('product-category').value);

        if (imageInput.files[0]) {
            formData.append('image', imageInput.files[0]);
        }

        try {
            var url = currentEditId ? '/api/products/' + currentEditId : '/api/products';
            var method = currentEditId ? 'PUT' : 'POST';

            var data = await apiFetch(url, {
                method: method,
                body: formData,
                headers: {} // Let browser set Content-Type for FormData
            });

            if (data) {
                showToast(data.message, 'success');
                modal.classList.remove('active');
                loadProducts();
                loadCategories();
            }
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });
}

async function editProduct(id) {
    try {
        var data = await apiFetch('/api/products/' + id);
        if (!data) return;
        var p = data.product;
        currentEditId = id;

        document.getElementById('product-name').value = p.name;
        document.getElementById('product-price').value = p.price;
        document.getElementById('product-quantity').value = p.quantity;
        document.getElementById('product-category').value = p.category || '';

        var previewArea = document.getElementById('image-preview');
        if (p.image_url) {
            previewArea.innerHTML = '<img class="preview-img" src="' + p.image_url + '" alt="Preview">';
        } else {
            previewArea.innerHTML = '<p>Click or drag to upload image</p>';
        }

        var modal = document.getElementById('product-modal');
        modal.querySelector('.modal-header h3').textContent = 'Edit Product';
        document.getElementById('submit-product').textContent = 'Update Product';
        modal.classList.add('active');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteProduct(id, name) {
    if (!confirm('Are you sure you want to delete "' + name + '"? This action cannot be undone.')) return;

    try {
        var data = await apiFetch('/api/products/' + id, { method: 'DELETE' });
        if (data) {
            showToast(data.message, 'success');
            loadProducts();
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function debounce(fn, delay) {
    var timer;
    return function() {
        clearTimeout(timer);
        timer = setTimeout(fn, delay);
    };
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
