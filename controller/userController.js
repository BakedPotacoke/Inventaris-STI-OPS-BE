import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js'; // 1. Import helper

// ===== HELPER VALIDASI =====
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const VALID_ROLES = ['admin', 'pegawai'];
const isValidRole = (role) => VALID_ROLES.includes(role);

// Menghapus field password sebelum data dikirim ke frontend
const stripPassword = (user) => {
    if (!user) return user;
    const { password, ...userData } = user;
    return userData;
};

export const getAllUsers = async (req, res) => {
    try {
        // 2. Gunakan parsePagination untuk parsing query
        const { page, limit } = parsePagination(req.query);
        const { role, search, sortBy } = req.query;

        const { rows, total } = await User.findAll({ page, limit, role, search, sortBy });

        // 3. Gunakan buildPaginationMeta dan format response standar
        return res.status(200).json({
            success: true,
            message: "Berhasil mengambil data pengguna.",
            data: rows.map(stripPassword),
            pagination: buildPaginationMeta(page, limit, total)
        });
    } catch (error) {
        console.error("Get all users error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Terjadi kesalahan pada server." 
        });
    }
};

export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ message: "Pengguna tidak ditemukan." });
        }

        res.status(200).json({
            message: "Berhasil mengambil data pengguna.",
            data: stripPassword(user)
        });
    } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
};

export const createUser = async (req, res) => {
    try {
        const { nama_lengkap, email, password, role } = req.body;

        // Validasi: field wajib diisi
        if (!nama_lengkap || !email || !password) {
            return res.status(400).json({ message: "Nama lengkap, email, dan password wajib diisi." });
        }

        // Validasi: nama minimal 2 karakter
        if (nama_lengkap.trim().length < 2) {
            return res.status(400).json({ message: "Nama lengkap minimal 2 karakter." });
        }

        // Validasi: format email
        if (!isValidEmail(email)) {
            return res.status(400).json({ message: "Format email tidak valid." });
        }

        // Validasi: password minimal 8 karakter
        if (password.length < 8) {
            return res.status(400).json({ message: "Password minimal 8 karakter." });
        }

        // Validasi: role hanya boleh admin atau pegawai
        if (role !== undefined && !isValidRole(role)) {
            return res.status(400).json({ message: "Role hanya boleh 'admin' atau 'pegawai'." });
        }

        // Validasi: email wajib unik
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: "Email sudah digunakan." });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userRole = role === 'admin' ? 'admin' : 'pegawai';

        // Simpan ke database
        const userId = await User.create({
            nama_lengkap: nama_lengkap.trim(),
            email,
            password: hashedPassword,
            role: userRole
        });

        res.status(201).json({
            message: "Pengguna berhasil ditambahkan.",
            data: { id: userId, nama_lengkap: nama_lengkap.trim(), email, role: userRole }
        });
    } catch (error) {
        console.error("Create user error:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama_lengkap, email, role, password } = req.body;

        const existingUser = await User.findById(id);
        if (!existingUser) {
            return res.status(404).json({ message: "Pengguna tidak ditemukan." });
        }

        // Validasi: nama minimal 2 karakter (jika dikirim)
        if (nama_lengkap !== undefined && nama_lengkap.trim().length < 2) {
            return res.status(400).json({ message: "Nama lengkap minimal 2 karakter." });
        }

        // Validasi: format email (jika dikirim)
        if (email !== undefined && !isValidEmail(email)) {
            return res.status(400).json({ message: "Format email tidak valid." });
        }

        // Validasi: email wajib unik (kecualikan diri sendiri)
        if (email && email !== existingUser.email) {
            const emailTaken = await User.findByEmail(email);
            if (emailTaken && String(emailTaken.id) !== String(existingUser.id)) {
                return res.status(400).json({ message: "Email sudah digunakan." });
            }
        }

        // Validasi: role hanya boleh admin atau pegawai (jika dikirim)
        if (role !== undefined && !isValidRole(role)) {
            return res.status(400).json({ message: "Role hanya boleh 'admin' atau 'pegawai'." });
        }

        // Validasi & hashing password (opsional saat update)
        let hashedPassword;
        if (password) {
            if (password.length < 8) {
                return res.status(400).json({ message: "Password minimal 8 karakter." });
            }
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(password, salt);
        }

        const affectedRows = await User.update(id, {
            nama_lengkap: nama_lengkap !== undefined ? nama_lengkap.trim() : existingUser.nama_lengkap,
            email: email || existingUser.email,
            role: role || existingUser.role,
            ...(hashedPassword ? { password: hashedPassword } : {})
        });

        if (affectedRows === 0) {
            return res.status(400).json({ message: "Gagal memperbarui data pengguna." });
        }

        const updatedUser = await User.findById(id);

        res.status(200).json({
            message: "Data pengguna berhasil diperbarui.",
            data: stripPassword(updatedUser)
        });
    } catch (error) {
        console.error("Update user error:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Tidak terautentikasi." });
        }

        const { nama_lengkap, email, password } = req.body;

        const existingUser = await User.findById(userId);
        if (!existingUser) {
            return res.status(404).json({ message: "Pengguna tidak ditemukan." });
        }

        // Validasi: nama minimal 2 karakter (jika dikirim)
        if (nama_lengkap !== undefined && nama_lengkap.trim().length < 2) {
            return res.status(400).json({ message: "Nama lengkap minimal 2 karakter." });
        }

        // Validasi: format email (jika dikirim)
        if (email !== undefined && !isValidEmail(email)) {
            return res.status(400).json({ message: "Format email tidak valid." });
        }

        // Validasi: email wajib unik
        if (email && email !== existingUser.email) {
            const emailTaken = await User.findByEmail(email);
            if (emailTaken && String(emailTaken.id) !== String(existingUser.id)) {
                return res.status(400).json({ message: "Email sudah digunakan." });
            }
        }

        let hashedPassword;
        if (password) {
            if (password.length < 8) {
                return res.status(400).json({ message: "Password minimal 8 karakter." });
            }
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(password, salt);
        }

        const affectedRows = await User.updateProfile(userId, {
            nama_lengkap: nama_lengkap !== undefined ? nama_lengkap.trim() : existingUser.nama_lengkap,
            email: email || existingUser.email,
            password: hashedPassword
        });

        if (affectedRows === 0) {
            return res.status(400).json({ message: "Gagal memperbarui profil." });
        }

        const updatedUser = await User.findById(userId);

        res.status(200).json({
            message: "Profil berhasil diperbarui.",
            data: stripPassword(updatedUser)
        });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Aturan bisnis: admin tidak bisa menghapus akun dirinya sendiri
        if (req.user?.id !== undefined && String(req.user.id) === String(id)) {
            return res.status(400).json({ message: "Anda tidak dapat menghapus akun Anda sendiri." });
        }

        const existingUser = await User.findById(id);
        if (!existingUser) {
            return res.status(404).json({ message: "Pengguna tidak ditemukan." });
        }

        const affectedRows = await User.delete(id);
        if (affectedRows === 0) {
            return res.status(400).json({ message: "Gagal menghapus pengguna." });
        }

        res.status(200).json({ message: "Pengguna berhasil dihapus." });
    } catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
};