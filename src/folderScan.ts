import fs from 'node:fs/promises';
import path from 'node:path';

export interface Task4FolderScan {
  backgrounds: { folderName: string; totalImages: number };
  objects: { folderName: string; totalPngs: number; classes: string[] };
}

const BG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp']);

async function names(dir: string): Promise<string[]> {
  const stat = await fs.stat(dir).catch(() => null);
  if (!stat?.isDirectory()) throw new Error(`Not a folder: ${dir}`);
  return (await fs.readdir(dir, { withFileTypes: true })).filter((e) => e.isFile()).map((e) => e.name);
}

/** Read-only summary shown in the UI right after the two folders are chosen. */
export async function scanTask4Folders(backgroundsDir: string, objectsDir: string): Promise<Task4FolderScan> {
  const bgs = (await names(backgroundsDir)).filter((n) => BG_EXT.has(path.extname(n).toLowerCase()));
  const pngs = (await names(objectsDir)).filter((n) => path.extname(n).toLowerCase() === '.png');
  const { classNameFromFile } = await import('./classMap.js');
  return {
    backgrounds: { folderName: path.basename(backgroundsDir), totalImages: bgs.length },
    objects: {
      folderName: path.basename(objectsDir),
      totalPngs: pngs.length,
      classes: [...new Set(pngs.map(classNameFromFile))].sort(),
    },
  };
}
