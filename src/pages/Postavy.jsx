import { useState, useEffect } from 'react'
import { subscribeToApprovedUsersForDisplay, sendCurse, cleanExpiredCurses } from '../firebase/db'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'
import XpBar from '../components/XpBar'
import CurseList from '../components/CurseList'
import Avatar from '../components/Avatar'

export default function Postavy() {
  const { userData, levelsHidden } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [view, setView] = useState('list') // 'list' = řádkové, 'grid' = čtvercové

  useEffect(() => {
    if (!userData) return
    const unsub = subscribeToApprovedUsersForDisplay(userData.uid, userData.isAdmin, setUsers)
    return unsub
  }, [userData?.uid])

  if (!userData) return null

  // Když admin skryl levely, běžní hráči nevidí žádné levely (svoje ani cizí).
  // Admin je vidí pořád. Při skrytí seřadíme podle jména, ať se pořadí nedá zneužít.
  const hideLevels = levelsHidden && !userData.isAdmin
  const displayUsers = hideLevels
    ? [...users].sort((a, b) => a.username.localeCompare(b.username, 'cs'))
    : users

  const cursesInInventory = (userData.inventory || []).filter(i => i.type === 'curse')

  const handleSendCurse = async (curse, targetUid) => {
    try {
      await sendCurse(userData.uid, targetUid, curse.id)
      toast(`Kletba ${curse.curseIcon} ${curse.curseName} vyslána!`, 'success')
    } catch { toast('Nepodařilo se vyslat kletbu.', 'error') }
  }

  // Rozbalený detail postavy — sdílený řádkovým i čtvercovým zobrazením
  const renderExpanded = (u, isMe) => {
    const uCursesInv = (u.inventory || []).filter(x => x.type === 'curse')
    const uTokens = (u.inventory || []).filter(x => x.type === 'spin_token')
    const uPending = (u.inventory || []).filter(x => x.type === 'pending_curse')
    return (
      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        {!hideLevels && <XpBar xp={u.xp} level={u.level} />}

        {/* Aktivní kletby */}
        <div className="mt-3">
          <p className="section-title">Aktivní kletby</p>
          <CurseList curses={u.activeCurses} />
        </div>

        {/* Inventář */}
        <div className="mt-3">
          <p className="section-title">Inventář</p>
          {uTokens.length === 0 && uCursesInv.length === 0 && uPending.length === 0
            ? <span className="text-muted text-xs">Prázdný inventář</span>
            : (
              <div className="flex flex-wrap gap-2">
                {uTokens.map(t => (
                  <span key={t.id} style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', border: '1px solid var(--gold-dim)', borderRadius: 999, padding: '0.15rem 0.6rem', fontSize: '0.78rem' }}>
                    🎡 Token
                  </span>
                ))}
                {uPending.map(c => (
                  <span key={c.id} style={{ background: 'rgba(136,68,170,0.12)', color: 'var(--purple2)', border: '1px solid rgba(136,68,170,0.3)', borderRadius: 999, padding: '0.15rem 0.6rem', fontSize: '0.78rem' }}>
                    ⏳ {c.curseName}
                  </span>
                ))}
                {uCursesInv.map(c => (
                  <span key={c.id} className={`curse-chip curse-${c.curseId}`}>
                    {c.curseIcon} {c.curseName}{c.tierName ? ` / ${c.tierName}` : ''}
                  </span>
                ))}
              </div>
            )
          }
        </div>

        {/* Vyslat kletbu — jen na jiné hráče (ne adminy, ne sebe) */}
        {!isMe && !userData.isAdmin && cursesInInventory.length > 0 && (
          <div className="mt-3">
            <p className="section-title">Vyslat kletbu</p>
            <div className="flex flex-wrap gap-2">
              {cursesInInventory.map(curse => (
                <button key={curse.id} className="btn btn-red" style={{ fontSize: '0.75rem' }}
                  onClick={() => handleSendCurse(curse, u.uid)}>
                  {curse.curseIcon} {curse.curseName}{curse.tierName ? ` / ${curse.tierName}` : ''}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const expandedUser = displayUsers.find(u => u.uid === expanded) || null

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-3" style={{ gap: '0.75rem' }}>
        <h2 className="heading" style={{ fontSize: '1.3rem', color: 'var(--gold)' }}>✦ Postavy světa</h2>
        <div className="flex" style={{ gap: '0.4rem', flexShrink: 0 }}>
          <button onClick={() => setView('list')} className="btn btn-ghost"
            title="Řádkové zobrazení" aria-label="Řádkové zobrazení"
            style={{ padding: '0.35rem 0.6rem', fontSize: '1rem', borderColor: view === 'list' ? 'var(--gold)' : undefined, color: view === 'list' ? 'var(--gold)' : undefined }}>☰</button>
          <button onClick={() => setView('grid')} className="btn btn-ghost"
            title="Čtvercové zobrazení" aria-label="Čtvercové zobrazení"
            style={{ padding: '0.35rem 0.6rem', fontSize: '1rem', borderColor: view === 'grid' ? 'var(--gold)' : undefined, color: view === 'grid' ? 'var(--gold)' : undefined }}>▦</button>
        </div>
      </div>

      {hideLevels && (
        <p className="text-muted text-sm mb-3">🙈 Levely jsou momentálně skryté.</p>
      )}

      {displayUsers.length === 0 && <p className="text-muted text-sm">Žádné postavy zatím...</p>}

      {/* ─── ŘÁDKOVÉ ZOBRAZENÍ ─── */}
      {view === 'list' && displayUsers.map((u, i) => {
        const isMe = u.uid === userData.uid
        const activeCurses = cleanExpiredCurses(u.activeCurses)
        const isOpen = expanded === u.uid

        return (
          <div key={u.uid} className="card" style={isMe ? { borderColor: 'var(--gold-dim)' } : {}}>
            <div className="flex items-center gap-3" style={{ cursor: 'pointer' }}
              onClick={() => setExpanded(isOpen ? null : u.uid)}>
              {/* Avatar postavy */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar src={u.avatar} name={u.username} />
                {!hideLevels && i === 0 && <span style={{ position: 'absolute', top: -10, right: -10, fontSize: '0.85rem' }}>👑</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="user-name">{u.username}</span>
                  {isMe && <span className="text-xs text-muted">(ty)</span>}
                </div>
                {!hideLevels && <div className="text-xs text-dim">Úroveň {u.level}</div>}
              </div>
              <div className="flex items-center gap-2">
                {activeCurses.length > 0 && activeCurses.map(c =>
                  <span key={c.id} title={c.curseName} style={{ fontSize: '1rem' }}>{c.curseIcon}</span>
                )}
                <span className="text-muted text-xs">{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {isOpen && renderExpanded(u, isMe)}
          </div>
        )
      })}

      {/* ─── ČTVERCOVÉ ZOBRAZENÍ ─── */}
      {view === 'grid' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.1rem' }}>
            {displayUsers.map((u, i) => {
              const isMe = u.uid === userData.uid
              const isOpen = expanded === u.uid
              const activeCurses = cleanExpiredCurses(u.activeCurses)
              const initial = ((u.username || '?').trim().charAt(0) || '?').toUpperCase()
              return (
                <button key={u.uid} onClick={() => setExpanded(isOpen ? null : u.uid)}
                  title={u.username} aria-label={u.username}
                  style={{ position: 'relative', background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: '100%', maxWidth: 170, justifySelf: 'center' }}>
                  {/* Kolečko avatara */}
                  <div style={{
                    position: 'relative', width: '100%', aspectRatio: '1 / 1',
                    borderRadius: '50%', overflow: 'hidden',
                    border: `2px solid ${isOpen ? 'var(--gold)' : isMe ? 'var(--gold)' : 'var(--gold-dim)'}`,
                    boxShadow: '0 0 14px rgba(201,168,76,0.3)',
                    background: 'linear-gradient(135deg, var(--gold-dim), var(--gold))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {u.avatar
                      ? <img src={u.avatar} alt={u.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 900, color: '#0a0a0f', fontSize: '2.2rem' }}>{initial}</span>}
                  </div>

                  {/* Mini kolečko s úrovní na kraji avatara */}
                  {!hideLevels && (
                    <span style={{
                      position: 'absolute', bottom: '6%', right: '6%',
                      minWidth: 26, height: 26, padding: '0 6px',
                      borderRadius: 999, background: 'var(--bg)', border: '2px solid var(--gold)',
                      color: 'var(--gold)', fontFamily: 'Cinzel, serif', fontWeight: 900, fontSize: '0.72rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 1px 5px rgba(0,0,0,0.6)',
                    }}>{u.level}</span>
                  )}

                  {/* Korunka pro první + indikátor kletby */}
                  {!hideLevels && i === 0 && (
                    <span style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', fontSize: '1.2rem' }}>👑</span>
                  )}
                  {activeCurses.length > 0 && (
                    <span style={{ position: 'absolute', top: '6%', left: '6%', fontSize: '1rem', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.7))' }}>{activeCurses[0].curseIcon}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Detail vybrané postavy pod mřížkou */}
          {expandedUser && (
            <div className="card mt-3" style={expandedUser.uid === userData.uid ? { borderColor: 'var(--gold-dim)' } : {}}>
              <div className="flex items-center gap-3">
                <Avatar src={expandedUser.avatar} name={expandedUser.username} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="user-name">{expandedUser.username}</span>
                    {expandedUser.uid === userData.uid && <span className="text-xs text-muted">(ty)</span>}
                  </div>
                  {!hideLevels && <div className="text-xs text-dim">Úroveň {expandedUser.level}</div>}
                </div>
                <button className="btn btn-ghost" style={{ fontSize: '0.75rem', flexShrink: 0 }} onClick={() => setExpanded(null)}>Zavřít</button>
              </div>
              {renderExpanded(expandedUser, expandedUser.uid === userData.uid)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
