import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PropertyForm } from '@/components/property/PropertyForm'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

export const CreateProperty = () => {
  const navigate = useNavigate()
  const { accessToken, user } = useAuth()

  if (!accessToken || !user) {
    return null
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-2xl font-bold text-gray-900 cursor-pointer" onClick={() => navigate('/')}>
                Realty
              </h1>
              <button
                onClick={() => navigate('/properties')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Properties
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <PropertyForm
            token={accessToken}
            userId={user.id}
            onSubmit={() => navigate('/properties')}
          />
        </div>
      </div>
    </ProtectedRoute>
  )
}
