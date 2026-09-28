import { useAuth } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { useNavigate } from 'react-router-dom'
import { UserRole } from '@shared/types'

export const Dashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/auth/login')
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-2xl font-bold text-gray-900">Realty</h1>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{user?.firstName} {user?.lastName}</span>
                <button
                  onClick={() => navigate('/auth/profile')}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Welcome, {user?.firstName}!
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Account Info</h3>
                <p className="text-sm text-gray-600">
                  <strong>Email:</strong> {user?.email}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Role:</strong> {user?.role}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Joined:</strong> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  {user?.role === UserRole.ADVISOR ? (
                    <>
                      <button className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">
                        📋 List a Property
                      </button>
                      <button className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">
                        📊 My Properties
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">
                        🏠 Search Properties
                      </button>
                      <button className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded">
                        ❤️ Favorites
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Phase 1 Status</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>✅ User registration and login</li>
              <li>✅ Profile management</li>
              <li>✅ Protected routes</li>
              <li>⏳ Phase 2: Property Management (coming next)</li>
            </ul>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
