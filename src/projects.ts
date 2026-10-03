import { createInitialPlan, parsePlan, validatePlan, type Plan } from './model.ts'

export type Floor = { id: string; name: string; plan: Plan }
export type Project = { version: 2; id: string; name: string; floors: Floor[] }
export type Workspace = { version: 2; activeProjectId: string; projects: Project[] }
export type LoadedWorkspace = { workspace: Workspace; message: string; canSave: boolean }
export const WORKSPACE_KEY = 'roomwise-workspace-v2'
export const LEGACY_KEY = 'roomwise-layout-v1'
export const blankPlan = (name = 'Untitled home'): Plan => ({
  version: 1,
  name,
  ceiling: 108,
  rooms: [],
  walls: [],
  openings: [],
  items: [],
  autoRooms: true,
})
export function createProject(plan = blankPlan()): Project {
  return {
    version: 2,
    id: crypto.randomUUID(),
    name: plan.name,
    floors: [{ id: crypto.randomUUID(), name: 'Ground floor', plan }],
  }
}
export function floorName(index: number) {
  return index === 0
    ? 'Ground floor'
    : index === 1
      ? 'First floor'
      : index === 2
        ? 'Second floor'
        : `Floor ${index}`
}
export function addFloor(project: Project, source?: Floor): Project {
  if (project.floors.length >= 20) throw new Error('A project can have up to 20 floors.')
  const plan = source
    ? structuredClone(source.plan)
    : { ...blankPlan(project.name), ceiling: project.floors.at(-1)!.plan.ceiling }
  return {
    ...project,
    floors: [
      ...project.floors,
      { id: crypto.randomUUID(), name: floorName(project.floors.length), plan },
    ],
  }
}
export function parseProject(input: string): Project {
  if (input.length > 20_000_000) throw new Error('This project file is too large.')
  const data = JSON.parse(input)
  if (data?.version === 1) return createProject(parsePlan(input))
  const project = validateProject(data)
  // File limits apply at import, while ordinary edits validate without serializing.
  for (const floor of project.floors) {
    if (JSON.stringify(floor.plan).length > 2_000_000)
      throw new Error('This layout file is too large.')
  }
  return project
}
export function validateProject(input: unknown): Project {
  const data = input as Project
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    data.version !== 2 ||
    typeof data.name !== 'string' ||
    !data.name.trim() ||
    data.name.length > 120 ||
    typeof data.id !== 'string' ||
    !data.id ||
    !Array.isArray(data.floors) ||
    !data.floors.length ||
    data.floors.length > 20
  )
    throw new Error('This is not a supported Roomwise project.')
  const ids = new Set<string>()
  for (const floor of data.floors) {
    if (
      !floor ||
      typeof floor !== 'object' ||
      Array.isArray(floor) ||
      typeof floor.id !== 'string' ||
      !floor.id ||
      ids.has(floor.id) ||
      typeof floor.name !== 'string' ||
      !floor.name.trim() ||
      floor.name.length > 120
    )
      throw new Error('A floor has an invalid name or ID.')
    ids.add(floor.id)
    validatePlan(floor.plan)
  }
  return data
}
export function validateWorkspace(input: unknown): Workspace {
  const data = input as Workspace
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    data.version !== 2 ||
    !Array.isArray(data.projects) ||
    !data.projects.length ||
    data.projects.length > 20
  )
    throw new Error('This is not a supported Roomwise workspace.')
  data.projects.forEach(validateProject)
  if (
    new Set(data.projects.map((p) => p.id)).size !== data.projects.length ||
    !data.projects.some((p) => p.id === data.activeProjectId)
  )
    throw new Error('The workspace contains duplicate projects or has no active project.')
  return data
}
export function loadWorkspace(storage: Pick<Storage, 'getItem' | 'setItem'>): LoadedWorkspace {
  const wrap = (project: Project) => ({
    version: 2 as const,
    activeProjectId: project.id,
    projects: [project],
  })
  let message = '',
    canSave = true
  const preserve = (key: string, saved: string, label: string) => {
    try {
      storage.setItem(`${key}-recovery`, saved)
      if (canSave) message = `Saved ${label} could not be read. A recovery copy was kept.`
    } catch {
      if (canSave)
        message = `Saved ${label} could not be read, and a recovery copy could not be saved. Autosave is paused to preserve the original. Export your project to keep changes.`
      canSave = false
    }
  }
  try {
    const saved = storage.getItem(WORKSPACE_KEY)
    if (saved) {
      try {
        return { workspace: validateWorkspace(JSON.parse(saved)), message, canSave }
      } catch {
        preserve(WORKSPACE_KEY, saved, 'workspace')
      }
    }
    const legacy = storage.getItem(LEGACY_KEY)
    if (legacy) {
      try {
        return { workspace: wrap(createProject(parsePlan(legacy))), message, canSave }
      } catch {
        preserve(LEGACY_KEY, legacy, 'layout')
      }
    }
  } catch {
    canSave = false
    message = 'Browser storage is unavailable. Autosave is paused. Export your project to keep it.'
  }
  return { workspace: wrap(createProject()), message, canSave }
}
export const exampleProject = () => createProject(createInitialPlan())
export function floorElevations(project: Project) {
  let elevation = 0
  return project.floors.map((floor) => {
    const entry = { ...floor, elevation }
    elevation += floor.plan.ceiling + 8
    return entry
  })
}
