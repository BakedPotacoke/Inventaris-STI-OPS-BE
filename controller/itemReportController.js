import ItemReport from '../models/ItemReport.js';
import { parsePagination, buildPaginationMeta } from '../utils/pagination.js';

// GET /api/reports/summary
// Mengembalikan ringkasan global laporan:
//   total           → jumlah semua laporan
//   bulan_ini       → laporan 30 hari terakhir
//   perlu_perhatian → jumlah laporan rusak + hilang
//   breakdown       → [{ jenis_laporan, jumlah }]  untuk tab filter counts
export const getSummary = async (req, res) => {
    try {
        const { kategori, search, tanggal_mulai, tanggal_akhir } = req.query;

        const [{ total }, breakdown] = await Promise.all([
            ItemReport.findAll({ all: true }),
            ItemReport.getBreakdownByJenis({ kategori, search, tanggal_mulai, tanggal_akhir }),
        ]);

        const bulan_ini = await ItemReport.countRecent(30);

        const total_filtered = breakdown.reduce((sum, b) => sum + Number(b.jumlah), 0);

        const perlu_perhatian = breakdown
            .filter((b) => b.jenis_laporan === 'rusak' || b.jenis_laporan === 'hilang')
            .reduce((sum, b) => sum + Number(b.jumlah), 0);

        return res.status(200).json({
            success: true,
            data: {
                total:           Number(total) || 0,
                total_filtered,
                bulan_ini:       Number(bulan_ini) || 0,
                perlu_perhatian,
                breakdown,
            },
        });
    } catch (error) {
        console.error('getSummary error:', error);
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil ringkasan laporan.',
        });
    }
};

// GET /api/reports?page=&limit=
// Mengambil data laporan (item_reports) beserta info peminjam, barang, kategori,
// dan waktu pinjam/kembali dari tabel transactions — dengan pagination.
//
// Mode ekspor CSV: kirim ?limit=all untuk mendapatkan seluruh data tanpa LIMIT.
// Endpoint ini hanya bisa diakses admin (pastikan middleware isAdmin dipasang di route).
export const getAllReports = async (req, res) => {
    try {
        // Ekstrak parameter filter dari request frontend
        const { jenis_laporan, kategori, search, tanggal_mulai, tanggal_akhir, sortBy } = req.query;
        
        // Cek mode limit=all atau all=true (untuk mengakomodasi frontend)
        const isExportAll = req.query.limit === 'all' || req.query.all === 'true';

        let page, limit, rows, total;

        if (isExportAll) {
            // Teruskan parameter filter ke model untuk mode ekspor
            ({ rows, total } = await ItemReport.findAll({ 
                all: true, 
                jenis_laporan, 
                kategori, 
                search,
                tanggal_mulai,
                tanggal_akhir,
                sortBy,
            }));
            page  = 1;
            limit = total || 1; 
        } else {
            ({ page, limit } = parsePagination(req.query));
            // Teruskan parameter filter ke model untuk data berhalaman
            ({ rows, total } = await ItemReport.findAll({ 
                page, 
                limit, 
                jenis_laporan, 
                kategori, 
                search,
                tanggal_mulai,
                tanggal_akhir,
                sortBy,
            }));
        }

        return res.status(200).json({
            success: true,
            data: rows,
            pagination: buildPaginationMeta(page, limit, total),
            message: 'Data laporan berhasil diambil.',
        });
    } catch (error) {
        console.error('Error getAllReports:', error);
        return res.status(500).json({
            success: false,
            data: [],
            message: 'Gagal mengambil data laporan. Silakan coba lagi.',
        });
    }
};