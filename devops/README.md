# 🧰 DevOps (Docker & Deployment)

ส่วนนี้คือ “โครงสร้างสำหรับการรันระบบทั้งหมดด้วย Docker Compose”  
ใช้เพื่อให้สามารถเปิดระบบ **Frontend + Backend + Database** ได้ในคำสั่งเดียว  
โดยไม่ต้องติดตั้ง Node.js หรือ MySQL ในเครื่อง

devops/
├── docker-compose.yml # รวม service ทั้งหมด: frontend, backend, database
├── Dockerfile.frontend # วิธี build container สำหรับ Vue.js
├── Dockerfile.backend # วิธี build container สำหรับ Node.js (Express)
├── .env.example # ตัวอย่าง environment variables
├── nginx.conf # ตั้งค่า reverse proxy สำหรับ frontend (ถ้ามี)
└── README.md # คำอธิบาย DevOps ทั้งหมด

🔍 ตารางอธิบายไฟล์
ไฟล์	หน้าที่
docker-compose.yml	รวมทุก container (frontend + backend + database) ให้รันพร้อมกัน
Dockerfile.frontend	กำหนดวิธี build Vue.js app และเสิร์ฟผ่าน Nginx
Dockerfile.backend	กำหนดวิธี build backend (Express server)
.env.example	ตัวอย่างค่าตัวแปร environment เช่น DB_HOST, DB_USER
nginx.conf	ตั้งค่า reverse proxy (optional สำหรับ production)
README.md	คู่มืออธิบาย DevOps ทั้งหมด

คำสั่งที่ใช้บ่อย
คำสั่ง	ความหมาย
docker-compose build	สร้าง image ใหม่จาก Dockerfile
docker-compose up -d	รันระบบแบบ background
docker-compose down	ปิดระบบทั้งหมด
docker ps	ดู container ที่กำลังรันอยู่
docker logs <service>	ดู log ของ container เช่น backend หรือ database
docker system prune	ล้าง cache และ image ที่ไม่ใช้แล้ว