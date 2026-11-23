import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { MathUtils } from 'three';
import * as THREE from 'three';
import { TREE, type TreeMode } from '../treeConfig';

const vertexShader = /* glsl */ `
  uniform float uScale;
  uniform float uPixelRatio;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(uScale * uPixelRatio * 34.0, 10.0, 46.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  void main() {
    vec2 p = gl_PointCoord - vec2(0.5);
    float d = length(p);
    if (d > 0.5) discard;
    float core = smoothstep(0.16, 0.0, d);
    float arm = max(
      smoothstep(0.5, 0.0, abs(p.y)) * smoothstep(0.035, 0.0, abs(p.x)),
      smoothstep(0.5, 0.0, abs(p.x)) * smoothstep(0.035, 0.0, abs(p.y))
    );
    float diag = max(
      smoothstep(0.28, 0.0, abs(p.x - p.y)) * smoothstep(0.02, 0.0, abs(p.x + p.y)),
      smoothstep(0.28, 0.0, abs(p.x + p.y)) * smoothstep(0.02, 0.0, abs(p.x - p.y))
    );
    float alpha = max(core, arm * 0.8 + diag * 0.28);
    vec3 color = vec3(0.97, 0.94, 0.88);
    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

const GlintMaterial = shaderMaterial(
  { uScale: 1, uPixelRatio: 1 },
  vertexShader,
  fragmentShader,
);

type GlintMaterialInstance = THREE.ShaderMaterial & {
  uScale: number;
  uPixelRatio: number;
};

const POINT = new Float32Array([0, 0, 0]);
const FORMED_Y = TREE.height / 2 + 0.28;
const SCATTERED_Y = TREE.height / 2 + 2.4;

export default function TopStar({ mode }: { mode: TreeMode }) {
  const groupRef = useRef<THREE.Group>(null);
  const progress = useRef(1);
  const material = useMemo(() => {
    const next = new GlintMaterial() as GlintMaterialInstance;
    next.transparent = true;
    next.depthWrite = false;
    next.blending = THREE.AdditiveBlending;
    next.toneMapped = false;
    next.uScale = 1;
    return next;
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    progress.current = MathUtils.damp(progress.current, mode === 'formed' ? 1 : 0, 1.45, delta);
    const t = progress.current;
    group.position.y = MathUtils.lerp(SCATTERED_Y, FORMED_Y, t);
    material.uScale = 0.35 + t * 0.65;
    material.uPixelRatio = state.gl.getPixelRatio();
  });

  return (
    <group ref={groupRef} position={[0, FORMED_Y, 0]}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[POINT, 3]} />
        </bufferGeometry>
        <primitive object={material} attach="material" />
      </points>
    </group>
  );
}
