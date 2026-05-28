import { cleanExpiredCurses } from '../firebase/db'

export default function CurseList({ curses, compact = false }) {
  const active = cleanExpiredCurses(curses)
  if (!active.length) return (
    <span className="text-muted text-xs">Žádné aktivní kletby</span>
  )
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {active.map(c => (
        <div key={c.id} className={`curse-chip curse-${c.curseId}`} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, borderRadius: 8 }}>
          <span>{c.curseIcon} {compact ? '' : c.curseName}</span>
          {!compact && c.tierName && (
            <span className="text-xs" style={{ opacity: 0.8 }}>{c.tierIcon} {c.tierName}</span>
          )}
          {!compact && (
            <span className="text-xs text-muted" style={{ opacity: 0.7 }}>od {c.senderName}</span>
          )}
        </div>
      ))}
    </div>
  )
}
