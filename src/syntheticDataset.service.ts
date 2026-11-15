import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

import { trimTransparentPadding } from './alpha.js';
import { passthroughEngine } from './augmentationAdapter.js';
import { buildClassMap, classNameFromFile, parseManualClassList } from './classMap.js';
import { createRng, DEFAULT_SIZE, planPlacement, randInt, validateSizeSpec } from './placement.js';
import type { GenerateOptions, GenerateSummary, YoloBox } from './types.js';
import { formatYoloFile, pixelBoxToYolo, validateYoloBox } from './yolo.js';

const BG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp']);

async function listFiles(dir: string, exts: Set<string>): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && exts.has(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort();
}

const safe = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);

/** Next free sample number, so re-runs never overwrite earlier output. */
async function nextStartIndex(outputDir: string): Promise<number> {
  let max = 0;
  for (const name of await fs.readdir(outputDir)) {
    const m = /^synthetic_(\d+)/.exec(name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

export async function generateSyntheticDataset(opts: GenerateOptions): Promise<GenerateSummary> {
  const {
    backgroundsDir,
    objectsDir,
    outputDir,
    numSamples,
    size = DEFAULT_SIZE,
    alphaThreshold = 10,
    augmentations = {},
    augmentationEngine = passthroughEngine,
    jpegQuality = 95,
  } = opts;

  // --- validate input -------------------------------------------------------
  if (!Number.isInteger(numSamples) || numSamples < 1) throw new Error('numSamples must be a positive integer');
  const sizeError = validateSizeSpec(size);
  if (sizeError) throw new Error(sizeError);
  const resolved = [backgroundsDir, objectsDir].map((d) => path.resolve(d));
  if (resolved.includes(path.resolve(outputDir))) {
    throw new Error('outputDir must be a different folder from the backgrounds/objects folders');
  }

  const bgFiles = await listFiles(backgroundsDir, BG_EXT);
  const objFiles = await listFiles(objectsDir, new Set(['.png']));
  if (!bgFiles.length) throw new Error(`No background images found in ${backgroundsDir}`);
  if (!objFiles.length) throw new Error(`No PNG objects found in ${objectsDir}`);

  await fs.mkdir(outputDir, { recursive: true });

  const rng = createRng(opts.seed);

  // Trim each object once, skipping unusable PNGs instead of failing the whole run.
  const errors: string[] = [];
  const objects = new Map<string, Awaited<ReturnType<typeof trimTransparentPadding>>>();
  for (const f of objFiles) {
    try {
      objects.set(f, await trimTransparentPadding(path.join(objectsDir, f), alphaThreshold));
    } catch (e) {
      errors.push(`${f}: ${(e as Error).message}`);
    }
  }
  let usable = [...objects.keys()];

  // Class ids: either the user's manual list (index = id) or auto-assigned from usable objects.
  let classMap: Record<string, number>;
  let classFileNames: string[];
  if (opts.classNames) {
    const manual = parseManualClassList(opts.classNames);
    classMap = Object.fromEntries(manual.names.map((n, id) => [n, id]));
    classFileNames = manual.names;
    const known = usable.filter((f) => manual.lookup.has(classNameFromFile(f).toLowerCase()));
    for (const f of usable.filter((f) => !known.includes(f))) {
      errors.push(`${f}: class "${classNameFromFile(f)}" is not in the class list (object skipped)`);
    }
    usable = known;
    if (!usable.length) throw new Error(`No PNG object matches the class list. ${errors.join('; ')}`);
  } else {
    if (!usable.length) throw new Error(`No usable PNG objects. ${errors.join('; ')}`);
    // Only usable objects get ids, so unusable PNGs never leave gaps.
    classMap = buildClassMap(usable, opts.classMap);
    classFileNames = Object.entries(classMap).sort((a, b) => a[1] - b[1]).map(([n]) => n);
  }

  // --- generate -------------------------------------------------------------
  const files: string[] = [];
  let skipped = 0;
  let index = await nextStartIndex(outputDir);

  for (let n = 0; n < numSamples; n++) {
    const bgName = bgFiles[randInt(rng, 0, bgFiles.length - 1)];
    const objName = usable[randInt(rng, 0, usable.length - 1)];
    const obj = objects.get(objName)!;
    const className = classNameFromFile(objName);
    const classId = opts.classNames
      ? parseManualClassList(opts.classNames).lookup.get(className.toLowerCase())!
      : classMap[className];

    try {
      // Auto-orient + flatten so the background is plain RGB with true pixel dimensions.
      const bgBuf = await sharp(path.join(backgroundsDir, bgName))
        .rotate()
        .flatten({ background: '#ffffff' })
        .png({ compressionLevel: 1 })
        .toBuffer();
      const { width: bgW, height: bgH } = await sharp(bgBuf).metadata();
      if (!bgW || !bgH) throw new Error('unreadable background size');

      const plan = planPlacement(bgW, bgH, obj.width, obj.height, size, rng);
      const resized = await sharp(obj.buffer).resize(plan.width, plan.height, { fit: 'fill' }).png().toBuffer();

      const composite = await sharp(bgBuf)
        .composite([{ input: resized, left: plan.left, top: plan.top }])
        .png({ compressionLevel: 1 })
        .toBuffer();

      const initial = pixelBoxToYolo(plan.box, bgW, bgH, classId);
      if (!initial) throw new Error('empty box after clipping');

      // Hand off to the shared augmentation engine (image + annotations in, both out).
      const aug = await augmentationEngine.apply(composite, [initial], augmentations);

      const valid: YoloBox[] = aug.annotations.filter((b) => validateYoloBox(b).length === 0);
      if (!valid.length) {
        skipped++;
        errors.push(`sample ${index}: no valid annotation after augmentation (skipped)`);
        continue;
      }

      const base =
        `synthetic_${String(index).padStart(4, '0')}_${safe(className)}_bg-${safe(path.parse(bgName).name)}` +
        (aug.suffix ? `_aug-${safe(aug.suffix)}` : '');

      await sharp(aug.image).jpeg({ quality: jpegQuality }).toFile(path.join(outputDir, `${base}.jpg`));
      await fs.writeFile(path.join(outputDir, `${base}.txt`), formatYoloFile(valid));
      files.push(base);
      index++;
    } catch (e) {
      skipped++;
      errors.push(`${bgName} + ${objName}: ${(e as Error).message}`);
    }
  }

  // classes.txt: one name per line, ordered by id (standard for YOLO tooling).
  await fs.writeFile(path.join(outputDir, 'classes.txt'), classFileNames.join('\n') + '\n');

  return {
    requested: numSamples,
    generated: files.length,
    skipped,
    outputDir,
    classes: classMap,
    files,
    errors,
  };
}
