import type { SizeSpec } from './types.js';
import type { PixelBox } from './yolo.js';

/** Small seedable RNG (mulberry32) so runs can be reproduced for testing. */
export function createRng(seed?: number): () => number {
  if (seed === undefined) return Math.random;
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: () => number, minInclusive: number, maxInclusive: number): number {
  return minInclusive + Math.floor(rng() * (maxInclusive - minInclusive + 1));
}

export const DEFAULT_SIZE: SizeSpec = { mode: 'percentWidth', min: 0.15, max: 0.4 };

/** Returns an error message for an unusable size setting, or null if it is fine. */
export function validateSizeSpec(size: SizeSpec): string | null {
  const modes = ['percentWidth', 'percentHeight', 'pixelWidth', 'pixelHeight'];
  if (!modes.includes(size.mode)) return `unknown size mode "${size.mode}"`;
  if (!Number.isFinite(size.min) || !Number.isFinite(size.max)) return 'size min/max must be numbers';
  if (size.min <= 0 || size.min > size.max) return 'size must satisfy 0 < min <= max';
  if (size.mode.startsWith('percent') && size.max > 1) return 'percent sizes must be at most 100%';
  return null;
}

/**
 * Chooses the object's size (keeping its aspect ratio, always fitting inside the
 * background) and a random top-left position. Returns the resulting pixel box.
 */
export function planPlacement(
  bgW: number,
  bgH: number,
  objW: number,
  objH: number,
  size: SizeSpec,
  rng: () => number,
): { width: number; height: number; left: number; top: number; box: PixelBox } {
  const value = size.min + rng() * (size.max - size.min);
  const byWidth = size.mode === 'percentWidth' || size.mode === 'pixelWidth';
  const isPercent = size.mode === 'percentWidth' || size.mode === 'percentHeight';
  const reference = isPercent ? value * (byWidth ? bgW : bgH) : value;

  let width: number;
  let height: number;
  if (byWidth) {
    width = Math.max(1, Math.round(reference));
    height = Math.max(1, Math.round((objH / objW) * width));
  } else {
    height = Math.max(1, Math.round(reference));
    width = Math.max(1, Math.round((objW / objH) * height));
  }

  // Too big for the background: shrink both sides together so the shape is kept.
  const factor = Math.min(1, bgW / width, bgH / height);
  if (factor < 1) {
    width = Math.max(1, Math.min(bgW, Math.floor(width * factor)));
    height = Math.max(1, Math.min(bgH, Math.floor(height * factor)));
  }

  const left = randInt(rng, 0, bgW - width);
  const top = randInt(rng, 0, bgH - height);

  return {
    width,
    height,
    left,
    top,
    box: { xMin: left, yMin: top, xMax: left + width, yMax: top + height },
  };
}
