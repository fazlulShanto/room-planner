import { validateWorkspace, type Workspace } from '../projects.ts'

const HISTORY_LIMIT = 60
export type WorkspaceSnapshot = {
  past: Workspace[]
  present: Workspace
  future: Workspace[]
}
type Update = (workspace: Workspace) => Workspace
const equal = (a: Workspace, b: Workspace) => a === b || JSON.stringify(a) === JSON.stringify(b)

/** Owns validated edits and undo history. Updates must return immutable values. */
export function createWorkspaceStore(initial: Workspace) {
  let snapshot: WorkspaceSnapshot = { past: [], present: validateWorkspace(initial), future: [] }
  let transaction: Workspace | null = null
  const listeners = new Set<() => void>()
  function publish(next: WorkspaceSnapshot) {
    if (next === snapshot) return
    snapshot = next
    listeners.forEach((listener) => listener())
  }
  function record(before: Workspace, next: Workspace): WorkspaceSnapshot {
    if (equal(before, next)) return snapshot
    return { past: [...snapshot.past, before].slice(-HISTORY_LIMIT), present: next, future: [] }
  }
  function endTransaction() {
    const before = transaction
    transaction = null
    if (before) publish(record(before, snapshot.present))
  }
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    commit(update: Update) {
      // Validate before touching history: failures preserve both undo and redo.
      const next = validateWorkspace(update(snapshot.present))
      endTransaction()
      publish(record(snapshot.present, next))
    },
    beginTransaction() {
      endTransaction()
      transaction = snapshot.present
    },
    preview(update: Update) {
      // Late pointer events after a committed edit must not create another edit.
      if (!transaction) return
      const next = validateWorkspace(update(snapshot.present))
      if (!equal(snapshot.present, next)) publish({ ...snapshot, present: next })
    },
    endTransaction,
    undo() {
      endTransaction()
      if (!snapshot.past.length) return
      publish({
        past: snapshot.past.slice(0, -1),
        present: snapshot.past.at(-1)!,
        future: [snapshot.present, ...snapshot.future],
      })
    },
    redo() {
      endTransaction()
      if (!snapshot.future.length) return
      publish({
        past: [...snapshot.past, snapshot.present].slice(-HISTORY_LIMIT),
        present: snapshot.future[0],
        future: snapshot.future.slice(1),
      })
    },
  }
}
