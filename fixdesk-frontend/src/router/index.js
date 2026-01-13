import { createRouter, createWebHashHistory } from 'vue-router'
import { jwtDecode } from 'jwt-decode'

// AUTH
import HomeView from '@/views/home-view.vue'
import LoginView from '../views/login-view.vue'
import MainLayout from '../layouts/main-layout.vue'

// SHARED
import RepairRequestView from '../views/repair-request-view.vue'
import MyListView from '../views/my-list-view.vue'
import CreateReportView from '../views/create-report-view.vue'
import manageReportView from '../views/manage-report-view.vue'

// USER
import UserHomeView from '../views/user/user-home-view.vue'

// ADMIN
import AdminHomeView from '../views/admin/admin-home-view.vue'
import AdminCheckRequestView from '../views/admin/admin-check-request-view.vue'
import AdminUserInfoView from '../views/admin/admin-user-info-view.vue'
import AdminSummaryView from '../views/admin/admin-summary-view.vue'
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
    { path: '/home', name: 'home', component: HomeView },
    { path: '/login', name: 'login', component: LoginView },
    {
      path: '/main',
      component: MainLayout,
      children: [
        { path: 'user-home', component: UserHomeView, meta: { role: ['User'] } },

        { path: 'admin-home', component: AdminHomeView, meta: { role: ['Admin'] } },
        {
          path: 'admin-check-request',
          component: AdminCheckRequestView,
          meta: { role: ['Admin'] },
        },
        { path: 'admin-user-info', component: AdminUserInfoView, meta: { role: ['Admin'] } },
        { path: 'admin-summary', component: AdminSummaryView, meta: { role: ['Admin'] } },
        {
          path: 'admin-manage-location',
          component: AdminManageLocationView,
          meta: { role: ['Admin'] },
        },
        { path: 'manager-home', component: ManagerHomeView, meta: { role: ['Manager'] } },
        { path: 'manager-summary', component: ManagerSummaryView, meta: { role: ['Manager'] } },

        { path: 'technician-home', component: TechnicianHomeView, meta: { role: ['Technician'] } },
        {
          path: 'technician-repair-list',
          component: TechnicianRepairListView,
          meta: { role: ['Technician'] },
        },
        {
          path: 'technician-history',
          component: TechnicianHistoryView,
          meta: { role: ['Technician'] },
        },
        {
          path: 'technician-stock-list',
          component: TechnicianStockListView,
          meta: { role: ['Technician'] },
        },
        {
          path: 'technician-requisition-list',
          component: TechnicianRequisitionListView,
          name: 'technician-requisition-list',
          meta: { role: ['Technician'] },
        },
        { path: 'stock-home', component: StockHomeView, meta: { role: ['Stock'] } },
        {
          path: 'stock-withdraw-list',
          component: StockWithdrawListView,
          meta: { role: ['Stock'] },
        },
        {
          path: 'stock-withdraw-history',
          component: StockWithdrawHistoryView,
          meta: { role: ['Stock'] },
        },
        {
          path: 'stock-manage-inventory',
          component: StockManageInventoryView,
          meta: { role: ['Stock'] },
        },
        {
          path: 'stock-requisition/:code',
          component: StockRequisitionApproval,
          meta: { role: ['Stock'] },
        },
        {
          path: 'repair-request',
          component: RepairRequestView,
          meta: { role: ['User', 'Admin', 'Technician', 'Manager', 'Stock'] },
        },
        {
          path: 'my-list',
          component: MyListView,
          meta: { role: ['User', 'Admin', 'Technician', 'Manager', 'Stock'] },
        },
        {
          path: 'manage-report',
          component: manageReportView,
          meta: { role: ['Admin', 'Manager'] },
        },
        {
          path: 'create-report',
          component: CreateReportView,
          meta: { role: ['Admin', 'Manager'] }, public: true
        },
        {
          path: 'repair-detail/:code',
          name: 'RepairDetail',
          component: () => import('@/views/repair-detail-view.vue'),
          meta: { role: ['User', 'Admin', 'Technician', 'Manager', 'Stock'] },
        },
        {
          path: 'repair-edit/:code',
          name: 'RepairEdit',
          component: () => import('@/views/repair-edit-view.vue'),
          meta: { role: ['User', 'Admin', 'Technician', 'Manager', 'Stock'] },
        },
      ],
    },
  ],
})

// NAVIGATION GUARD
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token')
  if (to.path === '/home') return next()

  // CASE: หน้า Login
  if (to.path === '/login') {
    if (token) {
      const role = jwtDecode(token).role_name
      return next(getHomeByRole(role))
    }
    return next()
  }
  // CASE: ต้อง login เสมอ
  if (!token) return next('/login')

  let decoded = null
  try {
    decoded = jwtDecode(token)
  } catch {
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    return next('/login')
  }

  const role = decoded.role_name
  // CASE: เช็ค role
  if (to.meta.role && !to.meta.role.includes(role)) {
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
      return '/main/manager-home'
    case 'Stock':
      return '/main/stock-home'
    default:
      return '/login'
  }
}

export default router
