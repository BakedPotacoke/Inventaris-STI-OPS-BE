import db from '../config/db.js';

const Item = {
    findByQrCode: async (qr_code, conn = db) => {
        const [rows] = await conn.query('SELECT * FROM items WHERE qr_code = ? FOR UPDATE', [qr_code]);
        return rows[0];
    },
    findById: async (id, conn = db) => {
        const [rows] = await conn.query('SELECT * FROM items WHERE id = ?', [id]);
        return rows[0];
    },
    updateStatus: async (id, status, conn = db) => {
        const [result] = await conn.query('UPDATE items SET status = ? WHERE id = ?', [status, id]);
        return result.affectedRows;
    },
    // Mendukung pagination (page, limit), filter status & kategori, serta pencarian teks (search).
    // Parameter search mencari di nama_barang atau qr_code.
    // Mengembalikan { rows, total } — total dipakai controller untuk membangun metadata pagination.
    findAll: async ({ status, kategori, search, sortBy = 'terbaru', page = 1, limit = 10 } = {}, conn = db) => {
        const validStatuses = ['tersedia', 'dipinjam', 'rusak', 'hilang'];
        const useStatusFilter = status && validStatuses.includes(status);
        const useKategoriFilter = kategori && kategori.trim() !== '';
        const useSearchFilter = search && search.trim() !== '';

        const conditions = [];
        const params = [];

        if (useStatusFilter) {
            conditions.push('i.status = ?');
            params.push(status);
        }
        if (useKategoriFilter) {
            conditions.push('i.kategori = ?');
            params.push(kategori.trim());
        }
        if (useSearchFilter) {
            conditions.push('(i.nama_barang LIKE ? OR i.qr_code LIKE ?)');
            const term = `%${search.trim()}%`;
            params.push(term, term);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const safeLimit = Number(limit);
        const safeOffset = (Number(page) - 1) * safeLimit;

        const ORDER_MAP = {
            terbaru: 'i.id DESC',
            terlama: 'i.id ASC',
            az:      'i.nama_barang ASC',
            za:      'i.nama_barang DESC',
        };
        const orderBy = ORDER_MAP[sortBy] ?? ORDER_MAP.terbaru;

        const dataQuery = `
            SELECT 
                i.*, 
                t.waktu_pinjam,
                u.nama_lengkap AS peminjam
            FROM items i
            LEFT JOIN transactions t ON i.id = t.item_id AND t.status_transaksi = 'dipinjam'
            LEFT JOIN users u ON t.user_id = u.id
            ${whereClause}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;
        // Count tidak perlu ikut JOIN karena filter (status, kategori, search) hanya menyentuh tabel items.
        const countQuery = `SELECT COUNT(*) AS total FROM items i ${whereClause}`;

        const [rows] = await conn.query(dataQuery, [...params, safeLimit, safeOffset]);
        const [countRows] = await conn.query(countQuery, params);

        return { rows, total: Number(countRows[0].total) || 0 };
    },
    // Daftar kategori unik untuk dropdown/chip filter di frontend
    getKategoriList: async (conn = db) => {
        const [rows] = await conn.query(
            `SELECT DISTINCT kategori 
             FROM items 
             WHERE kategori IS NOT NULL AND kategori != '' 
             ORDER BY kategori ASC`
        );
        return rows.map((r) => r.kategori);
    },
    // Jumlah barang per kategori — dipakai untuk chart dashboard
    getKategoriBreakdown: async (conn = db) => {
        const [rows] = await conn.query(
            `SELECT COALESCE(NULLIF(kategori, ''), 'Lainnya') AS kategori, COUNT(*) AS jumlah
             FROM items
             GROUP BY kategori
             ORDER BY jumlah DESC`
        );
        return rows;
    },
    // Tambah cloudinary_public_id ke INSERT
    create: async ({ nama_barang, qr_code, kategori, gambar_url, cloudinary_public_id }) => {
        const [result] = await db.query(
            'INSERT INTO items (nama_barang, qr_code, kategori, gambar_url, cloudinary_public_id, status) VALUES (?, ?, ?, ?, ?, ?)',
            [nama_barang, qr_code, kategori, gambar_url || null, cloudinary_public_id || null, 'tersedia']
        );
        return result.insertId;
    },
    // Satu kueri agregasi kondisional menggantikan 5 kueri COUNT terpisah — jauh lebih efisien.
    // Nilai dikembalikan sebagai Number untuk menghindari BigInt atau null dari MySQL driver.
    getInventorySummary: async (conn = db) => {
        const [rows] = await conn.query(`
            SELECT
                COUNT(*)                                          AS totalBarang,
                SUM(CASE WHEN status = 'tersedia' THEN 1 ELSE 0 END) AS tersedia,
                SUM(CASE WHEN status = 'dipinjam' THEN 1 ELSE 0 END) AS sedangDipinjam,
                SUM(CASE WHEN status = 'rusak'    THEN 1 ELSE 0 END) AS jumlahRusak,
                SUM(CASE WHEN status = 'hilang'   THEN 1 ELSE 0 END) AS jumlahHilang
            FROM items
        `);
        const r = rows[0];
        return {
            totalBarang:    Number(r.totalBarang)    || 0,
            tersedia:       Number(r.tersedia)       || 0,
            sedangDipinjam: Number(r.sedangDipinjam) || 0,
            jumlahRusak:    Number(r.jumlahRusak)    || 0,
            jumlahHilang:   Number(r.jumlahHilang)   || 0,
        };
    },
    deleteBulk: async (ids, conn = db) => {
        if (!ids || !Array.isArray(ids) || ids.length === 0) return 0;
        const placeholders = ids.map(() => '?').join(',');
        // Ekstra aman: Jangan hapus jika statusnya dipinjam
        const [result] = await conn.query(`DELETE FROM items WHERE id IN (${placeholders}) AND status != 'dipinjam'`, ids);
        return result.affectedRows;
    },
    // Dynamic update — cloudinary_public_id akan ter-update otomatis jika ada di updateData
    update: async (id, itemData, conn = db) => {
        const fields = [];
        const values = [];

        for (const [key, value] of Object.entries(itemData)) {
            if (value !== undefined) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (fields.length === 0) return 0;

        values.push(id);
        const query = `UPDATE items SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await conn.query(query, values);
        return result.affectedRows;
    },
    // Ambil cloudinary_public_id dari multiple items (dipakai saat bulk delete)
    findPublicIdsByIds: async (ids, conn = db) => {
        if (!ids || ids.length === 0) return [];
        const placeholders = ids.map(() => '?').join(',');
        const [rows] = await conn.query(
            `SELECT id, cloudinary_public_id FROM items WHERE id IN (${placeholders}) AND cloudinary_public_id IS NOT NULL`,
            ids
        );
        return rows;
    },
};

export default Item;