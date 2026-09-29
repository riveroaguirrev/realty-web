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

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <NotificationCenter />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Auth Routes */}
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/auth/profile" element={<Profile />} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Properties */}
          <Route path="/properties" element={<Properties />} />
          <Route path="/properties/create" element={<CreateProperty />} />
          <Route path="/properties/:id/edit" element={<EditProperty />} />
          <Route path="/properties/:id" element={<PropertyDetail />} />

          {/* Search & Discovery */}
          <Route path="/search" element={<PropertySearch />} />
          <Route path="/favorites" element={<Favorites />} />

          {/* Messaging & Collaboration */}
          <Route path="/messages" element={<Conversations />} />
          <Route path="/messages/:id" element={<ConversationDetail />} />

          {/* Organization Routes */}
          <Route path="/organization/setup" element={<OrganizationSetup />} />
          <Route path="/organization/dashboard" element={<OrganizationDashboard />} />
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
