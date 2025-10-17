หน้าที่:
ส่วนนี้คือฝั่ง “Server” ทำงานกับฐานข้อมูล และรับ–ส่งข้อมูลกับ frontend ผ่าน API
backend/
├── config/          # ตั้งค่าฐานข้อมูล และ environment
├── controllers/     # จัดการ logic ของ API
├── middleware/      # ส่วนตรวจสอบ เช่น auth, error handling
├── models/          # โครงสร้างข้อมูล (ตาราง DB)
├── routes/          # เส้นทาง API เช่น /api/users /api/tickets
├── utils/           # ฟังก์ชันช่วยเหลือ เช่น token, logger
├── index.js         # จุดเริ่มต้นรัน server
├── package.json     # รายชื่อ dependencies + script
└── README.md        # คำอธิบายการใช้งาน backend

ไฟล์	                        หน้าที่
index.js	                    ไฟล์หลักของ Express server (เริ่มต้นระบบ)
config/db.js	                ตั้งค่าเชื่อมต่อฐานข้อมูล
controllers/userController.js	จัดการ logic เกี่ยวกับผู้ใช้ เช่น login/register
controllers/ticketController.js	จัดการ logic เกี่ยวกับใบแจ้งซ่อม
middleware/authMiddleware.js	ตรวจสอบ token ก่อนเข้าหน้าบางหน้า
middleware/errorMiddleware.js	แสดงข้อความ error ให้เหมาะสม
models/User.js	                กำหนด schema ของผู้ใช้ใน DB
models/Ticket.js	            กำหนด schema ของใบงานใน DB
routes/userRoutes.js	        ตั้ง endpoint เช่น /api/users
routes/ticketRoutes.js	        ตั้ง endpoint เช่น /api/tickets
utils/token.js	                ฟังก์ชันสร้างและตรวจ token JWT