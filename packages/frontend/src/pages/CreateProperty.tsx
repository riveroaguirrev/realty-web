import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PropertyForm } from '@/components/property/PropertyForm'

export const CreateProperty = () => {
  const navigate = useNavigate()
  const { accessToken } = useAuth()

  return (
    <>
      <div className="page-surface">

        <div className="form-container">
          {accessToken && (
            <PropertyForm token={accessToken} onSubmit={() => navigate('/properties')} />
          )}
        </div>
      </div>
    </>
  )
}
