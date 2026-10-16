import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { requirementsAPI, requirementError } from '@/services/requirements'
import { RequirementForm } from '@/components/requirements/RequirementForm'
import './Requirements.css'
export const RequirementEditor = () => {
  const { id } = useParams()
  const { accessToken, user } = useAuth()
  const navigate = useNavigate()
  const query = useQuery({ queryKey: ['requirement', id, accessToken], queryFn: () => requirementsAPI.get(accessToken!, id!), enabled: !!id && !!accessToken })
  if (id && query.isLoading) return <p>Cargando requerimiento…</p>
  if (id && query.isError) return <p role="alert">{requirementError(query.error)}</p>
  if (id && query.data?.data.buyerId !== user?.id) return <p>No puedes editar este requerimiento.</p>
  return <div className="requirements-page"><Link to="/requirements">← Requerimientos</Link><div className="page-heading"><div><p className="eyebrow">LA BÚSQUEDA DE TU CLIENTE</p><h1>{id ? 'Editar requerimiento' : 'Nuevo requerimiento'}</h1></div></div>{accessToken && <RequirementForm key={id || 'new'} token={accessToken} initial={query.data?.data} onSaved={savedId => navigate(`/requirements/${savedId}`)} />}</div>
}
