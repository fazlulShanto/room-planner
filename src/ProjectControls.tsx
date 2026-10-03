import { Layers, Plus, Copy, FolderOpen, Trash2 } from 'lucide-react'
import type { Floor, Project, Workspace } from './projects'
export function ProjectMenu({
  workspace,
  project,
  onSwitch,
  onNew,
  onRename,
}: {
  workspace: Workspace
  project: Project
  onSwitch: (id: string) => void
  onNew: (example: boolean) => void
  onRename: (name: string) => void
}) {
  return (
    <details className="project-menu">
      <summary title="Projects">
        <FolderOpen size={15} />
        <span>{project.name}</span>
      </summary>
      <div className="project-popover">
        <label className="build-field">
          Saved projects
          <select
            aria-label="Saved projects"
            value={project.id}
            onChange={(e) => onSwitch(e.target.value)}
          >
            {workspace.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="build-field">
          Project name
          <input
            aria-label="Project name"
            key={project.id + project.name}
            defaultValue={project.name}
            maxLength={120}
            onBlur={(e) => {
              if (e.target.value.trim()) onRename(e.target.value.trim())
            }}
          />
        </label>
        <button
          className="primary-button full-width"
          disabled={workspace.projects.length >= 20}
          onClick={(e) => {
            onNew(false)
            e.currentTarget.closest('details')?.removeAttribute('open')
          }}
        >
          <Plus size={14} />
          New blank project
        </button>
        <button
          className="quiet-button full-width"
          disabled={workspace.projects.length >= 20}
          onClick={(e) => {
            onNew(true)
            e.currentTarget.closest('details')?.removeAttribute('open')
          }}
        >
          New from example home
        </button>
        <p className="build-help">
          Projects are saved separately on this device. Export a project to keep a file backup.
        </p>
      </div>
    </details>
  )
}
export function FloorControls({
  project,
  floor,
  onSwitch,
  onAdd,
  onDelete,
  onRename,
  building,
  onBuilding,
}: {
  project: Project
  floor: Floor
  onSwitch: (id: string) => void
  onAdd: (copy: boolean) => void
  onDelete: () => void
  onRename: (name: string) => void
  building: boolean
  onBuilding: () => void
}) {
  return (
    <div className="floor-controls">
      <label>
        <Layers size={14} />
        <select
          aria-label="Active floor"
          value={floor.id}
          onChange={(e) => onSwitch(e.target.value)}
        >
          {project.floors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </label>
      <details className="floor-menu">
        <summary aria-label="Manage floors" title="Manage floors">
          <Plus size={15} />
        </summary>
        <div className="floor-popover">
          <label className="build-field">
            Floor name
            <input
              aria-label="Floor name"
              key={floor.id + floor.name}
              defaultValue={floor.name}
              maxLength={120}
              onBlur={(e) => {
                if (e.target.value.trim()) onRename(e.target.value.trim())
              }}
            />
          </label>
          <button
            className="outline-button full-width"
            disabled={project.floors.length >= 20}
            onClick={() => onAdd(false)}
          >
            <Plus size={14} />
            Add blank floor
          </button>
          <button
            className="quiet-button full-width"
            disabled={project.floors.length >= 20}
            onClick={() => onAdd(true)}
          >
            <Copy size={14} />
            Duplicate this floor
          </button>
          <button
            className="quiet-button full-width"
            disabled={project.floors.length < 2}
            onClick={onDelete}
          >
            <Trash2 size={14} />
            Remove this floor
          </button>
          <p className="build-help">
            Each floor has its own walls, rooms, items, and ceiling height. Undo restores removed
            floors.
          </p>
        </div>
      </details>
      {project.floors.length > 1 && (
        <button
          className={`floor-overview ${building ? 'active' : ''}`}
          aria-pressed={building}
          onClick={onBuilding}
          title="Show all floors in 3D"
          aria-label="Show all floors in 3D"
        >
          <Layers size={15} />
        </button>
      )}
    </div>
  )
}
