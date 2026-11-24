import type { RequirementSuggestion } from '@shared/types/requirements'

export const RequirementCompatibility = ({ suggestion }: { suggestion: RequirementSuggestion }) => {
  const { score, breakdown, totalWeight, reasons, mismatches } = suggestion
  return <div className="req-match">
    {score == null ? <><strong>Compatible con los filtros generales</strong><p>Añade preferencias al requerimiento para calcular un porcentaje.</p></> : <>
      <div className="req-score"><strong>{score}% de compatibilidad</strong><span>Según los criterios solicitados</span></div>
      <meter className="req-score-meter" min={0} max={100} value={score} aria-label={`${score}% de compatibilidad`} />
    </>}
    <details className="req-match-details">
      <summary><span className="req-match-more">Más detalles</span><span className="req-match-less">Menos detalles</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary>
    {!!breakdown?.length && !!totalWeight ? <ul className="req-breakdown">{breakdown.map(criterion => <li key={criterion.key}>
      <div><strong>{criterion.label}</strong><span>{Number((criterion.weight / totalWeight * 100).toFixed(1))}% del cálculo</span></div>
      <span className={`req-criterion-state req-criterion-${criterion.status.toLowerCase()}`}>{criterion.status === 'MATCH' ? criterion.key === 'zone' ? 'Mencionada en el anuncio' : 'Cumple' : criterion.status === 'UNKNOWN' ? 'Por confirmar' : 'No cumple todo lo solicitado'}</span>
      <p>{criterion.details.join(' · ')}</p>
    </li>)}</ul> : <ul>{reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
    {mismatches.length > 0 && <div className="req-mismatches"><strong>Para revisar con el asesor</strong><ul>{mismatches.map(reason => <li key={reason}>{reason}</li>)}</ul></div>}
    </details>
  </div>
}
