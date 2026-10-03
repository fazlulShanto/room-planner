import {
  AlertTriangle,
  AppWindow,
  Check,
  CheckCircle2,
  Copy,
  DoorOpen,
  House,
  LockKeyhole,
  Move,
  PanelRightClose,
  Plus,
  RotateCw,
  Ruler,
  Trash2,
  UnlockKeyhole,
} from 'lucide-react'
import { BuildingInspector } from '../BuildPanel'
import { changeWall, removeWall } from '../building'
import { FURNITURE_ICONS as ICONS } from '../FurnitureLibrary'
import {
  CATALOG,
  formatDimension,
  hingeSideLabels,
  normalizedAngle,
  sectionalDimensions,
  type Item,
  type Opening,
  type Plan,
  type Unit,
  type Issue,
} from '../model'
import { changeItem, changeOpening, duplicateItem } from './planCommands'
import { DimensionField, NumberField } from './MeasurementFields'
import ToolButton from './ToolButton'

const colors = [
  '#879e87',
  '#ad8c77',
  '#8b9eaa',
  '#d2c5ad',
  '#b8c4c2',
  '#c2937c',
  '#555e5b',
  '#eee9dc',
]
type InspectorProps = {
  plan: Plan
  selected: string | null
  roomId: string
  floorName: string
  unit: Unit
  issues: Issue[]
  open: boolean
  onClose: () => void
  onSelect: (id: string | null) => void
  onUnit: (unit: Unit) => void
  onNavigate: (section: 'add' | 'build') => void
  onChange: (update: (plan: Plan) => Plan) => boolean
}

export default function Inspector({
  plan,
  selected,
  roomId,
  floorName,
  unit,
  issues,
  open,
  onClose,
  onSelect,
  onUnit,
  onNavigate,
  onChange: commit,
}: InspectorProps) {
  const item = plan.items.find((i) => i.id === selected)
  const opening = plan.openings.find((o) => o.id === selected)
  const editWall = plan.walls.find((w) => w.id === selected)
  const editRoom = plan.rooms.find((r) => r.id === selected)
  const itemIssues = issues.filter((i) => i.itemId === selected)
  const selectedRoom = plan.rooms.find((r) => r.id === (item?.roomId || opening?.roomId || roomId))
  const hingeLabels = opening
    ? hingeSideLabels(plan.walls.find((w) => w.id === opening.wallId)!)
    : null
  const SelectedIcon = item ? ICONS[item.kind] : opening?.kind === 'window' ? AppWindow : DoorOpen
  const updateItem = (id: string, patch: Partial<Item>) => commit((p) => changeItem(p, id, patch))
  const updateOpening = (id: string, patch: Partial<Opening>) =>
    commit((p) => changeOpening(p, id, patch))
  function remove() {
    if (
      item &&
      !item.locked &&
      commit((p) => ({ ...p, items: p.items.filter((i) => i.id !== item.id) }))
    )
      onSelect(null)
  }
  function duplicate() {
    if (!item) return
    const copy = duplicateItem(item)
    if (commit((p) => ({ ...p, items: [...p.items, copy] }))) onSelect(copy.id)
  }
  return (
    <aside className="inspector" aria-label="Details panel" hidden={!open}>
      <div className="inspector-heading">
        <span className="eyebrow">
          {item
            ? 'ITEM DETAILS'
            : opening
              ? 'OPENING DETAILS'
              : editWall
                ? 'WALL DETAILS'
                : editRoom
                  ? 'ROOM DETAILS'
                  : 'FLOOR DETAILS'}
        </span>
        <ToolButton label="Hide details" onClick={onClose}>
          <PanelRightClose size={15} />
        </ToolButton>
      </div>
      {editWall || editRoom ? (
        <BuildingInspector
          key={selected}
          wall={editWall}
          room={editRoom}
          onWall={(patch) => commit((p) => changeWall(p, editWall!.id, patch))}
          onRoom={(patch) =>
            commit((p) => ({
              ...p,
              rooms: p.rooms.map((r) => (r.id === editRoom!.id ? { ...r, ...patch } : r)),
            }))
          }
          onDelete={() => {
            commit((p) => removeWall(p, editWall!.id))
            onSelect(null)
          }}
        />
      ) : item || opening ? (
        <>
          <div className="selection-heading">
            <span
              className="selected-item-icon"
              style={
                item
                  ? {
                      background: `${item.color}25`,
                      color: item.color,
                    }
                  : undefined
              }
            >
              <SelectedIcon size={29} strokeWidth={1.35} />
            </span>
            <div>
              <span className="overline">{selectedRoom?.name}</span>
              <h2>{item?.name || opening?.name}</h2>
            </div>
          </div>
          <div className="inspector-content">
            <label className="name-field field-label">
              Name
              <input
                aria-label="Item name"
                maxLength={120}
                key={`${selected}-${item?.name || opening?.name}`}
                defaultValue={item?.name || opening?.name}
                onBlur={(e) => {
                  const name = e.target.value.trim()
                  if (name) {
                    if (item)
                      updateItem(item.id, {
                        name,
                      })
                    else if (opening)
                      updateOpening(opening.id, {
                        name,
                      })
                  }
                }}
              />
            </label>
            {item?.kind.startsWith('sofa-') && (
              <>
                <div className="section-title">
                  <h3>Sofa shape</h3>
                </div>
                <label className="select-field field-label">
                  Shape
                  <select
                    aria-label="Sofa shape"
                    value={item.kind}
                    disabled={item.locked}
                    onChange={(e) => {
                      const preset = CATALOG.find((c) => c.kind === e.target.value)!
                      updateItem(item.id, {
                        kind: preset.kind,
                        name: CATALOG.some((c) => c.name === item.name) ? preset.name : item.name,
                      })
                    }}
                  >
                    <option value="sofa-one">One seat</option>
                    <option value="sofa-two">Two seats</option>
                    <option value="sofa-corner">L-shaped corner</option>
                  </select>
                </label>
                {item.kind === 'sofa-corner' && (
                  <>
                    <label className="select-field field-label">
                      Long section
                      <select
                        aria-label="Long section side"
                        value={item.chaiseSide ?? 'left'}
                        disabled={item.locked}
                        onChange={(e) =>
                          updateItem(item.id, { chaiseSide: e.target.value as 'left' | 'right' })
                        }
                      >
                        <option value="left">Left when facing the sofa</option>
                        <option value="right">Right when facing the sofa</option>
                      </select>
                    </label>
                    <DimensionField
                      label="Body depth"
                      value={sectionalDimensions(item).bodyDepth}
                      unit={unit}
                      max={item.depth * 0.95}
                      disabled={item.locked}
                      onChange={(n) => updateItem(item.id, { seatDepthRatio: n / item.depth })}
                    />
                    <DimensionField
                      label="Return width"
                      value={sectionalDimensions(item).returnWidth}
                      unit={unit}
                      max={item.width * 0.95}
                      disabled={item.locked}
                      onChange={(n) => updateItem(item.id, { chaiseWidthRatio: n / item.width })}
                    />
                    <p className="field-help">
                      The dimensions below include the long section. Body depth and return width
                      define the L; they scale with the overall size.
                    </p>
                  </>
                )}
              </>
            )}
            {opening && opening.kind !== 'window' && (
              <>
                <div className="section-title">
                  <h3>Door & opening</h3>
                </div>
                <label className="select-field field-label">
                  Opening type
                  <select
                    aria-label="Opening type"
                    value={opening.kind}
                    onChange={(e) =>
                      updateOpening(opening.id, { kind: e.target.value as 'door' | 'passage' })
                    }
                  >
                    <option value="door">Door</option>
                    <option value="passage">Open passage (no door)</option>
                  </select>
                </label>
                {opening.kind === 'door' ? (
                  <>
                    <label className="select-field field-label">
                      Hinge side
                      <select
                        aria-label="Hinge side"
                        value={opening.hinge ?? 'start'}
                        onChange={(e) =>
                          updateOpening(opening.id, { hinge: e.target.value as 'start' | 'end' })
                        }
                      >
                        <option value="start">{hingeLabels!.start} edge (floor plan)</option>
                        <option value="end">{hingeLabels!.end} edge (floor plan)</option>
                      </select>
                    </label>
                    <p className="field-help">
                      Changes where the door is attached, keeping its swing on the same side of the
                      wall.
                    </p>
                    <button
                      className="outline-button full-width"
                      onClick={() =>
                        updateOpening(opening.id, { swing: opening.swing === 1 ? -1 : 1 })
                      }
                    >
                      <RotateCw size={15} /> Reverse swing direction
                    </button>
                  </>
                ) : (
                  <p className="field-help">
                    The opening stays clear, with no door or swing area. Choose Door to add it back.
                  </p>
                )}
              </>
            )}
            <div className="section-title">
              <h3>Dimensions</h3>
              <select
                className="unit-select"
                aria-label="Measurement units"
                value={unit}
                onChange={(e) => onUnit(e.target.value as Unit)}
              >
                <option value="imperial">ft & in</option>
                <option value="in">inches</option>
                <option value="cm">cm</option>
              </select>
            </div>
            <DimensionField
              label="Width"
              value={item?.width ?? opening!.width}
              unit={unit}
              disabled={item?.locked}
              onChange={(n) =>
                item
                  ? updateItem(item.id, { width: n })
                  : updateOpening(opening!.id, {
                      width: n,
                    })
              }
            />
            {item && (
              <DimensionField
                label="Length / depth"
                value={item.depth}
                unit={unit}
                disabled={item.locked}
                onChange={(n) => updateItem(item.id, { depth: n })}
              />
            )}
            <DimensionField
              label="Height"
              value={item?.height ?? opening!.height}
              unit={unit}
              disabled={item?.locked}
              onChange={(n) =>
                item
                  ? updateItem(item.id, { height: n })
                  : updateOpening(opening!.id, {
                      height: n,
                    })
              }
            />
            <p className="field-help">
              {item
                ? 'Overall outer dimensions, including the frame.'
                : 'Opening size, measured inside the frame.'}
            </p>
            {item ? (
              <>
                <div className="section-title">
                  <h3>Placement</h3>
                  <Move size={13} />
                </div>
                <label className="field-label select-field">
                  Room
                  <select
                    aria-label="Item room"
                    disabled={item.locked}
                    value={item.roomId}
                    onChange={(e) => {
                      const room = plan.rooms.find((r) => r.id === e.target.value)!
                      updateItem(item.id, {
                        roomId: room.id,
                        x: room.x + room.width / 2,
                        z: room.z + room.depth / 2,
                      })
                    }}
                  >
                    {plan.rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <DimensionField
                  label="Bottom above floor"
                  value={item.elevation}
                  unit={unit}
                  allowZero
                  disabled={item.locked}
                  onChange={(n) =>
                    updateItem(item.id, {
                      elevation: n,
                    })
                  }
                />
                <div className="position-grid">
                  <div>
                    <label className="field-label">X position</label>
                    <NumberField
                      label="X position inches"
                      value={item.x}
                      min={-5000}
                      max={5000}
                      step={1}
                      suffix="in"
                      disabled={item.locked}
                      onChange={(n) =>
                        updateItem(item.id, {
                          x: n,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="field-label">Z position</label>
                    <NumberField
                      label="Z position inches"
                      value={item.z}
                      min={-5000}
                      max={5000}
                      step={1}
                      suffix="in"
                      disabled={item.locked}
                      onChange={(n) =>
                        updateItem(item.id, {
                          z: n,
                        })
                      }
                    />
                  </div>
                </div>
                <p className="field-help">
                  Center position from the home’s top-left interior corner.
                </p>
                <div className="rotation-row">
                  <div>
                    <label className="field-label">Rotation</label>
                    <NumberField
                      label="Rotation degrees"
                      value={normalizedAngle(item.rotation)}
                      max={360}
                      step={15}
                      suffix="°"
                      disabled={item.locked}
                      onChange={(n) =>
                        updateItem(item.id, {
                          rotation: normalizedAngle(n),
                        })
                      }
                    />
                  </div>
                  <button
                    className="rotate-button"
                    disabled={item.locked}
                    onClick={() =>
                      updateItem(item.id, {
                        rotation: normalizedAngle(item.rotation + 90),
                      })
                    }
                  >
                    <RotateCw size={15} />
                    90°
                  </button>
                </div>
                <div className="section-title">
                  <h3>Finish</h3>
                </div>
                <div className="color-swatches">
                  {colors.map((c) => (
                    <button
                      key={c}
                      title={c}
                      aria-label={`Set color ${c}`}
                      aria-pressed={item.color === c}
                      style={{
                        backgroundColor: c,
                      }}
                      className={item.color === c ? 'selected' : ''}
                      onClick={() =>
                        updateItem(item.id, {
                          color: c,
                        })
                      }
                    >
                      {item.color === c && <Check size={12} />}
                    </button>
                  ))}
                  <label className="custom-color" title="Custom color">
                    <Plus size={14} />
                    <input
                      type="color"
                      aria-label="Custom item color"
                      value={item.color}
                      onChange={(e) =>
                        updateItem(item.id, {
                          color: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <div className={`item-fit-note ${itemIssues.length ? 'warning' : ''}`}>
                  {itemIssues.length ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                  <div>
                    <strong>
                      {itemIssues.length ? 'Check this placement' : 'Fits in this position'}
                    </strong>
                    {itemIssues.length ? (
                      itemIssues.map((i, n) => <span key={n}>{i.message}</span>)
                    ) : (
                      <span>No furniture, wall, or door conflicts.</span>
                    )}
                  </div>
                </div>
                {item.kind !== 'bed' && (
                  <p className="field-help assumption-note">
                    {item.kind === 'rack'
                      ? 'RFL-style plastic rack. Preset: your 20″ width × 12″ depth × 27″ height.'
                      : item.kind === 'chair'
                        ? 'Reference chair: 41 × 45 × 100 cm, with a 45 cm seat height and 37 cm back width. Height includes the back; the seat and back scale with your dimensions.'
                        : 'Preset dimensions are starting estimates. Enter your furniture’s actual measurements.'}
                    {item.kind === 'rug' &&
                      ' Rugs up to 1 inch thick on the floor allow furniture and walking over them.'}
                    {item.kind === 'dressing' &&
                      ' Height includes the mirror; depth includes the full base.'}
                  </p>
                )}
                {item.kind === 'bed' && (
                  <p className="field-help assumption-note">
                    Bed widths and lengths match your measurements. Height is a starting estimate
                    you can edit.
                  </p>
                )}
              </>
            ) : (
              opening && (
                <>
                  <div className="section-title">
                    <h3>Placement</h3>
                  </div>
                  {opening.kind === 'window' && (
                    <DimensionField
                      label="Sill above floor"
                      value={opening.sill}
                      unit={unit}
                      allowZero
                      onChange={(n) => updateOpening(opening.id, { sill: n })}
                    />
                  )}
                  <DimensionField
                    label="Center along wall"
                    value={opening.center}
                    unit={unit}
                    allowZero
                    onChange={(n) =>
                      updateOpening(opening.id, {
                        center: n,
                      })
                    }
                  />
                  <p className="field-help">
                    Measured from the wall’s starting corner. Room boundaries and nearby openings
                    are protected.
                  </p>
                  {opening.kind === 'window' && (
                    <div className="tip-card compact">
                      <Ruler size={17} />
                      <p>Window width, height, and sill are fully editable.</p>
                    </div>
                  )}
                </>
              )
            )}
          </div>
          {opening && (
            <div className="inspector-bottom">
              <button
                className="quiet-button"
                onClick={() => {
                  commit((p) => ({ ...p, openings: p.openings.filter((o) => o.id !== opening.id) }))
                  onSelect(null)
                }}
              >
                <Trash2 size={15} />
                Remove opening
              </button>
            </div>
          )}
          {item && (
            <div className="inspector-bottom">
              <button className="quiet-button" onClick={duplicate}>
                <Copy size={14} />
                Duplicate
              </button>
              <ToolButton
                label={item.locked ? 'Unlock item' : 'Lock item'}
                active={item.locked}
                onClick={() =>
                  updateItem(item.id, {
                    locked: !item.locked,
                  })
                }
              >
                {item.locked ? <LockKeyhole size={15} /> : <UnlockKeyhole size={15} />}
              </ToolButton>
              <ToolButton label="Delete selected item" disabled={item.locked} onClick={remove}>
                <Trash2 size={15} />
              </ToolButton>
            </div>
          )}
        </>
      ) : (
        <div className="inspector-content home-details">
          <div className="home-summary-icon">
            <House size={34} strokeWidth={1.1} />
          </div>
          <h2>
            A little more room
            <br />
            for possibility.
          </h2>
          <p>Select furniture to change its dimensions, or add something new to see how it fits.</p>
          <button
            className="primary-button full-width"
            onClick={() => {
              onNavigate('add')
            }}
          >
            <Plus size={15} />
            Add an item
          </button>
          <div className="section-title">
            <h3>Interior measurements</h3>
            <Ruler size={14} />
          </div>
          {plan.rooms.map((r) => (
            <div className="measurement-row" key={r.id}>
              <span>{r.name}</span>
              <strong>
                {formatDimension(r.width)} × {formatDimension(r.depth)}
              </strong>
            </div>
          ))}
          <p className="assumption-note">
            Dimensions shown are interior bounds. Use Build to draw walls, edit rooms, and add doors
            or windows. Ceiling height applies to {floorName.toLowerCase()}.
          </p>
          <button className="outline-button full-width" onClick={() => onNavigate('build')}>
            Edit walls and rooms
          </button>
          <DimensionField
            label="Ceiling height"
            value={plan.ceiling}
            unit={unit}
            onChange={(ceiling) => commit((p) => ({ ...p, ceiling }))}
          />
        </div>
      )}
    </aside>
  )
}
