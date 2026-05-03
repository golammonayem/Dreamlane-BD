const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase, seedAdmin } = require('./config/db');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const scanRoutes = require('./routes/scan');
const transactionRoutes = require('./routes/transactions');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/transactions', transactionRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all: serve frontend for non-API routes
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
    } else {
        res.status(404).json({ error: 'API endpoint not found.' });
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('[Server] Unhandled error:', err);

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds the 5MB limit.' });
    }

    if (err.message && err.message.includes('Invalid file type')) {
        return res.status(400).json({ error: err.message });
    }

    res.status(500).json({ error: 'An internal server error occurred.' });
});

// Start server
async function start() {
    try {
        await initDatabase();
        await seedAdmin();

        app.listen(PORT, () => {
            console.log(`[Server] Dreamlane BD running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('[Server] Failed to start:', err);
        process.exit(1);
    }
}

start();
