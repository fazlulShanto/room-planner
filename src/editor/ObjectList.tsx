import { AppWindow, DoorOpen, LockKeyhole, Plus, Search, X } from 'lucide-react'
import { FURNITURE_ICONS as ICONS } from '../FurnitureLibrary'
import { formatDimension, type Plan, type Unit } from '../model'

type ObjectListProps = {
  plan: Plan
  roomId: string
  section: 'items' | 'plan'
  query: string
  onQuery: (query: string) => void
  selected: string | null
  unit: Unit
  issueIds: Set<string>
  onSelect: (id: string) => void
  onAddItem: () => void
  onAddOpening: () => void
}
export default function ObjectList({
  plan,
  roomId,
  section,
  query,
  onQuery,
  selected,
  unit,
  issueIds,
  onSelect,
  onAddItem,
  onAddOpening,
}: ObjectListProps) {
  const listedRooms = [
    ...plan.rooms,
    ...(plan.items.some((i) => !i.roomId) || plan.openings.some((o) => !o.roomId)
      ? [{ id: '', name: 'Unassigned', x: 0, z: 0, width: 0, depth: 0, color: '#ddd8cc' }]
      : []),
  ]
  const filteredRooms = listedRooms.filter((r) => roomId === 'all' || r.id === roomId)
  return (
    <>
      <label className="search-field">
        <Search size={14} />
        <input
          aria-label={section === 'items' ? 'Find an item' : 'Find an opening'}
          placeholder={section === 'items' ? 'Find an item…' : 'Find an opening…'}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
        {query && (
          <button aria-label="Clear search" onClick={() => onQuery('')}>
            <X size={12} />
          </button>
        )}
      </label>
      {filteredRooms.map((r) => {
        const entries =
          section === 'items'
            ? plan.items.filter(
                (i) => i.roomId === r.id && i.name.toLowerCase().includes(query.toLowerCase()),
              )
            : plan.openings.filter(
                (o) => o.roomId === r.id && o.name.toLowerCase().includes(query.toLowerCase()),
              )
        if (!entries.length) return null
        return (
          <section className="room-group" key={r.id}>
            <div className="room-group-title">
              <span>{r.name}</span>
              <span className="room-group-count">{entries.length}</span>
            </div>
            {entries.map((entry) => {
              const furniture = 'depth' in entry,
                Icon = furniture
                  ? ICONS[entry.kind]
                  : entry.kind !== 'window'
                    ? DoorOpen
                    : AppWindow
              return (
                <button
                  key={entry.id}
                  className={`item-row ${selected === entry.id ? 'selected' : ''}`}
                  onClick={() => onSelect(entry.id)}
                  aria-label={`Select ${entry.name}`}
                >
                  <span
                    className="item-thumbnail"
                    style={
                      furniture
                        ? {
                            backgroundColor: `${entry.color}27`,
                            color: entry.color,
                          }
                        : undefined
                    }
                  >
                    <Icon size={23} strokeWidth={1.35} />
                  </span>
                  <span className="item-row-text">
                    <strong>{entry.name}</strong>
                    <span>
                      {formatDimension(entry.width, unit)} ×{' '}
                      {formatDimension(furniture ? entry.depth : entry.height, unit)}
                    </span>
                  </span>
                  {furniture && entry.locked ? (
                    <LockKeyhole size={12} />
                  ) : issueIds.has(entry.id) ? (
                    <span className="warning-dot" />
                  ) : selected === entry.id ? (
                    <span className="selected-dot" />
                  ) : null}
                </button>
              )
            })}
          </section>
        )
      })}
      {section === 'items' && (
        <button className="add-item-button" onClick={onAddItem}>
          <Plus size={16} />
          Add a custom-sized item
        </button>
      )}
      {section === 'plan' && (
        <button className="add-item-button" onClick={onAddOpening}>
          <Plus size={15} />
          Place a door or window
        </button>
      )}
      {section === 'plan' && (
        <p className="small-description openings-note">
          Select an opening to edit its size and position, remove its door, or change its hinge side
          and swing.
        </p>
      )}
    </>
  )
}
