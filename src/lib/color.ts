// Continuous colour for an arsenic reading, on a log scale.
// Deliberately not red/green: the point of the app is that a reading is a number, not a verdict.
const STOPS: [number, [number, number, number]][] = [
  [1, [214, 236, 235]],
  [10, [244, 229, 160]],
  [50, [240, 160, 75]],
  [150, [200, 69, 47]],
  [500, [92, 26, 51]],
]

export function readingColor(v: number | null): string {
  if (v === null) return '#ffffff'
  const x = Math.log10(Math.min(500, Math.max(1, v)))
  for (let i = 1; i < STOPS.length; i++) {
    const [v1, c1] = STOPS[i]
    if (x <= Math.log10(v1)) {
      const [v0, c0] = STOPS[i - 1]
      const t = (x - Math.log10(v0)) / (Math.log10(v1) - Math.log10(v0))
      const c = c0.map((a, k) => Math.round(a + (c1[k] - a) * t))
      return `rgb(${c[0]},${c[1]},${c[2]})`
    }
  }
  return 'rgb(92,26,51)'
}

export function legendGradient(): string {
  const max = Math.log10(500)
  return `linear-gradient(to right, ${STOPS.map(([v, c]) => `rgb(${c.join(',')}) ${((Math.log10(v) / max) * 100).toFixed(1)}%`).join(', ')})`
}

/** Position (0..100) of a value on the legend bar. */
export const legendPos = (v: number) => (Math.log10(v) / Math.log10(500)) * 100
