// Radius coordinates describe a deliberately chosen area center, never a private pin.
// Keep precise address fields out of discovery, favorites and similar listings.
export function publicPropertyLocation<T extends { isExclusive: boolean; locationMode: string; address: string; mapUrl?: string | null; zipCode?: string | null }>(property: T): T {
  if (property.isExclusive && property.locationMode === 'EXACT') return property
  return { ...property, address: 'Zona aproximada', mapUrl: null, zipCode: null }
}
