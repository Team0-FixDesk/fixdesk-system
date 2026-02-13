import { createRouter, createWebHashHistory } from 'vue-router'
import { jwtDecode } from 'jwt-decode'

// PUBLIC
import HomeView from '@/views/public/home-view.vue'
import LoginView from '../views/public/login-view.vue'
import MainLayout from '../layouts/main-layout.vue'

// SHARED
import RepairRequestView from '../views/shared/repair-request-view.vue'
import MyListView from '../views/shared/my-list-view.vue'
import CreateReportView from '../views/admin/create-report-view.vue'
import manageReportView from '../views/admin/manage-report-view.vue'

// USER
import UserHomeView from '../views/user/user-home-view.vue'

// ADMIN
import AdminHomeView from '../views/admin/admin-home-view.vue'
import AdminCheckRequestView from '../views/admin/admin-check-request-view.vue'
import AdminUserInfoView from '../views/admin/admin-user-info-view.vue'
import AdminManageLocationView from '../views/admin/admin-manage-location-view.vue'

// MANAGER
import ManagerHomeView from '../views/manager/manager-home-view.vue'
import ManagerSummaryView from '../views/manager/manager-summary-view.vue'

//TECHNICIAN
import TechnicianHomeView from '../views/technician/technician-home-view.vue'
import TechnicianRepairListView from '../views/technician/technician-repair-list-view.vue'
import TechnicianHistoryView from '../views/technician/technician-history-view.vue'
import TechnicianStockListView from '../views/technician/technician-stock-list-view.vue'
import TechnicianRequisitionListView from '../views/technician/technician-requisition-list-view.vue'

// STOCK
import StockHomeView from '../views/stock/stock-home-view.vue'
import StockWithdrawListView from '../views/stock/stock-withdraw-list-view.vue'
import StockWithdrawHistoryView from '../views/stock/stock-withdraw-history-view.vue'
import StockManageInventoryView from '../views/stock/stock-manage-inventory-view.vue'
import StockRequisitionApproval from '@/views/stock/Stock-Requisition-Approval.vue'

// ROUTER CONFIG
const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', name: 'home', component: HomeView, meta: { public: true } },
    { path: '/login', name: 'login', component: LoginView },
    {
      path: '/main',
      component: MainLayout,
      children: [
        { path: 'user-home', component: UserHomeView, meta: { roles: ['User'] } },

        { path: 'admin-home', component: AdminHomeView, meta: { roles: ['Admin'] } },
        {
          path: 'admin-check-request',
          component: AdminCheckRequestView,
          meta: { roles: ['Admin'] },
        },
        { path: 'admin-user-info', component: AdminUserInfoView, meta: { roles: ['Admin'] } },
        { path: 'admin-manage-location', component: AdminManageLocationView, meta: { roles: ['Admin'] } },
        { path: 'dashboard', component: ManagerHomeView, meta: { roles: ['Manager', 'Admin'] } },
        { path: 'information-summary', component: ManagerSummaryView, meta: { roles: ['Manager', 'Admin'] } },

        { path: 'technician-home', component: TechnicianHomeView, meta: { roles: ['Technician'] } },
        {
          path: 'technician-repair-list',
          component: TechnicianRepairListView,
          meta: { roles: ['Technician'] },
        },
        {
          path: 'technician-history',
          component: TechnicianHistoryView,
          meta: { roles: ['Technician'] },
        },
        {
          path: 'technician-stock-list',
          component: TechnicianStockListView,
          meta: { roles: ['Technician'] },
        },
        {
          path: 'technician-requisition-list',
          component: TechnicianRequisitionListView,
          name: 'technician-requisition-list',
          meta: { roles: ['Technician'] },
        },
        { path: 'stock-home', component: StockHomeView, meta: { roles: ['Stock'] } },
        {
          path: 'stock-withdraw-list',
          component: StockWithdrawListView,
          meta: { roles: ['Stock', 'Admin'] },
        },
        {
          path: 'stock-withdraw-history',
          component: StockWithdrawHistoryView,
          meta: { roles: ['Stock', 'Admin'] },
        },
        {
          path: 'stock-manage-inventory',
          component: StockManageInventoryView,
          meta: { roles: ['Stock', 'Admin'] },
        },
        {
          path: 'stock-requisition/:code',
          component: StockRequisitionApproval,
          meta: { roles: ['Stock', 'Admin'] },
        },
        {
          path: 'repair-request',
          component: RepairRequestView,
          meta: { roles: ['User', 'Admin', 'Technician', 'Manager', 'Stock'] },
        },
        {
          path: 'my-list',
          component: MyListView,
          meta: { roles: ['User', 'Admin', 'Technician', 'Manager', 'Stock'] },
        },
        {
          path: 'manage-report',
          component: manageReportView,
          meta: { roles: ['Admin', 'Manager'] },
        },
        {
          path: 'create-report',
          component: CreateReportView,
          meta: { roles: ['Admin', 'Manager'] },
        },
        {
          path: 'repair-detail/:code',
          name: 'RepairDetail',
          component: () => import('@/views/shared/repair-detail-view.vue'),
          meta: { roles: ['User', 'Admin', 'Technician', 'Manager', 'Stock'] },
        },
        {
          path: 'repair-edit/:code',
          name: 'RepairEdit',
          component: () => import('@/views/shared/repair-edit-view.vue'),
          meta: { roles: ['User', 'Admin', 'Technician', 'Manager', 'Stock'] },
        },
      ],
    },
  ],
})

// NAVIGATION GUARD (การตั้งค่าเส้นทางของระบบ)
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')

  // บังคับให้ทุกการเข้าครั้งแรก ไป /home
  if (to.matched.some((record) => record.meta.public)) {
    return next()
  }

  // CASE: หน้า Login
  if (to.name === 'login') {
    if (token) {
      try {
        const role = jwtDecode(token).role_name
        return next(getHomeByRole(role))
      } catch {
        // token ผิดปกติ / หมดอายุ → ล้างทิ้งแล้วให้เข้า login
        localStorage.removeItem('token')
        sessionStorage.removeItem('token')
        return next()
      }
    }

    return next()
  }

  // CASE: ต้อง login เสมอ
  if (!token) return next('/login')

  let decoded
  try {
    decoded = jwtDecode(token)
  } catch {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    return next('/login')
  }

  const role = decoded.role_name

  // CASE: เช็ค role
  if (to.meta.roles && !to.meta.roles.includes(role)) {
    return next(getHomeByRole(role))
  }

  next()
})

//  ROLE → HOME PAGE MAPPING
function getHomeByRole(role) {
  switch (role) {
    case 'Admin':
      return '/main/admin-home'
    case 'User':
      return '/main/user-home'
    case 'Technician':
      return '/main/technician-home'
    case 'Manager':
      return '/main/dashboard'
    case 'Stock':
      return '/main/stock-home'
    default:
      return '/login'
  }
}

export default router
