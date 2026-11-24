import { Icon, type IconName } from '@/components/ui/Icon'
import type { ReactNode } from 'react'
import { formatPrice } from '@/utils/propertyPresentation'
import './PropertyFullDetails.css'

const labels: Record<string, string> = {
  AVAILABLE: 'Disponible', UNDER_OFFER: 'Con oferta', SOLD: 'Vendido', RENT: 'Alquilado', ARCHIVED: 'Archivado',
  NEW: 'Nuevo', EXCELLENT: 'Excelente', GOOD: 'Bueno', FAIR: 'Regular', NEEDS_REPAIR: 'Requiere reparación',
  UNFURNISHED: 'Sin amoblar', PARTIALLY_FURNISHED: 'Parcialmente amoblado', FULLY_FURNISHED: 'Completamente amoblado', DOESNT_MATTER: 'Indiferente',
  ALLOWED: 'Permitidas', NOT_ALLOWED: 'No permitidas', RESTRICTIONS: 'Con restricciones',
  hasElevator: 'Ascensor', hasSecurityGate: 'Portón de seguridad', hasGym: 'Gimnasio', hasSecurity: 'Seguridad',
  balcony: 'Balcón', patio: 'Patio', terrace: 'Terraza', groundFloor: 'Planta baja', hasGroundFloor: 'Planta baja',
  electricity: 'Electricidad', water: 'Agua', internet: 'Internet', gas: 'Gas', stove: 'Cocina', refrigerator: 'Refrigerador', washer: 'Lavadora',
  name: 'Nombre', phone: 'Teléfono', email: 'Correo', deedUrl: 'Título de propiedad', taxReceipt: 'Comprobante de impuestos',
  date: 'Fecha', price: 'Precio', amount: 'Importe', url: 'Enlace', title: 'Título',
}
const humanize = (value: string) => labels[value] || value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ')
function display(value: unknown): ReactNode {
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (value == null || value === '') return 'Sin especificar'
  if (Array.isArray(value)) return <ul>{value.map((item, index) => <li key={index}>{display(item)}</li>)}</ul>
  if (typeof value === 'object') return <dl className="full-detail-nested">{Object.entries(value).map(([key, item]) => <div key={key}><dt>{humanize(key)}</dt><dd>{display(item)}</dd></div>)}</dl>
  const text = String(value)
  if (/^https?:\/\//i.test(text)) return <a href={text} target="_blank" rel="noopener noreferrer">Abrir enlace ↗</a>
  return humanize(text)
}
const fieldIcons: Record<string, IconName> = {
  'Estado de la publicación': 'check', 'Condición': 'home', 'Amoblado': 'sofa', 'Parqueos': 'car', 'Garaje': 'car', 'Jardín': 'garden', 'Piscina': 'pool',
  'Superficie del terreno (m²)': 'area', 'Año de construcción': 'calendar', 'Año de remodelación': 'calendar', 'Características adicionales': 'home', 'Comodidades': 'sofa', 'Electrodomésticos': 'bolt',
  'Comisión (%)': 'money', 'Impuesto del inmueble': 'money', 'Expensas': 'money', 'Servicios': 'bolt', 'Alquiler mensual': 'money', 'Amoblado para alquiler': 'sofa',
  'Mascotas permitidas': 'paw', 'Política de mascotas': 'paw', 'Expensas incluidas': 'money', 'Wifi incluido': 'wifi', 'Disponible desde': 'calendar',
  'Código postal': 'pin', 'Exclusiva': 'check', 'Ubicación publicada': 'pin', 'Radio aproximado (m)': 'map', 'Centro educativo cercano': 'building', 'Distancia al centro educativo (km)': 'pin', 'Distancia al transporte (km)': 'car',
  'Video': 'video', 'Recorrido virtual': 'eye', 'Publicado': 'calendar', 'Creado': 'calendar', 'Contacto registrado': 'user', 'Notas de visita': 'file', 'Documentación': 'file', 'Historial de precios': 'money', 'Visualizaciones': 'eye', 'Guardados en favoritos': 'heart', 'Última actualización': 'calendar',
}
type Row = [string, unknown]
export function PropertyFullDetails({ property: p, canManage }: { property: Record<string, any>; canManage: boolean }) {
  const money = (value: unknown) => value == null ? undefined : formatPrice(Number(value), p.currency)
  const date = (value: unknown) => value && !Number.isNaN(new Date(String(value)).getTime()) ? new Date(String(value)).toLocaleDateString('es-BO') : undefined
  const sections: { title: string; rows: Row[] }[] = [
    { title: 'Características del inmueble', rows: [['Estado de la publicación', p.status], ['Condición', p.condition], ['Amoblado', p.furnished], ['Parqueos', p.parking], ['Garaje', p.hasGarage], ['Jardín', p.hasGarden], ['Piscina', p.hasPool], ['Superficie del terreno (m²)', p.lotSize], ['Año de construcción', p.yearBuilt], ['Año de remodelación', p.yearRenovated]] },
    { title: 'Equipamiento y comodidades', rows: [['Características adicionales', p.features], ['Comodidades', p.amenities], ['Electrodomésticos', p.appliances]] },
    { title: 'Costos y condiciones', rows: [['Comisión (%)', p.commissionPercentage], ['Impuesto del inmueble', money(p.propertyTax)], ['Expensas', money(p.hoaFees)], ['Servicios', p.utilities], ['Alquiler mensual', money(p.rentalMonthlyRate)], ['Amoblado para alquiler', p.rentalFurnished], ['Mascotas permitidas', p.petsAllowed], ['Política de mascotas', p.petPolicy], ['Expensas incluidas', p.expensesIncluded], ['Wifi incluido', p.wifiIncluded], ['Disponible desde', date(p.availableDate)]] },
    { title: 'Ubicación y entorno', rows: [['Código postal', p.zipCode], ['Exclusiva', p.isExclusive], ['Ubicación publicada', p.isExclusive && p.locationMode === 'EXACT' ? 'Exacta' : 'Aproximada'], ['Radio aproximado (m)', p.locationMode !== 'EXACT' ? p.locationRadiusMeters : undefined], ['Centro educativo cercano', p.school], ['Distancia al centro educativo (km)', p.distanceToSchool], ['Distancia al transporte (km)', p.distanceToTransit]] },
    { title: 'Videos y recorridos', rows: [['Video', p.videoUrl], ['Recorrido virtual', p.virtualTourUrl]] },
    { title: 'Publicación', rows: [['Publicado', date(p.publishedAt)], ['Creado', date(p.createdAt)]] },
  ]
  if (canManage) sections.push({ title: 'Información de gestión', rows: [['Contacto registrado', p.contact], ['Notas de visita', p.visitNotes], ['Documentación', p.documents], ['Historial de precios', p.priceHistory], ['Visualizaciones', p.viewCount], ['Guardados en favoritos', p.favoritesCount], ['Última actualización', date(p.updatedAt)]] })
  return <div className="property-full-details">{sections.map(section => {
    const rows = section.rows.filter(([, value]) => value != null && value !== '' && !(Array.isArray(value) && !value.length) && !(typeof value === 'object' && !Object.keys(value).length))
    return rows.length ? <section key={section.title}><h2>{section.title}</h2><dl className="full-detail-grid">{rows.map(([label, value]) => <div key={label}><dt>{fieldIcons[label] && <Icon name={fieldIcons[label]} width="18" height="18" />}{label}</dt><dd>{display(value)}</dd></div>)}</dl></section> : null
  })}</div>
}
