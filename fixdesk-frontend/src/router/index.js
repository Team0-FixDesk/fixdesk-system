import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

import RepairRequestView from '../views/repair-request-view.vue'
import MyListView from '../views/my-list-view.vue'

import UserHomeView from '../views/user/user-home-view.vue'

import AdminHomeView from '../views/admin/admin-home-view.vue'
import AdminCheckRequestView from '../views/admin/admin-check-request-view.vue'
import AdminUserInfoView from '../views/admin/admin-user-info-view.vue'
import AdminSummaryView from '../views/admin/admin-summary-view.vue'
import AdminManageLocationView from '../views/admin/admin-manage-location-view.vue'
import AdminReportView from '../views/admin/admin-report-view.vue'

import ManagerHomeView from '../views/manager/manager-home-view.vue'
import ManagerReportView from '../views/manager/manager-report-view.vue'
import ManagerSummaryView from '../views/manager/manager-summary-view.vue'

import TechnicianHomeView from '../views/technician/technician-home-view.vue'
import TechnicianHistoryView from '../views/technician/technician-history-view.vue'
import TechnicianStockListView from '../views/technician/technician-repair-list-view.vue'
import TechnicianMyStockView from '../views/technician/technician-my-stock-view.vue'
import TechnicianRepairListView from '../views/technician/technician-repair-list-view.vue'

import StockHomeView from '../views/stock/stock-home-view.vue'
import StockManageInventoryView from '../views/stock/stock-manage-inventory-view.vue'
import StockWithdrawHistoryView from '../views/stock/stock-withdraw-history-view.vue'
import StockWithdrawListView from '../views/stock/stock-withdraw-list-view.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView,},
    { path: '/repair-request', name: 'repair-request',component: RepairRequestView,},
    { path: '/my-list', name: 'my-list',component: MyListView,},

    { path: '/user-home',name: 'user-home', component: UserHomeView,},

    { path: '/admin-home',name: 'admin-home', component: AdminHomeView,},
    { path: '/admin-check-request', name: 'admin-check-request',component: AdminCheckRequestView,},
    { path: '/admin-user-info', name: 'admin-user-info',component: AdminUserInfoView,},
    { path: '/admin-summary', name: 'admin-summary',component: AdminSummaryView,},
    { path: '/admin-manage-location', name: 'admin-manage-location',component: AdminManageLocationView,},
    { path: '/admin-report', name: 'admin-report',component: AdminReportView,},

    { path: '/manager-home',name: 'manager-home', component: ManagerHomeView,},
    { path: '/manager-report',name: 'manager-report', component: ManagerReportView,},
    { path: '/manager-summary',name: 'manager-summary', component: ManagerSummaryView,},

    { path: '/technician-home',name: 'technician-home', component: TechnicianHomeView,},
    { path: '/technician-repair-list',name: 'technician-repair-list', component: TechnicianRepairListView,},
    { path: '/technician-history',name: 'technician-history', component: TechnicianHistoryView,},
    { path: '/technician-stock-list',name: 'technician-stock-list', component: TechnicianStockListView,},
    { path: '/technician-my-stock',name: 'technician-my-stock', component: TechnicianMyStockView,},

    { path: '/stock-home',name: 'stock-home', component: StockHomeView,},
    { path: '/stock-withdraw-list',name: 'technician-home', component: StockWithdrawListView,},
    { path: '/stock-withdraw-history',name: 'technician-home', component: StockWithdrawHistoryView,},
    { path: '/stock-manage-inventory',name: 'technician-home', component: StockManageInventoryView,},


  ],
})

export default router
