import { useMemo } from 'react'
import { readingColor } from './lib/color.ts'
import { CROWDED_FROM, type Plan, type Well } from './lib/plan.ts'

interface Props {
  wells: Well[]
  plan?: Plan
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** Zoom to these wells only (used by the printed notice). */
  focusIds?: string[]
  height?: number
  measure?: 'field' | 'lab'
}

const W = 900
const PAD = 28

export default function MapView({ wells, plan, selectedId, onSelect, focusIds, height = 620, measure = 'field' }: Props) {
  const view = useMemo(() => {
    const src = focusIds ? wells.filter((w) => focusIds.includes(w.id)) : wells
    if (src.length === 0) return null
    const lat0 = src.reduce((s, w) => s + w.lat, 0) / src.length
    const kx = 111320 * Math.cos((lat0 * Math.PI) / 180)
    const ky = 110540
    const xs = src.map((w) => w.lon * kx)
    const ys = src.map((w) => w.lat * ky)
    let minX = Math.min(...xs)
    let maxX = Math.max(...xs)
    let minY = Math.min(...ys)
    let maxY = Math.max(...ys)
    // Never zoom in closer than about 300 m across; it would overstate coordinate precision.
    const minSpan = focusIds ? 120 : 300
    if (maxX - minX < minSpan) [minX, maxX] = [(minX + maxX - minSpan) / 2, (minX + maxX + minSpan) / 2]
    if (maxY - minY < minSpan) [minY, maxY] = [(minY + maxY - minSpan) / 2, (minY + maxY + minSpan) / 2]
    if (focusIds) {
      const mx = (maxX - minX) * 0.35
      const my = (maxY - minY) * 0.35
      minX -= mx; maxX += mx; minY -= my; maxY += my
    }
    const scale = Math.min((W - 2 * PAD) / (maxX - minX), (height - 2 * PAD) / (maxY - minY))
    const ox = (W - (maxX - minX) * scale) / 2
    const oy = (height - (maxY - minY) * scale) / 2
    const px = (w: { lat: number; lon: number }) => ({
      x: ox + (w.lon * kx - minX) * scale,
      y: height - oy - (w.lat * ky - minY) * scale,
    })
    // Grid step: 200 m for a village, 50 m when zoomed in.
    const step = (maxX - minX) > 1500 ? 200 : (maxX - minX) > 500 ? 100 : 50
    const gx: number[] = []
    for (let m = Math.ceil(minX / step) * step; m <= maxX; m += step) gx.push(ox + (m - minX) * scale)
    const gy: number[] = []
    for (let m = Math.ceil(minY / step) * step; m <= maxY; m += step) gy.push(height - oy - (m - minY) * scale)
    return { px, scale, step, gx, gy }
  }, [wells, focusIds, height])

  if (!view) {
    return <div className="map-empty">No wells yet. Add the first well to start the map.</div>
  }

  const pts = new Map(wells.map((w) => [w.id, view.px(w)]))
  const inView = (p: { x: number; y: number }) => p.x >= -20 && p.x <= W + 20 && p.y >= -20 && p.y <= height + 20
  const sel = selectedId ? plan?.byId.get(selectedId) : undefined
  const r = focusIds ? 9 : 4.6
  const barM = view.step
  const barPx = barM * view.scale

  return (
    <svg
      className="map"
      viewBox={`0 0 ${W} ${height}`}
      role="img"
      aria-label={`Map of ${wells.length} wells drawn from their coordinates, grid lines every ${view.step} metres`}
      onClick={() => onSelect(null)}
    >
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#0e5a63" />
        </marker>
        <marker id="arr-warn" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#8a5a00" />
        </marker>
      </defs>
      <rect x="0" y="0" width={W} height={height} fill="#fbfaf6" />
      {view.gx.map((x) => <line key={`x${x}`} x1={x} x2={x} y1={0} y2={height} className="grid" />)}
      {view.gy.map((y) => <line key={`y${y}`} y1={y} y2={y} x1={0} x2={W} className="grid" />)}

      {plan?.assignments.filter((a) => a.status === 'switch').map((a) => {
        const p = pts.get(a.wellId)!
        const q = pts.get(a.useId)!
        if (!inView(p) && !inView(q)) return null
        const hot = selectedId !== null && (a.wellId === selectedId || a.useId === selectedId)
        return (
          <line
            key={a.wellId}
            x1={p.x} y1={p.y} x2={q.x} y2={q.y}
            className={`arrow${a.stillAbove ? ' warn' : ''}${hot ? ' hot' : selectedId ? ' dim' : ''}`}
            markerEnd={`url(#${a.stillAbove ? 'arr-warn' : 'arr'})`}
          />
        )
      })}

      {wells.map((w) => {
        const p = pts.get(w.id)!
        if (!inView(p)) return null
        const a = plan?.byId.get(w.id)
        const n = plan?.incoming.get(w.id) ?? 0
        const v = w[measure]
        const isSel = w.id === selectedId
        const related = sel && (sel.useId === w.id)
        return (
          <g
            key={w.id}
            className="pt"
            onClick={(e) => { e.stopPropagation(); onSelect(w.id) }}
          >
            <title>{`${w.label ?? w.id}: ${v === null ? 'not tested' : v + ' \u00b5g/L'}${w.share ? '' : ' (not shared)'}`}</title>
            {n >= CROWDED_FROM && <circle cx={p.x} cy={p.y} r={r + 6} className="crowd" />}
            {a?.status === 'no-option' && <rect x={p.x - r - 2.5} y={p.y - r - 2.5} width={2 * r + 5} height={2 * r + 5} className="noopt" />}
            <circle
              cx={p.x} cy={p.y} r={r}
              fill={readingColor(v)}
              className={`dot${v === null ? ' untested' : ''}${w.share ? '' : ' unshared'}`}
            />
            {(isSel || related) && <circle cx={p.x} cy={p.y} r={r + 4} className="sel" />}
            {n >= CROWDED_FROM && <text x={p.x + r + 8} y={p.y - r - 4} className="crowd-n">{n}</text>}
            {focusIds && <text x={p.x} y={p.y + r + 16} textAnchor="middle" className="pt-label">{w.label ?? w.id}</text>}
          </g>
        )
      })}

      <g transform={`translate(${PAD}, ${height - 16})`} className="scalebar">
        <line x1={0} x2={barPx} y1={0} y2={0} />
        <line x1={0} x2={0} y1={-4} y2={4} />
        <line x1={barPx} x2={barPx} y1={-4} y2={4} />
        <text x={barPx + 8} y={4}>{barM} m (grid)</text>
      </g>
      <g transform={`translate(${W - 34}, 34)`} className="north">
        <path d="M0 -18L6 6L0 1L-6 6z" />
        <text x={0} y={22} textAnchor="middle">N</text>
      </g>
    </svg>
  )
}
