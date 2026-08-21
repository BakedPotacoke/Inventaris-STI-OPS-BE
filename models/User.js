import db from '../config/db.js';

const User = {
    // Mendukung server-side pagination (page, limit), filter role, dan pencarian teks (search).
    // Parameter search mencari di nama_lengkap atau email.
    // Mengembalikan { rows, total } — total dipakai controller untuk membangun metadata pagination.
    findAll: async ({ page = 1, limit = 10, role, search, sortBy = 'terbaru' } = {}) => {
        const safeLimit = Number(limit);
        const safeOffset = (Number(page) - 1) * safeLimit;

        const conditions = [];
        const params = [];

        if (role && role !== 'semua') {
            conditions.push('role = ?');
            params.push(role);
        }
        if (search && search.trim() !== '') {
            conditions.push('(nama_lengkap LIKE ? OR email LIKE ?)');
            const term = `%${search.trim()}%`;
            params.push(term, term);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const ORDER_MAP = {
            terbaru: 'id DESC',
            terlama: 'id ASC',
            az:      'nama_lengkap ASC',
            za:      'nama_lengkap DESC',
        };
        const orderBy = ORDER_MAP[sortBy] ?? ORDER_MAP.terbaru;

        const dataQuery = `
            SELECT id, nama_lengkap, email, role
            FROM users
            ${whereClause}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;
        const countQuery = `SELECT COUNT(*) AS total FROM users ${whereClause}`;

        const [rows] = await db.query(dataQuery, [...params, safeLimit, safeOffset]);
        const [countRows] = await db.query(countQuery, params);

        return { rows, total: countRows[0].total };
    },
    findById: async (id, conn = db) => {
        const [rows] = await conn.query('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0];
    },
    findByEmail: async (email, conn = db) => {
        const [rows] = await conn.query('SELECT * FROM users WHERE email = ?', [email]);
        return rows[0];
    },
    create: async (data, conn = db) => {
        const [result] = await conn.query(
            'INSERT INTO users (nama_lengkap, email, password, role) VALUES (?, ?, ?, ?)',
            [data.nama_lengkap, data.email, data.password, data.role]
        );
        return result.insertId;
    },
    update: async (id, data, conn = db) => {
        // Jika password ikut dikirim (admin mengganti password pengguna lain), sertakan di query
        if (data.password) {
            const [result] = await conn.query(
                'UPDATE users SET nama_lengkap = ?, email = ?, role = ?, password = ? WHERE id = ?',
                [data.nama_lengkap, data.email, data.role, data.password, id]
            );
            return result.affectedRows;
        }
        const [result] = await conn.query(
            'UPDATE users SET nama_lengkap = ?, email = ?, role = ? WHERE id = ?',
            [data.nama_lengkap, data.email, data.role, id]
        );
        return result.affectedRows;
    },
    updateProfile: async (id, data, conn = db) => {
        // dipakai user untuk update profil sendiri (tanpa ubah role)
        if (data.password) {
            const [result] = await conn.query(
                'UPDATE users SET nama_lengkap = ?, email = ?, password = ? WHERE id = ?',
                [data.nama_lengkap, data.email, data.password, id]
            );
            return result.affectedRows;
        }
        const [result] = await conn.query(
            'UPDATE users SET nama_lengkap = ?, email = ? WHERE id = ?',
            [data.nama_lengkap, data.email, id]
        );
        return result.affectedRows;
    },
    delete: async (id, conn = db) => {
        const [result] = await conn.query('DELETE FROM users WHERE id = ?', [id]);
        return result.affectedRows;
    },
    // Total pengguna terdaftar — dipakai untuk KPI card dashboard
    count: async (conn = db) => {
        const [rows] = await conn.query('SELECT COUNT(*) AS jumlah FROM users');
        return rows[0].jumlah;
    },
};

export default User;