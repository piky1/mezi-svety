import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { spinWheelCurse, spinWheelTier, CURSES_15 } from '../firebase/db'
import { useToast } from '../components/Toast'

const SLICE_COLORS = ['#7040a0','#4488bb','#bb6040','#40a060','#c09030','#c04060']
const SPIN_MS = 4500

/**
 * Statické kolo se zobrazeným natočením `rotation` (ve stupních).
 * Kolo rotuje kolem svého středu.
 */
function Wheel({ items, rotation, size = 230 }) {
  const n = items.length
  const cx = size / 2, cy = size / 2, r = size / 2 - 6
  if (n === 0) return null

  const slices = items.map((item, i) => {
    const a0 = (i / n) * 2 * Math.PI - Math.PI / 2
    const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2
    const x1 = cx + r * Math.cos(a0), y1 = cy + r * Math.sin(a0)
    const x2 = cx + r * Math.cos(a1), y2 = cy + r * Math.sin(a1)
    const mid = (a0 + a1) / 2
    const tx = cx + r * 0.65 * Math.cos(mid), ty = cy + r * 0.65 * Math.sin(mid)
    const large = (a1 - a0) > Math.PI ? 1 : 0
    const d = n === 1
      ? `M ${cx-r} ${cy} A ${r} ${r} 0 1 1 ${cx+r} ${cy} A ${r} ${r} 0 1 1 ${cx-r} ${cy}`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
    return { d, color: SLICE_COLORS[i % SLICE_COLORS.length], icon: item.icon, tx, ty }
  })

  return (
    <div style={{ position: 'relative', width: size, height: size + 22, margin: '0 auto' }}>
      {/* Šipka ukazatel — STATICKÁ, ukazuje dolů na horní bod kola */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 0, height: 0,
        borderLeft: '12px solid transparent', borderRight: '12px solid transparent',
        borderTop: '22px solid var(--gold)', zIndex: 10,
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.7))',
      }} />
      <svg width={size} height={size} style={{
        marginTop: 22, display: 'block', borderRadius: '50%',
        boxShadow: '0 0 40px rgba(201,168,76,0.3)',
      }}>
        {/* Rotující obsah */}
        <g transform={`rotate(${rotation} ${cx} ${cy})`}>
          {slices.map((s, i) => (
            <g key={i}>
              <path d={s.d} fill={s.color} stroke="rgba(0,0,0,0.4)" strokeWidth="2" />
              <text x={s.tx} y={s.ty} textAnchor="middle" dominantBaseline="middle"
                fontSize={n > 4 ? 18 : 24} style={{ pointerEvents: 'none' }}>{s.icon}</text>
            </g>
          ))}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--gold)" strokeWidth="3" opacity="0.5" />
        </g>
        {/* Statický střed */}
        <circle cx={cx} cy={cy} r={18} fill="var(--bg)" stroke="var(--gold)" strokeWidth="2" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="13" fill="var(--gold)">✦</text>
      </svg>
    </div>
  )
}

/**
 * Vypočítá cílový úhel natočení tak, aby slice s indexem `targetIndex`
 * skončil pod šipkou (nahoře).
 *
 * Slice i má střed v úhlu: i * (360/n) od pozice "nahoře"
 * (v SVG souřadnicích kde 0° je nahoře díky -PI/2 offsetu).
 *
 * Aby slice i skončil nahoře, musíme kolo otočit o -i * (360/n).
 * Plus přidáme N celých otáček pro efekt točení.
 */
function calcTargetRotation(targetIndex, totalSlices, currentRotation) {
  const anglePerSlice = 360 / totalSlices
  // Aby slice byl nahoře, kolo musí být otočené o -i * anglePerSlice
  const targetMod = -targetIndex * anglePerSlice
  // Přidáme minimálně 4 plné otáčky
  const fullTurns = 4 * 360
  // Plus malý offset aby šipka ukazovala na STŘED slice (ne na hranu)
  const jitter = (Math.random() - 0.5) * (anglePerSlice * 0.7)
  return currentRotation + fullTurns + targetMod + jitter - (currentRotation % 360)
}

/**
 * Easing funkce — pomalý rozběh, rychlý střed, pomalé dojezd
 */
function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4)
}

export default function SpinPage() {
  const { userData } = useAuth()
  const toast = useToast()

  const [state, setState] = useState('idle') // idle | spinning1 | paused | spinning2 | done
  const [rotation1, setRotation1] = useState(0)
  const [rotation2, setRotation2] = useState(0)
  const [resultCurse, setResultCurse] = useState(null)
  const [resultTier, setResultTier] = useState(null)
  const animRef = useRef(null)

  const tokens = (userData?.inventory || []).filter(i => i.type === 'spin_token')
  const pendingCurses = (userData?.inventory || []).filter(i => i.type === 'pending_curse')
  const currentPending = pendingCurses[0] || null

  // Pokud hráč přišel s pending curse, přeskočíme na tier fázi
  const effectiveState = (currentPending && state === 'idle' && !resultCurse) ? 'paused' : state

  const tierItems = currentPending?.curseTiers
    || (resultCurse ? CURSES_15.find(c => c.id === resultCurse.id)?.tiers : null)
    || []

  const shownCurse = resultCurse
    || (currentPending ? { id: currentPending.curseId, name: currentPending.curseName, icon: currentPending.curseIcon } : null)

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  /**
   * Plynule animuje kolo z `fromRotation` na `toRotation` za `duration` ms.
   * Volá setRotation v každém frameu.
   */
  const animateWheel = (fromRotation, toRotation, duration, setRotation) => {
    return new Promise(resolve => {
      const startTime = performance.now()
      const step = (now) => {
        const elapsed = now - startTime
        const t = Math.min(elapsed / duration, 1)
        const eased = easeOutQuart(t)
        const current = fromRotation + (toRotation - fromRotation) * eased
        setRotation(current)
        if (t < 1) {
          animRef.current = requestAnimationFrame(step)
        } else {
          resolve()
        }
      }
      animRef.current = requestAnimationFrame(step)
    })
  }

  const handleSpinCurse = async () => {
    if (state !== 'idle' || tokens.length === 0) return
    setState('spinning1')

    let curse = null, index = 0
    try {
      const result = await spinWheelCurse(userData.uid, tokens[0].id)
      curse = result.curse
      index = result.index
    } catch (err) {
      toast('Chyba: ' + err.message, 'error')
      setState('idle')
      return
    }

    // Vypočítej cílový úhel aby skončila na vybrané kletbě
    const targetRot = calcTargetRotation(index, CURSES_15.length, rotation1)

    // Spusť animaci
    await animateWheel(rotation1, targetRot, SPIN_MS, setRotation1)

    // Po dokončení animace počkej 1 sekundu a ukaž výsledek
    setResultCurse(curse)
    toast(`${curse.icon} ${curse.name} — za chvíli zatočíš tier!`, 'info')
    setTimeout(() => {
      setState('paused')
    }, 1000)
  }

  const handleSpinTier = async () => {
    if (state !== 'paused') return
    const pending = pendingCurses[0]
    if (!pending) { toast('Zkus znovu za chvíli.', 'info'); return }
    setState('spinning2')

    let tier = null, index = 0
    try {
      const result = await spinWheelTier(userData.uid, pending.id, pending.curseTiers)
      tier = result.tier
      index = result.index
    } catch (err) {
      toast('Chyba: ' + err.message, 'error')
      setState('paused')
      return
    }

    const targetRot = calcTargetRotation(index, pending.curseTiers.length, rotation2)
    await animateWheel(rotation2, targetRot, SPIN_MS, setRotation2)

    setResultTier(tier)
    toast(`${tier.icon} ${tier.name} — přidáno do inventáře!`, 'success')
    setTimeout(() => {
      setState('done')
    }, 1000)
  }

  const reset = () => {
    setState('idle')
    setResultCurse(null)
    setResultTier(null)
    setRotation1(0)
    setRotation2(0)
  }

  return (
    <div className="page">
      <h2 className="heading mb-3" style={{ fontSize: '1.3rem', color: 'var(--gold)' }}>🎡 Kolo Štěstí</h2>

      {tokens.length === 0 && !currentPending && effectiveState !== 'done' && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🎡</div>
          <p className="text-dim">Nemáš žádné tokeny k zatočení.</p>
          <p className="text-muted text-sm mt-1">Získáš je při každém sudém level upu.</p>
        </div>
      )}

      {(tokens.length > 0 || currentPending || effectiveState === 'done') && (
        <div className="card card-gold" style={{ textAlign: 'center' }}>

          {/* IDLE / SPINNING1 — 1. kolo */}
          {(effectiveState === 'idle' || effectiveState === 'spinning1') && (
            <>
              <p className="text-dim text-sm mb-1">
                Máš <span className="text-gold font-cinzel">{tokens.length}</span> {tokens.length === 1 ? 'token' : 'tokeny'}
              </p>
              <p className="text-xs text-muted mb-4">1. kolo — typ kletby</p>
              <Wheel items={CURSES_15} rotation={rotation1} />
              <button
                className="btn btn-gold mt-4"
                onClick={handleSpinCurse}
                disabled={effectiveState === 'spinning1'}
                style={{ minWidth: 200 }}
              >
                {effectiveState === 'spinning1' ? '⏳ Točí se...' : '🎡 Zatočit — kolo 1'}
              </button>
            </>
          )}

          {/* PAUSED / SPINNING2 — 2. kolo */}
          {(effectiveState === 'paused' || effectiveState === 'spinning2') && (
            <>
              {shownCurse && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p className="text-xs text-muted mb-1">Padla kletba:</p>
                  <div style={{ fontSize: '2.2rem' }}>{shownCurse.icon}</div>
                  <div className="font-cinzel mt-1" style={{ color: 'var(--purple2)', fontSize: '1.05rem' }}>{shownCurse.name}</div>
                </div>
              )}
              <p className="text-xs text-muted mb-4">2. kolo — tier kletby</p>
              <Wheel items={tierItems} rotation={rotation2} size={200} />
              <button
                className="btn btn-gold mt-4"
                onClick={handleSpinTier}
                disabled={effectiveState === 'spinning2'}
                style={{ minWidth: 200 }}
              >
                {effectiveState === 'spinning2' ? '⏳ Točí se...' : '🎡 Zatočit — kolo 2'}
              </button>
            </>
          )}

          {/* DONE */}
          {effectiveState === 'done' && resultCurse && resultTier && (
            <div>
              <p className="text-xs text-muted mb-2">Výsledek:</p>
              <div style={{ fontSize: '2.5rem' }}>{resultCurse.icon}</div>
              <div className="font-cinzel mt-1" style={{ color: 'var(--gold)', fontSize: '1.1rem' }}>{resultCurse.name}</div>
              <div style={{ fontSize: '1.5rem', marginTop: '0.5rem' }}>{resultTier.icon}</div>
              <div className="text-dim">{resultTier.name}</div>
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

      <div className="card mt-2">
        <p className="section-title">Možné kletby a tiery</p>
        {CURSES_15.map(c => (
          <div key={c.id} style={{ marginBottom: '0.85rem' }}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: '1.2rem' }}>{c.icon}</span>
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.88rem' }}>{c.name}</span>
            </div>
            <div style={{ paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {c.tiers.map(t => (
                <div key={t.id} className="text-xs text-dim flex items-center gap-2">
                  <span>{t.icon}</span><span>{t.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
