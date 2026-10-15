import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { Profile } from '@/pages/auth/Profile'
import { Dashboard } from '@/pages/Dashboard'
import { Properties } from '@/pages/Properties'
import { CreateProperty } from '@/pages/CreateProperty'
import { EditProperty } from '@/pages/EditProperty'
import { OrganizationSetup } from '@/pages/OrganizationSetup'
import { OrganizationDashboard } from '@/pages/OrganizationDashboard'
import { InviteAccept } from '@/pages/InviteAccept'
import { PropertySearch } from '@/pages/PropertySearch'
import { PropertyDetail } from '@/pages/PropertyDetail'
import { Favorites } from '@/pages/Favorites'
import { Conversations } from '@/pages/Conversations'
import { ConversationDetail } from '@/pages/ConversationDetail'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { AuthSessionLifecycle } from '@/components/layout/AuthSessionLifecycle'
import { Verify } from '@/pages/auth/Verify'
import { ForgotPassword } from '@/pages/auth/ForgotPassword'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionLifecycle />
      <BrowserRouter>
        <NotificationCenter />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Auth Routes */}
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/auth/verify" element={<Verify />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/auth/profile" element={<Profile />} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Properties */}
          <Route path="/properties" element={<ProtectedRoute advisorsOnly><Properties /></ProtectedRoute>} />
          <Route path="/properties/create" element={<ProtectedRoute advisorsOnly><CreateProperty /></ProtectedRoute>} />
          <Route path="/properties/:id/edit" element={<ProtectedRoute advisorsOnly><EditProperty /></ProtectedRoute>} />
          <Route path="/properties/:id" element={<PropertyDetail />} />

          {/* Search & Discovery */}
          <Route path="/search" element={<PropertySearch />} />
          <Route path="/favorites" element={<Favorites />} />

          {/* Messaging & Collaboration */}
          <Route path="/messages" element={<Conversations />} />
          <Route path="/messages/:id" element={<ConversationDetail />} />

          {/* Organization Routes */}
          <Route path="/organization/setup" element={<ProtectedRoute advisorsOnly><OrganizationSetup /></ProtectedRoute>} />
          <Route path="/organization/dashboard" element={<ProtectedRoute advisorsOnly><OrganizationDashboard /></ProtectedRoute>} />
          </Route>
          <Route path="/invite" element={<InviteAccept />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
