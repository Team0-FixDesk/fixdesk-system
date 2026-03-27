/**
 * ==============================================================
 * @file            main.js
 * @layer           -
 * @version         1.0.0
 * @since           2025-10-17
 * @author          พชร ไพศรีสกุล
 * @lastModified    2025-12-15
 * @lastModifiedBy  นราธิป แสนทวีสุข
 * @contributors
 * - นราธิป แสนทวีสุข
 * ---------------------------------------------------------------------
 * @description
 * ไฟล์นี้เป็นจุดเริ่มต้นหลัก (Entry Point) ของแอปพลิเคชัน Vue.js
 * ทำหน้าที่ตั้งค่าและเชื่อมต่อเครื่องมือสำคัญต่าง ๆ ที่ใช้ภายในระบบ
 * 
 * ---------------------------------------------------------------------
 * @changelog
 * - [2025-10-17 ,พชร ไพศรีสกุล]
 * - [2025-10-20 ,พชร ไพศรีสกุล]
 * - [2025-12-07 ,นราธิป แสนทวีสุข]
 * - [2025-12-15 ,นราธิป แสนทวีสุข]
 * ==============================================================
 */

import './assets/main.css'
import 'flowbite'

// FontAwesome
import '@fortawesome/fontawesome-free/css/all.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

// SweetAlert2
import Swal from 'sweetalert2'

// ECharts และ vue-echarts
import { use } from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import { BarChart, LineChart, PieChart, GaugeChart } from "echarts/charts"
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from "echarts/components"
import VChart, { THEME_KEY } from "vue-echarts"

import App from './App.vue'
import router from './router'

// ตั้งค่า ECharts components
use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  GaugeChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const app = createApp(App)

// ตั้งค่า SweetAlert2 global
app.config.globalProperties.$swal = Swal

app.use(createPinia())
app.use(router)

// ลงทะเบียน vue-echarts
app.component("v-chart", VChart)
app.provide(THEME_KEY, "light")

app.mount('#app')
