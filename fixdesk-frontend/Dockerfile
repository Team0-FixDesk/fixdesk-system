# ================================
# Stage 1: Build Vue App
# ================================
FROM node:lts AS build-stage

WORKDIR /app

# เอาแค่ package*.json มาก่อน
COPY package*.json ./

# ลง deps ทั้งหมด (รวม devDependencies)
RUN npm install

# คัดลอกโค้ดที่เหลือ
COPY . .

# ถ้าจำเป็นต้องแก้ rollup จริง ๆ ค่อยใช้
# RUN npm rebuild rollup

# build
RUN npm run build

# ================================
# Stage 2: Serve with Nginx
# ================================
FROM nginx:stable-alpine AS production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
