import { useState } from 'react'
import {
  Archive,
  Baby,
  Bath,
  BookOpen,
  CookingPot,
  Flower2,
  Footprints,
  Lamp,
  LampFloor,
  Microwave,
  RectangleHorizontal,
  ShowerHead,
  Toilet,
  Tv,
  Shirt,
  type LucideIcon,
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
import { round, type ItemKind } from './model'
import { CATALOG, CATALOG_CATEGORIES, filterCatalog, type CatalogCategory } from './catalog'

export const FURNITURE_ICONS: Record<ItemKind, LucideIcon> = {
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
  nightstand: Archive,
  dresser: Rows3,
  crib: Baby,
  'bunk-bed': BedDouble,
  ottoman: Armchair,
  bench: Sofa,
  'console-table': Table2,
  'tv-unit': Tv,
  bookcase: BookOpen,
  'shoe-rack': Rows3,
  'side-table': Table2,
  'office-chair': Armchair,
  'bar-stool': Armchair,
  'work-desk': Table2,
  'kitchen-base': Archive,
  'kitchen-sink': Bath,
  'kitchen-island': Table2,
  stove: CookingPot,
  dishwasher: WashingMachine,
  microwave: Microwave,
  pantry: Columns2,
  toilet: Toilet,
  'squat-toilet': Footprints,
  'bathroom-vanity': Bath,
  bathtub: Bath,
  shower: ShowerHead,
  'floor-lamp': LampFloor,
  'table-lamp': Lamp,
  plant: Flower2,
  rug: RectangleHorizontal,
  mirror: PanelsTopLeft,
  'coat-rack': Shirt,
  'laundry-basket': Archive,
}

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
  const [category, setCategory] = useState<CatalogCategory | 'All'>('All')
  const items = filterCatalog(query, category)
  const matches = CATALOG_CATEGORIES.map((name) => ({
    name,
    items: items.filter((item) => item.category === name),
  })).filter((group) => group.items.length)

  return (
    <div className="furniture-library">
      <div className="catalog-search">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="Search furniture"
            placeholder="Search furniture, fixtures, decor…"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
          {query && (
            <button aria-label="Clear furniture search" onClick={() => onQuery('')}>
              <X size={15} />
            </button>
          )}
        </label>
        <label className="catalog-category">
          Category
          <select
            aria-label="Item category"
            value={category}
            onChange={(event) => setCategory(event.target.value as CatalogCategory | 'All')}
          >
            <option value="All">All categories</option>
            {CATALOG_CATEGORIES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <p role="status" aria-live="polite">
          {items.length} of {CATALOG.length} items
        </p>
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
            <strong>No items found</strong>
            <p>Try another category or search for “sofa”, “sink”, or “lamp”.</p>
            <button
              className="quiet-button"
              onClick={() => {
                onQuery('')
                setCategory('All')
              }}
            >
              Reset filters
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
