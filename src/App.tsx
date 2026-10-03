import { useEffect, useMemo, useRef, useState } from 'react'
import { useWorkspace } from './workspace/useWorkspace'
import Inspector from './editor/Inspector'
import ObjectList from './editor/ObjectList'
import EditorHeader from './editor/EditorHeader'
import LibraryPanel, { type LibrarySection } from './editor/LibraryPanel'
import EditorViewport, { type EditorSceneProps, type EditorView } from './editor/EditorViewport'
import EditorToolbar from './editor/EditorToolbar'
import EditorToolDock from './editor/EditorToolDock'
import EditorHelp from './editor/EditorHelp'
import EditorStatus from './editor/EditorStatus'
import { useEditorShortcuts } from './editor/useEditorShortcuts'
import { changeItem } from './editor/planCommands'
import FurnitureLibrary from './FurnitureLibrary'
import BuildPanel, { type DrawingTool, type DrawingProps } from './BuildPanel'
import { FloorControls } from './ProjectControls'
import {
  createProject,
  exampleProject,
  addFloor,
  parseProject,
  floorElevations,
  type Project,
} from './projects'
import { addWalls, addOpeningAt } from './building'
import RoomColors from './RoomColors'
import { DEFAULT_LIGHTING } from './lighting'
import { canColorRoom, resetRoomFinishes, setRoomFinish } from './finishes'
import {
  checkPlan,
  createInitialPlan,
  planBounds,
  placeNewItem,
  round,
  type Item,
  type ItemKind,
  type LightingSettings,
  type Plan,
  type Unit,
} from './model'

export default function App() {
  const {
    workspace,
    history,
    notice,
    setNotice,
    saveState,
    commitWorkspace,
    updateProject,
    updatePlan,
    undo,
    redo,
    beginDrag,
    endDrag,
  } = useWorkspace()
  const project = workspace.projects.find((p) => p.id === workspace.activeProjectId)!
  const [floorId, setFloorId] = useState(project.floors[0].id)
  const floor = project.floors.find((f) => f.id === floorId) ?? project.floors[0]
  const plan = floor.plan
  const [buildingView, setBuildingView] = useState(false)
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('select')
  const [drawThickness, setDrawThickness] = useState(6),
    [openingWidth, setOpeningWidth] = useState(32)
  const [lightingPreview, setLightingPreview] = useState<LightingSettings | null>(null)
  const lighting = lightingPreview ?? plan.lighting ?? DEFAULT_LIGHTING
  const [selected, setSelected] = useState<string | null>('bed-room3')
  const [view, setView] = useState<EditorView>(plan.rooms.length ? '3d' : '2d'),
    [tool, setTool] = useState<'orbit' | 'move'>('orbit')
  const [roomId, setRoomId] = useState('all'),
    [unit, setUnit] = useState<Unit>('imperial'),
    [wallMode, setWallMode] = useState<'cut' | 'full' | 'none'>('cut')
  const [grid, setGrid] = useState(true),
    [snap, setSnap] = useState(true),
    [showClearance, setShowClearance] = useState(false)
  const [fitKey, setFitKey] = useState(0),
    [leftTab, setLeftTab] = useState<LibrarySection>(plan.rooms.length ? 'items' : 'build'),
    [query, setQuery] = useState('')
  const [inspectorOpen, setInspectorOpen] = useState(() => window.innerWidth >= 1280)
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 900),
    [help, setHelp] = useState(false),
    [showIssues, setShowIssues] = useState(false)
  const item = plan.items.find((i) => i.id === selected)
  const issues = useMemo(() => checkPlan(plan), [plan])
  const issueIds = useMemo(() => new Set(issues.map((i) => i.itemId)), [issues])
  const navigationRef = useRef<HTMLElement>(null)
  function closeLibrary() {
    setSidebarOpen(false)
    navigationRef.current?.querySelector<HTMLButtonElement>(`[data-section="${leftTab}"]`)?.focus()
  }
  function openLibrary(next: LibrarySection) {
    setLeftTab(next)
    setSidebarOpen(true)
    setQuery('')
    if (window.innerWidth < 1280) setInspectorOpen(false)
    if (next === 'build') {
      setView('2d')
      setBuildingView(false)
    } else setDrawingTool('select')
    if (next === 'colors') {
      setSelected(null)
      if (roomId !== 'all' && !plan.rooms.some((room) => room.id === roomId && canColorRoom(room)))
        setRoomId('all')
    }
  }
  function revealDetails() {
    setInspectorOpen(true)
    if (window.innerWidth < 1280) setSidebarOpen(false)
  }
  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 1279px)')
    const adaptPanels = () => {
      if (narrow.matches) setInspectorOpen(false)
    }
    narrow.addEventListener('change', adaptPanels)
    return () => narrow.removeEventListener('change', adaptPanels)
  }, [])
  function commit(update: (p: Plan) => Plan) {
    return updatePlan(project.id, floor.id, update)
  }
  function commitProject(update: (p: Project) => Project) {
    return updateProject(project.id, update)
  }
  function updateItem(id: string, patch: Partial<Item>) {
    return commit((p) => changeItem(p, id, patch))
  }
  function add(kind: ItemKind) {
    if (!plan.rooms.length) {
      setLeftTab('build')
      setView('2d')
      setNotice('Draw a closed room before adding furniture.')
      return
    }
    const next = placeNewItem(plan, kind, roomId === 'all' ? item?.roomId || 'room3' : roomId)
    if (!commit((p) => ({ ...p, items: [...p.items, next] }))) return
    setSelected(next.id)
    revealDetails()
    setLeftTab('items')
    setQuery('')
    setNotice(`${next.name} added. Set its actual dimensions in the inspector.`)
  }
  function remove() {
    if (!item || item.locked) return
    commit((p) => ({
      ...p,
      items: p.items.filter((i) => i.id !== item.id),
    }))
    setSelected(null)
  }
  function moveItem(id: string, x: number, z: number) {
    updatePlan(
      project.id,
      floor.id,
      (p) => ({
        ...p,
        items: p.items.map((i) =>
          i.id === id && !i.locked ? { ...i, x: round(x), z: round(z) } : i,
        ),
      }),
      true,
    )
  }
  useEditorShortcuts({
    enabled: view !== 'walk',
    item,
    onUndo: undo,
    onRedo: redo,
    onEscape: () => {
      setSelected(null)
      setHelp(false)
      setShowIssues(false)
    },
    onTool: setTool,
    onUpdateItem: updateItem,
    onRemove: remove,
  })
  function exportPlan() {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
        type: 'application/json',
      }),
      url = URL.createObjectURL(blob),
      link = document.createElement('a')
    link.href = url
    link.download = `${project.name.replace(/[^a-z0-9-]/gi, '-')}.roomwise.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice('Project exported with every floor, dimension, and item.')
  }
  async function importPlan(file?: File) {
    if (!file) return
    try {
      if (workspace.projects.length >= 20)
        throw new Error('This workspace already has 20 projects.')
      if (file.size > 20_000_000) throw new Error('This project file is too large.')
      const next = { ...parseProject(await file.text()), id: crypto.randomUUID() }
      if (
        !commitWorkspace((w) => ({
          ...w,
          activeProjectId: next.id,
          projects: [...w.projects, next],
        }))
      )
        return
      setFloorId(next.floors[0].id)
      setBuildingView(false)
      setView(next.floors[0].plan.rooms.length ? '3d' : '2d')
      setSelected(null)
      setRoomId('all')
      setFitKey((k) => k + 1)
      setNotice(
        'Project imported separately. Your other projects are still available in the project menu.',
      )
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not import this layout.')
    }
  }
  useEffect(() => {
    setSelected(null)
    setRoomId('all')
    setLightingPreview(null)
    setDrawingTool('select')
    setFitKey((k) => k + 1)
    if (!plan.rooms.length) {
      setView('2d')
      setLeftTab('build')
      setBuildingView(false)
    }
  }, [project.id, floor.id])
  useEffect(() => {
    if (roomId !== 'all' && !plan.rooms.some((r) => r.id === roomId)) setRoomId('all')
    if (!plan.rooms.length && view === 'walk') setView('2d')
  }, [plan.rooms, roomId, view])
  function chooseDrawingTool(next: DrawingTool) {
    if (next !== 'select' && window.innerWidth < 1280) setSidebarOpen(false)
    setDrawingTool(next)
    setView('2d')
    setBuildingView(false)
    setSelected(null)
    setTool('orbit')
    if (next === 'window') setOpeningWidth(48)
    else if (next === 'door' || next === 'passage') setOpeningWidth(32)
  }
  const drawing: DrawingProps = {
    tool: drawingTool,
    thickness: drawThickness,
    width: openingWidth,
    onCancel: () => setDrawingTool('select'),
    onDraw: (segments) => commit((p) => addWalls(p, segments, drawThickness)),
    onOpening: (wall, point, kind) => {
      let addedId: string | undefined
      const applied = commit((p) => {
        const next = addOpeningAt(p, wall, point, kind, openingWidth)
        addedId = next.openings.at(-1)!.id
        return next
      })
      if (applied && addedId) {
        setSelected(addedId)
        revealDetails()
        setDrawingTool('select')
      }
    },
  }
  function selectStructure(id: string) {
    setSelected(id)
    revealDetails()
    setView('2d')
    setDrawingTool('select')
  }
  function newProject(example: boolean) {
    if (workspace.projects.length >= 20) return
    const next = example ? exampleProject() : createProject()
    commitWorkspace((w) => ({ ...w, activeProjectId: next.id, projects: [...w.projects, next] }))
    setFloorId(next.floors[0].id)
    setView(example ? '3d' : '2d')
    setLeftTab(example ? 'items' : 'build')
    setSidebarOpen(true)
    setBuildingView(false)
  }
  const sceneProps: EditorSceneProps = {
    plan,
    stackedFloors: buildingView && view === '3d' ? floorElevations(project) : undefined,
    lighting,
    selected,
    roomId,
    tool,
    wallMode: view === 'walk' ? 'full' : wallMode,
    grid,
    snap,
    fitKey,
    onSelect: (id) => {
      setSelected(id)
      if (id) revealDetails()
    },
    onMove: moveItem,
    onDragStart: beginDrag,
    onDragEnd: endDrag,
    issueIds,
  }
  return (
    <div className="app-shell">
      <EditorHeader
        projects={{
          workspace,
          project,
          onSwitch: (id) => {
            commitWorkspace((w) => ({ ...w, activeProjectId: id }))
            setBuildingView(false)
          },
          onNew: newProject,
          onRename: (name) => commitProject((p) => ({ ...p, name })),
        }}
        saveState={saveState}
        canUndo={!!history.past.length}
        canRedo={!!history.future.length}
        onUndo={undo}
        onRedo={redo}
        onImport={importPlan}
        onExport={exportPlan}
      />
      <div
        className={`editor-layout ${sidebarOpen ? '' : 'sidebar-collapsed'} ${inspectorOpen ? '' : 'inspector-collapsed'}`}
      >
        <LibraryPanel
          section={leftTab}
          open={sidebarOpen}
          navigationRef={navigationRef}
          onClose={closeLibrary}
          onNavigate={openLibrary}
          plan={plan}
          roomId={roomId}
          onRoomChange={(id) => {
            setRoomId(id)
            setQuery('')
          }}
          floorCount={project.floors.length}
          floorControls={
            <FloorControls
              project={project}
              floor={floor}
              onSwitch={(id) => {
                setFloorId(id)
                setBuildingView(false)
              }}
              onAdd={(copy) => {
                const next = addFloor(project, copy ? floor : undefined)
                commitProject(() => next)
                setFloorId(next.floors.at(-1)!.id)
                setBuildingView(false)
                setView(copy ? '3d' : '2d')
                setLeftTab(copy ? 'items' : 'build')
              }}
              onDelete={() => {
                if (project.floors.length > 1) {
                  commitProject((p) => ({
                    ...p,
                    floors: p.floors.filter((f) => f.id !== floor.id),
                  }))
                  setBuildingView(false)
                  setNotice('Floor removed. Undo restores it.')
                }
              }}
              onRename={(name) =>
                commitProject((p) => ({
                  ...p,
                  floors: p.floors.map((f) => (f.id === floor.id ? { ...f, name } : f)),
                }))
              }
              building={buildingView}
              onBuilding={() => {
                setBuildingView((v) => !v)
                setView('3d')
                setRoomId('all')
                setSelected(null)
                setFitKey((k) => k + 1)
              }}
            />
          }
        >
          {leftTab === 'build' ? (
            <BuildPanel
              plan={plan}
              drawing={drawing}
              onTool={chooseDrawingTool}
              onThickness={setDrawThickness}
              onWidth={setOpeningWidth}
              onSelect={selectStructure}
              onQuickRoom={(width, depth) => {
                const b = planBounds(plan),
                  x = plan.walls.length ? b.maxX + 12 : 0,
                  z = 0,
                  w = width + drawThickness,
                  d = depth + drawThickness
                commit((p) =>
                  addWalls(
                    p,
                    [
                      [
                        [x, z],
                        [x + w, z],
                      ],
                      [
                        [x + w, z],
                        [x + w, z + d],
                      ],
                      [
                        [x + w, z + d],
                        [x, z + d],
                      ],
                      [
                        [x, z + d],
                        [x, z],
                      ],
                    ],
                    drawThickness,
                  ),
                )
                setFitKey((k) => k + 1)
              }}
            />
          ) : leftTab === 'colors' ? (
            <RoomColors
              plan={plan}
              roomId={roomId}
              onChange={(surface, color) => commit((p) => setRoomFinish(p, roomId, surface, color))}
              onReset={() => commit((p) => resetRoomFinishes(p, roomId))}
              onWalk={() => {
                if (plan.rooms.length) setView('walk')
              }}
            />
          ) : leftTab === 'add' ? (
            <FurnitureLibrary
              query={query}
              onQuery={setQuery}
              onAdd={add}
              hasRooms={!!plan.rooms.length}
            />
          ) : (
            <>
              <ObjectList
                plan={plan}
                roomId={roomId}
                section={leftTab}
                query={query}
                onQuery={setQuery}
                selected={selected}
                unit={unit}
                issueIds={issueIds}
                onSelect={(id) => {
                  setSelected(id)
                  revealDetails()
                }}
                onAddItem={() => openLibrary('add')}
                onAddOpening={() => {
                  openLibrary('build')
                  chooseDrawingTool('door')
                }}
              />
            </>
          )}
        </LibraryPanel>
        <EditorViewport
          scene={sceneProps}
          view={view}
          floorKey={`${project.id}-${floor.id}`}
          floorName={floor.name}
          buildingView={buildingView}
          unit={unit}
          drawing={leftTab === 'build' ? drawing : undefined}
          showClearance={showClearance}
          onExitWalk={() => {
            setView('3d')
            setTool('orbit')
          }}
          onWalkHeight={(height) => commit((p) => ({ ...p, walkHeight: height }))}
          onNotice={setNotice}
          toolbar={
            <EditorToolbar
              view={view}
              onView={(next) => {
                setView(next)
                setTool(next === '2d' ? 'move' : 'orbit')
                if (next === 'walk') {
                  setSelected(null)
                  setHelp(false)
                  setShowIssues(false)
                }
              }}
              hasRooms={!!plan.rooms.length}
              inspectorOpen={inspectorOpen}
              onShowDetails={revealDetails}
              lighting={{
                value: lighting,
                onPreview: setLightingPreview,
                onCommit: (next) => {
                  setLightingPreview(null)
                  commit((p) => ({ ...p, lighting: next }))
                },
              }}
              onFit={() => setFitKey((k) => k + 1)}
              help={help}
              onHelp={() => setHelp((v) => !v)}
            />
          }
          controls={
            view !== 'walk' && (
              <EditorToolDock
                view={view}
                tool={tool}
                onTool={setTool}
                item={item}
                onUpdateItem={updateItem}
                grid={grid}
                onGrid={() => setGrid((v) => !v)}
                snap={snap}
                onSnap={() => setSnap((v) => !v)}
                wallMode={wallMode}
                onWallMode={setWallMode}
                showClearance={showClearance}
                onClearance={() => setShowClearance((v) => !v)}
              />
            )
          }
        >
          {help && (
            <EditorHelp
              onClose={() => setHelp(false)}
              onUseExample={() => {
                commit(() => createInitialPlan())
                setSelected('bed-room3')
                setRoomId('all')
                setHelp(false)
                setNotice('Original measured layout restored. Undo is available.')
              }}
            />
          )}
        </EditorViewport>
        <Inspector
          plan={plan}
          selected={selected}
          roomId={roomId}
          floorName={floor.name}
          unit={unit}
          onUnit={setUnit}
          issues={issues}
          open={inspectorOpen}
          onClose={() => setInspectorOpen(false)}
          onSelect={setSelected}
          onNavigate={openLibrary}
          onChange={commit}
        />
      </div>
      <EditorStatus
        plan={plan}
        floorCount={project.floors.length}
        view={view}
        tool={tool}
        issues={issues}
        showIssues={showIssues}
        onToggleIssues={() => setShowIssues((v) => !v)}
        onCloseIssues={() => setShowIssues(false)}
        onSelectIssue={(id) => {
          setSelected(id)
          revealDetails()
          setShowIssues(false)
        }}
        notice={notice}
        onDismissNotice={() => setNotice('')}
      />
    </div>
  )
}
