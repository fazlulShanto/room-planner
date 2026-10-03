import { useEffect, useRef, type ReactNode } from 'react'
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  RotateCw,
  LogOut,
  Footprints,
  Crosshair,
  MousePointer2,
} from 'lucide-react'
import { formatDimension } from './model'
import type { WalkLook } from './WalkControls'
import { STILL, type WalkInput } from './walk'

type WalkPadProps = {
  onInput: (input: WalkInput) => void
  onExit: () => void
  eyeHeight: number
  maxHeight: number
  onHeightPreview: (height: number) => void
  onHeightCommit: (height: number) => void
  look: WalkLook
  onMouseLook: () => void
  onDragLook: () => void
}
export default function WalkPad({
  onInput,
  onExit,
  eyeHeight,
  maxHeight,
  onHeightPreview,
  onHeightCommit,
  look,
  onMouseLook,
  onDragLook,
}: WalkPadProps) {
  const pendingHeight = useRef<number | null>(null)
  const finishHeight = () => {
    if (pendingHeight.current !== null) {
      const height = pendingHeight.current
      pendingHeight.current = null
      onHeightCommit(height)
    }
  }
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pressedAt = useRef(0)
  const stop = () => {
    clearTimeout(timer.current)
    onInput(STILL)
  }
  const begin = (value: Partial<WalkInput>) => {
    clearTimeout(timer.current)
    pressedAt.current = performance.now()
    onInput({ ...STILL, ...value })
  }
  const release = () => {
    clearTimeout(timer.current)
    timer.current = setTimeout(
      () => onInput(STILL),
      Math.max(0, 100 - (performance.now() - pressedAt.current)),
    )
  }
  useEffect(() => {
    const clear = () => {
      clearTimeout(timer.current)
      onInput(STILL)
    }
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', clear)
    return () => {
      clearTimeout(timer.current)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', clear)
    }
  }, [onInput])
  const control = (label: string, value: Partial<WalkInput>, icon: ReactNode, key: string) => (
    <button
      className="walk-control"
      aria-label={label}
      title={label}
      type="button"
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        begin(value)
      }}
      onPointerUp={(e) => {
        release()
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId)
      }}
      onPointerCancel={stop}
      onBlur={stop}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          begin(value)
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') release()
      }}
    >
      {icon}
      <span>{key}</span>
    </button>
  )
  return (
    <div className="walk-hud">
      <div className="walk-pad" role="group" aria-label="Walk movement controls">
        {control('Turn left (Q)', { turn: 1 }, <RotateCcw size={16} />, 'Q')}
        {control('Walk forward (W / Up)', { forward: 1 }, <ArrowUp size={18} />, 'W')}
        {control('Turn right (E)', { turn: -1 }, <RotateCw size={16} />, 'E')}
        {control('Step left (A / Left)', { strafe: -1 }, <ArrowLeft size={18} />, 'A')}
        {control('Walk backward (S / Down)', { forward: -1 }, <ArrowDown size={18} />, 'S')}
        {control('Step right (D / Right)', { strafe: 1 }, <ArrowRight size={18} />, 'D')}
      </div>
      <div className="walk-caption" role="group" aria-label="Walking camera controls">
        <details
          className="walk-height-control"
          onToggle={(e) => {
            if (!e.currentTarget.open) finishHeight()
          }}
        >
          <summary aria-label="Adjust camera height" title="Adjust camera height">
            <Footprints size={15} />
            <span>Height</span> <strong>{formatDimension(eyeHeight)}</strong>
          </summary>
          <div className="walk-height-popover">
            <label htmlFor="walk-height">
              Eye height <strong>{formatDimension(eyeHeight)}</strong>
            </label>
            <input
              id="walk-height"
              type="range"
              min={Math.min(24, maxHeight)}
              max={maxHeight}
              step={1}
              value={eyeHeight}
              aria-valuetext={formatDimension(eyeHeight)}
              onChange={(e) => {
                const height = Number(e.target.value)
                pendingHeight.current = height
                onHeightPreview(height)
              }}
              onPointerUp={finishHeight}
              onPointerCancel={finishHeight}
              onKeyUp={finishHeight}
              onBlur={finishHeight}
            />
            <div className="walk-height-presets">
              {(
                [
                  ['Seated', 42],
                  ['Default · 5′5″', 65],
                  ['Tall', 74],
                ] as const
              ).map(([name, height]) => (
                <button
                  key={name}
                  disabled={height > maxHeight}
                  onClick={() => onHeightCommit(height)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        </details>
        <div className="walk-look-modes" role="group" aria-label="Look controls">
          <button
            aria-pressed={look === 'drag'}
            onClick={onDragLook}
            title="Hold and drag to look around"
          >
            <MousePointer2 size={13} />
            Drag look
          </button>
          <button
            aria-pressed={look !== 'drag'}
            onClick={onMouseLook}
            title="Move the mouse to look around. Escape releases the cursor."
          >
            <Crosshair size={13} />
            Mouse look
          </button>
        </div>
        <p className="walk-look-status" role="status">
          {look === 'locked'
            ? 'Mouse captured · Esc releases it'
            : look === 'mouse'
              ? 'Move cursor over the view · Esc stops looking'
              : 'Drag to look, or turn on Mouse look'}
        </p>
      </div>
      <button className="walk-exit" onClick={onExit}>
        <LogOut size={15} /> Exit walk <kbd>Esc</kbd>
      </button>
    </div>
  )
}
