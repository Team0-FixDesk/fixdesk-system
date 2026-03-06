/**
 * =====================================================================
 * @file            line-notification.service.js
 * @layer           Service (Business Logic Layer)
 * @version         1.2.0
 * @since           2025-01-15
 * @author          นราธิป แสนทวีสุข
 * @lastModified    2026-03-05
 * @lastModifiedBy  นราธิป แสนทวีสุข
 * ---------------------------------------------------------------------
 * @description
 *  Service สำหรับส่งการแจ้งเตือนไปยัง LINE Group ผ่าน LINE Bot SDK
 *  ใช้สำหรับ:
 *    - แจ้งเตือนการมอบหมายงานช่าง (แบบเดี่ยวและทีม)
 *    - แจ้งเตือนเมื่อช่างรับงาน
 *    - แจ้งเตือนเมื่อมีงานแจ้งซ่อมใหม่
 *    - ส่งข้อความทดสอบระบบ
 *    - รองรับ Flex Message พร้อม UI ที่สวยงาม
 *    - แสดงข้อมูลความเร่งด่วน, สถานที่, ช่าง, และรายละเอียดงาน
 *    - ป้องกัน Rate Limit 429 ด้วย Message Queue และ Exponential Backoff
 *
 * @dependencies
 *   - @line/bot-sdk (LINE Messaging API)
 *
 * @environment
 *   - LINE_CHANNEL_ACCESS_TOKEN: Access token ของ LINE Bot
 *   - LINE_CHANNEL_SECRET: Channel secret ของ LINE Bot
 *   - LINE_GROUP_ID: Group ID ที่ต้องการส่งข้อความ
 *   - FRONTEND_URL: URL ของ frontend สำหรับปุ่มลิงก์
 *
 * @exports
 *   - notifyJobAssignment(assignmentData): ส่งการแจ้งเตือนการมอบหมายงาน
 *   - notifyJobAccepted(acceptData): ส่งการแจ้งเตือนการรับงาน
 *   - testNotification(): ทดสอบการส่งข้อความ
 *
 * ---------------------------------------------------------------------
 * @changelog
 *  - เพิ่มการรองรับ Retry-After header และเพิ่ม delay เป็น 2s, 5s, 15s, 30s, 60s  [2026-03-05, นราธิป แสนทวีสุข]
 *  - เพิ่ม RATE_LIMIT_DELAY เป็น 2 วินาที และเพิ่ม MAX_RETRIES เป็น 4 ครั้ง       [2026-03-05, นราธิป แสนทวีสุข]
 *  - เพิ่ม Message Queue และ Rate Limiting เพื่อป้องกัน 429 Error                [2026-03-05, นราธิป แสนทวีสุข]
 *  - เพิ่ม Exponential Backoff Retry mechanism (2s, 5s, 10s)                     [2026-03-05, นราธิป แสนทวีสุข]
 *  - เพิ่มการจัดการ Rate Limit 1 วินาที ระหว่างการส่งข้อความ                     [2026-03-05, นราธิป แสนทวีสุข]
 *  - เปลี่ยน GROUP_ID จาก hardcode เป็น environment variable (LINE_GROUP_ID)   [2026-02-17, นราธิป แสนทวีสุข]
 *  - เพิ่มการตรวจสอบและ warning เมื่อไม่มี GROUP_ID                               [2026-02-17, นราธิป แสนทวีสุข]
 *  - เพิ่ม notifyNewRepair สำหรับแจ้งเตือนเมื่อมีงานแจ้งซ่อมใหม่เข้าระบบ         [2026-02-25, นราธิป แสนทวีสุข]
 * =====================================================================
 */
const line = require('@line/bot-sdk');

/**
 * LINE Notification Service
 * ส่งการแจ้งเตือนไปยัง LINE Group เมื่อมีการมอบหมายงาน
 */

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || ''
};

// Group ID ที่ต้องการส่งข้อความ
// หมายเหตุ: ถ้าบอทเข้ากลุ่มใหม่ ให้แก้ไขค่า LINE_GROUP_ID ในไฟล์ .env
const TARGET_GROUP_ID = process.env.LINE_GROUP_ID || '';

let client = null;

// Queue และ Rate Limiting
const messageQueue = [];
let isProcessingQueue = false;
const RATE_LIMIT_DELAY = 2000; // 2 วินาที ระหว่างการส่งแต่ละข้อความ (เพิ่มจาก 1 วินาที)
const MAX_RETRIES = 4; // เพิ่มจาก 3 เป็น 4 ครั้ง
const RETRY_DELAYS = [5000, 15000, 30000, 60000]; // 5, 15, 30, 60 วินาที (เพิ่มความล่าช้า)

// สร้าง LINE client เมื่อมี credentials
if (config.channelAccessToken && config.channelSecret) {
  client = new line.Client(config);
  
  if (!TARGET_GROUP_ID) {
    console.warn('⚠️ LINE_GROUP_ID is not set in environment variables. Notifications will not be sent.');
  }
}

/**
 * ส่งข้อความผ่าน Queue พร้อม Rate Limiting และ Retry
 * @param {Object} message - LINE message object
 * @param {number} retryCount - จำนวนครั้งที่ retry แล้ว
 */
async function sendMessageWithRetry(message, retryCount = 0) {
  try {
    await client.pushMessage(TARGET_GROUP_ID, message);
    return { success: true };
  } catch (error) {
    // ถ้าเป็น error 429 (Too Many Requests) ให้ retry
    if (error.statusCode === 429 && retryCount < MAX_RETRIES) {
      // ตรวจสอบ Retry-After header จาก LINE API
      let delay = RETRY_DELAYS[retryCount];
      
      if (error.originalError?.response?.headers?.['retry-after']) {
        const retryAfter = parseInt(error.originalError.response.headers['retry-after']);
        if (!isNaN(retryAfter)) {
          delay = Math.max(retryAfter * 1000, delay); // ใช้ค่าที่มากกว่า
          console.warn(`⚠️ Rate limit hit (429). LINE API suggests waiting ${retryAfter}s. Using ${delay/1000}s...`);
        }
      } else {
        console.warn(`⚠️ Rate limit hit (429). Retrying in ${delay/1000} seconds... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendMessageWithRetry(message, retryCount + 1);
    }
    
    throw error;
  }
}

/**
 * เพิ่มข้อความเข้า Queue และประมวลผล
 * @param {Object} message - LINE message object
 */
async function queueMessage(message) {
  return new Promise((resolve, reject) => {
    messageQueue.push({ message, resolve, reject });
    processQueue();
  });
}

/**
 * ประมวลผล Queue ทีละข้อความพร้อม Rate Limiting
 */
async function processQueue() {
  if (isProcessingQueue || messageQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (messageQueue.length > 0) {
    const { message, resolve, reject } = messageQueue.shift();

    try {
      await sendMessageWithRetry(message);
      resolve({ success: true });
    } catch (error) {
      console.error('❌ Failed to send message after retries:', error.message);
      reject(error);
    }

    // รอ delay ก่อนส่งข้อความถัดไป (Rate Limiting)
    if (messageQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }

  isProcessingQueue = false;
}

/**
 * ส่งข้อความแจ้งเตือนการมอบหมายงาน
 * @param {Object} assignmentData - ข้อมูลการมอบหมาย
 * @param {string} assignmentData.rf_code - รหัสใบแจ้งซ่อม
 * @param {string} assignmentData.technician_name - ชื่อช่าง
 * @param {string} assignmentData.assigned_by_name - ชื่อผู้มอบหมาย
 * @param {string} assignmentData.repair_title - หัวข้อการซ่อม
 * @param {string} assignmentData.location - สถานที่
 * @param {string} assignmentData.technician_type - ประเภทช่าง
 * @param {string} assignmentData.urgency - ความเร่งด่วน (low/medium/high)
 * @param {string} assignmentData.lead_name - ชื่อหัวหน้าทีม (สำหรับทีม)
 * @param {boolean} assignmentData.is_team - เป็นการมอบหมายทีมหรือไม่
 */
async function notifyJobAssignment(assignmentData) {
  if (!client || !TARGET_GROUP_ID) {
    console.warn('⚠️ LINE notification is not configured or GROUP_ID is missing. Skipping notification.');
    return { success: false, message: 'LINE not configured or GROUP_ID missing' };
  }

  try {
    const {
      rf_code,
      technician_name,
      assigned_by_name,
      repair_title,
      location,
      technician_type,
      urgency = 'medium',
      lead_name,
      is_team = false
    } = assignmentData;

    // กำหนดสีและข้อความตามความเร่งด่วน
    const urgencyConfig = {
      high: { color: '#DC2626', bgColor: '#FEE2E2', text: '🔴 เร่งด่วนมาก', textColor: '#991B1B' },
      medium: { color: '#F59E0B', bgColor: '#FEF3C7', text: '🟡 ปานกลาง', textColor: '#92400E' },
      low: { color: '#10B981', bgColor: '#D1FAE5', text: '🟢 ไม่เร่งด่วน', textColor: '#065F46' }
    };
    const urgencyInfo = urgencyConfig[urgency] || urgencyConfig.medium;

    const headerText = is_team ? '🔧 มอบหมายงานช่างแบบทีม' : '👤 มอบหมายงานช่างใหม่';
    const assignerDisplay = is_team && lead_name ? lead_name : (assigned_by_name || '-');
    const currentTime = new Date().toLocaleString('th-TH', { 
      timeZone: 'Asia/Bangkok',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const message = {
      type: 'flex',
      altText: `${headerText}: ${rf_code}`,
      contents: {
        type: 'bubble',
        size: 'giga',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: headerText,
              weight: 'bold',
              size: 'xl',
              color: '#ffffff'
            }
          ],
          backgroundColor: '#0367D1'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: 'รหัสงาน:',
                  size: 'sm',
                  color: '#8c8c8c',
                  flex: 2
                },
                {
                  type: 'text',
                  text: rf_code || '-',
                  size: 'sm',
                  color: '#111111',
                  align: 'end',
                  weight: 'bold',
                  flex: 4
                }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'md',
              contents: [
                {
                  type: 'text',
                  text: 'ความเร่งด่วน:',
                  size: 'sm',
                  color: '#8c8c8c',
                  flex: 2
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: urgencyInfo.text,
                      size: 'xs',
                      color: urgencyInfo.textColor,
                      weight: 'bold',
                      align: 'center',
                      gravity: 'center'
                    }
                  ],
                  backgroundColor: urgencyInfo.bgColor,
                  paddingAll: '5px',
                  cornerRadius: 'md',
                  flex: 4,
                  justifyContent: 'flex-end'
                }
              ]
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              spacing: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'md',
                  contents: [
                    {
                      type: 'text',
                      text: '🔧',
                      size: 'sm',
                      flex: 1
                    },
                    {
                      type: 'text',
                      text: technician_name || '-',
                      size: 'sm',
                      color: '#111111',
                      flex: 9,
                      weight: 'bold',
                      wrap: true
                    }
                  ]
                },
                ...(technician_type ? [{
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'md',
                  contents: [
                    {
                      type: 'text',
                      text: '⚙️',
                      size: 'sm',
                      flex: 1
                    },
                    {
                      type: 'text',
                      text: technician_type,
                      size: 'sm',
                      color: '#555555',
                      flex: 9
                    }
                  ]
                }] : []),
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'md',
                  contents: [
                    {
                      type: 'text',
                      text: '📝',
                      size: 'sm',
                      flex: 1
                    },
                    {
                      type: 'text',
                      text: repair_title || '-',
                      size: 'sm',
                      color: '#111111',
                      flex: 9,
                      wrap: true
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'md',
                  contents: [
                    {
                      type: 'text',
                      text: '📍',
                      size: 'sm',
                      flex: 1
                    },
                    {
                      type: 'text',
                      text: location || '-',
                      size: 'sm',
                      color: '#111111',
                      flex: 9,
                      wrap: true
                    }
                  ]
                }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              backgroundColor: '#F0F0F0',
              paddingAll: '10px',
              cornerRadius: 'md',
              contents: [
                {
                  type: 'text',
                  text: `👔 ${is_team ? 'หัวหน้าทีม' : 'มอบหมายโดย'}: ${assignerDisplay}`,
                  size: 'xs',
                  color: '#555555'
                },
                {
                  type: 'text',
                  text: `⏰ เวลา: ${currentTime}`,
                  size: 'xs',
                  color: '#555555',
                  margin: 'xs'
                }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: 'ดูรายละเอียดบนเว็บไซต์',
                uri: process.env.FRONTEND_URL || 'https://fixdesk.zeenontakorn-demo.xyz/login#/login'
              },
              style: 'primary',
              color: '#0367D1'
            }
          ]
        }
      }
    };

    await queueMessage(message);
    
    console.log('✅ LINE notification sent successfully for:', rf_code);
    return { success: true, message: 'Notification sent' };
  } catch (error) {
    console.error('❌ Failed to send LINE notification:', error.message);
    return { success: false, message: error.message };
  }
}

/**
 * ส่งข้อความแจ้งเตือนการรับงาน
 * @param {Object} acceptData - ข้อมูลการรับงาน
 * @param {string} acceptData.rf_code - รหัสใบแจ้งซ่อม
 * @param {string} acceptData.technician_name - ชื่อช่าง
 * @param {string} acceptData.repair_title - หัวข้อการซ่อม
 * @param {string} acceptData.location - สถานที่
 * @param {string} acceptData.technician_type - ประเภทช่าง
 * @param {string} acceptData.urgency - ความเร่งด่วน
 */
async function notifyJobAccepted(acceptData) {
  if (!client || !TARGET_GROUP_ID) {
    console.warn('⚠️ LINE notification is not configured or GROUP_ID is missing. Skipping notification.');
    return { success: false, message: 'LINE not configured or GROUP_ID missing' };
  }

  try {
    const { 
      rf_code, 
      technician_name, 
      repair_title, 
      location,
      technician_type,
      urgency = 'medium'
    } = acceptData;

    // กำหนดสีและข้อความตามความเร่งด่วน
    const urgencyConfig = {
      high: { color: '#DC2626', bgColor: '#FEE2E2', text: '🔴 เร่งด่วนมาก', textColor: '#991B1B' },
      medium: { color: '#F59E0B', bgColor: '#FEF3C7', text: '🟡 ปานกลาง', textColor: '#92400E' },
      low: { color: '#10B981', bgColor: '#D1FAE5', text: '🟢 ไม่เร่งด่วน', textColor: '#065F46' }
    };
    const urgencyInfo = urgencyConfig[urgency] || urgencyConfig.medium;

    const currentTime = new Date().toLocaleString('th-TH', { 
      timeZone: 'Asia/Bangkok',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const message = {
      type: 'flex',
      altText: `✅ ช่างรับงานแล้ว: ${rf_code}`,
      contents: {
        type: 'bubble',
        size: 'giga',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '✅ ช่างรับงานแล้ว',
              weight: 'bold',
              size: 'xl',
              color: '#ffffff'
            }
          ],
          backgroundColor: '#10B981'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: 'รหัสงาน:',
                  size: 'sm',
                  color: '#8c8c8c',
                  flex: 2
                },
                {
                  type: 'text',
                  text: rf_code || '-',
                  size: 'sm',
                  color: '#111111',
                  align: 'end',
                  weight: 'bold',
                  flex: 4
                }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'md',
              contents: [
                {
                  type: 'text',
                  text: 'ความเร่งด่วน:',
                  size: 'sm',
                  color: '#8c8c8c',
                  flex: 2
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: urgencyInfo.text,
                      size: 'xs',
                      color: urgencyInfo.textColor,
                      weight: 'bold',
                      align: 'center',
                      gravity: 'center'
                    }
                  ],
                  backgroundColor: urgencyInfo.bgColor,
                  paddingAll: '5px',
                  cornerRadius: 'md',
                  flex: 4,
                  justifyContent: 'flex-end'
                }
              ]
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              spacing: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'md',
                  contents: [
                    {
                      type: 'text',
                      text: '🔧',
                      size: 'sm',
                      flex: 1
                    },
                    {
                      type: 'text',
                      text: technician_name || '-',
                      size: 'sm',
                      color: '#111111',
                      flex: 9,
                      weight: 'bold',
                      wrap: true
                    }
                  ]
                },
                ...(technician_type ? [{
                  type: 'box',
                 layout: 'baseline',
                  spacing: 'md',
                  contents: [
                    {
                      type: 'text',
                      text: '⚙️',
                      size: 'sm',
                      flex: 1
                    },
                    {
                      type: 'text',
                      text: technician_type,
                      size: 'sm',
                      color: '#555555',
                      flex: 9
                    }
                  ]
                }] : []),
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'md',
                  contents: [
                    {
                      type: 'text',
                      text: '📝',
                      size: 'sm',
                      flex: 1
                    },
                    {
                      type: 'text',
                      text: repair_title || '-',
                      size: 'sm',
                      color: '#111111',
                      flex: 9,
                      wrap: true
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'md',
                  contents: [
                    {
                      type: 'text',
                      text: '📍',
                      size: 'sm',
                      flex: 1
                    },
                    {
                      type: 'text',
                      text: location || '-',
                      size: 'sm',
                      color: '#111111',
                      flex: 9,
                      wrap: true
                    }
                  ]
                }
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              backgroundColor: '#F0F0F0',
              paddingAll: '10px',
              cornerRadius: 'md',
              contents: [
                {
                  type: 'text',
                  text: `⏰ เวลารับงาน: ${currentTime}`,
                  size: 'xs',
                  color: '#555555'
                }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: 'ดูรายละเอียดบนเว็บไซต์',
                uri: process.env.FRONTEND_URL || 'https://fixdesk.zeenontakorn-demo.xyz/login#/login'
              },
              style: 'primary',
              color: '#10B981'
            }
          ]
        }
      }
    };

    await queueMessage(message);
    
    console.log('✅ LINE acceptance notification sent for:', rf_code);
    return { success: true, message: 'Notification sent' };
  } catch (error) {
    console.error('❌ Failed to send LINE acceptance notification:', error.message);
    return { success: false, message: error.message };
  }
}


/**
 * ส่งข้อความแจ้งเตือนเมื่อมีงานแจ้งซ่อมใหม่เข้ามา
 * @param {Object} newRepairData - ข้อมูลใบแจ้งซ่อมใหม่
 * @param {string} newRepairData.rf_code - รหัสใบแจ้งซ่อม
 * @param {string} newRepairData.user_name - ชื่อผู้แจ้งซ่อม
 * @param {string} newRepairData.repair_title - หัวข้อการซ่อม
 * @param {string} newRepairData.location - สถานที่
 * @param {string} newRepairData.repair_type - ประเภทการซ่อม
 * @param {string} newRepairData.urgency - ความเร่งด่วน (low/medium/high)
 * @param {string} newRepairData.phone - เบอร์โทรติดต่อ
 */
async function notifyNewRepair(newRepairData) {
  if (!client || !TARGET_GROUP_ID) {
    console.warn('⚠️ LINE notification is not configured or GROUP_ID is missing. Skipping notification.');
    return { success: false, message: 'LINE not configured or GROUP_ID missing' };
  }

  try {
    const {
      rf_code,
      user_name,
      repair_title,
      location,
      repair_type,
      urgency = 'medium',
      phone
    } = newRepairData;

    // กำหนดสีและข้อความตามความเร่งด่วน
    const urgencyConfig = {
      high: { color: '#DC2626', bgColor: '#FEE2E2', text: '🔴 เร่งด่วนมาก', textColor: '#991B1B' },
      medium: { color: '#F59E0B', bgColor: '#FEF3C7', text: '🟡 ปานกลาง', textColor: '#92400E' },
      low: { color: '#10B981', bgColor: '#D1FAE5', text: '🟢 ไม่เร่งด่วน', textColor: '#065F46' }
    };
    const urgencyInfo = urgencyConfig[urgency] || urgencyConfig.medium;

    const currentTime = new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const message = {
      type: 'flex',
      altText: `🆕 มีงานแจ้งซ่อมใหม่: ${rf_code}`,
      contents: {
        type: 'bubble',
        size: 'giga',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🆕 มีงานแจ้งซ่อมใหม่',
              weight: 'bold',
              size: 'xl',
              color: '#ffffff'
            }
          ],
          backgroundColor: '#F97316'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: 'รหัสงาน:',
                  size: 'sm',
                  color: '#8c8c8c',
                  flex: 2
                },
                {
                  type: 'text',
                  text: rf_code || '-',
                  size: 'sm',
                  color: '#111111',
                  align: 'end',
                  weight: 'bold',
                  flex: 4
                }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'md',
              contents: [
                {
                  type: 'text',
                  text: 'ความเร่งด่วน:',
                  size: 'sm',
                  color: '#8c8c8c',
                  flex: 2
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: urgencyInfo.text,
                      size: 'xs',
                      color: urgencyInfo.textColor,
                      weight: 'bold',
                      align: 'center',
                      gravity: 'center'
                    }
                  ],
                  backgroundColor: urgencyInfo.bgColor,
                  paddingAll: '5px',
                  cornerRadius: 'md',
                  flex: 4,
                  justifyContent: 'flex-end'
                }
              ]
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              spacing: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'md',
                  contents: [
                    {
                      type: 'text',
                      text: '👤',
                      size: 'sm',
                      flex: 1
                    },
                    {
                      type: 'text',
                      text: user_name || '-',
                      size: 'sm',
                      color: '#111111',
                      flex: 9,
                      weight: 'bold',
                      wrap: true
                    }
                  ]
                },
                ...(repair_type ? [{
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'md',
                  contents: [
                    {
                      type: 'text',
                      text: '⚙️',
                      size: 'sm',
                      flex: 1
                    },
                    {
                      type: 'text',
                      text: repair_type,
                      size: 'sm',
                      color: '#555555',
                      flex: 9
                    }
                  ]
                }] : []),
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'md',
                  contents: [
                    {
                      type: 'text',
                      text: '📝',
                      size: 'sm',
                      flex: 1
                    },
                    {
                      type: 'text',
                      text: repair_title || '-',
                      size: 'sm',
                      color: '#111111',
                      flex: 9,
                      wrap: true
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'md',
                  contents: [
                    {
                      type: 'text',
                      text: '📍',
                      size: 'sm',
                      flex: 1
                    },
                    {
                      type: 'text',
                      text: location || '-',
                      size: 'sm',
                      color: '#111111',
                      flex: 9,
                      wrap: true
                    }
                  ]
                },
                ...(phone ? [{
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'md',
                  contents: [
                    {
                      type: 'text',
                      text: '📞',
                      size: 'sm',
                      flex: 1
                    },
                    {
                      type: 'text',
                      text: phone,
                      size: 'sm',
                      color: '#111111',
                      flex: 9
                    }
                  ]
                }] : [])
              ]
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              backgroundColor: '#FFF7ED',
              paddingAll: '10px',
              cornerRadius: 'md',
              contents: [
                {
                  type: 'text',
                  text: '⏰ เวลาแจ้งซ่อม: ' + currentTime,
                  size: 'xs',
                  color: '#555555'
                },
                {
                  type: 'text',
                  text: '⚠️ กรุณามอบหมายช่างโดยเร็วที่สุด',
                  size: 'xs',
                  color: '#EA580C',
                  weight: 'bold',
                  margin: 'sm'
                }
              ]
            }
          ]
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: 'มอบหมายช่างเลย',
                uri: process.env.FRONTEND_URL || 'https://fixdesk.zeenontakorn-demo.xyz/login#/login'
              },
              style: 'primary',
              color: '#F97316'
            }
          ]
        }
      }
    };

    await queueMessage(message);
    
    console.log('✅ LINE new repair notification sent successfully for:', rf_code);
    return { success: true, message: 'New repair notification sent' };
  } catch (error) {
    console.error('❌ Failed to send LINE new repair notification:', error.message);
    return { success: false, message: error.message };
  }
}

/**
 * ทดสอบการส่งข้อความ
 */
async function testNotification() {
  if (!client || !TARGET_GROUP_ID) {
    return { success: false, message: 'LINE not configured or GROUP_ID missing' };
  }

  try {
    const message = {
      type: 'text',
      text: '🔔 ทดสอบการแจ้งเตือนจากระบบ FixDesk\n\nการแจ้งเตือนทำงานปกติ ✅'
    };

    await queueMessage(message);
    return { success: true, message: 'Test notification sent' };
  } catch (error) {
    console.error('❌ Test notification failed:', error.message);
    return { success: false, message: error.message };
  }
}

module.exports = {
  notifyJobAssignment,
  notifyJobAccepted,
  notifyNewRepair,
  testNotification
};
