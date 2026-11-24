import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { MathUtils } from 'three';
import * as THREE from 'three';
import { createBokeh, createParticleField, type TreeMode } from '../treeConfig';

const vertexShader = /* glsl */ `
  attribute vec3 aTarget;
  attribute vec3 aColor;
  attribute float aRandom;
  attribute float aSize;
  uniform float uTime;
  uniform float uProgress;
  uniform float uScale;
  uniform float uMotion;
  uniform float uPixelRatio;
  uniform float uBurst;
  varying vec3 vColor;
  varying float vRandom;

  float ease(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0;
  }

  void main() {
    vColor = aColor;
    vRandom = aRandom;
    float t = ease(clamp(uProgress, 0.0, 1.0));
    vec3 drift = vec3(
      sin(uTime * 0.15 + aRandom * 12.0),
      cos(uTime * 0.12 + aRandom * 8.0),
      sin(uTime * 0.13 + aRandom * 10.0)
    ) * mix(0.28, 0.02, t) * uMotion;
    vec3 pos = mix(position, aTarget, t);
    pos = mix(pos, position, clamp(uBurst, 0.0, 1.0) * 0.4);
    pos += drift * (1.0 + uBurst * 1.4);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float dist = max(0.1, -mv.z);
    gl_PointSize = clamp(aSize * uScale * uPixelRatio * (52.0 / dist), 1.3, 6.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uTwinkle;
  varying vec3 vColor;
  varying float vRandom;

  void main() {
    vec2 p = gl_PointCoord - vec2(0.5);
    float d = length(p);
    if (d > 0.5) discard;
    float glow = pow(smoothstep(0.5, 0.02, d), 2.1);
    float twinkle = mix(1.0, 0.82 + 0.18 * sin(uTime * (1.1 + vRandom) + vRandom * 20.0), uTwinkle);
    float alpha = glow * twinkle;
    gl_FragColor = vec4(vColor * 1.05, alpha);
  }
`;

const GlowMaterial = shaderMaterial(
  {
    uTime: 0,
    uProgress: 1,
    uScale: 1,
    uMotion: 1,
    uPixelRatio: 1,
    uTwinkle: 0.2,
    uBurst: 0,
  },
  vertexShader,
  fragmentShader,
);

type GlowMaterialInstance = THREE.ShaderMaterial & {
  uTime: number;
  uProgress: number;
  uScale: number;
  uMotion: number;
  uPixelRatio: number;
  uTwinkle: number;
  uBurst: number;
};

type ParticleFieldProps = {
  count: number;
  mode: TreeMode;
  motion: number;
  burst: number;
};

export default function ParticleField({ count, mode, motion, burst }: ParticleFieldProps) {
  const field = useMemo(() => createParticleField(count), [count]);
  const material = useMemo(() => {
    const next = new GlowMaterial() as GlowMaterialInstance;
    next.transparent = true;
    next.depthWrite = false;
    next.depthTest = true;
    next.blending = THREE.AdditiveBlending;
    next.toneMapped = false;
    next.uProgress = 1;
    next.uScale = 1;
    next.uTwinkle = 0.22;
    return next;
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    const target = mode === 'formed' ? 1 : 0;
    material.uProgress = MathUtils.damp(material.uProgress, target, 1.45, delta);
    material.uTime = state.clock.elapsedTime;
    material.uMotion = motion;
    material.uPixelRatio = state.gl.getPixelRatio();
    material.uBurst = MathUtils.damp(material.uBurst, motion > 0 ? burst : 0, 2.4, delta);
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[field.positions, 3]} />
        <bufferAttribute attach="attributes-aTarget" args={[field.targets, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[field.colors, 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[field.randoms, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[field.sizes, 1]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
}

const bokehVertex = /* glsl */ `
  attribute vec3 aColor;
  attribute float aRandom;
  attribute float aSize;
  uniform float uTime;
  uniform float uMotion;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vRandom;

  void main() {
    vColor = aColor;
    vRandom = aRandom;
    vec3 pos = position;
    pos.x += sin(uTime * 0.08 + aRandom * 8.0) * 0.35 * uMotion;
    pos.y += cos(uTime * 0.06 + aRandom * 5.0) * 0.22 * uMotion;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float dist = max(0.1, -mv.z);
    gl_PointSize = clamp(aSize * uPixelRatio * (160.0 / dist), 6.0, 26.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const bokehFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vRandom;

  void main() {
    vec2 p = gl_PointCoord - vec2(0.5);
    float d = length(p);
    if (d > 0.5) discard;
    float glow = pow(smoothstep(0.5, 0.0, d), 1.7);
    gl_FragColor = vec4(vColor * glow * 0.09, glow * 0.07);
  }
`;

const BokehMaterial = shaderMaterial(
  { uTime: 0, uMotion: 1, uPixelRatio: 1 },
  bokehVertex,
  bokehFragment,
);

type BokehMaterialInstance = THREE.ShaderMaterial & {
  uTime: number;
  uMotion: number;
  uPixelRatio: number;
};

export function ForegroundBokeh({ count, motion }: { count: number; motion: number }) {
  const field = useMemo(() => createBokeh(count), [count]);
  const material = useMemo(() => {
    const next = new BokehMaterial() as BokehMaterialInstance;
    next.transparent = true;
    next.depthWrite = false;
    next.blending = THREE.AdditiveBlending;
    next.toneMapped = false;
    return next;
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    material.uTime = state.clock.elapsedTime;
    material.uMotion = motion;
    material.uPixelRatio = state.gl.getPixelRatio();
  });

  return (
    <points frustumCulled={false} renderOrder={2}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[field.positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[field.colors, 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[field.randoms, 1]} />
        <bufferAttribute attach="attributes-aSize" args={[field.sizes, 1]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
}
