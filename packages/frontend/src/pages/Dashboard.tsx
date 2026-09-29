import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { propertySearchAPI } from '@/services/propertySearch'
import { PropertyCard, PropertyCardProps } from '@/components/property/PropertyCard'
import { Icon, IconName } from '@/components/ui/Icon'
const shortcuts: { to: string; title: string; description: string; icon: IconName; tone: string }[] = [
  { to: '/properties', title: 'Mis propiedades', description: 'Gestiona tus publicaciones', icon: 'home', tone: 'sage' },
  { to: '/favorites', title: 'Tus favoritos', description: 'Retoma lo que te interesa', icon: 'heart', tone: 'rose' },
  { to: '/messages', title: 'Conversaciones', description: 'Conecta con otros asesores', icon: 'message', tone: 'sand' },
]
export const Dashboard = () => {
  const { user, accessToken } = useAuth()
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['dashboard-discovery', accessToken], queryFn: () => propertySearchAPI.search(accessToken!, { pageSize: 3 }), enabled: !!accessToken })
  return <div className="dashboard-page">
    <div className="page-heading"><div><p className="eyebrow">TU DÍA, MÁS SIMPLE</p><h1>Hola, {user?.firstName || 'bienvenido'}<span className="greeting-dot">.</span></h1><p>Tus propiedades, contactos y próximas oportunidades. Todo en un lugar.</p></div><span className="date-label">{new Date().toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
    <section className="welcome-banner"><div className="welcome-copy"><span className="banner-label"><span />CONECTA. DESCUBRE. CRECE.</span><h2>El próximo lugar.<br />La próxima oportunidad.</h2><p>Encuentra la propiedad ideal y conecta con las personas que te ayudan a dar el siguiente paso.</p><Link className="button button-light" to="/search"><Icon name="search" />Explorar propiedades<Icon name="arrow" /></Link></div><div className="architectural-art" aria-hidden="true"><div className="art-sun" /><div className="art-building building-back" /><div className="art-building building-front"><i /><i /><i /><i /><i /><i /></div><div className="art-plant" /><span>ESPACIOS QUE CONECTAN</span></div></section>
    <section className="shortcut-grid" aria-label="Accesos rápidos">{shortcuts.map(({ to, title, description, icon, tone }) => <Link to={to} className="shortcut" key={to}><span className={`shortcut-icon ${tone}`}><Icon name={icon} /></span><div><h2>{title}</h2><p>{description}</p></div><Icon name="arrow" /></Link>)}</section>
    <section><div className="section-heading"><div><p className="eyebrow">DESCUBRE TU PRÓXIMO ESPACIO</p><h2>Propiedades para explorar</h2></div><Link to="/search" className="text-link">Ver todas <Icon name="arrow" /></Link></div>
      {isLoading ? <div className="loading-panel" role="status">Cargando propiedades…</div> : isError ? <div className="empty-panel" role="alert"><h3>No pudimos cargar las propiedades</h3><p>Comprueba tu conexión e inténtalo de nuevo.</p><button className="button button-secondary" onClick={() => refetch()}>Reintentar</button></div> : data?.properties.length ? <div className="property-grid">{data.properties.map((property: PropertyCardProps) => <PropertyCard key={property.id} {...property} />)}</div> : <div className="empty-panel"><Icon name="home" width="32" height="32" /><h3>Las oportunidades empiezan contigo</h3><p>Publica la primera propiedad para que otros puedan descubrirla.</p><Link to="/properties/create" className="button button-primary"><Icon name="plus" />Publicar propiedad</Link></div>}
    </section>
    <section className="team-banner"><span className="shortcut-icon sage"><Icon name="team" /></span><div><h2>El trabajo en equipo abre más puertas</h2><p>Crea tu inmobiliaria o únete a una para conectar con otros asesores.</p></div><Link to="/organization/dashboard" className="button button-secondary">Mi inmobiliaria <Icon name="arrow" /></Link></section>
  </div>
}
