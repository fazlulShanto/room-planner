import {
  ChevronDown,
  DoorOpen,
  Grid2X2,
  Hand,
  Layers,
  MousePointer2,
  RotateCw,
  Ruler,
} from 'lucide-react'
import { normalizedAngle, type Item } from '../model'
import type { SceneProps } from '../Scene'
import ToolButton from './ToolButton'

type Props = {
  view: '2d' | '3d'
  tool: SceneProps['tool']
  onTool: (tool: SceneProps['tool']) => void
  item: Item | undefined
  onUpdateItem: (id: string, patch: Partial<Item>) => void
  grid: boolean
  onGrid: () => void
  snap: boolean
  onSnap: () => void
  wallMode: SceneProps['wallMode']
  onWallMode: (mode: SceneProps['wallMode']) => void
  showClearance: boolean
  onClearance: () => void
}

export default function EditorToolDock({
  view,
  tool,
  onTool,
  item,
  onUpdateItem,
  grid,
  onGrid,
  snap,
  onSnap,
  wallMode,
  onWallMode,
  showClearance,
  onClearance,
}: Props) {
  return (
    <div className="canvas-tool-dock">
      <ToolButton
        label="Orbit / select (V)"
        active={tool === 'orbit'}
        onClick={() => onTool('orbit')}
      >
        <MousePointer2 size={18} />
      </ToolButton>
      <button
        className={`icon-button ${tool === 'move' ? 'active' : ''}`}
        title="Hand mode: move furniture, doors and windows; resize furniture with handles (H / M)"
        aria-label="Hand mode (H / M)"
        aria-pressed={tool === 'move'}
        onClick={() => onTool('move')}
      >
        <Hand size={18} />
      </button>
      <span className={`dock-divider ${view === '2d' ? 'dock-divider--compact-hidden' : ''}`} />
      <ToolButton
        label="Rotate selected item 90° (R)"
        onClick={() =>
          item &&
          onUpdateItem(item.id, {
            rotation: normalizedAngle(item.rotation + 90),
          })
        }
        disabled={!item || item.locked}
      >
        <RotateCw size={18} />
      </ToolButton>
      <ToolButton label="Toggle grid" active={grid} onClick={onGrid}>
        <Grid2X2 size={17} />
      </ToolButton>
      <ToolButton label="Snap to one inch" active={snap} onClick={onSnap}>
        <Ruler size={18} />
      </ToolButton>
      {view === '3d' && (
        <>
          <span className="dock-divider dock-divider--compact-hidden" />
          <label className="wall-mode">
            <Layers size={16} />
            <select
              aria-label="Wall display"
              value={wallMode}
              onChange={(e) => onWallMode(e.target.value as typeof wallMode)}
            >
              <option value="cut">Cutaway</option>
              <option value="full">Full walls</option>
              <option value="none">No walls</option>
            </select>
            <ChevronDown size={12} />
          </label>
        </>
      )}
      {view === '2d' && (
        <ToolButton label="Show door swing areas" active={showClearance} onClick={onClearance}>
          <DoorOpen size={18} />
        </ToolButton>
      )}
    </div>
  )
}
