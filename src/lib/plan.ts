// NextWell calculation rules. Pure functions, no I/O.
// The rules are fixed in the project outline and locked by plan.test.ts.

export interface Well {
  id: string
  lat: number
  lon: number
  /** Field-kit arsenic reading in ug/L. null = not tested yet. */
  field: number | null
  /** Laboratory arsenic value in ug/L, when one exists. Never used to build the plan. */
  lab: number | null
  /** true when the lab value was reported as below the detection limit. */
  labBelowDetection?: boolean
  /** Owner agrees to share the well with neighbours. */
  share: boolean
  depthM?: number | null
  label?: string
}

export interface PlanOptions {
  /** Maximum straight-line distance in metres. */
  maxDistanceM: number
  /** A candidate must read at most ratio x the current well. */
  ratio: number
  /** National limit in ug/L. */
  limit: number
}

export const DEFAULTS: PlanOptions = { maxDistanceM: 200, ratio: 0.5, limit: 50 }
export const WHO_GUIDELINE = 10
export const CROWDED_FROM = 6

export type Status =
  | 'keep' // at or below the limit: stay
  | 'switch' // a lower candidate exists in range
  | 'no-option' // above the limit, nothing lower in range
  | 'untested' // no reading: test first

export interface Assignment {
  wellId: string
  status: Status
  /** Well the users would drink from under the plan (own well unless status is 'switch'). */
  useId: string
  distanceM: number
  /** status 'switch' but the candidate itself is still above the limit. */
  stillAbove: boolean
}

export interface Plan {
  options: PlanOptions
  assignments: Assignment[]
  byId: Map<string, Assignment>
  /** How many other wells' users are sent to each receiving well. */
  incoming: Map<string, number>
}

const R = 6371000
const rad = (d: number) => (d * Math.PI) / 180

export function haversineM(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Compass bearing from a to b in degrees, 0 = north, 90 = east. */
export function bearingDeg(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat))
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function compass8(deg: number): number {
  return Math.round(deg / 45) % 8
}

export function buildPlan(wells: Well[], opts: PlanOptions = DEFAULTS): Plan {
  const assignments: Assignment[] = wells.map((w) => {
    const stay = (status: Status): Assignment => ({ wellId: w.id, status, useId: w.id, distanceM: 0, stillAbove: false })
    // Rule 4: an untested well is neither a source nor a candidate.
    if (w.field === null) return stay('untested')
    // Rule 1: only users of wells above the limit look for another well.
    if (w.field <= opts.limit) return stay('keep')

    let best: { well: Well; d: number } | null = null
    for (const c of wells) {
      if (c.id === w.id || c.field === null || !c.share) continue
      // Rule 2: in range, shared, and at most ratio x my reading.
      if (c.field > opts.ratio * w.field) continue
      const d = haversineM(w, c)
      if (d > opts.maxDistanceM) continue
      // Rule 3: lowest reading, then nearest, then earliest id.
      if (
        best === null ||
        c.field < best.well.field! ||
        (c.field === best.well.field && (d < best.d || (d === best.d && c.id < best.well.id)))
      ) {
        best = { well: c, d }
      }
    }
    if (best === null) return stay('no-option')
    return {
      wellId: w.id,
      status: 'switch',
      useId: best.well.id,
      distanceM: best.d,
      stillAbove: best.well.field! > opts.limit,
    }
  })

  const incoming = new Map<string, number>()
  for (const a of assignments) {
    if (a.status === 'switch') incoming.set(a.useId, (incoming.get(a.useId) ?? 0) + 1)
  }
  return { options: opts, assignments, byId: new Map(assignments.map((a) => [a.wellId, a])), incoming }
}

export interface BeforeAfter {
  /** Wells that have a value for this measure. This is the denominator. */
  measured: number
  aboveBefore: number
  aboveAfter: number
  meanBefore: number
  meanAfter: number
}

/**
 * Before/after for one measure. With 'lab' the plan itself is unchanged
 * (it was built from field readings); only the scoring uses lab values.
 */
export function beforeAfter(wells: Well[], plan: Plan, measure: 'field' | 'lab'): BeforeAfter {
  const byId = new Map(wells.map((w) => [w.id, w]))
  let measured = 0
  let aboveBefore = 0
  let aboveAfter = 0
  let sumBefore = 0
  let sumAfter = 0
  for (const w of wells) {
    const a = plan.byId.get(w.id)!
    const before = w[measure]
    const after = byId.get(a.useId)?.[measure] ?? null
    if (before === null || after === null) continue
    measured++
    sumBefore += before
    sumAfter += after
    if (before > plan.options.limit) aboveBefore++
    if (after > plan.options.limit) aboveAfter++
  }
  return {
    measured,
    aboveBefore,
    aboveAfter,
    meanBefore: measured ? sumBefore / measured : 0,
    meanAfter: measured ? sumAfter / measured : 0,
  }
}

export interface PlanSummary {
  switches: number
  receivers: number
  medianWalkM: number
  stillAbove: number
  noOption: number
  untested: number
  crowded: { id: string; count: number }[]
  /** Switches where both wells have a lab value. */
  labComparable: number
  /** ...and the lab value of the candidate is lower as well. */
  labConfirmed: number
}

export function summarize(wells: Well[], plan: Plan): PlanSummary {
  const byId = new Map(wells.map((w) => [w.id, w]))
  const sw = plan.assignments.filter((a) => a.status === 'switch')
  const dist = sw.map((a) => a.distanceM).sort((x, y) => x - y)
  const mid = dist.length >> 1
  const median = dist.length === 0 ? 0 : dist.length % 2 ? dist[mid] : (dist[mid - 1] + dist[mid]) / 2
  let labComparable = 0
  let labConfirmed = 0
  for (const a of sw) {
    const from = byId.get(a.wellId)!.lab
    const to = byId.get(a.useId)!.lab
    if (from === null || to === null) continue
    labComparable++
    if (to < from) labConfirmed++
  }
  return {
    switches: sw.length,
    receivers: plan.incoming.size,
    medianWalkM: median,
    stillAbove: sw.filter((a) => a.stillAbove).length,
    noOption: plan.assignments.filter((a) => a.status === 'no-option').length,
    untested: plan.assignments.filter((a) => a.status === 'untested').length,
    crowded: [...plan.incoming]
      .filter(([, n]) => n >= CROWDED_FROM)
      .map(([id, count]) => ({ id, count }))
      .sort((x, y) => y.count - x.count || (x.id < y.id ? -1 : 1)),
    labComparable,
    labConfirmed,
  }
}

export interface KitAgreement {
  compared: number
  agree: number
  /** Kit says at/below the limit, lab says above. The dangerous direction. */
  kitSafeLabAbove: number
  kitAboveLabSafe: number
}

export function kitAgreement(wells: Well[], limit = DEFAULTS.limit): KitAgreement {
  const out: KitAgreement = { compared: 0, agree: 0, kitSafeLabAbove: 0, kitAboveLabSafe: 0 }
  for (const w of wells) {
    if (w.field === null || w.lab === null) continue
    out.compared++
    const f = w.field > limit
    const l = w.lab > limit
    if (f === l) out.agree++
    else if (l) out.kitSafeLabAbove++
    else out.kitAboveLabSafe++
  }
  return out
}
