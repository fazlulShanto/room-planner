import { useEffect, useRef, useState } from 'react'
import { Moon, Sun, X } from 'lucide-react'
import type { LightingSettings } from './model'
import { formatTime, lightingAt, parseTime } from './lighting'

type Props = {
  value: LightingSettings
  onPreview: (value: LightingSettings) => void
  onCommit: (value: LightingSettings) => void
}

function TimeField({ hour, onChange }: { hour: number; onChange: (hour: number) => void }) {
  const [draft, setDraft] = useState(formatTime(hour))
  const [invalid, setInvalid] = useState(false)
  const cancelBlur = useRef(false)
  useEffect(() => {
    setDraft(formatTime(hour))
    setInvalid(false)
  }, [hour])
  return (
    <div className="lighting-time-field">
      <input
        type="text"
        inputMode="numeric"
        aria-label="Lighting time"
        aria-invalid={invalid}
        aria-describedby={invalid ? 'lighting-time-error' : undefined}
        placeholder="HH:MM"
        maxLength={5}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          setInvalid(false)
        }}
        onBlur={() => {
          if (cancelBlur.current) {
            cancelBlur.current = false
            return
          }
          const next = parseTime(draft)
          setInvalid(next === null)
          if (next !== null) {
            setDraft(formatTime(next))
            onChange(next)
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            cancelBlur.current = true
            setDraft(formatTime(hour))
            setInvalid(false)
            e.currentTarget.blur()
          }
        }}
      />
      {invalid && <span id="lighting-time-error">Use 00:00–23:59</span>}
    </div>
  )
}

export default function LightingControls({ value, onPreview, onCommit }: Props) {
  const details = useRef<HTMLDetailsElement>(null)
  const pending = useRef<LightingSettings | null>(null)
  const night = lightingAt(value).night
  const Icon = night ? Moon : Sun
  function finish() {
    if (!pending.current) return
    const next = pending.current
    pending.current = null
    onCommit(next)
  }
  function close() {
    finish()
    if (details.current) {
      details.current.open = false
      details.current.querySelector('summary')?.focus()
    }
  }
  return (
    <details
      ref={details}
      className="lighting-controls"
      onToggle={() => {
        if (!details.current?.open) finish()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          close()
        }
      }}
    >
      <summary aria-label="Lighting settings" title="Time of day and shadows">
        <Icon size={16} />
        <span>{formatTime(value.hour)}</span>
      </summary>
      <section className="lighting-popover" aria-label="Time of day and shadows">
        <div className="lighting-heading">
          <h2>Lighting</h2>
          <button type="button" aria-label="Close lighting settings" onClick={close}>
            <X size={15} />
          </button>
        </div>
        <div className="lighting-clock">
          <span>
            <Icon size={19} />
            {night ? 'Night · electric lights' : 'Day · sunlight'}
          </span>
          <TimeField hour={value.hour} onChange={(hour) => onCommit({ ...value, hour })} />
        </div>
        <label className="lighting-range-label" htmlFor="lighting-time">
          Time of day
        </label>
        <input
          id="lighting-time"
          className="lighting-range"
          type="range"
          min={0}
          max={24}
          step={0.25}
          value={value.hour}
          aria-valuetext={`${formatTime(value.hour)}, ${night ? 'night, electric lights' : 'daylight'}`}
          onChange={(e) => {
            const next = { ...value, hour: Number(e.target.value) }
            pending.current = next
            onPreview(next)
          }}
          onPointerUp={finish}
          onPointerCancel={finish}
          onKeyUp={finish}
          onBlur={finish}
        />
        <div className="lighting-ticks" aria-hidden="true">
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>24</span>
        </div>
        <div className="lighting-presets">
          {(
            [
              ['Morning', 8],
              ['Noon', 12],
              ['Evening', 18],
              ['Night', 21],
            ] as const
          ).map(([label, hour]) => (
            <button
              key={label}
              type="button"
              aria-pressed={value.hour === hour}
              onClick={() => onCommit({ ...value, hour })}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="lighting-shadow-toggle">
          <span>
            Sun shadows
            <small>{night ? 'Off at night automatically' : 'Show shadows during daylight'}</small>
          </span>
          <input
            type="checkbox"
            role="switch"
            aria-label="Sun shadows"
            checked={!night && value.shadows}
            disabled={night}
            onChange={(e) => onCommit({ ...value, shadows: e.target.checked })}
          />
        </label>
        <p>
          19:00–05:00 uses electric lighting with no shadows. Daytime sun direction is a visual
          approximation.
        </p>
      </section>
    </details>
  )
}
