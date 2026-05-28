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

  return (
    <div className="page">
      <h2 className="heading mb-3" style={{ fontSize: '1.3rem', color: 'var(--gold)' }}>✦ Postavy světa</h2>

      {hideLevels && (
        <p className="text-muted text-sm mb-3">🙈 Levely jsou momentálně skryté.</p>
      )}

      {displayUsers.length === 0 && <p className="text-muted text-sm">Žádné postavy zatím...</p>}

      {displayUsers.map((u, i) => {
        const isMe = u.uid === userData.uid
        const activeCurses = cleanExpiredCurses(u.activeCurses)
        const isOpen = expanded === u.uid
        const uCursesInv = (u.inventory || []).filter(x => x.type === 'curse')
        const uTokens = (u.inventory || []).filter(x => x.type === 'spin_token')
        const uPending = (u.inventory || []).filter(x => x.type === 'pending_curse')

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

            {isOpen && (
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
            )}
          </div>
        )
      })}
    </div>
  )
}
