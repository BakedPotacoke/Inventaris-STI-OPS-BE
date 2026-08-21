-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Jul 31, 2026 at 02:15 AM
-- Server version: 8.4.7
-- PHP Version: 8.3.28

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `fastqr`
--

-- --------------------------------------------------------

--
-- Table structure for table `items`
--

DROP TABLE IF EXISTS `items`;
CREATE TABLE IF NOT EXISTS `items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `qr_code` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_barang` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kategori` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gambar_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cloudinary_public_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('tersedia','dipinjam','rusak','hilang') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'tersedia',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `qr_code` (`qr_code`),
  KEY `idx_kategori` (`kategori`),
  KEY `idx_status` (`status`),
  KEY `idx_kategori_status` (`kategori`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `items`
--

INSERT INTO `items` (`id`, `qr_code`, `nama_barang`, `kategori`, `gambar_url`, `cloudinary_public_id`, `status`, `created_at`) VALUES
(33, '1', 'Kamera', 'kamera', 'https://res.cloudinary.com/daoauzqpd/image/upload/v1785399095/qrfast/items/6b15ef79-bb4e-4864-91dc-cd6058d1882e.webp', 'qrfast/items/6b15ef79-bb4e-4864-91dc-cd6058d1882e', 'tersedia', '2026-07-27 04:37:18'),
(35, '2', 'Kamera', 'Elektronik', NULL, NULL, 'tersedia', '2026-07-27 04:37:53'),
(36, 'KAMERA', 'Kamera', 'Elektronik', NULL, NULL, 'tersedia', '2026-07-28 03:11:25');

-- --------------------------------------------------------

--
-- Table structure for table `item_reports`
--

DROP TABLE IF EXISTS `item_reports`;
CREATE TABLE IF NOT EXISTS `item_reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `user_id` int NOT NULL,
  `transaction_id` int DEFAULT NULL,
  `jenis_laporan` enum('rusak','hilang','baik') COLLATE utf8mb4_unicode_ci NOT NULL,
  `keterangan` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `foto_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cloudinary_public_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_report_item` (`item_id`),
  KEY `fk_report_user` (`user_id`),
  KEY `fk_report_transaction` (`transaction_id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `item_reports`
--

INSERT INTO `item_reports` (`id`, `item_id`, `user_id`, `transaction_id`, `jenis_laporan`, `keterangan`, `foto_url`, `cloudinary_public_id`, `created_at`) VALUES
(7, 33, 4, 66, 'baik', NULL, 'https://res.cloudinary.com/daoauzqpd/image/upload/v1785398724/qrfast/reports/b51e7bc2-87b3-4011-9d7c-6a3f9e84b9cb.webp', 'qrfast/reports/b51e7bc2-87b3-4011-9d7c-6a3f9e84b9cb', '2026-07-30 08:05:26'),
(8, 33, 6, 67, 'baik', NULL, 'https://res.cloudinary.com/daoauzqpd/image/upload/v1785399252/qrfast/reports/434db341-a5b5-4771-8884-99e4bdec9ccd.webp', 'qrfast/reports/434db341-a5b5-4771-8884-99e4bdec9ccd', '2026-07-30 08:14:14'),
(9, 35, 6, 68, 'baik', NULL, 'https://res.cloudinary.com/daoauzqpd/image/upload/v1785399556/qrfast/reports/8bca2dd8-3f1e-40d1-a5d6-151017c68546.webp', 'qrfast/reports/8bca2dd8-3f1e-40d1-a5d6-151017c68546', '2026-07-30 08:19:18'),
(10, 35, 6, 69, 'baik', NULL, 'https://res.cloudinary.com/daoauzqpd/image/upload/v1785399575/qrfast/reports/30d334ac-b35c-49e5-9739-781a4d24758f.webp', 'qrfast/reports/30d334ac-b35c-49e5-9739-781a4d24758f', '2026-07-30 08:19:37'),
(11, 35, 6, 70, 'baik', NULL, 'https://res.cloudinary.com/daoauzqpd/image/upload/v1785399615/qrfast/reports/1e3ea8ad-f996-4fb5-acda-7999ef357d38.webp', 'qrfast/reports/1e3ea8ad-f996-4fb5-acda-7999ef357d38', '2026-07-30 08:20:17'),
(12, 36, 6, 71, 'baik', NULL, 'https://res.cloudinary.com/daoauzqpd/image/upload/v1785399666/qrfast/reports/f7a710ff-6b77-4edf-95c2-ca6ba3ffc980.webp', 'qrfast/reports/f7a710ff-6b77-4edf-95c2-ca6ba3ffc980', '2026-07-30 08:21:09'),
(13, 33, 6, 72, 'baik', NULL, 'https://res.cloudinary.com/daoauzqpd/image/upload/v1785399768/qrfast/reports/0ffa427e-e9de-481d-8421-78212ce72192.webp', 'qrfast/reports/0ffa427e-e9de-481d-8421-78212ce72192', '2026-07-30 08:22:50');

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `item_id` int NOT NULL,
  `waktu_pinjam` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `waktu_kembali` timestamp NULL DEFAULT NULL,
  `status_transaksi` enum('dipinjam','selesai') COLLATE utf8mb4_unicode_ci DEFAULT 'dipinjam',
  PRIMARY KEY (`id`),
  KEY `fk_transaction_user` (`user_id`),
  KEY `fk_transaction_item` (`item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `transactions`
--

INSERT INTO `transactions` (`id`, `user_id`, `item_id`, `waktu_pinjam`, `waktu_kembali`, `status_transaksi`) VALUES
(66, 6, 33, '2026-07-27 04:38:47', '2026-07-30 08:05:26', 'selesai'),
(67, 6, 33, '2026-07-30 08:07:47', '2026-07-30 08:14:14', 'selesai'),
(68, 6, 35, '2026-07-30 08:19:01', '2026-07-30 08:19:18', 'selesai'),
(69, 6, 35, '2026-07-30 08:19:22', '2026-07-30 08:19:37', 'selesai'),
(70, 6, 35, '2026-07-30 08:19:39', '2026-07-30 08:20:17', 'selesai'),
(71, 6, 36, '2026-07-30 08:20:37', '2026-07-30 08:21:09', 'selesai'),
(72, 6, 33, '2026-07-30 08:22:33', '2026-07-30 08:22:50', 'selesai');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_lengkap` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','pegawai') COLLATE utf8mb4_unicode_ci DEFAULT 'pegawai',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `nama_lengkap`, `email`, `password`, `role`, `created_at`) VALUES
(4, 'Admin Utama', 'admin@example.com', '$2b$10$mXOq4KHYTa6P1noBg55h4ePYcAWIXbup3sOhK8ve/O/sOzw1B.qH2', 'admin', '2026-07-15 14:00:48'),
(6, 'Kamal', 'kamaludin@example.com', '$2b$10$YulvOG1DZl.a6G2erS9p7eitVIdkaqbD9Il8EabonJv4vWVIlgy/O', 'pegawai', '2026-07-15 15:32:12');

--
-- Constraints for dumped tables
--

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_transaction_item` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`),
  ADD CONSTRAINT `fk_transaction_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
