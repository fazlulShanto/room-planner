import type { ComponentProps } from 'react'
import { Box, CircleHelp, Footprints, Grid2X2, Maximize, PanelRightOpen } from 'lucide-react'
import LightingControls from '../LightingControls'
import ToolButton from './ToolButton'
import type { EditorView } from './EditorViewport'

type Props = {
  view: EditorView
  onView: (view: EditorView) => void
  hasRooms: boolean
  inspectorOpen: boolean
  onShowDetails: () => void
  lighting: ComponentProps<typeof LightingControls>
  onFit: () => void
  help: boolean
  onHelp: () => void
}

export default function EditorToolbar({
  view,
  onView,
  hasRooms,
  inspectorOpen,
  onShowDetails,
  lighting,
  onFit,
  help,
  onHelp,
}: Props) {
  return (
    <div className="workspace-toolbar">
      <div className="toolbar-left">
        <div className="view-switch" role="group" aria-label="View mode">
          <button
            className={view === '3d' ? 'selected' : ''}
            aria-pressed={view === '3d'}
            onClick={() => onView('3d')}
          >
            <Box size={15} />
            3D view
          </button>
          <button
            className={view === '2d' ? 'selected' : ''}
            aria-pressed={view === '2d'}
            onClick={() => onView('2d')}
          >
            <Grid2X2 size={15} />
            Floor plan
          </button>
          <button
            disabled={!hasRooms}
            title={!hasRooms ? 'Draw a closed room to walk through it' : 'Walk through this floor'}
            className={view === 'walk' ? 'selected' : ''}
            aria-pressed={view === 'walk'}
            onClick={() => onView('walk')}
          >
            <Footprints size={15} /> Walk
          </button>
        </div>
      </div>
      <div className="toolbar-right">
        {!inspectorOpen && (
          <ToolButton label="Show details" onClick={onShowDetails}>
            <PanelRightOpen size={17} />
          </ToolButton>
        )}
        {view !== '2d' && <LightingControls {...lighting} />}
        <ToolButton
          label={view === 'walk' ? 'Restart walk in selected room' : 'Fit view'}
          onClick={onFit}
        >
          <Maximize size={16} />
        </ToolButton>
        <ToolButton label="Show help" active={help} onClick={onHelp}>
          <CircleHelp size={17} />
        </ToolButton>
      </div>
    </div>
  )
}
