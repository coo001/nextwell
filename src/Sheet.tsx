import MapView from './MapView.tsx'
import { bearingDeg, compass8, WHO_GUIDELINE, type Plan, type Well } from './lib/plan.ts'
import { BN, DEMO_MARK, DIR_BN, DIR_EN, FIELD_CHECK, MT_LABEL, SAFETY_NOTE } from './lib/strings.ts'

interface Props {
  wells: Well[]
  plan: Plan
  wellId: string
  sourceNote: string
}

/** One-page bilingual notice for the users of one well. */
export default function Sheet({ wells, plan, wellId, sourceNote }: Props) {
  const byId = new Map(wells.map((w) => [w.id, w]))
  const well = byId.get(wellId)
  const a = plan.byId.get(wellId)
  if (!well || !a) return null
  const to = a.status === 'switch' ? byId.get(a.useId)! : null
  const dir = to ? compass8(bearingDeg(well, to)) : 0
  const dist = Math.round(a.distanceM / 5) * 5
  const D = plan.options.maxDistanceM
  const name = well.label ?? well.id
  const toName = to ? to.label ?? to.id : ''

  let en: string
  let bn: string
  if (a.status === 'untested') {
    en = 'This well has not been tested. Test it first. An untested well is not a safe well.'
    bn = BN.untested
  } else if (a.status === 'keep') {
    en = `This well reads at or below Bangladesh's limit of 50 \u00b5g/L. No change is suggested.`
    bn = BN.keep
    if (well.field! > WHO_GUIDELINE) {
      en += ' It is above the WHO guideline of 10 \u00b5g/L.'
      bn += ' ' + BN.aboveWho
    }
  } else if (a.status === 'no-option') {
    en = `This well reads above the limit. No shared well within ${D} m reads half or less. Ask about a wider search or another water source.`
    bn = BN.noOption(D)
  } else {
    en = `Candidate well: ${toName}, about ${dist} m in a straight line to the ${DIR_EN[dir]}. It reads ${to!.field} \u00b5g/L; yours reads ${well.field} \u00b5g/L.`
    bn = BN.switchLine(toName, DIR_BN[dir], dist, to!.field!, well.field!)
    if (a.stillAbove) {
      en += ' Lower, still above the limit.'
      bn += ' ' + BN.stillAbove
    }
  }

  return (
    <article className="sheet">
      <div className="watermark" aria-hidden="true">{DEMO_MARK}</div>
      <header>
        <div>
          <h2>Arsenic well notice</h2>
          <p className="bn" lang="bn">{BN.title}</p>
        </div>
        <div className="sheet-tag">{DEMO_MARK}</div>
      </header>

      <div className="sheet-row">
        <div className="sheet-cell">
          <span className="k">Your well / <span lang="bn">{BN.yourWell}</span></span>
          <strong>{name}</strong>
        </div>
        <div className="sheet-cell">
          <span className="k">Field-kit reading / <span lang="bn">{BN.reading}</span></span>
          <strong>{well.field === null ? 'not tested' : `${well.field} \u00b5g/L`}</strong>
        </div>
        {to && (
          <div className="sheet-cell">
            <span className="k">Candidate well / <span lang="bn">{BN.candidate}</span></span>
            <strong>{toName} · {to.field} µg/L</strong>
          </div>
        )}
      </div>

      <p className="sheet-main">{en}</p>
      <p className="sheet-main bn" lang="bn">{bn}</p>

      {to && (
        <div className="sheet-map">
          <MapView wells={wells} plan={plan} selectedId={wellId} onSelect={() => {}} focusIds={[wellId, to.id]} height={360} />
        </div>
      )}

      {a.status !== 'keep' && a.status !== 'untested' && (
        <p className="sheet-check">
          {a.status === 'switch' ? "Before switching: ask the owner's permission and check the real path." : FIELD_CHECK}
          <br />
          <span className="bn" lang="bn">{BN.before}</span>
        </p>
      )}

      <footer>
        <p>{SAFETY_NOTE}</p>
        <p className="bn" lang="bn">{BN.caveat}</p>
        <p className="mt">Bangla text: {MT_LABEL}. {sourceNote}</p>
      </footer>
    </article>
  )
}
