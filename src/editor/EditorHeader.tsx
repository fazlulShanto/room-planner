import { useRef, type ComponentProps } from 'react'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  House,
  Redo2,
  Undo2,
} from 'lucide-react'
import { ProjectMenu } from '../ProjectControls'
import ToolButton from './ToolButton'

type Props = {
  projects: ComponentProps<typeof ProjectMenu>
  saveState: 'saving' | 'saved' | 'error'
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  onImport: (file?: File) => Promise<void>
  onExport: () => void
}

export default function EditorHeader({
  projects,
  saveState,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onImport,
  onExport,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">
          <House size={22} strokeWidth={1.7} />
        </span>
        <span>
          roomwise<span className="brand-period">.</span>
        </span>
      </div>
      <div className="header-divider" />
      <ProjectMenu {...projects} />
      <span className={`save-status ${saveState === 'error' ? 'error' : ''}`} role="status">
        {saveState === 'saved' ? (
          <Check size={13} />
        ) : saveState === 'error' ? (
          <AlertTriangle size={13} />
        ) : (
          <span className="saving-dot" />
        )}
        {saveState === 'saved'
          ? 'Saved on this device'
          : saveState === 'saving'
            ? 'Saving…'
            : 'Export to save'}
      </span>
      <div className="header-actions">
        <ToolButton label="Undo (⌘Z)" onClick={onUndo} disabled={!canUndo}>
          <Undo2 size={17} />
        </ToolButton>
        <ToolButton label="Redo (⇧⌘Z)" onClick={onRedo} disabled={!canRedo}>
          <Redo2 size={17} />
        </ToolButton>
        <span className="action-divider" />
        <button className="quiet-button import-button" onClick={() => fileInput.current?.click()}>
          <ArrowUpFromLine size={15} />
          Import
        </button>
        <button className="primary-button export-button" onClick={onExport}>
          <ArrowDownToLine size={15} />
          Export layout
        </button>
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept=".json,application/json"
          aria-label="Import layout file"
          onChange={async (event) => {
            const input = event.currentTarget
            try {
              await onImport(input.files?.[0])
            } finally {
              input.value = ''
            }
          }}
        />
      </div>
    </header>
  )
}
