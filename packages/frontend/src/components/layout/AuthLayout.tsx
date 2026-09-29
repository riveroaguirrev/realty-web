import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
const Brand = () => <Link to="/auth/login" className="brand"><span className="brand-mark"><Icon name="home" /></span>realty<span className="brand-dot">.</span></Link>
export const AuthLayout = ({ children, title, description }: { children: ReactNode; title: string; description: string }) => <div className="auth-layout"><aside className="auth-story"><Brand /><div><span className="banner-label">PERSONAS. ESPACIOS. OPORTUNIDADES.</span><h2>Un lugar para<br />tu próximo<br />gran paso.</h2><p>Descubre propiedades, conecta con asesores y gestiona tus oportunidades en un solo espacio.</p></div><footer>Tu mundo inmobiliario, más simple.</footer></aside><main className="auth-main"><div className="auth-heading"><Brand /><p className="eyebrow">BIENVENIDO A REALTY</p><h2>{title}</h2><p>{description}</p></div><div><div className="auth-form-card">{children}</div></div></main></div>
