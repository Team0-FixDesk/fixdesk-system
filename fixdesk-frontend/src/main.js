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
