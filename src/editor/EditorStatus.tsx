import { AlertTriangle, CheckCircle2, ChevronRight, X } from 'lucide-react'
import type { Issue, Plan } from '../model'
import type { SceneProps } from '../Scene'
import type { EditorView } from './EditorViewport'

type Props = {
  plan: Plan
  floorCount: number
  view: EditorView
  tool: SceneProps['tool']
  issues: Issue[]
  showIssues: boolean
  onToggleIssues: () => void
  onCloseIssues: () => void
  onSelectIssue: (id: string) => void
  notice: string
  onDismissNotice: () => void
}

export default function EditorStatus({
  plan,
  floorCount,
  view,
  tool,
  issues,
  showIssues,
  onToggleIssues,
  onCloseIssues,
  onSelectIssue,
  notice,
  onDismissNotice,
}: Props) {
  return (
    <>
      <footer className="app-footer" aria-label="Planner status">
        <span className="footer-brand">
          <span className="footer-dot" />
          CUSTOM HOME PLANNER
        </span>
        <span className="navigation-hint">
          {view === 'walk'
            ? 'WASD / arrows to walk · F door · Esc releases mouse / exits'
            : `${tool === 'move' ? 'Drag furniture to move' : view === '3d' ? 'Drag to orbit · Right-drag to pan' : 'Drag background to pan'} · Scroll to zoom`}
        </span>
        <span className="layout-counts">
          {plan.items.length} items<span className="footer-divider">/</span>
          {plan.openings.filter((o) => o.kind === 'window').length} windows
          <span className="footer-divider">/</span>
          {floorCount} {floorCount === 1 ? 'floor' : 'floors'}
        </span>
        <button
          onClick={onToggleIssues}
          aria-expanded={showIssues}
          aria-controls="placement-notes"
          className={`fit-status ${issues.length ? 'has-issues' : ''}`}
        >
          {issues.length ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
          {issues.length
            ? `${issues.length} placement ${issues.length === 1 ? 'note' : 'notes'}`
            : 'Everything fits'}
        </button>
      </footer>
      {showIssues && (
        <div
          className="issues-popover"
          id="placement-notes"
          role="region"
          aria-label="Placement check"
        >
          <div className="popover-title">
            <strong>Placement check</strong>
            <button onClick={onCloseIssues} aria-label="Close placement notes">
              <X size={15} />
            </button>
          </div>
          {issues.length ? (
            issues.map((issue, i) => (
              <button className="issue-row" key={i} onClick={() => onSelectIssue(issue.itemId)}>
                <AlertTriangle size={14} />
                <span>
                  <strong>{plan.items.find((item) => item.id === issue.itemId)?.name}</strong>
                  {issue.message}
                </span>
                <ChevronRight size={14} />
              </button>
            ))
          ) : (
            <p>
              All items fit inside their rooms, without overlapping furniture, walls, or door swing
              areas.
            </p>
          )}
          <p className="issue-footnote">
            Door checks use the full swing envelope. Stacked items are checked by height.
          </p>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button aria-label="Dismiss message" onClick={onDismissNotice}>
            <X size={15} />
          </button>
        </div>
      )}
    </>
  )
}
