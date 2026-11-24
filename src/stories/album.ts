export type ScreenBox = { x: number; y: number; w: number; h: number }

export const petalRects = new Map<string, ScreenBox>()

export type Story = {
  id: string
  index: number
  era: string
  src: string
  thumb: string
  width: number
  height: number
}

type AlbumFile = {
  stories?: unknown
}

const relativePath = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const path = value.trim()
  if (!path || path.includes('..') || path.startsWith('/') || path.includes('\\') || path.includes('://')) {
    return null
  }
  return path
}

const storyFrom = (value: unknown, base: string): Story | null => {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const src = relativePath(item.src)
  const thumb = relativePath(item.thumb)
  const width = Number(item.width)
  const height = Number(item.height)
  const index = Number(item.index)
  const era = typeof item.era === 'string' ? item.era.trim() : ''
  const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : ''
  if (!src || !thumb || !id || !era || !Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    return null
  }
  if (!Number.isInteger(index) || index < 1) return null
  return {
    id,
    index,
    era,
    src: `${base}${src}`,
    thumb: `${base}${thumb}`,
    width,
    height,
  }
}

export const parseAlbum = (data: unknown, base: string): Story[] => {
  const root = data && typeof data === 'object' ? (data as AlbumFile).stories : null
  if (!Array.isArray(root)) return []
  const stories = root
    .map((item) => storyFrom(item, base))
    .filter((item): item is Story => item !== null)
  const seen = new Set<string>()
  return stories
    .filter((story) => {
      if (seen.has(story.id)) return false
      seen.add(story.id)
      return true
    })
    .sort((a, b) => a.index - b.index)
}

export const loadAlbum = async (signal?: AbortSignal): Promise<Story[]> => {
  const base = import.meta.env.BASE_URL
  try {
    const response = await fetch(`${base}stories/album.json`, { signal })
    if (!response.ok) return []
    return parseAlbum(await response.json(), `${base}stories/`)
  } catch {
    return []
  }
}

export const erasIn = (stories: Story[]): string[] => {
  const eras: string[] = []
  for (const story of stories) {
    if (!eras.includes(story.era)) eras.push(story.era)
  }
  return eras
}

export const pickPetals = (stories: Story[], limit: number): Story[] => {
  if (stories.length <= limit) return stories
  const chosen = new Set<string>()
  const eras = erasIn(stories)
  if (eras.length < limit) {
    for (const era of eras) {
      const first = stories.find((story) => story.era === era)
      if (first) chosen.add(first.id)
    }
  }
  const rest = stories.filter((story) => !chosen.has(story.id))
  const need = Math.max(0, limit - chosen.size)
  for (let i = 0; i < need; i += 1) {
    const index = Math.round((i * (rest.length - 1)) / Math.max(1, need - 1))
    const story = rest[index]
    if (story) chosen.add(story.id)
  }
  return stories.filter((story) => chosen.has(story.id))
}

export const planeSize = (width: number, height: number): [number, number] => {
  const aspect = width / height
  const maxWidth = aspect > 2.2 ? 1.15 : 0.78
  const maxHeight = aspect < 0.85 ? 0.86 : 0.62
  if (aspect >= 1) {
    const planeWidth = Math.min(maxWidth, maxHeight * aspect)
    return [planeWidth, planeWidth / aspect]
  }
  const planeHeight = Math.min(maxHeight, maxWidth / aspect)
  return [planeHeight * aspect, planeHeight]
}
