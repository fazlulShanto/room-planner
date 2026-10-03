import { useEffect, useRef, useState } from 'react'
import {
  planBounds,
  roomOutline,
  type Point,
  corners,
  localItemOutline,
  sectionalDimensions,
  doorClearance,
  doorLeaf,
  formatDimension,
  wallAngle,
  wallBlocks,
  wallPoint,
  type Unit,
} from './model'
import { projectToWall, snapBuildingPoint } from './building'
import type { DrawingProps } from './BuildPanel'
import { canColorRoom } from './finishes'
import type { SceneProps } from './Scene'

export default function Plan2D(
  props: SceneProps & { unit: Unit; showClearance: boolean; drawing?: DrawingProps },
) {
  const svg = useRef<SVGSVGElement>(null)
  const [anchor, setAnchor] = useState<Point | null>(null),
    [preview, setPreview] = useState<Point | null>(null)
  const drawDown = useRef<{ point: Point; x: number; y: number; fresh: boolean } | null>(null)
  useEffect(() => {
    setAnchor(null)
    setPreview(null)
  }, [props.drawing?.tool, props.fitKey])
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAnchor(null)
        setPreview(null)
        props.drawing?.onCancel()
      }
    }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [props.drawing])
  const building = props.drawing && props.drawing.tool !== 'select'
  function drawPoint(clientX: number, clientY: number, shift = false): Point {
    const p = location(clientX, clientY),
      raw: Point = [p.x, p.y]
    if (shift && anchor) {
      const angle =
          (Math.round(Math.atan2(raw[1] - anchor[1], raw[0] - anchor[0]) / (Math.PI / 4)) *
            Math.PI) /
          4,
        len = Math.hypot(raw[0] - anchor[0], raw[1] - anchor[1])
      raw[0] = anchor[0] + Math.cos(angle) * len
      raw[1] = anchor[1] + Math.sin(angle) * len
    }
    const tolerance = (box[2] / Math.max(1, svg.current?.getBoundingClientRect().width ?? 600)) * 10
    return snapBuildingPoint(raw, props.plan.walls, props.snap ? 1 : 0.01, tolerance)
  }
  function finishDraw(from: Point, to: Point) {
    if (Math.hypot(to[0] - from[0], to[1] - from[1]) < 6) return
    if (props.drawing?.tool === 'rectangle') {
      if (Math.abs(to[0] - from[0]) < 12 || Math.abs(to[1] - from[1]) < 12) return
      props.drawing.onDraw([
        [from, [to[0], from[1]]],
        [[to[0], from[1]], to],
        [to, [from[0], to[1]]],
        [[from[0], to[1]], from],
      ])
      setAnchor(null)
      setPreview(null)
    } else {
      props.drawing?.onDraw([[from, to]])
      setAnchor(to)
      setPreview(to)
    }
  }
  const [box, setBox] = useState([-36, -34, 306, 520])
  const drag = useRef<{
    id?: string
    dx: number
    dz: number
    startX: number
    startZ: number
    box: number[]
    pointer: number
  } | null>(null)
  useEffect(() => {
    const r = props.plan.rooms.find((r) => r.id === props.roomId)
    const b = planBounds(props.plan)
    setBox(
      r
        ? [r.x - 20, r.z - 20, r.width + 40, r.depth + 40]
        : [b.minX - 30, b.minZ - 30, b.maxX - b.minX + 60, b.maxZ - b.minZ + 60],
    )
  }, [props.roomId, props.fitKey])
  function location(clientX: number, clientY: number) {
    const point = svg.current!.createSVGPoint()
    point.x = clientX
    point.y = clientY
    return point.matrixTransform(svg.current!.getScreenCTM()!.inverse())
  }
  return (
    <svg
      ref={svg}
      className="plan-svg"
      viewBox={box.join(' ')}
      aria-label="Interactive floor plan. Draw walls and rooms, place openings, or select objects to edit."
      role="img"
      style={{ cursor: building ? 'crosshair' : undefined }}
      onPointerDownCapture={(e) => {
        if (!building || e.button !== 0) return
        e.stopPropagation()
        e.preventDefault()
        const point = drawPoint(e.clientX, e.clientY, e.shiftKey)
        if (['door', 'window', 'passage'].includes(props.drawing!.tool)) {
          const nearest = props.plan.walls
            .map((w) => ({ w, ...projectToWall(point, w) }))
            .sort((a, b) => a.distance - b.distance)[0]
          if (nearest && nearest.distance <= Math.max(12, nearest.w.thickness))
            props.drawing!.onOpening(
              nearest.w,
              point,
              props.drawing!.tool as 'door' | 'window' | 'passage',
            )
          return
        }
        drawDown.current = { point, x: e.clientX, y: e.clientY, fresh: !anchor }
        if (anchor) finishDraw(anchor, point)
        else {
          setAnchor(point)
          setPreview(point)
        }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onWheel={(e) => {
        const factor = e.deltaY > 0 ? 1.1 : 0.9,
          point = location(e.clientX, e.clientY)
        setBox((b) => {
          const width = Math.min(1400, Math.max(40, b[2] * factor)),
            ratio = width / b[2]
          return [
            point.x - (point.x - b[0]) * ratio,
            point.y - (point.y - b[1]) * ratio,
            width,
            b[3] * ratio,
          ]
        })
      }}
      onPointerDown={(e) => {
        if (
          e.target !== svg.current &&
          !(e.target as Element).classList.contains('floor-background')
        )
          return
        const p = location(e.clientX, e.clientY)
        props.onSelect(null)
        drag.current = {
          dx: 0,
          dz: 0,
          startX: p.x,
          startZ: p.y,
          box: [...box],
          pointer: e.pointerId,
        }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (building) {
          setPreview(drawPoint(e.clientX, e.clientY, e.shiftKey))
          return
        }
        const d = drag.current
        if (!d || d.pointer !== e.pointerId) return
        const p = location(e.clientX, e.clientY)
        if (d.id) {
          const step = props.snap ? 1 : 0.01
          props.onMove(
            d.id,
            Math.round((p.x + d.dx) / step) * step,
            Math.round((p.y + d.dz) / step) * step,
          )
        } else setBox((b) => [b[0] + d.startX - p.x, b[1] + d.startZ - p.y, b[2], b[3]])
      }}
      onPointerUp={(e) => {
        if (building && drawDown.current) {
          const down = drawDown.current
          drawDown.current = null
          if (down.fresh && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8)
            finishDraw(down.point, drawPoint(e.clientX, e.clientY, e.shiftKey))
        }
        if (drag.current?.id) props.onDragEnd()
        drag.current = null
        if (e.currentTarget.hasPointerCapture(e.pointerId))
          e.currentTarget.releasePointerCapture(e.pointerId)
      }}
      onPointerCancel={() => {
        if (drag.current?.id) props.onDragEnd()
        drag.current = null
      }}
    >
      <defs>
        <pattern id="plan-grid" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="0" cy="0" r=".42" fill="#cccfc4" />
        </pattern>
      </defs>
      <rect
        className="floor-background"
        x={-5000}
        y={-5000}
        width={10000}
        height={10000}
        fill={props.grid ? 'url(#plan-grid)' : 'transparent'}
      />
      {props.plan.rooms.map((r) => (
        <g
          key={r.id}
          onPointerDown={(e) => {
            if (props.drawing?.tool === 'select') {
              e.stopPropagation()
              props.onSelect(r.id)
            }
          }}
        >
          <polygon
            className="floor-background"
            points={roomOutline(r)
              .map((p) => p.join(','))
              .join(' ')}
            fill={canColorRoom(r) ? (props.plan.finishes?.[r.id]?.floor ?? r.color) : r.color}
            fillOpacity={canColorRoom(r) && props.plan.finishes?.[r.id]?.floor ? 1 : 0.45}
            stroke={props.selected === r.id ? '#3d876a' : 'none'}
            strokeWidth={1}
          />
          <text className="room-label" x={r.x + r.width / 2} y={r.z + r.depth / 2 - 3}>
            {r.name}
          </text>
          <text className="room-dimension" x={r.x + r.width / 2} y={r.z + r.depth / 2 + 7}>
            {formatDimension(r.width, props.unit)} × {formatDimension(r.depth, props.unit)}
          </text>
        </g>
      ))}
      {props.plan.walls.flatMap((w) =>
        wallBlocks(w, props.plan.openings, props.plan.ceiling)
          .filter((b) => b.elevation < 1)
          .map((b, i) => (
            <rect
              key={`${w.id}-${i}`}
              x={-b.width / 2}
              y={-b.depth / 2}
              width={b.width}
              height={b.depth}
              fill="#62685e"
              transform={`translate(${b.x} ${b.z}) rotate(${-b.rotation})`}
            />
          )),
      )}
      {props.drawing &&
        props.plan.walls.map((w, i) => (
          <g
            key={`wall-hit-${w.id}`}
            onPointerDown={(e) => {
              if (props.drawing?.tool === 'select') {
                e.stopPropagation()
                props.onSelect(w.id)
              }
            }}
          >
            <line
              x1={w.from[0]}
              y1={w.from[1]}
              x2={w.to[0]}
              y2={w.to[1]}
              stroke={props.selected === w.id ? '#3d876a88' : 'transparent'}
              strokeWidth={w.thickness + 5}
            />
            {props.selected === w.id && (
              <text
                x={(w.from[0] + w.to[0]) / 2}
                y={(w.from[1] + w.to[1]) / 2 - 7}
                fontSize="5"
                textAnchor="middle"
                fill="#315b47"
              >
                Wall {i + 1} ·{' '}
                {formatDimension(Math.hypot(w.to[0] - w.from[0], w.to[1] - w.from[1]), props.unit)}
              </text>
            )}
          </g>
        ))}
      {props.plan.openings.map((o) => {
        const wall = props.plan.walls.find((w) => w.id === o.wallId)!,
          [x, z] = wallPoint(wall, o.center),
          selected = props.selected === o.id,
          leaf = doorLeaf(o)
        return (
          <g
            key={o.id}
            transform={`translate(${x} ${z}) rotate(${-wallAngle(wall)})`}
            onPointerDown={(e) => {
              e.stopPropagation()
              props.onSelect(o.id)
            }}
            className="opening-shape"
          >
            <rect
              x={-o.width / 2}
              y={-wall.thickness / 2 - 2}
              width={o.width}
              height={wall.thickness + 4}
              fill={o.kind === 'passage' && selected ? '#a4ceb966' : 'transparent'}
              stroke={o.kind === 'passage' && selected ? '#2e7257' : 'none'}
              strokeWidth=".7"
            />
            {o.kind === 'window' ? (
              <>
                <rect
                  x={-o.width / 2}
                  y={-wall.thickness / 2}
                  width={o.width}
                  height={wall.thickness}
                  fill={selected ? '#a4ceb9' : '#c6e0e0'}
                  stroke={selected ? '#2e7257' : '#83a8ad'}
                  strokeWidth=".8"
                />
                <path
                  d={`M${-o.width / 2} 0H${o.width / 2}M0 ${-wall.thickness / 2}V${wall.thickness / 2}`}
                  stroke="#87a5a6"
                  strokeWidth=".6"
                />
              </>
            ) : leaf ? (
              <g transform={`translate(${leaf.hingeOffset} 0) scale(${leaf.direction} ${o.swing})`}>
                <path
                  d={`M${o.width} 0A${o.width} ${o.width} 0 0 1 0 ${o.width}`}
                  fill={props.showClearance ? '#daba8522' : 'none'}
                  stroke={selected ? '#2e7257' : '#b09774'}
                  strokeWidth=".7"
                  strokeDasharray="2 2"
                />
                <path
                  d={`M0 0V${o.width}`}
                  stroke={selected ? '#2e7257' : '#ad8862'}
                  strokeWidth="1.6"
                />
              </g>
            ) : null}
          </g>
        )
      })}
      {props.showClearance &&
        props.plan.openings
          .filter((o) => o.kind === 'door')
          .map((o) => {
            const r = doorClearance(
              o,
              props.plan.walls.find((w) => w.id === o.wallId)!,
            )
            return (
              <polygon
                key={`${o.id}-clear`}
                points={corners(r)
                  .map((p) => p.join(','))
                  .join(' ')}
                fill="#dca74a"
                fillOpacity=".05"
                stroke="#c39d61"
                strokeWidth=".5"
                strokeDasharray="2 3"
                pointerEvents="none"
              />
            )
          })}
      {props.plan.items.map((item) => {
        const selected = props.selected === item.id,
          issue = props.issueIds.has(item.id)
        return (
          <g
            key={item.id}
            transform={`translate(${item.x} ${item.z}) rotate(${-item.rotation})`}
            className={`furniture-shape ${props.tool === 'move' && !item.locked ? 'movable' : ''}`}
            onPointerDown={(e) => {
              e.stopPropagation()
              props.onSelect(item.id)
              if (e.button !== 0 || item.locked || props.tool !== 'move') return
              const p = location(e.clientX, e.clientY)
              drag.current = {
                id: item.id,
                dx: item.x - p.x,
                dz: item.z - p.y,
                startX: p.x,
                startZ: p.y,
                box,
                pointer: e.pointerId,
              }
              props.onDragStart()
              svg.current!.setPointerCapture(e.pointerId)
            }}
          >
            <path
              d={
                localItemOutline(item)
                  .map(([x, z], i) => `${i ? 'L' : 'M'}${x} ${z}`)
                  .join(' ') + 'Z'
              }
              fill={item.kind === 'bed' ? '#b59b7c' : item.color}
              fillOpacity={item.kind === 'rack' ? 0.18 : 1}
              stroke={issue ? '#b46242' : selected ? '#256a4f' : '#8e897c'}
              strokeWidth={selected ? 1.8 : 0.65}
              strokeDasharray={item.elevation > 0 ? '3 2' : undefined}
            />
            {item.kind === 'bed' && (
              <g pointerEvents="none">
                <rect
                  x={-item.width / 2 + 1.7}
                  y={-item.depth / 2 + 2}
                  width={item.width - 3.4}
                  height={item.depth - 3.8}
                  rx="2.5"
                  fill="#fbf8ef"
                />
                <rect
                  x={-item.width / 2 + 1.7}
                  y={-item.depth * 0.03}
                  width={item.width - 3.4}
                  height={item.depth * 0.51}
                  rx="1"
                  fill={item.color}
                />
                {[-1, 1].map((side) => (
                  <rect
                    key={side}
                    x={side * item.width * 0.225 - item.width * 0.18}
                    y={-item.depth * 0.37}
                    width={item.width * 0.36}
                    height={item.depth * 0.18}
                    rx="2.3"
                    fill="#fffffa"
                    stroke="#d8d1c5"
                    strokeWidth=".5"
                  />
                ))}
              </g>
            )}
            {['almirah', 'wardrobe', 'dressing', 'rack'].includes(item.kind) && (
              <g transform={`scale(${item.width} ${item.depth})`} pointerEvents="none">
                {(item.kind === 'almirah' || item.kind === 'wardrobe') && (
                  <g stroke="#514b40" strokeWidth=".012" fill="none" opacity=".65">
                    <path d="M-.47 .35H.47" />
                    {(item.kind === 'almirah' ? [0] : [-0.16, 0.16]).map((x) => (
                      <path key={x} d={`M${x} .35V.48`} />
                    ))}
                  </g>
                )}
                {item.kind === 'dressing' && (
                  <>
                    <rect
                      x="-.4"
                      y="-.49"
                      width=".8"
                      height=".065"
                      rx=".015"
                      fill="#c2d7da"
                      stroke="#806043"
                      strokeWidth=".015"
                    />
                    <path
                      d="M-.47 .37H.47M-.17 .37V.48"
                      stroke="#705039"
                      strokeWidth=".012"
                      fill="none"
                    />
                  </>
                )}
                {item.kind === 'rack' && (
                  <g fill={item.color}>
                    {Array.from({ length: 8 }, (_, i) => (
                      <rect
                        key={i}
                        x={-0.435 + i * 0.11}
                        y="-.43"
                        width=".1"
                        height=".86"
                        rx=".018"
                      />
                    ))}
                  </g>
                )}
              </g>
            )}
            {item.kind === 'chair' && (
              <g transform={`scale(${item.width} ${item.depth})`} pointerEvents="none">
                <rect
                  x="-.44"
                  y="-.33"
                  width=".88"
                  height=".77"
                  rx=".035"
                  fill="none"
                  stroke="#fff8ed"
                  strokeOpacity=".5"
                  strokeWidth=".015"
                />
                <rect
                  x={-37 / 82}
                  y="-.5"
                  width={37 / 41}
                  height=".12"
                  rx=".01"
                  fill={item.color}
                  stroke="#705338"
                  strokeWidth=".018"
                />
              </g>
            )}
            {(item.kind.startsWith('sofa-') || item.kind === 'tea-table') && (
              <g
                transform={`scale(${item.width} ${item.depth})`}
                pointerEvents="none"
                fill="none"
                stroke="#ffffff"
                strokeOpacity=".5"
                strokeWidth=".012"
              >
                {item.kind === 'tea-table' ? (
                  <rect x="-.44" y="-.41" width=".88" height=".82" rx=".02" />
                ) : (
                  <>
                    <path
                      d={`M-.42 ${-0.5 + (item.kind === 'sofa-corner' ? sectionalDimensions(item).bodyDepth / item.depth : 1) * 0.22}H.42`}
                    />
                    {(item.kind === 'sofa-one'
                      ? []
                      : item.kind === 'sofa-two'
                        ? [0]
                        : [-0.14, 0.14]
                    ).map((x) => (
                      <path
                        key={x}
                        d={`M${x} -.35V${-0.5 + (item.kind === 'sofa-corner' ? sectionalDimensions(item).bodyDepth / item.depth : 1) * 0.9}`}
                      />
                    ))}
                  </>
                )}
              </g>
            )}
            {item.kind !== 'bed' && (
              <text
                className="item-plan-label"
                transform={`translate(0 ${item.kind === 'sofa-corner' ? (sectionalDimensions(item).bodyDepth - item.depth) / 2 : 0}) rotate(${item.rotation})`}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {item.name.length > 18 ? `${item.name.slice(0, 16)}…` : item.name}
              </text>
            )}
            {selected && (
              <>
                {corners({
                  x: 0,
                  z: 0,
                  width: item.width,
                  depth: item.depth,
                  rotation: 0,
                }).map(([x, y], i) => (
                  <rect
                    key={i}
                    x={x - 1.7}
                    y={y - 1.7}
                    width="3.4"
                    height="3.4"
                    fill="#f8fbf5"
                    stroke="#276c51"
                    strokeWidth=".9"
                  />
                ))}
                <path
                  d={`M${-item.width / 2} ${item.depth / 2 + 6}h${item.width}`}
                  stroke="#276c51"
                  strokeWidth=".6"
                />
                <text className="selection-dimension" x="0" y={item.depth / 2 + 13}>
                  {formatDimension(item.width, props.unit)} ×{' '}
                  {formatDimension(item.depth, props.unit)}
                </text>
              </>
            )}
          </g>
        )
      })}
      <g transform="translate(249 10)" pointerEvents="none">
        <path d="M0 15V0m-3 5 3-5 3 5" stroke="#7b8175" fill="none" strokeWidth=".8" />
        <text x="0" y="-5" className="compass-label">
          N
        </text>
      </g>
      <g transform="translate(0 479)" pointerEvents="none">
        <path d="M0 -2V2m0-2h48m0-2v4" stroke="#747b6e" strokeWidth=".7" />
        <text x="24" y="10" className="compass-label">
          4 FEET
        </text>
      </g>
      {building && anchor && preview && (
        <g pointerEvents="none">
          {props.drawing?.tool === 'rectangle' ? (
            <rect
              x={Math.min(anchor[0], preview[0])}
              y={Math.min(anchor[1], preview[1])}
              width={Math.abs(preview[0] - anchor[0])}
              height={Math.abs(preview[1] - anchor[1])}
              fill="#3d876a18"
              stroke="#3d876a"
              strokeWidth={props.drawing.thickness}
            />
          ) : (
            <line
              x1={anchor[0]}
              y1={anchor[1]}
              x2={preview[0]}
              y2={preview[1]}
              stroke="#3d876a"
              strokeWidth={props.drawing!.thickness}
            />
          )}
          <circle cx={preview[0]} cy={preview[1]} r={3} fill="#3d876a" />
          <text
            x={(anchor[0] + preview[0]) / 2}
            y={(anchor[1] + preview[1]) / 2 - 9}
            textAnchor="middle"
            fontSize="6"
            fill="#315b47"
          >
            {props.drawing?.tool === 'rectangle'
              ? `${formatDimension(Math.abs(preview[0] - anchor[0]), props.unit)} × ${formatDimension(Math.abs(preview[1] - anchor[1]), props.unit)}`
              : formatDimension(
                  Math.hypot(preview[0] - anchor[0], preview[1] - anchor[1]),
                  props.unit,
                )}
          </text>
        </g>
      )}
    </svg>
  )
}
