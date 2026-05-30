import { useState, useEffect } from 'react'
import {
  subscribeToAllUsers, subscribeToPendingUsers, approveUser, rejectUser,
  addXpToUser, removeXpFromUser, removeCurseFromUser, removeInventoryItem,
  deleteUserData, cleanExpiredCurses, giftCurseToUser, castCurseOnUser,
  giveTokenToUser, setLevelsHidden, CURSES, RARITIES, XP_PER_LEVEL
} from '../firebase/db'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../components/Toast'
import XpBar from '../components/XpBar'
import Avatar from '../components/Avatar'
import { useNavigate } from 'react-router-dom'

export default function Admin() {
  const { userData, levelsHidden } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [pending, setPending] = useState([])
  const [xpInputs, setXpInputs] = useState({})
  const [loading, setLoading] = useState({})
  const [tab, setTab] = useState('prehled')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [giftModal, setGiftModal] = useState(null) // { uid, username, mode: 'gift'|'cast' }

  useEffect(() => { if (userData && !userData.isAdmin) navigate('/') }, [userData])
  useEffect(() => { return subscribeToAllUsers(setUsers) }, [])
  useEffect(() => { return subscribeToPendingUsers(setPending) }, [])

  if (!userData?.isAdmin) return null

  const approvedPlayers = users.filter(u => u.approved && !u.isAdmin)

  const handleXp = async (uid, add) => {
    const xp = parseInt(xpInputs[uid] || '0')
    if (!xp || xp <= 0 || xp > 10000) { toast('Zadej platné Zkušenosti (1–10000).', 'error'); return }
    setLoading(l => ({ ...l, [uid]: true }))
    try {
      if (add) {
        const r = await addXpToUser(uid, xp)
        if (r.leveledUp) toast(`⬆️ Úroveň ${r.newLevel}!`, 'success')
        else toast(`+${xp} Zkušenosti přidáno.`, 'success')
      } else {
        const r = await removeXpFromUser(uid, xp)
        toast(`−${xp} Zkušenosti odebráno. Úroveň: ${r.newLevel}`, 'info')
      }
      setXpInputs(i => ({ ...i, [uid]: '' }))
    } catch { toast('Chyba.', 'error') }
    finally { setLoading(l => ({ ...l, [uid]: false })) }
  }

  const toggleLevels = async () => {
    const next = !levelsHidden
    try {
      await setLevelsHidden(next)
      toast(next ? '🙈 Levely skryté pro hráče.' : '👁️ Levely jsou zase viditelné.', 'success')
    } catch { toast('Nepodařilo se změnit nastavení.', 'error') }
  }

  const handleToken = async (uid, username) => {
    try { await giveTokenToUser(uid); toast(`🎡 Token přidán ${username}.`, 'success') }
    catch { toast('Chyba při přidávání tokenu.', 'error') }
  }

  const handleDelete = async (uid, username) => {
    try { await deleteUserData(uid); toast(`${username} smazán.`, 'success'); setConfirmDelete(null) }
    catch (e) { console.error(e); toast('Chyba při mazání: ' + e.message, 'error') }
  }

  const top3 = [...approvedPlayers].sort((a, b) => b.level - a.level || b.xp - a.xp).slice(0, 3)

  const TABS = [
    { id: 'prehled', label: '📊 Přehled' },
    { id: 'schvaleni', label: `✅ Schválení${pending.length > 0 ? ` (${pending.length})` : ''}` },
    { id: 'hrace', label: '⚙️ Hráči' },
  ]

  return (
    <div className="page">
      <h2 className="heading mb-3" style={{ fontSize: '1.3rem', color: 'var(--gold)' }}>⚙️ Admin Panel</h2>

      <div className="card mb-3 flex items-center gap-3" style={{ justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{levelsHidden ? '🙈 Levely jsou skryté' : '👁️ Levely jsou viditelné'}</div>
          <div className="text-xs text-muted">Při skrytí hráči nevidí svoje ani cizí levely. Ty je vidíš pořád.</div>
        </div>
        <button className={`btn ${levelsHidden ? 'btn-gold' : 'btn-ghost'}`} style={{ fontSize: '0.8rem', flexShrink: 0 }}
          onClick={toggleLevels}>{levelsHidden ? 'Zobrazit levely' : 'Skrýt levely'}</button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} className={`btn ${tab === t.id ? 'btn-gold' : 'btn-ghost'}`}
            style={{ fontSize: '0.8rem' }} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ─── PŘEHLED ─────────────────────────────── */}
      {tab === 'prehled' && (
        <div>
          <div className="card mb-3">
            <p className="section-title">🏆 TOP 3 nejvyšší úroveň</p>
            {top3.length === 0 && <p className="text-muted text-xs">Žádní hráči.</p>}
            {top3.map((u, i) => (
              <div key={u.uid} className="flex items-center gap-3 mb-2">
                <span style={{ fontSize: '1.2rem' }}>{['🥇','🥈','🥉'][i]}</span>
                <div style={{ position: 'relative' }}>
                  <Avatar src={u.avatar} name={u.username} size={46} />
                </div>
                <span style={{ flex: 1 }}>{u.username}</span>
                <span className="text-xs text-muted">Úr. {u.level} · {u.xp}/{XP_PER_LEVEL}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── SCHVÁLENÍ ───────────────────────────── */}
      {tab === 'schvaleni' && (
        <div>
          {pending.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              <p className="text-dim">Žádné čekající registrace.</p>
            </div>
          )}
          {pending.map(u => (
            <div key={u.uid} className="card mb-3">
              <div className="flex items-center gap-3 mb-3">
                <div style={{ fontSize: '1.8rem' }}>⚔️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{u.username}</div>
                  <div className="text-xs text-muted">Čeká na schválení</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-green flex-1" onClick={async () => { await approveUser(u.uid); toast(`${u.username} schválen! ✅`, 'success') }}>✅ Schválit</button>
                <button className="btn btn-red flex-1" onClick={async () => { await rejectUser(u.uid); toast(`${u.username} zamítnut.`, 'info') }}>❌ Zamítnout</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── HRÁČI ───────────────────────────────── */}
      {tab === 'hrace' && (
        <div>
          {approvedPlayers.length === 0 && <p className="text-muted text-sm">Žádní hráči.</p>}
          {approvedPlayers.map(u => {
            const activeCurses = cleanExpiredCurses(u.activeCurses)
            const tokens = (u.inventory || []).filter(i => i.type === 'spin_token')
            const cursesInv = (u.inventory || []).filter(i => i.type === 'curse')
            const pendingCurses = (u.inventory || []).filter(i => i.type === 'pending_curse')
            return (
              <div key={u.uid} className="card mb-3">
                <div className="flex items-center gap-3 mb-3">
                  <div style={{ position: 'relative' }}>
                    <Avatar src={u.avatar} name={u.username} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{u.username}</div>
                    <div className="text-xs text-muted">Úroveň {u.level}</div>
                  </div>
                  <button className="btn btn-red" style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                    onClick={() => setConfirmDelete(u)}>🗑️</button>
                </div>

                <XpBar xp={u.xp} level={u.level} />

                {/* XP */}
                <div className="flex gap-2 mt-3">
                  <input type="number" min="1" max="10000" placeholder="Zkušenosti..."
                    value={xpInputs[u.uid] || ''}
                    onChange={e => setXpInputs(p => ({ ...p, [u.uid]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleXp(u.uid, true)}
                    style={{ flex: 1 }} />
                  <button className="btn btn-green" onClick={() => handleXp(u.uid, true)} disabled={loading[u.uid]}
                    style={{ fontSize: '0.82rem' }}>+ Zkuš.</button>
                  <button className="btn btn-red" onClick={() => handleXp(u.uid, false)} disabled={loading[u.uid]}
                    style={{ fontSize: '0.82rem' }}>−</button>
                </div>

                {/* Darovat / Seslat kletbu */}
                <div className="flex gap-2 mt-2">
                  <button className="btn btn-ghost flex-1" style={{ fontSize: '0.78rem' }}
                    onClick={() => setGiftModal({ uid: u.uid, username: u.username, mode: 'gift' })}>
                    🎁 Darovat kletbu do inventáře
                  </button>
                  <button className="btn btn-red flex-1" style={{ fontSize: '0.78rem' }}
                    onClick={() => setGiftModal({ uid: u.uid, username: u.username, mode: 'cast' })}>
                    ⚡ Seslat kletbu přímo
                  </button>
                </div>

                {/* Token na kolo štěstí */}
                <div className="flex gap-2 mt-2">
                  <button className="btn btn-gold flex-1" style={{ fontSize: '0.78rem' }}
                    onClick={() => handleToken(u.uid, u.username)}>
                    🎡 Přidat token na kolo
                  </button>
                </div>

                {/* Inventář */}
                {(tokens.length > 0 || cursesInv.length > 0 || pendingCurses.length > 0) && (
                  <div className="mt-3">
                    <p className="text-xs text-muted mb-1">Inventář (✕ = odebrat):</p>
                    <div className="flex flex-wrap gap-2">
                      {tokens.map(t => (
                        <button key={t.id} onClick={() => removeInventoryItem(u.uid, t.id).then(() => toast('Token odebrán.', 'info'))}
                          style={{ background: 'rgba(201,168,76,0.1)', color: 'var(--gold)', border: '1px solid var(--gold-dim)', borderRadius: 999, padding: '0.15rem 0.6rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                          🎡 Token ✕
                        </button>
                      ))}
                      {pendingCurses.map(c => (
                        <button key={c.id} onClick={() => removeInventoryItem(u.uid, c.id).then(() => toast('Odebráno.', 'info'))}
                          style={{ background: 'rgba(136,68,170,0.12)', color: 'var(--purple2)', border: '1px solid rgba(136,68,170,0.3)', borderRadius: 999, padding: '0.15rem 0.6rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                          ⏳ {c.curseName} ✕
                        </button>
                      ))}
                      {cursesInv.map(c => (
                        <button key={c.id} className={`curse-chip curse-rarity-${c.rarity || 'common'}`} style={{ cursor: 'pointer' }}
                          onClick={() => removeInventoryItem(u.uid, c.id).then(() => toast('Kletba odebrána.', 'info'))}>
                          {c.curseIcon} {c.curseName} ✕
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aktivní kletby */}
                {activeCurses.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-muted mb-1">Aktivní kletby (✕ = odebrat):</p>
                    <div className="flex flex-wrap gap-2">
                      {activeCurses.map(c => (
                        <button key={c.id} className={`curse-chip curse-rarity-${c.rarity || 'common'}`} style={{ cursor: 'pointer', background: 'none' }}
                          onClick={() => removeCurseFromUser(u.uid, c.id).then(() => toast('Kletba odstraněna.', 'success'))}>
                          {c.curseIcon} {c.curseName} ✕
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: darovat / seslat kletbu */}
      {giftModal && (
        <GiftCurseModal
          targetUid={giftModal.uid}
          targetUsername={giftModal.username}
          mode={giftModal.mode}
          adminUid={userData.uid}
          onClose={() => setGiftModal(null)}
          toast={toast}
        />
      )}

      {/* Potvrzení smazání */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="heading mb-3" style={{ color: 'var(--red2)', fontSize: '1.1rem' }}>🗑️ Smazat postavu?</h3>
            <p className="text-dim text-sm mb-3">Opravdu smazat <strong style={{ color: 'var(--text)' }}>{confirmDelete.username}</strong>?</p>
            <div className="flex gap-2">
              <button className="btn btn-ghost flex-1" onClick={() => setConfirmDelete(null)}>Zrušit</button>
              <button className="btn btn-red flex-1" onClick={() => handleDelete(confirmDelete.uid, confirmDelete.username)}>Smazat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function GiftCurseModal({ targetUid, targetUsername, mode, adminUid, onClose, toast }) {
  const [selectedCurse, setSelectedCurse] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!selectedCurse) { toast('Vyber kletbu.', 'error'); return }
    setLoading(true)
    try {
      if (mode === 'gift') {
        await giftCurseToUser(targetUid, selectedCurse)
        toast(`Kletba darována ${targetUsername} do inventáře.`, 'success')
      } else {
        await castCurseOnUser(adminUid, targetUid, selectedCurse)
        toast(`Kletba seslána na ${targetUsername}!`, 'success')
      }
      onClose()
    } catch (e) { toast('Chyba: ' + e.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <h3 className="heading mb-1" style={{ fontSize: '1.05rem', color: 'var(--gold)' }}>
          {mode === 'gift' ? '🎁 Darovat kletbu' : '⚡ Seslat kletbu'}
        </h3>
        <p className="text-dim text-sm mb-3">Cíl: <strong style={{ color: 'var(--text)' }}>{targetUsername}</strong></p>

        <div className="form-group">
          <label className="form-label">Kletba</label>
          {RARITIES.map(rar => (
            <div key={rar.id} style={{ marginBottom: '0.6rem' }}>
              <div className="flex items-center gap-2 mb-1" style={{ color: rar.wheelColor }}>
                <span>{rar.icon}</span>
                <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.8rem', fontWeight: 700 }}>{rar.name}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {CURSES.filter(c => c.rarity === rar.id).map(c => (
                  <label key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.4rem 0.7rem',
                    background: selectedCurse === c.id ? 'rgba(201,168,76,0.12)' : 'var(--bg3)',
                    border: `1px solid ${selectedCurse === c.id ? 'var(--gold-dim)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)', cursor: 'pointer',
                  }}>
                    <input type="radio" name="curse" value={c.id} checked={selectedCurse === c.id}
                      onChange={() => setSelectedCurse(c.id)} style={{ accentColor: 'var(--gold)' }} />
                    <span style={{ fontSize: '1.05rem' }}>{c.icon}</span>
                    <span style={{ fontSize: '0.82rem' }}>{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-3">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Zrušit</button>
          <button
            className={`btn flex-1 ${mode === 'gift' ? 'btn-gold' : 'btn-red'}`}
            onClick={handleConfirm} disabled={loading || !selectedCurse}>
            {loading ? '...' : mode === 'gift' ? '🎁 Darovat' : '⚡ Seslat'}
          </button>
        </div>
      </div>
    </div>
  )
}
