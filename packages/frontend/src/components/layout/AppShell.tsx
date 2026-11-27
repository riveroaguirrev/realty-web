import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { organizationAPI } from '@/services/organization'
import './OrganizationIdentity.css'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useUnreadMessageCount } from '@/hooks/useUnreadMessageCount'
import { Icon, IconName } from '@/components/ui/Icon'
import { Avatar } from '@/components/ui/Avatar'
import { LogoutDialog } from './LogoutDialog'
import { RequirementNotices } from '@/components/requirements/RequirementNotices'
import '@/pages/Requirements.css'
import './Navigation.css'
import './Topbar.css'

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
  const isAdvisor = user?.role === 'ADVISOR'
  const { data: organization } = useQuery({
    queryKey: ['workspace-organization', user?.organizationId, accessToken],
    queryFn: () => organizationAPI.get(accessToken!, user!.organizationId!),
    enabled: isAdvisor && !!user?.organizationId && !!accessToken,
    staleTime: 60_000,
  })
  const unread = useUnreadMessageCount(accessToken)
  const { pathname } = useLocation()
  const isMessagesPage = pathname === '/messages' || pathname.startsWith('/messages/')
  const sidebarRef = useRef<HTMLElement>(null)
  const menuTriggerRef = useRef<HTMLButtonElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const profileTriggerRef = useRef<HTMLButtonElement>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const logoutTriggerRef = useRef<HTMLButtonElement | null>(null)
  const requestLogout = (trigger: HTMLButtonElement, fromProfile = false) => {
    logoutTriggerRef.current = fromProfile ? profileTriggerRef.current : trigger
    setProfileOpen(false)
    setLogoutOpen(true)
  }
  const cancelLogout = () => {
    setLogoutOpen(false)
    window.requestAnimationFrame(() => logoutTriggerRef.current?.focus())
  }
  useEffect(() => {
    if (!profileOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setProfileOpen(false); profileTriggerRef.current?.focus() }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [profileOpen])
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 820px)').matches)
  const closeMenu = () => { setMenuOpen(false); menuTriggerRef.current?.focus() }
  useEffect(() => {
    const media = window.matchMedia('(max-width: 820px)')
    const update = () => { setIsMobile(media.matches); setMenuOpen(false) }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (!isMobile || !menuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sidebarRef.current?.querySelector<HTMLButtonElement>('.navigation-close')?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector('.logout-dialog[open]')) return
      if (event.key === 'Escape') { setMenuOpen(false); menuTriggerRef.current?.focus() }
      if (event.key !== 'Tab') return
      const controls = sidebarRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      if (!controls?.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', onKeyDown) }
  }, [isMobile, menuOpen])
  const current = links.find(({ to }) => pathname === to || (to !== '/dashboard' && pathname.startsWith(to.split('/dashboard')[0])))
  useEffect(() => {
    window.scrollTo(0, 0)
    setProfileOpen(false)
    setMenuOpen(false)
  }, [pathname])
  return (
    <div className={`app-shell ${isMessagesPage ? 'messages-shell' : ''}`}>
      <a href="#main-content" className="skip-link">Saltar al contenido</a>
      {isMobile && menuOpen && <button className="navigation-backdrop" aria-label="Cerrar menú" onClick={closeMenu} />}
      <aside ref={sidebarRef} id="workspace-sidebar" className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`} aria-label="Menú lateral">
        <div className="brand-row">
        <Link to="/dashboard" className="brand" aria-label="Realty · Inicio"><span className="brand-mark"><Icon name="home" /></span><span className="brand-name">realty<span className="brand-dot">.</span></span></Link>
        <button className="navigation-close icon-button" aria-label="Cerrar menú" onClick={closeMenu}><Icon name="close" /></button></div>
        <span className="workspace-label">TU ESPACIO INMOBILIARIO</span>
        <nav id="workspace-navigation" aria-label="Navegación principal" className="sidebar-nav">
          {links.filter(({ to }) => isAdvisor || (!to.startsWith('/organization') && to !== '/properties' && to !== '/requirements')).map(({ to, label, icon }) => <NavLink key={to} to={to} title={label} aria-label={to === '/messages' && unread > 0 ? `${label}: ${unread} sin leer` : label} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon name={icon} /><span className="nav-label">{label}</span>{to === '/messages' && unread > 0 && <span className="nav-count" aria-label={`${unread} mensajes sin leer`}>{unread}</span>}</NavLink>)}
          {isAdvisor && <div className="sidebar-tip"><span className="eyebrow">CRECE EN EQUIPO</span><strong>Más conexiones.<br />Más oportunidades.</strong><p>Conecta con tu inmobiliaria y trabaja junto a otros asesores.</p><Link to="/organization/dashboard">Ver mi equipo <Icon name="arrow" /></Link></div>}
          <div className="sidebar-account"><NavLink to="/auth/profile" title="Mi perfil" className="nav-item"><Icon name="user" /><span className="nav-label">Mi perfil</span></NavLink><button type="button" className="nav-item" title="Cerrar sesión" aria-haspopup="dialog" onClick={event => requestLogout(event.currentTarget)}><Icon name="logout" /><span className="nav-label">Cerrar sesión</span></button></div>
        </nav>

      </aside>
      <div className="workspace">
        <header className={`topbar topbar-ordered ${pathname === '/map' ? 'map-topbar' : ''}`}>
          <button ref={menuTriggerRef} className="navigation-toggle icon-button" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} aria-controls="workspace-sidebar" onClick={() => setMenuOpen(value => !value)}><Icon name="menu" /></button>
          <nav className="topbar-context" aria-label="Ubicación actual">
            {isAdvisor ? <Link to="/organization/dashboard" className="topbar-organization" title={organization?.name || (user?.organizationId ? 'Mi inmobiliaria' : 'Asesor independiente')} aria-label={`Tu organización: ${organization?.name || (user?.organizationId ? 'Mi inmobiliaria' : 'Asesor independiente')}`}><Icon name="building" width="22" height="22" /><span>{organization?.name || (user?.organizationId ? 'Mi inmobiliaria' : 'Asesor independiente')}</span></Link> : <Link className="topbar-organization" to="/dashboard"><Icon name="home" width="21" height="21" /><span>Mi espacio</span></Link>}
            <span className="topbar-context-divider" aria-hidden="true">/</span>
            <strong className="topbar-current" aria-current="page" title={pathname === '/auth/profile' ? 'Mi perfil' : current?.label || 'Propiedades'}>{pathname === '/auth/profile' ? 'Mi perfil' : current?.label || 'Propiedades'}</strong>
          </nav>
          <div className="topbar-actions">
            {isAdvisor && <RequirementNotices />}
            {isAdvisor && pathname !== "/properties" && <Link to="/properties/create" className="button button-primary button-small topbar-publish" aria-label="Publicar propiedad" title="Publicar propiedad"><Icon name="plus" /><span>Publicar propiedad</span></Link>}
            <div className="profile-account" ref={profileRef} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setProfileOpen(false) }}>
          <button type="button" ref={profileTriggerRef} className="profile-trigger" aria-label={profileOpen ? 'Cerrar opciones de cuenta' : 'Abrir opciones de cuenta'} aria-expanded={profileOpen} aria-controls="profile-account-panel" title="Mi cuenta" onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setProfileOpen(true); window.requestAnimationFrame(() => profileRef.current?.querySelector<HTMLAnchorElement>('.profile-account-actions a')?.focus()) } }} onClick={() => setProfileOpen(value => !value)}><Avatar user={user} /><Icon name="chevronRight" className="topbar-profile-chevron" width="15" height="15" /></button>
          {profileOpen && <div id="profile-account-panel" className="profile-account-panel" aria-label="Opciones de cuenta">
            <div className="profile-account-details"><strong>{user?.firstName} {user?.lastName}</strong><span>{user?.email}</span></div>
            <div className="profile-account-actions"><Link to="/auth/profile" onClick={() => setProfileOpen(false)}><Icon name="user" />Ver perfil</Link><button type="button" aria-haspopup="dialog" onClick={event => requestLogout(event.currentTarget, true)}><Icon name="logout" />Cerrar sesión</button></div>
          </div>}
        </div></div></header>
        <main id="main-content" className={`workspace-content ${pathname === '/map' ? 'map-content' : ''} ${isMessagesPage ? 'messages-content' : ''}`} tabIndex={-1}><Outlet /></main>
        <footer className={`workspace-footer ${pathname === '/map' ? 'map-footer-hidden' : ''} ${isMessagesPage ? 'messages-footer-hidden' : ''}`}><span>realty. · Tu próxima oportunidad empieza aquí.</span><span>Un espacio para conectar.</span></footer>
      </div>
      {logoutOpen && <LogoutDialog onCancel={cancelLogout} onConfirm={logout} />}
    </div>
  )
}
