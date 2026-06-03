// Sdílené stavební prvky kola štěstí – používá je hráčské i adminské kolo.

export const SLICE_COLORS = ['#7040a0', '#4488bb', '#bb6040', '#40a060', '#c09030', '#c04060', '#5060c0', '#a04080']
export const SPIN_MS = 4500
export const RARITY_LEVEL = { common: 1, rare: 2, legendary: 3, exotic: 4 }

// Zářící obrys textu – nově svítí jen „Legendary" (zlatá, id 'exotic'). Ostatní bez záře.
export function rarityGlow(rarityId, color) {
  if (rarityId === 'exotic') return '0 0 4px #ecd692, 0 0 14px rgba(201,168,76,0.9), 0 0 26px rgba(201,168,76,0.55)'
  return 'none'
}

/**
 * Broušený drahokam. Čím vyšší úroveň vzácnosti, tím víc fasetek
 * (a u exotic navíc jiskra). Kreslí se vystředěný kolem (0,0).
 */
export function Gem({ base, tab, str, level = 1 }) {
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
export function RarityGem({ rarity, size = 38 }) {
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
export function Wheel({ items, rotation, size = 230, weights = null, renderIcon = null }) {
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

function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4) }

// Cílový úhel tak, aby STŘED stejně velkého dílku skončil pod šipkou.
export function calcTargetRotation(targetIndex, totalSlices, currentRotation) {
  const anglePerSlice = 360 / totalSlices
  const targetMod = -(targetIndex + 0.5) * anglePerSlice
  const fullTurns = 4 * 360
  const jitter = (Math.random() - 0.5) * (anglePerSlice * 0.5)
  return currentRotation + fullTurns + targetMod + jitter - (currentRotation % 360)
}

// Cílový úhel pro kolo s RŮZNĚ velkými dílky (dílek i má váhu weights[i]).
export function calcTargetRotationWeighted(targetIndex, weights, currentRotation) {
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

// Animace otáčení; `animRef` je useRef pro zrušení requestAnimationFrame.
export function animateWheel(animRef, fromRotation, toRotation, duration, setRotation) {
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
