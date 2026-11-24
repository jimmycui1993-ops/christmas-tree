import { useEffect, useRef, useState } from 'react'
import type { Story } from './stories/album'

type ViewerProps = {
  stories: Story[]
  total: number
  story: Story
  reducedMotion: boolean
  onClose: () => void
  onStep: (direction: -1 | 1) => void
}

export function PhotoViewer({ stories, total, story, reducedMotion, onClose, onStep }: ViewerProps) {
  const [failed, setFailed] = useState(false)
  const start = useRef<{ x: number; y: number } | null>(null)
  const place = stories.findIndex((item) => item.id === story.id) + 1

  useEffect(() => {
    setFailed(false)
  }, [story.id])

  return (
    <div
      className={`viewer ${reducedMotion ? 'viewer-still' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`照片 ${story.index} / ${total}`}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) start.current = null
        else start.current = { x: event.clientX, y: event.clientY }
      }}
      onPointerUp={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
          return
        }
        if (!start.current) return
        const dx = event.clientX - start.current.x
        const dy = event.clientY - start.current.y
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) onStep(dx < 0 ? 1 : -1)
      }}
    >
      <button type="button" className="viewer-close" onClick={onClose} autoFocus>
        关闭
      </button>
      <button type="button" className="viewer-nav viewer-prev" onClick={() => onStep(-1)} aria-label="上一张">
        上一张
      </button>
      <figure className="viewer-frame">
        {failed ? (
          <p className="viewer-miss">这张照片没有加载出来</p>
        ) : (
          <img
            src={story.src}
            alt=""
            draggable={false}
            onError={() => setFailed(true)}
          />
        )}
        <figcaption>
          <span>{story.era}</span>
          <span>
            {story.index} / {total}
            {place > 0 && stories.length !== total ? ` · 本组 ${place} / ${stories.length}` : ''}
          </span>
        </figcaption>
      </figure>
      <button type="button" className="viewer-nav viewer-next" onClick={() => onStep(1)} aria-label="下一张">
        下一张
      </button>
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
