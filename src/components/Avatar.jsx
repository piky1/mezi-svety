// Kolečko postavy: ukáže nahraný obrázek, jinak první písmeno jména.
export default function Avatar({ src, name, size }) {
  const initial = ((name || '?').trim().charAt(0) || '?').toUpperCase()
  const sizeStyle = size
    ? { width: size, height: size, fontSize: Math.round(size * 0.42) }
    : {}
  return (
    <div className="level-badge" style={{ overflow: 'hidden', padding: 0, ...sizeStyle }}>
      {src
        ? <img src={src} alt={name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        : <span>{initial}</span>}
    </div>
  )
}
