import db from '../config/db.js';
import User from '../models/User.js';
import Item from '../models/Item.js';
import Transaction from '../models/Transaction.js';
import ItemReport from '../models/ItemReport.js';

// Helper: format durasi (ms) jadi teks yang mudah dibaca
function formatDurasi(ms) {
    const totalMenit = Math.floor(ms / 60000);
    const hari = Math.floor(totalMenit / 1440);
    const jam = Math.floor((totalMenit % 1440) / 60);
    const menit = totalMenit % 60;

    const bagian = [];
    if (hari > 0) bagian.push(`${hari} hari`);
    if (jam > 0) bagian.push(`${jam} jam`);
    if (menit > 0 || bagian.length === 0) bagian.push(`${menit} menit`);
    return bagian.join(' ');
}

export const handleScan = async (req, res) => {
    const { qr_code } = req.body;
    const user_id = req.user.id; // Diambil dari JWT via middleware

    // Validasi input dasar
    if (!qr_code || typeof qr_code !== 'string' || !qr_code.trim()) {
        return res.status(400).json({ message: "QR Code wajib diisi dan harus berupa teks yang valid." });
    }

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        // 0. Cek apakah user terdaftar & statusnya aktif
        const user = await User.findById(user_id, conn);
        if (!user) {
            await conn.rollback();
            return res.status(404).json({ message: "Pengguna dengan ID tersebut tidak terdaftar di sistem." });
        }


        // 1. Cek apakah barang dengan qr_code tersebut terdaftar
        const barang = await Item.findByQrCode(qr_code, conn);

        if (!barang) {
            await conn.rollback();
            return res.status(404).json({ message: `QR Code tidak dikenali.` });
        }

        const namaUser = user.nama_lengkap || `User #${user.id}`;

        switch (barang.status) {
            // 2. ALUR PEMINJAMAN
            case 'tersedia': {
                await Item.updateStatus(barang.id, "dipinjam", conn);
                const transactionId = await Transaction.create(user_id, barang.id, "dipinjam", conn);

                await conn.commit();
                return res.status(200).json({
                    status: "pinjam",
                    message: `Berhasil meminjam ${barang.nama_barang}. Jangan lupa dikembalikan ya!`,
                    barang,
                    transaction_id: transactionId
                });
            }

            // 3. ALUR PENGEMBALIAN
            case 'dipinjam': {
                const tx = await Transaction.findActiveByItemId(barang.id, conn);

                if (!tx) {
                    await Item.updateStatus(barang.id, "tersedia", conn);
                    await conn.commit();
                    return res.status(409).json({
                        message: `Data "${barang.nama_barang}"(berstatus dipinjam tanpa transaksi aktif). Status telah direset otomatis menjadi "tersedia". Silakan scan ulang untuk meminjam.`
                    });
                }

                // Validasi: hanya peminjam asli (atau admin) yang boleh mengembalikan
                const isAdmin = user.role === 'admin';
                if (tx.user_id !== user_id && !isAdmin) {
                    await conn.rollback();
                    const peminjam = await User.findById(tx.user_id, conn);
                    const namaPeminjam = peminjam?.nama_lengkap || 'pengguna lain';
                    return res.status(403).json({
                        message: `Gagal mengembalikan: "${barang.nama_barang}" sedang dipinjam oleh ${namaPeminjam}, bukan oleh ${namaUser}.`
                    });
                }

                const durasiMs = Date.now() - new Date(tx.waktu_pinjam).getTime();
                const durasiText = formatDurasi(durasiMs);

                // Belum menyentuh data apapun — hanya validasi bahwa scan ini sah untuk
                // proses pengembalian. Transaksi & status barang baru difinalisasi setelah
                // user mengonfirmasi kondisi barang lewat endpoint /api/scan/confirm-return.
                await conn.rollback();
                return res.status(200).json({
                    status: "konfirmasi_kembali",
                    message: `Sebelum menyelesaikan, bagaimana kondisi "${barang.nama_barang}" saat ini?`,
                    barang,
                    transaction_id: tx.id,
                    durasi_pinjam: durasiText
                });
            }

            case 'maintenance':
            case 'perbaikan':
                await conn.rollback();
                return res.status(423).json({
                    message: `"${barang.nama_barang}" sedang dalam perbaikan/maintenance dan belum bisa dipinjam saat ini.`
                });

            case 'rusak':
                await conn.rollback();
                return res.status(423).json({
                    message: `"${barang.nama_barang}" berstatus rusak dan tidak dapat dipinjam. Silakan laporkan ke admin jika ini keliru.`
                });

            case 'hilang':
                await conn.rollback();
                return res.status(423).json({
                    message: `"${barang.nama_barang}" tercatat hilang dalam sistem dan tidak dapat diproses. Hubungi admin untuk klarifikasi.`
                });

            default:
                await conn.rollback();
                return res.status(409).json({
                    message: `"${barang.nama_barang}" memiliki status "${barang.status}" yang tidak dikenali sistem. Silakan hubungi admin.`
                });
        }
    } catch (error) {
        await conn.rollback();
        console.error('Scan QR error:', error);
        return res.status(500).json({
            message: "Terjadi kesalahan pada server saat memproses scan.",
            error: error.message
        });
    } finally {
        conn.release();
    }
};

// POST /api/scan/confirm-return
// Dipanggil setelah user mengisi form kondisi barang (baik/rusak) beserta foto bukti.
// Request harus berupa multipart/form-data dengan field:
//   - transaction_id, kondisi, keterangan (text fields)
//   - foto (file — sudah diproses oleh uploadMiddleware → req.cloudinaryResult)
export const confirmReturn = async (req, res) => {
    const { transaction_id, kondisi, keterangan } = req.body;
    const user_id = req.user.id;

    if (!transaction_id) {
        return res.status(400).json({ message: "transaction_id wajib disertakan." });
    }
    if (!['baik', 'rusak'].includes(kondisi)) {
        return res.status(400).json({ message: "Kondisi wajib diisi: 'baik' atau 'rusak'." });
    }
    if (kondisi === 'rusak' && (!keterangan || !keterangan.trim())) {
        return res.status(400).json({ message: "Keterangan kerusakan wajib diisi." });
    }
    if (!req.cloudinaryResult) {
        return res.status(400).json({ message: "Foto bukti kondisi barang wajib disertakan." });
    }

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        const user = await User.findById(user_id, conn);
        if (!user) {
            await conn.rollback();
            return res.status(404).json({ message: "Pengguna dengan ID tersebut tidak terdaftar di sistem." });
        }

        const tx = await Transaction.findById(transaction_id, conn);
        if (!tx || tx.status_transaksi !== 'dipinjam') {
            await conn.rollback();
            return res.status(409).json({ message: "Transaksi tidak ditemukan atau pengembalian sudah diselesaikan sebelumnya." });
        }

        const isAdmin = user.role === 'admin';
        if (tx.user_id !== user_id && !isAdmin) {
            await conn.rollback();
            return res.status(403).json({ message: "Anda tidak berhak menyelesaikan pengembalian ini." });
        }

        const barang = await Item.findById(tx.item_id, conn);
        if (!barang) {
            await conn.rollback();
            return res.status(404).json({ message: "Barang terkait transaksi ini tidak ditemukan." });
        }

        await Transaction.complete(tx.id, conn);

        if (kondisi === 'rusak') {
            await Item.updateStatus(barang.id, 'rusak', conn);
        } else {
            await Item.updateStatus(barang.id, 'tersedia', conn);
        }

        // Selalu simpan laporan + foto bukti, baik kondisi baik maupun rusak
        // Catatan: jenis_laporan 'baik' memerlukan ENUM yang sudah diperbarui di DB
        await ItemReport.create({
            item_id: barang.id,
            user_id,
            transaction_id: tx.id,
            jenis_laporan: kondisi === 'rusak' ? 'rusak' : 'baik',
            keterangan: kondisi === 'rusak' ? keterangan.trim() : null,
            foto_url: req.cloudinaryResult.secure_url,
            cloudinary_public_id: req.cloudinaryResult.public_id,
        }, conn);

        await conn.commit();

        return res.status(200).json({
            status: kondisi === 'rusak' ? 'kembali_rusak' : 'kembali',
            message: kondisi === 'rusak'
                ? `${barang.nama_barang} telah dikembalikan dan ditandai rusak. Laporan sudah dikirim ke admin.`
                : `${barang.nama_barang} berhasil dikembalikan dalam kondisi baik.`,
            barang
        });
    } catch (error) {
        await conn.rollback();
        console.error('confirmReturn error:', error);
        return res.status(500).json({
            message: "Terjadi kesalahan pada server saat mengonfirmasi pengembalian.",
            error: error.message
        });
    } finally {
        conn.release();
    }
};