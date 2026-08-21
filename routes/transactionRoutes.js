import express from 'express';
import { getAllTransactions, getMyTransactions, getSummary, updateTransactionStatus } from '../controller/transactionController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/transactions/me — riwayat transaksi milik user yang sedang login
// PENTING: harus di atas /:id agar Express tidak mengira 'me' adalah sebuah ID
router.get('/me', verifyToken, getMyTransactions);

// GET /api/transactions/summary — ringkasan { total, dipinjam, selesai }
// PENTING: harus di atas /:id agar Express tidak mengira 'summary' adalah sebuah ID
router.get('/summary', verifyToken, getSummary);

// GET /api/transactions — fetch all transaction history (accessible by all authenticated users)
router.get('/', verifyToken, getAllTransactions);

// PATCH /api/transactions/:id/status — update transaction status (admin only, checked in controller)
// body: { status: 'dipinjam' | 'selesai' }
router.patch('/:id/status', verifyToken, updateTransactionStatus);

export default router;