const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const authMiddleware = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const [users] = await pool.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful.',
            token,
            user: { id: user.id, email: user.email }
        });
    } catch (err) {
        console.error('[Auth] Login error:', err);
        res.status(500).json({ error: 'An internal error occurred.' });
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, email, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ user: users[0] });
    } catch (err) {
        console.error('[Auth] Me error:', err);
        res.status(500).json({ error: 'An internal error occurred.' });
    }
});

// PUT /api/auth/password
router.put('/password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters.' });
        }

        const [users] = await pool.execute('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ error: 'User not found.' });

        const isMatch = await bcrypt.compare(currentPassword, users[0].password);
        if (!isMatch) return res.status(401).json({ error: 'Incorrect current password.' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

        res.json({ message: 'Password updated successfully.' });
    } catch (err) {
        console.error('[Auth] Password update error:', err);
        res.status(500).json({ error: 'Failed to update password.' });
    }
});

module.exports = router;
