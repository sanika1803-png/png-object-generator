import type { Request, Response } from 'express';

// TODO(integration): replace with the adapter for the shared Task 1/2 engine.
import { passthroughEngine as augmentationEngine } from '../augmentationAdapter.js';
import { scanTask4Folders } from '../folderScan.js';
import { generateSyntheticDataset } from '../syntheticDataset.service.js';

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

export async function scanController(req: Request, res: Response) {
  const { backgroundsDir, objectsDir } = req.body ?? {};
  if (!isStr(backgroundsDir) || !isStr(objectsDir)) {
    return res.status(400).json({ error: 'backgroundsDir and objectsDir are required' });
  }
  try {
    res.json(await scanTask4Folders(backgroundsDir, objectsDir));
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
}

export async function generateController(req: Request, res: Response) {
  const b = req.body ?? {};
  if (!isStr(b.backgroundsDir) || !isStr(b.objectsDir) || !isStr(b.outputDir)) {
    return res.status(400).json({ error: 'backgroundsDir, objectsDir and outputDir are required' });
  }
  const numSamples = Number(b.numSamples);
  if (!Number.isInteger(numSamples) || numSamples < 1 || numSamples > 10000) {
    return res.status(400).json({ error: 'numSamples must be an integer between 1 and 10000' });
  }
  if (b.classNames !== undefined && (!Array.isArray(b.classNames) || !b.classNames.every((n: unknown) => typeof n === 'string'))) {
    return res.status(400).json({ error: 'classNames must be an array of strings' });
  }
  try {
    const summary = await generateSyntheticDataset({
      backgroundsDir: b.backgroundsDir,
      objectsDir: b.objectsDir,
      outputDir: b.outputDir,
      numSamples,
      size: b.size,
      // An empty list from the UI means "no manual list": auto-assign instead.
      classNames: Array.isArray(b.classNames) && b.classNames.some((n: string) => n.trim()) ? b.classNames : undefined,
      classMap: b.classMap,
      augmentations: b.augmentations ?? {},
      augmentationEngine,
    });
    res.json(summary);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
}
