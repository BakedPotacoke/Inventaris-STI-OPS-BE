import db from '../config/db.js';

// ID admin default yang tidak boleh dihapus saat reset database.
const PROTECTED_ADMIN_ID = 4;

// POST /api/reset/database
// Menghapus seluruh data pada tabel transactions, item_reports, dan items,
// serta seluruh data pada tabel users KECUALI user dengan id = PROTECTED_ADMIN_ID.
// Endpoint ini ditujukan untuk keperluan development/testing dan hanya bisa
// diakses oleh admin (lihat middleware pada routes/resetRoutes.js).
export const resetDatabaseData = async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Nonaktifkan sementara pengecekan foreign key agar urutan delete
        // tidak terhambat oleh relasi antar tabel.
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const [transactionsResult] = await connection.query('DELETE FROM transactions');
        const [itemReportsResult] = await connection.query('DELETE FROM item_reports');
        const [itemsResult] = await connection.query('DELETE FROM items');
        const [usersResult] = await connection.query('DELETE FROM users WHERE id != ?', [PROTECTED_ADMIN_ID]);

        // Reset auto-increment counters supaya id mulai dari awal lagi.
        await connection.query('ALTER TABLE transactions AUTO_INCREMENT = 1');
        await connection.query('ALTER TABLE item_reports AUTO_INCREMENT = 1');
        await connection.query('ALTER TABLE items AUTO_INCREMENT = 1');

        // Aktifkan kembali pengecekan foreign key.
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: `Reset database berhasil. Dihapus: ${transactionsResult.affectedRows} transaksi, ${itemReportsResult.affectedRows} laporan barang, ${itemsResult.affectedRows} barang, ${usersResult.affectedRows} pengguna (id=${PROTECTED_ADMIN_ID} dipertahankan).`,
            data: {
                transactionsDeleted: transactionsResult.affectedRows,
                itemReportsDeleted: itemReportsResult.affectedRows,
                itemsDeleted: itemsResult.affectedRows,
                usersDeleted: usersResult.affectedRows,
                preservedUserId: PROTECTED_ADMIN_ID,
            },
        });
    } catch (error) {
        await connection.rollback();
        console.error('resetDatabaseData error:', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan saat mereset data database.',
        });
    } finally {
        // Pastikan foreign key checks kembali aktif meskipun terjadi error.
        try {
            await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        } catch (fkError) {
            console.error('Gagal mengaktifkan kembali FOREIGN_KEY_CHECKS:', fkError);
        }
        connection.release();
    }
};

export default { resetDatabaseData };
