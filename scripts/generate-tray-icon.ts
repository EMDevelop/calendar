import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Generates the menu-bar template icon (docs/spec.md §6).
 *
 * A template image carries alpha only — macOS tints it for light and dark menu
 * bars. Writing the PNG by hand keeps an image toolchain out of the
 * dependency list (§8.9).
 */

const SIZE = 16
const BLACK = 0

type Canvas = Uint8Array

function createCanvas(size: number): Canvas {
  return new Uint8Array(size * size)
}

function setPixel(canvas: Canvas, size: number, x: number, y: number, alpha: number): void {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return
  }
  canvas[y * size + x] = alpha
}

function drawCalendarGlyph(canvas: Canvas, size: number): void {
  const left = 2
  const right = size - 3
  const top = 3
  const bottom = size - 3

  for (let x = left; x <= right; x += 1) {
    for (let y = top; y <= bottom; y += 1) {
      const isBorder = x === left || x === right || y === top || y === bottom
      const isHeader = y <= top + 2
      if (isBorder || isHeader) {
        setPixel(canvas, size, x, y, 255)
      }
    }
  }

  // Binder rings above the header.
  for (const x of [left + 2, right - 2]) {
    setPixel(canvas, size, x, top - 2, 255)
    setPixel(canvas, size, x, top - 1, 255)
  }

  // Two rows of day marks.
  for (const y of [top + 4, top + 6]) {
    for (const x of [left + 2, left + 5, left + 8]) {
      setPixel(canvas, size, x, y, 255)
    }
  }
}

function scale(canvas: Canvas, size: number, factor: number): { pixels: Canvas; size: number } {
  const scaledSize = size * factor
  const scaled = createCanvas(scaledSize)
  for (let y = 0; y < scaledSize; y += 1) {
    for (let x = 0; x < scaledSize; x += 1) {
      const source = canvas[Math.floor(y / factor) * size + Math.floor(x / factor)] ?? 0
      scaled[y * scaledSize + x] = source
    }
  }
  return { pixels: scaled, size: scaledSize }
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(typeAndData), 0)
  return Buffer.concat([length, typeAndData, crc])
}

/** 8-bit grayscale + alpha (colour type 4). */
function encodePng(pixels: Canvas, size: number): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header.writeUInt8(8, 8)
  header.writeUInt8(4, 9)

  const raw = Buffer.alloc(size * (1 + size * 2))
  let offset = 0
  for (let y = 0; y < size; y += 1) {
    raw.writeUInt8(0, offset)
    offset += 1
    for (let x = 0; x < size; x += 1) {
      raw.writeUInt8(BLACK, offset)
      raw.writeUInt8(pixels[y * size + x] ?? 0, offset + 1)
      offset += 2
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function main(): void {
  const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
  const outputDir = join(projectRoot, 'resources')
  mkdirSync(outputDir, { recursive: true })

  const base = createCanvas(SIZE)
  drawCalendarGlyph(base, SIZE)

  writeFileSync(join(outputDir, 'trayTemplate.png'), encodePng(base, SIZE))

  const doubled = scale(base, SIZE, 2)
  writeFileSync(join(outputDir, 'trayTemplate@2x.png'), encodePng(doubled.pixels, doubled.size))

  process.stdout.write(`wrote tray icons to ${outputDir}\n`)
}

main()
