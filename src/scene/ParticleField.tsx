import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { MathUtils } from 'three';
import * as THREE from 'three';
import { createParticleField, type TreeMode } from '../treeConfig';

const vertexShader = /* glsl */ `
  attribute vec3 aTarget;
  attribute vec3 aColor;
  attribute float aRandom;
  uniform float uTime;
  uniform float uProgress;
  uniform float uSize;
  uniform float uMotion;
  varying vec3 vColor;
  varying float vRandom;
  varying float vForm;

  float ease(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0;
  }

  void main() {
    vColor = aColor;
    vRandom = aRandom;
    float t = ease(clamp(uProgress, 0.0, 1.0));
    vForm = t;

    vec3 drift = vec3(
      sin(uTime * 0.17 + aRandom * 13.0),
      cos(uTime * 0.14 + aRandom * 9.0),
      sin(uTime * 0.15 + aRandom * 11.0)
    ) * mix(0.42, 0.035, t) * uMotion;

    vec3 sway = vec3(
      sin(uTime * 0.65 + aTarget.y * 0.32 + aRandom * 6.2),
      0.0,
      cos(uTime * 0.55 + aTarget.x * 0.28)
    ) * 0.055 * t * uMotion;

    vec3 pos = mix(position, aTarget, t) + drift + sway;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    float dist = max(0.1, -mv.z);
    float size = uSize * (0.75 + aRandom * 0.7) * mix(0.78, 1.05, t);
    gl_PointSize = clamp(size * (300.0 / dist), 1.0, 42.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uTwinkle;
  uniform float uAdditive;
  varying vec3 vColor;
  varying float vRandom;
  varying float vForm;

  void main() {
    vec2 p = gl_PointCoord - vec2(0.5);
    float d = length(p);
    if (d > 0.5) discard;
    float glow = pow(smoothstep(0.5, 0.0, d), 1.5);
    float twinkle = mix(1.0, 0.8 + 0.2 * sin(uTime * (1.2 + vRandom * 2.0) + vRandom * 28.0), uTwinkle);
    float alpha = glow * twinkle * mix(0.78, 1.0, vForm);
    if (uAdditive > 0.5) {
      gl_FragColor = vec4(vColor * alpha * 0.65, alpha);
    } else {
      gl_FragColor = vec4(vColor * alpha, alpha);
    }
  }
`;

const GlowMaterial = shaderMaterial(
  {
    uTime: 0,
    uProgress: 1,
    uSize: 1.2,
    uMotion: 1,
    uTwinkle: 0.35,
    uAdditive: 0,
  },
  vertexShader,
  fragmentShader,
);

type GlowMaterialInstance = THREE.ShaderMaterial & {
  uTime: number;
  uProgress: number;
  uSize: number;
  uMotion: number;
  uTwinkle: number;
  uAdditive: number;
};

type ParticleFieldProps = {
  count: number;
  kind: 'foliage' | 'lights';
  mode: TreeMode;
  motion: number;
};

export default function ParticleField({ count, kind, mode, motion }: ParticleFieldProps) {
  const field = useMemo(() => createParticleField(count, kind), [count, kind]);
  const material = useMemo(() => {
    const next = new GlowMaterial() as GlowMaterialInstance;
    next.transparent = true;
    next.depthWrite = false;
    next.premultipliedAlpha = kind !== 'lights';
    next.toneMapped = false;
    next.uAdditive = kind === 'lights' ? 1 : 0;
    next.blending = kind === 'lights' ? THREE.AdditiveBlending : THREE.NormalBlending;
    next.uSize = kind === 'lights' ? 1.55 : 1.35;
    next.uTwinkle = kind === 'lights' ? 0.85 : 0.18;
    next.uProgress = 1;
    return next;
  }, [kind]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    const target = mode === 'formed' ? 1 : 0;
    material.uProgress = MathUtils.damp(material.uProgress, target, 1.65, delta);
    material.uTime = state.clock.elapsedTime;
    material.uMotion = motion;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[field.positions, 3]} />
        <bufferAttribute attach="attributes-aTarget" args={[field.targets, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[field.colors, 3]} />
        <bufferAttribute attach="attributes-aRandom" args={[field.randoms, 1]} />
      </bufferGeometry>
      <primitive object={material} attach="material" />
    </points>
  );
}
