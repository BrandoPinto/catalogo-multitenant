// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import CompanyBootstrap from './components/CompanyBootstrap'
import ProtectedRoute from './components/admin/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'

import HomePage from './pages/public/HomePage'
import ProductDetailPage from './pages/public/ProductDetailPage'
import LoginPage from './pages/admin/LoginPage'
import DashboardPage from './pages/admin/DashboardPage'
import ProductsPage from './pages/admin/ProductsPage'
import ProductFormPage from './pages/admin/ProductFormPage'
import CategoriesPage from './pages/admin/CategoriesPage'
import BannersPage from './pages/admin/BannersPage'
import UsersPage from './pages/admin/UsersPage'
import CompanyPage from './pages/admin/CompanyPage'
import InventoryPage from './pages/admin/InventoryPage'
import VentasPage from './pages/admin/VentasPage'
import ExtrasPage from './pages/admin/ExtrasPage'

function AdminShell({ children }) {
  return (
    <ProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <CompanyBootstrap>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: { borderRadius: '12px', fontSize: '14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
            success: { iconTheme: { primary: 'var(--color-brand)', secondary: 'white' } },
          }}
        />
        <Routes>
          <Route path="/"             element={<HomePage />} />
          <Route path="/product/:id"  element={<ProductDetailPage />} />
          <Route path="/admin/login"  element={<LoginPage />} />
          <Route path="/admin"                      element={<AdminShell><DashboardPage /></AdminShell>} />
          <Route path="/admin/products"             element={<AdminShell><ProductsPage /></AdminShell>} />
          <Route path="/admin/products/new"         element={<AdminShell><ProductFormPage /></AdminShell>} />
          <Route path="/admin/products/:id/edit"    element={<AdminShell><ProductFormPage /></AdminShell>} />
          <Route path="/admin/categories"           element={<AdminShell><CategoriesPage /></AdminShell>} />
          <Route path="/admin/banners"              element={<AdminShell><BannersPage /></AdminShell>} />
          <Route path="/admin/users"                element={<AdminShell><UsersPage /></AdminShell>} />
          <Route path="/admin/company"              element={<AdminShell><CompanyPage /></AdminShell>} />
          <Route path="/admin/inventory"            element={<AdminShell><InventoryPage /></AdminShell>} />
          <Route path="/admin/ventas"              element={<AdminShell><VentasPage /></AdminShell>} />
          <Route path="/admin/extras"              element={<AdminShell><ExtrasPage /></AdminShell>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CompanyBootstrap>
    </BrowserRouter>
  )
}
