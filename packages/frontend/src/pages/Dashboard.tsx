import { Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { propertySearchAPI } from '@/services/propertySearch'
import { PropertyCard, PropertyCardProps } from '@/components/property/PropertyCard'
import { Icon, IconName } from '@/components/ui/Icon'
import { DiscoveryHero } from '@/components/property/DiscoveryHero'
import './Dashboard.css'
const shortcuts: { to: string; title: string; icon: IconName; tone: string }[] = [
  { to: '/properties', title: 'Mis propiedades', icon: 'home', tone: 'sage' },
  { to: '/requirements', title: 'Requerimientos', icon: 'search', tone: 'rose' },
  { to: '/messages', title: 'Conversaciones', icon: 'message', tone: 'sand' },
]
export const Dashboard = () => {
  const { user, accessToken } = useAuth()
  const showTeamBanner = user?.role === 'ADVISOR' && !user.organizationId && user.roleInOrganization !== 'DIRECTOR'
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['dashboard-discovery', accessToken], queryFn: () => propertySearchAPI.search(accessToken!, { pageSize: 3 }), enabled: !!accessToken })
  if (user?.role === 'BUYER') return <Navigate to='/search' replace />
  return <div className="dashboard-page">
    <div className="page-heading"><div><h1>Hola, {user?.firstName || 'bienvenido'}<span className="greeting-dot">.</span></h1><p>Conecta propiedades con oportunidades.</p></div></div>
    <DiscoveryHero />
    <section className="shortcut-grid" aria-label="Accesos rápidos">{shortcuts.map(({ to, title, icon, tone }) => <Link to={to} className="shortcut" key={to}><span className={`shortcut-icon ${tone}`}><Icon name={icon} /></span><div><h2>{title}</h2></div><Icon name="arrow" /></Link>)}</section>
    <section><div className="section-heading"><div><h2>Propiedades de la red</h2></div><Link to="/search" className="text-link">Ver todas <Icon name="arrow" /></Link></div>
      {isLoading ? <div className="loading-panel" role="status">Cargando propiedades…</div> : isError ? <div className="empty-panel" role="alert"><h3>No pudimos cargar las propiedades</h3><p>Comprueba tu conexión e inténtalo de nuevo.</p><button className="button button-secondary" onClick={() => refetch()}>Reintentar</button></div> : data?.properties.length ? <div className="property-grid">{data.properties.map((property: PropertyCardProps) => <PropertyCard key={property.id} {...property} />)}</div> : <div className="empty-panel"><Icon name="home" width="32" height="32" /><h3>Las oportunidades empiezan contigo</h3><p>Publica la primera propiedad para que otros puedan descubrirla.</p><Link to="/properties/create" className="button button-primary"><Icon name="plus" />Publicar propiedad</Link></div>}
    </section>
    {showTeamBanner && <section className="team-banner" aria-labelledby="team-banner-title">
      <span className="team-banner-emblem" aria-hidden="true">
        <Icon name="team" width="34" height="34" />
        <span className="team-banner-satellite"><Icon name="building" width="16" height="16" /></span>
      </span>
      <div className="team-banner-copy">
        <span className="team-banner-label">Conecta y crece</span>
        <h2 id="team-banner-title">El trabajo en equipo <span>abre más puertas.</span></h2>
        <p>Crea tu inmobiliaria o únete a una para conectar con otros asesores.</p>
      </div>
      <Link to="/organization/dashboard" className="team-banner-cta">Mi inmobiliaria <span><Icon name="arrow" /></span></Link>
    </section>}
  </div>
}
