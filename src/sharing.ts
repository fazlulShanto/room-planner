import { parseProject, validateWorkspace, type Project, type Workspace } from './projects.ts'

// An application ceiling just below Chromium's 2 MiB URL limit, not a guarantee
// that every browser or messaging service can transport a link this long.
export const MAX_SHARE_URL_LENGTH = 2_000_000
export const LONG_SHARE_URL_LENGTH = 8_000
export const MAX_SHARED_PROJECT_BYTES = 20_000_000
const PREFIX = '1.' // gzip-compressed UTF-8 project JSON, encoded as base64url
const INVALID_LINK =
  'This share link is incomplete or damaged. Ask the sender to copy it again, or import an exported project.'
const TOO_LARGE =
  'This project is too large for a share link. Export the project as a file instead.'

async function readBytes(stream: ReadableStream<Uint8Array>, limit: number) {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel()
        throw new Error(TOO_LARGE)
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const result = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

export async function createShareUrl(project: Project, baseUrl: string): Promise<string> {
  if (typeof CompressionStream === 'undefined')
    throw new Error('This browser cannot create share links. Use a newer browser or export a file.')
  const json = JSON.stringify(project)
  parseProject(json)
  const source = new Blob([json])
  if (source.size > MAX_SHARED_PROJECT_BYTES) throw new Error(TOO_LARGE)
  const bytes = await readBytes(
    source.stream().pipeThrough(new CompressionStream('gzip')),
    MAX_SHARE_URL_LENGTH,
  )
  // Chunk conversion avoids argument-count limits on large projects.
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  const encoded = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const url = new URL(baseUrl)
  url.searchParams.delete('plan')
  url.hash = `plan=${PREFIX}${encoded}`
  if (url.href.length > MAX_SHARE_URL_LENGTH) throw new Error(TOO_LARGE)
  return url.href
}

export function hasSharedProject(url: URL): boolean {
  return new URLSearchParams(url.hash.slice(1)).has('plan') || url.searchParams.has('plan')
}

export async function readSharedProject(url: URL): Promise<Project | null> {
  if (!hasSharedProject(url)) return null
  if (url.href.length > MAX_SHARE_URL_LENGTH) throw new Error(TOO_LARGE)
  const values = [
    ...new URLSearchParams(url.hash.slice(1)).getAll('plan'),
    ...url.searchParams.getAll('plan'),
  ]
  if (values.length !== 1 || !values[0]) throw new Error(INVALID_LINK)
  const value = values[0]
  if (!value.startsWith(PREFIX))
    throw new Error(
      'This share link uses an unsupported format. Ask the sender for an exported project.',
    )
  const encoded = value.slice(PREFIX.length)
  if (!/^[A-Za-z0-9_-]+$/.test(encoded) || encoded.length % 4 === 1) throw new Error(INVALID_LINK)
  if (typeof DecompressionStream === 'undefined')
    throw new Error('This browser cannot open share links. Use a newer browser or import a file.')
  let json: string
  try {
    const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const expanded = await readBytes(
      new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),
      MAX_SHARED_PROJECT_BYTES,
    )
    json = new TextDecoder('utf-8', { fatal: true }).decode(expanded)
  } catch (error) {
    if (error instanceof Error && error.message === TOO_LARGE) throw error
    throw new Error(INVALID_LINK)
  }
  try {
    return parseProject(json)
  } catch {
    throw new Error(INVALID_LINK)
  }
}

/** A received snapshot always gets its own identity and never replaces local work. */
export function addSharedProject(workspace: Workspace, project: Project): Workspace {
  if (workspace.projects.length >= 20)
    throw new Error(
      'This workspace already has 20 projects. Open the share link in another browser profile, or use Undo to free a project slot.',
    )
  const copy = { ...project, id: crypto.randomUUID() }
  return validateWorkspace({
    ...workspace,
    activeProjectId: copy.id,
    projects: [...workspace.projects, copy],
  })
}

export function withoutSharedProject(url: URL): string {
  const clean = new URL(url)
  clean.searchParams.delete('plan')
  const hash = new URLSearchParams(clean.hash.slice(1))
  if (hash.has('plan')) {
    hash.delete('plan')
    clean.hash = hash.toString()
  }
  return clean.href
}
