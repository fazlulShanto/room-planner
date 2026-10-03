import type { ReactNode } from 'react'

export default function ToolButton({
  children,
  label,
  active,
  onClick,
  disabled,
  controls,
}: {
  children: ReactNode
  label: string
  active?: boolean
  disabled?: boolean
  controls?: string
  onClick: () => void
}) {
  return (
    <button
      className={`icon-button ${active ? 'active' : ''}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      aria-controls={controls}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
