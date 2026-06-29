/**
 * ==============================================================
 * @file            vite.config.js
 * @layer           -
 * @version         1.0.0
 * @since           2025-10-17
 * @author          พชร ไพศรีสกุล
 *
 * ---------------------------------------------------------------------
 * @description
 * การตั้งค่า Vite สำหรับโปรเจกต์ Vue โดยกำหนด plugins ที่ใช้ (Vue, DevTools, Icons, Components), 
 * ตั้ง alias @ ชี้ไปที่โฟลเดอร์ src และตั้งค่า build ให้มี hash เพื่อป้องกัน cache พร้อมตั้งค่า server 
 * สำหรับ development
 * 
 * ---------------------------------------------------------------------
 * @changelog
 * - [2025-10-17 ,พชร ไพศรีสกุล]
 * ==============================================================
 */


import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import IconsResolver from 'unplugin-icons/resolver'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),

    Components({
      resolvers: [
        IconsResolver({
          prefix: 'icon',
        }),
      ],
    }),

    Icons({
      autoInstall: true,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Cache busting - สร้าง hash ใหม่ทุกครั้งที่ build
    rollupOptions: {
      output: {
        // Hash ไฟล์ชื่อเพื่อป้องกัน cache
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    // Source map สำหรับ debugging
    sourcemap: false,
  },
  server: {
    // สำหรับ development
    headers: {
      'Cache-Control': 'no-cache',
    },
  },
})
