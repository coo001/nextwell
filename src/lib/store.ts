import type { Well } from './plan.ts'

// Everything the user types stays in this browser (localStorage). Nothing is sent anywhere.
export type Dataset = 'mandari' | 'own'
export interface Edit { field: number | null; share: boolean }
export interface Saved {
  dataset: Dataset | null
  own: Well[]
  edits: Record<string, Edit>
}

const KEY = 'nextwell.v1'
const EMPTY: Saved = { dataset: null, own: [], edits: {} }

export function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const s = JSON.parse(raw) as Partial<Saved>
    return { dataset: s.dataset ?? null, own: Array.isArray(s.own) ? s.own : [], edits: s.edits ?? {} }
  } catch {
    return EMPTY
  }
}

export function save(s: Saved): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // Private mode or full storage: the app still works for this session.
  }
}
