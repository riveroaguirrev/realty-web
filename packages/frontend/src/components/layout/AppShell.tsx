import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount'
import { Icon, IconName } from '@/components/ui/Icon'
import { RequirementNotices } from '@/components/requirements/RequirementNotices'
import '@/pages/Requirements.css'

const links: { to: string; label: string; icon: IconName }[] = [
  { to: '/dashboard', label: 'Inicio', icon: 'grid' },
  { to: '/search', label: 'Explorar propiedades', icon: 'search' },
  { to: '/map', label: 'Mapa', icon: 'map' },
  { to: '/properties', label: 'Mis propiedades', icon: 'home' },
  { to: '/requirements', label: 'Requerimientos', icon: 'search' },
  { to: '/favorites', label: 'Favoritos', icon: 'heart' },
  { to: '/messages', label: 'Mensajes', icon: 'message' },
  { to: '/organization/dashboard', label: 'Mi inmobiliaria', icon: 'team' },
]
export const AppShell = () => {
  const { user, accessToken, logout } = useAuth()
  const unread = useUnreadMessageCount(accessToken)
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 820px)').matches)
  const menuExpanded = isMobile ? menuOpen : !sidebarCollapsed
  const toggleMenu = () => isMobile ? setMenuOpen(value => !value) : setSidebarCollapsed(value => !value)
  const closeMenu = () => isMobile ? setMenuOpen(false) : setSidebarCollapsed(true)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 820px)')
    const update = () => { setIsMobile(media.matches); setMenuOpen(false) }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const current = links.find(({ to }) => pathname === to || (to !== '/dashboard' && pathname.startsWith(to.split('/dashboard')[0])))
  useEffect(() => { setMenuOpen(false); window.scrollTo(0, 0) }, [pathname])
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])
  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <a href="#main-content" className="skip-link">Saltar al contenido</a>
      {menuOpen && <button className="sidebar-backdrop" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}
      <aside id="workspace-sidebar" className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
        <Link to="/dashboard" className="brand"><span className="brand-mark"><Icon name="home" /></span>realty<span className="brand-dot">.</span></Link>
        <button className="close-sidebar icon-button" onClick={closeMenu} aria-label="Ocultar menú lateral" aria-controls="workspace-sidebar"><Icon name="close" /></button></div>
        <span className="workspace-label">TU ESPACIO INMOBILIARIO</span>
        <nav id="workspace-navigation" aria-label="Navegación principal" className={menuOpen ? 'sidebar-nav is-open' : 'sidebar-nav'}>
          {links.map(({ to, label, icon }) => <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon name={icon} /><span>{label}</span>{to === '/messages' && unread > 0 && <span className="nav-count" aria-label={`${unread} mensajes sin leer`}>{unread}</span>}</NavLink>)}
          <div className="sidebar-tip"><span className="eyebrow">CRECE EN EQUIPO</span><strong>Crecer es mejor<br />en equipo.</strong><p>Conecta con tu inmobiliaria y trabaja junto a otros asesores.</p><Link to="/organization/dashboard">Ver mi equipo <Icon name="arrow" /></Link></div>
          <div className="sidebar-account"><NavLink to="/auth/profile" className="nav-item"><Icon name="user" />Mi perfil</NavLink><button className="nav-item" onClick={logout}><Icon name="logout" />Cerrar sesión</button></div>
        </nav>

      </aside>
      <div className="workspace">
        <header className={`topbar ${pathname === '/map' ? 'map-topbar' : ''}`}><button className="mobile-menu sidebar-toggle icon-button" onClick={toggleMenu} aria-expanded={menuExpanded} aria-controls="workspace-sidebar" aria-label={menuExpanded ? 'Ocultar menú lateral' : 'Mostrar menú lateral'}><Icon name="menu" /></button><div className="breadcrumb">Mi espacio <span>/</span> <strong>{pathname === '/auth/profile' ? 'Mi perfil' : current?.label || 'Propiedades'}</strong></div><div className="topbar-actions"><RequirementNotices /><Link to="/properties/create" className="button button-primary button-small"><Icon name="plus" />Publicar propiedad</Link><Link to="/auth/profile" className="profile-link" aria-label="Ir a mi perfil"><span className="avatar">{user?.firstName?.[0]}{user?.lastName?.[0]}</span><span className="profile-label"><strong>{user?.firstName} {user?.lastName}</strong><small>Mi perfil</small></span></Link></div></header>
        <main id="main-content" className={`workspace-content ${pathname === '/map' ? 'map-content' : ''}`} tabIndex={-1}><Outlet /></main>
        <footer className={`workspace-footer ${pathname === '/map' ? 'map-footer-hidden' : ''}`}><span>realty. · Tu próxima oportunidad empieza aquí.</span><span>Un espacio para conectar.</span></footer>
      </div>
    </div>
  )
}
