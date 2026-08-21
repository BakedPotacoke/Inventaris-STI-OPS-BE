import db from '../config/db.js';

const Transaction = {
    create: async (userId, itemId, status, conn = db) => {
        const [result] = await conn.query(
            'INSERT INTO transactions (user_id, item_id, status_transaksi) VALUES (?, ?, ?)',
            [userId, itemId, status]
        );
        return result.insertId;
    },
    findActiveByItemId: async (itemId, conn = db) => {
        const [rows] = await conn.query(
            'SELECT id, user_id, waktu_pinjam FROM transactions WHERE item_id = ? AND status_transaksi = "dipinjam" ORDER BY waktu_pinjam DESC LIMIT 1 FOR UPDATE',
            [itemId]
        );
        return rows[0];
    },
    findById: async (id, conn = db) => {
        const [rows] = await conn.query('SELECT * FROM transactions WHERE id = ?', [id]);
        return rows[0];
    },
    complete: async (id, conn = db) => {
        const [result] = await conn.query(
            'UPDATE transactions SET waktu_kembali = CURRENT_TIMESTAMP, status_transaksi = "selesai" WHERE id = ?',
            [id]
        );
        return result.affectedRows;
    },
    // Ubah status transaksi secara umum (dipinjam <-> selesai).
    // Saat diubah ke "selesai", waktu_kembali diisi otomatis.
    // Saat dikembalikan ke "dipinjam" (mis. koreksi kesalahan admin), waktu_kembali direset ke NULL.
    updateStatus: async (id, status, conn = db) => {
        const [result] = await conn.query(
            `UPDATE transactions
             SET status_transaksi = ?,
                 waktu_kembali = CASE WHEN ? = 'selesai' THEN CURRENT_TIMESTAMP ELSE NULL END
             WHERE id = ?`,
            [status, status, id]
        );
        return result.affectedRows;
    },
    getActiveLoansByUser: async (userId, conn = db) => {
        const [rows] = await conn.query(`
            SELECT 
                i.id, 
                i.nama_barang, 
                i.qr_code as kode, 
                i.kategori, 
                i.status, 
                i.gambar_url as gambar,
                t.id as transaction_id,
                t.waktu_pinjam
            FROM items i
            JOIN transactions t ON i.id = t.item_id
            WHERE t.user_id = ? AND t.status_transaksi = 'dipinjam'
            ORDER BY t.waktu_pinjam DESC
        `, [userId]);
        return rows;
    },
    getRecentLoansByUser: async (userId, limit = 5, conn = db) => {
        const [rows] = await conn.query(`
            SELECT 
                t.id as transaction_id,
                t.user_id,
                t.status_transaksi as status,
                t.waktu_kembali,
                i.id, 
                i.nama_barang, 
                i.kategori, 
                i.gambar_url as gambar
            FROM transactions t
            JOIN items i ON t.item_id = i.id
            WHERE t.user_id = ? AND t.status_transaksi = 'selesai'
            ORDER BY t.waktu_pinjam DESC
            LIMIT ?
        `, [userId, Number(limit)]);
        return rows;
    },
    // Sekarang mendukung pagination (page, limit) serta filter status, kategori, dan search.
    // Mengembalikan { rows, total } — total dipakai controller untuk membangun metadata pagination.
    findByUserId: async (userId, { page = 1, limit = 10, status, kategori, search, sortBy = 'terbaru', tanggal_mulai, tanggal_akhir } = {}, conn = db) => {
        const safeLimit = Number(limit);
        const safeOffset = (Number(page) - 1) * safeLimit;

        const conditions = ['t.user_id = ?'];
        const params = [userId];

        if (status && status !== 'semua') {
            conditions.push('t.status_transaksi = ?');
            params.push(status);
        }
        if (kategori && kategori !== 'semua') {
            conditions.push('i.kategori = ?');
            params.push(kategori);
        }
        if (search && search.trim() !== '') {
            conditions.push('(i.nama_barang LIKE ? OR i.qr_code LIKE ? OR CAST(t.id AS CHAR) LIKE ?)');
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

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        const ORDER_MAP = {
            terbaru: 't.waktu_pinjam DESC, t.id DESC',
            terlama: 't.waktu_pinjam ASC,  t.id ASC',
            az:      'i.nama_barang ASC',
            za:      'i.nama_barang DESC',
        };
        const orderBy = ORDER_MAP[sortBy] ?? ORDER_MAP.terbaru;

        const dataQuery = `
            SELECT 
                t.id,
                t.status_transaksi as status,
                t.waktu_pinjam,
                t.waktu_kembali,
                t.user_id,
                i.nama_barang,
                i.qr_code as sku,
                i.kategori,
                u.nama_lengkap as peminjam
            FROM transactions t
            JOIN items i ON t.item_id = i.id
            JOIN users u ON t.user_id = u.id
            ${whereClause}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM transactions t
            JOIN items i ON t.item_id = i.id
            JOIN users u ON t.user_id = u.id
            ${whereClause}
        `;

        const [rows] = await conn.query(dataQuery, [...params, safeLimit, safeOffset]);
        const [countRows] = await conn.query(countQuery, params);
        return { rows, total: Number(countRows[0].total) || 0 };
    },
    // Mendukung pagination (page, limit), filter status & kategori, serta pencarian teks (search).
    // Parameter search mencari di nama_barang, qr_code, atau nama peminjam.
    // Mengembalikan { rows, total } — total dipakai controller untuk membangun metadata pagination.
    findAll: async ({ page = 1, limit = 10, status, kategori, search, sortBy = 'terbaru', tanggal_mulai, tanggal_akhir } = {}, conn = db) => {
        const safeLimit = Number(limit);
        const safeOffset = (Number(page) - 1) * safeLimit;

        const conditions = [];
        const params = [];

        if (status && status !== 'semua') {
            conditions.push('t.status_transaksi = ?');
            params.push(status);
        }
        if (kategori && kategori !== 'semua') {
            conditions.push('i.kategori = ?');
            params.push(kategori);
        }
        if (search && search.trim() !== '') {
            conditions.push('(i.nama_barang LIKE ? OR i.qr_code LIKE ? OR u.nama_lengkap LIKE ? OR CAST(t.id AS CHAR) LIKE ?)');
            const term = `%${search.trim()}%`;
            params.push(term, term, term, term);
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
            terbaru: 't.waktu_pinjam DESC, t.id DESC',
            terlama: 't.waktu_pinjam ASC,  t.id ASC',
            az:      'i.nama_barang ASC',
            za:      'i.nama_barang DESC',
        };
        const orderBy = ORDER_MAP[sortBy] ?? ORDER_MAP.terbaru;

        const dataQuery = `
            SELECT 
                t.id,
                t.status_transaksi as status,
                t.waktu_pinjam,
                t.waktu_kembali,
                t.user_id,
                i.nama_barang,
                i.qr_code as sku,
                i.kategori,
                u.nama_lengkap as peminjam
            FROM transactions t
            JOIN items i ON t.item_id = i.id
            JOIN users u ON t.user_id = u.id
            ${whereClause}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM transactions t
            JOIN items i ON t.item_id = i.id
            JOIN users u ON t.user_id = u.id
            ${whereClause}
        `;

        const [rows] = await conn.query(dataQuery, [...params, safeLimit, safeOffset]);
        const [countRows] = await conn.query(countQuery, params);
        return { rows, total: Number(countRows[0].total) || 0 };
    },
    // Jumlah transaksi baru per hari, N hari terakhir — dipakai untuk area chart tren
    getTrenPeminjaman: async (days = 7, conn = db) => {
        const [rows] = await conn.query(
            `SELECT DATE(waktu_pinjam) AS tanggal, COUNT(*) AS jumlah
             FROM transactions
             WHERE waktu_pinjam >= CURDATE() - INTERVAL ? DAY
             GROUP BY DATE(waktu_pinjam)
             ORDER BY tanggal ASC`,
            [Number(days)]
        );
        return rows;
    },
    // Barang paling sering dipinjam (all-time) — dipakai untuk ranking chart
    getTopBarang: async (limit = 5, conn = db) => {
        const [rows] = await conn.query(
            `SELECT i.id, i.nama_barang, COUNT(*) AS dipinjam
             FROM transactions t
             JOIN items i ON i.id = t.item_id
             GROUP BY i.id, i.nama_barang
             ORDER BY dipinjam DESC
             LIMIT ?`,
            [Number(limit)]
        );
        return rows;
    },
    // Jumlah transaksi yang masih berstatus 'dipinjam'
    countActive: async (conn = db) => {
        const [rows] = await conn.query(
            `SELECT COUNT(*) AS jumlah FROM transactions WHERE status_transaksi = 'dipinjam'`
        );
        return rows[0].jumlah;
    },

    // Tren peminjaman berdasarkan date range eksplisit
    getTrenPeminjamanByRange: async (dateFrom, dateTo, conn = db) => {
        const [rows] = await conn.query(
            `SELECT DATE(waktu_pinjam) AS tanggal, COUNT(*) AS jumlah
             FROM transactions
             WHERE DATE(waktu_pinjam) >= ? AND DATE(waktu_pinjam) <= ?
             GROUP BY DATE(waktu_pinjam)
             ORDER BY tanggal ASC`,
            [dateFrom, dateTo]
        );
        return rows;
    },

    // Top barang berdasarkan date range eksplisit
    getTopBarangByRange: async (limit = 5, dateFrom, dateTo, conn = db) => {
        const [rows] = await conn.query(
            `SELECT i.id, i.nama_barang, COUNT(*) AS dipinjam
             FROM transactions t
             JOIN items i ON i.id = t.item_id
             WHERE DATE(t.waktu_pinjam) >= ? AND DATE(t.waktu_pinjam) <= ?
             GROUP BY i.id, i.nama_barang
             ORDER BY dipinjam DESC
             LIMIT ?`,
            [dateFrom, dateTo, Number(limit)]
        );
        return rows;
    },
};

export default Transaction;