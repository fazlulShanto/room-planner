import type { ReactNode } from 'react'

export default function ToolButton({
  children,
  label,
  active,
  onClick,
  disabled,
}: {
  children: ReactNode
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`icon-button ${active ? 'active' : ''}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
