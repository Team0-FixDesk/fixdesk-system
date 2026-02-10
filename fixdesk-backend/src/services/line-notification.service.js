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
const TARGET_GROUP_ID = 'C34fe2055e4c53e85632cc38354059ab7';

let client = null;

// สร้าง LINE client เมื่อมี credentials
if (config.channelAccessToken && config.channelSecret) {
  client = new line.Client(config);
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
  if (!client) {
    console.warn('⚠️ LINE notification is not configured. Skipping notification.');
    return { success: false, message: 'LINE not configured' };
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
                uri: process.env.FRONTEND_URL || 'http://dekdee2.informatics.buu.ac.th:8057/#/home'
              },
              style: 'primary',
              color: '#0367D1'
            }
          ]
        }
      }
    };

    await client.pushMessage(TARGET_GROUP_ID, message);
    
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
  if (!client) {
    console.warn('⚠️ LINE notification is not configured. Skipping notification.');
    return { success: false, message: 'LINE not configured' };
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
                uri: process.env.FRONTEND_URL || 'http://dekdee2.informatics.buu.ac.th:8057/#/home'
              },
              style: 'primary',
              color: '#10B981'
            }
          ]
        }
      }
    };

    await client.pushMessage(TARGET_GROUP_ID, message);
    
    console.log('✅ LINE acceptance notification sent for:', rf_code);
    return { success: true, message: 'Notification sent' };
  } catch (error) {
    console.error('❌ Failed to send LINE acceptance notification:', error.message);
    return { success: false, message: error.message };
  }
}

/**
 * ทดสอบการส่งข้อความ
 */
async function testNotification() {
  if (!client) {
    return { success: false, message: 'LINE not configured' };
  }

  try {
    const message = {
      type: 'text',
      text: '🔔 ทดสอบการแจ้งเตือนจากระบบ FixDesk\n\nการแจ้งเตือนทำงานปกติ ✅'
    };

    await client.pushMessage(TARGET_GROUP_ID, message);
    return { success: true, message: 'Test notification sent' };
  } catch (error) {
    console.error('❌ Test notification failed:', error.message);
    return { success: false, message: error.message };
  }
}

module.exports = {
  notifyJobAssignment,
  notifyJobAccepted,
  testNotification
};
