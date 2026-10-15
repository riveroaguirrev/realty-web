import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { imageCrop } from '@/utils/imageCrop'

interface Props {
  src: string
  filename: string
  onSave: (file: File) => void
  onClose: () => void
}

export function PropertyImageEditor({ src, filename, onSave, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const image = useRef<HTMLImageElement>(null)
  const drag = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [viewportWidth, setViewportWidth] = useState(600)
  const [aspect, setAspect] = useState(16 / 9)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    dialog.current?.showModal()
    document.body.style.overflow = 'hidden'
    const observer = new ResizeObserver(entries => setViewportWidth(entries[0].contentRect.width))
    if (viewport.current) observer.observe(viewport.current)
    return () => {
      observer.disconnect()
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])

  const crop = size.width ? imageCrop(size.width, size.height, aspect, zoom, position.x, position.y) : null
  const scale = crop ? viewportWidth / crop.width : 1
  const reset = () => { setZoom(1); setPosition({ x: 50, y: 50 }) }

  const save = async () => {
    if (!image.current || !crop || saving) return
    setSaving(true)
    setError('')
    try {
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(Math.min(2048, crop.width))
      canvas.height = Math.max(1, Math.round(canvas.width / aspect))
      const context = canvas.getContext('2d')
      if (!context) throw new Error()
      context.fillStyle = '#fff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image.current, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error()), 'image/jpeg', .9))
      if (blob.size > 5 * 1024 * 1024) throw new Error()
      onSave(new File([blob], `${filename.replace(/\.[^.]+$/, '')}-recorte.jpg`, { type: 'image/jpeg' }))
    } catch {
      setError('No pudimos guardar el recorte. Prueba con una fotografía cargada desde tu dispositivo.')
    } finally { setSaving(false) }
  }

  return createPortal(<dialog ref={dialog} className="image-crop-dialog" aria-labelledby="image-crop-title" aria-describedby="image-crop-instructions" onCancel={event => { event.preventDefault(); if (!saving) onClose() }}>
    <div className="image-crop-heading"><div><span className="eyebrow">Elige el mejor encuadre</span><h2 id="image-crop-title">Ajustar fotografía</h2></div><button type="button" className="image-crop-close" onClick={onClose} disabled={saving} aria-label="Cerrar editor de fotografía">×</button></div>
    <p id="image-crop-instructions">Arrastra la foto y ajusta el zoom. El área del marco será la imagen que se guardará.</p>
    <div ref={viewport} className="image-crop-viewport" style={{ aspectRatio: String(aspect), maxWidth: `${aspect * 45}dvh`, marginInline: 'auto' }} role="group" aria-label="Encuadre de la fotografía. Usa las flechas para mover la imagen." tabIndex={0}
      onKeyDown={event => {
        const directions: Record<string, [number, number]> = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }
        const direction = directions[event.key]
        if (direction) { event.preventDefault(); setPosition(previous => ({ x: Math.max(0, Math.min(100, previous.x + direction[0])), y: Math.max(0, Math.min(100, previous.y + direction[1])) })) }
      }}
      onPointerDown={event => {
        if (!crop || saving) return
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { x: event.clientX, y: event.clientY, startX: position.x, startY: position.y }
      }}
      onPointerMove={event => {
        if (!drag.current || !crop) return
        const overflowX = size.width * scale - viewportWidth
        const overflowY = size.height * scale - viewportWidth / aspect
        setPosition({
          x: overflowX > 1 ? Math.max(0, Math.min(100, drag.current.startX - (event.clientX - drag.current.x) / overflowX * 100)) : 50,
          y: overflowY > 1 ? Math.max(0, Math.min(100, drag.current.startY - (event.clientY - drag.current.y) / overflowY * 100)) : 50,
        })
      }} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}>
      <img ref={image} src={src} crossOrigin="anonymous" alt="Vista previa del recorte" draggable={false} onLoad={event => setSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} onError={() => setError('No pudimos abrir esta fotografía. Intenta cargarla desde tu dispositivo.')} style={crop ? { width: size.width * scale, height: size.height * scale, left: -crop.x * scale, top: -crop.y * scale } : { opacity: 0 }} />
      {!size.width && !error && <span className="image-crop-loading" role="status">Cargando fotografía…</span>}
      <span className="image-crop-grid" aria-hidden="true" />
    </div>
    <div className="image-crop-tools"><fieldset disabled={saving}><legend>Formato del recorte</legend><div className="image-crop-ratios">{[{ label: 'Horizontal', ratio: 16 / 9 }, { label: 'Clásico', ratio: 4 / 3 }, { label: 'Cuadrado', ratio: 1 }].map(option => <button key={option.label} type="button" aria-pressed={aspect === option.ratio} onClick={() => { setAspect(option.ratio); reset() }}>{option.label}</button>)}</div></fieldset>
      <div className="image-crop-zoom"><label htmlFor="photo-crop-zoom">Zoom <output htmlFor="photo-crop-zoom">{Math.round(zoom * 100)}%</output></label><input id="photo-crop-zoom" className="crop-zoom" type="range" min="1" max="3" step="0.01" value={zoom} onChange={event => setZoom(Number(event.target.value))} disabled={saving || !size.width} /></div>
    </div>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="image-crop-actions"><button type="button" className="text-link" onClick={reset} disabled={saving}>Restablecer</button><div><button type="button" className="button button-secondary" onClick={onClose} disabled={saving}>Cancelar</button><button type="button" className="button button-primary" onClick={save} disabled={saving || !size.width}>{saving ? 'Guardando…' : 'Guardar recorte'}</button></div></div>
  </dialog>, document.body)
}
