export const PROPERTY_TYPES: Record<string, string> = { RESIDENTIAL: 'Residencial', HOUSE: 'Casa', APARTMENT: 'Departamento', COMMERCIAL: 'Comercial', OFFICE: 'Oficina', INDUSTRIAL: 'Industrial', LAND: 'Terreno' }
export const formatPrice = (price: number | string, currency = 'USD') => new Intl.NumberFormat('es-BO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(price))
