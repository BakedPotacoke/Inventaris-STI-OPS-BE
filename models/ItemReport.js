import db from '../config/db.js';

const ItemReport = {
    // Buat entri laporan baru (rusak / hilang / baik)
    create: async ({ item_id, user_id, transaction_id = null, jenis_laporan, keterangan = null, foto_url = null, cloudinary_public_id = null }, conn = db) => {
        const [result] = await conn.query(
            'INSERT INTO item_reports (item_id, user_id, transaction_id, jenis_laporan, keterangan, foto_url, cloudinary_public_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [item_id, user_id, transaction_id, jenis_laporan, keterangan, foto_url, cloudinary_public_id]
        );
        return result.insertId;
    },

    // Riwayat laporan untuk satu barang, terbaru dulu.
    findByItemId: async (item_id, conn = db) => {
        const [rows] = await conn.query(
            `SELECT r.*, u.nama_lengkap AS pelapor
             FROM item_reports r
             LEFT JOIN users u ON r.user_id = u.id
             WHERE r.item_id = ?
             ORDER BY r.created_at DESC`,
            [item_id]
        );
        return rows;
    },

    // Semua laporan (dipakai admin untuk memantau laporan masuk & halaman Laporan Pengembalian)
    findAll: async ({ page = 1, limit = 10, all = false, jenis_laporan, kategori, search, tanggal_mulai, tanggal_akhir, sortBy = 'terbaru' } = {}, conn = db) => {
        const conditions = [];
        const params = [];

        if (jenis_laporan && jenis_laporan !== 'semua') {
            conditions.push('r.jenis_laporan = ?');
            params.push(jenis_laporan);
        }
        if (kategori && kategori.trim() !== '' && kategori !== 'semua') {
            conditions.push('i.kategori = ?');
            params.push(kategori.trim());
        }
        if (search && search.trim() !== '') {
            conditions.push('(i.nama_barang LIKE ? OR u.nama_lengkap LIKE ? OR CAST(r.id AS CHAR) LIKE ?)');
            const term = `%${search.trim()}%`;
            params.push(term, term, term);
        }
        if (tanggal_mulai && tanggal_mulai.trim() !== '') {
            conditions.push('DATE(t.waktu_pinjam) >= ?');
            params.push(tanggal_mulai.trim());
        }
        if (tanggal_akhir && tanggal_akhir.trim() !== '') {
            conditions.push('DATE(t.waktu_pinjam) <= ?');
            params.push(tanggal_akhir.trim());
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const ORDER_MAP = {
            terbaru: 'r.created_at DESC, r.id DESC',
            terlama: 'r.created_at ASC,  r.id ASC',
            az:      'i.nama_barang ASC',
            za:      'i.nama_barang DESC',
        };
        const orderBy = ORDER_MAP[sortBy] ?? ORDER_MAP.terbaru;

        const baseQuery = `
            SELECT
                r.*,
                u.nama_lengkap AS peminjam,
                i.nama_barang,
                i.qr_code,
                i.kategori,
                t.waktu_pinjam,
                t.waktu_kembali
             FROM item_reports r
             INNER JOIN items i ON r.item_id = i.id
             LEFT JOIN users u ON r.user_id = u.id
             LEFT JOIN transactions t ON r.transaction_id = t.id
             ${whereClause}
             ORDER BY ${orderBy}
        `;

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM item_reports r
            INNER JOIN items i ON r.item_id = i.id
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN transactions t ON r.transaction_id = t.id
            ${whereClause}
        `;

        const [countRows] = await conn.query(countQuery, params);
        const total = countRows[0].total;

        if (all) {
            // Tanpa LIMIT — dipakai hanya untuk ekspor CSV
            const [rows] = await conn.query(baseQuery, params);
            return { rows, total };
        }

        const safeLimit = Number(limit);
        const safeOffset = (Number(page) - 1) * safeLimit;
        const [rows] = await conn.query(baseQuery + ' LIMIT ? OFFSET ?', [...params, safeLimit, safeOffset]);

        return { rows, total };
    },

    // Jumlah laporan per jenis (baik/rusak/hilang) — dipakai untuk donut chart dashboard & tab filter counts
    getBreakdownByJenis: async ({ kategori, search, tanggal_mulai, tanggal_akhir } = {}, conn = db) => {
        const conditions = [];
        const params = [];

        if (kategori && kategori.trim() !== '' && kategori !== 'semua') {
            conditions.push('i.kategori = ?');
            params.push(kategori.trim());
        }
        if (search && search.trim() !== '') {
            conditions.push('(i.nama_barang LIKE ? OR u.nama_lengkap LIKE ?)');
            const term = `%${search.trim()}%`;
            params.push(term, term);
        }
        if (tanggal_mulai && tanggal_mulai.trim() !== '') {
            conditions.push('DATE(t.waktu_pinjam) >= ?');
            params.push(tanggal_mulai.trim());
        }
        if (tanggal_akhir && tanggal_akhir.trim() !== '') {
            conditions.push('DATE(t.waktu_pinjam) <= ?');
            params.push(tanggal_akhir.trim());
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const [rows] = await conn.query(
            `SELECT r.jenis_laporan, COUNT(*) AS jumlah
             FROM item_reports r
             INNER JOIN items i ON r.item_id = i.id
             LEFT JOIN users u ON r.user_id = u.id
             LEFT JOIN transactions t ON r.transaction_id = t.id
             ${whereClause}
             GROUP BY r.jenis_laporan`,
            params
        );
        return rows;
    },

    // Jumlah laporan dalam N hari terakhir — dipakai untuk KPI card dashboard
    countRecent: async (days = 30, conn = db) => {
        const [rows] = await conn.query(
            `SELECT COUNT(*) AS jumlah 
             FROM item_reports r
             INNER JOIN items i ON r.item_id = i.id
             WHERE r.created_at >= CURDATE() - INTERVAL ? DAY`,
            [Number(days)]
        );
        return rows[0].jumlah;
    },
};

export default ItemReport;