import { useEffect, useRef, useState } from 'react'

// Editor avataru: fotku lze v kolečku posunout (prstem i myší) a přiblížit.
// Teprve po kliknutí na "Uložit" se vyrenderuje výřez a vrátí jako data URL.
const VIEWPORT = 260 // velikost náhledového kolečka v px
const OUTPUT = 256   // výsledná velikost uloženého avataru

export default function AvatarEditor({ file, onSave, onCancel, saving }) {
  const [img, setImg] = useState(null) // { el, w, h }
  const [zoom, setZoom] = useState(1)  // 1–3
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef(null)

  // Načti obrázek ze souboru
  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const el = new Image()
    el.onload = () => setImg({ el, w: el.naturalWidth, h: el.naturalHeight })
    el.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Základní měřítko = obrázek právě vyplní kolečko ("cover")
  const baseScale = img ? VIEWPORT / Math.min(img.w, img.h) : 1
  const effScale = baseScale * zoom
  const dispW = img ? img.w * effScale : 0
  const dispH = img ? img.h * effScale : 0

  // Drž obrázek tak, aby vždy překrýval celé kolečko
  const clamp = (o, dw = dispW, dh = dispH) => ({
    x: Math.min(0, Math.max(VIEWPORT - dw, o.x)),
    y: Math.min(0, Math.max(VIEWPORT - dh, o.y)),
  })

  // Po načtení obrázku ho vycentruj
  useEffect(() => {
    if (!img) return
    setOffset(clamp({ x: (VIEWPORT - dispW) / 2, y: (VIEWPORT - dispH) / 2 }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img])

  // Změna přiblížení – drží střed kolečka na místě
  const handleZoom = (z) => {
    if (!img) { setZoom(z); return }
    const newEff = baseScale * z
    const newDispW = img.w * newEff
    const newDispH = img.h * newEff
    const fx = (VIEWPORT / 2 - offset.x) / dispW
    const fy = (VIEWPORT / 2 - offset.y) / dispH
    setZoom(z)
    setOffset(clamp(
      { x: VIEWPORT / 2 - fx * newDispW, y: VIEWPORT / 2 - fy * newDispH },
      newDispW, newDispH,
    ))
  }

  // Tažení (myš i dotyk přes pointer events)
  const onPointerDown = (e) => {
    if (saving) return
    drag.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!drag.current) return
    setOffset(clamp({
      x: drag.current.ox + (e.clientX - drag.current.px),
      y: drag.current.oy + (e.clientY - drag.current.py),
    }))
  }
  const onPointerUp = () => { drag.current = null }

  // Vyrenderuj viditelný výřez do čtverce a vrať jako data URL
  const handleSave = () => {
    if (!img) return
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT
    canvas.height = OUTPUT
    const ctx = canvas.getContext('2d')
    const sSize = VIEWPORT / effScale
    ctx.drawImage(img.el, -offset.x / effScale, -offset.y / effScale, sSize, sSize, 0, 0, OUTPUT, OUTPUT)
    onSave(canvas.toDataURL('image/jpeg', 0.85))
  }

  return (
    <div className="modal-overlay" onClick={saving ? undefined : onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <h3 className="heading mb-3" style={{ fontSize: '1.1rem', color: 'var(--gold)' }}>Uprav avatar</h3>
        <p className="text-dim text-sm mb-3">Posuň fotku prstem nebo myší a nastav přiblížení.</p>

        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            width: VIEWPORT, height: VIEWPORT, margin: '0 auto',
            borderRadius: '50%', overflow: 'hidden', position: 'relative',
            cursor: saving ? 'default' : 'grab', touchAction: 'none',
            border: '2px solid var(--gold-dim)',
            boxShadow: '0 0 18px rgba(201,168,76,0.35)',
            background: 'var(--bg3)',
          }}
        >
          {img && (
            <img
              src={img.el.src}
              alt=""
              draggable={false}
              style={{
                position: 'absolute', top: 0, left: 0,
                width: dispW, height: dispH,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                userSelect: 'none', pointerEvents: 'none',
              }}
            />
          )}
        </div>

        <div style={{ maxWidth: VIEWPORT, margin: '1rem auto 0', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.9rem' }}>🔍</span>
          <input
            type="range" min="1" max="3" step="0.01" value={zoom}
            onChange={e => handleZoom(parseFloat(e.target.value))}
            disabled={!img || saving}
            style={{ flex: 1 }}
          />
        </div>

        <div className="flex gap-2 mt-3">
          <button className="btn btn-ghost flex-1" onClick={onCancel} disabled={saving}>Zrušit</button>
          <button className="btn btn-gold flex-1" onClick={handleSave} disabled={!img || saving}>
            {saving ? 'Ukládám...' : '💾 Uložit'}
          </button>
        </div>
      </div>
    </div>
  )
}
