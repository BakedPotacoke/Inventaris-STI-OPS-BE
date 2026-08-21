import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lokasi fastqr.sql relatif terhadap file ini (src/config/database.js -> root repo)
const SQL_SCHEMA_PATH = path.join(__dirname, '../../fastqr.sql');

// Membangun konfigurasi pool koneksi. Prioritaskan MYSQL_URL (disediakan Railway),
// fallback ke variabel individual MYSQLHOST/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE.
const buildPoolConfig = () => {
    const baseConfig = {
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        // Diperlukan agar bisa menjalankan banyak statement sekaligus dari fastqr.sql
        multipleStatements: true,
    };

    if (process.env.MYSQL_URL) {
        const dbUrl = new URL(process.env.MYSQL_URL);
        return {
            ...baseConfig,
            host: dbUrl.hostname,
            user: decodeURIComponent(dbUrl.username),
            password: decodeURIComponent(dbUrl.password),
            database: dbUrl.pathname.replace(/^\//, ''),
            port: Number(dbUrl.port) || 3306,
        };
    }

    return {
        ...baseConfig,
        host: process.env.MYSQLHOST?.trim(),
        user: process.env.MYSQLUSER?.trim(),
        password: process.env.MYSQLPASSWORD?.trim(),
        database: process.env.MYSQLDATABASE?.trim(),
        port: Number(process.env.MYSQLPORT) || 3306,
    };
};

const pool = mysql.createPool(buildPoolConfig());

/**
 * Menjalankan fastqr.sql terhadap database yang terkonfigurasi.
 * Dipanggil sekali saat startup server untuk memastikan seluruh tabel,
 * index, foreign key, dan data awal (termasuk admin user) sudah tersedia.
 */
export const initializeDatabase = async () => {
    if (!fs.existsSync(SQL_SCHEMA_PATH)) {
        throw new Error(`File schema tidak ditemukan di path: ${SQL_SCHEMA_PATH}`);
    }

    const sql = fs.readFileSync(SQL_SCHEMA_PATH, 'utf8');

    const connection = await pool.getConnection();
    try {
        console.log('🔧 Menjalankan inisialisasi schema database dari fastqr.sql...');
        await connection.query(sql);
        console.log('✅ Schema database berhasil diinisialisasi.');
    } finally {
        connection.release();
    }
};

export default pool;
