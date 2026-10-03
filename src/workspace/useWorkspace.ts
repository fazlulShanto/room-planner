import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { loadWorkspace, WORKSPACE_KEY, type Project, type Workspace } from '../projects'
import type { Plan } from '../model'
import { createWorkspaceStore } from './store'
import {
  addSharedProject,
  hasSharedProject,
  readSharedProject,
  withoutSharedProject,
} from '../sharing'

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
  const [sharedLink, setSharedLink] = useState<{ error: string } | null>(() =>
    hasSharedProject(new URL(window.location.href)) ? { error: '' } : null,
  )
  const pendingSharedUrl = useRef<string | null>(null)

  useEffect(() => {
    let request = 0
    let openingUrl: string | null = null
    async function openLink() {
      const url = new URL(window.location.href)
      // A same-document navigation can emit both popstate and hashchange.
      if (url.href === openingUrl || url.href === pendingSharedUrl.current) return
      const current = ++request
      pendingSharedUrl.current = null
      if (!hasSharedProject(url)) {
        openingUrl = null
        setSharedLink(null)
        return
      }
      openingUrl = url.href
      setSharedLink({ error: '' })
      try {
        const shared = await readSharedProject(url)
        if (current !== request || !shared) return
        store.commit((workspace) => addSharedProject(workspace, shared))
        pendingSharedUrl.current = url.href
        setSharedLink(null)
        setNotice(
          'Shared project opened as a separate copy. Your other projects are in the project menu.',
        )
      } catch (error) {
        if (current === request)
          setSharedLink({
            error: error instanceof Error ? error.message : 'Could not open this share link.',
          })
      } finally {
        if (current === request) openingUrl = null
      }
    }
    void openLink()
    window.addEventListener('hashchange', openLink)
    window.addEventListener('popstate', openLink)
    return () => {
      request++
      window.removeEventListener('hashchange', openLink)
      window.removeEventListener('popstate', openLink)
    }
  }, [store])

  useEffect(() => {
    if (!initial.canSave) return
    setSaveState('saving')
    const save = () => {
      try {
        localStorage.setItem(WORKSPACE_KEY, JSON.stringify(store.getSnapshot().present))
        setSaveState('saved')
      } catch {
        setSaveState('error')
        return
      }
      // Only consume the URL after saving. Reload then keeps edits without importing
      // another copy; if storage is unavailable, the original snapshot remains usable.
      const source = pendingSharedUrl.current
      if (source && window.location.href === source) {
        try {
          window.history.replaceState(
            window.history.state,
            '',
            withoutSharedProject(new URL(source)),
          )
          pendingSharedUrl.current = null
        } catch {
          // Saving succeeded. A restricted History API should not report a save failure.
        }
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
    store,
    workspace,
    history,
    notice,
    setNotice,
    saveState,
    sharedLink,
    dismissSharedLink: () => setSharedLink(null),
    commitWorkspace: apply,
    updateProject,
    updatePlan,
    undo: store.undo,
    redo: store.redo,
    beginDrag: store.beginTransaction,
    endDrag: store.endTransaction,
  }
}
