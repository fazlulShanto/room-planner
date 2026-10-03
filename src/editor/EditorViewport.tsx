import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react'
import { Box } from 'lucide-react'
import type { DrawingProps } from '../BuildPanel'
import { formatDimension, type Unit } from '../model'
import Plan2D from '../Plan2D'
import type { SceneProps } from '../Scene'
import type { WalkActions, WalkLook } from '../WalkControls'
import WalkPad from '../WalkPad'
import { STILL, walkEyeHeight, type WalkInput } from '../walk'
import CanvasBoundary from './CanvasBoundary'

const Scene = lazy(() => import('../Scene'))

export type EditorView = '3d' | '2d' | 'walk'
export type EditorSceneProps = Omit<SceneProps, 'walk' | 'walkInput' | 'walkControls'>

type Props = {
  scene: EditorSceneProps
  view: EditorView
  floorKey: string
  floorName: string
  buildingView: boolean
  unit: Unit
  drawing?: DrawingProps
  showClearance: boolean
  onExitWalk: () => void
  onWalkHeight: (height: number) => void
  onNotice: (message: string) => void
  toolbar: ReactNode
  controls: ReactNode
  children: ReactNode
}

export default function EditorViewport({
  scene,
  view,
  floorKey,
  floorName,
  buildingView,
  unit,
  drawing,
  showClearance,
  onExitWalk,
  onWalkHeight,
  onNotice,
  toolbar,
  controls,
  children,
}: Props) {
  const { plan, roomId } = scene
  const [walkInput, setWalkInput] = useState<WalkInput>(STILL)
  const [walkHeightPreview, setWalkHeightPreview] = useState<number | null>(null)
  const eyeHeight = walkEyeHeight(plan, walkHeightPreview ?? plan.walkHeight)
  const [closedDoors, setClosedDoors] = useState<Set<string>>(() => new Set())
  const [walkLook, setWalkLook] = useState<WalkLook>('drag')
  const [doorTargetId, setDoorTargetId] = useState<string | null>(null)
  const doorTarget = plan.openings.find((o) => o.id === doorTargetId && o.kind === 'door')
  const walkActions = useRef<WalkActions | null>(null)
  function exitWalk() {
    onExitWalk()
    setWalkInput(STILL)
    setWalkHeightPreview(null)
  }
  useEffect(() => {
    setWalkInput(STILL)
  }, [view])
  useEffect(() => {
    setClosedDoors(new Set())
    setWalkHeightPreview(null)
  }, [floorKey])

  const sceneProps: SceneProps = {
    ...scene,
    walk: view === 'walk',
    walkInput,
    walkControls: {
      eyeHeight,
      closedDoors,
      actionsRef: walkActions,
      onLookChange: setWalkLook,
      onDoorTarget: setDoorTargetId,
      onDoorToggle: (id) =>
        setClosedDoors((previous) => {
          const next = new Set(previous)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        }),
      onExit: exitWalk,
      onMessage: onNotice,
    },
  }
  return (
    <main
      className={`workspace ${view !== '2d' ? 'workspace-3d' : ''} ${view === 'walk' ? 'workspace-walk' : ''}`}
    >
      {toolbar}
      <div className="canvas-surface" data-testid="planner-canvas">
        {view !== '2d' ? (
          <CanvasBoundary
            fallback={
              <>
                <div className="canvas-fallback-note">
                  3D is unavailable in this browser. The floor plan editor is still fully usable.
                </div>
                <Plan2D
                  key={floorKey}
                  drawing={drawing}
                  {...sceneProps}
                  unit={unit}
                  showClearance={showClearance}
                />
              </>
            }
          >
            <Suspense
              fallback={
                <div className="canvas-loading">
                  <Box size={25} />
                  <span>Preparing your home…</span>
                </div>
              }
            >
              <Scene key={`${floorKey}-${buildingView}`} {...sceneProps} />
            </Suspense>
          </CanvasBoundary>
        ) : (
          <Plan2D
            key={floorKey}
            drawing={drawing}
            {...sceneProps}
            unit={unit}
            showClearance={showClearance}
          />
        )}
      </div>
      <div className="canvas-top-note">
        <span className="live-dot" />
        {roomId === 'all'
          ? buildingView && view === '3d'
            ? 'All floors'
            : floorName
          : plan.rooms.find((r) => r.id === roomId)?.name}
        <span className="note-separator">/</span>
        <span className="canvas-note-mode">
          {view === 'walk'
            ? `Walk · ${formatDimension(eyeHeight)} camera`
            : view === '3d'
              ? 'Dollhouse'
              : 'Measured plan'}
        </span>
      </div>
      {view === 'walk' && (
        <div className="walk-aim">
          <span className={`walk-crosshair ${doorTarget ? 'has-door' : ''}`} aria-hidden="true" />
          {doorTarget && (
            <button className="walk-door-prompt" onClick={() => walkActions.current?.toggleDoor()}>
              <kbd>F</kbd>
              {closedDoors.has(doorTarget.id) ? 'Open' : 'Close'} {doorTarget.name}
            </button>
          )}
        </div>
      )}
      {view === 'walk' ? (
        <WalkPad
          onInput={setWalkInput}
          onExit={exitWalk}
          eyeHeight={eyeHeight}
          maxHeight={Math.min(96, plan.ceiling - 2)}
          onHeightPreview={setWalkHeightPreview}
          onHeightCommit={(height) => {
            setWalkHeightPreview(null)
            onWalkHeight(height)
          }}
          look={walkLook}
          onMouseLook={() => walkActions.current?.mouseLook()}
          onDragLook={() => walkActions.current?.dragLook()}
        />
      ) : (
        controls
      )}
      {children}
    </main>
  )
}
