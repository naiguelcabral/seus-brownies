import { constants } from 'node:fs'
import {
  open,
  mkdir,
  lstat,
  rename,
  unlink,
  readFile,
  chmod,
} from 'node:fs/promises'
import { resolve, dirname, join, relative } from 'node:path'
import { randomUUID } from 'node:crypto'
import { invariant, safe } from './model.mjs'

async function noLinks(path) {
  const parent = dirname(path)
  if (parent !== path) await noLinks(parent)
  try {
    invariant(!(await lstat(path)).isSymbolicLink(), 'symlink_refused')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}
export class State {
  constructor(root) {
    this.root = resolve(root)
  }
  async init() {
    await noLinks(this.root)
    await mkdir(this.root, { recursive: true, mode: 0o700 })
    await chmod(this.root, 0o700)
  }
  path(name) {
    invariant(/^[a-zA-Z0-9._-]+$/.test(name), 'state_path')
    return join(this.root, name)
  }
  async read(name, fallback = undefined) {
    const path = this.path(name)
    await noLinks(path)
    try {
      const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
      try {
        const data = await handle.readFile('utf8')
        invariant(data.length <= 4_000_000, 'payload_limit')
        return JSON.parse(data)
      } finally {
        await handle.close()
      }
    } catch (error) {
      if (error.code === 'ENOENT') return fallback
      throw error
    }
  }
  async write(name, data) {
    safe(data)
    const target = this.path(name)
    await noLinks(target)
    const temporary = this.path(`.${randomUUID()}.tmp`)
    const handle = await open(temporary, 'wx', 0o600)
    try {
      await handle.writeFile(JSON.stringify(data, null, 2))
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(temporary, target)
    const directory = await open(this.root, constants.O_RDONLY)
    try {
      await directory.sync()
    } finally {
      await directory.close()
    }
  }
  async remove(name) {
    const path = this.path(name)
    await noLinks(path)
    try {
      await unlink(path)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  async lock() {
    const path = this.path('lock.json')
    await noLinks(path)
    let handle
    try {
      handle = await open(path, 'wx', 0o600)
    } catch {
      throw new Error('sync_locked')
    }
    await handle.writeFile(JSON.stringify({ pid: process.pid }))
    await handle.close()
  }
  async unlock() {
    await this.remove('lock.json')
  }
  async recoverLock() {
    const lock = await this.read('lock.json')
    invariant(Number.isSafeInteger(lock?.pid), 'invalid_lock')
    let alive = true
    try {
      process.kill(lock.pid, 0)
    } catch (error) {
      if (error.code === 'ESRCH') alive = false
    }
    invariant(!alive, 'lock_owner_alive')
    await this.unlock()
  }
  async log(entry) {
    // Only allowlisted identifiers/codes; never provider error messages or bodies.
    const previous = await this.read('operations.json', [])
    await this.write('operations.json', [
      ...previous.slice(-499),
      {
        at: new Date().toISOString(),
        key: entry.key,
        result: entry.result,
        operation: entry.operation,
      },
    ])
  }
}
export function privateState(root, cwd) {
  const base = resolve(cwd, '.codex-local', 'project-sync')
  invariant(
    relative(base, resolve(root)) === '' ||
      (!relative(base, resolve(root)).startsWith('..') &&
        !relative(base, resolve(root)).startsWith('/')),
    'state_outside_private_root',
  )
  return new State(root)
}
export async function readInput(path) {
  await noLinks(resolve(path))
  const text = await readFile(path, 'utf8')
  invariant(text.length < 4_000_000, 'payload_limit')
  return safe(JSON.parse(text))
}
