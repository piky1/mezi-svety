import { useState, useEffect, useRef } from 'react'
import { subscribeToChatMessages, sendChatMessage, deleteChatMessage, pinChatMessage } from '../firebase/db'
import { useAuth } from '../hooks/useAuth'

export default function Chat() {
  const { userData } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const isAdmin = userData?.isAdmin

  useEffect(() => {
    const unsub = subscribeToChatMessages(setMessages)
    return unsub
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await sendChatMessage(userData.uid, userData.username, text)
      setText('')
    } finally { setSending(false) }
  }

  const formatTime = (ts) => {
    if (!ts?.toDate) return ''
    const d = ts.toDate()
    return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
  }

  const pinnedMsgs = messages.filter(m => m.pinned)

  return (
    <div className="page" style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 56px)',
      paddingBottom: 0, paddingTop: '1rem',
    }}>
      <h2 className="heading mb-2" style={{ fontSize: '1.2rem', color: 'var(--gold)', flexShrink: 0 }}>💬 Chat</h2>

      {/* Připnuté zprávy */}
      {pinnedMsgs.length > 0 && (
        <div style={{ flexShrink: 0, marginBottom: '0.5rem' }}>
          {pinnedMsgs.map(msg => (
            <div key={msg.id} style={{
              background: 'rgba(201,168,76,0.1)', border: '1px solid var(--gold-dim)',
              borderRadius: 'var(--radius)', padding: '0.45rem 0.75rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem',
            }}>
              <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>📌</span>
              <span className="text-xs text-gold font-cinzel" style={{ flexShrink: 0 }}>{msg.username}:</span>
              <span className="text-sm" style={{ flex: 1, minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word' }}>{msg.text}</span>
              {isAdmin && (
                <button onClick={() => pinChatMessage(msg.id, false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Seznam zpráv */}
      <div style={{
        flex: 1, overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        gap: '0.4rem', paddingBottom: '0.5rem', minHeight: 0,
      }}>
        {messages.length === 0 && (
          <p className="text-muted text-sm" style={{ textAlign: 'center', marginTop: '2rem' }}>
            Zatím žádné zprávy. Začni konverzaci!
          </p>
        )}

        {messages.map(msg => {
          const isMe = msg.uid === userData?.uid
          const isSystem = msg.type === 'system'

          if (isSystem) return (
            <div key={msg.id} style={{ textAlign: 'center', padding: '0.15rem 0', position: 'relative' }}>
              <span style={{
                fontSize: '0.75rem', color: 'var(--text-muted)',
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 999, padding: '0.15rem 0.7rem',
                display: 'inline-block',
                maxWidth: '90%',
                overflowWrap: 'break-word', wordBreak: 'break-word',
              }}>{msg.text}</span>
              {isAdmin && (
                <button onClick={() => deleteChatMessage(msg.id)}
                  style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem' }}>🗑️</button>
              )}
            </div>
          )

          return (
            <div key={msg.id} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: isMe ? 'flex-end' : 'flex-start',
            }}>
              {!isMe && (
                <span style={{
                  fontSize: '0.7rem', color: 'var(--text-muted)',
                  marginBottom: '0.1rem', marginLeft: '0.5rem',
                  fontFamily: 'Cinzel, serif',
                }}>
                  {msg.username}
                </span>
              )}
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '0.3rem',
                flexDirection: isMe ? 'row-reverse' : 'row',
                width: '100%',
              }}>
                <div style={{
                  /* Klíčová oprava: max-width + overflow handling */
                  maxWidth: 'min(75%, 320px)',
                  minWidth: 0,
                  padding: '0.5rem 0.85rem',
                  background: isMe ? 'rgba(201,168,76,0.18)' : 'var(--bg3)',
                  border: `1px solid ${isMe ? 'var(--gold-dim)' : 'var(--border)'}`,
                  borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  /* Správné zalamování */
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.95rem',
                  lineHeight: 1.5,
                }}>
                  {msg.text}
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => pinChatMessage(msg.id, !msg.pinned)} title={msg.pinned ? 'Odepnout' : 'Připnout'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: msg.pinned ? 'var(--gold)' : 'var(--text-muted)', padding: '0.1rem' }}>📌</button>
                    <button onClick={() => deleteChatMessage(msg.id)} title="Smazat"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--text-muted)', padding: '0.1rem' }}>🗑️</button>
                  </div>
                )}
              </div>
              <span style={{
                fontSize: '0.62rem', color: 'var(--text-muted)',
                marginTop: '0.1rem',
                marginLeft: isMe ? 0 : '0.5rem',
                marginRight: isMe ? '0.5rem' : 0,
              }}>
                {formatTime(msg.createdAt)}
              </span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{
        display: 'flex', gap: '0.5rem',
        padding: '0.65rem 0',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg)',
        flexShrink: 0,
      }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Napiš zprávu..."
          style={{ flex: 1, minWidth: 0 }}
          autoComplete="off"
          maxLength={500}
        />
        <button type="submit" className="btn btn-gold"
          disabled={sending || !text.trim()}
          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
          {sending ? '...' : 'Poslat'}
        </button>
      </form>
    </div>
  )
}
