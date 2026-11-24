import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import Experience from './scene/Experience';
import OrchidMark from './OrchidMark';
import { AlbumSheet, PhotoViewer } from './PhotoViews';
import { erasIn, loadAlbum, petalRects, pickPetals, type ScreenBox, type Story } from './stories/album';
import { COLORS, detectQuality, prefersReducedMotion, type TreeMode } from './treeConfig';

/**
 * Birthday particle tree for Laura.
 * Morph, bloom, and orbit controls descend from moleculemmeng020425/christmas-tree (MIT).
 * Photographs load only from a same-origin stories/album.json when one is present.
 */
export default function App() {
  const quality = useMemo(() => detectQuality(), []);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const [stories, setStories] = useState<Story[]>([]);
  const [era, setEra] = useState('all');
  const [mode, setMode] = useState<TreeMode>('formed');
  const [autoRotate, setAutoRotate] = useState(() => !prefersReducedMotion());
  const [status, setStatus] = useState('粒子已聚合成树');
  const [openId, setOpenId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<ScreenBox | null>(null);
  const [albumOpen, setAlbumOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    loadAlbum(controller.signal).then((loaded) => {
      if (!controller.signal.aborted) setStories(loaded);
    });
    return () => controller.abort();
  }, []);

  const eras = useMemo(() => erasIn(stories), [stories]);
  const filtered = useMemo(
    () => (era === 'all' ? stories : stories.filter((story) => story.era === era)),
    [era, stories],
  );
  const petals = useMemo(() => pickPetals(filtered, quality.petals), [filtered, quality.petals]);
  const openStory = filtered.find((story) => story.id === openId) ?? null;
  const overlayOpen = Boolean(openStory) || albumOpen;

  const chooseMode = (next: TreeMode) => {
    setMode(next);
    setStatus(next === 'formed' ? '粒子已聚合成树' : '粒子已散作星河');
  };

  const stepStory = (direction: -1 | 1) => {
    if (!openStory || filtered.length === 0) return;
    const current = filtered.findIndex((story) => story.id === openStory.id);
    const next = (current + direction + filtered.length) % filtered.length;
    setOpenId(filtered[next].id);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (openId) window.dispatchEvent(new CustomEvent('photo-close'));
        else setAlbumOpen(false);
        return;
      }
      if (!openId || filtered.length === 0) return;
      const current = filtered.findIndex((story) => story.id === openId);
      if (current < 0) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        const direction = event.key === 'ArrowLeft' ? -1 : 1;
        const next = (current + direction + filtered.length) % filtered.length;
        setOpenId(filtered[next].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [albumOpen, filtered, openId]);

  return (
    <main
      className="stage"
      data-mode={mode}
      data-rotate={autoRotate && !overlayOpen ? 'on' : 'off'}
      data-stories={stories.length}
      data-petals={petals.length}
      data-era={era}
      data-viewer={openStory ? openStory.index : ''}
      data-viewer-motion={reducedMotion ? 'reduced' : 'full'}
      data-album={albumOpen ? 'open' : 'closed'}
    >
      <Canvas
        frameloop={overlayOpen ? 'never' : 'always'}
        dpr={quality.dpr}
        gl={{
          antialias: quality.antialias,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(COLORS.indigo);
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
        }}
      >
        <Experience
          mode={mode}
          autoRotate={autoRotate}
          motion={reducedMotion ? 0 : 1}
          quality={quality}
          stories={petals}
          activeId={openId}
          controlsEnabled={!overlayOpen}
          onOpenStory={(id) => {
            const rect = petalRects.get(id);
            setOrigin(rect ? { ...rect } : null);
            setAlbumOpen(false);
            setOpenId(id);
          }}
        />
      </Canvas>

      <header className="greeting">
        <p className="eyebrow">For Laura, with Love</p>
        <h1>Laura，生日快乐</h1>
        <p className="wish">愿新的一岁，心有热爱，自在绽放</p>
      </header>

      <OrchidMark />

      <div className="dock">
        <p className="sr-only" aria-live="polite">
          {status}
        </p>
        {stories.length > 0 && (
          <div className="eras" role="group" aria-label="照片分组">
            <button type="button" aria-pressed={era === 'all'} onClick={() => setEra('all')}>
              全部
            </button>
            {eras.map((name) => (
              <button key={name} type="button" aria-pressed={era === name} onClick={() => setEra(name)}>
                {name}
              </button>
            ))}
            <button type="button" aria-pressed={albumOpen} onClick={() => setAlbumOpen(true)}>
              相册
            </button>
          </div>
        )}
        <div className="controls" role="group" aria-label="树的形态">
          <button type="button" aria-pressed={mode === 'scattered'} onClick={() => chooseMode('scattered')}>
            散作星河
          </button>
          <button type="button" aria-pressed={mode === 'formed'} onClick={() => chooseMode('formed')}>
            重聚成树
          </button>
          <button type="button" aria-pressed={autoRotate} onClick={() => setAutoRotate((value) => !value)}>
            自动旋转
          </button>
        </div>
        <p className="hint">拖动或滑动以旋转</p>
      </div>

      {albumOpen && (
        <AlbumSheet
          stories={filtered}
          onOpen={(id) => {
            const rect = petalRects.get(id) ?? {
              x: window.innerWidth / 2 - 28,
              y: window.innerHeight / 2 - 28,
              w: 56,
              h: 56,
            };
            setOrigin(rect);
            setAlbumOpen(false);
            setOpenId(id);
          }}
          onClose={() => setAlbumOpen(false)}
        />
      )}
      {openStory && (
        <PhotoViewer
          stories={filtered}
          total={stories.length}
          story={openStory}
          origin={origin}
          reducedMotion={reducedMotion}
          onExited={() => setOpenId(null)}
          onStep={stepStory}
        />
      )}
    </main>
  );
}
