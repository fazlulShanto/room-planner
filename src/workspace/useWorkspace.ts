import { useEffect, useState, useSyncExternalStore } from 'react'
import { loadWorkspace, WORKSPACE_KEY, type Project, type Workspace } from '../projects'
import type { Plan } from '../model'
import { createWorkspaceStore } from './store'

function load() {
  // Accessing window.localStorage itself can throw in restricted browsers.
  try {
    return loadWorkspace(window.localStorage)
  } catch {
    return {
      ...loadWorkspace({ getItem: () => null, setItem: () => {} }),
      canSave: false,
      message: 'Browser storage is unavailable. Export your project to keep it.',
    }
  }
}

/** Browser persistence and user-visible errors wrap the tested workspace store. */
export function useWorkspace() {
  const [initial] = useState(load)
  const [store] = useState(() => createWorkspaceStore(initial.workspace))
  const history = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const workspace = history.present
  const [notice, setNotice] = useState(initial.message)
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'error'>(
    initial.canSave ? 'saving' : 'error',
  )

  useEffect(() => {
    if (!initial.canSave) return
    setSaveState('saving')
    const save = () => {
      try {
        localStorage.setItem(WORKSPACE_KEY, JSON.stringify(store.getSnapshot().present))
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }
    const timer = window.setTimeout(save, 250)
    window.addEventListener('pagehide', save)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pagehide', save)
    }
  }, [workspace, initial.canSave, store])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 6000)
    return () => window.clearTimeout(timer)
  }, [notice])

  function apply(update: (workspace: Workspace) => Workspace, preview = false) {
    try {
      if (preview) store.preview(update)
      else store.commit(update)
      return true
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'This change could not be applied.')
      return false
    }
  }
  function updateProject(projectId: string, update: (project: Project) => Project) {
    return apply((w) => ({
      ...w,
      projects: w.projects.map((p) => (p.id === projectId ? update(p) : p)),
    }))
  }
  function updatePlan(
    projectId: string,
    floorId: string,
    update: (plan: Plan) => Plan,
    preview = false,
  ) {
    return apply(
      (w) => ({
        ...w,
        projects: w.projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                floors: p.floors.map((f) =>
                  f.id === floorId ? { ...f, plan: update(f.plan) } : f,
                ),
              }
            : p,
        ),
      }),
      preview,
    )
  }
  return {
    workspace,
    history,
    notice,
    setNotice,
    saveState,
    commitWorkspace: apply,
    updateProject,
    updatePlan,
    undo: store.undo,
    redo: store.redo,
    beginDrag: store.beginTransaction,
    endDrag: store.endTransaction,
  }
}
