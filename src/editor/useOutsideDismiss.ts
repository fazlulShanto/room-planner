import { useEffect, useRef, type RefObject } from 'react'

/** Require both ends of a click outside, so dragging a control out never dismisses it. */
export function useOutsideDismiss<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onDismiss: () => void,
) {
  const startedOutside = useRef(false)
  useEffect(() => {
    function isOutside(event: MouseEvent) {
      const element = ref.current
      if (!element || !(event.target instanceof Element)) return false
      const trigger = event.target.closest('[aria-controls]')
      if (element.id && trigger?.getAttribute('aria-controls') === element.id) return false
      if (element instanceof HTMLDialogElement) {
        const bounds = element.getBoundingClientRect()
        return (
          event.target === element &&
          (event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom)
        )
      }
      return !element.contains(event.target)
    }
    const down = (event: PointerEvent) => {
      startedOutside.current = event.button === 0 && isOutside(event)
    }
    const cancel = () => {
      startedOutside.current = false
    }
    const click = (event: MouseEvent) => {
      const dismiss = startedOutside.current && isOutside(event)
      startedOutside.current = false
      if (dismiss) onDismiss()
    }
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('pointercancel', cancel, true)
    document.addEventListener('click', click, true)
    return () => {
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('pointercancel', cancel, true)
      document.removeEventListener('click', click, true)
    }
  }, [ref, onDismiss])
}

export function useDismissibleDetails() {
  const ref = useRef<HTMLDetailsElement>(null)
  useOutsideDismiss(ref, () => {
    if (ref.current) ref.current.open = false
  })
  return ref
}
