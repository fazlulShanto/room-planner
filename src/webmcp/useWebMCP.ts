import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { createWorkspaceStore } from '../workspace/store'
import { createRoomwiseTools, type AgentEdit } from './tools'
import { registerTools, type ModelContext } from './registration'

export type WebMCPStatus = 'unavailable' | 'registering' | 'ready' | 'error'

export function useWebMCP(
  store: ReturnType<typeof createWorkspaceStore>,
  floorId: string,
  onEdit: (edit: AgentEdit) => void,
) {
  const current = useRef({ floorId, onEdit })
  useLayoutEffect(() => {
    current.current = { floorId, onEdit }
  })
  const [status, setStatus] = useState<WebMCPStatus>('unavailable')
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext
    if (!context || typeof context.registerTool !== 'function') return
    const controller = new AbortController()
    let mounted = true
    setStatus('registering')
    const tools = createRoomwiseTools(
      store,
      () => current.current.floorId,
      (edit) => current.current.onEdit(edit),
    )
    void registerTools(context, tools, controller).then(
      () => {
        if (mounted) setStatus('ready')
      },
      () => {
        if (mounted) setStatus('error')
      },
    )
    return () => {
      mounted = false
      controller.abort()
    }
  }, [store])
  return status
}
