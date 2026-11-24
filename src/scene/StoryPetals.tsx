import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import * as THREE from 'three'
import { TREE, type TreeMode } from '../treeConfig'
import { planeSize, type Story } from '../stories/album'

type ReadyStory = {
  story: Story
  texture: THREE.Texture
}

type StoryPetalsProps = {
  stories: Story[]
  mode: TreeMode
  motion: number
  compact: boolean
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
  onOpen,
  onBounds,
}: {
  ready: ReadyStory
  index: number
  count: number
  mode: TreeMode
  motion: number
  compact: boolean
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
  const width = fitted[0] * (compact ? 0.72 : 1)
  const height = fitted[1] * (compact ? 0.72 : 1)
  const material = useMemo(() => {
    const next = new THREE.MeshBasicMaterial({
      map: ready.texture,
      transparent: true,
      toneMapped: true,
      depthWrite: false,
    })
    return next
  }, [ready.texture])
  const glow = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#d7e6ee',
        transparent: true,
        opacity: 0.16,
        toneMapped: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
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
    if (motion > 0) node.position.y += Math.sin(state.clock.elapsedTime * 0.6 + index) * 0.03 * t
    node.scale.setScalar(1)
    node.lookAt(state.camera.position)
    if (compact) {
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
        const box = projectCorners(node, width, height, state.camera, state.size)
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
    onBounds(ready.story.id, projectCorners(node, width, height, state.camera, state.size))
  })

  return (
    <group ref={group}>
      <mesh position={[0, 0, -0.02]} material={glow}>
        <planeGeometry args={[width * 1.08, height * 1.08]} />
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
        <planeGeometry args={[width, height]} />
      </mesh>
    </group>
  )
}

export default function StoryPetals({ stories, mode, motion, compact, onOpen }: StoryPetalsProps) {
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
          onOpen={onOpen}
          onBounds={reportBounds}
        />
      ))}
    </>
  )
}
