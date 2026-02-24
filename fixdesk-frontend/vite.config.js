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
