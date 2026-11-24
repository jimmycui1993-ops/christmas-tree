import * as THREE from 'three';

/**
 * Birthday particle tree.
 * The formed/scattered morph comes from moleculemmeng020425/christmas-tree (MIT).
 * Palette and the orchid line are taken from the Laura gift design: cream,
 * mist blue, a little champagne, and a white phalaenopsis with a pale pink center.
 * No photographs.
 */
export const TREE = {
  height: 6.6,
  radius: 2.62,
};

export const COLORS = {
  indigo: '#0c1424',
  ivory: '#f4efe6',
  mist: '#c5d5e0',
  champagne: '#e4d3ae',
  pink: '#f0c9cf',
};

const IVORY = new THREE.Color('#f3eee6');
const MIST = new THREE.Color('#b7cdd9');
const MIST_DEEP = new THREE.Color('#8eafc0');
const CHAMPAGNE = new THREE.Color('#e6d3aa');

export type Quality = {
  foliage: number;
  bokeh: number;
  stars: number;
  petals: number;
  compact: boolean;
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

  const compact = narrow || coarse;
  const petals = compact ? 5 : 7;
  if (low) {
    return {
      foliage: 9000,
      bokeh: 10,
      stars: 900,
      petals,
      compact,
      dpr: [1, 1.2],
      bloom: 0.08,
      antialias: false,
    };
  }

  return {
    foliage: 18000,
    bokeh: 16,
    stars: 1800,
    petals,
    compact,
    dpr: [1, 1.5],
    bloom: 0.1,
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
  sizes: Float32Array;
};

const TIERS = 7;

function starfieldPosition(out: number[], spread: number) {
  const radius = spread * (0.25 + Math.pow(Math.random(), 0.65));
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  out[0] = radius * Math.sin(phi) * Math.cos(theta);
  out[1] = radius * Math.cos(phi) * 0.62;
  out[2] = radius * Math.sin(phi) * Math.sin(theta);
}

function branchPosition(out: number[]) {
  const tier = Math.min(TIERS - 1, Math.floor(Math.pow(Math.random(), 1.15) * TIERS));
  const along = Math.random();
  const y01 = Math.min(0.98, (tier + 0.12 + along * 0.78) / TIERS);
  const y = (y01 - 0.5) * TREE.height;
  const taper = Math.pow(1 - y01, 0.86);
  const rim = Math.random() < 0.7 ? 0.74 + Math.random() * 0.26 : 0.38 + Math.random() * 0.36;
  const radius = Math.max(0.045, TREE.radius * taper * rim);
  const sprays = 10;
  const spray = Math.floor(Math.random() * sprays);
  const theta = (spray / sprays) * Math.PI * 2 + (Math.random() - 0.5) * 0.55;
  const droop = rim * rim * 0.32;
  out[0] = Math.cos(theta) * radius;
  out[1] = y - droop;
  out[2] = Math.sin(theta) * radius;
}

function spinePosition(out: number[]) {
  const y01 = Math.pow(Math.random(), 0.85) * 0.96;
  const theta = Math.random() * Math.PI * 2;
  const radius = Math.random() * 0.07;
  out[0] = Math.cos(theta) * radius;
  out[1] = (y01 - 0.5) * TREE.height;
  out[2] = Math.sin(theta) * radius;
}

function trunkPosition(out: number[]) {
  const y = -TREE.height / 2 - Math.random() * 0.55;
  const theta = Math.random() * Math.PI * 2;
  const radius = Math.sqrt(Math.random()) * 0.12;
  out[0] = Math.cos(theta) * radius;
  out[1] = y;
  out[2] = Math.sin(theta) * radius;
}

function writeColor(target: Float32Array, index: number, color: THREE.Color) {
  const offset = index * 3;
  const wobble = 0.94 + Math.random() * 0.08;
  target[offset] = color.r * wobble;
  target[offset + 1] = color.g * wobble;
  target[offset + 2] = color.b * wobble;
}

export function createParticleField(count: number): ParticleField {
  const positions = new Float32Array(count * 3);
  const targets = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const randoms = new Float32Array(count);
  const sizes = new Float32Array(count);
  const scattered = [0, 0, 0];
  const formed = [0, 0, 0];

  for (let i = 0; i < count; i += 1) {
    starfieldPosition(scattered, 22);
    positions[i * 3] = scattered[0];
    positions[i * 3 + 1] = scattered[1];
    positions[i * 3 + 2] = scattered[2];
    randoms[i] = Math.random();

    const roll = Math.random();
    if (roll < 0.03) {
      trunkPosition(formed);
      writeColor(colors, i, MIST_DEEP);
      sizes[i] = 0.65 + Math.random() * 0.3;
    } else if (roll < 0.07) {
      spinePosition(formed);
      writeColor(colors, i, MIST);
      sizes[i] = 0.55 + Math.random() * 0.25;
    } else {
      branchPosition(formed);
      if (roll < 0.16) {
        writeColor(colors, i, CHAMPAGNE);
        sizes[i] = 1.15 + Math.random() * 0.45;
      } else if (roll < 0.4) {
        writeColor(colors, i, MIST);
        sizes[i] = 0.75 + Math.random() * 0.45;
      } else {
        writeColor(colors, i, IVORY);
        sizes[i] = 0.8 + Math.random() * 0.5;
      }
    }

    targets[i * 3] = formed[0];
    targets[i * 3 + 1] = formed[1];
    targets[i * 3 + 2] = formed[2];
  }

  return { positions, targets, colors, randoms, sizes };
}

export function createBokeh(count: number): ParticleField {
  const positions = new Float32Array(count * 3);
  const targets = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const randoms = new Float32Array(count);
  const sizes = new Float32Array(count);
  const palette = [IVORY, MIST, CHAMPAGNE];

  for (let i = 0; i < count; i += 1) {
    const x = (Math.random() - 0.5) * 16;
    const y = (Math.random() - 0.5) * 10;
    const z = 3.5 + Math.random() * 5.5;
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    targets[i * 3] = x;
    targets[i * 3 + 1] = y;
    targets[i * 3 + 2] = z;
    randoms[i] = Math.random();
    sizes[i] = 0.7 + Math.random() * 0.8;
    writeColor(colors, i, palette[i % palette.length]);
  }

  return { positions, targets, colors, randoms, sizes };
}
