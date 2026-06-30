const express = require('express');
const { pool } = require('../config/db');

const router = express.Router();

// GET /api/shop/products — Public product listing (no auth)
router.get('/products', async (req, res) => {
    try {
        const { search, category } = req.query;
        let query = 'SELECT id, name, price, quantity, category, image_url FROM products';
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
        console.error('[Shop] Products error:', err);
        res.status(500).json({ error: 'Failed to fetch products.' });
    }
});

// GET /api/shop/products/:id — Public single product (no auth)
router.get('/products/:id', async (req, res) => {
    try {
        const [products] = await pool.execute(
            'SELECT id, name, price, quantity, category, image_url FROM products WHERE id = ?',
            [req.params.id]
        );

        if (products.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        res.json({ product: products[0] });
    } catch (err) {
        console.error('[Shop] Product detail error:', err);
        res.status(500).json({ error: 'Failed to fetch product.' });
    }
});

// GET /api/shop/categories — Public categories list
router.get('/categories', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != "" ORDER BY category'
        );
        const categories = rows.map(r => r.category);
        res.json({ categories });
    } catch (err) {
        console.error('[Shop] Categories error:', err);
        res.status(500).json({ error: 'Failed to fetch categories.' });
    }
});

module.exports = router;
