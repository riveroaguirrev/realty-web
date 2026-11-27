import { Icon } from './Icon'
import './Pagination.css'

type PaginationProps = { page: number; totalPages: number; onChange: (page: number) => void; disabled?: boolean }

export const Pagination = ({ page, totalPages, onChange, disabled = false }: PaginationProps) => {
  if (totalPages <= 1) return null
  const start = totalPages <= 7 ? 1 : Math.max(2, Math.min(page - 1, totalPages - 3))
  const end = totalPages <= 7 ? totalPages : Math.min(totalPages - 1, Math.max(page + 1, 4))
  const pages: (number | string)[] = totalPages <= 7
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : [1, ...(start > 2 ? ['before'] : []), ...Array.from({ length: end - start + 1 }, (_, index) => start + index), ...(end < totalPages - 1 ? ['after'] : []), totalPages]
  const goTo = (next: number) => { if (!disabled && next >= 1 && next <= totalPages && next !== page) onChange(next) }

  return <nav className="pagination realty-pagination" aria-label="Páginas de resultados" aria-busy={disabled}>
    <button type="button" className="pagination-step" aria-label="Página anterior" title="Página anterior" disabled={disabled || page <= 1} onClick={() => goTo(page - 1)}><Icon name="chevronLeft" width="19" height="19" /></button>
    <ul className="pagination-pages">{pages.map(item => <li key={item}>{typeof item === 'number'
      ? <button type="button" className="pagination-number" aria-label={`Página ${item}`} aria-current={item === page ? 'page' : undefined} disabled={disabled} onClick={() => goTo(item)}>{item}</button>
      : <span className="pagination-ellipsis" aria-hidden="true">…</span>}</li>)}</ul>
    <button type="button" className="pagination-step" aria-label="Página siguiente" title="Página siguiente" disabled={disabled || page >= totalPages} onClick={() => goTo(page + 1)}><Icon name="chevronRight" width="19" height="19" /></button>
    <span className="sr-only" aria-live="polite" aria-atomic="true">Página {page} de {totalPages}</span>
  </nav>
}
