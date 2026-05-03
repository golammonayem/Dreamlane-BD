const express = require('express');
const { pool } = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// GET /api/transactions — List transactions
router.get('/', authMiddleware, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const today = req.query.today === 'true';

        let query = `
            SELECT t.*, p.name as product_name, p.image_url
            FROM transactions t
            JOIN products p ON t.product_id = p.id
        `;

        if (today) {
            query += ' WHERE DATE(t.created_at) = CURDATE()';
        }

        query += ' ORDER BY t.created_at DESC LIMIT ?';

        const [transactions] = await pool.execute(query, [String(limit)]);
        res.json({ transactions });
    } catch (err) {
        console.error('[Transactions] List error:', err);
        res.status(500).json({ error: 'Failed to fetch transactions.' });
    }
});

// GET /api/dashboard — Dashboard statistics
router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        // Total products
        const [totalProducts] = await pool.execute('SELECT COUNT(*) as count FROM products');

        // Today's sales count
        const [todaySales] = await pool.execute(
            `SELECT COUNT(*) as count FROM transactions 
             WHERE action_type = 'sell' AND DATE(created_at) = CURDATE()`
        );

        // Today's revenue
        const [todayRevenue] = await pool.execute(
            `SELECT COALESCE(SUM(p.price * t.quantity), 0) as total
             FROM transactions t
             JOIN products p ON t.product_id = p.id
             WHERE t.action_type = 'sell' AND DATE(t.created_at) = CURDATE()`
        );

        // Low stock items (quantity < 5)
        const [lowStock] = await pool.execute(
            'SELECT COUNT(*) as count FROM products WHERE quantity < 5'
        );

        // Low stock product list
        const [lowStockProducts] = await pool.execute(
            'SELECT id, name, quantity FROM products WHERE quantity < 5 ORDER BY quantity ASC LIMIT 10'
        );

        // Recent transactions
        const [recentTransactions] = await pool.execute(
            `SELECT t.*, p.name as product_name
             FROM transactions t
             JOIN products p ON t.product_id = p.id
             ORDER BY t.created_at DESC LIMIT 10`
        );

        res.json({
            totalProducts: totalProducts[0].count,
            todaySales: todaySales[0].count,
            todayRevenue: parseFloat(todayRevenue[0].total),
            lowStockCount: lowStock[0].count,
            lowStockProducts,
            recentTransactions
        });
    } catch (err) {
        console.error('[Dashboard] Error:', err);
        res.status(500).json({ error: 'Failed to load dashboard data.' });
    }
});

module.exports = router;
