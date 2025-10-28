# ================================
# Stage 1: Build Vue App
# ================================
FROM node:lts AS build-stage

# ตั้งค่า working directory
WORKDIR /app

# คัดลอกไฟล์ package.json และ package-lock.json
COPY package*.json ./

# เคลียร์ cache และติดตั้ง dependency
RUN npm cache clean --force
RUN npm install --omit=dev
RUN npm install sweetalert2


# คัดลอกโค้ดทั้งหมด
COPY . .

# 🔧 ล้าง lock + node_modules และ rebuild rollup เพื่อแก้ bug rollup-linux-x64-gnu
RUN rm -rf node_modules package-lock.json && npm install && npm rebuild rollup

# build Vue app
RUN npm run build

# ================================
# Stage 2: Serve with Nginx
# ================================
FROM nginx:stable-alpine AS production-stage

# คัดลอกไฟล์ build จาก stage ก่อนหน้า
COPY --from=build-stage /app/dist /usr/share/nginx/html

# เปิดพอร์ต 80 สำหรับเว็บ
EXPOSE 80

# เริ่มต้น nginx
CMD ["nginx", "-g", "daemon off;"]
