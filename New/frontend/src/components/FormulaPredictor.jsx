import { useState } from 'react'

export default function FormulaPredictor({ apiBase, apiKey }) {
  const [formula, setFormula] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handlePredict(e) {
    e.preventDefault()
    const trimmed = formula.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`${apiBase}/api/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ formula: trimmed }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Prediction failed')
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="predictor-panel">
      <div className="predictor-label">Live score — any composition, not just the database</div>
      <form className="predictor-row" onSubmit={handlePredict}>
        <input
          type="text"
          className="predictor-input"
          placeholder="e.g. GaAsN, SrTiO3, BaPSe3…"
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
        />
        <button type="submit" className="predictor-button" disabled={loading || !formula.trim()}>
          {loading ? '…' : 'Predict'}
        </button>
      </form>
      {error && <div className="predictor-error">{error}</div>}
      {result && (
        <div className="predictor-result">
          <span className="predictor-formula">{result.formula}</span>
          <span className="predictor-score">
            {result.predicted_photonic_score.toFixed(2)}
            <span className="predictor-score-max">/{result.score_max}</span>
          </span>
        </div>
      )}
    </div>
  )
}