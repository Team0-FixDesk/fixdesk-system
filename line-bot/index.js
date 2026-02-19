require('dotenv').config();
const line = require('@line/bot-sdk');
const express = require('express');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);
const app = express();

// ส่วนของ Webhook รับข้อมูลจาก LINE
app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(event => {
    
    // ตรวจสอบว่าข้อความมาจาก Group หรือไม่
    if (event.source.type === 'group') {
      console.log('---------------------------');
      console.log('พบ Group ID ใหม่!');
      console.log('Group ID คือ:', event.source.groupId); // นี่คือสิ่งที่เราต้องการ!
      console.log('---------------------------');
    }

    // (Optional) ให้บอทตอบกลับเพื่อยืนยันว่าได้รับ ID แล้ว
    if (event.type === 'message' && event.message.text === 'ขอไอดีกลุ่ม') {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: `ID กลุ่มของคุณคือ: ${event.source.groupId}`
      });
    }
  }))
  .then(() => res.json({}))
  .catch((err) => {
    console.error(err);
    res.status(500).end();
  });
});

app.listen(3000, () => {
  console.log('Webhook server is running on port 3000');
});