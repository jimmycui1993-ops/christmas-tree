import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const manifestPath = path.join(root, 'private', 'stories', 'manifest.json')
const sourceRoot = path.join(root, 'private', 'stories')
const targetRoot = path.join(root, 'public', 'stories')

const relativeFile = (value) => {
  if (typeof value !== 'string') return null
  const file = value.trim()
  if (!file || file.includes('..') || path.isAbsolute(file) || file.includes('://')) return null
  return file
}

const main = async () => {
  let raw
  try {
    raw = await readFile(manifestPath, 'utf8')
  } catch {
    console.log('No private/stories/manifest.json. The tree runs without photographs.')
    return
  }

  const manifest = JSON.parse(raw)
  const album = Array.isArray(manifest.album) ? manifest.album : []
  const stories = []
  for (const item of album) {
    if (!item || item.classification !== 'photograph' || item.recommended_in_album === false) continue
    const src = relativeFile(item.web_path)
    const thumb = relativeFile(item.thumb_path)
    const size = item.web_pixel_size
    const era = typeof item.overlay_text === 'string' ? item.overlay_text.trim() : ''
    if (!src || !thumb || !era || !Array.isArray(size) || size.length < 2) continue
    const width = Number(size[0])
    const height = Number(size[1])
    const index = Number(item.album_index)
    if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isInteger(index)) continue
    stories.push({
      id: String(index).padStart(2, '0'),
      index,
      era,
      src,
      thumb,
      width,
      height,
    })
  }
  stories.sort((a, b) => a.index - b.index)

  await rm(targetRoot, { recursive: true, force: true })
  await mkdir(path.join(targetRoot, 'web'), { recursive: true })
  await mkdir(path.join(targetRoot, 'thumbs'), { recursive: true })
  for (const story of stories) {
    await copyFile(path.join(sourceRoot, story.src), path.join(targetRoot, story.src))
    await copyFile(path.join(sourceRoot, story.thumb), path.join(targetRoot, story.thumb))
  }
  await writeFile(path.join(targetRoot, 'album.json'), JSON.stringify({ stories }, null, 2))
  console.log(`Staged ${stories.length} stories into public/stories (gitignored).`)
}

await main()
