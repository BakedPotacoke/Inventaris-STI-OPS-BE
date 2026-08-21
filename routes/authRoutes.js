import express from 'express';
import { login, register, me } from '../controller/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Endpoint untuk registrasi
router.post('/register', register);

// Endpoint untuk login
router.post('/login', login);

// Endpoint untuk memeriksa token dan mengembalikan data user
router.get('/me', verifyToken, me);

export default router;
