import { useEffect, useMemo, useState } from 'react'
import Legend from './Legend.tsx'
import MapView from './MapView.tsx'
import Sheet from './Sheet.tsx'
import { mandariWells } from './lib/mandari.ts'
import {
  DEFAULTS, bearingDeg, beforeAfter, buildPlan, compass8, kitAgreement, summarize,
  type Assignment, type Well,
} from './lib/plan.ts'
import { load, save, type Dataset, type Saved } from './lib/store.ts'
import { ACKNOWLEDGEMENT, CITATION, DIR_EN, FIELD_CHECK, MT_LABEL, SAFETY_NOTE } from './lib/strings.ts'

type Tab = 'start' | 'wells' | 'plan' | 'sheet' | 'about'
const TABS: [Tab, string][] = [['wells', '1 Wells'], ['plan', '2 Switching plan'], ['sheet', '3 Notice'], ['about', 'About & data']]
const BASE = mandariWells()

const tabFromHash = (): Tab => {
  const h = location.hash.replace('#', '') as Tab
  return ['wells', 'plan', 'sheet', 'about'].includes(h) ? h : 'start'
}
const fmt = (n: number) => Math.round(n).toString()

export default function App() {
  const [saved, setSaved] = useState<Saved>(load)
  const [tab, setTab] = useState<Tab>(tabFromHash)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [D, setD] = useState(DEFAULTS.maxDistanceM)
  const [useLab, setUseLab] = useState(false)

  useEffect(() => save(saved), [saved])
  useEffect(() => {
    const on = () => setTab(tabFromHash())
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  const go = (t: Tab) => { location.hash = t === 'start' ? '' : t; setTab(t) }

  const dataset: Dataset = saved.dataset ?? 'mandari'
  const wells: Well[] = useMemo(
    () => dataset === 'own' ? saved.own : BASE.map((w) => (saved.edits[w.id] ? { ...w, ...saved.edits[w.id] } : w)),
    [dataset, saved.own, saved.edits],
  )
  const edited = dataset === 'mandari' && Object.keys(saved.edits).length > 0
  const options = useMemo(() => ({ ...DEFAULTS, maxDistanceM: D }), [D])
  const plan = useMemo(() => buildPlan(wells, options), [wells, options])
  const summary = useMemo(() => summarize(wells, plan), [wells, plan])
  const hasLab = wells.some((w) => w.lab !== null)
  const measure = useLab && hasLab ? 'lab' : 'field'
  const ba = useMemo(() => beforeAfter(wells, plan, measure), [wells, plan, measure])
  const kit = useMemo(() => kitAgreement(wells), [wells])
  const byId = useMemo(() => new Map(wells.map((w) => [w.id, w])), [wells])
  const selected = selectedId ? byId.get(selectedId) ?? null : null

  const open = (d: Dataset) => { setSaved((s) => ({ ...s, dataset: d })); setSelectedId(null); go('wells') }
  const updateWell = (id: string, patch: { field?: number | null; share?: boolean }) =>
    setSaved((s) => {
      if (dataset === 'own') return { ...s, own: s.own.map((w) => (w.id === id ? { ...w, ...patch } : w)) }
      const base = BASE.find((w) => w.id === id)!
      const cur = s.edits[id] ?? { field: base.field, share: base.share }
      const next = { ...cur, ...patch }
      const edits = { ...s.edits }
      if (next.field === base.field && next.share === base.share) delete edits[id]
      else edits[id] = next
      return { ...s, edits }
    })

  const sourceNote = dataset === 'mandari'
    ? `Source: Mandari Village Survey, sampled November 1999 (BGS and DPHE 2001)${edited ? ', with readings edited in this browser' : ''}. Not current water quality.`
    : 'Source: readings entered in this browser.'

  return (
    <>
      <header className="top no-print">
        <button className="brand" onClick={() => go('start')} aria-label="NextWell start">
          <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#0e5a63" /><path d="M9 20l7-9 7 9" fill="none" stroke="#fff" strokeWidth="3" /></svg>
          NextWell
        </button>
        <nav aria-label="Steps">
          {TABS.map(([t, label]) => (
            <button key={t} className={tab === t ? 'on' : ''} onClick={() => go(t)} aria-current={tab === t ? 'page' : undefined}>{label}</button>
          ))}
        </nav>
        <div className="ds">
          {dataset === 'mandari' ? 'Mandari survey, 1999 (real data)' : `My wells (${wells.length})`}
          {edited && <span className="badge warn">edited</span>}
        </div>
      </header>

      {tab === 'start' && (
        <main className="start">
          <p className="eyebrow">Arsenic in tube wells · Bangladesh · SDG 6.1 and 3.9</p>
          <h1>Not red or green.<br />Which well, how far, how much lower.</h1>
          <p className="lede">
            NextWell takes the field arsenic reading of every tube well in a village and shows each well's users
            the lowest-reading well within walking distance. Then it checks that plan against lab results.
          </p>
          <div className="cta">
            <button className="primary" onClick={() => open('mandari')}>Open Mandari survey (real data, 1999)</button>
            <button onClick={() => open('own')}>Enter my own wells</button>
          </div>
          <ul className="facts">
            <li><strong>236</strong> wells measured in one village (Mandari, Lakshmipur)</li>
            <li><strong>175</strong> read above Bangladesh's 50 µg/L limit</li>
            <li><strong>80</strong> would remain if each well's users walked up to 200 m to a well reading half or less</li>
          </ul>
          <p className="small">
            These are a recalculation on a 1999 survey, not a field result. Counts are wells, not people.
            No account, no server: what you type stays in this browser.
          </p>
          <p className="note">{SAFETY_NOTE}</p>
        </main>
      )}

      {tab === 'wells' && (
        <WellsScreen
          dataset={dataset} wells={wells} edited={edited} selected={selected} hasLab={hasLab}
          onSelect={setSelectedId} onUpdate={updateWell}
          onAdd={(w) => setSaved((s) => ({ ...s, own: [...s.own, w] }))}
          onDelete={(id) => { setSaved((s) => ({ ...s, own: s.own.filter((w) => w.id !== id) })); setSelectedId(null) }}
          onReset={() => setSaved((s) => ({ ...s, edits: {} }))}
          onSwitchDataset={open} onNext={() => go('plan')}
        />
      )}

      {tab === 'plan' && (
        <main className="page">
          <div className="page-head">
            <div>
              <h1>Switching plan</h1>
              <p className="sub">
                For each well above 50 µg/L: the lowest-reading shared well within the walking distance,
                only if it reads half or less. Half, because field kits are imprecise.
              </p>
            </div>
            <div className="controls">
              <label className="slider">
                <span>Walking distance <strong>{D} m</strong></span>
                <input type="range" min={50} max={300} step={10} value={D} onChange={(e) => setD(+e.target.value)} aria-label="Maximum walking distance in metres" />
                <span className="range-ends"><i>50</i><i>300 m</i></span>
              </label>
              <label className={`toggle${hasLab ? '' : ' off'}`}>
                <input type="checkbox" checked={measure === 'lab'} disabled={!hasLab} onChange={(e) => setUseLab(e.target.checked)} />
                <span>Check against lab values{hasLab ? '' : ' (no lab values in this data)'}</span>
              </label>
            </div>
          </div>

          {wells.length === 0 ? (
            <p className="empty">No wells yet. Add wells in step 1.</p>
          ) : (
            <>
              <section className="cards" aria-live="polite">
                <div className="card big">
                  <span className="k">Wells above 50 µg/L · {measure === 'lab' ? 'lab values' : 'field readings'}</span>
                  <div className="ba"><b id="above-before">{ba.aboveBefore}</b><i>→</i><b id="above-after" className="after">{ba.aboveAfter}</b></div>
                  <span className="d">of {ba.measured} measured wells, by the well their users would drink from</span>
                </div>
                <div className="card big">
                  <span className="k">Mean arsenic at the well in use, µg/L</span>
                  <div className="ba"><b>{fmt(ba.meanBefore)}</b><i>→</i><b className="after">{fmt(ba.meanAfter)}</b></div>
                  <span className="d">one value per well, {measure === 'lab' ? 'lab values ("<30" counted as 15)' : 'field readings'}</span>
                </div>
                <div className="card">
                  <span className="k">Candidate switches</span>
                  <div className="one">{summary.switches}</div>
                  <span className="d">into {summary.receivers} {summary.receivers === 1 ? "well" : "wells"} · median walk {fmt(summary.medianWalkM)} m · {summary.stillAbove} lower but still above the limit</span>
                </div>
                <div className="card">
                  <span className="k">No lower well in range</span>
                  <div className="one">{summary.noOption}</div>
                  <span className="d">above the limit with nothing at half or less within {D} m{summary.untested ? ` · ${summary.untested} not tested` : ''}</span>
                </div>
              </section>

              {measure === 'lab' && (
                <p className="labline" id="labline">
                  The plan was built from field-kit readings only. Scored with lab values it never used:{' '}
                  <strong>{summary.labConfirmed} of {summary.labComparable}</strong> switches go to a well that is lower by lab value too.
                  Kit and lab agree on the 50 limit for {kit.agree} of {kit.compared} wells;{' '}
                  {kit.kitSafeLabAbove} wells the kit puts under the limit are above it by lab, {kit.kitAboveLabSafe} the other way round.
                </p>
              )}

              <div className="split">
                <div className="mapcol">
                  <Legend plan />
                  <MapView wells={wells} plan={plan} selectedId={selectedId} onSelect={setSelectedId} measure={measure} zoomable />
                  <p className="note">{SAFETY_NOTE}</p>
                </div>
                <aside className="side">
                  <SelectedPlan well={selected} a={selected ? plan.byId.get(selected.id)! : null} byId={byId} incoming={selected ? plan.incoming.get(selected.id) ?? 0 : 0} D={D} onNotice={() => go('sheet')} />
                  <PlanLists wells={wells} assignments={plan.assignments} byId={byId} crowded={summary.crowded} onSelect={setSelectedId} selectedId={selectedId} />
                  <div className="limits">
                    <h3>Read this with the numbers</h3>
                    <ul>
                      <li>{FIELD_CHECK}</li>
                      {dataset === 'mandari' && <li>The survey is from November 1999. This is not today's water quality, and not a field result: it is these rules applied to that survey.</li>}
                      <li>The unit is a well (the households using it), not a number of people.</li>
                      <li>Distance is a straight line. Coordinates are rounded to about 10 m.</li>
                      <li>A well that receives many users may run short. Crowded wells are ringed.</li>
                    </ul>
                  </div>
                </aside>
              </div>
            </>
          )}
        </main>
      )}

      {tab === 'sheet' && (
        <main className="page sheet-page">
          <div className="page-head no-print">
            <div>
              <h1>Notice for one well</h1>
              <p className="sub">One page for the households using a well, in English and Bangla. Bangla text: {MT_LABEL}.</p>
            </div>
            <div className="controls">
              <label className="pick">
                <span>Well</span>
                <select value={selectedId ?? ''} onChange={(e) => setSelectedId(e.target.value || null)}>
                  <option value="">Choose a well</option>
                  {wells.map((w) => <option key={w.id} value={w.id}>{w.label ?? w.id} · {w.field === null ? 'not tested' : w.field + ' µg/L'}</option>)}
                </select>
              </label>
              <button className="primary" disabled={!selected} onClick={() => print()}>Print this page</button>
            </div>
          </div>
          {selected
            ? <Sheet wells={wells} plan={plan} wellId={selected.id} sourceNote={sourceNote} />
            : <p className="empty no-print">Choose a well above, or tap one on the map in step 1 or 2.</p>}
        </main>
      )}

      {tab === 'about' && (
        <main className="page about">
          <h1>About and data</h1>
          <section>
            <h2>The rules, exactly</h2>
            <ol>
              <li>Only users of a well reading above 50 µg/L (Bangladesh's limit) get a candidate. Wells at or below 50 stay as they are.</li>
              <li>A candidate must be within the walking distance (straight line, 50 to 300 m, default 200 m), shared by its owner, and read at most half of your well's reading.</li>
              <li>Among candidates the lowest reading wins; ties go to the nearer well, then to the earlier ID.</li>
              <li>If there is no candidate, the well is listed as "no lower well in range". An untested well is neither a source nor a candidate: it is listed as "test first".</li>
            </ol>
            <p>The plan is always built from field-kit readings. The lab check scores that same plan with laboratory values; a lab result reported as "&lt;30" is counted as 15.</p>
          </section>
          <section>
            <h2>Data</h2>
            <p>
              The built-in village is the Mandari Village Survey (Lakshmipur district): 236 tube wells sampled from 22 November 1999,
              with coordinates, a field-kit arsenic reading and a laboratory arsenic value for each well. Only those columns are included here, as processed JSON.
            </p>
            <blockquote>{CITATION}</blockquote>
            <p className="small">{ACKNOWLEDGEMENT}</p>
          </section>
          <section>
            <h2>Limits</h2>
            <ul>
              <li>The survey is 27 years old. Nothing here describes a well as it is today.</li>
              <li>The numbers are a recalculation, not an outcome measured in a village. Nobody in Mandari has used this tool.</li>
              <li>Counts are wells, not people. The survey has no household or population figures.</li>
              <li>Straight-line distance ignores paths, water bodies and whether an owner allows access.</li>
              <li>Bangla text is machine-translated and has not been reviewed by a native speaker. The notice is a demo and carries a watermark.</li>
              <li>The 0.5 ratio and the 200 m default are design choices, not validated thresholds.</li>
            </ul>
          </section>
          <section>
            <h2>Privacy and AI use</h2>
            <p>No account, no server, no analytics, no external API. Wells you enter are stored only in this browser's local storage.</p>
            <p>AI coding assistance was used to write this app. The calculation rules are fixed in code and covered by unit tests; no AI model runs in the app.</p>
          </section>
          <p className="note">{SAFETY_NOTE}</p>
        </main>
      )}
    </>
  )
}

/* ---------- Wells screen ---------- */

interface WellsProps {
  dataset: Dataset
  wells: Well[]
  edited: boolean
  selected: Well | null
  hasLab: boolean
  onSelect: (id: string | null) => void
  onUpdate: (id: string, patch: { field?: number | null; share?: boolean }) => void
  onAdd: (w: Well) => void
  onDelete: (id: string) => void
  onReset: () => void
  onSwitchDataset: (d: Dataset) => void
  onNext: () => void
}

function WellsScreen(p: WellsProps) {
  const [sort, setSort] = useState<'id' | 'high'>('id')
  const rows = useMemo(() => {
    if (sort === 'id') return p.wells
    return [...p.wells].sort((a, b) => (b.field ?? -1) - (a.field ?? -1))
  }, [p.wells, sort])
  const tested = p.wells.filter((w) => w.field !== null)
  const above = tested.filter((w) => w.field! > 50).length
  const aboveWho = tested.filter((w) => w.field! > 10).length

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>{p.dataset === 'mandari' ? 'Mandari village, 236 tube wells' : 'My wells'}</h1>
          <p className="sub">
            {p.dataset === 'mandari'
              ? 'Each dot is a well at its surveyed coordinates (November 1999). There is no background map: only the wells and a 200 m grid.'
              : 'Add each well with its position and field-kit reading. Leave the reading empty for a well that has not been tested.'}
          </p>
        </div>
        <div className="controls">
          <div className="mini">
            <span><b>{p.wells.length}</b> wells</span>
            <span><b>{above}</b> above 50</span>
            <span><b>{aboveWho}</b> above 10</span>
            <span><b>{p.wells.length - tested.length}</b> not tested</span>
          </div>
          <button className="primary" onClick={p.onNext} disabled={p.wells.length === 0}>Make the switching plan →</button>
        </div>
      </div>

      {p.edited && (
        <p className="banner">
          You changed readings or sharing for this survey. Numbers no longer match the 1999 data.{' '}
          <button className="link" onClick={p.onReset}>Reset to survey data</button>
        </p>
      )}

      <div className="split">
        <div className="mapcol">
          <Legend />
          <MapView wells={p.wells} selectedId={p.selected?.id ?? null} onSelect={p.onSelect} zoomable />
          <p className="note">{SAFETY_NOTE}</p>
        </div>
        <aside className="side">
          {p.selected && (
            <WellEditor key={p.selected.id} well={p.selected} canDelete={p.dataset === 'own'} onUpdate={p.onUpdate} onDelete={p.onDelete} />
          )}
          {p.dataset === 'own' && <AddWell existing={p.wells} onAdd={p.onAdd} />}
          <div className="tablebox">
            <div className="tablehead">
              <h3>Wells</h3>
              <div className="seg" role="group" aria-label="Sort">
                <button className={sort === 'id' ? 'on' : ''} onClick={() => setSort('id')}>By ID</button>
                <button className={sort === 'high' ? 'on' : ''} onClick={() => setSort('high')}>Highest first</button>
              </div>
            </div>
            <div className="scroll">
              <table>
                <thead>
                  <tr><th>Well</th><th className="num">Field µg/L</th>{p.hasLab && <th className="num">Lab µg/L</th>}<th>Shared</th></tr>
                </thead>
                <tbody>
                  {rows.map((w) => (
                    <tr key={w.id} className={p.selected?.id === w.id ? 'sel' : ''} onClick={() => p.onSelect(w.id)}>
                      <td>{w.label ?? w.id}</td>
                      <td className="num">{w.field === null ? <em>not tested</em> : w.field}</td>
                      {p.hasLab && <td className="num">{w.lab === null ? '' : w.labBelowDetection ? '<30' : w.lab}</td>}
                      <td>
                        <input type="checkbox" checked={w.share} aria-label={`Owner of ${w.id} agrees to share`}
                          onClick={(e) => e.stopPropagation()} onChange={(e) => p.onUpdate(w.id, { share: e.target.checked })} />
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && <tr><td colSpan={4} className="none">No wells yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <p className="small">
            {p.dataset === 'mandari'
              ? <>Want to try your own village? <button className="link" onClick={() => p.onSwitchDataset('own')}>Enter my own wells</button></>
              : <>Just looking? <button className="link" onClick={() => p.onSwitchDataset('mandari')}>Open the Mandari survey</button></>}
          </p>
        </aside>
      </div>
    </main>
  )
}

function WellEditor({ well, canDelete, onUpdate, onDelete }: { well: Well; canDelete: boolean; onUpdate: WellsProps['onUpdate']; onDelete: (id: string) => void }) {
  const [text, setText] = useState(well.field === null ? '' : String(well.field))
  const commit = (t: string) => {
    setText(t)
    if (t.trim() === '') return onUpdate(well.id, { field: null })
    const v = Number(t)
    if (Number.isFinite(v) && v >= 0 && v <= 5000) onUpdate(well.id, { field: v })
  }
  return (
    <div className="panel">
      <h3>{well.label ?? well.id}</h3>
      <p className="small">
        {well.lat.toFixed(4)}, {well.lon.toFixed(4)}
        {well.depthM != null && <> · depth {well.depthM} m</>}
        {well.lab !== null && <> · lab {well.labBelowDetection ? '<30' : well.lab} µg/L</>}
      </p>
      <div className="formrow">
        <label>Field reading, µg/L
          <input inputMode="decimal" value={text} placeholder="not tested" onChange={(e) => commit(e.target.value)} />
        </label>
        <label className="check">
          <input type="checkbox" checked={well.share} onChange={(e) => onUpdate(well.id, { share: e.target.checked })} />
          Owner agrees to share
        </label>
      </div>
      {canDelete && <button className="link danger" onClick={() => onDelete(well.id)}>Remove this well</button>}
    </div>
  )
}

function AddWell({ existing, onAdd }: { existing: Well[]; onAdd: (w: Well) => void }) {
  const [f, setF] = useState({ label: '', lat: '', lon: '', field: '', share: true })
  const [msg, setMsg] = useState('')
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }))
  const locate = () => {
    if (!navigator.geolocation) return setMsg('This browser cannot read a location. Type the coordinates.')
    setMsg('Reading this device\'s location...')
    navigator.geolocation.getCurrentPosition(
      (pos) => { setF((x) => ({ ...x, lat: pos.coords.latitude.toFixed(5), lon: pos.coords.longitude.toFixed(5) })); setMsg(`Location read (about ${Math.round(pos.coords.accuracy)} m accuracy).`) },
      () => setMsg('Location not available. Type the coordinates.'),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const lat = Number(f.lat)
    const lon = Number(f.lon)
    if (f.lat.trim() === '' || f.lon.trim() === '' || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return setMsg('Enter latitude (-90 to 90) and longitude (-180 to 180) in decimal degrees.')
    }
    const field = f.field.trim() === '' ? null : Number(f.field)
    if (field !== null && (!Number.isFinite(field) || field < 0 || field > 5000)) return setMsg('Reading must be a number in µg/L, or empty if not tested.')
    let n = existing.length + 1
    let id = `W${String(n).padStart(2, '0')}`
    while (existing.some((w) => w.id === id)) id = `W${String(++n).padStart(2, '0')}`
    onAdd({ id, label: f.label.trim() || undefined, lat, lon, field, lab: null, share: f.share })
    setF({ label: '', lat: '', lon: '', field: '', share: true })
    setMsg(`Added ${f.label.trim() || id}.`)
  }
  return (
    <form className="panel" onSubmit={submit}>
      <h3>Add a well</h3>
      <div className="formgrid">
        <label className="wide">Name or owner mark (optional)
          <input value={f.label} onChange={(e) => set('label', e.target.value)} maxLength={24} />
        </label>
        <label>Latitude
          <input inputMode="decimal" value={f.lat} onChange={(e) => set('lat', e.target.value)} placeholder="22.9221" />
        </label>
        <label>Longitude
          <input inputMode="decimal" value={f.lon} onChange={(e) => set('lon', e.target.value)} placeholder="90.9030" />
        </label>
        <label>Field reading, µg/L
          <input inputMode="decimal" value={f.field} onChange={(e) => set('field', e.target.value)} placeholder="empty = not tested" />
        </label>
        <label className="check">
          <input type="checkbox" checked={f.share} onChange={(e) => set('share', e.target.checked)} />
          Owner agrees to share
        </label>
      </div>
      <div className="formactions">
        <button type="button" onClick={locate}>Use this device's location</button>
        <button className="primary" type="submit">Add well</button>
      </div>
      {msg && <p className="small" role="status">{msg}</p>}
    </form>
  )
}

/* ---------- Plan side panels ---------- */

function SelectedPlan({ well, a, byId, incoming, D, onNotice }: { well: Well | null; a: Assignment | null; byId: Map<string, Well>; incoming: number; D: number; onNotice: () => void }) {
  if (!well || !a) {
    return <div className="panel hint"><h3>Tap a well</h3><p className="small">See where its users could go, how far, and how much lower the reading is.</p></div>
  }
  const to = a.status === 'switch' ? byId.get(a.useId)! : null
  return (
    <div className="panel" id="selected-plan">
      <h3>{well.label ?? well.id} <span className="reading">{well.field === null ? 'not tested' : `${well.field} µg/L`}</span></h3>
      {a.status === 'keep' && <p>At or below the 50 µg/L limit. Stays as it is.{well.field! > 10 ? ' Above the WHO guideline of 10 µg/L.' : ''}</p>}
      {a.status === 'untested' && <p>Not tested. Test first: it is neither sent anywhere nor offered to anyone.</p>}
      {a.status === 'no-option' && <p>Above the limit, and no shared well within {D} m reads half or less. NextWell does not guess: this needs a wider search or another source.</p>}
      {to && (
        <p>
          Candidate: <strong>{to.label ?? to.id}</strong>, {fmt(a.distanceM)} m to the {DIR_EN[compass8(bearingDeg(well, to))]}, reads{' '}
          <strong>{to.field} µg/L</strong>.{' '}
          {a.stillAbove && <span className="badge warn">lower, still above the limit</span>}
          {well.lab !== null && to.lab !== null && <span className="labpair"> Lab: {well.labBelowDetection ? '<30' : well.lab} → {to.labBelowDetection ? '<30' : to.lab} µg/L.</span>}
        </p>
      )}
      {incoming > 0 && <p className="small">{incoming} other well{incoming > 1 ? 's are' : ' is'} sent here.{incoming >= 6 ? ' Crowded: check that it can serve this many households.' : ''}</p>}
      <button onClick={onNotice}>Open the notice for this well</button>
    </div>
  )
}

type ListKey = 'switch' | 'no-option' | 'crowded' | 'untested'

function PlanLists({ wells, assignments, byId, crowded, onSelect, selectedId }: {
  wells: Well[]; assignments: Assignment[]; byId: Map<string, Well>; crowded: { id: string; count: number }[]; onSelect: (id: string) => void; selectedId: string | null
}) {
  const [key, setKey] = useState<ListKey>('switch')
  const sw = assignments.filter((a) => a.status === 'switch')
  const no = assignments.filter((a) => a.status === 'no-option')
  const un = assignments.filter((a) => a.status === 'untested')
  const name = (id: string) => byId.get(id)?.label ?? id
  const tabs: [ListKey, string, number][] = [['switch', 'Switches', sw.length], ['no-option', 'No lower well', no.length], ['crowded', 'Crowded', crowded.length], ['untested', 'Test first', un.length]]
  return (
    <div className="tablebox">
      <div className="seg wide" role="group" aria-label="Lists">
        {tabs.map(([k, label, n]) => <button key={k} className={key === k ? 'on' : ''} onClick={() => setKey(k)}>{label} <b>{n}</b></button>)}
      </div>
      <div className="scroll short">
        <table>
          {key === 'switch' && (
            <>
              <thead><tr><th>From</th><th className="num">µg/L</th><th>To</th><th className="num">µg/L</th><th className="num">m</th></tr></thead>
              <tbody>
                {sw.map((a) => (
                  <tr key={a.wellId} className={selectedId === a.wellId ? 'sel' : ''} onClick={() => onSelect(a.wellId)}>
                    <td>{name(a.wellId)}</td><td className="num">{byId.get(a.wellId)!.field}</td>
                    <td>{name(a.useId)}</td><td className={`num${a.stillAbove ? ' warn' : ''}`}>{byId.get(a.useId)!.field}</td>
                    <td className="num">{fmt(a.distanceM)}</td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
          {key === 'no-option' && (
            <>
              <thead><tr><th>Well</th><th className="num">µg/L</th></tr></thead>
              <tbody>{no.map((a) => <tr key={a.wellId} className={selectedId === a.wellId ? 'sel' : ''} onClick={() => onSelect(a.wellId)}><td>{name(a.wellId)}</td><td className="num">{byId.get(a.wellId)!.field}</td></tr>)}</tbody>
            </>
          )}
          {key === 'crowded' && (
            <>
              <thead><tr><th>Receiving well</th><th className="num">µg/L</th><th className="num">Wells sent here</th></tr></thead>
              <tbody>{crowded.map((c) => <tr key={c.id} className={selectedId === c.id ? 'sel' : ''} onClick={() => onSelect(c.id)}><td>{name(c.id)}</td><td className="num">{byId.get(c.id)!.field}</td><td className="num">{c.count}</td></tr>)}</tbody>
            </>
          )}
          {key === 'untested' && (
            <>
              <thead><tr><th>Well</th><th>Status</th></tr></thead>
              <tbody>{un.map((a) => <tr key={a.wellId} onClick={() => onSelect(a.wellId)}><td>{name(a.wellId)}</td><td>test first</td></tr>)}</tbody>
            </>
          )}
        </table>
        {((key === 'switch' && !sw.length) || (key === 'no-option' && !no.length) || (key === 'crowded' && !crowded.length) || (key === 'untested' && !un.length)) && (
          <p className="none">None{wells.length ? '' : ': no wells yet'}.</p>
        )}
      </div>
    </div>
  )
}
