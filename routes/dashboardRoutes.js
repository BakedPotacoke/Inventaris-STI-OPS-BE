import express from 'express';
import { getDashboardSummary } from '../controller/dashboardController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Endpoint untuk summary dashboard (proteksi login)
router.get('/summary', verifyToken, getDashboardSummary);

export default router;
