import { useState } from 'react';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { type Quality, type TreeMode } from '../treeConfig';
import type { Story } from '../stories/album';
import Atmosphere from './Atmosphere';
import ParticleField, { ForegroundBokeh } from './ParticleField';
import StoryPetals from './StoryPetals';
import TopStar from './TopStar';

type ExperienceProps = {
  mode: TreeMode;
  autoRotate: boolean;
  motion: number;
  quality: Quality;
  stories: Story[];
  controlsEnabled: boolean;
  onOpenStory: (id: string) => void;
};

export default function Experience({
  mode,
  autoRotate,
  motion,
  quality,
  stories,
  controlsEnabled,
  onOpenStory,
}: ExperienceProps) {
  const [interacting, setInteracting] = useState(false);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0.9, 0.15, 19.2]} fov={28} near={0.1} far={200} />
      <OrbitControls
        enabled={controlsEnabled}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.65}
        zoomSpeed={0.6}
        autoRotate={autoRotate && controlsEnabled && !interacting}
        autoRotateSpeed={0.35}
        minDistance={12}
        maxDistance={48}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 1.7}
        target={[0, -0.15, 0]}
        onStart={() => setInteracting(true)}
        onEnd={() => setInteracting(false)}
      />

      <Atmosphere />
      <Stars
        radius={55}
        depth={30}
        count={quality.stars}
        factor={2.1}
        saturation={0}
        fade
        speed={motion * 0.15}
      />

      <group position={[0, -0.15, 0]}>
        <ParticleField count={quality.foliage} mode={mode} motion={motion} />
        <StoryPetals stories={stories} mode={mode} motion={motion} onOpen={onOpenStory} />
        <TopStar mode={mode} />
      </group>
      <ForegroundBokeh count={quality.bokeh} motion={motion} />

      <EffectComposer multisampling={0}>
        <Bloom
          luminanceThreshold={0.92}
          luminanceSmoothing={0.2}
          intensity={quality.bloom}
          radius={0.25}
          mipmapBlur={false}
        />
        <Vignette eskil={false} offset={0.22} darkness={0.55} />
      </EffectComposer>
    </>
  );
}
