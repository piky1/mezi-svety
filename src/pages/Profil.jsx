import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { sendCurse, subscribeToApprovedUsersForDisplay, cleanExpiredCurses, updateUserAvatar, removeUserAvatar } from '../firebase/db'
import { useToast } from '../components/Toast'
import XpBar from '../components/XpBar'
import CurseList from '../components/CurseList'
import Avatar from '../components/Avatar'
import AvatarEditor from '../components/AvatarEditor'

export default function Profil() {
  const { userData, levelsHidden } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [sendingCurse, setSendingCurse] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [editorFile, setEditorFile] = useState(null)

  if (!userData) return null

  const hideLevels = levelsHidden && !userData.isAdmin
  const cursesInInventory = (userData.inventory || []).filter(i => i.type === 'curse')
  const tokens = (userData.inventory || []).filter(i => i.type === 'spin_token')
  const pendingCurses = (userData.inventory || []).filter(i => i.type === 'pending_curse')

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // ať jde nahrát stejný soubor znovu
    if (!file) return
    if (!file.type.startsWith('image/')) { toast('Vyber prosím obrázek.', 'error'); return }
    setEditorFile(file) // otevři editor – uloží se až po posunu a potvrzení
  }

  const handleAvatarSave = async (dataUrl) => {
    if (dataUrl.length > 900000) {
      toast('Obrázek je moc velký, zkus menší přiblížení nebo jinou fotku.', 'error')
      return
    }
    setUploadingAvatar(true)
    try {
      await updateUserAvatar(userData.uid, dataUrl)
      toast('Avatar nastaven! 🖼️', 'success')
      setEditorFile(null)
    } catch { toast('Nepodařilo se nahrát obrázek.', 'error') }
    finally { setUploadingAvatar(false) }
  }

  const handleAvatarRemove = async () => {
    try { await removeUserAvatar(userData.uid); toast('Avatar odebrán.', 'info') }
    catch { toast('Nepodařilo se odebrat avatar.', 'error') }
  }

  return (
    <div className="page">
      <div className="card card-gold" style={{ textAlign: 'center', padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
          <Avatar src={userData.avatar} name={userData.username} size={120} />
        </div>
        <h2 className="heading" style={{ fontSize: '1.4rem', color: 'var(--gold)', marginBottom: '0.25rem' }}>{userData.username}</h2>

        <div className="flex justify-center gap-2" style={{ marginTop: '0.5rem' }}>
          <label className="btn btn-ghost" style={{ cursor: uploadingAvatar ? 'default' : 'pointer', fontSize: '0.78rem', opacity: uploadingAvatar ? 0.6 : 1, pointerEvents: uploadingAvatar ? 'none' : 'auto' }}>
            {uploadingAvatar ? 'Nahrávám...' : '📷 Nahrát obrázek'}
            <input type="file" accept="image/*" onChange={handleAvatarFile} disabled={uploadingAvatar} style={{ display: 'none' }} />
          </label>
          {userData.avatar && (
            <button className="btn btn-ghost" style={{ fontSize: '0.78rem' }} onClick={handleAvatarRemove}>Odebrat</button>
          )}
        </div>

        {hideLevels ? (
          <p className="text-muted text-sm" style={{ marginTop: '0.75rem' }}>🙈 Levely jsou momentálně skryté.</p>
        ) : (
          <div style={{ maxWidth: 280, margin: '0.75rem auto 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <div className="text-xs text-dim" style={{ textAlign: 'left', marginBottom: 4 }}>Úroveň {userData.level}</div>
              <XpBar xp={userData.xp} level={userData.level} />
            </div>
          </div>
        )}
        {userData.isAdmin && (
          <span style={{ display: 'inline-block', marginTop: '0.75rem', background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', border: '1px solid var(--gold-dim)', borderRadius: 999, padding: '0.15rem 0.75rem', fontSize: '0.78rem', fontFamily: 'Cinzel, serif' }}>✦ Admin</span>
        )}
      </div>

      <div className="card">
        <p className="section-title">Aktivní kletby na tobě</p>
        <CurseList curses={userData.activeCurses} />
      </div>

      <div className="card">
        <p className="section-title">Inventář</p>

        {tokens.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: '1.3rem' }}>🎡</span>
              <span className="text-sm"><span className="text-gold font-cinzel">{tokens.length}</span> {tokens.length === 1 ? 'token' : tokens.length < 5 ? 'tokeny' : 'tokenů'} na kolo štěstí</span>
            </div>
            <button className="btn btn-ghost" onClick={() => navigate('/kolo')}>🎡 Jít zatočit</button>
          </div>
        )}

        {pendingCurses.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span>⏳</span>
              <span className="text-sm text-dim">Čeká na 2. kolo: <span className="text-gold">{pendingCurses[0].curseName}</span></span>
            </div>
            <button className="btn btn-ghost" onClick={() => navigate('/kolo')}>🎡 Zatočit tier</button>
          </div>
        )}

        {cursesInInventory.length > 0 && (
          <>
            <p className="text-xs text-dim mb-2" style={{ marginTop: (tokens.length > 0 || pendingCurses.length > 0) ? '1rem' : 0 }}>Kletby k vyslání:</p>
            {cursesInInventory.map(item => (
              <div key={item.id} className="flex items-center justify-between mb-2 p-2"
                style={{ background: 'var(--bg3)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div>
                  <span className={`curse-chip curse-rarity-${item.rarity || 'common'}`}>{item.curseIcon} {item.curseName}</span>
                </div>
                <button className="btn btn-red" style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}
                  onClick={() => setSendingCurse(item)}>Vyslat</button>
              </div>
            ))}
          </>
        )}

        {tokens.length === 0 && pendingCurses.length === 0 && cursesInInventory.length === 0 && (
          <p className="text-muted text-sm">Inventář je prázdný.</p>
        )}
      </div>

      {sendingCurse && (
        <SendCurseModal curse={sendingCurse} senderUid={userData.uid} onClose={() => setSendingCurse(null)} toast={toast} />
      )}

      {editorFile && (
        <AvatarEditor
          file={editorFile}
          saving={uploadingAvatar}
          onCancel={() => { if (!uploadingAvatar) setEditorFile(null) }}
          onSave={handleAvatarSave}
        />
      )}
    </div>
  )
}

function SendCurseModal({ curse, senderUid, onClose, toast }) {
  const { userData } = useAuth()
  const [targetUid, setTargetUid] = useState('')
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsub = subscribeToApprovedUsersForDisplay(senderUid, false, users => {
      // Jen hráči (ne admin, ne já)
      setAllUsers(users.filter(u => u.uid !== senderUid && !u.isAdmin))
    })
    return unsub
  }, [senderUid])

  const handleSend = async () => {
    if (!targetUid) { toast('Vyber cíl kletby.', 'error'); return }
    setLoading(true)
    try {
      await sendCurse(senderUid, targetUid, curse.id)
      toast(`Kletba ${curse.curseIcon} ${curse.curseName} vyslána!`, 'success')
      onClose()
    } catch { toast('Nepodařilo se vyslat kletbu.', 'error') }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="heading mb-3" style={{ fontSize: '1.1rem', color: 'var(--gold)' }}>Vyslat kletbu {curse.curseIcon}</h3>
        <p className="text-dim text-sm mb-3">
          <span className={`curse-chip curse-rarity-${curse.rarity || 'common'}`}>{curse.curseIcon} {curse.curseName}</span>
        </p>
        <div className="form-group">
          <label className="form-label">Vyber cíl</label>
          <select value={targetUid} onChange={e => setTargetUid(e.target.value)}>
            <option value="">— Vyber hráče —</option>
            {allUsers.map(u => <option key={u.uid} value={u.uid}>{u.username} (Úroveň {u.level})</option>)}
          </select>
        </div>
        <div className="flex gap-2 mt-3">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Zrušit</button>
          <button className="btn btn-red flex-1" onClick={handleSend} disabled={loading}>{loading ? 'Vysílám...' : '⚡ Vyslat'}</button>
        </div>
      </div>
    </div>
  )
}
