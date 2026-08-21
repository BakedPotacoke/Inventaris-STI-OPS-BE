import Transaction from '../models/Transaction.js';
import Item from '../models/Item.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';

// GET /api/transactions/summary — ringkasan total, dipinjam, selesai (semua role)
export const getSummary = async (req, res) => {
    try {
        const { kategori, search, tanggal_mulai, tanggal_akhir } = req.query;
        const isAdmin = req.user?.role === 'admin';
        const userId = req.user?.id;

        const queryFn = (opts) => {
            if (!isAdmin && userId) {
                return Transaction.findByUserId(userId, opts);
            }
            return Transaction.findAll(opts);
        };

        // Global (unfiltered) summary untuk stat cards
        const [globalTotal, globalDipinjam, globalSelesai] = await Promise.all([
            queryFn({ page: 1, limit: 1 }),
            queryFn({ page: 1, limit: 1, status: 'dipinjam' }),
            queryFn({ page: 1, limit: 1, status: 'selesai' }),
        ]);

        // Filtered summary untuk tab filter counts
        const [filteredTotal, filteredDipinjam, filteredSelesai] = await Promise.all([
            queryFn({ page: 1, limit: 1, kategori, search, tanggal_mulai, tanggal_akhir }),
            queryFn({ page: 1, limit: 1, status: 'dipinjam', kategori, search, tanggal_mulai, tanggal_akhir }),
            queryFn({ page: 1, limit: 1, status: 'selesai', kategori, search, tanggal_mulai, tanggal_akhir }),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                total:             Number(globalTotal.total)        || 0,
                dipinjam:          Number(globalDipinjam.total)     || 0,
                selesai:           Number(globalSelesai.total)      || 0,
                filtered_total:    Number(filteredTotal.total)      || 0,
                filtered_dipinjam: Number(filteredDipinjam.total)   || 0,
                filtered_selesai:  Number(filteredSelesai.total)    || 0,
            },
        });
    } catch (error) {
        console.error('getSummary error:', error);
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil ringkasan transaksi.',
        });
    }
};

// GET /api/transactions?page=&limit=&status=&kategori=&search= — admin only
// Mengembalikan semua transaksi dengan server-side pagination + filter status/kategori/search.
export const getAllTransactions = async (req, res) => {
    try {
        const { page, limit } = parsePagination(req.query);
        const { status, kategori, search, sortBy, tanggal_mulai, tanggal_akhir } = req.query;
        const { rows, total } = await Transaction.findAll({ page, limit, status, kategori, search, sortBy, tanggal_mulai, tanggal_akhir });

        return res.status(200).json({
            success: true,
            data: rows,
            pagination: buildPaginationMeta(page, limit, total),
        });
    } catch (error) {
        console.error('getAllTransactions error:', error);
        return res.status(500).json({
            success: false,
            data: [],
            message: 'Gagal mengambil data transaksi. Silakan coba lagi.',
        });
    }
};

// GET /api/transactions/me?page=&limit= — user yang sedang login
// Riwayat transaksi milik user sendiri.
export const getMyTransactions = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit } = parsePagination(req.query);
        const { status, kategori, search, sortBy, tanggal_mulai, tanggal_akhir } = req.query;
        const { rows, total } = await Transaction.findByUserId(userId, { page, limit, status, kategori, search, sortBy, tanggal_mulai, tanggal_akhir });

        return res.status(200).json({
            success: true,
            data: rows,
            pagination: buildPaginationMeta(page, limit, total),
        });
    } catch (error) {
        console.error('getMyTransactions error:', error);
        return res.status(500).json({
            success: false,
            data: [],
            message: 'Gagal mengambil riwayat transaksi. Silakan coba lagi.',
        });
    }
};

// PATCH /api/transactions/:id/status — admin only
// Ubah status transaksi antara 'dipinjam' dan 'selesai'.
// Jika diubah ke 'selesai': barang dikembalikan ke status 'tersedia'.
// Jika diubah ke 'dipinjam': barang dikembalikan ke status 'dipinjam'.
export const updateTransactionStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const VALID_STATUSES = ['dipinjam', 'selesai'];
    if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
            message: `Status tidak valid. Nilai yang diizinkan: ${VALID_STATUSES.join(', ')}.`,
        });
    }

    try {
        const transaction = await Transaction.findById(id);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
        }
        if (transaction.status_transaksi === status) {
            return res.status(400).json({ message: 'Status transaksi sudah sama, tidak ada perubahan.' });
        }

        // Update status transaksi (waktu_kembali diisi otomatis oleh model)
        await Transaction.updateStatus(id, status);

        // Sinkronisasi status barang
        const itemStatus = status === 'selesai' ? 'tersedia' : 'dipinjam';
        await Item.updateStatus(transaction.item_id, itemStatus);

        // Ambil waktu_kembali terbaru untuk dikirim ke frontend
        const updated = await Transaction.findById(id);

        return res.status(200).json({
            success: true,
            message: `Status transaksi berhasil diubah ke "${status}".`,
            data: {
                id: Number(id),
                status,
                waktu_kembali: updated?.waktu_kembali ?? null,
            },
        });
    } catch (error) {
        console.error('updateTransactionStatus error:', error);
        return res.status(500).json({
            message: 'Terjadi kesalahan saat memperbarui status transaksi.',
        });
    }
};