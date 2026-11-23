import { describe, expect, it } from 'vitest'
import { DEFAULTS, beforeAfter, buildPlan, haversineM, kitAgreement, summarize, type Well } from './plan.ts'
import { mandariWells } from './mandari.ts'

const w = (id: string, lon: number, field: number | null, extra: Partial<Well> = {}): Well => ({
  id,
  lat: 22.92,
  lon,
  field,
  lab: null,
  share: true,
  ...extra,
})
// At latitude 22.92, 0.001 degrees of longitude is about 102 m.
const STEP = 0.001

describe('rules on small cases', () => {
  it('measures distance in metres', () => {
    expect(haversineM({ lat: 22.92, lon: 90.9 }, { lat: 22.92, lon: 90.9 + STEP })).toBeCloseTo(102.4, 0)
  })

  it('leaves wells at or below the limit alone', () => {
    const plan = buildPlan([w('a', 90.9, 50), w('b', 90.9 + STEP, 5)])
    expect(plan.byId.get('a')!.status).toBe('keep')
  })

  it('needs half or less: 26 is not enough for 51, 25 is', () => {
    expect(buildPlan([w('a', 90.9, 51), w('b', 90.9 + STEP, 26)]).byId.get('a')!.status).toBe('no-option')
    expect(buildPlan([w('a', 90.9, 51), w('b', 90.9 + STEP, 25)]).byId.get('a')!.useId).toBe('b')
  })

  it('ignores wells beyond the walking distance', () => {
    const wells = [w('a', 90.9, 200), w('b', 90.9 + 3 * STEP, 5)]
    expect(buildPlan(wells).byId.get('a')!.status).toBe('no-option')
    expect(buildPlan(wells, { ...DEFAULTS, maxDistanceM: 400 }).byId.get('a')!.useId).toBe('b')
  })

  it('picks the lowest reading, then the nearest, then the earliest id', () => {
    const lowest = buildPlan([w('a', 90.9, 200), w('near', 90.9 + 0.5 * STEP, 40), w('far', 90.9 + STEP, 10)])
    expect(lowest.byId.get('a')!.useId).toBe('far')
    const nearest = buildPlan([w('a', 90.9, 200), w('far', 90.9 + STEP, 10), w('near', 90.9 + 0.5 * STEP, 10)])
    expect(nearest.byId.get('a')!.useId).toBe('near')
    const byId = buildPlan([w('a', 90.9, 200), w('z', 90.9 + STEP, 10), w('m', 90.9 - STEP, 10)])
    expect(haversineM(w('a', 90.9, 0), w('z', 90.9 + STEP, 0))).toBe(haversineM(w('a', 90.9, 0), w('m', 90.9 - STEP, 0)))
    expect(byId.byId.get('a')!.useId).toBe('m')
  })

  it('never sends anyone to a well whose owner has not agreed to share', () => {
    const plan = buildPlan([w('a', 90.9, 200), w('b', 90.9 + STEP, 5, { share: false })])
    expect(plan.byId.get('a')!.status).toBe('no-option')
  })

  it('treats untested wells as test-first: not a source, not a candidate', () => {
    const plan = buildPlan([w('a', 90.9, 200), w('b', 90.9 + STEP, null)])
    expect(plan.byId.get('a')!.status).toBe('no-option')
    expect(plan.byId.get('b')!.status).toBe('untested')
    const ba = beforeAfter([w('a', 90.9, 200), w('b', 90.9 + STEP, null)], plan, 'field')
    expect(ba.measured).toBe(1)
  })

  it('flags a move that is lower but still above the limit', () => {
    const plan = buildPlan([w('a', 90.9, 300), w('b', 90.9 + STEP, 120)])
    const a = plan.byId.get('a')!
    expect(a.status).toBe('switch')
    expect(a.stillAbove).toBe(true)
  })
})

describe('Mandari Village Survey, 236 wells (values fixed in the outline)', () => {
  const wells = mandariWells()
  const plan = buildPlan(wells, DEFAULTS)
  const s = summarize(wells, plan)

  it('has 236 wells, all with a field and a lab value', () => {
    expect(wells).toHaveLength(236)
    expect(wells.every((x) => x.field !== null && x.lab !== null)).toBe(true)
  })

  it('field readings: 175 -> 80 above the limit, mean 118 -> 48', () => {
    const ba = beforeAfter(wells, plan, 'field')
    expect(ba.measured).toBe(236)
    expect([ba.aboveBefore, ba.aboveAfter]).toEqual([175, 80])
    expect([Math.round(ba.meanBefore), Math.round(ba.meanAfter)]).toEqual([118, 48])
  })

  it('same plan scored with lab values: 166 -> 76, mean 121 -> 53', () => {
    const ba = beforeAfter(wells, plan, 'lab')
    expect([ba.aboveBefore, ba.aboveAfter]).toEqual([166, 76])
    expect([Math.round(ba.meanBefore), Math.round(ba.meanAfter)]).toEqual([121, 53])
  })

  it('113 switches into 39 wells, median walk 135 m, all 113 lower by lab value too', () => {
    expect(s.switches).toBe(113)
    expect(s.receivers).toBe(39)
    expect(Math.round(s.medianWalkM)).toBe(135)
    expect([s.labConfirmed, s.labComparable]).toEqual([113, 113])
  })

  it('18 switches stay above the limit, 62 wells have no option, 6 wells are crowded (max 11)', () => {
    expect(s.stillAbove).toBe(18)
    expect(s.noOption).toBe(62)
    expect(s.crowded).toHaveLength(6)
    expect(s.crowded[0].count).toBe(11)
  })

  it('kit and lab agree on the 50 limit for 219 of 236; 4 kit-safe wells are above by lab', () => {
    expect(kitAgreement(wells)).toEqual({ compared: 236, agree: 219, kitSafeLabAbove: 4, kitAboveLabSafe: 13 })
  })

  it('other distances: 100 m -> 136, 300 m -> 57', () => {
    const at = (d: number) => beforeAfter(wells, buildPlan(wells, { ...DEFAULTS, maxDistanceM: d }), 'field').aboveAfter
    expect(at(100)).toBe(136)
    expect(at(300)).toBe(57)
  })
})
