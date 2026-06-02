import { useId } from 'react'

// Logo hry „Mezi Světy" — portál (prolínání reálného a kosmického světa) + nápis.
// `stack` = svislé uspořádání (login), jinak vodorovné (navigace).
export default function Logo({ size = 28, stack = false }) {
  const raw = useId().replace(/[:]/g, '')
  const gId = `portalCore-${raw}`

  const portal = (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true"
      style={{ flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(54,198,198,0.4))' }}>
      <defs>
        <radialGradient id={gId} cx="50%" cy="44%" r="58%">
          <stop offset="0%" stopColor="#eafcff" />
          <stop offset="42%" stopColor="#5fe4e4" />
          <stop offset="100%" stopColor="#1f7fb0" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="none" stroke="#8844aa" strokeWidth="2" opacity="0.85" />
      <circle cx="24" cy="24" r="16" fill="none" stroke="#4488bb" strokeWidth="2.4" />
      <circle cx="24" cy="24" r="11" fill="none" stroke="#36c6c6" strokeWidth="2.4" opacity="0.95" />
      <circle cx="24" cy="24" r="6.5" fill={`url(#${gId})`} />
      <path d="M 9 18 A 16 16 0 0 1 21 7" fill="none" stroke="#cdefff" strokeWidth="1.4" strokeLinecap="round" opacity="0.65" />
      <g fill="#ffe9a8">
        <path d="M38 9 l1.2 2.7 2.7 1.2 -2.7 1.2 -1.2 2.7 -1.2 -2.7 -2.7 -1.2 2.7 -1.2 z" opacity="0.9" />
        <circle cx="10.5" cy="35.5" r="1.3" />
        <circle cx="40" cy="34" r="1" />
      </g>
    </svg>
  )

  const wordmark = (
    <span style={{
      fontFamily: 'Cinzel, serif', fontWeight: 700,
      color: 'var(--gold)', letterSpacing: '0.12em', lineHeight: 1,
      fontSize: stack ? '1.7rem' : '1.05rem',
      textShadow: '0 0 18px rgba(201,168,76,0.45)', whiteSpace: 'nowrap',
    }}>MEZI SVĚTY</span>
  )

  return (
    <div style={{
      display: 'flex', flexDirection: stack ? 'column' : 'row',
      alignItems: 'center', gap: stack ? '0.6rem' : '0.5rem',
    }}>
      {portal}
      {wordmark}
    </div>
  )
}
