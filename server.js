import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Catatan: gambar sekarang disimpan di Cloudinary, tidak lagi di folder /uploads lokal.

// Import Routes (Perhatikan perubahan nama file di sini)
import scanRouter from './routes/scanRoutes.js';
import authRouter from './routes/authRoutes.js';
import userRouter from './routes/userRoutes.js';
import itemRouter from './routes/itemRoutes.js';
import dashboardRouter from './routes/dashboardRoutes.js';
import transactionRouter from './routes/transactionRoutes.js';
import dashboardAdminRoutes from './routes/dashboardAdminRoutes.js';
import dashboardUserRoutes from './routes/dashboardRoutes.js';
import itemReportRoutes from './routes/itemReportRoutes.js';

// Daftarkan URL Endpoint
app.use('/api/dashboard', dashboardAdminRoutes); // GET /api/dashboard/summary (admin only)
app.use('/api/dashboard', dashboardUserRoutes);  // GET /api/dashboard/me (semua user login)
app.use('/api', scanRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/items', itemRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/reports', itemReportRoutes);

// Rute Uji Coba Dasar
app.get('/', (req, res) => {
  res.json({ message: "Server Backend FastQR Aktif!" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: err.message || 'Terjadi kesalahan pada server.' });
});

app.listen(PORT, () => {
  console.log(`Server berjalan http://localhost:${PORT}`);
});