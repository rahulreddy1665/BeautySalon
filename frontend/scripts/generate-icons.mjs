/**
 * Rasterize frontend/assets/logo.(png|svg) into the PWA / favicon set.
 * Re-run: npm run icons
 *
 * ICON_BACKGROUND is the only hex outside theme/. It matches the app's
 * near-black page background so the gold mark stays visible.
 */
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

const ICON_BACKGROUND = '#0b0b0b'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')
const iconsDir = path.join(publicDir, 'icons')

function sourcePath() {
  for (const name of ['logo.svg', 'logo.png']) {
    const file = path.join(root, 'assets', name)
    if (existsSync(file)) return file
  }
  throw new Error('Add frontend/assets/logo.svg or frontend/assets/logo.png')
}

async function plate(size, innerRatio) {
  const inner = Math.round(size * innerRatio)
  const logo = await sharp(sourcePath())
    .resize(inner, inner, {
      fit: 'contain',
      background: ICON_BACKGROUND,
    })
    .png()
    .toBuffer()

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: ICON_BACKGROUND,
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9, palette: true, quality: 80, effort: 10 })
    .toBuffer()
}

function toIco(images) {
  const count = images.length
  let offset = 6 + count * 16
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(count, 4)
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)])
}

const source = sourcePath()
await mkdir(iconsDir, { recursive: true })

// Maskable safe zone is a centered circle 80% of the canvas. A square mark
// fits inside that circle at 80% / sqrt(2) of the canvas.
const MASKABLE_INNER = 0.8 / Math.SQRT2

const outputs = [
  ['icons/icon-192.png', await plate(192, 0.8)],
  ['icons/icon-512.png', await plate(512, 0.8)],
  ['icons/icon-maskable-512.png', await plate(512, MASKABLE_INNER)],
  ['apple-touch-icon.png', await plate(180, 0.8)],
  ['favicon-32.png', await plate(32, 0.8)],
  ['favicon-16.png', await plate(16, 0.8)],
]

for (const [name, png] of outputs) {
  await writeFile(path.join(publicDir, name), png)
}

const favicon32 = outputs.find(([name]) => name === 'favicon-32.png')[1]
const favicon16 = outputs.find(([name]) => name === 'favicon-16.png')[1]
await writeFile(
  path.join(publicDir, 'favicon.ico'),
  toIco([
    { size: 16, png: favicon16 },
    { size: 32, png: favicon32 },
  ]),
)

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="${ICON_BACKGROUND}"/>
  <image href="data:image/png;base64,${favicon32.toString('base64')}" width="32" height="32"/>
</svg>
`
await writeFile(path.join(publicDir, 'favicon.svg'), svg)

const bytes = await readFile(source)
console.log(`source ${path.relative(root, source)} (${bytes.length} bytes)`)
console.log(`background ${ICON_BACKGROUND}`)
for (const [name, png] of outputs) {
  console.log(`${name} ${png.length} bytes`)
}
