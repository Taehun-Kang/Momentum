const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const videoRoutes = require('./videoRoutes');
const trendRoutes = require('./trendRoutes');
const systemRoutes = require('./systemRoutes');

// API Routes
router.use('/auth', authRoutes);
router.use('/videos', videoRoutes);
router.use('/trends', trendRoutes);

// System monitoring routes
router.use('/system', systemRoutes);

module.exports = router; 