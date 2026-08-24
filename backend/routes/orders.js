const express = require('express');
const { pool } = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// POST /api/orders — Customer places an order (no auth, public)
router.post('/', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { customer_name, customer_phone, customer_address, product_id, quantity } = req.body;

        // Validate required fields
        if (!customer_name || !customer_phone || !customer_address || !product_id) {
            return res.status(400).json({ error: 'Name, phone, address, and product are required.' });
        }

        const orderQty = parseInt(quantity) || 1;
        if (orderQty < 1) {
            return res.status(400).json({ error: 'Quantity must be at least 1.' });
        }

        // Start transaction for safe stock check
        await connection.beginTransaction();

        // Lock product row and check stock
        const [products] = await connection.execute(
            'SELECT * FROM products WHERE id = ? FOR UPDATE',
            [product_id]
        );

        if (products.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Product not found.' });
        }

        const product = products[0];

        if (product.quantity < orderQty) {
            await connection.rollback();
            return res.status(400).json({
                error: product.quantity === 0
                    ? 'This product is out of stock.'
                    : `Only ${product.quantity} items available.`
            });
        }

        const unitPrice = parseFloat(product.price);
        const totalPrice = unitPrice * orderQty;

        // Deduct stock
        await connection.execute(
            'UPDATE products SET quantity = quantity - ? WHERE id = ?',
            [orderQty, product_id]
        );

        // Record as a sell transaction
        await connection.execute(
            'INSERT INTO transactions (product_id, action_type, quantity) VALUES (?, ?, ?)',
            [product_id, 'sell', orderQty]
        );

        // Create the order
        const [result] = await connection.execute(
            `INSERT INTO orders (customer_name, customer_phone, customer_address, product_id, product_name, quantity, unit_price, total_price)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                customer_name.trim(),
                customer_phone.trim(),
                customer_address.trim(),
                product_id,
                product.name,
                orderQty,
                unitPrice,
                totalPrice
            ]
        );

        await connection.commit();

        res.status(201).json({
            message: 'Order placed successfully! We will contact you shortly.',
            order: {
                id: result.insertId,
                customer_name: customer_name.trim(),
                product_name: product.name,
                quantity: orderQty,
                total_price: totalPrice,
                status: 'pending'
            }
        });
    } catch (err) {
        await connection.rollback();
        console.error('[Orders] Create error:', err);
        res.status(500).json({ error: 'Failed to place order. Please try again.' });
    } finally {
        connection.release();
    }
});

// GET /api/orders — Admin: list all orders (auth required)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const status = req.query.status;
        let query = 'SELECT * FROM orders';
        const params = [];

        if (status && status !== 'all') {
            query += ' WHERE status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC';

        const [orders] = await pool.execute(query, params);
        res.json({ orders });
    } catch (err) {
        console.error('[Orders] List error:', err);
        res.status(500).json({ error: 'Failed to fetch orders.' });
    }
});

// GET /api/orders/stats — Admin: order statistics
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const [pending] = await pool.execute(
            "SELECT COUNT(*) as count FROM orders WHERE status = 'pending'"
        );
        const [today] = await pool.execute(
            "SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURDATE()"
        );
        const [todayRevenue] = await pool.execute(
            "SELECT COALESCE(SUM(total_price), 0) as total FROM orders WHERE DATE(created_at) = CURDATE() AND status != 'cancelled'"
        );

        res.json({
            pendingOrders: pending[0].count,
            todayOrders: today[0].count,
            todayOrderRevenue: parseFloat(todayRevenue[0].total)
        });
    } catch (err) {
        console.error('[Orders] Stats error:', err);
        res.status(500).json({ error: 'Failed to fetch order stats.' });
    }
});

// PUT /api/orders/:id/status — Admin: update order status
router.put('/:id/status', authMiddleware, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'confirmed', 'delivered', 'cancelled'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be: ' + validStatuses.join(', ') });
        }

        await connection.beginTransaction();

        const [existing] = await connection.execute(
            'SELECT * FROM orders WHERE id = ? FOR UPDATE',
            [id]
        );
        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Order not found.' });
        }

        const currentStatus = existing[0].status;
        if (currentStatus === 'cancelled' && status !== 'cancelled') {
            await connection.rollback();
            return res.status(400).json({ error: 'Cancelled orders cannot be reactivated.' });
        }

        // Cancellation returns stock and records the adjustment atomically.
        if (status === 'cancelled' && currentStatus !== 'cancelled') {
            await connection.execute(
                'UPDATE products SET quantity = quantity + ? WHERE id = ?',
                [existing[0].quantity, existing[0].product_id]
            );
            await connection.execute(
                'INSERT INTO transactions (product_id, action_type, quantity) VALUES (?, ?, ?)',
                [existing[0].product_id, 'add', existing[0].quantity]
            );
        }

        await connection.execute(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, id]
        );

        await connection.commit();

        const [updated] = await pool.execute('SELECT * FROM orders WHERE id = ?', [id]);

        res.json({
            message: `Order #${id} status updated to ${status}.`,
            order: updated[0]
        });
    } catch (err) {
        await connection.rollback();
        console.error('[Orders] Status update error:', err);
        res.status(500).json({ error: 'Failed to update order status.' });
    } finally {
        connection.release();
    }
});

module.exports = router;
