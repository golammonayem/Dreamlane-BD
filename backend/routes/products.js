const express = require('express');
const QRCode = require('qrcode');
const streamifier = require('streamifier');
const { pool } = require('../config/db');
const { cloudinary, isConfigured } = require('../config/cloudinary');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Upload image to Cloudinary (returns URL or placeholder)
async function uploadImage(file) {
    if (!file) return null;

    if (!isConfigured) {
        // Return a placeholder when Cloudinary is not configured
        return 'https://placehold.co/400x400/e2e8f0/64748b?text=Product';
    }

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'dreamlane-bd/products',
                transformation: [
                    { width: 500, height: 500, crop: 'limit', quality: 'auto' }
                ]
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
            }
        );
        streamifier.createReadStream(file.buffer).pipe(stream);
    });
}

// Delete image from Cloudinary
async function deleteImage(imageUrl) {
    if (!isConfigured || !imageUrl || imageUrl.includes('placehold.co')) return;

    try {
        // Extract public_id from URL
        const parts = imageUrl.split('/');
        const folderIdx = parts.indexOf('dreamlane-bd');
        if (folderIdx !== -1) {
            const publicId = parts.slice(folderIdx).join('/').replace(/\.[^.]+$/, '');
            await cloudinary.uploader.destroy(publicId);
        }
    } catch (err) {
        console.error('[Cloudinary] Delete error:', err.message);
    }
}

// Generate QR code as data URL
async function generateQRCode(productId) {
    try {
        return await QRCode.toDataURL(String(productId), {
            width: 200,
            margin: 1,
            color: {
                dark: '#1e293b',
                light: '#ffffff'
            }
        });
    } catch (err) {
        console.error('[QR] Generation error:', err);
        return null;
    }
}

// GET /api/products — List all products
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = 'SELECT * FROM products';
        const params = [];
        const conditions = [];

        if (search) {
            conditions.push('name LIKE ?');
            params.push(`%${search}%`);
        }

        if (category && category !== 'all') {
            conditions.push('category = ?');
            params.push(category);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY created_at DESC';

        const [products] = await pool.execute(query, params);
        res.json({ products });
    } catch (err) {
        console.error('[Products] List error:', err);
        res.status(500).json({ error: 'Failed to fetch products.' });
    }
});

// GET /api/products/categories — Get distinct categories
router.get('/categories', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != "" ORDER BY category'
        );
        const categories = rows.map(r => r.category);
        res.json({ categories });
    } catch (err) {
        console.error('[Products] Categories error:', err);
        res.status(500).json({ error: 'Failed to fetch categories.' });
    }
});

// GET /api/products/:id — Get single product
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const [products] = await pool.execute(
            'SELECT * FROM products WHERE id = ?',
            [req.params.id]
        );

        if (products.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        res.json({ product: products[0] });
    } catch (err) {
        console.error('[Products] Get error:', err);
        res.status(500).json({ error: 'Failed to fetch product.' });
    }
});

// POST /api/products — Create product
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { name, price, quantity, category } = req.body;

        if (!name || !price) {
            return res.status(400).json({ error: 'Name and price are required.' });
        }

        const parsedPrice = parseFloat(price);
        const parsedQuantity = parseInt(quantity) || 0;

        if (isNaN(parsedPrice) || parsedPrice < 0) {
            return res.status(400).json({ error: 'Invalid price value.' });
        }

        if (parsedQuantity < 0) {
            return res.status(400).json({ error: 'Quantity cannot be negative.' });
        }

        // Upload image
        const imageUrl = await uploadImage(req.file);

        // Insert product
        const [result] = await pool.execute(
            'INSERT INTO products (name, price, quantity, category, image_url) VALUES (?, ?, ?, ?, ?)',
            [name.trim(), parsedPrice, parsedQuantity, category ? category.trim() : null, imageUrl]
        );

        const productId = result.insertId;

        // Generate QR code with product ID
        const qrCode = await generateQRCode(productId);

        // Update product with QR code
        await pool.execute(
            'UPDATE products SET qr_code = ? WHERE id = ?',
            [qrCode, productId]
        );

        // Fetch and return the created product
        const [products] = await pool.execute('SELECT * FROM products WHERE id = ?', [productId]);

        res.status(201).json({
            message: 'Product created successfully.',
            product: products[0]
        });
    } catch (err) {
        console.error('[Products] Create error:', err);
        res.status(500).json({ error: 'Failed to create product.' });
    }
});

// PUT /api/products/:id — Update product
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, quantity, category } = req.body;

        // Check product exists
        const [existing] = await pool.execute('SELECT * FROM products WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        const updates = [];
        const params = [];

        if (name !== undefined) {
            updates.push('name = ?');
            params.push(name.trim());
        }

        if (price !== undefined) {
            const parsedPrice = parseFloat(price);
            if (isNaN(parsedPrice) || parsedPrice < 0) {
                return res.status(400).json({ error: 'Invalid price value.' });
            }
            updates.push('price = ?');
            params.push(parsedPrice);
        }

        if (quantity !== undefined) {
            const parsedQuantity = parseInt(quantity);
            if (isNaN(parsedQuantity) || parsedQuantity < 0) {
                return res.status(400).json({ error: 'Invalid quantity value.' });
            }
            updates.push('quantity = ?');
            params.push(parsedQuantity);
        }

        if (category !== undefined) {
            updates.push('category = ?');
            params.push(category.trim());
        }

        // Handle new image upload
        if (req.file) {
            // Delete old image from Cloudinary
            await deleteImage(existing[0].image_url);

            const imageUrl = await uploadImage(req.file);
            updates.push('image_url = ?');
            params.push(imageUrl);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update.' });
        }

        params.push(id);
        await pool.execute(
            `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        // Fetch updated product
        const [products] = await pool.execute('SELECT * FROM products WHERE id = ?', [id]);

        res.json({
            message: 'Product updated successfully.',
            product: products[0]
        });
    } catch (err) {
        console.error('[Products] Update error:', err);
        res.status(500).json({ error: 'Failed to update product.' });
    }
});

// DELETE /api/products/:id — Delete product
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await pool.execute('SELECT * FROM products WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        // Delete image from Cloudinary
        await deleteImage(existing[0].image_url);

        await pool.execute('DELETE FROM products WHERE id = ?', [id]);

        res.json({ message: 'Product deleted successfully.' });
    } catch (err) {
        console.error('[Products] Delete error:', err);
        res.status(500).json({ error: 'Failed to delete product.' });
    }
});

module.exports = router;
