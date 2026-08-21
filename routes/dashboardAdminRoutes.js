import express from 'express';
import { getMyDashboardSummary } from '../controller/dashboardController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/dashboard/me — ringkasan pribadi (pinjaman aktif, riwayat, ringkasan inventaris)
// Bisa diakses semua role yang login, bukan cuma admin.
router.get('/me', verifyToken, getMyDashboardSummary);

export default router;