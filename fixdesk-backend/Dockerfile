FROM node:lts-alpine

WORKDIR /app

# Copy package files และ install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# สร้างโฟลเดอร์ uploads และตั้งสิทธิ์
RUN mkdir -p /app/uploads/repair && \
    chmod -R 755 /app/uploads

# เปิด port 3000
EXPOSE 3000

# เริ่มต้นแอป
CMD ["node", "index.js"]
