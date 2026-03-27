/**
 * =====================================================================
 * @file            template-service.js
 * @layer           Application Layer (Service)
 * @version         1.0.0
 * @since           2026-03-21
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *
 * @lastModified    2026-03-21
 * @lastModifiedBy  พชร ไพศรีสกุล
 * ---------------------------------------------------------------------
 * @description
 *  Service สำหรับจัดการการสร้างไฟล์ Template Excel
 *  ทำหน้าที่:
 *  - ประสานงานกับ Database เพื่อดึงข้อมูลที่จำเป็นสำหรับสร้าง Template
 *  - ใช้ไลบรารี ExcelJS ในการสร้างไฟล์ Excel ตามโครงสร้างที่กำหนด
 *  - รองรับการสร้าง Template สำหรับ Users, Locations และ Stocks
 *  - โครงสร้างเป็นแบบ Layered Architecture
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  [2026-03-21, พชร ไพศรีสกุล] V 1.0.0
 *  - เพิ่มฟังก์ชัน generateUserTemplate, generateLocationTemplate และ generateStockTemplate
 *  - Initial implementation Template Excel Generation Service
 *
 * =====================================================================
*/

const ExcelJS = require("exceljs");

exports.generateUserTemplate = async (db) => {
  // 1. ดึงข้อมูลจาก Database โดยตรง
  const [roleRows] = await db
    .promise()
    .query("SELECT role_name FROM role WHERE role_name <> 'Superadmin'");
  let roles = roleRows.map((r) => r.role_name);
  if (roles.length === 0) {
    roles = ["Admin", "Technician", "User", "Stock", "Manager"];
  }

  const [titleRows] = await db
    .promise()
    .query("SELECT ttn_title_th FROM title_name");
  let titles = titleRows.map((t) => t.ttn_title_th);
  if (titles.length === 0) {
    titles = ["นาย", "นาง", "นางสาว"];
  }

  // 2. สร้าง Workbook
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Users");

  // 3. กำหนดหัวตารางและความกว้างคอลัมน์
  sheet.columns = [
    { header: "ชื่อผู้ใช้ *", key: "username", width: 18 },
    { header: "คำนำหน้าชื่อ *", key: "prefix", width: 15 },
    { header: "ตำแหน่งบุคลากร *", key: "position", width: 22 },
    { header: "ชื่อ (ภาษาไทย) *", key: "fname_th", width: 22 },
    { header: "นามสกุล (ภาษาไทย) *", key: "lname_th", width: 22 },
    { header: "ชื่อ (English) *", key: "fname_en", width: 22 },
    { header: "นามสกุล (English) *", key: "lname_en", width: 22 },
    { header: "เบอร์โทรศัพท์ *", key: "phone", width: 18 },
    { header: "ชื่อหน่วยงาน *", key: "department", width: 25 },
    { header: "บทบาท *", key: "role", width: 18 },
    { header: "ตำแหน่งช่าง", key: "tech_position", width: 22 },
  ];

  // ตกแต่งหัวตาราง (แถวที่ 1)
  const headerRow = sheet.getRow(1);
  headerRow.height = 25; // เพิ่มความสูงให้หัวตาราง
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 }; // ตัวอักษรสีขาว หนา
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0048EF" }, // สีพื้นหลังน้ำเงิน (โทนเดียวกับปุ่มหน้าเว็บ)
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" }; // จัดกึ่งกลาง

  // ใส่เส้นขอบตารางให้แถวหัวข้อ
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // เพิ่มข้อมูลตัวอย่าง (แถวที่ 2)
  const exampleRow = sheet.addRow({
    username: "somchai.j",
    prefix: titles[0] || "นาย",
    position: "เจ้าหน้าที่ปฏิบัติการ",
    fname_th: "สมชาย",
    lname_th: "ใจดี",
    fname_en: "Somchai",
    lname_en: "Jaidee",
    phone: "0812345678",
    department: "แผนกไอที",
    role: roles.includes("User") ? "User" : roles[0] || "User",
    tech_position: "-", // เว้นไว้ถ้าไม่ใช่ช่าง
  });

  // ตกแต่งแถวตัวอย่างให้ดูรู้ว่าเป็นแค่ตัวอย่าง (ตัวเอียง, สีเทา)
  exampleRow.font = { italic: true, color: { argb: "FF888888" } };
  exampleRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF9F9F9" }, // พื้นหลังสีเทาอ่อนๆ
  };
  exampleRow.alignment = { vertical: "middle" };

  // ใส่คำอธิบายตรงคอลัมน์ด้านข้าง
  sheet.getCell("M1").value =
    "หมายเหตุ: ช่องที่มีเครื่องหมาย * เป็นข้อมูลบังคับที่จำเป็นต้องระบุ";
  sheet.getCell("M1").font = { color: { argb: "FFFF0000" }, bold: true };

  sheet.getCell("M2").value =
    "(แถวนี้คือข้อมูลตัวอย่าง สามารถลบทิ้งหรือพิมพ์ทับได้เลย)";
  sheet.getCell("M2").font = { color: { argb: "FF888888" }, italic: true };

  // ใส่ Dropdown (Data Validation) ตั้งแต่แถวที่ 2 ถึง 1000
  for (let i = 2; i <= 1000; i++) {
    // Dropdown คอลัมน์ B (คำนำหน้าชื่อ)
    sheet.getCell(`B${i}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${titles.join(",")}"`],
      showErrorMessage: true,
      errorTitle: "ข้อมูลไม่ถูกต้อง",
      error: "กรุณาเลือกคำนำหน้าชื่อจาก Dropdown ที่มีให้เท่านั้น",
    };

    // Dropdown คอลัมน์ J (บทบาท)
    sheet.getCell(`J${i}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${roles.join(",")}"`],
      showErrorMessage: true,
      errorTitle: "ข้อมูลไม่ถูกต้อง",
      error: "กรุณาเลือกบทบาทจาก Dropdown ที่มีให้เท่านั้น",
    };
  }

  // ส่งคืนตัว workbook กลับไปให้ Controller
  return workbook;
};

exports.generateLocationTemplate = async (db) => {
  // 1. ดึงข้อมูลจาก Database ตามโครงสร้างที่คุณให้มา

  // ดึงชื่อตึกทั้งหมด
  const [bRows] = await db
    .promise()
    .query("SELECT bd_name FROM building ORDER BY bd_id ASC");
  let buildings = bRows.map((b) => b.bd_name);
  // ถ้ายังไม่มีตึกในระบบเลย ให้ใส่ค่า Default ไว้กัน Error
  if (buildings.length === 0) {
    buildings = ["ตึกคอมพิวเตอร์", "อาคารอำนวยการ"];
  }

  // ดึงชื่อชั้นทั้งหมด (ใช้ DISTINCT เพื่อไม่ให้ชื่อชั้นซ้ำกันใน Dropdown)
  const [fRows] = await db
    .promise()
    .query("SELECT DISTINCT fl_name FROM floor ORDER BY fl_name ASC");
  let floors = fRows.map((f) => f.fl_name);
  // ถ้ายังไม่มีชั้นในระบบเลย
  if (floors.length === 0) {
    floors = ["1", "2", "3", "4", "5"];
  }

  // 2. สร้าง Workbook และ Worksheet
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Locations");

  // 3. กำหนดหัวตารางและความกว้างคอลัมน์
  sheet.columns = [
    { header: "ชื่อสถานที่/ห้อง *", key: "room_name", width: 35 },
    { header: "ชื่อตึก *", key: "building_name", width: 30 },
    { header: "ชั้น *", key: "floor_name", width: 20 },
  ];

  // ตกแต่งหัวตาราง (แถวที่ 1)
  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  // ลงสีพื้นหลัง ใส่กรอบ และทำดอกจันสีแดงให้ข้อมูลบังคับ
  sheet.columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);

    // แยกข้อความกับดอกจัน (*) เพื่อให้ดอกจันเป็นสีแดง
    const headerText = column.header.replace(" *", "");
    cell.value = {
      richText: [
        {
          font: { bold: true, color: { argb: "FFFFFFFF" }, size: 12 },
          text: headerText,
        },
        {
          font: { bold: true, color: { argb: "FFFF0000" }, size: 12 },
          text: " *",
        },
      ],
    };

    // เทสีพื้นหลังสีน้ำเงิน (โทนเดียวกับฟอร์ม User)
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0048EF" },
    };

    // ใส่เส้นขอบ
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // เพิ่มข้อมูลตัวอย่าง (แถวที่ 2)
  const exampleRow = sheet.addRow({
    room_name: "ห้อง LAB 101",
    building_name: buildings[0] || "ตึกคอมพิวเตอร์",
    floor_name: floors[0] || "1",
  });

  // ตกแต่งแถวตัวอย่าง (ตัวเอียง, สีเทา, พื้นหลังเทาอ่อน)
  exampleRow.font = { italic: true, color: { argb: "FF888888" } };
  exampleRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF9F9F9" },
  };
  exampleRow.alignment = { vertical: "middle" };

  // ใส่คำอธิบายตรงคอลัมน์ด้านข้าง
  sheet.getCell("E1").value =
    "หมายเหตุ: ช่องที่มีเครื่องหมาย * เป็นข้อมูลบังคับที่จำเป็นต้องระบุ";
  sheet.getCell("E1").font = { color: { argb: "FFFF0000" }, bold: true };

  sheet.getCell("E2").value =
    "(แถวนี้คือข้อมูลตัวอย่าง สามารถลบทิ้งหรือพิมพ์ทับได้เลย)";
  sheet.getCell("E2").font = { color: { argb: "FF888888" }, italic: true };

  // ใส่ Dropdown (Data Validation) ตั้งแต่แถวที่ 2 ถึง 1000
  for (let i = 2; i <= 1000; i++) {
    // Dropdown คอลัมน์ B (ชื่อตึก)
    sheet.getCell(`B${i}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${buildings.join(",")}"`],
      showErrorMessage: true,
      errorTitle: "ข้อมูลไม่ถูกต้อง",
      error: "กรุณาเลือกชื่อตึกจาก Dropdown ที่มีให้เท่านั้น",
    };

    // Dropdown คอลัมน์ C (ชั้น)
    sheet.getCell(`C${i}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${floors.join(",")}"`],
      showErrorMessage: true,
      errorTitle: "ข้อมูลไม่ถูกต้อง",
      error: "กรุณาเลือกชั้นจาก Dropdown ที่มีให้เท่านั้น",
    };
  }

  return workbook;
};

exports.generateStockTemplate = async (db) => {
  // 1. ดึงข้อมูลจาก Database ตามโครงสร้างใน stock-service

  // ดึงหมวดหมู่ (Categories)
  const [catRows] = await db
    .promise()
    .query("SELECT ct_name FROM categories ORDER BY ct_name ASC");
  let categories = catRows.map((c) => c.ct_name);
  if (categories.length === 0)
    categories = ["วัสดุไฟฟ้า", "อุปกรณ์คอมพิวเตอร์", "เครื่องใช้สำนักงาน"];

  // ดึงหน่วยนับ (Units)
  const [unitRows] = await db
    .promise()
    .query("SELECT units_name FROM units ORDER BY units_name ASC");
  let units = unitRows.map((u) => u.units_name);
  if (units.length === 0) units = ["ชิ้น", "อัน", "ชุด", "ตัว", "กล่อง"];

  // กำหนดสถานะสินค้า
  const statuses = ["พร้อมใช้งาน", "รอเติมสต็อก", "ระงับการใช้งาน"];

  // 2. สร้าง Workbook
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Stocks");

  // 3. กำหนดหัวตาราง (อิงตามไฟล์ CSV ที่คุณส่งมา)
  sheet.columns = [
    { header: "ชื่อรายการ *", key: "pd_name", width: 30 },
    { header: "หมายเลขครุภัณฑ์", key: "pd_asset_code", width: 20 },
    { header: "หมวดหมู่ *", key: "category", width: 20 },
    { header: "จำนวน *", key: "pd_quantity", width: 15 },
    { header: "หน่วยนับ *", key: "unit", width: 15 },
    { header: "สถานะ *", key: "status", width: 20 },
  ];

  // ---------------------------------------------------------
  // 🎨 ตกแต่งหัวตาราง (Blue Theme + Red Asterisk)
  // ---------------------------------------------------------
  const headerRow = sheet.getRow(1);
  headerRow.height = 25;
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  sheet.columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    const headerText = column.header.replace(" *", "");

    cell.value = {
      richText: [
        {
          font: { bold: true, color: { argb: "FFFFFFFF" }, size: 12 },
          text: headerText,
        },
        column.header.includes("*")
          ? {
              font: { bold: true, color: { argb: "FFFF0000" }, size: 12 },
              text: " *",
            }
          : { text: "" },
      ],
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0048EF" },
    };

    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // ---------------------------------------------------------
  // 📝 เพิ่มข้อมูลตัวอย่าง (แถวที่ 2)
  // ---------------------------------------------------------
  const exampleRow = sheet.addRow({
    pd_name: "เมาส์ไร้สาย Logitech",
    pd_asset_code: "IT-67-001",
    category: categories[0],
    pd_quantity: 10,
    unit: units[0],
    status: statuses[0],
  });

  exampleRow.font = { italic: true, color: { argb: "FF888888" } };
  exampleRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF9F9F9" },
  };

  // หมายเหตุด้านข้าง
  sheet.getCell("H1").value =
    "หมายเหตุ: ช่องที่มีเครื่องหมาย * เป็นข้อมูลบังคับที่จำเป็นต้องระบุ";
  sheet.getCell("H1").font = { color: { argb: "FFFF0000" }, bold: true };
  sheet.getCell("H2").value = "👈 (สามารถลบแถวตัวอย่างนี้ทิ้งได้เลย)";
  sheet.getCell("H2").font = { color: { argb: "FF888888" }, italic: true };

  // ---------------------------------------------------------
  // 📌 ใส่ Dropdown (Data Validation) ตั้งแต่แถวที่ 2 ถึง 1000
  // ---------------------------------------------------------
  for (let i = 2; i <= 1000; i++) {
    // Dropdown หมวดหมู่ (คอลัมน์ C)
    sheet.getCell(`C${i}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${categories.join(",")}"`],
      showErrorMessage: true,
      errorTitle: "ข้อมูลไม่ถูกต้อง",
      error: "กรุณาเลือกหมวดหมู่จากรายการเท่านั้น",
    };

    // Dropdown หน่วยนับ (คอลัมน์ E)
    sheet.getCell(`E${i}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${units.join(",")}"`],
      showErrorMessage: true,
      errorTitle: "ข้อมูลไม่ถูกต้อง",
      error: "กรุณาเลือกหน่วยนับจากรายการเท่านั้น",
    };

    // Dropdown สถานะ (คอลัมน์ F)
    sheet.getCell(`F${i}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${statuses.join(",")}"`],
      showErrorMessage: true,
      errorTitle: "ข้อมูลไม่ถูกต้อง",
      error: "กรุณาเลือกสถานะจากรายการเท่านั้น",
    };
  }

  return workbook;
};
