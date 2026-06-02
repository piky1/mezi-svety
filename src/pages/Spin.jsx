import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { spinWheelRarity, spinWheelCurseFromRarity, RARITIES, RARITY_BY_ID, cursesOfRarity } from '../firebase/db'
import { useToast } from '../components/Toast'

const SLICE_COLORS = ['#7040a0', '#4488bb', '#bb6040', '#40a060', '#c09030', '#c04060', '#5060c0', '#a04080']
const SPIN_MS = 4500

const RARITY_LEVEL = { common: 1, rare: 2, legendary: 3, exotic: 4 }

/**
 * Broušený drahokam. Čím vyšší úroveň vzácnosti, tím víc fasetek
 * (a u exotic navíc jiskra). Kreslí se vystředěný kolem (0,0).
 */
function Gem({ base, tab, str, level = 1 }) {
  const W = 14, H = 17
  const outline = `-7,${-H} 7,${-H} ${W},0 7,${H} -7,${H} ${-W},0`
  const table = `-7,${-H} 7,${-H} 4,-5 -4,-5`
  return (
    <g>
      <polygon points={outline} fill={base} stroke={str} strokeWidth="1.4" strokeLinejoin="round" />
      <polygon points={table} fill={tab} />
      {level >= 3 && <polygon points={`-7,${-H} 0,${-H} 0,-5 -4,-5`} fill={tab} opacity="0.45" />}
      <g stroke={str} strokeWidth="0.7" opacity="0.85" fill="none">
        <line x1={-W} y1="0" x2="-4" y2="-5" />
        <line x1={W} y1="0" x2="4" y2="-5" />
        <line x1="-4" y1="-5" x2="0" y2={H} />
        <line x1="4" y1="-5" x2="0" y2={H} />
        {level >= 2 && <line x1={-W} y1="0" x2={W} y2="0" />}
        {level >= 2 && <line x1="0" y1={-H} x2="0" y2="-5" />}
        {level >= 3 && <line x1={-W} y1="0" x2="0" y2={H} />}
        {level >= 3 && <line x1={W} y1="0" x2="0" y2={H} />}
        {level >= 4 && <line x1="-7" y1={H} x2="-4" y2="-5" />}
        {level >= 4 && <line x1="7" y1={H} x2="4" y2="-5" />}
      </g>
      {level >= 4 && (
        <path d="M -5 -12 l1 2.3 2.3 1 -2.3 1 -1 2.3 -1 -2.3 -2.3 -1 2.3 -1 z" fill="#fff" opacity="0.9" />
      )}
    </g>
  )
}

// Drahokam vzácnosti jako samostatné inline SVG (pro popisky mimo kolo)
function RarityGem({ rarity, size = 38 }) {
  if (!rarity?.gem) return <span style={{ fontSize: size * 0.7 }}>{rarity?.icon}</span>
  return (
    <svg width={size} height={size} viewBox="-18 -20 36 40" aria-hidden="true"
      style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))', display: 'block' }}>
      <Gem {...rarity.gem} level={RARITY_LEVEL[rarity.id]} />
    </svg>
  )
}

/**
 * Statické kolo se zobrazeným natočením `rotation` (ve stupních).
 */
function Wheel({ items, rotation, size = 230, weights = null, renderIcon = null }) {
  const n = items.length
  const cx = size / 2, cy = size / 2, r = size / 2 - 6
  if (n === 0) return null

  const total = weights ? weights.reduce((a, b) => a + b, 0) : n
  let acc = 0
  const slices = items.map((item, i) => {
    const w = weights ? weights[i] : 1
    const f0 = acc / total
    acc += w
    const f1 = acc / total
    const a0 = f0 * 2 * Math.PI - Math.PI / 2
    const a1 = f1 * 2 * Math.PI - Math.PI / 2
    const x1 = cx + r * Math.cos(a0), y1 = cy + r * Math.sin(a0)
    const x2 = cx + r * Math.cos(a1), y2 = cy + r * Math.sin(a1)
    const mid = (a0 + a1) / 2
    // úzké dílky: posuň ikonu blíž k okraji, ať se vejde
    const iconR = (f1 - f0) < 0.12 ? r * 0.78 : r * 0.66
    const tx = cx + iconR * Math.cos(mid), ty = cy + iconR * Math.sin(mid)
    const large = (a1 - a0) > Math.PI ? 1 : 0
    const d = n === 1
      ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
    return { d, color: item.wheelColor || SLICE_COLORS[i % SLICE_COLORS.length], icon: item.icon, tx, ty }
  })

  return (
    <div style={{ position: 'relative', width: size, height: size + 22, margin: '0 auto' }}>
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
        <g transform={`rotate(${rotation} ${cx} ${cy})`}>
          {slices.map((s, i) => (
            <g key={i}>
              <path d={s.d} fill={s.color} stroke="rgba(0,0,0,0.4)" strokeWidth="2" />
              {renderIcon
                ? renderIcon(items[i], s.tx, s.ty)
                : <text x={s.tx} y={s.ty} textAnchor="middle" dominantBaseline="middle"
                    fontSize={n > 6 ? 15 : n > 4 ? 18 : 24} style={{ pointerEvents: 'none' }}>{s.icon}</text>}
            </g>
          ))}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--gold)" strokeWidth="3" opacity="0.5" />
        </g>
        <circle cx={cx} cy={cy} r={18} fill="var(--bg)" stroke="var(--gold)" strokeWidth="2" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="13" fill="var(--gold)">✦</text>
      </svg>
    </div>
  )
}

/**
 * Cílový úhel tak, aby STŘED dílku s indexem `targetIndex` skončil pod šipkou.
 */
function calcTargetRotation(targetIndex, totalSlices, currentRotation) {
  const anglePerSlice = 360 / totalSlices
  const targetMod = -(targetIndex + 0.5) * anglePerSlice
  const fullTurns = 4 * 360
  const jitter = (Math.random() - 0.5) * (anglePerSlice * 0.5)
  return currentRotation + fullTurns + targetMod + jitter - (currentRotation % 360)
}

function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4) }

/**
 * Cílový úhel pro kolo s RŮZNĚ velkými dílky (dílek i má váhu weights[i]).
 * Zarovná střed dílku targetIndex pod šipku; jitter zůstane uvnitř dílku.
 */
function calcTargetRotationWeighted(targetIndex, weights, currentRotation) {
  const total = weights.reduce((a, b) => a + b, 0)
  let before = 0
  for (let i = 0; i < targetIndex; i++) before += weights[i]
  const f0 = before / total
  const f1 = (before + weights[targetIndex]) / total
  const centerFrac = (f0 + f1) / 2
  const sliceDeg = (f1 - f0) * 360
  const targetMod = -centerFrac * 360
  const fullTurns = 4 * 360
  const jitter = (Math.random() - 0.5) * (sliceDeg * 0.5)
  return currentRotation + fullTurns + targetMod + jitter - (currentRotation % 360)
}

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

  const animateWheel = (fromRotation, toRotation, duration, setRotation) => {
    return new Promise(resolve => {
      const startTime = performance.now()
      const step = (now) => {
        const t = Math.min((now - startTime) / duration, 1)
        setRotation(fromRotation + (toRotation - fromRotation) * easeOutQuart(t))
        if (t < 1) animRef.current = requestAnimationFrame(step)
        else resolve()
      }
      animRef.current = requestAnimationFrame(step)
    })
  }

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
    const targetRot = calcTargetRotationWeighted(index, RARITIES.map(r => r.weight), rotation1)
    await animateWheel(rotation1, targetRot, SPIN_MS, setRotation1)
    setResultRarity(rarity)
    toast(`${rarity.icon} ${rarity.name} — teď zatoč kletbu!`, 'info')
    setTimeout(() => setState('paused'), 1000)
  }

  // ── KOLO 2 — konkrétní kletba ──
  const handleSpinCurse = async () => {
    if (state !== 'paused') return
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
    await animateWheel(rotation2, targetRot, SPIN_MS, setRotation2)
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
          <p className="text-muted text-sm mt-1">Získáš je při každém sudém level upu.</p>
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
              <Wheel items={RARITIES} weights={RARITIES.map(r => r.weight)} rotation={rotation1}
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
                  <div className="font-cinzel mt-1" style={{ color: shownRarity.wheelColor, fontSize: '1.05rem' }}>{shownRarity.name}</div>
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
                <div className="font-cinzel" style={{ color: doneRarity.wheelColor, fontSize: '0.85rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
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
              <span style={{ fontFamily: 'Cinzel, serif', fontSize: '0.9rem', fontWeight: 700 }}>{rar.name}</span>
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
        <p className="text-xs text-muted mt-1">
          Kletby, které už hráči mají v inventáři, padají s menší pravděpodobností.
        </p>
      </div>
    </div>
  )
}
