import ReadoutCard from './ReadoutCard.jsx'

export default function MessageBubble({ message }) {
  const { role, content, results } = message

  if (role === 'system') {
    return <div className="msg msg-system">{content}</div>
  }

  if (role === 'user') {
    return (
      <div className="msg-row msg-row-user">
        <div className="msg msg-user">{content}</div>
      </div>
    )
  }

  if (role === 'error') {
    return <div className="msg msg-error">{content}</div>
  }

  return (
    <div className="msg-row msg-row-assistant">
      <div className="msg msg-assistant">
        <p>{content}</p>
        {results && results.length > 0 && (
          <div className="readout-stack">
            {results.map((r) => (
              <ReadoutCard key={r.material_id} material={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
