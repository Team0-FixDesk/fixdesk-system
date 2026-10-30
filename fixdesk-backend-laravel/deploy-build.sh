#!/usr/bin/env bash
# สร้างแพ็กเกจสำหรับอัปโหลดขึ้น Ruk-Com Shared Hosting (ไม่มี SSH/composer บน server)
#
# รองรับกรณีที่ระบบอยู่บน subdomain ของตัวเอง เช่น https://fixdesk.ninetytwotech.co.th
# โดย document root ของ subdomain = /domains/<โดเมนหลัก>/public_html/fixdesk
# และ frontend (Vue) กับ Laravel API ใช้ document root เดียวกัน (API อยู่ที่ /api)
#
# ผลลัพธ์: โฟลเดอร์ deploy/ แบ่งเป็น 3 ส่วน
#   deploy/laravel-app/  -> อัปโหลดไปไว้นอก public_html (เข้าเว็บไม่ได้โดยตรง)
#   deploy/public_html/  -> อัปโหลดเข้า document root ของ subdomain (frontend + public/ ของ Laravel)
#   deploy/schema.sql    -> import ผ่าน phpMyAdmin
#
# โครงสร้างบนเซิร์ฟเวอร์ (laravel-app อยู่ระดับเดียวกับ public_html ของโดเมนหลัก):
#   /domains/ninetytwotech.co.th/
#     ├── laravel-app/          <- deploy/laravel-app
#     └── public_html/
#         └── fixdesk/          <- deploy/public_html (document root ของ subdomain)
#
# รันจากโฟลเดอร์ fixdesk-backend-laravel:  bash deploy-build.sh
#
# ตัวแปรที่ปรับได้ (ตั้งก่อนรันคำสั่ง):
#   SITE_URL=https://example.com bash deploy-build.sh   เปลี่ยนโดเมนที่ใช้จริง
#   SKIP_FRONTEND=1 bash deploy-build.sh                ข้ามการ build frontend (ใช้ dist/ เดิม)

set -e
cd "$(dirname "$0")"

COMPOSER="/c/Users/uSeR/.config/herd-lite/bin/composer.bat"
FRONTEND_DIR="../fixdesk-frontend"
DEPLOY_DIR="deploy"
SITE_URL="${SITE_URL:-https://fixdesk.ninetytwotech.co.th}"
SITE_URL="${SITE_URL%/}"

# index.php อยู่ที่ public_html/fixdesk ส่วน laravel-app อยู่ที่ /domains/<โดเมนหลัก>/laravel-app (สูงขึ้นไป 2 ระดับ)
LARAVEL_REL="../../laravel-app"

BACKUP_DIR="$(mktemp -d)"

echo "==> สำรอง .env production และ schema.sql เดิม (ถ้ามี) ก่อนลบแพ็กเกจเก่า"
if [ -f "$DEPLOY_DIR/laravel-app/.env" ]; then
  cp "$DEPLOY_DIR/laravel-app/.env" "$BACKUP_DIR/.env"
fi
if [ -f "$DEPLOY_DIR/schema.sql" ]; then
  cp "$DEPLOY_DIR/schema.sql" "$BACKUP_DIR/schema.sql"
fi
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/laravel-app" "$DEPLOY_DIR/public_html"

echo "==> build vendor แบบ production (ไม่มี dev dependencies)"
# --ignore-platform-reqs: เครื่อง local นี้ไม่มี ext-gd (Herd Lite เป็น PHP แบบ minimal)
# แต่ shared hosting ทั่วไป (รวม Ruk-Com) มี gd เปิดอยู่แล้วเป็นค่า default เป็นแค่ข้อจำกัดของเครื่อง dev เท่านั้น
"$COMPOSER" install --no-dev --optimize-autoloader --no-interaction --ignore-platform-reqs

echo "==> คัดลอกไฟล์แอป (ยกเว้น public/, .git, deploy/ และไฟล์ runtime ของเครื่อง dev ใน storage/)"
# storage/ ของเครื่อง dev มี log, session และ view ที่คอมไพล์แล้ว ซึ่งไม่ควรขึ้นเซิร์ฟเวอร์จริง
tar --exclude='./public' \
    --exclude='./.git' \
    --exclude='./deploy' \
    --exclude='./deploy-build.sh' \
    --exclude='./node_modules' \
    --exclude='./.env' \
    --exclude='./tests' \
    --exclude='./storage/logs/*' \
    --exclude='./storage/framework/sessions/*' \
    --exclude='./storage/framework/views/*' \
    --exclude='./storage/framework/cache/data/*' \
    --exclude='./storage/framework/testing/*' \
    -cf - . | tar -xf - -C "$DEPLOY_DIR/laravel-app/"

# โฟลเดอร์ที่ Laravel ต้องเขียนไฟล์ลงตอนรัน ต้องมีอยู่เสมอแม้ถูก exclude เนื้อหาออกแล้ว
# ใส่ .gitignore ไว้ข้างในด้วย (แบบเดียวกับที่ Laravel ใช้เอง) เพราะโปรแกรมอัปโหลดบางตัวข้ามโฟลเดอร์ว่าง
# ซึ่งถ้า framework/views หายไป Laravel จะ error "Please provide a valid cache path"
for dir in logs framework/sessions framework/views framework/cache/data; do
  mkdir -p "$DEPLOY_DIR/laravel-app/storage/$dir"
  printf '*\n!.gitignore\n' > "$DEPLOY_DIR/laravel-app/storage/$dir/.gitignore"
done

echo "==> คัดลอก public/ ของ Laravel ไปเป็น public_html"
cp -r public/. "$DEPLOY_DIR/public_html/"

echo "==> แก้ path ใน index.php ให้ชี้ไปที่ $LARAVEL_REL/"
sed -i \
  -e "s#__DIR__.'/../vendor/autoload.php'#__DIR__.'/$LARAVEL_REL/vendor/autoload.php'#" \
  -e "s#__DIR__.'/../bootstrap/app.php'#__DIR__.'/$LARAVEL_REL/bootstrap/app.php'#" \
  -e "s#__DIR__.'/../storage/framework/maintenance.php'#__DIR__.'/$LARAVEL_REL/storage/framework/maintenance.php'#" \
  "$DEPLOY_DIR/public_html/index.php"
if ! grep -q "$LARAVEL_REL/vendor/autoload.php" "$DEPLOY_DIR/public_html/index.php" \
   || ! grep -q "$LARAVEL_REL/bootstrap/app.php" "$DEPLOY_DIR/public_html/index.php"; then
  echo "ผิดพลาด: แก้ path ใน index.php ไม่สำเร็จ (รูปแบบใน public/index.php อาจเปลี่ยนไป)" >&2
  exit 1
fi

echo "==> ให้หน้าเว็บ (index.html) มาก่อน index.php ของ Laravel ใน .htaccess"
{
  echo "DirectoryIndex index.html index.php"
  echo
  cat public/.htaccess
} > "$DEPLOY_DIR/public_html/.htaccess"

if [ "$SKIP_FRONTEND" = "1" ]; then
  echo "==> ข้ามการ build frontend (SKIP_FRONTEND=1) ใช้ $FRONTEND_DIR/dist เดิม"
else
  echo "==> build frontend: base=/ และ API = $SITE_URL/api"
  if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    (cd "$FRONTEND_DIR" && npm ci)
  fi
  # ค่าจาก environment ชนะไฟล์ .env.production ของ Vite
  # base ต้องไม่ใช่ /fixdesk/ เพราะ subdomain เปิดที่ root; ใช้ "./" (relative) แทน "/" เพราะ Git Bash บน Windows
  # แปลง --base=/ เป็น "C:/Program Files/Git/" ทำให้ path ของ assets ใน index.html เพี้ยน (frontend ใช้ hash router จึงใช้ ./ ได้)
  (cd "$FRONTEND_DIR" && VITE_API_BASE="$SITE_URL/api" npx vite build --base=./)
fi

if [ ! -f "$FRONTEND_DIR/dist/index.html" ]; then
  echo "ผิดพลาด: ไม่พบ $FRONTEND_DIR/dist/index.html (build frontend ไม่สำเร็จ)" >&2
  exit 1
fi
echo "==> คัดลอก frontend (dist/) ไปไว้ใน public_html"
cp -r "$FRONTEND_DIR/dist/." "$DEPLOY_DIR/public_html/"

if [ -f "$BACKUP_DIR/.env" ]; then
  echo "==> กู้คืน .env production เดิมที่เคยแก้ไว้"
  cp "$BACKUP_DIR/.env" "$DEPLOY_DIR/laravel-app/.env"
else
  echo "==> ยังไม่มี .env production เดิม สร้างเทมเพลตให้ (ต้องแก้ค่า CHANGE_ME ก่อนอัปโหลด!)"
  GEN_APP_KEY=""
  GEN_JWT_SECRET=""
  if command -v openssl >/dev/null 2>&1; then
    GEN_APP_KEY="base64:$(openssl rand -base64 32)"
    GEN_JWT_SECRET="$(openssl rand -hex 32)"
  fi
  cat > "$DEPLOY_DIR/laravel-app/.env" <<ENV
APP_NAME=FixDesk
APP_ENV=production
APP_KEY=$GEN_APP_KEY
APP_DEBUG=false
APP_URL=$SITE_URL

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_MAINTENANCE_DRIVER=file
BCRYPT_ROUNDS=12

LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=CHANGE_ME
DB_USERNAME=CHANGE_ME
DB_PASSWORD=CHANGE_ME

JWT_SECRET=$GEN_JWT_SECRET

SESSION_DRIVER=file
SESSION_LIFETIME=120
QUEUE_CONNECTION=sync
CACHE_STORE=file
FILESYSTEM_DISK=local
BROADCAST_CONNECTION=log
MAIL_MAILER=log

LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
LINE_GROUP_ID=
FRONTEND_URL=$SITE_URL
ENV
fi

if [ -f "$BACKUP_DIR/schema.sql" ]; then
  cp "$BACKUP_DIR/schema.sql" "$DEPLOY_DIR/schema.sql"
else
  echo "คำเตือน: ไม่พบ schema.sql เดิม ต้องสร้างตารางเองด้วย php artisan migrate หรือ import dump" >&2
fi
rm -rf "$BACKUP_DIR"

echo "==> คืนค่า vendor local ให้กลับมามี dev dependencies เหมือนเดิม"
"$COMPOSER" install --no-interaction --ignore-platform-reqs

echo ""
echo "เสร็จแล้ว! ไฟล์อยู่ใน $DEPLOY_DIR/"
if grep -q "CHANGE_ME" "$DEPLOY_DIR/laravel-app/.env" 2>/dev/null; then
  echo "ยังต้องแก้ $DEPLOY_DIR/laravel-app/.env : DB_DATABASE / DB_USERNAME / DB_PASSWORD (ค่า CHANGE_ME) และ LINE_* ถ้าจะใช้"
fi
echo "ก่อนอัปโหลด อย่าลืม:"
echo "  1. import $DEPLOY_DIR/schema.sql ผ่าน phpMyAdmin ลงฐานข้อมูลของ Ruk-Com"
echo "  2. อัปโหลด $DEPLOY_DIR/laravel-app/ ไปไว้นอก public_html (เช่น /domains/<โดเมนหลัก>/laravel-app)"
echo "  3. อัปโหลดเนื้อหาใน $DEPLOY_DIR/public_html/ เข้า document root ของ subdomain (เช่น public_html/fixdesk) อย่าอัปโหลดทับ public_html ของโดเมนหลัก"
echo "  4. เช็ค permission ของ laravel-app/storage, laravel-app/bootstrap/cache และโฟลเดอร์ document root (สำหรับ uploads/) ให้เขียนได้ (755 หรือ 775)"
echo "  5. เลือก PHP 8.2 ขึ้นไปให้ subdomain ใน DirectAdmin และเปิด gd, zip, mbstring, pdo_mysql"
