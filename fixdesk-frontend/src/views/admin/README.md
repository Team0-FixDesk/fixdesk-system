Admin Views — FixDesk System
รวมหน้าแสดงผล (View) สำหรับผู้ดูแลระบบ (Admin)
ใช้มาตรฐานการตั้งชื่อไฟล์ตาม [Coding Standard] 
รูปแบบ kebab-case สำหรับชื่อไฟล์ .vue
และ PascalCase + View สำหรับชื่อ Component ภายในไฟล์

ไฟล์ (.vue)	                    ชื่อ Component ภายใน	        หน้าที่ / คำอธิบาย
admin-home-view.vue	            AdminHomeView	            หน้าแรกของระบบสำหรับผู้ดูแล
admin-check-request-view.vue	AdminCheckRequestView	    หน้าตรวจสอบรายละเอียดคำร้องเฉพาะ
admin-user-info-view.vue	    AdminUserInfoView	        หน้าจัดการข้อมูลผู้ใช้ทั้งหมดในระบบ เช่น เพิ่ม/แก้ไขสิทธิ์, ลบผู้ใช้, ดูประวัติการใช้งาน
admin-summary-view.vue	        AdminSummaryView	        หน้าสรุปผลรวมของการแจ้งซ่อม เช่น สถิติรายเดือน, อัตรางานเสร็จ, ประสิทธิภาพทีมช่าง
admin-manage-location-view.vue	AdminManageLocationView	    หน้าจัดการข้อมูลสถานที่ เช่น อาคาร, ชั้น, ห้อง เพื่อให้ระบบสามารถเลือกสถานที่แจ้งซ่อมได้ถูกต้อง
admin-report-view.vue	        AdminReportView	            หน้าสร้างรายงานในรูปแบบต่าง ๆ (PDF/Excel) เพื่อใช้สำหรับสรุปผลหรือการวิเคราะห์ข้อมูลระบบ