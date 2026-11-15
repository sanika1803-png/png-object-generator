import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

import { generateSyntheticDataset } from '../src/syntheticDataset.service.js';
import type { AugmentationEngine } from '../src/types.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'task4-'));
const bgDir = path.join(root, 'backgrounds');
const objDir = path.join(root, 'objects');
await fs.mkdir(bgDir);
await fs.mkdir(objDir);

// --- fixtures ---------------------------------------------------------------
const solid = (w: number, h: number, c: string) =>
  sharp({ create: { width: w, height: h, channels: 3, background: c } });
await solid(800, 600, '#0000ff').jpeg().toFile(path.join(bgDir, 'street.jpg'));
await solid(640, 480, '#0000ff').png().toFile(path.join(bgDir, 'office.png'));

// Opaque rectangle surrounded by lots of transparent padding (padding must NOT end up in the box).
const padded = async (file: string, canvasW: number, canvasH: number, r: { x: number; y: number; w: number; h: number }, color: string) => {
  const rect = await sharp({ create: { width: r.w, height: r.h, channels: 4, background: color } }).png().toBuffer();
  await sharp({ create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: rect, left: r.x, top: r.y }])
    .png()
    .toFile(path.join(objDir, file));
};
await padded('car_1.png', 500, 400, { x: 120, y: 90, w: 240, h: 120 }, '#ff0000');
await padded('car_2.png', 300, 300, { x: 50, y: 60, w: 150, h: 90 }, '#ff0000');
await padded('person.png', 400, 600, { x: 150, y: 100, w: 80, h: 400 }, '#00ff00');
await sharp({ create: { width: 50, height: 50, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .png()
  .toFile(path.join(objDir, 'empty.png')); // fully transparent -> must be skipped, not crash

const hashDir = async (dir: string) => {
  const out: Record<string, string> = {};
  for (const f of (await fs.readdir(dir)).sort()) {
    out[f] = crypto.createHash('md5').update(await fs.readFile(path.join(dir, f))).digest('hex');
  }
  return out;
};
const bgBefore = await hashDir(bgDir);
const objBefore = await hashDir(objDir);

// --- helper: measure the object's real bbox in the output image ---------------
async function measure(imgPath: string, isRed: boolean) {
  const { data, info } = await sharp(imgPath).raw().toBuffer({ resolveWithObject: true });
  let x1 = info.width, y1 = info.height, x2 = -1, y2 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const hit = isRed ? r > 200 && g < 70 && b < 70 : g > 200 && r < 70 && b < 70;
      if (hit) {
        x1 = Math.min(x1, x); x2 = Math.max(x2, x + 1);
        y1 = Math.min(y1, y); y2 = Math.max(y2, y + 1);
      }
    }
  }
  return { x1, y1, x2, y2, w: info.width, h: info.height };
}

async function checkAll(outDir: string, files: string[], flipX = false) {
  for (const base of files) {
    const lines = (await fs.readFile(path.join(outDir, `${base}.txt`), 'utf8')).trim().split('\n');
    assert.equal(lines.length, 1, `${base}: expected 1 box`);
    const [cls, cx, cy, bw, bh] = lines[0].split(' ').map(Number);
    const isRed = base.includes('_car_');
    const m = await measure(path.join(outDir, `${base}.jpg`), isRed);
    const tol = 3; // px, JPEG edge blur
    const exp = {
      x1: (cx - bw / 2) * m.w, x2: (cx + bw / 2) * m.w,
      y1: (cy - bh / 2) * m.h, y2: (cy + bh / 2) * m.h,
    };
    for (const k of ['x1', 'x2', 'y1', 'y2'] as const) {
      assert.ok(Math.abs(exp[k] - m[k]) <= tol, `${base}: ${k} annotation=${exp[k].toFixed(1)} measured=${m[k]}`);
    }
    assert.ok(cls === 0 || cls === 1, `${base}: class ${cls}`);
    void flipX;
  }
}

// --- test 1: no augmentation ---------------------------------------------------
const out1 = path.join(root, 'out1');
const s1 = await generateSyntheticDataset({
  backgroundsDir: bgDir, objectsDir: objDir, outputDir: out1, numSamples: 40, seed: 7,
});
assert.equal(s1.generated, 40);
assert.ok(s1.errors.some((e) => e.includes('empty.png')), 'empty PNG should be reported');
assert.deepEqual(s1.classes, { car: 0, person: 1 });
await checkAll(out1, s1.files);
console.log(`PASS 1: ${s1.generated} samples, boxes match rendered pixels (incl. padded + tall objects)`);

// --- test 2: pairs + unique names ---------------------------------------------
const all = await fs.readdir(out1);
const jpgs = all.filter((f) => f.endsWith('.jpg'));
const txts = all.filter((f) => f.startsWith('synthetic_') && f.endsWith('.txt'));
assert.equal(jpgs.length, txts.length);
assert.equal(new Set(jpgs).size, jpgs.length);
for (const j of jpgs) assert.ok(txts.includes(j.replace('.jpg', '.txt')));
console.log('PASS 2: every .jpg has a .txt, names unique');

// --- test 3: rerun never overwrites -------------------------------------------
const s1b = await generateSyntheticDataset({
  backgroundsDir: bgDir, objectsDir: objDir, outputDir: out1, numSamples: 5, seed: 8,
});
assert.equal((await fs.readdir(out1)).filter((f) => f.endsWith('.jpg')).length, 45);
assert.ok(!s1b.files.some((f) => s1.files.includes(f)));
console.log('PASS 3: re-run appends, nothing overwritten');

// --- test 4: geometric augmentation through the seam ---------------------------
// TEST-ONLY mock standing in for the Task 1/2 engine: horizontal flip with box update.
const mockFlip: AugmentationEngine = {
  async apply(image, annotations) {
    return {
      image: await sharp(image).flop().png().toBuffer(),
      annotations: annotations.map((b) => ({ ...b, centerX: 1 - b.centerX })),
      suffix: 'hflip',
    };
  },
};
const out2 = path.join(root, 'out2');
const s2 = await generateSyntheticDataset({
  backgroundsDir: bgDir, objectsDir: objDir, outputDir: out2, numSamples: 20, seed: 3,
  augmentationEngine: mockFlip, augmentations: { horizontalFlip: true },
});
assert.ok(s2.files.every((f) => f.includes('_aug-hflip')), 'filename must identify augmentation');
await checkAll(out2, s2.files);
console.log('PASS 4: boxes stay correct after a geometric augmentation; filename tagged');

// --- test 4b: exact pixel size ---------------------------------------------------
const out3 = path.join(root, 'out3');
const s3 = await generateSyntheticDataset({
  backgroundsDir: bgDir, objectsDir: objDir, outputDir: out3, numSamples: 12, seed: 5,
  size: { mode: 'pixelWidth', min: 100, max: 100 },
});
for (const base of s3.files) {
  const [, , , bw] = (await fs.readFile(path.join(out3, `${base}.txt`), 'utf8')).trim().split(' ').map(Number);
  const m = await sharp(path.join(out3, `${base}.jpg`)).metadata();
  const px = bw * m.width!;
  if (base.includes('_car_')) assert.ok(Math.abs(px - 100) <= 1.01, `${base}: width ${px.toFixed(1)}px, wanted 100`);
  else assert.ok(px <= 100.01, `${base}: tall object may shrink to fit but never grow (${px.toFixed(1)}px)`);
}
// percent of HEIGHT: 50% of an 480/600-high background
const out3b = path.join(root, 'out3b');
const s3b = await generateSyntheticDataset({
  backgroundsDir: bgDir, objectsDir: objDir, outputDir: out3b, numSamples: 12, seed: 6,
  size: { mode: 'percentHeight', min: 0.3, max: 0.3 },
});
for (const base of s3b.files) {
  const bh = Number((await fs.readFile(path.join(out3b, `${base}.txt`), 'utf8')).trim().split(' ')[4]);
  assert.ok(Math.abs(bh - 0.3) < 0.01, `${base}: height fraction ${bh}`);
}
// oversize request must shrink to fit, never overflow
const out3c = path.join(root, 'out3c');
const s3c = await generateSyntheticDataset({
  backgroundsDir: bgDir, objectsDir: objDir, outputDir: out3c, numSamples: 8, seed: 9,
  size: { mode: 'pixelWidth', min: 5000, max: 5000 },
});
assert.equal(s3c.generated, 8);
await checkAll(out3c, s3c.files);
await assert.rejects(
  generateSyntheticDataset({ backgroundsDir: bgDir, objectsDir: objDir, outputDir: path.join(root, 'x'), numSamples: 1, size: { mode: 'pixelWidth', min: 50, max: 10 } }),
  /min <= max/,
);
console.log('PASS 4b: exact pixel size, percent-of-height, oversize shrink, bad range rejected');

// --- test 4c: manual class list -------------------------------------------------
const out4 = path.join(root, 'out4');
const s4 = await generateSyntheticDataset({
  backgroundsDir: bgDir, objectsDir: objDir, outputDir: out4, numSamples: 30, seed: 11,
  classNames: ['Bicycle', 'Person', 'Car'], // note: different case from the filenames, and 'Bicycle' has no PNG
});
assert.deepEqual(s4.classes, { Bicycle: 0, Person: 1, Car: 2 });
assert.equal(await fs.readFile(path.join(out4, 'classes.txt'), 'utf8'), 'Bicycle\nPerson\nCar\n');
for (const base of s4.files) {
  const cls = Number((await fs.readFile(path.join(out4, `${base}.txt`), 'utf8')).split(' ')[0]);
  assert.equal(cls, base.includes('_car_') ? 2 : 1, `${base}: wrong class id ${cls}`);
}
assert.ok(s4.errors.some((e) => e.includes('empty.png')));
// a PNG whose class is missing from the list is skipped and reported, others still work
const s4b = await generateSyntheticDataset({
  backgroundsDir: bgDir, objectsDir: objDir, outputDir: path.join(root, 'out4b'), numSamples: 10, seed: 12,
  classNames: ['car'],
});
assert.ok(s4b.files.every((f) => f.includes('_car_')));
assert.ok(s4b.errors.some((e) => e.includes('person.png') && e.includes('not in the class list')));
await assert.rejects(
  generateSyntheticDataset({ backgroundsDir: bgDir, objectsDir: objDir, outputDir: path.join(root, 'y'), numSamples: 1, classNames: ['car', 'CAR'] }),
  /appears twice/,
);
await assert.rejects(
  generateSyntheticDataset({ backgroundsDir: bgDir, objectsDir: objDir, outputDir: path.join(root, 'z'), numSamples: 1, classNames: ['dog'] }),
  /No PNG object matches/,
);
console.log('PASS 4c: manual class list gives fixed ids, ignores case, skips unlisted, rejects duplicates');

// --- test 5: originals untouched + bad input rejected --------------------------
assert.deepEqual(await hashDir(bgDir), bgBefore);
assert.deepEqual(await hashDir(objDir), objBefore);
await assert.rejects(
  generateSyntheticDataset({ backgroundsDir: bgDir, objectsDir: objDir, outputDir: bgDir, numSamples: 1 }),
  /different folder/,
);
console.log('PASS 5: originals byte-identical; output==input folder rejected');

console.log('\nsample output:', s1.files[0]);
console.log(await fs.readFile(path.join(out1, `${s1.files[0]}.txt`), 'utf8'));
await fs.rm(root, { recursive: true, force: true });
