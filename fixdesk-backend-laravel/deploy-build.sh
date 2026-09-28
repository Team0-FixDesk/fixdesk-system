#!/usr/bin/env bash
# สร้างแพ็กเกจสำหรับอัปโหลดขึ้น Ruk-Com Shared Hosting (ไม่มี SSH/composer บน server)
#
# ผลลัพธ์: โฟลเดอร์ deploy/ แบ่งเป็น 2 ส่วน
#   deploy/laravel-app/  -> อัปโหลดไปไว้นอก public_html (เข้าเว็บไม่ได้โดยตรง)
#   deploy/public_html/  -> อัปโหลดทับเนื้อหาใน public_html ของโดเมน/ซับโดเมน
#
# โครงสร้างบนเซิร์ฟเวอร์ต้องเป็นแบบนี้ (laravel-app กับ public_html อยู่ระดับเดียวกัน):
#   your-domain-folder/
#     ├── laravel-app/   (จากโฟลเดอร์นี้)
#     └── public_html/   (จากโฟลเดอร์นี้ - นี่คือ document root จริง)
#
# รันสคริปต์นี้จากโฟลเดอร์ fixdesk-backend-laravel: bash deploy-build.sh

set -e
cd "$(dirname "$0")"

COMPOSER="/c/Users/uSeR/.config/herd-lite/bin/composer.bat"
DEPLOY_DIR="deploy"

echo "==> สำรอง .env production เดิม (ถ้ามี) ก่อนลบแพ็กเกจเก่า"
if [ -f "$DEPLOY_DIR/laravel-app/.env" ]; then
  cp "$DEPLOY_DIR/laravel-app/.env" /tmp/fixdesk-prod.env.bak
fi
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR/laravel-app" "$DEPLOY_DIR/public_html"

echo "==> build vendor แบบ production (ไม่มี dev dependencies)"
# --ignore-platform-reqs: เครื่อง local นี้ไม่มี ext-gd (Herd Lite เป็น PHP แบบ minimal)
# แต่ shared hosting ทั่วไป (รวม Ruk-Com) มี gd เปิดอยู่แล้วเป็นค่า default เป็นแค่ข้อจำกัดของเครื่อง dev เท่านั้น
"$COMPOSER" install --no-dev --optimize-autoloader --no-interaction --ignore-platform-reqs

echo "==> คัดลอกไฟล์แอป (ยกเว้น public/, .git, deploy/)"
tar --exclude='./public' \
    --exclude='./.git' \
    --exclude='./deploy' \
    --exclude='./deploy-build.sh' \
    --exclude='./node_modules' \
    --exclude='./.env' \
    --exclude='./tests' \
    -cf - . | tar -xf - -C "$DEPLOY_DIR/laravel-app/"

echo "==> คัดลอก public/ ไปเป็น public_html"
cp -r public/. "$DEPLOY_DIR/public_html/"

echo "==> แก้ path ใน index.php ให้ชี้ไปที่ laravel-app/ (sibling folder)"
sed -i \
  -e "s#__DIR__.'/../vendor/autoload.php'#__DIR__.'/../laravel-app/vendor/autoload.php'#" \
  -e "s#__DIR__.'/../bootstrap/app.php'#__DIR__.'/../laravel-app/bootstrap/app.php'#" \
  -e "s#__DIR__.'/../storage/framework/maintenance.php'#__DIR__.'/../laravel-app/storage/framework/maintenance.php'#" \
  "$DEPLOY_DIR/public_html/index.php"

if [ -f /tmp/fixdesk-prod.env.bak ]; then
  echo "==> กู้คืน .env production เดิมที่เคยแก้ไว้"
  cp /tmp/fixdesk-prod.env.bak "$DEPLOY_DIR/laravel-app/.env"
  rm /tmp/fixdesk-prod.env.bak
else
  echo "==> ยังไม่มี .env production เดิม สร้างจาก .env.example ให้ (ต้องแก้ค่าก่อนอัปโหลด!)"
  cp .env.example "$DEPLOY_DIR/laravel-app/.env"
fi

echo "==> คืนค่า vendor local ให้กลับมามี dev dependencies เหมือนเดิม"
"$COMPOSER" install --no-interaction --ignore-platform-reqs

echo ""
echo "เสร็จแล้ว! ไฟล์อยู่ใน $DEPLOY_DIR/"
echo "ก่อนอัปโหลด อย่าลืม:"
echo "  1. แก้ $DEPLOY_DIR/laravel-app/.env ให้เป็นค่าจริงของ Ruk-Com (DB, APP_KEY, APP_URL, APP_ENV=production, APP_DEBUG=false)"
echo "  2. อัปโหลด laravel-app/ ไปไว้นอก public_html (โฟลเดอร์ระดับเดียวกัน)"
echo "  3. อัปโหลดเนื้อหาใน public_html/ ทับ public_html เดิมของโดเมน"
echo "  4. เช็ค permission โฟลเดอร์ laravel-app/storage และ laravel-app/bootstrap/cache ต้องเขียนได้ (755 หรือ 775)"
