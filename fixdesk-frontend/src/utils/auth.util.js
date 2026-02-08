export const roleToRoute = (role) => {
  const map = {
    Admin: '/main/admin-home',
    Technician: '/main/technician-home',
    Stock: '/main/stock-home',
    Manager: '/main/manager-home',
  }

  return map[role] || '/main/user-home'
}
