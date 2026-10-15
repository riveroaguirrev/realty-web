export interface MapboxPlace {
  id: string
  place_name: string
  center: [number, number]
  text?: string
  address?: string
  place_type?: string[]
  context?: { id: string; text: string }[]
}

export interface LocationAddress { address: string; neighborhood: string; city: string }

export interface MapboxReverseFeature {
  id?: string
  text?: string
  address?: string
  place_type?: string[]
  context?: { id: string; text: string }[]
  properties?: {
    feature_type?: string
    name?: string
    name_preferred?: string
    context?: Record<string, { name?: string; street_name?: string; address_number?: string }>
  }
}

export function mapboxAddress(features: MapboxReverseFeature[]): LocationAddress {
  const address = features.find(feature => feature.place_type?.includes('address') || feature.properties?.feature_type === 'address')
  const street = features.find(feature => feature.properties?.feature_type === 'street')
  const contexts = features.flatMap(feature => [
    { id: feature.id ?? '', text: feature.text ?? '' }, ...(feature.context ?? []),
    ...Object.entries(feature.properties?.context ?? {}).map(([type, context]) => ({ id: `${type}.`, text: context.name ?? '' })),
    { id: `${feature.properties?.feature_type}.`, text: feature.properties?.name_preferred ?? feature.properties?.name ?? '' },
  ])
  const text = (type: string) => contexts.find(context => context.id.startsWith(`${type}.`) && context.text)?.text ?? ''
  const neighborhood = text('neighborhood') || text('locality')
  const city = text('place')
  return {
    address: address ? address.properties?.name_preferred ?? address.properties?.name ?? [address.text, address.address].filter(Boolean).join(' ') : street?.properties?.name ?? '',
    neighborhood: neighborhood.toLocaleLowerCase() === city.toLocaleLowerCase() ? '' : neighborhood,
    city,
  }
}
