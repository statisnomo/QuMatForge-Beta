import { useState, useRef, useEffect } from 'react'
import MessageBubble from './components/MessageBubble.jsx'
import ChatInput from './components/ChatInput.jsx'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY || ''

const EXAMPLE_QUERIES = [
  'What is the single best material for photonic squeezing?',
  'Find materials with refractive index near 2.2 and no toxic elements',
  'Which candidates beat LiNbO3 and have zero hull distance?',
]

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: 'system',
      content:
        'Photonic materials readout online. Ask about squeezing performance, refractive index, stability, or composition constraints.',
    },
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function sendQuery(question) {
    setError(null)
    setMessages((m) => [...m, { role: 'user', content: question }])
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({ question }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Request failed (${res.status})`)
      }

      const data = await res.json()
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.answer, results: data.results },
      ])
    } catch (e) {
      setError(e.message)
      setMessages((m) => [
        ...m,
        { role: 'error', content: `Query failed: ${e.message}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-title">
          <span className="header-eyebrow">PS1 · Quinfosys</span>
          <h1>Photonic Materials Readout</h1>
        </div>
        <div className="header-baseline">
          <span className="baseline-label">LiNbO₃ baseline</span>
          <span className="baseline-value">2.86 dB</span>
        </div>
      </header>

      <main className="chat-window" ref={scrollRef}>
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {loading && (
          <div className="pending-row">
            <span className="pending-dot" />
            <span className="pending-dot" />
            <span className="pending-dot" />
          </div>
        )}
      </main>

      {messages.length <= 1 && (
        <div className="example-queries">
          {EXAMPLE_QUERIES.map((q) => (
            <button key={q} className="example-chip" onClick={() => sendQuery(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      <ChatInput onSend={sendQuery} disabled={loading} />
    </div>
  )
}
