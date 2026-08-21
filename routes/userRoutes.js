import express from 'express';
import {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    updateProfile,
    deleteUser
} from '../controller/userController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Middleware auth diterapkan ke semua route di bawah ini
router.use(verifyToken);

// Route untuk user mengedit profilnya sendiri (harus di atas /:id agar tidak tertangkap sebagai id)
router.put('/profile', updateProfile);

// Hanya admin yang bisa mengelola seluruh data pengguna
router.get('/', isAdmin, getAllUsers);
router.get('/:id', isAdmin, getUserById);
router.post('/', isAdmin, createUser);
router.put('/:id', isAdmin, updateUser);
router.delete('/:id', isAdmin, deleteUser);

export default router;