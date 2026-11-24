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

type Frame = { x: number; y: number; w: number; h: number }

const smooth = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2)

const containFrame = (story: Story, width: number, height: number): Frame => {
  const maxW = Math.min(width * 0.88, 1100)
  const maxH = Math.min(height * 0.78, 820)
  const aspect = story.width / story.height
  let w = maxW
  let h = w / aspect
  if (h > maxH) {
    h = maxH
    w = h * aspect
  }
  return { x: (width - w) / 2, y: (height - h) / 2 - 8, w, h }
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t

export function PhotoViewer({ stories, total, story, origin, reducedMotion, onExited, onStep }: ViewerProps) {
  const [failed, setFailed] = useState(false)
  const [phase, setPhase] = useState<'opening' | 'open' | 'closing'>(reducedMotion ? 'open' : 'opening')
  const phaseRef = useRef(phase)
  const progressRef = useRef(reducedMotion ? 1 : 0)
  const frameRef = useRef<HTMLDivElement>(null)
  const coverRef = useRef<HTMLImageElement>(null)
  const fullRef = useRef<HTMLImageElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const dustRef = useRef<HTMLCanvasElement>(null)
  const chromeRef = useRef<HTMLDivElement>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const closeTarget = useRef<ScreenBox | null>(origin)
  const exited = useRef(false)
  const onExitedRef = useRef(onExited)
  onExitedRef.current = onExited
  const place = stories.findIndex((item) => item.id === story.id) + 1

  useEffect(() => {
    setFailed(false)
  }, [story.id])

  useEffect(() => {
    const switching = phaseRef.current === 'open' && progressRef.current > 0.85
    phaseRef.current = reducedMotion || switching ? 'open' : 'opening'
    progressRef.current = reducedMotion || switching ? 1 : 0
    setPhase(phaseRef.current)
    exited.current = false
    const onPhotoClose = () => {
      if (phaseRef.current === 'closing') return
      closeTarget.current = petalRects.get(story.id) ?? origin
      closeFrom = progressRef.current
      closeMark = performance.now()
      phaseRef.current = 'closing'
      setPhase('closing')
    }
    window.addEventListener('photo-close', onPhotoClose)
    const dust: { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[] = []
    const openMark = performance.now()
    let closeMark = 0
    let closeFrom = 1
    let last = openMark
    let raf = 0
    const colors = ['#f4efe6', '#d5e4ee', '#e7d7b4']

    const finish = () => {
      if (exited.current) return
      exited.current = true
      onExitedRef.current()
    }

    const draw = (now: number) => {
      const dt = Math.min(34, now - last)
      last = now
      const closing = phaseRef.current === 'closing'
      if (phaseRef.current === 'opening') {
        const dur = reducedMotion ? 16 : 820
        progressRef.current = Math.min(1, (now - openMark) / dur)
      } else if (closing) {
        const dur = reducedMotion ? 16 : 680
        const t = Math.min(1, (now - closeMark) / dur)
        progressRef.current = closeFrom * (1 - t)
      }
      const shown = closing ? closeFrom * (1 - smooth(Math.min(1, (now - closeMark) / (reducedMotion ? 16 : 680)))) : smooth(progressRef.current)
      const viewW = window.innerWidth
      const viewH = window.innerHeight
      const from = closing ? closeTarget.current ?? origin : origin
      const startBox = from ?? { x: viewW / 2 - 24, y: viewH / 2 - 24, w: 48, h: 48 }
      const endBox = containFrame(story, viewW, viewH)
      const frame = {
        x: mix(startBox.x, endBox.x, shown),
        y: mix(startBox.y, endBox.y, shown),
        w: mix(startBox.w, endBox.w, shown),
        h: mix(startBox.h, endBox.h, shown),
      }
      const node = frameRef.current
      if (node) {
        const radius = mix(Math.min(frame.w, frame.h) / 2, 18, shown)
        node.style.transform = `translate(${frame.x}px, ${frame.y}px)`
        node.style.width = `${frame.w}px`
        node.style.height = `${frame.h}px`
        node.style.borderRadius = `${radius}px`
        node.style.boxShadow = `0 0 ${mix(28, 10, shown)}px rgba(213, 228, 238, ${mix(0.55, 0.18, shown)})`
      }
      if (coverRef.current) coverRef.current.style.opacity = String(1 - Math.min(1, Math.max(0, (shown - 0.42) / 0.38)))
      if (fullRef.current) fullRef.current.style.opacity = String(Math.min(1, Math.max(0, (shown - 0.28) / 0.4)))
      if (scrimRef.current) scrimRef.current.style.opacity = String(0.94 * shown)
      if (chromeRef.current) chromeRef.current.style.opacity = String(Math.min(1, Math.max(0, (shown - 0.72) / 0.22)))

      const canvas = dustRef.current
      if (canvas && !reducedMotion) {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
        if (canvas.width !== Math.floor(viewW * dpr) || canvas.height !== Math.floor(viewH * dpr)) {
          canvas.width = Math.floor(viewW * dpr)
          canvas.height = Math.floor(viewH * dpr)
          canvas.style.width = `${viewW}px`
          canvas.style.height = `${viewH}px`
        }
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          ctx.clearRect(0, 0, viewW, viewH)
          const spawn = phaseRef.current === 'open' ? 1 : 5
          for (let i = 0; i < spawn; i += 1) {
            const edge = Math.random() * (frame.w + frame.h) * 2
            let x = frame.x
            let y = frame.y
            if (edge < frame.w) x += edge
            else if (edge < frame.w + frame.h) {
              x += frame.w
              y += edge - frame.w
            } else if (edge < frame.w * 2 + frame.h) {
              x += frame.w - (edge - frame.w - frame.h)
              y += frame.h
            } else y += frame.h - (edge - frame.w * 2 - frame.h)
            const angle = Math.random() * Math.PI * 2
            const speed = closing ? -0.4 - Math.random() * 0.8 : 0.25 + Math.random() * 0.9
            dust.push({
              x,
              y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 0.15,
              life: 1,
              color: colors[Math.floor(Math.random() * colors.length)],
              size: Math.random() < 0.08 ? 2.2 : 1.1,
            })
          }
          for (let i = dust.length - 1; i >= 0; i -= 1) {
            const bit = dust[i]
            bit.x += bit.vx * dt * 0.06
            bit.y += bit.vy * dt * 0.06
            bit.life -= dt / (closing ? 520 : 760)
            if (bit.life <= 0) {
              dust.splice(i, 1)
              continue
            }
            ctx.globalAlpha = bit.life * (closing ? 0.8 : 0.7)
            ctx.fillStyle = bit.color
            ctx.beginPath()
            ctx.arc(bit.x, bit.y, bit.size, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.globalAlpha = 1
        }
      }

      if (phaseRef.current === 'opening' && progressRef.current >= 1) {
        phaseRef.current = 'open'
        setPhase('open')
      }
      if (phaseRef.current === 'closing' && progressRef.current <= 0) {
        finish()
        return
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('photo-close', onPhotoClose)
    }
  }, [origin, reducedMotion, story])

  const requestClose = () => {
    window.dispatchEvent(new CustomEvent('photo-close'))
  }

  return (
    <div
      className="viewer"
      data-phase={phase}
      role="dialog"
      aria-modal="true"
      aria-label={`照片 ${story.index} / ${total}`}
      onPointerDown={(event) => {
        if (phaseRef.current !== 'open') return
        if (event.target === event.currentTarget) start.current = null
        else start.current = { x: event.clientX, y: event.clientY }
      }}
      onPointerUp={(event) => {
        if (phaseRef.current !== 'open') return
        if (event.target === event.currentTarget) {
          requestClose()
          return
        }
        if (!start.current) return
        const dx = event.clientX - start.current.x
        const dy = event.clientY - start.current.y
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) onStep(dx < 0 ? 1 : -1)
      }}
    >
      <div ref={scrimRef} className="viewer-scrim" onPointerUp={requestClose} />
      <canvas ref={dustRef} className="viewer-dust" />
      <div
        ref={frameRef}
        className="reveal"
        style={
          origin
            ? {
                transform: `translate(${origin.x}px, ${origin.y}px)`,
                width: origin.w,
                height: origin.h,
                borderRadius: '50%',
              }
            : undefined
        }
      >
        {failed ? (
          <p className="viewer-miss">这张照片没有加载出来</p>
        ) : (
          <>
            <img ref={coverRef} className="reveal-cover" src={story.thumb} alt="" draggable={false} />
            <img
              ref={fullRef}
              className="reveal-full"
              src={story.src}
              alt=""
              draggable={false}
              onError={() => setFailed(true)}
            />
          </>
        )}
      </div>
      <div ref={chromeRef} className="viewer-chrome">
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
