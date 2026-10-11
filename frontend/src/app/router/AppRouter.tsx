import { Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/app/components/layout/AppLayout'
import { PublicLayout } from '@/app/components/layout/PublicLayout'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { lazyRoute } from '@/app/router/lazyRoute'
import { PermissionGuard } from '@/app/router/PermissionGuard'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { RoleGuard } from '@/app/router/RoleGuard'
import { LoginScreen } from '@/app/screens/auth/LoginScreen'
import { ForbiddenPage, NotFoundPage } from '@/app/screens/NotFoundPage'

// Every screen below is its own chunk: users only download the code for pages they open.
// Login, layouts and guards stay eager so the first paint and auth checks never wait.
const AppointmentFormPage = lazyRoute(
  () => import('@/app/screens/appointments/AppointmentFormPage'),
  'AppointmentFormPage',
)
const AppointmentsScreen = lazyRoute(
  () => import('@/app/screens/appointments/AppointmentsScreen'),
  'AppointmentsScreen',
)
const AccountScreen = lazyRoute(
  () => import('@/app/screens/account/AccountScreen'),
  'AccountScreen',
)
const SetPasswordScreen = lazyRoute(
  () => import('@/app/screens/auth/SetPasswordScreen'),
  'SetPasswordScreen',
)
const BillingScreen = lazyRoute(
  () => import('@/app/screens/billing/BillingScreen'),
  'BillingScreen',
)
const NewBillScreen = lazyRoute(
  () => import('@/app/screens/billing/NewBillScreen'),
  'NewBillScreen',
)
const InvoiceScreen = lazyRoute(
  () => import('@/app/screens/billing/InvoiceScreen'),
  'InvoiceScreen',
)
const PublicInvoiceScreen = lazyRoute(
  () => import('@/app/screens/billing/PublicInvoiceScreen'),
  'PublicInvoiceScreen',
)
const CustomersScreen = lazyRoute(
  () => import('@/app/screens/customers/CustomersScreen'),
  'CustomersScreen',
)
const CustomerDetailScreen = lazyRoute(
  () => import('@/app/screens/customers/CustomerDetailScreen'),
  'CustomerDetailScreen',
)
const DashboardScreen = lazyRoute(
  () => import('@/app/screens/dashboard/DashboardScreen'),
  'DashboardScreen',
)
const InventoryScreen = lazyRoute(
  () => import('@/app/screens/inventory/InventoryScreen'),
  'InventoryScreen',
)
const ProductDetailScreen = lazyRoute(
  () => import('@/app/screens/inventory/ProductDetailScreen'),
  'ProductDetailScreen',
)
const LoyaltyScreen = lazyRoute(
  () => import('@/app/screens/loyalty/LoyaltyScreen'),
  'LoyaltyScreen',
)
const AppointmentsReportScreen = lazyRoute(
  () => import('@/app/screens/reports/AppointmentsReportScreen'),
  'AppointmentsReportScreen',
)
const CustomersReportScreen = lazyRoute(
  () => import('@/app/screens/reports/CustomersReportScreen'),
  'CustomersReportScreen',
)
const ProductsReportScreen = lazyRoute(
  () => import('@/app/screens/reports/ProductsReportScreen'),
  'ProductsReportScreen',
)
const ReportsScreen = lazyRoute(
  () => import('@/app/screens/reports/ReportsScreen'),
  'ReportsScreen',
)
const SalesReportScreen = lazyRoute(
  () => import('@/app/screens/reports/SalesReportScreen'),
  'SalesReportScreen',
)
const ServicesReportScreen = lazyRoute(
  () => import('@/app/screens/reports/ServicesReportScreen'),
  'ServicesReportScreen',
)
const StaffSalesReportScreen = lazyRoute(
  () => import('@/app/screens/reports/StaffSalesReportScreen'),
  'StaffSalesReportScreen',
)
const ServicesScreen = lazyRoute(
  () => import('@/app/screens/services/ServicesScreen'),
  'ServicesScreen',
)
const SettingsHubScreen = lazyRoute(
  () => import('@/app/screens/settings/SettingsHubScreen'),
  'SettingsHubScreen',
)
const SettingsSectionScreen = lazyRoute(
  () => import('@/app/screens/settings/SettingsSectionScreen'),
  'SettingsSectionScreen',
)
const StaffScreen = lazyRoute(
  () => import('@/app/screens/staff/StaffScreen'),
  'StaffScreen',
)
const StaffDetailScreen = lazyRoute(
  () => import('@/app/screens/staff/StaffDetailScreen'),
  'StaffDetailScreen',
)

export function AppRouter() {
  return (
    <Suspense fallback={<LoadingSkeleton rows={6} className="p-4" />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<LoginScreen />} />
        </Route>

        <Route path="/i/:token" element={<PublicInvoiceScreen />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/set-password" element={<SetPasswordScreen />} />
          <Route element={<AppLayout />}>
            <Route element={<PermissionGuard />}>
              <Route index element={<DashboardScreen />} />
              <Route path="account" element={<AccountScreen />} />
              <Route path="appointments" element={<AppointmentsScreen />} />
              <Route path="appointments/new" element={<AppointmentFormPage />} />
              <Route path="appointments/:id/edit" element={<AppointmentFormPage />} />
              <Route path="customers" element={<CustomersScreen />} />
              <Route path="customers/:id" element={<CustomerDetailScreen />} />
              <Route path="billing" element={<BillingScreen />} />
              <Route path="billing/new" element={<NewBillScreen />} />
              <Route path="billing/:id" element={<InvoiceScreen />} />
              <Route path="staff" element={<StaffScreen />} />
              <Route path="staff/:id" element={<StaffDetailScreen />} />
              <Route path="services" element={<ServicesScreen />} />
              <Route path="inventory" element={<InventoryScreen />} />
              <Route path="inventory/:id" element={<ProductDetailScreen />} />
              <Route path="loyalty" element={<LoyaltyScreen />} />
              <Route path="settings" element={<SettingsHubScreen />} />
              <Route path="settings/:section" element={<SettingsSectionScreen />} />

              <Route
                element={
                  <RoleGuard allowedRoles={['owner', 'manager', 'admin', 'staff']} />
                }
              >
                <Route path="reports" element={<ReportsScreen />} />
                <Route path="reports/sales" element={<SalesReportScreen />} />
                <Route path="reports/staff" element={<StaffSalesReportScreen />} />
                <Route path="reports/customers" element={<CustomersReportScreen />} />
                <Route
                  path="reports/appointments"
                  element={<AppointmentsReportScreen />}
                />
                <Route path="reports/services" element={<ServicesReportScreen />} />
                <Route path="reports/products" element={<ProductsReportScreen />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
