import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ===== HELPER VALIDASI =====
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validasi: field wajib diisi
        if (!email || !password) {
            return res.status(400).json({ message: "Email dan password wajib diisi." });
        }

        // Validasi: format email
        if (!isValidEmail(email)) {
            return res.status(400).json({ message: "Format email tidak valid." });
        }

        // Validasi: password minimal 8 karakter
        if (password.length < 8) {
            return res.status(400).json({ message: "Password minimal 8 karakter." });
        }

        // Cari user berdasarkan email
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ message: "Email atau password salah." });
        }

        // Bandingkan password yang di-hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Email atau password salah." });
        }

        // Buat token JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, nama_lengkap: user.nama_lengkap },
            process.env.JWT_SECRET || 'secret_key_default'
        );

        res.status(200).json({
            message: "Login berhasil",
            token,
            user: {
                id: user.id,
                nama_lengkap: user.nama_lengkap,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
};

export const register = async (req, res) => {
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

        // Cek apakah email sudah terdaftar
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: "Email sudah digunakan." });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userRole = role === 'admin' ? 'admin' : 'pegawai';

        // Simpan ke database
        await User.create({
            nama_lengkap: nama_lengkap.trim(),
            email,
            password: hashedPassword,
            role: userRole
        });

        res.status(201).json({ message: "Registrasi berhasil, silakan login." });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
};

export const me = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Token tidak valid." });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User tidak ditemukan." });
        }

        res.status(200).json({
            message: "User terverifikasi.",
            user: {
                id: user.id,
                nama_lengkap: user.nama_lengkap,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Auth me error:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
};
