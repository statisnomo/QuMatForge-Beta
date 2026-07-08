const LINBO3_BASELINE = 2.86

export default function ReadoutCard({ material }) {
  const beatsBaseline = material.sq_dB_pred != null && material.sq_dB_pred > LINBO3_BASELINE

  return (
    <div className="readout-card">
      <div className="readout-header">
        <span className="readout-formula">{material.formula}</span>
        <span className="readout-id">{material.material_id}</span>
      </div>
      <div className="readout-grid">
        <Metric label="sq" value={material.sq_dB_pred} unit="dB" highlight={beatsBaseline} />
        <Metric label="gap" value={material.band_gap} unit="eV" />
        <Metric label="n" value={material.refractive_index} unit="" />
        <Metric label="piezo" value={material.piezoelectric_modulus} unit="C/m²" />
        <Metric label="hull" value={material.hull_eV} unit="eV" />
        <Metric label="score" value={material.photonic_score} unit="/11" />
      </div>
      {beatsBaseline && (
        <div className="readout-flag">exceeds LiNbO₃ baseline</div>
      )}
    </div>
  )
}

function Metric({ label, value, unit, highlight }) {
  const display = value == null ? '—' : typeof value === 'number' ? value.toFixed(3) : value
  return (
    <div className={`metric ${highlight ? 'metric-highlight' : ''}`}>
      <span className="metric-label">{label}</span>
      <span className="metric-value">
        {display}
        {unit && <span className="metric-unit">{unit}</span>}
      </span>
    </div>
  )
}
