# Roomwise — a planner for your home

A local React + TypeScript + React Three Fiber project with an interactive 3D home, a measured 2D floor plan, and furniture whose dimensions you control. No account or remote model service is required.

## Run

Use Node.js 22.18+ (the tests use Node's built-in TypeScript support).

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5178. The development server binds to your own computer only.

```sh
npm run check        # formatting, all tests, TypeScript, and production build
npm test             # geometry, validation, persistence, and undo/redo behavior
npm run typecheck    # strict TypeScript and unused code checks
npm run format       # apply the shared formatting rules
npm run preview      # serve the production build locally
```

## Create a project and draw floors

- Open the project name in the top bar and choose **New blank project**. Switch among saved projects there, rename them, or start from the example home. Your existing home is kept as a separate project.
- Open **Build** in the left panel. **Draw walls** connects clicked endpoints; closing a loop creates a room automatically. Walls snap to existing endpoints and edges. Hold Shift for 45° increments; press Escape to finish. **Draw room** creates four walls by clicking opposite corners or dragging a rectangle. Adjoining rooms reuse shared walls.
- For exact rectangular dimensions, expand **Room with exact dimensions** and enter clear interior width/depth in inches. Select a wall to edit its length, endpoints, or thickness; joined endpoints follow. Select a room to rename it and choose Room, Kitchen, Washroom, or Corridor. Room type controls its floor material. Partitions split rooms automatically, and removing a partition merges them.
- **Place door**, **Place window**, and **Open passage** let you click any wall to add an opening. Select it to edit dimensions, position, hinge, and swing direction or remove it. Removing a wall also removes its openings; Undo restores both.
- Choose the active floor near the top of the left panel. The **+** menu adds a blank floor, duplicates the current floor, renames it, or removes it. Ground, first, second, and additional floors have independent walls, furniture, openings, finishes, and ceiling heights. The adjacent layers button shows the complete building in 3D, with floor elevations based on the floor below plus an 8-inch slab allowance. Editing and Walk operate on the active floor.
- New browser installations start blank. Existing single-floor layouts migrate automatically without changing the original stored copy. Projects autosave locally; **Export layout** backs up every floor in the active project. **Import** accepts both the older single-floor format and new multi-floor projects, and adds them as separate projects. Undo/redo includes building edits, floor changes, and imports.

## Arrange your home

- Select an item in the scene or the left library. Enter its exact width, length/depth, height, position, rotation, and color in the inspector.
- Switch between feet + inches, inches, and centimeters. Fractional measurements are supported; press Enter or leave the field to apply. Escape cancels the current measurement edit.
- Use **Add item** for beds, steel almirahs, dressing tables, wardrobes, RFL-style plastic racks, one-seat/two-seat/corner sofas, tea tables, wall cabinets, refrigerators, washing machines, reading tables, dining tables, wooden chairs, or generic custom objects. Catalog sizes are editable starting points. The rack uses your 20″ width × 12″ depth × 27″ height. Starting estimates for the others (width × depth × height) are steel almirah 36 × 20 × 72″, dressing table 36 × 18 × 66″, and wardrobe 48 × 22 × 72″. Dressing-table height includes the mirror. All presets share one catalog; adding a preset does not change your existing furniture. The dining model includes the table footprint only; add chairs separately. The chair follows your reference: 41 × 45 × 100 cm overall, with a 45 cm seat height and 37 cm back width. Width, depth, and total height are editable; the seat and slatted back scale proportionally.
- **Bottom above floor** sets mounting height. A cabinet can sit above a bed or appliance without triggering a footprint-only collision. New wall cabinets prefer a position against a room wall when space is available.
- **3D view** uses a 40° perspective camera so nearby walls appear larger and receding walls converge naturally. The 2D floor plan keeps its measured, flat projection. In **3D view**, drag to orbit, right-drag to pan, and scroll to zoom. Choose **Move furniture** to drag items. In **Floor plan**, drag furniture directly; drag blank space to pan.
- Use the left tool rail for **Build**, **Items**, **Add item**, **Openings**, and **Colors**. Click the active tool again, the panel's collapse button, or press Escape within the panel to close it; the tools stay available. **Add item** has a searchable catalog grouped by use, with two columns where space allows. Search also matches categories and descriptions.
- The library is 380 pixels wide on desktop. Below 1280 pixels, panels float over the canvas; choosing an item reveals its details, and choosing a drawing tool closes the library so you can place it. Collapse details with its header button and reopen it from the canvas toolbar. Hiding details keeps your selection, and the camera keeps its angle when panels resize the canvas. A single compact footer combines navigation hints, layout counts, and the placement check.
- Switch between cutaway, full, and hidden walls. Cutaway keeps the far exterior walls tall and lowers the near walls as you orbit. Choose a room in the library to focus the camera. **Fit view** restores its framing.
- Choose **Walk** to explore at a default **65-inch (5′5″) eye height**. Open **Camera height** in the walk controls to adjust the slider or use seated/default/tall presets; the choice saves with the layout. Camera height stays below the ceiling, and collision clearance follows it. Use W/A/S/D or arrows to move, Q/E to turn, and Shift to move faster. Drag to look, or click **Mouse look** to capture the pointer and turn simply by moving the mouse. Escape releases the mouse; Escape again or **Exit walk** returns to the editor. Browsers without pointer capture use mouse movement over the view as a fallback. Touch dragging and the on-screen movement pad remain available.
- Aim the crosshair at a nearby door (within 10 feet) and press **F**, or click its prompt, to open/close it. Walls and furniture block targeting, closed doors block walking, and you must step clear of a doorway before closing it. Door states are temporary to the walk session and do not change door sizes, hinge settings, or the saved layout. Open passages are not doors. Choose a room or use the restart button to start walking there.
- The 3D view uses light stone flooring in bedrooms and the corridor, larger neutral tiles in the kitchen, and smaller blue-gray tiles in washrooms. Plaster walls, contrasting section caps, skirting, and dark window frames sit over a charcoal application grid. These finishes are visual design choices, not measurements of your actual materials.
- Open the **sun/clock button** above the 3D scene for lighting. Drag the 24-hour slider (15-minute steps), enter a time, or choose Morning, Noon, Evening, or Night. From **05:00 to 19:00**, sunlight changes direction, warmth, and shadow length with the time. **19:00–05:00** uses warm electric room lights with no cast shadows. The **Sun shadows** switch disables daytime shadows and remembers your preference overnight. Lighting works in 3D and Walk mode, autosaves with the layout, exports, and supports undo/redo. A slider gesture creates one undo step. This is a visual sun path, not a location/date/compass-based daylight calculation.
- Open **Colors** to choose wall, ceiling, and floor colors with swatches, a color picker, or a hex value. Choose a room above the controls, or **All except washrooms** to apply a finish across bedrooms, kitchen, and corridor. Shared walls are painted independently on each room-facing side, and bathroom finishes are excluded. Existing textures stay visible; ceilings are shown in Walk mode. Mixed means the rooms have different colors. Reset restores the original finishes for the selected scope. Colors autosave, export, and support undo/redo.
- Use **Openings** to select an existing door or window and change dimensions or its position along the wall. Window sill heights are editable. **Opening type → Open passage (no door)** removes the door leaf and swing area while keeping the hole in the wall; choose **Door** to restore it. **Hinge side** changes the attachment edge independently of **Reverse swing direction**. Hinge labels refer to the 2D floor plan. These settings are saved, exported, and undoable, and appear in both 2D and 3D.
- Sofas have editable overall width, depth, and height. **Sofa shape** switches between one seat, two seats, and an L-shaped corner while preserving your entered dimensions. For corner sofas, choose the long section’s left/right side (when facing the sofa), **Body depth**, and **Return width**. Shape proportions scale with the overall dimensions. The L-shaped footprint is shared by the 2D outline, 3D outline, collision checks, and walking, so the open corner stays usable. Sofa and tea-table dimensions are starting estimates.
- Placement notes flag overlapping furniture, wall intersections, door swing areas, objects beyond their assigned room, and objects above the ceiling. These are conservative box/clearance checks; they do not calculate circulation comfort or furniture assembly access.
- Undo/redo, duplicate, and position locking support layout experiments. Keyboard shortcuts: V select/orbit, M move, R rotate 90°, arrow keys nudge 1 inch (Shift: 12 inches), Delete/Backspace remove, Escape deselect, Cmd/Ctrl+Z undo, Shift+Cmd/Ctrl+Z redo.

Changes save automatically in this browser's local storage. **Export layout** saves the active project as a JSON backup, including all floors; **Import** adds a saved project without replacing the others. Browser storage is local to its browser profile and the URL; it does not synchronize between browsers or devices.

## Measurements in the starting layout

Room dimensions are clear interior dimensions, in inches. X increases rightward and Z increases downward from the sketch's top-left interior corner.

| Space          | Width × depth       | Bed width × length |
| -------------- | ------------------- | ------------------ |
| Room 3         | 206 × 141           | 60 × 84 (5′ × 7′)  |
| Room 2         | 120 × 97            | 72 × 84 (6′ × 7′)  |
| Room 1         | 120 × 125           | 60 × 84 (5′ × 7′)  |
| Kitchen        | 96 × 67             | —                  |
| Corridor       | 35 × 228            | —                  |
| Upper washroom | 96.8 × 67, inferred | —                  |
| Side washroom  | 60 × 97, estimated  | —                  |

Walls are 6 inches thick, except the 13.2-inch kitchen divider. The upper partition follows the sketch's chain: 63-inch wall + 33-inch kitchen opening + 13.2-inch divider + 27-inch door + 69.8-inch wall = 206 inches. Room 3 remains wider than the rooms and corridor below it.

Windows are 48 inches high with 30-inch sills. Room 3's window is 72 inches wide, Room 1's is 60, Room 2's is 48; these are on the left exterior wall. The kitchen's 36-inch window is on the top wall as a draft location. Windows start centered on their room wall sections and can be moved along those walls.

The kitchen has a 33-inch open passage with no door. Room 1’s door is hinged at the lower edge of the opening, away from the dividing wall, and still opens inward. Door widths: upper washroom 27, Room 3 36, Room 2 35, Room 1 37, side washroom 30, entrance 32 inches. Door height (82 inches), ceiling height (102 inches), and bed overall height (36 inches) are editable starting assumptions. Washroom dimensions, exact opening offsets and door swing directions need confirmation. Bed positions are draft arrangements.

## Project structure

- `src/projects.ts`, `src/ProjectControls.tsx`: projects, floors, legacy migration, and project import/export.
- `src/building.ts`, `src/BuildPanel.tsx`: wall drawing, shared-wall reuse, room detection, and building controls.
- `src/model.ts`: measured seed layout, types, inch-based geometry, collision checks, catalog, and JSON validation.
- `src/Scene.tsx`: React Three Fiber scene, procedural furniture, actual wall openings, windows, lighting, orbit camera, and 3D drag behavior.
- `src/homeFurniture.ts`: resizable steel almirah, mirrored dressing table, wooden wardrobe, open plastic rack, sofas, tea-table, and wooden-chair model parts, kept within the entered dimensions.
- `src/camera.ts`: perspective overview camera and framing that includes full wall heights.
- `src/lighting.ts`, `src/SceneLighting.tsx`, `src/LightingControls.tsx`: day/night lighting, moving sunlight, and the 24-hour controls.
- `src/finishes.ts`, `src/RoomColors.tsx`: per-room finishes, shared-wall face assignment, and color controls.
- `src/Architecture.tsx`: deterministic procedural floor/wall textures and camera-aware wall cutaways.
- `src/WalkControls.tsx`, `src/WalkPad.tsx`, `src/walk.ts`: first-person camera, accessible movement controls, and tested collision geometry.
- `src/Plan2D.tsx`: measured SVG editor using the same layout state.
- `src/App.tsx`: shared editor state, project/floor actions, and composition of the editor panels.
- `src/editor/EditorHeader.tsx`, `LibraryPanel.tsx`, `EditorToolbar.tsx`, `EditorToolDock.tsx`, `EditorHelp.tsx`, `EditorStatus.tsx`: editor layout, navigation, controls, and feedback.
- `src/editor/EditorViewport.tsx`: 2D/3D rendering, loading/fallback UI, and temporary walk state and controls.
- `src/editor/useEditorShortcuts.ts`: keyboard shortcuts with input-field and walk-mode guards.
- `src/editor/`: also owns the inspector, measurement fields, grouped object list, shared buttons, canvas fallback, and pure item/opening edit commands.
- `src/workspace/store.ts`: validated immutable edits, bounded undo/redo, and drag transactions, independent of React and browser storage.
- `src/workspace/useWorkspace.ts`: connects the store to React, debounced autosave, and user-visible save/error feedback.
- `src/styles.css`: the single stylesheet entry point. `src/styles/` owns the base theme, editor shell, library, inspector, build controls, lighting, walking, canvas, and feedback styles.
- `tests/*.test.mjs`: geometry, measurements, import validation, storage recovery, edit history, and walking tests using Node's built-in test runner.

All stored values stay in inches. Only the 3D renderer converts to meters, so switching display units does not rescale the plan. Furniture is generated from dimensions instead of stretching a fixed imported model. Adding a new shape means extending `ItemKind`, `CATALOG`, the icons, and the renderer's furniture component.

Room outlines are detected from enclosed walls, including angled and concave rooms. Room dimensions display the interior bounding box. Changing the example seed does not overwrite an already-saved browser project. The app uses WebGL for 3D and provides the 2D editor as a fallback if 3D initialization fails.

## Maintaining the editor

Keep state used by several panels in `App.tsx`; keep feature-local state with its owner. The viewport owns walk input, door state, and camera-height previews, while the header owns the import file picker. The library and viewport accept their panels and controls as JSX so they do not need every editor action passed through them.

Use immutable updates through `useWorkspace` for all persistent changes. The store runs the same validators used by imported and restored projects before publishing a change. Validation failures leave the current workspace and undo/redo history intact. A drag begins a transaction, previews positions, and commits one undo step on release. Project and floor switching keep their existing behavior.

`loadWorkspace` preserves unreadable stored data in a recovery key before allowing a fresh workspace to autosave. If that backup fails, or storage cannot be read, `canSave` stays false for the session. The UI remains usable and Export remains available; autosave cannot overwrite the unreadable original.

Add styles to the file that owns the feature. Keep each selector's base rule in one place and put its responsive changes beside it. Use explicit state classes or ARIA/data attributes instead of selecting an element by its child order. Shared controls use local CSS custom properties when the library and inspector need different sizes. Avoid appending another override sheet.

Prettier provides one format across TypeScript, JSX, CSS, and tests. `npm run check` is also the GitHub Actions check for pushes and pull requests. The test suite uses Node's built-in runner and requires Node 22.18 or later. Existing browser projects and version-one JSON imports remain compatible.

## Release checks and current limits

Before publishing, smoke-test drawing, furniture edits, drag undo/redo, import/export, and reload persistence in the target browsers, at desktop and phone widths. Include a device with WebGL disabled to exercise the 2D fallback. The 3D engine is loaded separately, but remains the largest bundle; test startup and interaction on the lowest-powered device you intend to support.

Storage is device-local and quota-limited. This app has no account synchronization, server backups, or coordination between simultaneous editing tabs. Export is the portable backup. A hosted release also needs HTTPS and deployment-specific caching; deploy the generated `dist/` together so the entry page and hashed assets stay in sync. The local Vite preview is for verification.
