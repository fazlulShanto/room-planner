import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Check, Copy, X } from 'lucide-react'
import type { Project } from '../projects'
import { createShareUrl, LONG_SHARE_URL_LENGTH } from '../sharing'

function ShareModal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose?: () => void
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => element.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      className="share-dialog"
      aria-labelledby={titleId}
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => {
        event.preventDefault()
        onClose?.()
      }}
    >
      <div className="share-heading">
        <h2 id={titleId}>{title}</h2>
        {onClose && (
          <button className="icon-button" aria-label="Close share dialog" onClick={onClose}>
            <X size={18} />
          </button>
        )}
      </div>
      {children}
    </dialog>
  )
}

export function ShareDialog({
  project,
  onClose,
  onExport,
}: {
  project: Project
  onClose: () => void
  onExport: () => void
}) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [copyState, setCopyState] = useState<'ready' | 'copied' | 'manual'>('ready')
  const field = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    let cancelled = false
    setUrl('')
    setError('')
    setCopyState('ready')
    createShareUrl(project, window.location.href).then(
      (link) => {
        if (!cancelled) setUrl(link)
      },
      (reason) => {
        if (!cancelled)
          setError(reason instanceof Error ? reason.message : 'Could not create a share link.')
      },
    )
    return () => {
      cancelled = true
    }
  }, [project])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopyState('copied')
    } catch {
      setCopyState('manual')
      field.current?.focus()
      field.current?.select()
    }
  }
  return (
    <ShareModal title="Share project" onClose={onClose}>
      <p>
        Share a copy of <strong>{project.name}</strong> with all {project.floors.length}{' '}
        {project.floors.length === 1 ? 'floor' : 'floors'}. Anyone with the link can open and edit
        their own copy. Later changes won’t update this link.
      </p>
      {error ? (
        <p className="share-warning" role="alert">
          {error}
        </p>
      ) : !url ? (
        <p role="status">Creating share link…</p>
      ) : (
        <>
          <label className="share-field">
            Project link
            <textarea
              ref={field}
              readOnly
              value={url}
              rows={3}
              onFocus={(event) => event.currentTarget.select()}
              spellCheck={false}
            />
          </label>
          <p className="share-size">{url.length.toLocaleString()} characters · No account needed</p>
          {url.length > LONG_SHARE_URL_LENGTH && (
            <p className="share-warning">
              This is a long link. Some browsers and messaging apps may cut it off. If it won’t
              open, send an exported file instead.
            </p>
          )}
          <p className="share-copy-status" role="status">
            {copyState === 'copied'
              ? 'Link copied. Ready to send.'
              : copyState === 'manual'
                ? 'Automatic copy is unavailable. Copy the selected link manually.'
                : 'The complete project is stored in the link.'}
          </p>
        </>
      )}
      <div className="share-actions">
        <button className="outline-button" onClick={onExport}>
          Export file
        </button>
        <button className="primary-button" onClick={copy} disabled={!url}>
          {copyState === 'copied' ? <Check size={15} /> : <Copy size={15} />}
          {copyState === 'copied' ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </ShareModal>
  )
}

export function SharedLinkNotice({ error, onClose }: { error: string; onClose: () => void }) {
  return (
    <ShareModal
      title={error ? 'Could not open shared project' : 'Opening shared project…'}
      onClose={error ? onClose : undefined}
    >
      <p role={error ? 'alert' : 'status'}>
        {error || 'Reading the project from this link. Your saved projects will stay available.'}
      </p>
      {error && (
        <div className="share-actions">
          <button className="primary-button" onClick={onClose}>
            Continue to my projects
          </button>
        </div>
      )}
    </ShareModal>
  )
}
