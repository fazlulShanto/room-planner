import { X } from 'lucide-react'
import type { WebMCPStatus } from '../webmcp/useWebMCP'

export default function EditorHelp({
  onClose,
  onUseExample,
  webMCPStatus,
}: {
  onClose: () => void
  onUseExample: () => void
  webMCPStatus: WebMCPStatus
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
        Hand mode lets you grab furniture and drag it across the floor. Select an item, then drag
        its edge handles to change width or depth, or a corner handle to change both. Exact
        dimensions remain available in Details. Locked items must be unlocked first.
      </p>
      <p>
        Drag doors, windows, or open passages along their current wall in either view. They stop at
        wall ends and other openings. In 3D, grab a door leaf or its green threshold. Each drag is
        one undo step; the one-inch snap toggle also applies.
      </p>
      <div className="shortcut">
        <span>Hand: move / resize</span>
        <kbd>H / M</kbd>
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
      <strong>Use your AI agent</strong>
      <p role="status">
        {webMCPStatus === 'ready'
          ? 'WebMCP tools are ready. A compatible browser agent can inspect this project, build rooms, and arrange furniture. Agent edits appear here and support Undo.'
          : webMCPStatus === 'registering'
            ? 'Preparing WebMCP tools for your browser agent…'
            : webMCPStatus === 'error'
              ? 'WebMCP tools could not start. Reload the page to try again.'
              : 'This browser does not expose WebMCP. Use a browser with WebMCP enabled and a compatible agent to edit this project with AI.'}
      </p>
      <p>
        Try: “Add a sofa to the living room and check whether it fits.”{' '}
        <a href="https://developer.chrome.com/docs/ai/webmcp" target="_blank" rel="noreferrer">
          WebMCP setup
        </a>
      </p>
      <p>
        Share the{' '}
        <a href={`${import.meta.env.BASE_URL}llms.txt`} target="_blank" rel="noreferrer">
          AI agent guide
        </a>{' '}
        with your agent for tool instructions and examples.
      </p>
      <button className="quiet-button reset-button" onClick={onUseExample}>
        Use example on this floor
      </button>
    </div>
  )
}
