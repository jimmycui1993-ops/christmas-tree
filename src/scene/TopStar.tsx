import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MathUtils } from 'three';
import * as THREE from 'three';
import { TREE, type TreeMode } from '../treeConfig';

function createStarGeometry() {
  const positions: number[] = [];
  const outer = 1;
  const inner = 0.4;
  const points = 5;
  const push = (angle: number, radius: number) => {
    positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
  };
  for (let i = 0; i < points; i += 1) {
    const outerAngle = (i / points) * Math.PI * 2 - Math.PI / 2;
    const innerAngle = ((i + 0.5) / points) * Math.PI * 2 - Math.PI / 2;
    const nextOuter = ((i + 1) / points) * Math.PI * 2 - Math.PI / 2;
    positions.push(0, 0, 0);
    push(outerAngle, outer);
    push(innerAngle, inner);
    positions.push(0, 0, 0);
    push(innerAngle, inner);
    push(nextOuter, outer);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

type TopStarProps = {
  mode: TreeMode;
};

const FORMED_Y = TREE.height / 2 + 0.42;
const SCATTERED_Y = TREE.height / 2 + 2.8;

export default function TopStar({ mode }: TopStarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const progress = useRef(1);
  const world = useMemo(() => new THREE.Vector3(), []);
  const geometry = useMemo(() => createStarGeometry(), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#f8edd4',
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    progress.current = MathUtils.damp(progress.current, mode === 'formed' ? 1 : 0, 1.65, delta);
    const t = progress.current;
    const time = state.clock.elapsedTime;
    group.scale.setScalar(0.16 + t * 0.7);
    group.position.y = MathUtils.lerp(SCATTERED_Y, FORMED_Y, t);
    group.getWorldPosition(world);
    const camera = state.camera.position;
    group.rotation.y = Math.atan2(camera.x - world.x, camera.z - world.z);
    group.rotation.z = Math.sin(time * 0.45) * 0.04;
  });

  return (
    <group ref={groupRef} position={[0, FORMED_Y, 0]}>
      <mesh geometry={geometry} material={material} />
    </group>
  );
}
