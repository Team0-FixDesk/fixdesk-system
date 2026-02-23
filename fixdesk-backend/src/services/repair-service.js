/**
 * =====================================================================
 * @file            repair-service.js
 * @layer           Service Layer (Business Logic Layer)
 * @version         1.3.0
 * @since           2026-02-10
 * @author          พชร ไพศรีสกุล
 * @contributors
 *   - พชร ไพศรีสกุล
 *   - นราธิป แสนทวีสุข
 *   - เศรษฐพงศ์ หอมชื่น
 *
 * @lastModified    2026-02-22
 * @lastModifiedBy  นราธิป แสนทวีสุข
 * ---------------------------------------------------------------------
 * @description
 *  Service Layer สำหรับจัดการตรรกะการทำานหลักของระบบแจ้งซ่อม
 *  โดยทำหน้าที่เชื่อมต่อกับฐานข้อมูล และดำเนินการ business logic
 *  ที่เกี่ยวข้องกับ lifecycle ของใบแจ้งซ่อม การมอบหมายงาน และการติดตามสถานะ
 *
 *  รองรับการทำงาน:
 *    - สร้างใบแจ้งซ่อม และสร้างรหัสใบแจ้งซ่อมอัตโนมัติ
 *    - แสดงรายการแจ้งซ่อม (Admin, User, Technician)
 *    - แสดงรายละเอียดใบแจ้งซ่อม
 *    - แก้ไข และลบใบแจ้งซ่อม
 *    - มอบหมายช่างรายบุคคล และแบบทีม
 *    - กำหนดหัวหน้าทีม (Lead Technician)
 *    - รับงานซ่อม (acceptJob)
 *    - เปลี่ยนสถานะงานซ่อม (pending, in_progress, done)
 *    - ดึงข้อมูลวัสดุ/อุปกรณ์ที่เบิกจากระบบ stock
 *    - ส่ง LINE Notification เมื่อมีการมอบหมายงาน หรือรับงาน
 *
 *  ใช้ Transaction ในกรณี:
 *    - assignTeam (ป้องกัน assignment ไม่สมบูรณ์)
 *
 * @requires
 *   - mysql2 (Database connection ผ่าน db instance)
 *   - ./line-notification.service
 *   - fs
 *   - path
 *
 * @databaseTables
 *   - repair_form
 *   - repair_assignment
 *   - user
 *   - technician_type
 *   - title_name
 *   - room
 *   - floor
 *   - building
 *   - stock_form
 *   - stock_form_detail
 *   - products
 *
 * @dataFlow
 *   Controller → Service → Database
 *
 * @responsibility
 *   - ประมวลผล business logic ของระบบแจ้งซ่อม
 *   - ควบคุม transaction
 *   - รวมข้อมูลจากหลายตาราง
 *   - จัดรูปแบบข้อมูลก่อนส่งกลับ Controller
 *   - เชื่อมต่อกับระบบ stock
 *   - เชื่อมต่อกับ LINE Notification Service
 *
 * ---------------------------------------------------------------------
 * @changelog
 *   - Initial implementation Public Service ตาม Layered Architecture
 *     [2026-02-10, พชร ไพศรีสกุล] V 1.0.0
 *   - feat(line): เพิ่มระบบแจงเตอน LINE แบบ Flex Message และแกไขการรบงานเปนทม
 *     [2026-02-11, นราธิป แสนทวีสุข] V 1.1.0
 *   - feat(frontend backend): เพิ่มระบบการคืนอุปกรณ์
 *     [2026-02-17, พชร ไพศรีสกุล] V 1.2.0
 *   - fix(report): แก้ไขคำนำหน้าชื่อใน PDF และ UI ปุ่มดาวน์โหลด
 *     [2026-02-17, นราธิป แสนทวีสุข] V 1.2.1
 *   - fix(frontend): แก้เงื่อนไขการแสดงกราฟ
 *     [2026-02-21, เศรษฐพงศ์ หอมชื่น] V 1.2.2
 *   - feat(repair): เปลี่ยนโครงสร้างการบันทึกวิธีการซ่อมและผลการซ่อม
 *     [2026-02-22, นราธิป แสนทวีสุข] V 1.3.0
 *
 * =====================================================================
 */

const path = require("path");
const fs = require("fs");
const lineNotification = require("./line-notification.service");

module.exports = (db) => {
  return {
    // --- Helper: สร้างรหัส RF ---
    async generateRFCode() {
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const countSql =
        "SELECT COUNT(*) AS count FROM repair_form WHERE DATE(rf_create_at) = CURDATE()";

      const [rows] = await db.promise().query(countSql);
      const todayCount = rows[0].count + 1;
      const runningNumber = String(todayCount).padStart(3, "0");

      return `RF${datePart}${runningNumber}`;
    },

    // --- CREATE ---
    async createRepair(data) {
      // 1. สร้างรหัส
      const rfCode = await this.generateRFCode();

      // 2. เตรียมข้อมูลรูปภาพ (JSON string)
      const imageData =
        data.filePaths && data.filePaths.length > 0
          ? JSON.stringify(data.filePaths)
          : null;

      // 3. บันทึกข้อมูล
      const sql = `
        INSERT INTO repair_form
          (rf_code, rf_us_id, rf_tt_id, rf_room_id, rf_prop_number,
          rf_problem, rf_detail, rf_phone, rf_urgency, rf_image,
          rf_user_status, rf_create_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
      `;

      const params = [
        rfCode,
        data.usId,
        data.repairTypeId,
        data.roomId,
        data.assetCode,
        data.problemDetail,
        data.issueDescription,
        data.phoneNumber,
        data.urgency,
        imageData,
      ];

      const [result] = await db.promise().query(sql, params);
      return { insertId: result.insertId, rfCode };
    },

    // --- READ (Admin) ---
    async getAdminRepairs() {
      const sql = `
        SELECT
          rf.rf_id, rf.rf_code, rf.rf_problem, rf.rf_create_at, rf.rf_update_at, rf.rf_in_process_at, rf.rf_done_at, rf.rf_user_status, rf.rf_repair_method, rf.rf_repair_method_remark,
          b.bd_name, f.fl_name, r.room_name,
          COALESCE(rf.rf_urgency, 'medium') AS rf_urgency,
          u.us_first_name_th AS us_first_name, u.us_last_name_th AS us_last_name,
          u.us_department AS department_name,
          tt.tt_name,
          tech.us_first_name_th AS tech_first_name, tech.us_last_name_th AS tech_last_name,
          ra.ra_us_id AS rf_assigned_tech_id
        FROM repair_form rf
        LEFT JOIN user u ON rf.rf_us_id = u.us_id
        LEFT JOIN technician_type tt ON rf.rf_tt_id = tt.tt_id
        LEFT JOIN room r ON rf.rf_room_id = r.room_id
        LEFT JOIN floor f ON r.room_fl_id = f.fl_id
        LEFT JOIN building b ON f.fl_bd_id = b.bd_id
        LEFT JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id AND ra.ra_is_lead = 1
        LEFT JOIN user tech ON ra.ra_us_id = tech.us_id
        ORDER BY rf.rf_create_at DESC
      `;
      const [rows] = await db.promise().query(sql);
      return rows;
    },

    // --- READ (User) ---
    async getUserRepairs(userId) {
      const sql = `
        SELECT
          rf.rf_id, rf.rf_code, rf.rf_prop_number, rf.rf_problem,
          rf.rf_urgency, rf.rf_user_status, rf.rf_create_at,
          b.bd_name, f.fl_name, r.room_name,
          u.us_department AS department_name, tt.tt_name AS tt_name
        FROM repair_form rf
        LEFT JOIN technician_type tt ON rf.rf_tt_id = tt.tt_id
        LEFT JOIN room r ON rf.rf_room_id = r.room_id
        LEFT JOIN floor f ON r.room_fl_id = f.fl_id
        LEFT JOIN building b ON f.fl_bd_id = b.bd_id
        LEFT JOIN user u ON rf.rf_us_id = u.us_id
        WHERE rf.rf_us_id = ?
        ORDER BY rf.rf_create_at DESC
      `;
      const [rows] = await db.promise().query(sql, [userId]);
      return rows;
    },

    // --- READ (Detail) ---
    async getRepairDetail(code) {
      const sql = `
        SELECT
          rf.rf_id, rf.rf_code, rf.rf_problem, rf.rf_detail, rf.rf_urgency,
          rf.rf_phone, rf.rf_create_at, rf.rf_in_process_at, rf.rf_done_at,
          rf.rf_user_status, rf.rf_prop_number, rf.rf_image, rf.rf_tech_summary,
          rf.rf_repair_method, rf.rf_repair_method_remark, rf.rf_result_status, rf.rf_result_remark,
          t.tt_id AS repair_type_id, t.tt_name AS repair_type_name,
          b.bd_id AS building_id, b.bd_name AS building_name,
          f.fl_id AS floor_id, f.fl_name AS floor_name,
          r.room_id AS room_id, r.room_name AS room_name,
          CONCAT(tn.ttn_title_th, u.us_first_name_th, ' ', u.us_last_name_th) AS reporter_name,
          u.us_phone AS reporter_phone, u.us_department AS reporter_department,
          tech.us_id AS main_technician_id,
          CONCAT(tn_tech.ttn_title_th, tech.us_first_name_th, ' ', tech.us_last_name_th) AS main_technician_name,
          tt_tech.tt_name AS main_technician_position,
          assigner.us_id AS assigner_id,
          CONCAT(tn_assigner.ttn_title_th, assigner.us_first_name_th, ' ', assigner.us_last_name_th) AS assigner_name,
          tn_assigner.ttn_title_th AS assigner_title,
          assigner.us_first_name_th AS assigner_first_name,
          assigner.us_last_name_th AS assigner_last_name
        FROM repair_form rf
        LEFT JOIN room r ON rf.rf_room_id = r.room_id
        LEFT JOIN floor f ON r.room_fl_id = f.fl_id
        LEFT JOIN building b ON f.fl_bd_id = b.bd_id
        LEFT JOIN technician_type t ON rf.rf_tt_id = t.tt_id
        LEFT JOIN user u ON rf.rf_us_id = u.us_id
        LEFT JOIN title_name tn ON u.us_ttn_id = tn.ttn_id
        LEFT JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id AND ra.ra_is_lead = 1
        LEFT JOIN user tech ON ra.ra_us_id = tech.us_id
        LEFT JOIN title_name tn_tech ON tech.us_ttn_id = tn_tech.ttn_id
        LEFT JOIN technician_type tt_tech ON tech.us_tt_id = tt_tech.tt_id
        LEFT JOIN user assigner ON ra.ra_assigned_by = assigner.us_id
        LEFT JOIN title_name tn_assigner ON assigner.us_ttn_id = tn_assigner.ttn_id
        WHERE rf.rf_code = ?
      `;

      const [rows] = await db.promise().query(sql, [code]);
      if (rows.length === 0) return null;

      const r = rows[0];
      const result = {
        ...r,
        rf_image: r.rf_image ? JSON.parse(r.rf_image) : null,
        reporter: {
          name: r.reporter_name,
          phone: r.reporter_phone,
          department: r.reporter_department,
        },
        assigner: {
          id: r.assigner_id,
          name: r.assigner_name || "-",
          title: r.assigner_title || "",
          first_name: r.assigner_first_name || "",
          last_name: r.assigner_last_name || "",
        },
        main_technician: r.main_technician_name || "-",
        tech_position: r.main_technician_position || "-",
      };

      // ดึง Stock Items (ของที่เบิก)
      const stockSql = `
        SELECT pd.pd_id, pd.pd_name, sf.sf_code,  pd.pd_asset_code, pd.pd_upload_image, sfd.sfd_qty, sfd.sfd_status
        FROM stock_form sf
        LEFT JOIN stock_form_detail sfd ON sfd.sfd_sf_id = sf.sf_id
        LEFT JOIN products pd ON pd.pd_id = sfd.sfd_pd_id
        WHERE sf.sf_rf_id = ?
      `;
      const [stockRows] = await db.promise().query(stockSql, [r.rf_id]);
      result.stock_items = stockRows.map((i) => ({
        id: i.pd_id,
        sf_code: i.sf_code,
        name: i.pd_name,
        assetCode: i.pd_asset_code,
        qty: i.sfd_qty,
        status: i.sfd_status,
        img: i.pd_upload_image,
      }));

      return result;
    },

    // --- UPDATE ---
    async updateRepair(code, data) {
      const sql = `
        UPDATE repair_form SET
          rf_us_id=?, rf_tt_id=?, rf_room_id=?, rf_prop_number=?,
          rf_problem=?, rf_detail=?, rf_phone=?, rf_urgency=?, rf_image=?,
          rf_update_at=NOW()
        WHERE rf_code=? AND rf_user_status='pending'
      `;
      const imageData =
        data.filePaths && data.filePaths.length > 0
          ? JSON.stringify(data.filePaths)
          : null;

      const params = [
        data.usId || null,
        data.repairTypeId,
        data.roomId,
        data.assetCode || null,
        data.problemDetail,
        data.issueDescription || "-",
        data.phoneNumber || null,
        data.urgency || "medium",
        imageData,
        code,
      ];

      const [result] = await db.promise().query(sql, params);
      return result.affectedRows;
    },

    // --- DELETE ---
    async deleteRepair(code) {
      const sql =
        "DELETE FROM repair_form WHERE rf_code = ? AND rf_user_status = 'pending'";
      const [result] = await db.promise().query(sql, [code]);
      return result.affectedRows;
    },

    // --- ASSIGNMENT (Individual) ---
    async assignIndividual(rfCode, techId, isLead, assignerId) {
      // 1. เช็คว่าเป็นช่างจริงไหม
      const [tech] = await db
        .promise()
        .query("SELECT us_id, us_role_id FROM user WHERE us_id = ?", [techId]);
      if (!tech.length) throw new Error("TECH_NOT_FOUND");
      if (Number(tech[0].us_role_id) !== 2) throw new Error("NOT_A_TECHNICIAN");

      // 2. หา rf_id
      const [rf] = await db
        .promise()
        .query("SELECT rf_id FROM repair_form WHERE rf_code = ?", [rfCode]);
      if (!rf.length) throw new Error("REPAIR_NOT_FOUND");
      const rfId = rf[0].rf_id;

      // 3. เช็คว่ามีงานอยู่แล้วไหม
      const [existing] = await db
        .promise()
        .query(
          "SELECT ra_id FROM repair_assignment WHERE ra_rf_id = ? AND ra_us_id = ?",
          [rfId, techId],
        );

      if (existing.length > 0) {
        if (isLead) {
          // ถ้าซ้ำแต่จะปรับเป็น Lead -> เคลียร์คนอื่น แล้วตั้งคนนี้
          await db
            .promise()
            .query(
              "UPDATE repair_assignment SET ra_is_lead = 0 WHERE ra_rf_id = ?",
              [rfId],
            );
          await db
            .promise()
            .query(
              "UPDATE repair_assignment SET ra_is_lead = 1 WHERE ra_rf_id = ? AND ra_us_id = ?",
              [rfId, techId],
            );
          return { status: "UPDATED_TO_LEAD" };
        }
        return { status: "ALREADY_ASSIGNED" };
      }

      // 4. Insert งานใหม่
      await db
        .promise()
        .query(
          "INSERT INTO repair_assignment (ra_rf_id, ra_us_id, ra_is_lead, ra_assigned_at, ra_assigned_by) VALUES (?, ?, ?, NOW(), ?)",
          [rfId, techId, isLead ? 1 : 0, assignerId],
        );

      // 5. ถ้าเป็น Lead ให้เคลียร์คนอื่น
      if (isLead) {
        await db
          .promise()
          .query(
            "UPDATE repair_assignment SET ra_is_lead = 0 WHERE ra_rf_id = ? AND ra_us_id <> ?",
            [rfId, techId],
          );
      }

      // 6. ส่ง LINE Notification
      try {
        const [notifData] = await db.promise().query(
          `
          SELECT
            rf.rf_code, rf.rf_problem, rf.rf_urgency,
            CONCAT(tn_tech.ttn_title_th, tech.us_first_name_th, ' ', tech.us_last_name_th) AS technician_name,
            CONCAT(tn_assign.ttn_title_th, assigner.us_first_name_th, ' ', assigner.us_last_name_th) AS assigned_by_name,
            CONCAT(b.bd_name, ' ', f.fl_name, ' ', r.room_name) AS location,
            tt.tt_name AS technician_type
          FROM repair_form rf
          LEFT JOIN user tech ON tech.us_id = ?
          LEFT JOIN title_name tn_tech ON tech.us_ttn_id = tn_tech.ttn_id
          LEFT JOIN user assigner ON assigner.us_id = ?
          LEFT JOIN title_name tn_assign ON assigner.us_ttn_id = tn_assign.ttn_id
          LEFT JOIN room r ON rf.rf_room_id = r.room_id
          LEFT JOIN floor f ON r.room_fl_id = f.fl_id
          LEFT JOIN building b ON f.fl_bd_id = b.bd_id
          LEFT JOIN technician_type tt ON rf.rf_tt_id = tt.tt_id
          WHERE rf.rf_id = ?
        `,
          [techId, assignerId, rfId],
        );

        if (notifData.length > 0) {
          await lineNotification.notifyJobAssignment({
            rf_code: notifData[0].rf_code,
            technician_name: notifData[0].technician_name,
            assigned_by_name: notifData[0].assigned_by_name,
            repair_title: notifData[0].rf_problem,
            location: notifData[0].location,
            technician_type: notifData[0].technician_type,
            urgency: notifData[0].rf_urgency,
            is_team: false,
          });
        }
      } catch (lineError) {
        console.error("LINE notification failed:", lineError.message);
      }

      return { status: "SUCCESS" };
    },

    // --- ASSIGNMENT (Team) - Transactional ---
    async assignTeam(rfCode, techIds, leadId) {
      console.log("🔍 assignTeam service - Input:", {
        rfCode,
        techIds,
        leadId,
      });
      try {
        // Start transaction
        await db.promise().query("START TRANSACTION");
        console.log("🔍 Transaction started");

        // 1. Lock & Get RF ID
        const [rf] = await db
          .promise()
          .query("SELECT rf_id FROM repair_form WHERE rf_code = ? FOR UPDATE", [
            rfCode,
          ]);
        console.log("🔍 Repair form query result:", rf);
        if (!rf.length) throw new Error("REPAIR_NOT_FOUND");
        const rfId = rf[0].rf_id;
        console.log("🔍 RF ID:", rfId);

        // 2. Verify Technicians
        const placeholders = techIds.map(() => "?").join(",");
        const [techs] = await db
          .promise()
          .query(
            `SELECT us_id, us_role_id FROM user WHERE us_id IN (${placeholders})`,
            techIds,
          );
        console.log("🔍 Technicians found:", techs);

        if (techs.length !== techIds.length)
          throw new Error("SOME_TECHS_NOT_FOUND");
        const nonTechs = techs.filter((t) => Number(t.us_role_id) !== 2);
        if (nonTechs.length > 0) throw new Error("SOME_USERS_ARE_NOT_TECHS");

        // 3. Delete Old Assignments
        const [deleteResult] = await db
          .promise()
          .query("DELETE FROM repair_assignment WHERE ra_rf_id = ?", [rfId]);
        console.log("🔍 Deleted old assignments:", deleteResult);

        // 4. Insert New Assignments
        const values = techIds.map((tid) => [
          rfId,
          tid,
          tid === leadId ? 1 : 0,
          new Date(),
        ]);
        console.log("🔍 Inserting assignments:", values);
        await db
          .promise()
          .query(
            "INSERT INTO repair_assignment (ra_rf_id, ra_us_id, ra_is_lead, ra_assigned_at) VALUES ?",
            [values],
          );
        console.log("🔍 Assignments inserted");

        // Commit transaction
        await db.promise().query("COMMIT");
        console.log("🔍 Transaction committed");

        // Send LINE Notification
        try {
          const [notifData] = await db.promise().query(
            `
            SELECT
              rf.rf_code, rf.rf_problem, rf.rf_urgency,
              GROUP_CONCAT(CONCAT(tn.ttn_title_th, u.us_first_name_th, ' ', u.us_last_name_th) SEPARATOR ', ') AS technician_names,
              CONCAT(b.bd_name, ' ', f.fl_name, ' ', r.room_name) AS location,
              tt.tt_name AS technician_type
            FROM repair_form rf
            LEFT JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id
            LEFT JOIN user u ON ra.ra_us_id = u.us_id
            LEFT JOIN title_name tn ON u.us_ttn_id = tn.ttn_id
            LEFT JOIN room r ON rf.rf_room_id = r.room_id
            LEFT JOIN floor f ON r.room_fl_id = f.fl_id
            LEFT JOIN building b ON f.fl_bd_id = b.bd_id
            LEFT JOIN technician_type tt ON rf.rf_tt_id = tt.tt_id
            WHERE rf.rf_id = ?
            GROUP BY rf.rf_id
          `,
            [rfId],
          );

          // ดึงชื่อหัวหน้าทีม (lead)
          const [leadData] = await db.promise().query(
            `
            SELECT CONCAT(tn.ttn_title_th, u.us_first_name_th, ' ', u.us_last_name_th) AS lead_name
            FROM repair_assignment ra
            LEFT JOIN user u ON ra.ra_us_id = u.us_id
            LEFT JOIN title_name tn ON u.us_ttn_id = tn.ttn_id
            WHERE ra.ra_rf_id = ? AND ra.ra_is_lead = 1
            LIMIT 1
          `,
            [rfId],
          );

          if (notifData.length > 0) {
            await lineNotification.notifyJobAssignment({
              rf_code: notifData[0].rf_code,
              technician_name: notifData[0].technician_names,
              assigned_by_name: "-",
              repair_title: notifData[0].rf_problem,
              location: notifData[0].location,
              technician_type: notifData[0].technician_type,
              urgency: notifData[0].rf_urgency,
              lead_name: leadData.length > 0 ? leadData[0].lead_name : null,
              is_team: true,
            });
          }
        } catch (lineError) {
          console.error("LINE notification failed:", lineError.message);
        }

        return { assignedCount: techIds.length };
      } catch (error) {
        await db.promise().query("ROLLBACK");
        console.error("🔍 Transaction rolled back due to error");
        throw error;
      }
    },

    // --- TECH ACTIONS ---
    async acceptJob(rfCode, techId) {
      const sql = `
        UPDATE repair_form rf
        JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id
        SET
          rf.rf_user_status = 'in_progress', rf.rf_in_process_at = NOW(), rf.rf_update_at = NOW(),
          ra.ra_is_lead = 1, ra.ra_accepted_at = NOW()
        WHERE rf.rf_code = ? AND ra.ra_us_id = ? AND rf.rf_user_status = 'pending'
      `;
      const [result] = await db.promise().query(sql, [rfCode, techId]);

      // Send LINE Notification
      if (result.affectedRows > 0) {
        try {
          const [notifData] = await db.promise().query(
            `
            SELECT
              rf.rf_code, rf.rf_problem, rf.rf_urgency,
              CONCAT(tn.ttn_title_th, u.us_first_name_th, ' ', u.us_last_name_th) AS technician_name,
              CONCAT(b.bd_name, ' ', f.fl_name, ' ', r.room_name) AS location,
              tt.tt_name AS technician_type
            FROM repair_form rf
            LEFT JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id AND ra.ra_us_id = ?
            LEFT JOIN user u ON ra.ra_us_id = u.us_id
            LEFT JOIN title_name tn ON u.us_ttn_id = tn.ttn_id
            LEFT JOIN room r ON rf.rf_room_id = r.room_id
            LEFT JOIN floor f ON r.room_fl_id = f.fl_id
            LEFT JOIN building b ON f.fl_bd_id = b.bd_id
            LEFT JOIN technician_type tt ON rf.rf_tt_id = tt.tt_id
            WHERE rf.rf_code = ?
          `,
            [techId, rfCode],
          );

          if (notifData.length > 0) {
            await lineNotification.notifyJobAccepted({
              rf_code: notifData[0].rf_code,
              technician_name: notifData[0].technician_name,
              repair_title: notifData[0].rf_problem,
              location: notifData[0].location,
              technician_type: notifData[0].technician_type,
              urgency: notifData[0].rf_urgency,
            });
          }
        } catch (lineError) {
          console.error("LINE notification failed:", lineError.message);
        }
      }

      return result.affectedRows;
    },

    async getTechRepairs(techId) {
      const sql = `
        SELECT
          rf.rf_id, rf.rf_code, rf.rf_create_at, rf.rf_user_status, rf.rf_problem,
          COALESCE(rf.rf_urgency, 'medium') AS rf_urgency,
          u.us_first_name_th AS us_first_name, u.us_last_name_th AS us_last_name, u.us_department AS department_name,
          tt.tt_name, r.room_name, f.fl_name, b.bd_name,
          ra.ra_id, ra.ra_is_lead, ra.ra_assigned_at, ra.ra_accepted_at
        FROM repair_form rf
        INNER JOIN repair_assignment ra ON rf.rf_id = ra.ra_rf_id
        LEFT JOIN user u ON rf.rf_us_id = u.us_id
        LEFT JOIN technician_type tt ON rf.rf_tt_id = tt.tt_id
        LEFT JOIN room r ON rf.rf_room_id = r.room_id
        LEFT JOIN floor f ON r.room_fl_id = f.fl_id
        LEFT JOIN building b ON f.fl_bd_id = b.bd_id
        WHERE ra.ra_us_id = ?
        ORDER BY rf.rf_create_at DESC
      `;
      const [rows] = await db.promise().query(sql, [techId]);
      return rows;
    },

    async getStats(userId) {
      const sql = `
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(CASE WHEN rf_user_status = 'pending' THEN 1 ELSE 0 END), 0) AS pending,
          COALESCE(SUM(CASE WHEN rf_user_status = 'in_progress' THEN 1 ELSE 0 END), 0) AS in_progress,
          COALESCE(SUM(CASE WHEN rf_user_status = 'done' THEN 1 ELSE 0 END), 0) AS completed
        FROM repair_form WHERE rf_us_id = ?
      `;
      const [rows] = await db.promise().query(sql, [userId]);
      return rows[0];
    },
  };
};
