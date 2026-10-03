import {
  Archive,
  Armchair,
  BedDouble,
  Box,
  Columns2,
  Columns3,
  PanelsTopLeft,
  Plus,
  Refrigerator,
  Rows3,
  Ruler,
  Search,
  Sofa,
  Table2,
  WashingMachine,
  X,
} from 'lucide-react'
import { CATALOG, round, type ItemKind } from './model'

export const FURNITURE_ICONS = {
  bed: BedDouble,
  cabinet: Archive,
  fridge: Refrigerator,
  washer: WashingMachine,
  desk: Table2,
  dining: Table2,
  custom: Box,
  almirah: Columns2,
  dressing: PanelsTopLeft,
  wardrobe: Columns3,
  rack: Rows3,
  'sofa-one': Armchair,
  'sofa-two': Sofa,
  'sofa-corner': Sofa,
  'tea-table': Table2,
  chair: Armchair,
}

const groups: { name: string; kinds: ItemKind[] }[] = [
  { name: 'Living', kinds: ['sofa-one', 'sofa-two', 'sofa-corner', 'tea-table'] },
  {
    name: 'Bedroom & storage',
    kinds: ['bed', 'wardrobe', 'almirah', 'dressing', 'rack', 'cabinet'],
  },
  { name: 'Dining & work', kinds: ['dining', 'chair', 'desk'] },
  { name: 'Appliances', kinds: ['fridge', 'washer'] },
  { name: 'Make it yours', kinds: ['custom'] },
]

export default function FurnitureLibrary({
  query,
  onQuery,
  onAdd,
  hasRooms,
}: {
  query: string
  onQuery: (query: string) => void
  onAdd: (kind: ItemKind) => void
  hasRooms: boolean
}) {
  const search = query.trim().toLowerCase()
  const matches = groups
    .map((group) => ({
      ...group,
      items: group.kinds
        .map((kind) => CATALOG.find((item) => item.kind === kind)!)
        .filter((item) =>
          `${group.name} ${item.name} ${item.description}`.toLowerCase().includes(search),
        ),
    }))
    .filter((group) => group.items.length)

  return (
    <div className="furniture-library">
      <div className="catalog-search">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Search furniture"
            placeholder="Search furniture…"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
          {query && (
            <button aria-label="Clear furniture search" onClick={() => onQuery('')}>
              <X size={15} />
            </button>
          )}
        </label>
        <p>
          {hasRooms
            ? 'Pick a piece. Make it your size.'
            : 'Draw a closed room in Build to add furniture.'}
        </p>
      </div>
      <div className="catalog-results">
        {matches.map((group) => (
          <section className="catalog-group" key={group.name} aria-label={group.name}>
            <h3>
              {group.name}
              <span>{group.items.length}</span>
            </h3>
            <div className="catalog-grid">
              {group.items.map((item) => {
                const Icon = FURNITURE_ICONS[item.kind]
                return (
                  <button
                    className={`catalog-card ${item.kind === 'custom' ? 'custom-card' : ''}`}
                    key={item.kind}
                    disabled={!hasRooms}
                    onClick={() => onAdd(item.kind)}
                    aria-label={`Add ${item.name}`}
                    title={item.description}
                  >
                    <Icon className="catalog-illustration" size={24} strokeWidth={1.5} />
                    <span className="catalog-card-text">
                      <strong>{item.name}</strong>
                      <span className="catalog-size">
                        {item.kind === 'custom'
                          ? 'Anything, in any size'
                          : `${round(item.width, 1)} × ${round(item.depth, 1)} × ${round(item.height, 1)}″`}
                      </span>
                    </span>
                    {item.kind === 'custom' && <Plus className="catalog-add-icon" size={16} />}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
        {!matches.length && (
          <div className="library-empty" role="status">
            <Search size={24} />
            <strong>No furniture found</strong>
            <p>Try “sofa”, “storage”, or “table”.</p>
            <button className="quiet-button" onClick={() => onQuery('')}>
              Clear search
            </button>
          </div>
        )}
      </div>
      <p className="catalog-footnote">
        <Ruler size={15} />
        Starting sizes in inches · width × depth × height.
        <br />
        Edit exact measurements after adding.
      </p>
    </div>
  )
}
