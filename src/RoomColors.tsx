import { useEffect, useRef, useState } from 'react'
import { Check, Footprints, RotateCcw } from 'lucide-react'
import { finishRooms, sharedFinish } from './finishes'
import type { Plan, RoomFinishes } from './model'

const PALETTE = [
  ['White', '#ffffff'],
  ['Warm white', '#f1eee6'],
  ['Ivory', '#e4dfd4'],
  ['Stone', '#eeeae2'],
  ['Sage', '#c8d3c0'],
  ['Blue', '#c4d6df'],
  ['Sand', '#d5c1a7'],
  ['Clay', '#c6a28b'],
]
function ColorControl({
  surface,
  value,
  onChange,
}: {
  surface: keyof RoomFinishes
  value?: string
  onChange: (color: string) => void
}) {
  const title = surface[0].toUpperCase() + surface.slice(1)
  const [draft, setDraft] = useState(value ?? ''),
    [invalid, setInvalid] = useState(false)
  const cancel = useRef(false)
  useEffect(() => {
    setDraft(value ?? '')
    setInvalid(false)
  }, [value])
  function choose(color: string) {
    setDraft(color)
    setInvalid(false)
    onChange(color)
  }
  function commit() {
    if (cancel.current) {
      cancel.current = false
      return
    }
    if (!draft && value === undefined) return
    const color = draft.startsWith('#') ? draft.trim() : `#${draft.trim()}`
    if (!/^#[0-9a-f]{6}$/i.test(color)) {
      setInvalid(true)
      return
    }
    choose(color.toLowerCase())
  }
  return (
    <section className="surface-color-control">
      <h3>{title} color</h3>
      <div className={`surface-color-input ${invalid ? 'invalid' : ''}`}>
        <label
          className={`surface-color-picker ${value ? '' : 'mixed'}`}
          title={`Choose ${surface} color`}
        >
          <input
            type="color"
            aria-label={`Choose ${surface} color`}
            value={value ?? '#ffffff'}
            onChange={(e) => choose(e.target.value)}
          />
        </label>
        <input
          aria-label={`${title} color hex`}
          aria-invalid={invalid}
          value={draft}
          placeholder="Mixed"
          maxLength={7}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              cancel.current = true
              setDraft(value ?? '')
              setInvalid(false)
              e.currentTarget.blur()
            }
          }}
        />
      </div>
      {invalid && <p className="color-input-error">Use a six-digit color, like #c8d3c0.</p>}
      <div className="surface-palette" role="group" aria-label={`${title} color presets`}>
        {PALETTE.map(([name, color]) => (
          <button
            key={color}
            title={name}
            aria-label={`${title} color: ${name}`}
            aria-pressed={value === color}
            style={{ background: color }}
            onClick={() => choose(color)}
          >
            {value === color && <Check size={12} />}
          </button>
        ))}
      </div>
    </section>
  )
}
export default function RoomColors({
  plan,
  roomId,
  onChange,
  onReset,
  onWalk,
}: {
  plan: Plan
  roomId: string
  onChange: (surface: keyof RoomFinishes, color: string) => void
  onReset: () => void
  onWalk: () => void
}) {
  const rooms = finishRooms(plan, roomId)
  return (
    <div className="room-colors">
      <h2>Room colors</h2>
      <p className="small-description">
        {roomId === 'all'
          ? 'Apply to the kitchen, bedrooms, and corridor.'
          : `Choose finishes for ${rooms[0]?.name ?? 'this room'}.`}{' '}
        Select a room above to color it individually.
      </p>
      {(['wall', 'ceiling', 'floor'] as const).map((surface) => (
        <ColorControl
          key={`${roomId}-${surface}`}
          surface={surface}
          value={sharedFinish(plan, roomId, surface)}
          onChange={(color) => onChange(surface, color)}
        />
      ))}
      <p className="field-help">
        Washroom finishes stay as they are. Mixed means the selected rooms have different colors.
        Floor textures stay visible.
      </p>
      <button className="outline-button full-width color-walk-button" onClick={onWalk}>
        <Footprints size={14} /> See ceiling in Walk mode
      </button>
      <button className="quiet-button full-width" onClick={onReset}>
        <RotateCcw size={13} /> Reset these colors
      </button>
    </div>
  )
}
