import { createRouter, createWebHistory } from 'vue-router'

// 🔹 Auth
import LoginView from '../views/login-view.vue'
import MainLayout from '../layouts/main-layout.vue'

// 🔹 Shared
import RepairRequestView from '../views/repair-request-view.vue'
import MyListView from '../views/my-list-view.vue'

// 🔹 User
import UserHomeView from '../views/user/user-home-view.vue'

// 🔹 Admin
import AdminHomeView from '../views/admin/admin-home-view.vue'
import AdminCheckRequestView from '../views/admin/admin-check-request-view.vue'
import AdminUserInfoView from '../views/admin/admin-user-info-view.vue'
import AdminSummaryView from '../views/admin/admin-summary-view.vue'
import AdminManageLocationView from '../views/admin/admin-manage-location-view.vue'
import AdminReportView from '../views/admin/admin-report-view.vue'

// 🔹 Manager
import ManagerHomeView from '../views/manager/manager-home-view.vue'
import ManagerReportView from '../views/manager/manager-report-view.vue'
import ManagerSummaryView from '../views/manager/manager-summary-view.vue'

// 🔹 Technician
import TechnicianHomeView from '../views/technician/technician-home-view.vue'
import TechnicianRepairListView from '../views/technician/technician-repair-list-view.vue'
import TechnicianHistoryView from '../views/technician/technician-history-view.vue'
import TechnicianStockListView from '../views/technician/technician-stock-list-view.vue'
import TechnicianMyStockView from '../views/technician/technician-my-stock-view.vue'

// 🔹 Stock
import StockHomeView from '../views/stock/stock-home-view.vue'
import StockWithdrawListView from '../views/stock/stock-withdraw-list-view.vue'
import StockWithdrawHistoryView from '../views/stock/stock-withdraw-history-view.vue'
import StockManageInventoryView from '../views/stock/stock-manage-inventory-view.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'login', component: LoginView },

    // ✅ Layout หลัก
    {
      path: '/main',
      component: MainLayout,
      children: [
        { path: 'user-home', component: UserHomeView },

        { path: 'admin-home', component: AdminHomeView },
        { path: 'admin-check-request', component: AdminCheckRequestView },
        { path: 'admin-user-info', component: AdminUserInfoView },
        { path: 'admin-summary', component: AdminSummaryView },
        { path: 'admin-manage-location', component: AdminManageLocationView },
        { path: 'admin-report', component: AdminReportView },

        { path: 'manager-home', component: ManagerHomeView },
        { path: 'manager-report', component: ManagerReportView },
        { path: 'manager-summary', component: ManagerSummaryView },

        { path: 'technician-home', component: TechnicianHomeView },
        { path: 'technician-repair-list', component: TechnicianRepairListView },
        { path: 'technician-history', component: TechnicianHistoryView },
        { path: 'technician-stock-list', component: TechnicianStockListView },
        { path: 'technician-my-stock', component: TechnicianMyStockView },

        { path: 'stock-home', component: StockHomeView },
        { path: 'stock-withdraw-list', component: StockWithdrawListView },
        { path: 'stock-withdraw-history', component: StockWithdrawHistoryView },
        { path: 'stock-manage-inventory', component: StockManageInventoryView },

        { path: 'repair-request', component: RepairRequestView },
        { path: 'my-list', component: MyListView },
        // 🧩 Repair Detail (dynamic route)
        {
          path: 'repair-detail/:id',
          name: 'RepairDetailView',
          component: () => import('@/views/repair-detail-view.vue'),
        },
      ],
    },
  ],
})

export default router
