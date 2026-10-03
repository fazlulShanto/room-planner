import { X } from 'lucide-react'

export default function EditorHelp({
  onClose,
  onUseExample,
}: {
  onClose: () => void
  onUseExample: () => void
}) {
  return (
    <div className="help-popover">
      <div className="popover-title">
        <strong>Make room for your ideas.</strong>
        <button onClick={onClose} aria-label="Close help">
          <X size={16} />
        </button>
      </div>
      <p>
        Select an item, then enter its exact dimensions. Switch to Move to drag it, or use the
        position fields for precision.
      </p>
      <div className="shortcut">
        <span>Move furniture</span>
        <kbd>M</kbd>
      </div>
      <div className="shortcut">
        <span>Orbit / select</span>
        <kbd>V</kbd>
      </div>
      <div className="shortcut">
        <span>Rotate 90°</span>
        <kbd>R</kbd>
      </div>
      <div className="shortcut">
        <span>Nudge 1″ / 12″</span>
        <span>
          <kbd>↑</kbd> / <kbd>⇧ ↑</kbd>
        </span>
      </div>
      <div className="shortcut">
        <span>Undo</span>
        <kbd>⌘ / Ctrl Z</kbd>
      </div>
      <p>
        Walk mode: WASD or arrows move, Q/E turn, and F opens or closes the door at the crosshair.
        Choose Mouse look to look around without dragging. Escape releases the mouse; press again to
        exit. Camera height defaults to 5′5″ and is adjustable in the walk controls. Choose a room
        to start there.
      </p>
      <p>
        Your layout stays in this browser. Export it to keep a file or move it to another device.
      </p>
      <button className="quiet-button reset-button" onClick={onUseExample}>
        Use example on this floor
      </button>
    </div>
  )
}
