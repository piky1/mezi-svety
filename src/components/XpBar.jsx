import { XP_PER_LEVEL } from '../firebase/db'

export default function XpBar({ xp, level }) {
  const pct = Math.min((xp / XP_PER_LEVEL) * 100, 100)
  return (
    <div>
      <div className="flex justify-between text-xs text-dim mb-1">
        <span className="font-cinzel">Zkušenosti</span>
        <span>{xp} / {XP_PER_LEVEL}</span>
      </div>
      <div className="xp-bar-wrap">
        <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
