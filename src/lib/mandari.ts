import raw from '../data/mandari_wells.json'
import type { Well } from './plan.ts'

interface RawWell {
  id: string
  lat: number
  lon: number
  depth_m: number | null
  field_ugL: number | null
  lab_ugL: number | null
  lab_below_detection: boolean
}

/** Mandari Village Survey (BGS and DPHE, sampled November 1999), 236 tube wells. */
export function mandariWells(): Well[] {
  return (raw as RawWell[]).map((r) => ({
    id: r.id,
    lat: r.lat,
    lon: r.lon,
    field: r.field_ugL,
    lab: r.lab_ugL,
    labBelowDetection: r.lab_below_detection,
    depthM: r.depth_m,
    share: true,
  }))
}
