# FixDesk Backend (Laravel 12)

Backend ของระบบแจ้งซ่อม FixDesk ที่ย้ายมาจาก Node.js/Express (`fixdesk-backend`) เพื่อให้รันบน Shared Hosting (Ruk-Com / DirectAdmin) ได้ โดยไม่ต้องใช้ SSH, Docker, cron หรือ Composer บนเซิร์ฟเวอร์

- Laravel 12 / PHP ^8.2 — API แบบ JWT (`firebase/php-jwt`)
- ฐานข้อมูล MySQL — ชื่อตาราง/คอลัมน์เหมือน Node เดิม (`user`, `repair_form`, `us_id`, `rf_code` ...)
- Frontend ใช้ `fixdesk-frontend` (Vue + Vite) ตัวเดิม
- `QUEUE_CONNECTION=sync` และ `SESSION_DRIVER=file` (ไม่มี worker/cron) — แจ้งเตือน LINE ถูกเรียกแบบ synchronous

---

## 1. สิ่งที่ต้องมี

| เครื่องมือ | เวอร์ชัน | หมายเหตุ |
|---|---|---|
| PHP | 8.2 ขึ้นไป | ต้องเปิด extension: `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `gd`, `zip`, `xml` (`gd`/`zip` ใช้กับ PhpSpreadsheet) |
| Composer | 2.x | |
| MySQL / MariaDB | 5.7+ / 10.4+ | ใช้ XAMPP ได้ |
| Node.js | 18+ | สำหรับรัน `fixdesk-frontend` |

---

## 2. ติดตั้งครั้งแรก

รันคำสั่งจากโฟลเดอร์ `fixdesk-backend-laravel`

```bash
cd fixdesk-backend-laravel
composer install
```

### 2.1 สร้างไฟล์ `.env`

> `.env.example` ไม่ถูก commit (ติด `.gitignore` ของ root) ให้สร้างไฟล์ `.env` เองในโฟลเดอร์นี้ตามเทมเพลตด้านล่าง

```ini
APP_NAME=FixDesk
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_MAINTENANCE_DRIVER=file
BCRYPT_ROUNDS=12

LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=debug

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fixdesk_db
DB_USERNAME=root
DB_PASSWORD=

# ใส่สตริงสุ่มยาวๆ — ถ้าไม่ตั้ง login จะไม่ทำงาน
JWT_SECRET=

SESSION_DRIVER=file
SESSION_LIFETIME=120
QUEUE_CONNECTION=sync
CACHE_STORE=database
FILESYSTEM_DISK=local
BROADCAST_CONNECTION=log
MAIL_MAILER=log

# ไม่บังคับ — ใส่เมื่อต้องการทดสอบแจ้งเตือน LINE
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
LINE_GROUP_ID=
FRONTEND_URL=http://localhost:5173/fixdesk   # ไม่ใส่ / ท้าย (ลิงก์ในข้อความ LINE ต่อด้วย /#/login)
```

สร้างค่า `APP_KEY` และ `JWT_SECRET`:

```bash
php artisan key:generate
php -r "echo bin2hex(random_bytes(32));"   # เอาค่าที่ได้ไปใส่ JWT_SECRET
```

### 2.2 สร้างฐานข้อมูล ตาราง และข้อมูลตัวอย่าง

สร้างฐานข้อมูลเปล่าใน phpMyAdmin (หรือ MySQL CLI):

```sql
CREATE DATABASE fixdesk_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

จากนั้น:

```bash
php artisan migrate
php artisan db:seed      # ข้อมูลเดโมสำหรับ local เท่านั้น
```

> ถ้ามี dump ข้อมูลจริงจากระบบ Node เดิม ให้ import แทนการ seed (โครงสร้างตารางเหมือนกัน) — อย่ารัน seeder บน production

บัญชีทดสอบจาก seeder:

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin1234` |
| Technician | `tech01`, `tech02`, `tech03` | `tech1234` |
| User | `user01`, `user02` | `user1234` |

---

## 3. รันระบบ (Development)

ต้องรัน 2 ส่วนพร้อมกัน: Backend (Laravel) และ Frontend (Vue) — เปิดเทอร์มินัล 2 หน้าต่าง

### 3.1 Backend — http://127.0.0.1:8000

**แบบแนะนำ** (ตั้งค่า upload ให้พอสำหรับแนบไฟล์ตอนแจ้งซ่อม — สูงสุด 5 ไฟล์ ไฟล์ละไม่เกิน 50MB):

```bash
php -d upload_max_filesize=60M -d post_max_size=300M -d max_file_uploads=20 -d memory_limit=512M -S 127.0.0.1:8000 -t public dev-router.php
```

> ใช้ `dev-router.php` แทน `php artisan serve` เพราะ `artisan serve` ไม่ส่งค่า `-d` ต่อให้ PHP จึงปรับขนาด upload ไม่ได้

**แบบง่าย** (ถ้าไม่ได้ทดสอบการอัปโหลดไฟล์ใหญ่):

```bash
php artisan serve
```

ตรวจว่าทำงาน: เปิด http://127.0.0.1:8000/up ต้องขึ้นหน้าสถานะ OK

> API ทุกตัวอยู่ใต้ prefix `/api` เช่น `POST http://127.0.0.1:8000/api/login`

### 3.2 Frontend — http://localhost:5173/fixdesk/

```bash
cd ../fixdesk-frontend
npm install
```

`fixdesk-frontend/.env` ที่ commit ไว้ชี้ไปที่ Node เดิม (`http://localhost:3000`) ให้สร้างไฟล์ `fixdesk-frontend/.env.local` เพื่อ override ให้มาชี้ Laravel (ไม่ต้องแก้ `.env`):

```ini
VITE_API_BASE=http://127.0.0.1:8000/api
```

แล้วรัน:

```bash
npm run dev -- --port 5173
```

เปิดเบราว์เซอร์ที่ **http://localhost:5173/fixdesk/** (ต้องมี `/fixdesk/` ท้าย URL เพราะตั้ง `base` ไว้ใน `vite.config.js`) แล้วล็อกอินด้วยบัญชีทดสอบด้านบน

---

## 4. ไฟล์ที่อัปโหลด

- ไฟล์แจ้งซ่อม → `public/uploads/repair/`
- รูปสินค้า (stock) → `public/uploads/`
- สร้างโฟลเดอร์ให้อัตโนมัติเมื่ออัปโหลดครั้งแรก
- เข้าถึงผ่าน `GET /api/uploads/{path}` (ตรงกับที่ frontend ต่อ URL เป็น `${VITE_API_BASE}/uploads/...`)
- ไม่ใช้ `storage:link`

ค่า upload ฝั่ง production อยู่ที่ `public/.user.ini` (60M / 300M / 20 ไฟล์)

มี Postman collection สำหรับ Phase 1 (Auth + แจ้งซ่อม) ที่ `FixDesk-Phase1.postman_collection.json`

---

## 5. Deploy ขึ้น Ruk-Com Shared Hosting

เซิร์ฟเวอร์ไม่มี SSH/Composer จึง build แพ็กเกจจากเครื่อง local แล้วอัปโหลดผ่าน File Manager/FTP

ตัวอย่างนี้สำหรับระบบที่อยู่บน subdomain ของตัวเอง **`https://fixdesk.ninetytwotech.co.th`** โดย document root ของ subdomain คือ `/domains/ninetytwotech.co.th/public_html/fixdesk` — Frontend (Vue) และ Laravel API ใช้ document root เดียวกัน หน้าเว็บอยู่ที่ `/` และ API อยู่ที่ `/api` (โดเมนเดียวกัน จึงไม่ติดเรื่อง CORS)

> **อย่าอัปโหลดทับ `public_html` ของโดเมนหลัก** — อัปโหลดเข้าโฟลเดอร์ `public_html/fixdesk` เท่านั้น

### 5.1 สร้างแพ็กเกจ

ต้องมี Node.js (สำหรับ build frontend) และ `fixdesk-frontend/node_modules` (สคริปต์รัน `npm ci` ให้เองถ้ายังไม่มี) จากโฟลเดอร์ `fixdesk-backend-laravel`:

```bash
bash deploy-build.sh
```

เปลี่ยนโดเมน หรือข้ามการ build frontend (ใช้ `fixdesk-frontend/dist` เดิม):

```bash
SITE_URL=https://example.com bash deploy-build.sh
SKIP_FRONTEND=1 bash deploy-build.sh
```

สิ่งที่สคริปต์ทำ: build `vendor` แบบ production → build frontend (API ชี้ไปที่ `$SITE_URL/api`, base เป็น relative) → รวม `public/` ของ Laravel กับ `dist/` ไว้ใน `public_html` → แก้ path ใน `index.php` ให้ชี้ไป `../../laravel-app/` → เพิ่ม `DirectoryIndex index.html index.php` ใน `.htaccess` → สร้าง `.env` production (ถ้ายังไม่มี จะสร้างเทมเพลตพร้อม `APP_KEY` และ `JWT_SECRET` ที่สุ่มให้) และคง `schema.sql` เดิมไว้

> สคริปต์ชี้ path ของ `composer.bat` ไว้ที่เครื่องผู้พัฒนา (`/c/Users/uSeR/.config/herd-lite/bin/composer.bat`) — ถ้ารันบนเครื่องอื่นให้แก้ตัวแปร `COMPOSER` ในสคริปต์

ผลลัพธ์อยู่ในโฟลเดอร์ `deploy/`:

| โฟลเดอร์/ไฟล์ | อัปโหลดไปที่ |
|---|---|
| `deploy/laravel-app/` | `/domains/ninetytwotech.co.th/laravel-app` (นอก `public_html`) |
| `deploy/public_html/` | `/domains/ninetytwotech.co.th/public_html/fixdesk` (document root ของ subdomain) |
| `deploy/schema.sql` | import ผ่าน phpMyAdmin เพื่อสร้างตาราง |

โครงสร้างบนเซิร์ฟเวอร์:

```
/domains/ninetytwotech.co.th/
├── laravel-app/          <- จาก deploy/laravel-app
└── public_html/
    └── fixdesk/          <- จาก deploy/public_html (index.html, assets/, index.php, .htaccess, .user.ini)
```

### 5.2 แก้ `.env` ก่อนอัปโหลด

แก้ `deploy/laravel-app/.env` (ไฟล์นี้ไม่ถูก commit) ค่าที่ต้องแก้คือ `CHANGE_ME` ของฐานข้อมูล:

```ini
DB_HOST=localhost
DB_DATABASE=<ชื่อ DB บน Ruk-Com>
DB_USERNAME=<user>
DB_PASSWORD=<password>
LINE_CHANNEL_ACCESS_TOKEN=...   # ใส่เมื่อใช้แจ้งเตือน LINE
LINE_CHANNEL_SECRET=...
LINE_GROUP_ID=...
```

ค่าอื่นที่สคริปต์ตั้งให้แล้ว: `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL` และ `FRONTEND_URL` ตาม `SITE_URL`, `CACHE_STORE=file`, `APP_KEY`, `JWT_SECRET` ถ้าเคยมี `.env` ใน `deploy/laravel-app/` อยู่แล้ว สคริปต์จะกู้คืนตัวเดิมให้ ไม่ทับ

### 5.3 อัปโหลดและตั้งค่าบนเซิร์ฟเวอร์

1. ใน DirectAdmin เลือก **PHP 8.2 ขึ้นไป** ให้ subdomain และเปิด extension `gd`, `zip`, `mbstring`, `pdo_mysql`
2. สร้างฐานข้อมูล MySQL แล้ว import `deploy/schema.sql` ผ่าน phpMyAdmin
3. อัปโหลด `deploy/laravel-app/` ไปที่ `/domains/ninetytwotech.co.th/laravel-app`
4. อัปโหลดเนื้อหา (รวมไฟล์ซ่อน `.htaccess` และ `.user.ini`) ใน `deploy/public_html/` เข้า `public_html/fixdesk`
5. ตั้ง permission ของ `laravel-app/storage`, `laravel-app/bootstrap/cache` และ `public_html/fixdesk` (สำหรับสร้าง `uploads/`) ให้เขียนได้ (755 หรือ 775)

### 5.4 ตรวจหลัง deploy

- เปิด `https://fixdesk.ninetytwotech.co.th/up` ต้องขึ้นหน้าสถานะ OK (Laravel ทำงานอยู่)
- เปิด `https://fixdesk.ninetytwotech.co.th/` ต้องขึ้นหน้า login ของระบบ
- ล็อกอินด้วยบัญชีจริงในฐานข้อมูล แล้วลองแจ้งซ่อมพร้อมแนบรูป 1 ไฟล์ และเปิดดูไฟล์ที่แนบ

---

## 6. แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| `No application encryption key has been specified` | ยังไม่ได้รัน `php artisan key:generate` |
| `SQLSTATE[HY000] [1049] Unknown database` | ยังไม่ได้สร้างฐานข้อมูล `fixdesk_db` หรือชื่อใน `.env` ไม่ตรง |
| Login ไม่ได้ / error 500 | ยังไม่ได้ตั้ง `JWT_SECRET` ใน `.env` |
| Frontend เรียก API ไม่ได้ (404 / CORS) | `VITE_API_BASE` ต้องลงท้ายด้วย `/api` และ Backend ต้องรันอยู่ที่ port 8000 |
| อัปโหลดไฟล์ใหญ่ไม่ได้ | รัน Backend ด้วยคำสั่งแบบมี `-d upload_max_filesize=...` (ข้อ 3.1) แทน `artisan serve` |
| แก้ `.env` แล้วไม่มีผล | `php artisan config:clear` |
| `composer install` ฟ้องไม่มี `ext-gd` | เปิด `extension=gd` ใน `php.ini` |
| (Production) เปิดเว็บแล้วหน้าขาว | frontend ถูก build ด้วย base `/fixdesk/` แทนที่จะเป็น relative ให้ build ด้วย `deploy-build.sh` (ข้อ 5) แล้วอัปโหลด `deploy/public_html/` ใหม่ |
| (Production) หน้าเว็บขึ้น แต่ `/up` หรือ `/api/...` ได้ 500 | เช็ก path ใน `index.php` ต้องเป็น `../../laravel-app/...`, สิทธิ์เขียน `laravel-app/storage` และ `bootstrap/cache`, ค่า DB ใน `laravel-app/.env`, และ PHP ต้องเป็น 8.2 ขึ้นไป |
| (Production) เปิดเว็บแล้วเจอข้อความ JSON/404 แทนหน้า login | `.htaccess` ไม่มี `DirectoryIndex index.html index.php` หรือไม่ได้อัปโหลดไฟล์ซ่อน `.htaccess` |
| (Production) login ไม่ได้ ทั้งที่ local ได้ | `JWT_SECRET` ใน `laravel-app/.env` ว่าง หรือ frontend ยังชี้ API ผิดที่ (ต้องเป็น `https://<โดเมน>/api`) |

---

## License

MIT
