import * as THREE from 'three';

/**
 * Visual settings for the birthday particle tree.
 * Derived from the upstream Christmas-tree CONFIG (foliage counts, tree
 * proportions, and the formed/scattered morph). Photographs, polaroid
 * frames, and the camera gesture path are intentionally absent.
 */
export const TREE = {
  height: 8.8,
  radius: 3.85,
};

export const COLORS = {
  navy: '#07111e',
  champagne: '#f3e6c8',
  gold: '#e4c98a',
};

const FOLIAGE_COLORS = ['#fff6e4', '#f3e6c8', '#e4c98a', '#d4b56d', '#c6a15b'].map(
  (hex) => new THREE.Color(hex),
);
const LIGHT_COLORS = ['#fffaf2', '#ffe7b8', '#f6d48a'].map((hex) => new THREE.Color(hex));
const TRUNK_COLOR = new THREE.Color('#6d5130');

export type Quality = {
  foliage: number;
  lights: number;
  stars: number;
  dpr: [number, number];
  bloom: number;
  antialias: boolean;
};

export type TreeMode = 'formed' | 'scattered';

export function detectQuality(): Quality {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 820px)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const low = coarse || narrow || cores <= 4 || memory <= 4;

  if (low) {
    return {
      foliage: 6200,
      lights: 180,
      stars: 700,
      dpr: [1, 1.25],
      bloom: 0.36,
      antialias: false,
    };
  }

  return {
    foliage: 15000,
    lights: 340,
    stars: 1400,
    dpr: [1, 1.6],
    bloom: 0.5,
    antialias: true,
  };
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export type ParticleField = {
  positions: Float32Array;
  targets: Float32Array;
  colors: Float32Array;
  randoms: Float32Array;
};

function starPosition(out: number[]) {
  const radius = 14 + Math.sqrt(Math.random()) * 32;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  out[0] = radius * Math.sin(phi) * Math.cos(theta);
  out[1] = radius * Math.cos(phi) * 0.7;
  out[2] = radius * Math.sin(phi) * Math.sin(theta);
}

function canopyPosition(out: number[], shellBias: number) {
  const y01 = Math.pow(Math.random(), 0.9);
  const y = (y01 - 0.5) * TREE.height;
  const tiers = 8;
  const tier = (y01 * tiers) % 1;
  const taper = Math.max(0.045, 1 - y01);
  const branch = 0.7 + 0.3 * Math.pow(1 - tier, 0.55);
  const radius = TREE.radius * taper * branch;
  const radial = Math.pow(Math.random(), shellBias);
  const theta = Math.random() * Math.PI * 2;
  out[0] = Math.cos(theta) * radius * radial;
  out[1] = y;
  out[2] = Math.sin(theta) * radius * radial;
}

function trunkPosition(out: number[]) {
  const y = -TREE.height / 2 - Math.random() * 0.85;
  const theta = Math.random() * Math.PI * 2;
  const radius = Math.sqrt(Math.random()) * 0.42;
  out[0] = Math.cos(theta) * radius;
  out[1] = y;
  out[2] = Math.sin(theta) * radius;
}

function writeColor(target: Float32Array, index: number, color: THREE.Color, mix = 1) {
  const offset = index * 3;
  target[offset] = color.r * mix;
  target[offset + 1] = color.g * mix;
  target[offset + 2] = color.b * mix;
}

export function createParticleField(count: number, kind: 'foliage' | 'lights'): ParticleField {
  const positions = new Float32Array(count * 3);
  const targets = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const randoms = new Float32Array(count);
  const star = [0, 0, 0];
  const formed = [0, 0, 0];

  for (let i = 0; i < count; i++) {
    starPosition(star);
    positions[i * 3] = star[0];
    positions[i * 3 + 1] = star[1];
    positions[i * 3 + 2] = star[2];
    randoms[i] = Math.random();

    if (kind === 'lights') {
      canopyPosition(formed, 0.25);
      formed[1] = Math.min(formed[1], TREE.height * 0.42);
      const color = LIGHT_COLORS[i % LIGHT_COLORS.length];
      writeColor(colors, i, color, 1);
    } else {
      const roll = Math.random();
      if (roll < 0.05) {
        trunkPosition(formed);
        writeColor(colors, i, TRUNK_COLOR, 1);
      } else {
        canopyPosition(formed, 0.38);
        writeColor(colors, i, FOLIAGE_COLORS[i % FOLIAGE_COLORS.length], 1);
      }
    }

    targets[i * 3] = formed[0];
    targets[i * 3 + 1] = formed[1];
    targets[i * 3 + 2] = formed[2];
  }

  return { positions, targets, colors, randoms };
}
