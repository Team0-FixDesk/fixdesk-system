<?php

/**
 * Router สำหรับ `php -S` ตอนพัฒนาในเครื่อง (ใช้แทน `artisan serve`)
 * เหตุผล: `artisan serve` ไม่ส่งค่า -d ให้ PHP ที่รันอยู่ จึงแก้ upload_max_filesize / post_max_size ไม่ได้
 * ดูวิธีเรียกที่ .claude/launch.json — ไม่ถูกใช้บน production
 */
chdir(__DIR__ . '/public');

require __DIR__ . '/vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php';
