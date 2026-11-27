import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { User } from '@shared/types'
import { Icon } from '@/components/ui/Icon'
import { buildPropertyShareMessage, canShareOwnProperty, propertyCommissionMessage, propertyWhatsAppShareUrl, type ShareableProperty } from '@/utils/propertyShare'
import { canSharePropertyPhotos, isDesktopMac, preparePropertyPhotos, sharePreparedPropertyPhotos } from '@/services/propertyShare'
import { createPhotoArchive } from '@/utils/photoArchive'
import './PropertyShare.css'

export function PropertyShare({ property, user }: { property: ShareableProperty; user: User | null }) {
  const [open, setOpen] = useState(false)
  if (!canShareOwnProperty(user, property) || !user) return null
  return <>
    <button type="button" className="button property-share-trigger w-full" onClick={() => setOpen(true)}><Icon name="whatsapp" fill="currentColor" stroke="none" />Compartir propiedad</button>
    {open && <PropertyShareDialog key={property.id} property={property} user={user} onClose={() => setOpen(false)} />}
  </>
}

function PropertyShareDialog({ property, user, onClose }: { property: ShareableProperty; user: User; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)
  const preparation = useRef<AbortController | null>(null)
  const alive = useRef(true)
  const images = useMemo(() => [...new Set(property.images || [])], [property.images])
  const [selected, setSelected] = useState(() => new Set(images))
  const [message, setMessage] = useState(() => buildPropertyShareMessage(property, user))
  const [includeCommission, setIncludeCommission] = useState(false)
  const [editing, setEditing] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [files, setFiles] = useState<File[] | null>(null)
  const [preparing, setPreparing] = useState(images.length > 0)
  const [prepareAttempt, setPrepareAttempt] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [nativeFailed, setNativeFailed] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const commission = propertyCommissionMessage(property)
  const outgoingMessage = [message.trim(), includeCommission && commission].filter(Boolean).join('\n\n')
  const selectedImages = useMemo(() => images.filter(url => selected.has(url)), [images, selected])
  const selectedCount = selectedImages.length
  const macDesktop = useMemo(() => isDesktopMac(), [])
  // General file-sharing support doesn't guarantee WhatsApp is a registered target.
  const canSharePhotos = useMemo(() => !macDesktop && !nativeFailed && canSharePropertyPhotos(files), [files, nativeFailed, macDesktop])
  const photoShareIsPrimary = selectedCount > 0 && !macDesktop && !nativeFailed && (!files || canSharePhotos)

  useEffect(() => {
    alive.current = true
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    dialog.current?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      alive.current = false
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [])

  useEffect(() => {
    const request = new AbortController()
    preparation.current = request
    setFiles(null); setError(''); setNotice(''); setNativeFailed(false)
    if (!selectedImages.length) { setPreparing(false); return () => request.abort() }
    setPreparing(true)
    void preparePropertyPhotos(selectedImages, property.title, request.signal).then(prepared => {
      if (!request.signal.aborted) setFiles(prepared)
    }).catch(failure => {
      if (!request.signal.aborted) setError(failure instanceof Error && failure.message !== 'Failed to fetch' ? failure.message : 'No pudimos preparar las fotos. Comprueba tu conexión y vuelve a intentar.')
    }).finally(() => { if (!request.signal.aborted) setPreparing(false) })
    return () => request.abort()
  }, [selectedImages, property.title, prepareAttempt])

  const changeSelection = (next: Set<string>) => { preparation.current?.abort(); setSelected(next); setDownloaded(false); setFiles(null); setPreparing(next.size > 0); setError(''); setNotice(''); setNativeFailed(false) }
  const copyMessage = async () => {
    setError(''); setNotice('')
    try {
      await navigator.clipboard.writeText(outgoingMessage)
      if (alive.current) setNotice('Mensaje copiado')
    } catch {
      setEditing(true)
      requestAnimationFrame(() => { textarea.current?.focus(); textarea.current?.select() })
      if (alive.current) setError('Copia el texto seleccionado con ⌘C o Ctrl+C.')
    }
  }
  const sharePhotos = async () => {
    if (!files?.length || sharing) return
    setSharing(true); setError(''); setNotice('')
    try {
      // Files are prepared before this click, preserving the browser's user activation.
      await sharePreparedPropertyPhotos(files, property.title, outgoingMessage)
      if (alive.current) setNotice('Revisa las fotos en WhatsApp antes de enviar.')
    } catch (failure) {
      if (alive.current && !(failure instanceof Error && failure.name === 'AbortError')) {
        setNativeFailed(true)
        setError('Descarga las fotos para adjuntarlas en WhatsApp.')
      }
    } finally { if (alive.current) setSharing(false) }
  }
  const downloadPhotos = async () => {
    if (!files?.length || downloading) return
    setDownloading(true); setError(''); setNotice('')
    try {
      const archive = await createPhotoArchive(files)
      if (!alive.current) return
      const url = URL.createObjectURL(archive)
      const link = document.createElement('a')
      link.href = url; link.download = `realty-fotos-${property.id.replace(/[^a-z0-9-]/gi, '') || 'propiedad'}.zip`
      document.body.append(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setDownloaded(true)
      setNotice('Fotos descargadas. Abre el ZIP y arrástralas al chat.')
    } catch { if (alive.current) setError('No pudimos crear la descarga. Inténtalo de nuevo.') }
    finally { if (alive.current) setDownloading(false) }
  }

  return createPortal(<dialog ref={dialog} className="property-share-dialog" aria-labelledby="property-share-title"
    onCancel={event => { event.preventDefault(); onClose() }}>
    <header className="property-share-heading">
      <span className="property-share-heading-icon"><Icon name="whatsapp" width="27" height="27" fill="currentColor" stroke="none" /></span>
      <div><h2 id="property-share-title">Compartir propiedad</h2><p className="property-share-property">{property.title}</p></div>
      <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar compartir propiedad" autoFocus><Icon name="close" /></button>
    </header>
    <div className="property-share-content">
      <section className="property-share-message" aria-labelledby="property-share-message-heading">
        <div className="property-share-section-title"><h3 id="property-share-message-heading"><span className="property-share-step">1</span>Mensaje</h3>
          <button type="button" className="property-share-edit" aria-pressed={editing} onClick={() => setEditing(previous => !previous)}><Icon name={editing ? 'check' : 'edit'} width="16" height="16" />{editing ? 'Listo' : 'Editar'}</button>
        </div>
        <div className="property-share-message-card">
          {editing ? <><label className="property-share-sr-only" htmlFor="property-share-message">Mensaje para WhatsApp</label><textarea ref={textarea} id="property-share-message" value={message} onChange={event => { setMessage(event.target.value); setNotice('') }} spellCheck rows={10} autoFocus /></>
            : <div id="property-share-preview" className="property-share-preview" tabIndex={0} role="region" aria-label="Vista previa del mensaje para WhatsApp">
              <div className="property-share-bubble">{outgoingMessage ? outgoingMessage.split(/\n{2,}/).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph.split(/(\*[^*\n]+\*)/g).map((part, index) => part.startsWith('*') && part.endsWith('*') ? <strong key={index}>{part.slice(1, -1)}</strong> : part)}</p>) : <span className="property-share-empty-message">Escribe un mensaje para compartir.</span>}</div>
            </div>}
          <div className="property-share-message-tools">
            {editing ? <button type="button" className="property-share-reset" onClick={() => { setMessage(buildPropertyShareMessage(property, user)); setNotice('Texto restablecido'); setError('') }}><Icon name="back" width="15" height="15" />Restablecer</button> : <span className="property-share-preview-label"><Icon name="eye" width="15" height="15" />Vista previa</span>}
            <button type="button" className="property-share-copy" onClick={copyMessage} disabled={!outgoingMessage}><Icon name={notice === 'Mensaje copiado' ? 'check' : 'copy'} width="16" height="16" />{notice === 'Mensaje copiado' ? 'Copiado' : 'Copiar mensaje'}</button>
          </div>
        </div>
        {commission && <div className="property-share-commission"><label><span>Incluir comisión</span><input type="checkbox" role="switch" checked={includeCommission} onChange={event => { setIncludeCommission(event.target.checked); setNotice('') }} /></label>{includeCommission && <p>{commission}</p>}</div>}
      </section>
      <section className="property-share-photos" aria-labelledby="property-share-photos-heading" aria-busy={preparing}>
        <div className="property-share-section-title"><h3 id="property-share-photos-heading"><span className="property-share-step">2</span>Fotos <span className="property-share-count">{selectedCount}/{images.length}</span></h3>
          {images.length > 0 && <button type="button" disabled={downloading || sharing} onClick={() => changeSelection(selectedCount === images.length ? new Set() : new Set(images))}>{selectedCount === images.length ? 'Quitar todas' : 'Elegir todas'}</button>}
        </div>
        {images.length ? <div className="property-share-photo-grid" data-count={images.length}>{images.map((url, index) => <label key={url} className={selected.has(url) ? 'is-selected' : ''}>
          <img src={url} alt={`Fotografía ${index + 1} de ${property.title}`} loading="lazy" />
          <input type="checkbox" aria-label={`Incluir fotografía ${index + 1}`} checked={selected.has(url)} disabled={downloading || sharing} onChange={() => { const next = new Set(selected); if (next.has(url)) next.delete(url); else next.add(url); changeSelection(next) }} />
          <span className="property-share-photo-check" aria-hidden="true">{selected.has(url) && <Icon name="check" width="15" height="15" />}</span><span className="property-share-photo-number" aria-hidden="true">{index + 1}</span>
        </label>)}</div> : <div className="property-share-empty"><Icon name="photos" width="30" height="30" /><p>Sin fotos. Comparte solo el mensaje.</p></div>}
        <div className="property-share-photo-status" role="status">{selectedCount > 0 ? <><Icon name={preparing ? 'photos' : files ? 'check' : 'close'} width="16" height="16" />{preparing ? 'Preparando fotos…' : files ? `${selectedCount} ${selectedCount === 1 ? 'foto lista' : 'fotos listas'}` : 'No se pudieron preparar las fotos'}</> : 'Toca las fotos que quieras incluir'}</div>
        {selectedCount > 0 && !photoShareIsPrimary && <details className="property-share-help"><summary>¿Cómo agrego las fotos?<Icon name="chevronRight" width="16" height="16" /></summary><ol>
          <li><Icon name="download" /><span>Descarga las fotos</span></li><li><Icon name="photos" /><span>Abre el archivo ZIP</span></li><li><Icon name="whatsapp" fill="currentColor" stroke="none" /><span>Arrástralas al chat de WhatsApp</span></li>
        </ol></details>}
        {files && canSharePhotos && <button type="button" className="property-share-download" disabled={downloading || sharing} onClick={downloadPhotos}><Icon name="download" width="16" height="16" />Descargar fotos</button>}
      </section>
    </div>
    <div className="property-share-feedback" aria-live="polite">{notice && <p role="status"><Icon name="check" width="17" height="17" />{notice}</p>}{error && <p role="alert">{error}</p>}</div>
    <footer className="property-share-actions">
      <span className="property-share-ready"><Icon name="message" width="17" height="17" />Mensaje{selectedCount > 0 && <> + {selectedCount} {selectedCount === 1 ? 'foto' : 'fotos'}</>}</span>
      <div className="property-share-primary-actions">
        {photoShareIsPrimary && outgoingMessage && <a className="property-share-text-only" href={propertyWhatsAppShareUrl(outgoingMessage)} target="_blank" rel="noopener noreferrer">Solo mensaje</a>}
        {selectedCount > 0 && <button type="button" className={`button ${photoShareIsPrimary ? 'property-share-whatsapp' : 'button-secondary property-share-photo-secondary'}`} disabled={preparing || downloading || sharing}
          onClick={!files ? () => setPrepareAttempt(attempt => attempt + 1) : canSharePhotos ? sharePhotos : downloadPhotos}>
          <Icon name={photoShareIsPrimary ? 'whatsapp' : downloaded ? 'check' : 'download'} width="20" height="20" {...(photoShareIsPrimary ? { fill: 'currentColor', stroke: 'none' } : {})} />
          {preparing ? 'Preparando…' : downloading ? 'Descargando…' : sharing ? 'Compartiendo…' : !files ? 'Reintentar fotos' : canSharePhotos ? 'Compartir por WhatsApp' : downloaded ? 'Descargar otra vez' : 'Fotos (.zip)'}
        </button>}
        {!photoShareIsPrimary && <a className="button property-share-whatsapp" href={propertyWhatsAppShareUrl(outgoingMessage)} target="_blank" rel="noopener noreferrer" aria-disabled={!outgoingMessage} onClick={event => { if (!outgoingMessage) event.preventDefault() }}><Icon name="whatsapp" width="20" height="20" fill="currentColor" stroke="none" />Compartir por WhatsApp<Icon name="arrow" width="17" height="17" /></a>}
      </div>
    </footer>
  </dialog>, document.body)
}
