const express = require('express');
const { pool } = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// POST /api/scan — Scan QR code and perform action
router.post('/', authMiddleware, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { productId, action } = req.body;

        if (!productId || !action) {
            return res.status(400).json({ error: 'Product ID and action are required.' });
        }

        if (!['sell', 'add'].includes(action)) {
            return res.status(400).json({ error: 'Action must be "sell" or "add".' });
        }

        // Start transaction for safe concurrent access
        await connection.beginTransaction();

        // Lock the row for update
        const [products] = await connection.execute(
            'SELECT * FROM products WHERE id = ? FOR UPDATE',
            [productId]
        );

        if (products.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Product not found.' });
        }

        const product = products[0];
        let newQuantity;

        if (action === 'sell') {
            if (product.quantity <= 0) {
                await connection.rollback();
                return res.status(400).json({ error: 'Out of stock. Cannot sell this product.' });
            }
            newQuantity = product.quantity - 1;
        } else {
            newQuantity = product.quantity + 1;
        }

        // Update product quantity
        await connection.execute(
            'UPDATE products SET quantity = ? WHERE id = ?',
            [newQuantity, productId]
        );

        // Record transaction
        await connection.execute(
            'INSERT INTO transactions (product_id, action_type, quantity) VALUES (?, ?, ?)',
            [productId, action, 1]
        );

        await connection.commit();

        // Fetch updated product
        const [updated] = await pool.execute('SELECT * FROM products WHERE id = ?', [productId]);

        const actionLabel = action === 'sell' ? 'Sold' : 'Stock added';
        res.json({
            message: `${actionLabel} successfully. New quantity: ${newQuantity}`,
            product: updated[0]
        });
    } catch (err) {
        await connection.rollback();
        console.error('[Scan] Error:', err);
        res.status(500).json({ error: 'Failed to process scan action.' });
    } finally {
        connection.release();
    }
});

module.exports = router;
