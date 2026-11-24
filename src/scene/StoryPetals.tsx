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
  onOpen: (id: string) => void
}

const seeded = (seed: number) => {
  let value = seed || 1
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

const slotFor = (index: number, count: number, seed: number) => {
  const random = seeded(seed)
  const y01 = count === 1 ? 0.46 : 0.16 + (index / (count - 1)) * 0.7
  const y = (y01 - 0.5) * TREE.height
  const taper = Math.pow(1 - y01, 0.86)
  const radius = TREE.radius * taper * 1.08
  const theta = -Math.PI * 0.85 + (index / Math.max(1, count)) * Math.PI * 1.35
  const formed = new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius)
  const scattered = new THREE.Vector3((random() - 0.5) * 16, (random() - 0.5) * 9, (random() - 0.5) * 10)
  return { formed, scattered }
}

function Petal({
  ready,
  index,
  count,
  mode,
  motion,
  onOpen,
}: {
  ready: ReadyStory
  index: number
  count: number
  mode: TreeMode
  motion: number
  onOpen: (id: string) => void
}) {
  const group = useRef<THREE.Group>(null)
  const progress = useRef(mode === 'formed' ? 1 : 0)
  const { formed, scattered } = useMemo(
    () => slotFor(index, count, ready.story.index * 97),
    [index, count, ready.story.index],
  )
  const [width, height] = planeSize(ready.story.width, ready.story.height)
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
    node.lookAt(state.camera.position)
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

export default function StoryPetals({ stories, mode, motion, onOpen }: StoryPetalsProps) {
  const [ready, setReady] = useState<ReadyStory[]>([])

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    let cancelled = false
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
          onOpen={onOpen}
        />
      ))}
    </>
  )
}
