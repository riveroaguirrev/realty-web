import { useEffect, useRef } from 'react'
import { Icon } from './Icon'
import './FilterSelect.css'

export function FilterSelect({ id, label, value, options, onChange }: {
  id: string; label: string; value: string; options: [string, string][]; onChange: (value: string) => void
}) {
  const ref = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) ref.current?.removeAttribute('open')
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])
  const close = () => ref.current?.removeAttribute('open')
  return <details ref={ref} className="filter-select" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close()
  }} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); ref.current?.querySelector('summary')?.focus() }
  }}>
    <summary id={id} aria-label={`${label}: ${options.find(([key]) => key === value)?.[1] || ''}`}>
      <span>{options.find(([key]) => key === value)?.[1]}</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m7 10 5 5 5-5" /></svg>
    </summary>
    <div className="filter-select-options" role="radiogroup" aria-label={label} onKeyDown={event => {
      if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'))
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length
      buttons[next]?.focus()
    }}>
      {options.map(([key, text]) => <button key={key} type="button" role="radio" aria-checked={value === key} className={value === key ? 'is-selected' : ''}
        onPointerDown={event => event.preventDefault()}
        onClick={() => { onChange(key); close(); ref.current?.querySelector('summary')?.focus() }}>
        <span>{text}</span>{value === key && <Icon name="check" width="16" height="16" />}
      </button>)}
    </div>
  </details>
}
