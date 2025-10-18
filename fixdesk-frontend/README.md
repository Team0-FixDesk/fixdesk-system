# 🧰 FixDesk Frontend

ส่วนของระบบที่ผู้ใช้เห็นทั้งหมด (Vue 3 + Vite + TailwindCSS)  
เป็นหน้าเว็บที่เชื่อมต่อกับ Backend ผ่าน RESTful API

---

## ⚙️ เทคโนโลยีที่ใช้
- **Vue 3 (Composition API)** – โครงสร้างหลักของ frontend  
- **Vite** – เครื่องมือ build ที่รวดเร็ว  
- **TailwindCSS** – ใช้ตกแต่ง UI  
- **Pinia** – สำหรับจัดการ state ภายในระบบ  
- **Vue Router** – จัดการเส้นทางภายในแอป  

---

## 📂 โครงสร้างโปรเจกต์

```bash
fixdesk-frontend/
├── public/                # ไฟล์สาธารณะ (favicon, index.html)
├── src/
│   ├── assets/            # ไฟล์ภาพ, CSS, icon, font
│   │   └── main.css       # CSS หลัก (import Tailwind)
│   ├── components/        # ส่วนย่อย ๆ ของ UI เช่น ปุ่ม, input, modal
│   ├── layouts/           # โครงร่างหลัก เช่น Navbar, Sidebar, Footer
│   ├── pages/             # หน้าหลัก เช่น Login, Dashboard, Report
│   ├── router/            # เส้นทางหน้าเว็บ (index.js)
│   ├── stores/            # จัดการ state ด้วย Pinia เช่น userStore, ticketStore
│   ├── utils/             # ฟังก์ชันช่วย เช่น formatDate, validateForm
│   ├── App.vue            # Component หลักของระบบ
│   └── main.js            # จุดเริ่มต้นรัน Vue App
│
├── .vscode/               # การตั้งค่า VSCode (optional)
├── .gitignore             # ไฟล์ที่ไม่ต้องการให้ git track
├── .editorconfig          # มาตรฐานการจัดรูปแบบโค้ด
├── package.json           # dependency และ script ของ frontend
├── vite.config.js         # ตั้งค่า build / proxy ไป backend
├── postcss.config.js      # ตั้งค่า Tailwind + Autoprefixer
├── tailwind.config.js     # ตั้งค่า content scope ของ Tailwind
└── README.md              # คำอธิบายโครงสร้างและวิธีใช้งาน


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
