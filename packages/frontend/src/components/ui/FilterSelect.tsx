import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from './Icon'
import './FilterSelect.css'

export function FilterSelect({ id, label, value, options, onChange, disabled = false, variant = 'filter' }: {
  id: string; label: string; value: string; options: [string, string][]; onChange: (value: string) => void; disabled?: boolean; variant?: 'filter' | 'hero'
}) {
  const ref = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const selectedLabel = options.find(([key]) => key === value)?.[1] || ''
  const initialFocus = useRef<number | null>(null)
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: Event) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('focusin', closeOutside)
    const focusIndex = initialFocus.current ?? Math.max(0, options.findIndex(([key]) => key === value))
    menu.current?.querySelectorAll<HTMLButtonElement>('button')[focusIndex]?.focus({ preventScroll: true })
    initialFocus.current = null
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('focusin', closeOutside)
    }
  }, [open])
  useEffect(() => { if (disabled) setOpen(false) }, [disabled])

  const choose = (key: string) => {
    onChange(key)
    close()
    trigger.current?.focus({ preventScroll: true })
  }
  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault(); event.stopPropagation(); close(); trigger.current?.focus(); return
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || disabled || !options.length) return
    event.preventDefault()
    const buttons = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button') || [])
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    const selected = Math.max(0, options.findIndex(([key]) => key === value))
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
      : current < 0 ? selected : (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
    if (!open) { initialFocus.current = next; setOpen(true) }
    else buttons[next]?.focus({ preventScroll: true })
  }

  return <div ref={ref} className={`filter-select${variant === 'hero' ? ' filter-select-hero' : ''}`} data-open={open} onKeyDown={navigate}>
    <button ref={trigger} type="button" id={id} className="filter-select-trigger" disabled={disabled}
      aria-label={`${label}: ${selectedLabel}`} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-options`}
      onClick={() => setOpen(previous => !previous)}>
      {variant === 'hero' && <span className="hero-dropdown-label">{label}</span>}
      <span className="filter-select-value"><span>{selectedLabel}</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg></span>
    </button>
    {open && <div ref={menu} id={`${id}-options`} className="filter-select-options" role="listbox" aria-label={label}>
      {options.map(([key, text]) => <button key={key} type="button" role="option" aria-selected={value === key} tabIndex={value === key ? 0 : -1}
        className={value === key ? 'is-selected' : ''} onPointerDown={event => event.preventDefault()} onClick={() => choose(key)}>
        <span>{text}</span><span className="filter-select-check">{value === key && <Icon name="check" width="16" height="16" />}</span>
      </button>)}
    </div>}
  </div>
}
