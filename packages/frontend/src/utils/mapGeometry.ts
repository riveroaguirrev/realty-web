// Geographic distances in meters, independent of map zoom or screen size.
export function radiusPolygon(longitude: number, latitude: number, meters: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const angular = meters / 6371008.8
  const lat = latitude * Math.PI / 180
  const lng = longitude * Math.PI / 180
  const coordinates: number[][] = []
  for (let i = 0; i <= 80; i++) {
    const bearing = (i % 80) / 80 * Math.PI * 2
    const y = Math.asin(Math.sin(lat) * Math.cos(angular) + Math.cos(lat) * Math.sin(angular) * Math.cos(bearing))
    const x = lng + Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(lat), Math.cos(angular) - Math.sin(lat) * Math.sin(y))
    coordinates.push([x * 180 / Math.PI, y * 180 / Math.PI])
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coordinates] } }
}

