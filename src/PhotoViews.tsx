import { useEffect, useRef, useState } from 'react'
import { petalRects, type ScreenBox, type Story } from './stories/album'

type ViewerProps = {
  stories: Story[]
  total: number
  story: Story
  origin: ScreenBox | null
  reducedMotion: boolean
  onExited: () => void
  onStep: (direction: -1 | 1) => void
}

export function PhotoViewer({ stories, total, story, origin, reducedMotion, onExited, onStep }: ViewerProps) {
  const photoRef = useRef<HTMLImageElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const stopFlight = useRef<(() => void) | null>(null)
  const flew = useRef(false)
  const closed = useRef(false)
  const [failed, setFailed] = useState(false)
  const [phase, setPhase] = useState<'open' | 'closing'>('open')
  const place = stories.findIndex((item) => item.id === story.id) + 1
  const start = useRef<{ x: number; y: number } | null>(null)
  const onExitedRef = useRef(onExited)
  onExitedRef.current = onExited

  useEffect(() => {
    setFailed(false)
  }, [story.id])

  useEffect(() => {
    const onKey = () => requestClose()
    window.addEventListener('photo-close', onKey)
    return () => window.removeEventListener('photo-close', onKey)
  })

  useEffect(() => {
    const node = photoRef.current
    if (!node) return
    const fit = () => {
      const stage = node.parentElement
      if (!stage || !node.naturalWidth) return
      const box = stage.getBoundingClientRect()
      const scale = Math.min(box.width / node.naturalWidth, box.height / node.naturalHeight)
      node.style.width = `${Math.floor(node.naturalWidth * scale)}px`
      node.style.height = `${Math.floor(node.naturalHeight * scale)}px`
    }
    const begin = () => {
      fit()
      if (flew.current || reducedMotion || !origin) return
      const dest = node.getBoundingClientRect()
      if (dest.width < 8 || dest.height < 8) return
      flew.current = true
      const dx = origin.x + origin.w / 2 - (dest.x + dest.width / 2)
      const dy = origin.y + origin.h / 2 - (dest.y + dest.height / 2)
      const scale = Math.min(1, Math.max(0.04, origin.w / dest.width))
      const started = performance.now()
      const timer = window.setInterval(() => {
        const p = Math.min(1, (performance.now() - started) / 680)
        node.style.transform = `translate(${dx * (1 - p)}px, ${dy * (1 - p)}px) scale(${scale + (1 - scale) * p})`
        paintGuide(p, false)
        if (p >= 1) {
          window.clearInterval(timer)
          node.style.transform = ''
          paintGuide(1, true)
        }
      }, 16)
      stopFlight.current = () => {
        window.clearInterval(timer)
        node.style.transform = ''
      }
    }
    node.addEventListener('load', begin)
    window.addEventListener('resize', fit)
    const frame = requestAnimationFrame(() => requestAnimationFrame(begin))
    return () => {
      cancelAnimationFrame(frame)
      node.removeEventListener('load', begin)
      window.removeEventListener('resize', fit)
      stopFlight.current?.()
      node.style.transform = ''
    }
  }, [origin, reducedMotion, story.id])

  const paintGuide = (p: number, settled: boolean) => {
    const shell = shellRef.current
    const line = lineRef.current
    if (reducedMotion) return
    if (shell) shell.style.background = `rgba(8, 14, 26, ${settled ? 0.94 : 0.34 + p * 0.6})`
    if (!line) return
    line.style.top = `${window.innerHeight / 2}px`
    line.style.width = settled ? '0px' : `${Math.min(88, 36 + p * 70)}vw`
    line.style.opacity = settled || p < 0.06 ? '0' : '0.92'
  }

  const requestClose = () => {
    if (phase === 'closing' || closed.current) return
    window.dispatchEvent(new CustomEvent('photo-gather'))
    const node = photoRef.current
    stopFlight.current?.()
    if (node) node.style.transform = ''
    const to = petalRects.get(story.id) ?? origin
    if (!node || !to || reducedMotion) {
      closed.current = true
      onExitedRef.current()
      return
    }
    const from = node.getBoundingClientRect()
    if (from.width < 8) {
      closed.current = true
      onExitedRef.current()
      return
    }
    setPhase('closing')
    const dx = to.x + to.w / 2 - (from.x + from.width / 2)
    const dy = to.y + to.h / 2 - (from.y + from.height / 2)
    const scale = Math.max(0.04, Math.min(1, to.w / from.width))
    const started = performance.now()
    const timer = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - started) / 680)
      node.style.transform = `translate(${dx * p}px, ${dy * p}px) scale(${1 + (scale - 1) * p})`
      paintGuide(1 - p, false)
      if (p < 1) return
      window.clearInterval(timer)
      if (closed.current) return
      closed.current = true
      onExitedRef.current()
    }, 16)
    stopFlight.current = () => window.clearInterval(timer)
  }

  return (
    <div
      ref={shellRef}
      className="viewer"
      data-phase={phase}
      role="dialog"
      aria-modal="true"
      aria-label={`照片 ${story.index} / ${total}`}
      onPointerDown={(event) => {
        if (phase !== 'open') return
        if ((event.target as HTMLElement).closest('button')) start.current = null
        else start.current = { x: event.clientX, y: event.clientY }
      }}
      onPointerUp={(event) => {
        if (phase !== 'open' || !start.current) return
        if ((event.target as HTMLElement).closest('button')) return
        const dx = event.clientX - start.current.x
        const dy = event.clientY - start.current.y
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && event.target === event.currentTarget) {
          requestClose()
          return
        }
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) onStep(dx < 0 ? 1 : -1)
      }}
    >
      <div ref={lineRef} className="gold-line" />
      <div className="viewer-stage">
        {failed ? (
          <p className="viewer-miss">这张照片没有加载出来</p>
        ) : (
          <img
            ref={photoRef}
            className="viewer-photo"
            src={story.src}
            alt=""
            draggable={false}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <button type="button" className="viewer-close" onClick={requestClose} autoFocus>
        关闭
      </button>
      <button type="button" className="viewer-nav viewer-prev" onClick={() => onStep(-1)} aria-label="上一张">
        上一张
      </button>
      <button type="button" className="viewer-nav viewer-next" onClick={() => onStep(1)} aria-label="下一张">
        下一张
      </button>
      <p className="viewer-caption">
        <span>{story.era}</span>
        <span>
          {story.index} / {total}
          {place > 0 && stories.length !== total ? ` · 本组 ${place} / ${stories.length}` : ''}
        </span>
      </p>
    </div>
  )
}

type AlbumProps = {
  stories: Story[]
  onOpen: (id: string) => void
  onClose: () => void
}

export function AlbumSheet({ stories, onOpen, onClose }: AlbumProps) {
  return (
    <div className="album" role="dialog" aria-modal="true" aria-label="相册" onClick={onClose}>
      <div className="album-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="album-bar">
          <p>{stories.length} 张</p>
          <button type="button" onClick={onClose} autoFocus>
            关闭
          </button>
        </div>
        <div className="album-grid">
          {stories.map((story) => (
            <button key={story.id} type="button" className="album-item" onClick={() => onOpen(story.id)}>
              <img src={story.thumb} alt="" onError={(event) => event.currentTarget.remove()} />
              <span>
                {story.index} · {story.era}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
