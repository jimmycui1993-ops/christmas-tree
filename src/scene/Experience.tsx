import { useState } from 'react';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { COLORS, type Quality, type TreeMode } from '../treeConfig';
import ParticleField from './ParticleField';
import TopStar from './TopStar';

type ExperienceProps = {
  mode: TreeMode;
  autoRotate: boolean;
  motion: number;
  quality: Quality;
};

export default function Experience({ mode, autoRotate, motion, quality }: ExperienceProps) {
  const [interacting, setInteracting] = useState(false);

  return (
    <>
      <color attach="background" args={[COLORS.navy]} />
      <PerspectiveCamera makeDefault position={[1.8, 0.05, 16.8]} fov={32} near={0.1} far={140} />
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.7}
        zoomSpeed={0.65}
        autoRotate={autoRotate && !interacting}
        autoRotateSpeed={0.45}
        minDistance={12}
        maxDistance={68}
        minPolarAngle={Math.PI / 3.4}
        maxPolarAngle={Math.PI / 1.65}
        target={[0, -0.85, 0]}
        onStart={() => setInteracting(true)}
        onEnd={() => setInteracting(false)}
      />

      <Stars
        radius={90}
        depth={40}
        count={quality.stars}
        factor={2.4}
        saturation={0}
        fade
        speed={motion * 0.35}
      />

      <ambientLight intensity={0.22} color="#24324d" />
      <pointLight position={[8, 12, 14]} intensity={28} color="#ffe3b8" distance={80} decay={2} />
      <pointLight position={[-12, 3, -10]} intensity={12} color="#d7c094" distance={70} decay={2} />

      <group position={[0, -1.85, 0]}>
        <ParticleField count={quality.foliage} kind="foliage" mode={mode} motion={motion} />
        <ParticleField count={quality.lights} kind="lights" mode={mode} motion={motion} />
        <TopStar mode={mode} />
      </group>

      <EffectComposer multisampling={quality.antialias ? 2 : 0}>
        <Bloom
          luminanceThreshold={0.58}
          luminanceSmoothing={0.28}
          intensity={quality.bloom}
          radius={0.4}
        />
        <Vignette eskil={false} offset={0.16} darkness={0.82} />
      </EffectComposer>
    </>
  );
}
