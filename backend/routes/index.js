import express from 'express';

// Import route modules
import authRoutes from './authRoutes.js';
import searchRoutes from './searchRoutes.js';
import llmRoutes from './llmRoutes.js';
import trendRoutes from './trendRoutes.js';

const router = express.Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/search', searchRoutes);
router.use('/llm', llmRoutes);
router.use('/trends', trendRoutes);

export default router; 