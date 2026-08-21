import express from 'express';
import { getAllReports, getSummary } from '../controller/itemReportController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/reports/summary — ringkasan global laporan
// PENTING: harus di atas route /:id agar Express tidak mengira 'summary' adalah sebuah ID
router.get('/summary', verifyToken, isAdmin, getSummary);

// GET /api/reports?page=&limit=&jenis_laporan=&kategori=&search=
// Mode ekspor: ?limit=all
router.get('/', verifyToken, isAdmin, getAllReports);

export default router;