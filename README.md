# FixDesk System

ระบบจัดการแจ้งซ่อมอุปกรณ์ (FixDesk)  
พัฒนาโดยทีม Zero | Vue.js + Node.js + MySQL

## 📦 โครงสร้างระบบ
- **frontend/** : ระบบหน้าเว็บ (Vue 3 + Vite)
- **backend/** : ระบบ API (Node.js + Express)
- **docs/** : เอกสารและแผนภาพต่าง ๆ

## 🧭 โฟลว์การทำงานโดยสรุป
1. ผู้ใช้ส่งใบแจ้งซ่อมจากหน้าเว็บ (frontend)
2. ข้อมูลถูกส่งไปยัง backend ผ่าน API
3. backend ตรวจสอบและบันทึกลงฐานข้อมูล
4. ช่างดูงานผ่าน dashboard และอัปเดตสถานะ

## ⚙️ วิธีรันเบื้องต้น
```bash
cd backend && npm install && npm start
cd frontend && npm install && npm run dev



---

## 🎯 สรุปแนวคิด
| หมวด | หน้าที่หลัก |
|-------|----------------|
| `backend/` | API + Database |
| `frontend/` | UI + Interaction |
| `docs/` | เอกสารอ้างอิง |
| `docker-compose.yml` | รวมทุก service ไว้รันพร้อมกัน |
| `README.md` | แนะนำระบบโดยรวม |

---

อยากไหมครับพี่ ให้ผมช่วย **เพิ่ม README ย่อย** ภายในแต่ละโฟลเดอร์  
(เช่น `backend/README.md`, `frontend/README.md`, `docs/README.md`)  
โดยใส่อธิบายละเอียดขึ้นอีกนิด เช่นแต่ละโฟลเดอร์ย่อยเก็บอะไร ใช้เมื่อไหร่ พร้อมตัวอย่างสั้น ๆ?  
มันจะเหมาะมากถ้าพี่จะใช้เป็น **คู่มือทีม** หรือ **ส่งให้อาจารย์ประกอบรายงาน** ครับ ❤️
