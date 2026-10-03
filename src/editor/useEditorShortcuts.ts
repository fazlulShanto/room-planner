import { useEffect } from 'react'
import { normalizedAngle, type Item } from '../model'

type Options = {
  enabled: boolean
  item: Item | undefined
  onUndo: () => void
  onRedo: () => void
  onEscape: () => void
  onTool: (tool: 'orbit' | 'move') => void
  onUpdateItem: (id: string, patch: Partial<Item>) => void
  onRemove: () => void
}

export function useEditorShortcuts({
  enabled,
  item,
  onUndo,
  onRedo,
  onEscape,
  onTool,
  onUpdateItem,
  onRemove,
}: Options) {
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable)
      )
        return
      if (!enabled) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) onRedo()
        else onUndo()
        return
      }
      if (e.key === 'Escape') {
        onEscape()
      }
      if (e.key.toLowerCase() === 'v') onTool('orbit')
      if (e.key.toLowerCase() === 'm') onTool('move')
      if (!item || item.locked) return
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault()
        onUpdateItem(item.id, {
          rotation: normalizedAngle(item.rotation + 90),
        })
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        onRemove()
      }
      const shift = e.shiftKey ? 12 : 1,
        offsets: Record<string, [number, number]> = {
          ArrowLeft: [-shift, 0],
          ArrowRight: [shift, 0],
          ArrowUp: [0, -shift],
          ArrowDown: [0, shift],
        }
      if (offsets[e.key]) {
        e.preventDefault()
        onUpdateItem(item.id, {
          x: item.x + offsets[e.key][0],
          z: item.z + offsets[e.key][1],
        })
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  })
}
