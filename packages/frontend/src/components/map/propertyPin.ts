/** Draw at double resolution so Mapbox pins stay sharp on high density screens. */
export const propertyPinImage = (color: string): ImageData => {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 80
  const context = canvas.getContext('2d')
  if (!context) throw new Error('No se pudo dibujar el marcador de ubicación.')
  const outline = new Path2D('M32 77C27 70 6 48 6 29a26 26 0 1 1 52 0c0 19-21 41-26 48Z')
  context.fillStyle = color
  context.fill(outline)
  context.strokeStyle = '#fff'
  context.lineWidth = 4
  context.stroke(outline)
  context.beginPath()
  context.arc(32, 29, 9, 0, Math.PI * 2)
  context.fillStyle = '#fff'
  context.fill()
  return context.getImageData(0, 0, canvas.width, canvas.height)
}
