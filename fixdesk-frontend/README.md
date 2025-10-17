หน้าที่:
ส่วนที่ผู้ใช้เห็นทั้งหมด (Vue 3 + Vite)
เป็นระบบหน้าเว็บที่เชื่อมต่อกับ backend ผ่าน API

frontend/
├── public/          # ไฟล์สาธารณะ (favicon, index.html)
├── src/
│   ├── assets/      # ไฟล์ภาพ, CSS, icon
│   ├── components/  # ส่วนย่อย ๆ ของ UI (ปุ่ม, input, card)
│   ├── layouts/     # โครงร่างหลัก เช่น Navbar, Sidebar
│   ├── pages/       # หน้าเต็ม เช่น Login, Dashboard, Report
│   ├── router/      # เส้นทางหน้าเว็บ
│   ├── store/       # จัดการ state (Pinia)
│   ├── utils/       # ฟังก์ชันช่วย เช่น formatDate, validateForm
│   ├── App.vue      # Component หลักของระบบ
│   └── main.js      # จุดเริ่มต้นรัน Vue App
├── package.json     # dependency และ script ของ frontend
├── vite.config.js   # ตั้งค่า build / proxy
└── README.md        # อธิบายวิธีรัน frontend

รายละเอียดไฟล์สำคัญ

ไฟล์	                หน้าที่
src/main.js	          จุดเริ่มต้นของ Vue App
src/App.vue	          หน้าแม่ของเว็บ มี <router-view>
src/router/index.js	  กำหนดเส้นทางหน้า เช่น /login /dashboard
src/store/	          จัดการข้อมูลผู้ใช้, token, ticket
src/pages/	          หน้าที่สมบูรณ์ เช่น Login, Dashboard
src/layouts/	        โครงร่างหน้าจอหลัก (Navbar, Sidebar)
vite.config.js	      ใช้ตั้ง proxy ไป backend เช่น /api → localhost:5000

# fixdesk-frontend

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) 
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
