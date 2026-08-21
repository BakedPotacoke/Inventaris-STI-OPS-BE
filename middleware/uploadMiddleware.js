import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import cloudinary from '../config/cloudinary.js';

// ─── 1. Multer: memoryStorage + validasi MIME + batas 5 MB ──────────────────
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Format file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.'), false);
    }
};

const upload = multer({
    storage: multer.memoryStorage(), // simpan di RAM, tidak menulis ke disk
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // maks 5 MB
});

// ─── 2. Middleware: Sharp → Cloudinary ──────────────────────────────────────
/**
 * Middleware pipeline yang berjalan SETELAH multer.
 * Jika tidak ada file (opsional), langsung lanjut ke controller.
 *
 * Alur:
 *   Buffer (multer) → Sharp (resize, WebP, hapus EXIF) → Cloudinary upload_stream
 *
 * Output: req.cloudinaryResult = { secure_url, public_id }
 */
export const processAndUploadImage = async (req, res, next) => {
    // Jika tidak ada file yang diupload, skip proses ini
    if (!req.file) return next();

    try {
        // ── Sharp: resize ≤800px lebar, konversi WebP, hapus EXIF metadata ──
        const optimizedBuffer = await sharp(req.file.buffer)
            .resize({ width: 800, withoutEnlargement: true }) // tidak diperbesar jika sudah kecil
            .webp({ quality: 80 })
            .withMetadata(false) // hapus EXIF (lokasi GPS, dsb)
            .toBuffer();

        // ── UUID sebagai nama file unik ──
        // Pisahkan folder Cloudinary: foto laporan/pengembalian vs foto barang inventaris
        const isReportUpload = req.originalUrl?.includes('confirm-return');
        const folderPath = isReportUpload ? 'qrfast/reports' : 'qrfast/items';
        const publicId = `${folderPath}/${uuidv4()}`;

        // ── Upload ke Cloudinary via stream ──
        const cloudinaryResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    public_id: publicId,
                    resource_type: 'image',
                    format: 'webp',
                    overwrite: false,
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
            uploadStream.end(optimizedBuffer);
        });

        // Lampirkan hasil ke request agar bisa dipakai controller
        req.cloudinaryResult = {
            secure_url: cloudinaryResult.secure_url,
            public_id: cloudinaryResult.public_id,
        };

        next();
    } catch (error) {
        console.error('processAndUploadImage error:', error);
        return res.status(500).json({
            message: 'Gagal memproses atau mengupload gambar ke cloud.',
            error: error.message,
        });
    }
};

export default upload;
