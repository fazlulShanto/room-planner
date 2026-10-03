import { useEffect, useRef, useState } from 'react'
import { round, type Unit } from '../model'

export function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 1200,
  step = 1,
  suffix,
  disabled = false,
}: {
  label: string
  value: number
  onChange: (n: number) => boolean | void
  min?: number
  max?: number
  step?: number
  suffix?: string
  disabled?: boolean
}) {
  const [draft, setDraft] = useState(String(round(value, 3))),
    [invalid, setInvalid] = useState(false)
  useEffect(() => {
    setDraft(String(round(value, 3)))
    setInvalid(false)
  }, [value])
  const cancelBlur = useRef(false)
  function commit() {
    if (cancelBlur.current) {
      cancelBlur.current = false
      return
    }
    const n = Number(draft)
    if (!draft.trim() || !Number.isFinite(n) || n < min || n > max) {
      setInvalid(true)
      return
    }
    setInvalid(onChange(round(n, 4)) === false)
  }
  return (
    <label className={`number-input ${invalid ? 'invalid' : ''} ${disabled ? 'is-disabled' : ''}`}>
      <input
        aria-label={label}
        aria-invalid={invalid}
        title={invalid ? `Enter a value between ${min} and ${max}` : label}
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur()
          }
          if (e.key === 'Escape') {
            cancelBlur.current = true
            setDraft(String(round(value, 3)))
            setInvalid(false)
            e.currentTarget.blur()
          }
        }}
      />
      {suffix && <span>{suffix}</span>}
    </label>
  )
}
export function DimensionField({
  label,
  value,
  unit,
  onChange,
  allowZero = false,
  disabled = false,
  max = 1200,
}: {
  label: string
  value: number
  unit: Unit
  onChange: (n: number) => boolean | void
  allowZero?: boolean
  disabled?: boolean
  max?: number
}) {
  return (
    <div className="dimension-field">
      <span className="field-label">{label}</span>
      {unit === 'imperial' ? (
        <div className="split-input">
          <NumberField
            label={`${label} feet`}
            value={Math.floor(value / 12)}
            min={0}
            max={Math.floor(max / 12)}
            onChange={(feet) =>
              onChange(Math.max(allowZero ? 0 : 0.25, feet * 12 + round(value % 12)))
            }
            suffix="ft"
            disabled={disabled}
          />
          <NumberField
            label={`${label} inches`}
            value={round(value % 12)}
            min={0}
            max={max}
            step={0.25}
            onChange={(inches) =>
              onChange(Math.max(allowZero ? 0 : 0.25, Math.floor(value / 12) * 12 + inches))
            }
            suffix="in"
            disabled={disabled}
          />
        </div>
      ) : (
        <NumberField
          label={`${label} ${unit === 'cm' ? 'centimeters' : 'inches'}`}
          value={unit === 'cm' ? value * 2.54 : value}
          min={allowZero ? 0 : unit === 'cm' ? 0.635 : 0.25}
          max={unit === 'cm' ? max * 2.54 : max}
          step={unit === 'cm' ? 0.1 : 0.25}
          onChange={(n) => onChange(unit === 'cm' ? n / 2.54 : n)}
          suffix={unit}
          disabled={disabled}
        />
      )}
    </div>
  )
}
