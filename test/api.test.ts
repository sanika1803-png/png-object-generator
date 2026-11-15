import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import sharp from 'sharp';

import { task4Router } from '../src/api/task4.routes.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'task4api-'));
const [bg, obj, out] = ['backgrounds', 'objects', 'output'].map((d) => path.join(root, d));
await fs.mkdir(bg); await fs.mkdir(obj);
await sharp({ create: { width: 640, height: 480, channels: 3, background: '#223344' } }).jpeg().toFile(path.join(bg, 'a.jpg'));
const rect = await sharp({ create: { width: 100, height: 60, channels: 4, background: '#ff0000' } }).png().toBuffer();
await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: rect, left: 40, top: 70 }]).png().toFile(path.join(obj, 'car.png'));

const app = express();
app.use(express.json());
app.use('/api/task4', task4Router);
const server = app.listen(0);
const port = (server.address() as { port: number }).port;
const call = async (p: string, body: unknown) => {
  const r = await fetch(`http://127.0.0.1:${port}/api/task4${p}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  return { status: r.status, json: (await r.json()) as any };
};

const scan = await call('/scan', { backgroundsDir: bg, objectsDir: obj });
assert.equal(scan.status, 200);
assert.deepEqual(scan.json, {
  backgrounds: { folderName: 'backgrounds', totalImages: 1 },
  objects: { folderName: 'objects', totalPngs: 1, classes: ['car'] },
});

const gen = await call('/generate', {
  backgroundsDir: bg, objectsDir: obj, outputDir: out, numSamples: 6, augmentations: { brightness: true },
});
assert.equal(gen.status, 200);
assert.equal(gen.json.generated, 6);
assert.equal((await fs.readdir(out)).filter((f) => f.endsWith('.txt') && f !== 'classes.txt').length, 6);

// Same payload shape the page sends: size object + manual class list
const gen2 = await call('/generate', {
  backgroundsDir: bg, objectsDir: obj, outputDir: path.join(root, 'output2'), numSamples: 4,
  size: { mode: 'pixelWidth', min: 80, max: 80 }, classNames: ['person', 'car'], augmentations: {},
});
assert.equal(gen2.status, 200);
assert.deepEqual(gen2.json.classes, { person: 0, car: 1 });
assert.equal((await fs.readFile(path.join(root, 'output2', 'classes.txt'), 'utf8')), 'person\ncar\n');
assert.equal((await call('/generate', { backgroundsDir: bg, objectsDir: obj, outputDir: path.join(root, 'o3'), numSamples: 1, classNames: ['car', 'Car'] })).status, 400);
assert.equal((await call('/generate', { backgroundsDir: bg, objectsDir: obj, outputDir: path.join(root, 'o4'), numSamples: 1, size: { mode: 'bogus', min: 1, max: 2 } })).status, 400);
// empty list from the UI = auto-assign
const gen3 = await call('/generate', { backgroundsDir: bg, objectsDir: obj, outputDir: path.join(root, 'o5'), numSamples: 1, classNames: [] });
assert.equal(gen3.status, 200);
assert.equal((await call('/generate', { backgroundsDir: bg, objectsDir: obj, outputDir: out, numSamples: 0 })).status, 400);
assert.equal((await call('/scan', { backgroundsDir: '/nope', objectsDir: obj })).status, 400);
assert.equal((await call('/scan', {})).status, 400);

console.log('PASS API: scan, generate, and input validation all behave');
server.close();
await fs.rm(root, { recursive: true, force: true });
