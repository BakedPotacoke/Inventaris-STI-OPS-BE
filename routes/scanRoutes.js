import express from 'express';
import { handleScan, confirmReturn } from '../controller/scanController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import upload, { processAndUploadImage } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Endpoint utama untuk handle Scan QR Code
router.post('/scan', verifyToken, handleScan);

// Finalisasi pengembalian setelah user mengonfirmasi kondisi barang (baik/rusak)
// upload.single('foto') → menerima file multipart dengan field name "foto"
// processAndUploadImage → upload ke Cloudinary, simpan hasilnya di req.cloudinaryResult
router.post('/scan/confirm-return', verifyToken, upload.single('foto'), processAndUploadImage, confirmReturn);

export default router;