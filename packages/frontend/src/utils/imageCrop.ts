export function imageCrop(width: number, height: number, aspect: number, zoom: number, x: number, y: number) {
  const cropWidth = Math.min(width, height * aspect) / zoom
  const cropHeight = cropWidth / aspect
  return {
    x: (width - cropWidth) * Math.max(0, Math.min(100, x)) / 100,
    y: (height - cropHeight) * Math.max(0, Math.min(100, y)) / 100,
    width: cropWidth,
    height: cropHeight,
  }
}
