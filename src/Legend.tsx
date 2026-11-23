import { legendGradient, legendPos } from './lib/color.ts'

export default function Legend({ plan = false }: { plan?: boolean }) {
  return (
    <div className="legend">
      <div className="legend-bar-wrap">
        <div className="legend-title">Arsenic reading, µg/L (log scale)</div>
        <div className="legend-bar" style={{ background: legendGradient() }}>
          <span className="tick" style={{ left: `${legendPos(10)}%` }}><i />10 WHO</span>
          <span className="tick" style={{ left: `${legendPos(50)}%` }}><i />50 Bangladesh</span>
        </div>
        <div className="legend-ends"><span>1</span><span>500+</span></div>
      </div>
      <ul className="legend-keys">
        <li><svg width="18" height="18"><circle cx="9" cy="9" r="5" className="dot untested" fill="#fff" /></svg>Not tested</li>
        {plan && <li><svg width="30" height="18"><line x1="2" y1="9" x2="26" y2="9" className="arrow hot" markerEnd="url(#arr)" /></svg>Candidate switch</li>}
        {plan && <li><svg width="30" height="18"><line x1="2" y1="9" x2="26" y2="9" className="arrow warn hot" /></svg>Lower, still above the limit</li>}
        {plan && <li><svg width="20" height="20"><rect x="3" y="3" width="14" height="14" className="noopt" /><circle cx="10" cy="10" r="4.5" fill="#c8452f" className="dot" /></svg>No lower well in range</li>}
        {plan && <li><svg width="22" height="22"><circle cx="11" cy="11" r="9" className="crowd" /><circle cx="11" cy="11" r="4.5" fill="#d6eceb" className="dot" /></svg>Crowded (6 or more sent here)</li>}
      </ul>
    </div>
  )
}
