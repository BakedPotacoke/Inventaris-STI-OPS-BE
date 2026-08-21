import express from 'express';
import { resetDatabaseData } from '../controller/resetController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/reset/database — hanya admin yang bisa mereset data database.
// Menghapus semua data pada items, transactions, item_reports, dan users
// (kecuali user dengan id=4 / admin default).
router.post('/database', verifyToken, isAdmin, resetDatabaseData);

export default router;
