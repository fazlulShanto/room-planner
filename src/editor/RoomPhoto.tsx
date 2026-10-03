import { Suspense, lazy, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Camera, Download, RotateCcw, X } from 'lucide-react'
import type { LightingSettings, Plan } from '../model'
import type { PhotoCapture } from '../PhotoCamera'
import { PHOTO_CORNERS, PHOTO_FOV, roomPhotoFilename, roomPhotoPose } from '../photo'
import { STILL } from '../walk'
import CanvasBoundary from './CanvasBoundary'
import { useOutsideDismiss } from './useOutsideDismiss'

const Scene = lazy(() => import('../Scene'))
const emptyIds = new Set<string>()
const noop = () => {}

export default function RoomPhoto({
  plan,
  lighting,
  roomId,
  projectName,
  floorName,
  onClose,
}: {
  plan: Plan
  lighting: LightingSettings
  roomId: string
  projectName: string
  floorName: string
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [selectedRoom, setSelectedRoom] = useState(roomId)
  const room = plan.rooms.find((r) => r.id === selectedRoom) ?? plan.rooms[0]
  const [corner, setCorner] = useState(0)
  const [fov, setFov] = useState(PHOTO_FOV)
  const [doorsOpen, setDoorsOpen] = useState(true)
  const closedDoors = useMemo(
    () =>
      doorsOpen
        ? emptyIds
        : new Set(plan.openings.filter((o) => o.kind === 'door').map((o) => o.id)),
    [doorsOpen, plan.openings],
  )
  const [capture, setCapture] = useState<PhotoCapture | null>(null)
  const [busy, setBusy] = useState(false)
  useOutsideDismiss(dialog, () => {
    if (!busy) onClose()
  })
  const [photo, setPhoto] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [downloaded, setDownloaded] = useState(false)
  const actionsRef = useRef(null)
  const pose = useMemo(() => roomPhotoPose(plan, room?.id ?? '', corner), [plan, room?.id, corner])
  const onReady = useCallback((next: PhotoCapture | null) => setCapture(() => next), [])
  useEffect(() => {
    const element = dialog.current!
    if (document.pointerLockElement) document.exitPointerLock()
    element.showModal()
    return () => element.close()
  }, [])
  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo)
    }
  }, [photo])
  function retake() {
    setPhoto(null)
    setError('')
    setDownloaded(false)
  }
  async function takePhoto() {
    if (!capture || busy) return
    setBusy(true)
    setError('')
    try {
      const blob = await capture()
      setPhoto(URL.createObjectURL(blob))
      setDownloaded(false)
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Could not create the photo. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <dialog
      ref={dialog}
      className="photo-dialog"
      aria-labelledby={titleId}
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <div className="photo-heading">
        <div>
          <h2 id={titleId}>Room photo</h2>
          <p>{floorName} · Wide-angle interior view</p>
        </div>
        <button
          className="icon-button"
          aria-label="Close room photo"
          disabled={busy}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <fieldset className="photo-settings" disabled={busy}>
        <label>
          Room
          <select
            value={room?.id ?? ''}
            onChange={(e) => {
              setSelectedRoom(e.target.value)
              retake()
            }}
          >
            {plan.rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Camera corner
          <select
            value={corner}
            onChange={(e) => {
              setCorner(Number(e.target.value))
              retake()
            }}
          >
            {PHOTO_CORNERS.map((label, index) => (
              <option key={label} value={index}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Wide angle <output>{fov}°</output>
          <input
            aria-label="Photo field of view"
            type="range"
            min={75}
            max={120}
            step={5}
            value={fov}
            onChange={(e) => {
              setFov(Number(e.target.value))
              retake()
            }}
          />
        </label>
        <label className="photo-doors">
          All doors
          <span className="photo-door-control">
            <input
              type="checkbox"
              role="switch"
              aria-label="Open doors"
              checked={doorsOpen}
              onChange={(e) => {
                setDoorsOpen(e.target.checked)
                retake()
              }}
            />
            <span>{doorsOpen ? 'Open' : 'Closed'}</span>
          </span>
        </label>
      </fieldset>
      <div className="photo-stage">
        <div className={`photo-preview ${busy ? 'photo-preview-busy' : ''}`}>
          {photo ? (
            <img src={photo} alt={`Wide-angle photo of ${room?.name ?? 'room'}`} />
          ) : pose ? (
            <CanvasBoundary
              fallback={
                <p className="photo-unavailable" role="alert">
                  3D photos are unavailable in this browser. Try a browser with WebGL enabled.
                </p>
              }
            >
              <Suspense
                fallback={
                  <p className="photo-unavailable" role="status">
                    Preparing photo preview…
                  </p>
                }
              >
                <Scene
                  plan={plan}
                  lighting={lighting}
                  walk
                  walkInput={STILL}
                  walkControls={{
                    eyeHeight: plan.walkHeight ?? 65,
                    closedDoors,
                    actionsRef,
                    onLookChange: noop,
                    onDoorTarget: noop,
                    onDoorToggle: noop,
                    onExit: noop,
                    onMessage: noop,
                  }}
                  photo={{ pose, fov, onReady }}
                  selected={null}
                  roomId={room.id}
                  tool="orbit"
                  wallMode="full"
                  grid={false}
                  snap={false}
                  fitKey={0}
                  onSelect={noop}
                  onTransform={noop}
                  onMoveOpening={noop}
                  onDragStart={noop}
                  onDragEnd={noop}
                  issueIds={emptyIds}
                />
              </Suspense>
            </CanvasBoundary>
          ) : (
            <p className="photo-unavailable" role="status">
              There is no clear place for the camera in this room. Move furniture or choose another
              room.
            </p>
          )}
        </div>
      </div>
      <div className="photo-actions">
        <div className="photo-caption">
          <p className="photo-note">
            {photo
              ? 'Your photo is ready to save.'
              : 'Drag to look around. Switch corners for another viewpoint.'}
          </p>
          <span>1920 × 1080 PNG · Local download</span>
          {error && (
            <p className="photo-error" role="alert">
              {error}
            </p>
          )}
          {downloaded && (
            <p className="photo-note" role="status">
              Download requested. Check your device’s downloads.
            </p>
          )}
        </div>
        {photo ? (
          <>
            <button className="outline-button" onClick={retake}>
              <RotateCcw size={15} /> Retake
            </button>
            <a
              className="primary-button"
              href={photo}
              download={roomPhotoFilename(projectName, floorName, room.name)}
              onClick={() => setDownloaded(true)}
            >
              <Download size={15} /> Download PNG
            </a>
          </>
        ) : (
          <button
            className="primary-button"
            disabled={!capture || !pose || busy}
            onClick={takePhoto}
          >
            <Camera size={15} /> {busy ? 'Taking photo…' : 'Take photo'}
          </button>
        )}
      </div>
    </dialog>
  )
}
