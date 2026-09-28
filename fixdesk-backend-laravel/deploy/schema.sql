
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `building`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `building` (
  `bd_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `bd_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`bd_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int(11) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `categories` (
  `ct_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ct_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`ct_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `failed_jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `floor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `floor` (
  `fl_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `fl_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fl_bd_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`fl_id`),
  KEY `floor_fl_bd_id_foreign` (`fl_bd_id`),
  CONSTRAINT `floor_fl_bd_id_foreign` FOREIGN KEY (`fl_bd_id`) REFERENCES `building` (`bd_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobs` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint(3) unsigned NOT NULL,
  `reserved_at` int(10) unsigned DEFAULT NULL,
  `available_at` int(10) unsigned NOT NULL,
  `created_at` int(10) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migrations` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `pd_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `pd_asset_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pd_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pd_detail` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pd_category_id` int(10) unsigned DEFAULT NULL,
  `pd_quantity` int(11) NOT NULL DEFAULT 0,
  `pd_unit_id` int(10) unsigned DEFAULT NULL,
  `pd_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `pd_upload_image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pd_updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`pd_id`),
  KEY `products_pd_category_id_foreign` (`pd_category_id`),
  KEY `products_pd_unit_id_foreign` (`pd_unit_id`),
  CONSTRAINT `products_pd_category_id_foreign` FOREIGN KEY (`pd_category_id`) REFERENCES `categories` (`ct_id`) ON DELETE SET NULL,
  CONSTRAINT `products_pd_unit_id_foreign` FOREIGN KEY (`pd_unit_id`) REFERENCES `units` (`units_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `repair_assignment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `repair_assignment` (
  `ra_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ra_rf_id` int(10) unsigned NOT NULL,
  `ra_us_id` int(10) unsigned NOT NULL,
  `ra_is_lead` tinyint(1) NOT NULL DEFAULT 0,
  `ra_assigned_at` datetime DEFAULT NULL,
  `ra_assigned_by` int(10) unsigned DEFAULT NULL,
  `ra_accepted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`ra_id`),
  KEY `repair_assignment_ra_rf_id_foreign` (`ra_rf_id`),
  KEY `repair_assignment_ra_us_id_foreign` (`ra_us_id`),
  KEY `repair_assignment_ra_assigned_by_foreign` (`ra_assigned_by`),
  CONSTRAINT `repair_assignment_ra_assigned_by_foreign` FOREIGN KEY (`ra_assigned_by`) REFERENCES `user` (`us_id`) ON DELETE SET NULL,
  CONSTRAINT `repair_assignment_ra_rf_id_foreign` FOREIGN KEY (`ra_rf_id`) REFERENCES `repair_form` (`rf_id`) ON DELETE CASCADE,
  CONSTRAINT `repair_assignment_ra_us_id_foreign` FOREIGN KEY (`ra_us_id`) REFERENCES `user` (`us_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `repair_form`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `repair_form` (
  `rf_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `rf_code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rf_us_id` int(10) unsigned NOT NULL,
  `rf_tt_id` int(10) unsigned DEFAULT NULL,
  `rf_room_id` int(10) unsigned DEFAULT NULL,
  `rf_prop_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rf_problem` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rf_detail` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rf_phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rf_urgency` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `rf_image` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rf_building_snapshot` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rf_floor_snapshot` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rf_room_snapshot` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rf_user_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `rf_create_at` datetime NOT NULL,
  `rf_update_at` datetime DEFAULT NULL,
  `rf_in_process_at` datetime DEFAULT NULL,
  `rf_done_at` datetime DEFAULT NULL,
  `rf_repair_method` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rf_repair_method_remark` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rf_result_status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rf_result_remark` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rf_tech_summary` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rf_tech_image_after` text COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`rf_id`),
  UNIQUE KEY `repair_form_rf_code_unique` (`rf_code`),
  KEY `repair_form_rf_us_id_foreign` (`rf_us_id`),
  KEY `repair_form_rf_tt_id_foreign` (`rf_tt_id`),
  KEY `repair_form_rf_room_id_foreign` (`rf_room_id`),
  KEY `idx_rf_location_snapshot` (`rf_building_snapshot`,`rf_floor_snapshot`,`rf_room_snapshot`),
  CONSTRAINT `repair_form_rf_room_id_foreign` FOREIGN KEY (`rf_room_id`) REFERENCES `room` (`room_id`) ON DELETE SET NULL,
  CONSTRAINT `repair_form_rf_tt_id_foreign` FOREIGN KEY (`rf_tt_id`) REFERENCES `technician_type` (`tt_id`) ON DELETE SET NULL,
  CONSTRAINT `repair_form_rf_us_id_foreign` FOREIGN KEY (`rf_us_id`) REFERENCES `user` (`us_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `role`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role` (
  `role_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `role_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`role_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `room`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `room` (
  `room_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `room_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `room_fl_id` int(10) unsigned NOT NULL,
  PRIMARY KEY (`room_id`),
  KEY `room_room_fl_id_foreign` (`room_fl_id`),
  CONSTRAINT `room_room_fl_id_foreign` FOREIGN KEY (`room_fl_id`) REFERENCES `floor` (`fl_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `stock_form`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_form` (
  `sf_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `sf_code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sf_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'waiting',
  `sf_create_at` datetime NOT NULL,
  `sf_update_at` datetime DEFAULT NULL,
  `sf_us_id` int(10) unsigned DEFAULT NULL,
  `sf_rf_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`sf_id`),
  UNIQUE KEY `stock_form_sf_code_unique` (`sf_code`),
  KEY `stock_form_sf_us_id_foreign` (`sf_us_id`),
  KEY `stock_form_sf_rf_id_foreign` (`sf_rf_id`),
  CONSTRAINT `stock_form_sf_rf_id_foreign` FOREIGN KEY (`sf_rf_id`) REFERENCES `repair_form` (`rf_id`) ON DELETE SET NULL,
  CONSTRAINT `stock_form_sf_us_id_foreign` FOREIGN KEY (`sf_us_id`) REFERENCES `user` (`us_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `stock_form_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_form_detail` (
  `sfd_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `sfd_sf_id` int(10) unsigned NOT NULL,
  `sfd_pd_id` int(10) unsigned NOT NULL,
  `sfd_qty` int(11) NOT NULL DEFAULT 0,
  `sfd_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'withdraw',
  `sfd_status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'waiting',
  PRIMARY KEY (`sfd_id`),
  KEY `stock_form_detail_sfd_sf_id_foreign` (`sfd_sf_id`),
  KEY `stock_form_detail_sfd_pd_id_foreign` (`sfd_pd_id`),
  CONSTRAINT `stock_form_detail_sfd_pd_id_foreign` FOREIGN KEY (`sfd_pd_id`) REFERENCES `products` (`pd_id`),
  CONSTRAINT `stock_form_detail_sfd_sf_id_foreign` FOREIGN KEY (`sfd_sf_id`) REFERENCES `stock_form` (`sf_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `stock_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `stock_transactions` (
  `stt_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `stt_product_id` int(10) unsigned DEFAULT NULL,
  `stt_user_id` int(10) unsigned DEFAULT NULL,
  `stt_type` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stt_quantity` int(11) NOT NULL,
  `stt_created_at` datetime NOT NULL,
  `stt_ref_sf_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`stt_id`),
  KEY `stock_transactions_stt_product_id_foreign` (`stt_product_id`),
  KEY `stock_transactions_stt_user_id_foreign` (`stt_user_id`),
  KEY `stock_transactions_stt_ref_sf_id_foreign` (`stt_ref_sf_id`),
  CONSTRAINT `stock_transactions_stt_product_id_foreign` FOREIGN KEY (`stt_product_id`) REFERENCES `products` (`pd_id`) ON DELETE SET NULL,
  CONSTRAINT `stock_transactions_stt_ref_sf_id_foreign` FOREIGN KEY (`stt_ref_sf_id`) REFERENCES `stock_form` (`sf_id`) ON DELETE SET NULL,
  CONSTRAINT `stock_transactions_stt_user_id_foreign` FOREIGN KEY (`stt_user_id`) REFERENCES `user` (`us_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `technician_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `technician_type` (
  `tt_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `tt_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`tt_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `title_name`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `title_name` (
  `ttn_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `ttn_title_th` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`ttn_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `units`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `units` (
  `units_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `units_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`units_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user` (
  `us_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `us_user_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `us_user_pass` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `us_ttn_id` int(10) unsigned DEFAULT NULL,
  `us_first_name_th` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `us_last_name_th` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `us_first_name_en` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `us_last_name_en` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `us_phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `us_department` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `us_role_id` int(10) unsigned NOT NULL,
  `us_tt_id` int(10) unsigned DEFAULT NULL,
  `us_job_title` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `us_active` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`us_id`),
  UNIQUE KEY `user_us_user_name_unique` (`us_user_name`),
  KEY `user_us_ttn_id_foreign` (`us_ttn_id`),
  KEY `user_us_role_id_foreign` (`us_role_id`),
  KEY `user_us_tt_id_foreign` (`us_tt_id`),
  CONSTRAINT `user_us_role_id_foreign` FOREIGN KEY (`us_role_id`) REFERENCES `role` (`role_id`),
  CONSTRAINT `user_us_tt_id_foreign` FOREIGN KEY (`us_tt_id`) REFERENCES `technician_type` (`tt_id`) ON DELETE SET NULL,
  CONSTRAINT `user_us_ttn_id_foreign` FOREIGN KEY (`us_ttn_id`) REFERENCES `title_name` (`ttn_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

