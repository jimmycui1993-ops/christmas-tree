import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import * as THREE from 'three'
import { TREE, type TreeMode } from '../treeConfig'
import { petalRects, planeSize, type Story } from '../stories/album'

type ReadyStory = {
  story: Story
  texture: THREE.Texture
}

type StoryPetalsProps = {
  stories: Story[]
  mode: TreeMode
  motion: number
  compact: boolean
  activeId: string | null
  onOpen: (id: string) => void
}

const seeded = (seed: number) => {
  let value = seed || 1
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

const slotFor = (index: number, count: number, seed: number, compact: boolean) => {
  const random = seeded(seed)
  const span = compact ? 0.34 : 0.62
  const start = compact ? 0.34 : 0.2
  const y01 = count === 1 ? 0.5 : start + (index / (count - 1)) * span
  const y = (y01 - 0.5) * TREE.height
  const taper = Math.pow(1 - y01, 0.86)
  const radius = TREE.radius * taper * (compact ? 0.86 : 1.05)
  const theta = -Math.PI * 0.55 + (index / Math.max(1, count)) * Math.PI * (compact ? 0.95 : 1.25)
  const formed = new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius)
  const scattered = new THREE.Vector3((random() - 0.5) * 10, (random() - 0.45) * 6, (random() - 0.5) * 6)
  return { formed, scattered }
}

const corner = new THREE.Vector3()

const projectCorners = (
  node: THREE.Object3D,
  width: number,
  height: number,
  camera: THREE.Camera,
  size: { width: number; height: number },
) => {
  node.updateWorldMatrix(true, false)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const hw = width / 2
  const hh = height / 2
  for (const x of [-hw, hw]) {
    for (const y of [-hh, hh]) {
      corner.set(x, y, 0).applyMatrix4(node.matrixWorld).project(camera)
      const sx = (corner.x * 0.5 + 0.5) * size.width
      const sy = (-corner.y * 0.5 + 0.5) * size.height
      minX = Math.min(minX, sx)
      minY = Math.min(minY, sy)
      maxX = Math.max(maxX, sx)
      maxY = Math.max(maxY, sy)
    }
  }
  return { minX, minY, maxX, maxY }
}

function Petal({
  ready,
  index,
  count,
  mode,
  motion,
  compact,
  activeId,
  onOpen,
  onBounds,
}: {
  ready: ReadyStory
  index: number
  count: number
  mode: TreeMode
  motion: number
  compact: boolean
  activeId: string | null
  onOpen: (id: string) => void
  onBounds: (id: string, bounds: { minX: number; minY: number; maxX: number; maxY: number }) => void
}) {
  const group = useRef<THREE.Group>(null)
  const progress = useRef(mode === 'formed' ? 1 : 0)
  const { formed, scattered } = useMemo(
    () => slotFor(index, count, ready.story.index * 97, compact),
    [compact, index, count, ready.story.index],
  )
  const fitted = planeSize(ready.story.width, ready.story.height)
  const side = Math.min(fitted[0], fitted[1]) * (compact ? 0.92 : 1.02)
  const material = useMemo(() => {
    const next = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      toneMapped: true,
      uniforms: {
        uMap: { value: ready.texture },
        uAspect: { value: ready.story.width / ready.story.height },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uAspect;
        varying vec2 vUv;
        void main() {
          vec2 uv = vUv;
          if (uAspect > 1.0) uv.x = (uv.x - 0.5) / uAspect + 0.5;
          else uv.y = (uv.y - 0.5) * uAspect + 0.5;
          vec4 tex = texture2D(uMap, uv);
          float d = length(vUv - 0.5);
          float alpha = smoothstep(0.5, 0.46, d);
          if (alpha <= 0.001) discard;
          float rim = smoothstep(0.34, 0.48, d);
          vec3 color = mix(tex.rgb, vec3(0.96, 0.93, 0.86), rim * 0.18);
          gl_FragColor = vec4(color, tex.a * alpha);
        }
      `,
    })
    return next
  }, [ready.story.height, ready.story.width, ready.texture])
  const glow = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        uniforms: {},
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          void main() {
            float d = length(vUv - 0.5);
            float ring = smoothstep(0.34, 0.46, d) * smoothstep(0.5, 0.46, d);
            vec3 mist = vec3(0.78, 0.88, 0.93);
            vec3 gold = vec3(0.91, 0.84, 0.68);
            gl_FragColor = vec4(mix(mist, gold, ring), ring * 0.55);
          }
        `,
      }),
    [],
  )

  useEffect(
    () => () => {
      material.dispose()
      glow.dispose()
    },
    [material, glow],
  )

  useFrame((state, delta) => {
    const node = group.current
    if (!node) return
    const target = mode === 'formed' ? 1 : 0
    progress.current = MathUtils.damp(progress.current, target, 1.45, delta)
    const t = progress.current
    node.position.lerpVectors(scattered, formed, t)
    if (motion > 0) {
      const bob = Math.sin(state.clock.elapsedTime * 0.85 + index * 1.4)
      const sway = Math.cos(state.clock.elapsedTime * 0.62 + index * 0.9)
      node.position.y += bob * 0.14 * t
      node.position.x += sway * 0.05 * t
    }
    node.scale.setScalar(1)
    node.lookAt(state.camera.position)
    {
      const greet = document.querySelector('.greeting')?.getBoundingClientRect()
      const dock = document.querySelector('.dock')?.getBoundingClientRect()
      const safe = {
        minX: 16,
        maxX: state.size.width - 16,
        minY: (greet?.bottom ?? 88) + 12,
        maxY: (dock?.top ?? state.size.height - 96) - 12,
      }
      const depth = Math.max(6, state.camera.position.distanceTo(node.getWorldPosition(corner)))
      const fov = (state.camera as THREE.PerspectiveCamera).fov
      const parentScale = node.parent?.getWorldScale(corner).x || 1
      const unit = (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * depth) / state.size.height / parentScale
      for (let step = 0; step < 6; step += 1) {
        const box = projectCorners(node, side, side, state.camera, state.size)
        const overflowLeft = Math.max(0, safe.minX - box.minX)
        const overflowRight = Math.max(0, box.maxX - safe.maxX)
        const overflowTop = Math.max(0, safe.minY - box.minY)
        const overflowBottom = Math.max(0, box.maxY - safe.maxY)
        if (overflowLeft + overflowRight + overflowTop + overflowBottom < 0.5) break
        node.position.x += (overflowLeft - overflowRight) * unit
        node.position.y -= (overflowTop - overflowBottom) * unit
        if (overflowLeft + overflowRight + overflowTop + overflowBottom > 8) node.scale.multiplyScalar(0.92)
        node.lookAt(state.camera.position)
      }
    }
    onBounds(ready.story.id, projectCorners(node, side, side, state.camera, state.size))
  })

  return (
    <group ref={group} visible={activeId !== ready.story.id}>
      <mesh position={[0, 0, -0.01]} material={glow}>
        <planeGeometry args={[side * 1.22, side * 1.22]} />
      </mesh>
      <mesh
        material={material}
        onClick={(event) => {
          event.stopPropagation()
          onOpen(ready.story.id)
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <planeGeometry args={[side, side]} />
      </mesh>
    </group>
  )
}

export default function StoryPetals({ stories, mode, motion, compact, activeId, onOpen }: StoryPetalsProps) {
  const [ready, setReady] = useState<ReadyStory[]>([])
  const bounds = useRef(new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>())
  const reportBounds = (id: string, box: { minX: number; minY: number; maxX: number; maxY: number }) => {
    bounds.current.set(id, box)
    const main = document.querySelector('main')
    if (!main) return
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    bounds.current.forEach((item) => {
      minX = Math.min(minX, item.minX)
      minY = Math.min(minY, item.minY)
      maxX = Math.max(maxX, item.maxX)
      maxY = Math.max(maxY, item.maxY)
    })
    main.dataset.petalBox = [Math.round(minX), Math.round(minY), Math.round(maxX), Math.round(maxY)].join(',')
    const size = Math.min(box.maxX - box.minX, box.maxY - box.minY)
    const cx = (box.minX + box.maxX) / 2
    const cy = (box.minY + box.maxY) / 2
    petalRects.set(id, { x: cx - size / 2, y: cy - size / 2, w: size, h: size })
    const listed = [...petalRects.entries()].map(([key, rect]) => ({
      id: key,
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      w: Math.round(rect.w),
      h: Math.round(rect.h),
    }))
    main.dataset.petalRects = JSON.stringify(listed)
  }

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    let cancelled = false
    bounds.current.clear()
    const loaded: ReadyStory[] = []
    Promise.all(
      stories.map(
        (story) =>
          new Promise<ReadyStory | null>((resolve) => {
            loader.load(
              story.thumb,
              (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace
                texture.anisotropy = 4
                resolve({ story, texture })
              },
              undefined,
              () => resolve(null),
            )
          }),
      ),
    ).then((results) => {
      if (cancelled) {
        results.forEach((item) => item?.texture.dispose())
        return
      }
      results.forEach((item) => {
        if (item) loaded.push(item)
      })
      setReady(loaded)
    })
    return () => {
      cancelled = true
      loaded.forEach((item) => item.texture.dispose())
      setReady([])
    }
  }, [stories])

  return (
    <>
      {ready.map((item, index) => (
        <Petal
          key={item.story.id}
          ready={item}
          index={index}
          count={ready.length}
          mode={mode}
          motion={motion}
          compact={compact}
          activeId={activeId}
          onOpen={onOpen}
          onBounds={reportBounds}
        />
      ))}
    </>
  )
}
