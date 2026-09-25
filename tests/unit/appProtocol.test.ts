import { sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveRequestPath, safeJoin } from '../../src/main/windows/appProtocol.ts'

const ROOT = '/app/out/renderer'

/** The renderer is served from app://, so path handling is a security control (§8.4). */
describe('safeJoin', () => {
  it('resolves ordinary paths inside the base', () => {
    expect(safeJoin(ROOT, '/index.html')).toBe(`${ROOT}${sep}index.html`)
  })

  it('refuses to escape the base directory', () => {
    expect(safeJoin(ROOT, '/../../etc/passwd')).toBeNull()
    expect(safeJoin(ROOT, '/../../../../etc/passwd')).toBeNull()
  })

  it('refuses percent-encoded traversal', () => {
    expect(safeJoin(ROOT, '/%2e%2e/%2e%2e/etc/passwd')).toBeNull()
  })

  it('refuses null bytes', () => {
    expect(safeJoin(ROOT, '/index.html%00.png')).toBeNull()
  })

  it('refuses malformed percent encoding', () => {
    expect(safeJoin(ROOT, '/%')).toBeNull()
  })
})

describe('resolveRequestPath', () => {
  it('serves a window document from that window directory', () => {
    expect(resolveRequestPath(ROOT, 'widget', '/index.html')).toBe(
      `${ROOT}${sep}widget${sep}index.html`,
    )
  })

  it('serves shared bundler assets from the renderer root', () => {
    expect(resolveRequestPath(ROOT, 'widget', '/assets/widget-abc.js')).toBe(
      `${ROOT}${sep}assets${sep}widget-abc.js`,
    )
  })

  it('rejects a host that is not a plausible window role', () => {
    expect(resolveRequestPath(ROOT, '..', '/index.html')).toBeNull()
    expect(resolveRequestPath(ROOT, 'Widget', '/index.html')).toBeNull()
    expect(resolveRequestPath(ROOT, '', '/index.html')).toBeNull()
  })

  it('still refuses traversal through the assets route', () => {
    expect(resolveRequestPath(ROOT, 'widget', '/assets/../../secrets.txt')).toBeNull()
  })
})
