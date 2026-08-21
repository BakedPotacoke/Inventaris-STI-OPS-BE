import Item from '../models/Item.js';
import Transaction from '../models/Transaction.js';
import ItemReport from '../models/ItemReport.js';
import User from '../models/User.js';

// Helper: YYYY-MM-DD string untuk hari ini / N hari lalu
const toDateStr = (d) => d.toISOString().slice(0, 10);
const defaultDateTo   = () => toDateStr(new Date());
const defaultDateFrom = () => {
    const d = new Date();
    d.setDate(d.getDate() - 29); // window 30 hari
    return toDateStr(d);
};

// Validasi format YYYY-MM-DD sederhana
const isValidDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

// GET /api/dashboard/me
export const getMyDashboardSummary = async (req, res) => {
    try {
        const userId = req.user.id;
        const [pinjaman, riwayat, inventaris] = await Promise.all([
            Transaction.getActiveLoansByUser(userId),
            Transaction.getRecentLoansByUser(userId, 5),
            Item.getInventorySummary(),
        ]);
        res.status(200).json({ pinjaman, riwayat, inventaris });
    } catch (error) {
        console.error('getMyDashboardSummary error:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengambil ringkasan dashboard.' });
    }
};

// GET /api/dashboard/summary?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
export const getDashboardSummary = async (req, res) => {
    try {
        const dateFrom = isValidDate(req.query.date_from) ? req.query.date_from : defaultDateFrom();
        const dateTo   = isValidDate(req.query.date_to)   ? req.query.date_to   : defaultDateTo();

        // Guard: from tidak boleh melampaui to
        if (dateFrom > dateTo) {
            return res.status(400).json({ message: 'date_from tidak boleh lebih besar dari date_to.' });
        }

        const [
            inventory,
            totalPengguna,
            kategoriBreakdown,
            trenPeminjaman,
            laporanBreakdown,
            topBarang,
            transaksiAktif,
            laporanTerbaru,
        ] = await Promise.all([
            Item.getInventorySummary(),                              // unfiltered
            User.count(),                                            // unfiltered
            Item.getKategoriBreakdown(),                             // unfiltered
            Transaction.getTrenPeminjamanByRange(dateFrom, dateTo),  // filtered
            ItemReport.getBreakdownByJenis({                         // filtered
                tanggal_mulai: dateFrom,
                tanggal_akhir: dateTo,
            }),
            Transaction.getTopBarangByRange(5, dateFrom, dateTo),    // filtered
            Transaction.countActive(),                               // unfiltered
            ItemReport.countRecent(30),                              // unfiltered (KPI card)
        ]);

        res.status(200).json({
            data: {
                inventory,
                totalPengguna,
                transaksiAktif,
                laporanTerbaru,
                kategoriBreakdown,
                trenPeminjaman,
                laporanBreakdown,
                topBarang,
                // Kembalikan range aktif agar client bisa sinkron state
                dateFrom,
                dateTo,
            },
        });
    } catch (error) {
        console.error('getDashboardSummary error:', error);
        res.status(500).json({ message: 'Terjadi kesalahan saat mengambil ringkasan dashboard.' });
    }
};