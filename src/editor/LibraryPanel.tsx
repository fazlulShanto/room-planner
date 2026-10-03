import type { ReactNode, RefObject } from 'react'
import {
  ChevronDown,
  DoorOpen,
  House,
  Paintbrush,
  PanelLeftClose,
  PencilRuler,
  Plus,
  Ruler,
  Sofa,
} from 'lucide-react'
import type { Plan } from '../model'
import { canColorRoom } from '../finishes'
import ToolButton from './ToolButton'

const LIBRARY_SECTIONS = [
  { id: 'build', label: 'Build', title: 'Build your floor', icon: PencilRuler },
  { id: 'items', label: 'Items', title: 'Your furniture', icon: Sofa },
  { id: 'add', label: 'Add item', title: 'Add to your home', icon: Plus },
  { id: 'plan', label: 'Openings', title: 'Doors & windows', icon: DoorOpen },
  { id: 'colors', label: 'Colors', title: 'Colors & finishes', icon: Paintbrush },
] as const
export type LibrarySection = (typeof LIBRARY_SECTIONS)[number]['id']

type Props = {
  section: LibrarySection
  open: boolean
  navigationRef: RefObject<HTMLElement | null>
  onClose: () => void
  onNavigate: (section: LibrarySection) => void
  plan: Plan
  roomId: string
  onRoomChange: (id: string) => void
  floorCount: number
  floorControls: ReactNode
  children: ReactNode
}

export default function LibraryPanel({
  section: leftTab,
  open: sidebarOpen,
  navigationRef,
  onClose: closeLibrary,
  onNavigate: openLibrary,
  plan,
  roomId,
  onRoomChange,
  floorCount,
  floorControls,
  children,
}: Props) {
  const section = LIBRARY_SECTIONS.find((section) => section.id === leftTab)!
  return (
    <>
      <nav className="workspace-rail" aria-label="Workspace tools" ref={navigationRef}>
        <div className="rail-tools">
          {LIBRARY_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`rail-button ${leftTab === id && sidebarOpen ? 'active' : ''} ${id === 'add' ? 'rail-add' : ''}`}
              data-section={id}
              aria-label={label}
              title={label}
              aria-expanded={leftTab === id && sidebarOpen}
              aria-controls="library-panel"
              onClick={() => (leftTab === id && sidebarOpen ? closeLibrary() : openLibrary(id))}
            >
              <Icon size={21} strokeWidth={1.7} />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <span className="rail-footer" title="Your home, to the inch.">
          <House size={18} strokeWidth={1.5} />
        </span>
      </nav>
      <aside
        className="library-panel"
        id="library-panel"
        aria-labelledby="library-title"
        hidden={!sidebarOpen}
        onKeyDown={(event) => {
          const inSearch =
            event.target instanceof HTMLElement && !!event.target.closest('.search-field')
          if (
            event.key === 'Escape' &&
            (inSearch ||
              (!(event.target instanceof HTMLInputElement) &&
                !(event.target instanceof HTMLSelectElement)))
          ) {
            event.stopPropagation()
            closeLibrary()
          }
        }}
      >
        <div className="panel-heading">
          <div>
            <span className="eyebrow">WORKSPACE</span>
            <h2 id="library-title">
              {section.title}
              {leftTab === 'items' && <span className="panel-count">{plan.items.length}</span>}
            </h2>
          </div>
          <ToolButton label="Hide library" onClick={closeLibrary}>
            <PanelLeftClose size={16} />
          </ToolButton>
        </div>
        {floorControls}
        <label className="room-select">
          <House size={15} />
          <select
            aria-label="Focus room"
            value={roomId}
            onChange={(e) => onRoomChange(e.target.value)}
          >
            <option value="all">
              {leftTab === 'colors' ? 'All except washrooms' : 'Entire home'}
            </option>
            {plan.rooms
              .filter((r) => leftTab !== 'colors' || canColorRoom(r))
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
          <ChevronDown size={14} />
        </label>
        <div
          className={`library-content ${leftTab === 'add' ? 'library-content--catalog' : ''}`}
          key={leftTab}
        >
          {children}
        </div>
        <div className="library-bottom">
          <span className="small-leaf">
            <Ruler size={16} />
          </span>
          <div>
            <strong>Built from your measurements</strong>
            <span>
              {plan.rooms.length} rooms · {plan.walls.length} walls · {floorCount}{' '}
              {floorCount === 1 ? 'floor' : 'floors'}
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
