import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { Profile } from '@/pages/auth/Profile'
import { Dashboard } from '@/pages/Dashboard'
import { Properties } from '@/pages/Properties'
import { CreateProperty } from '@/pages/CreateProperty'
import { OrganizationSetup } from '@/pages/OrganizationSetup'
import { OrganizationDashboard } from '@/pages/OrganizationDashboard'
import { InviteAccept } from '@/pages/InviteAccept'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Auth Routes */}
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/auth/profile" element={<Profile />} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Properties */}
          <Route path="/properties" element={<Properties />} />
          <Route path="/properties/create" element={<CreateProperty />} />

          {/* Organization Routes */}
          <Route path="/organization/setup" element={<OrganizationSetup />} />
          <Route path="/organization/dashboard" element={<OrganizationDashboard />} />
          <Route path="/invite" element={<InviteAccept />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
