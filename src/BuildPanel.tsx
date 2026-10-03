import { useEffect, useState } from 'react'
import {
  DoorOpen,
  AppWindow,
  MousePointer2,
  PencilRuler,
  RectangleHorizontal,
  Trash2,
} from 'lucide-react'
import {
  formatDimension,
  roomType,
  wallLength,
  type Plan,
  type Point,
  type Room,
  type Wall,
} from './model'
export type DrawingTool = 'select' | 'wall' | 'rectangle' | 'door' | 'window' | 'passage'
export type DrawingProps = {
  tool: DrawingTool
  thickness: number
  width: number
  onDraw: (segments: [Point, Point][]) => void
  onOpening: (wall: Wall, point: Point, kind: 'door' | 'window' | 'passage') => void
  onCancel: () => void
}
export function BuildNumber({
  label,
  value,
  onChange,
  min = -4900,
  max = 4900,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
}) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(Number(value.toFixed(3)))), [value])
  return (
    <label className="build-field">
      {label}
      <input
        aria-label={label}
        type="number"
        value={draft}
        min={min}
        max={max}
        step="1"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const n = Number(draft)
          if (draft && Number.isFinite(n) && n >= min && n <= max && n !== value) onChange(n)
          setDraft(String(value))
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') setDraft(String(value))
        }}
      />
    </label>
  )
}
export default function BuildPanel({
  plan,
  drawing,
  onTool,
  onThickness,
  onWidth,
  onQuickRoom,
  onSelect,
}: {
  plan: Plan
  drawing: DrawingProps
  onTool: (tool: DrawingTool) => void
  onThickness: (n: number) => void
  onWidth: (n: number) => void
  onQuickRoom: (width: number, depth: number) => void
  onSelect: (id: string) => void
}) {
  const [width, setWidth] = useState(144),
    [depth, setDepth] = useState(120)
  return (
    <div className="build-panel">
      <h2>Build your floor</h2>
      <div className="build-tools" role="group" aria-label="Building tools">
        {(
          [
            ['select', 'Select', MousePointer2],
            ['wall', 'Draw walls', PencilRuler],
            ['rectangle', 'Draw room', RectangleHorizontal],
            ['door', 'Place door', DoorOpen],
            ['window', 'Place window', AppWindow],
            ['passage', 'Open passage', DoorOpen],
          ] as const
        ).map(([tool, label, Icon]) => (
          <button key={tool} aria-pressed={drawing.tool === tool} onClick={() => onTool(tool)}>
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      <p className="build-help">
        {drawing.tool === 'wall'
          ? 'Click wall endpoints to draw a connected path. Close the loop to create a room. Shift snaps to 45°. Esc finishes.'
          : drawing.tool === 'rectangle'
            ? 'Click two opposite corners, or drag a rectangle, to create a room and its four walls.'
            : ['door', 'window', 'passage'].includes(drawing.tool)
              ? 'Click a wall to place the opening, then edit its exact size, hinge, or position.'
              : 'Select a wall or room in the plan to edit it. Drag empty space to pan; scroll to zoom.'}
      </p>
      <BuildNumber
        label="Wall thickness (in)"
        value={drawing.thickness}
        onChange={onThickness}
        min={0.25}
        max={120}
      />
      {['door', 'window', 'passage'].includes(drawing.tool) && (
        <BuildNumber
          label="Opening width (in)"
          value={drawing.width}
          onChange={onWidth}
          min={1}
          max={1200}
        />
      )}
      <details className="quick-room" open={!plan.rooms.length}>
        <summary>Room with exact dimensions</summary>
        <p className="build-help">Clear interior dimensions, in inches.</p>
        <div className="build-field-row">
          <BuildNumber
            label="Room width (in)"
            value={width}
            onChange={setWidth}
            min={12}
            max={2400}
          />
          <BuildNumber
            label="Room depth (in)"
            value={depth}
            onChange={setDepth}
            min={12}
            max={2400}
          />
        </div>
        <button className="primary-button full-width" onClick={() => onQuickRoom(width, depth)}>
          Add room
        </button>
      </details>
      <h3>Rooms · {plan.rooms.length}</h3>
      {plan.rooms.map((room) => (
        <button className="build-room" key={room.id} onClick={() => onSelect(room.id)}>
          <strong>{room.name}</strong>
          <span>
            {formatDimension(room.width)} × {formatDimension(room.depth)}
          </span>
        </button>
      ))}
      {!plan.rooms.length && (
        <p className="build-help">
          Enclosed walls become rooms automatically. You can furnish and walk through them once
          closed.
        </p>
      )}
      <h3>Walls · {plan.walls.length}</h3>
      {plan.walls.map((wall, i) => (
        <button className="build-room" key={wall.id} onClick={() => onSelect(wall.id)}>
          <strong>Wall {i + 1}</strong>
          <span>{formatDimension(wallLength(wall))}</span>
        </button>
      ))}
    </div>
  )
}
export function BuildingInspector({
  wall,
  room,
  onWall,
  onRoom,
  onDelete,
}: {
  wall?: Wall
  room?: Room
  onWall: (patch: Partial<Wall>) => void
  onRoom: (patch: Partial<Room>) => void
  onDelete: () => void
}) {
  if (wall)
    return (
      <div className="inspector-content build-inspector">
        <h2>Wall</h2>
        <p className="build-help">
          Move endpoints or set thickness. Joined wall endpoints follow. Positions and dimensions
          are in inches.
        </p>
        <strong className="build-measure">{formatDimension(wallLength(wall))} long</strong>
        <BuildNumber
          label="Wall length (in)"
          value={wallLength(wall)}
          min={6}
          max={5000}
          onChange={(length) => {
            const scale = length / wallLength(wall)
            onWall({
              to: [
                wall.from[0] + (wall.to[0] - wall.from[0]) * scale,
                wall.from[1] + (wall.to[1] - wall.from[1]) * scale,
              ],
            })
          }}
        />
        <div className="build-field-row">
          {(['from', 'to'] as const).map((end, i) => (
            <div key={end}>
              <BuildNumber
                label={`Wall ${i ? 'end' : 'start'} X (in)`}
                value={wall[end][0]}
                onChange={(n) => onWall({ [end]: [n, wall[end][1]] })}
              />
              <BuildNumber
                label={`Wall ${i ? 'end' : 'start'} Z (in)`}
                value={wall[end][1]}
                onChange={(n) => onWall({ [end]: [wall[end][0], n] })}
              />
            </div>
          ))}
        </div>
        <BuildNumber
          label="Selected wall thickness (in)"
          value={wall.thickness}
          onChange={(thickness) => onWall({ thickness })}
          min={0.25}
          max={120}
        />
        <p className="build-help">
          Removing this wall also removes its doors and windows. Undo restores them.
        </p>
        <button className="outline-button full-width" onClick={onDelete}>
          <Trash2 size={15} />
          Remove wall
        </button>
      </div>
    )
  if (room)
    return (
      <div className="inspector-content build-inspector">
        <h2>Room</h2>
        <label className="build-field">
          Room name
          <input
            aria-label="Room name"
            key={room.id + room.name}
            defaultValue={room.name}
            maxLength={120}
            onBlur={(e) => {
              if (e.target.value.trim()) onRoom({ name: e.target.value.trim() })
            }}
          />
        </label>
        <label className="build-field">
          Room type
          <select
            aria-label="Room type"
            value={roomType(room)}
            onChange={(e) => onRoom({ type: e.target.value as Room['type'] })}
          >
            <option value="room">Room</option>
            <option value="kitchen">Kitchen</option>
            <option value="bathroom">Washroom</option>
            <option value="corridor">Corridor</option>
          </select>
        </label>
        <p className="build-help">
          {formatDimension(room.width)} × {formatDimension(room.depth)} interior bounds. Select a
          surrounding wall to change the room’s shape or size.
        </p>
      </div>
    )
  return null
}
