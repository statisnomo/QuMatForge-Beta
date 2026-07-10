import { useState } from 'react'

export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  return (
    <form className="chat-input-row" onSubmit={handleSubmit}>
      <input
        type="text"
        className="chat-input"
        placeholder="Ask about squeezing, bandgap, refractive index, composition…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
      />
      <button type="submit" className="chat-send" disabled={disabled || !value.trim()}>
        Send
      </button>
    </form>
  )
}
