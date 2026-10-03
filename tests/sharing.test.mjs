import test from 'node:test'
import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import { randomBytes } from 'node:crypto'
import {
  addSharedProject,
  createShareUrl,
  hasSharedProject,
  readSharedProject,
  withoutSharedProject,
  LONG_SHARE_URL_LENGTH,
  MAX_SHARE_URL_LENGTH,
  MAX_SHARED_PROJECT_BYTES,
} from '../src/sharing.ts'
import { addFloor, createProject, exampleProject } from '../src/projects.ts'
import { createWorkspaceStore } from '../src/workspace/store.ts'

const base = 'https://example.com/planner/?theme=light'
const encodedUrl = (text) => new URL(`${base}#plan=1.${gzipSync(text).toString('base64url')}`)
const workspaceOf = (project) => ({ version: 2, activeProjectId: project.id, projects: [project] })

test('compressed links round-trip every floor, Unicode, exact dimensions and optional settings', async () => {
  let project = exampleProject()
  project = addFloor(project, project.floors[0])
  project.name = 'আমাদের বাড়ি 🏡 / café & family'
  project.floors[1].name = 'উপরের তলা'
  const plan = project.floors[1].plan
  plan.items[0].width = 61.125
  plan.lighting = { hour: 18.5, shadows: false }
  plan.walkHeight = 62.5
  plan.finishes = {
    [plan.rooms[0].id]: { wall: '#123456', floor: '#abcdef', ceiling: '#fedcba' },
  }
  const before = structuredClone(project)
  const url = new URL(await createShareUrl(project, `${base}#old-section`))
  assert.equal(url.origin + url.pathname, 'https://example.com/planner/')
  assert.equal(url.search, '?theme=light')
  assert.match(url.hash, /^#plan=1\.[A-Za-z0-9_-]+$/)
  assert.deepEqual(await readSharedProject(url), project)
  assert.deepEqual(project, before)
  assert.ok(url.href.length < JSON.stringify(project).length / 2)
})

test('blank projects open, and generated links replace stale plan parameters', async () => {
  const project = createProject()
  const url = new URL(await createShareUrl(project, `${base}&plan=old#plan=stale`))
  assert.equal(url.searchParams.has('plan'), false)
  assert.deepEqual(await readSharedProject(url), project)
})

test('query parameters also open, while unrelated URLs are ignored', async () => {
  const project = exampleProject()
  const url = new URL(await createShareUrl(project, base))
  url.searchParams.set('plan', new URLSearchParams(url.hash.slice(1)).get('plan'))
  url.hash = 'help'
  assert.deepEqual(await readSharedProject(url), project)
  assert.equal(hasSharedProject(new URL(`${base}#help`)), false)
  assert.equal(await readSharedProject(new URL(`${base}#help`)), null)
})

test('empty, ambiguous, unsupported, truncated and corrupted links fail clearly', async () => {
  const valid = await createShareUrl(exampleProject(), base)
  for (const suffix of ['#plan=', '#plan=1.', '#plan=1.%20abc', '#plan=1.abcde', '#plan=1.aaaa'])
    await assert.rejects(readSharedProject(new URL(base + suffix)), /incomplete or damaged/)
  await assert.rejects(readSharedProject(new URL(`${base}#plan=2.abc`)), /unsupported format/)
  await assert.rejects(readSharedProject(new URL(valid + '&plan=1.abc')), /incomplete or damaged/)
  const duplicate = new URL(valid)
  duplicate.searchParams.set('plan', '1.abc')
  await assert.rejects(readSharedProject(duplicate), /incomplete or damaged/)
  await assert.rejects(readSharedProject(new URL(valid.slice(0, -12))), /incomplete or damaged/)
  const compressed = gzipSync(JSON.stringify(exampleProject()))
  compressed[compressed.length - 8] ^= 1 // corrupt gzip checksum
  await assert.rejects(
    readSharedProject(new URL(`${base}#plan=1.${compressed.toString('base64url')}`)),
    /incomplete or damaged/,
  )
})

test('valid compression cannot bypass project validation or expansion limits', async () => {
  for (const text of [
    'not json',
    'null',
    '{"version":99}',
    JSON.stringify({ ...exampleProject(), floors: [] }),
  ])
    await assert.rejects(readSharedProject(encodedUrl(text)), /incomplete or damaged/)
  const invalid = exampleProject()
  invalid.floors[0].plan.items[0].width = -10
  await assert.rejects(
    readSharedProject(encodedUrl(JSON.stringify(invalid))),
    /incomplete or damaged/,
  )
  await assert.rejects(createShareUrl(invalid, base))
  await assert.rejects(
    readSharedProject(encodedUrl(' '.repeat(MAX_SHARED_PROJECT_BYTES + 1))),
    /too large/,
  )
})

test('long links stay usable up to the application ceiling without truncation', async () => {
  const project = createProject()
  // IDs have no content restriction; random text exercises poorly compressible data.
  project.id = randomBytes(12_000).toString('hex')
  const url = await createShareUrl(project, base)
  assert.ok(url.length > LONG_SHARE_URL_LENGTH)
  assert.deepEqual(await readSharedProject(new URL(url)), project)
  const ordinary = createProject()
  const ordinaryUrl = await createShareUrl(ordinary, base)
  const longBase = `${base}&padding=${'x'.repeat(MAX_SHARE_URL_LENGTH - ordinaryUrl.length - '&padding='.length)}`
  const maximumUrl = await createShareUrl(ordinary, longBase)
  assert.equal(maximumUrl.length, MAX_SHARE_URL_LENGTH)
  assert.deepEqual(await readSharedProject(new URL(maximumUrl)), ordinary)
  await assert.rejects(createShareUrl(ordinary, longBase + 'x'), /too large/)
  await assert.rejects(
    readSharedProject(new URL(`${url}&extra=${'x'.repeat(MAX_SHARE_URL_LENGTH)}`)),
    /too large/,
  )
})

test('received copies cannot replace matching local IDs and imports support undo/redo', async () => {
  const project = exampleProject()
  const initial = workspaceOf(project)
  const store = createWorkspaceStore(initial)
  const received = await readSharedProject(new URL(await createShareUrl(project, base)))
  store.commit((workspace) => addSharedProject(workspace, received))
  const next = store.getSnapshot().present
  assert.equal(next.projects.length, 2)
  assert.equal(next.projects[0], project)
  assert.notEqual(next.activeProjectId, project.id)
  assert.equal(next.activeProjectId, next.projects[1].id)
  assert.deepEqual(next.projects[1].floors, project.floors)
  store.undo()
  assert.equal(store.getSnapshot().present, initial)
  store.redo()
  assert.equal(store.getSnapshot().present, next)
})

test('a full workspace rejects a share without changing its projects or history', () => {
  const projects = Array.from({ length: 20 }, () => createProject())
  const workspace = { version: 2, activeProjectId: projects[0].id, projects }
  const store = createWorkspaceStore(workspace)
  const before = store.getSnapshot()
  assert.throws(() => store.commit((w) => addSharedProject(w, exampleProject())), /20 projects/)
  assert.equal(store.getSnapshot(), before)
})

test('consuming a saved share removes only its payload, preserving path and other parameters', () => {
  assert.equal(withoutSharedProject(new URL(`${base}#plan=1.abc&view=2d`)), `${base}#view=2d`)
  assert.equal(withoutSharedProject(new URL(`${base}&plan=1.abc#help`)), `${base}#help`)
  assert.equal(withoutSharedProject(new URL(`${base}#plan=1.abc`)), base)
})
