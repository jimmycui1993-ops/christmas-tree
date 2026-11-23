import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import Experience from './scene/Experience';
import OrchidMark from './OrchidMark';
import { COLORS, detectQuality, prefersReducedMotion, type TreeMode } from './treeConfig';

/**
 * Birthday particle tree for Laura.
 * Morph, bloom, and orbit controls descend from moleculemmeng020425/christmas-tree (MIT).
 * Wording and the orchid line follow the gift design. No photographs, no camera.
 */
export default function App() {
  const quality = useMemo(() => detectQuality(), []);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const [mode, setMode] = useState<TreeMode>('formed');
  const [autoRotate, setAutoRotate] = useState(() => !prefersReducedMotion());
  const [status, setStatus] = useState('粒子已聚合成树');

  const chooseMode = (next: TreeMode) => {
    setMode(next);
    setStatus(next === 'formed' ? '粒子已聚合成树' : '粒子已散作星河');
  };

  return (
    <main className="stage" data-mode={mode} data-rotate={autoRotate ? 'on' : 'off'}>
      <Canvas
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
    </main>
  );
}
