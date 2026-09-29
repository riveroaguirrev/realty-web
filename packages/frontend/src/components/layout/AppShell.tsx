import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount'
import { Icon, IconName } from '@/components/ui/Icon'

const links: { to: string; label: string; icon: IconName }[] = [
  { to: '/dashboard', label: 'Inicio', icon: 'grid' },
  { to: '/search', label: 'Explorar propiedades', icon: 'search' },
  { to: '/properties', label: 'Mis propiedades', icon: 'home' },
  { to: '/favorites', label: 'Favoritos', icon: 'heart' },
  { to: '/messages', label: 'Mensajes', icon: 'message' },
  { to: '/organization/dashboard', label: 'Mi inmobiliaria', icon: 'team' },
]
export const AppShell = () => {
  const { user, accessToken, logout } = useAuth()
  const unread = useUnreadMessageCount(accessToken)
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const current = links.find(({ to }) => pathname === to || (to !== '/dashboard' && pathname.startsWith(to.split('/dashboard')[0])))
  useEffect(() => { setMenuOpen(false); window.scrollTo(0, 0) }, [pathname])
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Saltar al contenido</a>
      <aside className="sidebar">
        <Link to="/dashboard" className="brand"><span className="brand-mark"><Icon name="home" /></span>realty<span className="brand-dot">.</span></Link>
        <span className="workspace-label">TU ESPACIO INMOBILIARIO</span>
        <nav id="workspace-navigation" aria-label="Navegación principal" className={menuOpen ? 'sidebar-nav is-open' : 'sidebar-nav'}>
          {links.map(({ to, label, icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon name={icon} /><span>{label}</span>{to === '/messages' && unread > 0 && <span className="nav-count" aria-label={`${unread} mensajes sin leer`}>{unread}</span>}</NavLink>)}
          <div className="sidebar-tip"><span className="eyebrow">CRECE EN EQUIPO</span><strong>Más conexiones.<br />Más oportunidades.</strong><p>Conecta con tu inmobiliaria y trabaja junto a otros asesores.</p><Link to="/organization/dashboard">Ver mi equipo <Icon name="arrow" /></Link></div>
          <div className="sidebar-account"><NavLink to="/auth/profile" className="nav-item"><Icon name="user" />Mi perfil</NavLink><button className="nav-item" onClick={logout}><Icon name="logout" />Cerrar sesión</button></div>
        </nav>
        <button className="mobile-menu icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="workspace-navigation" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}><Icon name={menuOpen ? 'close' : 'menu'} /></button>
      </aside>
      <div className="workspace">
        <header className="topbar"><div className="breadcrumb">Mi espacio <span>/</span> <strong>{pathname === '/auth/profile' ? 'Mi perfil' : current?.label || 'Propiedades'}</strong></div><div className="topbar-actions"><Link to="/properties/create" className="button button-primary button-small"><Icon name="plus" />Publicar propiedad</Link><Link to="/auth/profile" className="avatar" aria-label="Ir a mi perfil">{user?.firstName?.[0]}{user?.lastName?.[0]}</Link></div></header>
        <main id="main-content" className="workspace-content" tabIndex={-1}><Outlet /></main>
        <footer className="workspace-footer"><span>realty. · Tu próxima oportunidad empieza aquí.</span><span>Un espacio para conectar.</span></footer>
      </div>
    </div>
  )
}
