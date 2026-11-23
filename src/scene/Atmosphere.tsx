import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - vec2(0.5);
    vec3 indigo = vec3(0.012, 0.02, 0.045);
    vec3 deep = vec3(0.004, 0.006, 0.016);
    vec3 mist = vec3(0.18, 0.3, 0.4);
    vec3 cream = vec3(0.55, 0.5, 0.42);
    float sky = smoothstep(0.05, 0.8, vUv.y);
    vec3 col = mix(deep, indigo, sky);
    float nebula = exp(-dot(p - vec2(0.0, 0.02), p - vec2(0.0, 0.02)) * 9.0);
    float wash = exp(-dot(p - vec2(-0.3, -0.18), p - vec2(-0.3, -0.18)) * 13.0);
    float warmth = exp(-dot(p - vec2(0.24, 0.1), p - vec2(0.24, 0.1)) * 16.0);
    col = mix(col, mist, nebula * 0.62);
    col = mix(col, mist, wash * 0.18);
    col = mix(col, cream, warmth * 0.08);
    float grain = sin(vUv.x * 90.0) * sin(vUv.y * 70.0);
    col += grain * 0.004;
    col *= 0.46;
    float vignette = smoothstep(0.86, 0.22, length(p));
    col *= mix(0.78, 1.0, vignette);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const SkyMaterial = shaderMaterial({}, vertexShader, fragmentShader);

export default function Atmosphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const forward = useMemo(() => new THREE.Vector3(), []);
  const material = useMemo(() => {
    const next = new SkyMaterial();
    next.depthWrite = false;
    next.depthTest = false;
    next.toneMapped = false;
    return next;
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.position.copy(camera.position);
    mesh.quaternion.copy(camera.quaternion);
    forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    mesh.position.addScaledVector(forward, 70);
  });

  return (
    <mesh ref={meshRef} renderOrder={-20} frustumCulled={false}>
      <planeGeometry args={[160, 100]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
