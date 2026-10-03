import { Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/app/components/layout/AppLayout'
import { PublicLayout } from '@/app/components/layout/PublicLayout'
import { PermissionGuard } from '@/app/router/PermissionGuard'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { RoleGuard } from '@/app/router/RoleGuard'
import { AppointmentFormPage } from '@/app/screens/appointments/AppointmentFormPage'
import { AppointmentsScreen } from '@/app/screens/appointments/AppointmentsScreen'
import { AccountScreen } from '@/app/screens/account/AccountScreen'
import { LoginScreen } from '@/app/screens/auth/LoginScreen'
import { SetPasswordScreen } from '@/app/screens/auth/SetPasswordScreen'
import { BillingScreen } from '@/app/screens/billing/BillingScreen'
import { NewBillScreen } from '@/app/screens/billing/NewBillScreen'
import { InvoiceScreen } from '@/app/screens/billing/InvoiceScreen'
import { PublicInvoiceScreen } from '@/app/screens/billing/PublicInvoiceScreen'
import { CustomersScreen } from '@/app/screens/customers/CustomersScreen'
import { CustomerDetailScreen } from '@/app/screens/customers/CustomerDetailScreen'
import { DashboardScreen } from '@/app/screens/dashboard/DashboardScreen'
import { InventoryScreen } from '@/app/screens/inventory/InventoryScreen'
import { ProductDetailScreen } from '@/app/screens/inventory/ProductDetailScreen'
import { LoyaltyScreen } from '@/app/screens/loyalty/LoyaltyScreen'
import { ForbiddenPage, NotFoundPage } from '@/app/screens/NotFoundPage'
import { ProfitReportScreen } from '@/app/screens/reports/ProfitReportScreen'
import { ReportsScreen } from '@/app/screens/reports/ReportsScreen'
import { SalesReportScreen } from '@/app/screens/reports/SalesReportScreen'
import { StaffSalesReportScreen } from '@/app/screens/reports/StaffSalesReportScreen'
import { InventoryValuationScreen } from '@/app/screens/reports/InventoryValuationScreen'
import { ServicesScreen } from '@/app/screens/services/ServicesScreen'
import { SettingsHubScreen } from '@/app/screens/settings/SettingsHubScreen'
import { SettingsSectionScreen } from '@/app/screens/settings/SettingsSectionScreen'
import { StaffScreen } from '@/app/screens/staff/StaffScreen'
import { StaffDetailScreen } from '@/app/screens/staff/StaffDetailScreen'

export function AppRouter() {
  return (
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
            <Route
              path="appointments/new"
              element={<AppointmentFormPage />}
            />
            <Route
              path="appointments/:id/edit"
              element={<AppointmentFormPage />}
            />
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
            <Route
              path="settings/:section"
              element={<SettingsSectionScreen />}
            />

            <Route
              element={
                <RoleGuard allowedRoles={['owner', 'manager', 'admin', 'staff']} />
              }
            >
              <Route path="reports" element={<ReportsScreen />} />
              <Route path="reports/sales" element={<SalesReportScreen />} />
              <Route path="reports/staff" element={<StaffSalesReportScreen />} />
              <Route
                path="reports/inventory"
                element={<InventoryValuationScreen />}
              />
              <Route path="reports/profit" element={<ProfitReportScreen />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
