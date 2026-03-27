/**
 * ==============================================================
 * @file            eslint.config.js
 * @layer           -
 * @version         1.0.0
 * @since           2025-10-17
 * @author          พชร ไพศรีสกุล
 *
 * ---------------------------------------------------------------------
 * @description
 * ไฟล์นี้ใช้ตั้งค่า ESLint สำหรับโปรเจกต์ Vue/JavaScript เพื่อช่วยตรวจสอบโค้ด 
 * กำหนดมาตรฐานการเขียน และทำงานร่วมกับ Prettier โดยไม่ซ้ำซ้อน
 * 
 * ---------------------------------------------------------------------
 * @changelog
 * - [2025-10-17 ,พชร ไพศรีสกุล]
 * ==============================================================
 */

import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfig([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,vue}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  skipFormatting,
])
