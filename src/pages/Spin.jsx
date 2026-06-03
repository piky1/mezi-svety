import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { spinWheelRarity, spinWheelCurseFromRarity, RARITIES, RARITY_BY_ID, cursesOfRarity } from '../firebase/db'
import { useToast } from '../components/Toast'
import {
  Wheel, Gem, RarityGem, RARITY_LEVEL, SPIN_MS,
  calcTargetRotation, calcTargetRotationWeighted, animateWheel, rarityGlow,
} from '../components/SpinWheel'

export default function SpinPage() {
  const { userData } = useAuth()
  const toast = useToast()

  const [state, setState] = useState('idle') // idle | spinning1 | paused | spinning2 | done
  const [rotation1, setRotation1] = useState(0)
  const [rotation2, setRotation2] = useState(0)
  const [resultRarity, setResultRarity] = useState(null)
  const [resultCurse, setResultCurse] = useState(null)
  const animRef = useRef(null)

  const tokens = (userData?.inventory || []).filter(i => i.type === 'spin_token')
  const pendingCurses = (userData?.inventory || []).filter(i => i.type === 'pending_curse')
  const currentPending = pendingCurses[0] || null

  // Pokud hráč přišel s pending (vzácnost už padla), přeskočíme na 2. kolo
  const effectiveState = (currentPending && state === 'idle' && !resultCurse) ? 'paused' : state

  const activeRarityId = resultRarity?.id || currentPending?.rarity || null
  const rarityCurses = activeRarityId ? cursesOfRarity(activeRarityId) : []
  const shownRarity = resultRarity || (currentPending ? RARITY_BY_ID[currentPending.rarity] : null)

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current) }, [])

  // ── KOLO 1 — vzácnost ──
  const handleSpinRarity = async () => {
    if (state !== 'idle' || tokens.length === 0) return
    setState('spinning1')
    let rarity = null, index = 0
    try {
      const r = await spinWheelRarity(userData.uid, tokens[0].id)
      rarity = r.rarity; index = r.index
    } catch (err) {
      toast('Chyba: ' + err.message, 'error'); setState('idle'); return
    }
    const targetRot = calcTargetRotationWeighted(index, RARITIES.map(r => r.visualWeight), rotation1)
    await animateWheel(animRef, rotation1, targetRot, SPIN_MS, setRotation1)
    setResultRarity(rarity)
    toast(`${rarity.icon} ${rarity.name} — teď zatoč kletbu!`, 'info')
    setTimeout(() => setState('paused'), 1000)
  }

  // ── KOLO 2 — konkrétní kletba ──
  const handleSpinCurse = async () => {
    if (effectiveState !== 'paused') return
    const pending = pendingCurses[0]
    if (!pending) { toast('Zkus znovu za chvíli.', 'info'); return }
    setState('spinning2')
    let curse = null, index = 0
    try {
      const r = await spinWheelCurseFromRarity(userData.uid, pending.id)
      curse = r.curse; index = r.index
    } catch (err) {
      toast('Chyba: ' + err.message, 'error'); setState('paused'); return
    }
    const list = cursesOfRarity(pending.rarity)
    const targetRot = calcTargetRotation(index, list.length, rotation2)
    await animateWheel(animRef, rotation2, targetRot, SPIN_MS, setRotation2)
    if (!resultRarity) setResultRarity(RARITY_BY_ID[pending.rarity])
    setResultCurse(curse)
    toast(`${curse.icon} ${curse.name} — přidáno do inventáře!`, 'success')
    setTimeout(() => setState('done'), 1000)
  }

  const reset = () => {
    setState('idle'); setResultRarity(null); setResultCurse(null)
    setRotation1(0); setRotation2(0)
  }

  const doneRarity = resultCurse ? RARITY_BY_ID[resultCurse.rarity] : null

  return (
    <div className="page">
      <h2 className="heading mb-3" style={{ fontSize: '1.3rem', color: 'var(--gold)' }}>🎡 Kolo Štěstí</h2>

      {tokens.length === 0 && !currentPending && effectiveState !== 'done' && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🎡</div>
          <p className="text-dim">Nemáš žádné tokeny k zatočení.</p>
        </div>
      )}

      {(tokens.length > 0 || currentPending || effectiveState === 'done') && (
        <div className="card card-gold" style={{ textAlign: 'center' }}>

          {/* KOLO 1 — vzácnost */}
          {(effectiveState === 'idle' || effectiveState === 'spinning1') && (
            <>
              <p className="text-dim text-sm mb-1">
                Máš <span className="text-gold font-cinzel">{tokens.length}</span> {tokens.length === 1 ? 'token' : 'tokeny'}
              </p>
              <p className="text-xs text-muted mb-4">1. kolo — vzácnost</p>
              <Wheel items={RARITIES} weights={RARITIES.map(r => r.visualWeight)} rotation={rotation1}
                renderIcon={(item, x, y) => (
                  <g transform={`translate(${x} ${y})`} style={{ pointerEvents: 'none' }}>
                    <circle r="17" fill="rgba(0,0,0,0.2)" />
                    <g transform="scale(0.82)"><Gem {...item.gem} level={RARITY_LEVEL[item.id]} /></g>
                  </g>
                )} />
              <button className="btn btn-gold mt-4" onClick={handleSpinRarity}
                disabled={effectiveState === 'spinning1'} style={{ minWidth: 200 }}>
                {effectiveState === 'spinning1' ? '⏳ Točí se...' : '🎡 Zatočit — vzácnost'}
              </button>
            </>
          )}

          {/* KOLO 2 — kletba */}
          {(effectiveState === 'paused' || effectiveState === 'spinning2') && (
            <>
              {shownRarity && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <p className="text-xs text-muted mb-1">Padla vzácnost:</p>
                  <div style={{ display: 'flex', justifyContent: 'center' }}><RarityGem rarity={shownRarity} size={50} /></div>
                  <div className="font-cinzel mt-1" style={{ color: shownRarity.wheelColor, fontSize: '1.05rem', textShadow: rarityGlow(shownRarity.id, shownRarity.wheelColor) }}>{shownRarity.name}</div>
                </div>
              )}
              <p className="text-xs text-muted mb-4">2. kolo — která kletba</p>
              <Wheel items={rarityCurses} rotation={rotation2} size={210} />
              <button className="btn btn-gold mt-4" onClick={handleSpinCurse}
                disabled={effectiveState === 'spinning2'} style={{ minWidth: 200 }}>
                {effectiveState === 'spinning2' ? '⏳ Točí se...' : '🎡 Zatočit — kletba'}
              </button>
            </>
          )}

          {/* HOTOVO */}
          {effectiveState === 'done' && resultCurse && (
            <div>
              <p className="text-xs text-muted mb-2">Výsledek:</p>
              {doneRarity && (
                <div className="font-cinzel" style={{ color: doneRarity.wheelColor, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', textShadow: rarityGlow(doneRarity.id, doneRarity.wheelColor) }}>
                  <RarityGem rarity={doneRarity} size={20} /> {doneRarity.name}
                </div>
              )}
              <div style={{ fontSize: '2.6rem' }}>{resultCurse.icon}</div>
              <div className="font-cinzel mt-1" style={{ color: 'var(--gold)', fontSize: '1.1rem' }}>{resultCurse.name}</div>
              {resultCurse.desc && <div className="text-dim text-sm mt-1" style={{ maxWidth: 320, margin: '0.25rem auto 0' }}>{resultCurse.desc}</div>}
              <p className="text-xs text-muted mt-2">Kletba přidána do inventáře.</p>
              {tokens.length > 0 && (
                <button className="btn btn-ghost mt-3" onClick={reset}>
                  🎡 Zatočit znovu ({tokens.length} {tokens.length === 1 ? 'token' : 'tokeny'})
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Přehled kleteb podle vzácnosti */}
      <div className="card mt-2">
        <p className="section-title">Kletby podle vzácnosti</p>
        {RARITIES.map(rar => (
          <div key={rar.id} style={{ marginBottom: '1rem' }}>
            <div className="flex items-center gap-2 mb-2" style={{ color: rar.wheelColor }}>
              <RarityGem rarity={rar} size={22} />
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', fontWeight: 700, textShadow: rarityGlow(rar.id, rar.wheelColor) }}>{rar.name}</span>
            </div>
            <div style={{ paddingLeft: '0.4rem', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {cursesOfRarity(rar.id).map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>{c.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '0.85rem' }}>{c.name}</span>
                    <span className="text-xs text-dim"> — {c.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
