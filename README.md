# Task 4 — PNG Object + Background Generation

Backend: Node.js + TypeScript (sharp, express). Frontend: React/Next.js components.

## Where files go (adjust to your project's structure; do not invent new folders)
Backend
- `src/alpha.ts, placement.ts, yolo.ts, classMap.ts, folderScan.ts, syntheticDataset.service.ts` -> services/utils
- `src/augmentationAdapter.ts` -> the ONLY place that talks to the Task 1/2 engine
- `src/api/task4.controller.ts, task4.routes.ts` -> controller + route (mount at `/api/task4`)

Frontend
- `frontend/page.tsx` -> the Task 4 page (thin, no logic)
- `frontend/components/*` -> separate components; `AugmentationCard` and `FolderInfo` are reusable (shared folder if wanted)

## Connecting the shared pieces (3 TODOs)
1. Augmentation engine: write an adapter implementing `AugmentationEngine` (image + YOLO boxes + config in, image + boxes out) and use it in `task4.controller.ts`. Do not write augmentations in Task 4.
2. Folder selector: in `PngObjectBackgroundPanel.tsx`, replace `PathField` with the shared FolderSelector.
3. Augmentation cards / API client: reuse the shared ones if they exist.

## Endpoints
- `POST /api/task4/scan` `{ backgroundsDir, objectsDir }` -> folder names, counts, classes
- `POST /api/task4/generate` `{ backgroundsDir, objectsDir, outputDir, numSamples, size?, classNames?, augmentations? }` -> summary
  - `size`: `{ mode: 'percentWidth'|'percentHeight'|'pixelWidth'|'pixelHeight', min, max }` (percent as fractions, 0.2 = 20%)
  - `classNames`: manual class list, index = class id (`["car","person"]` -> car=0, person=1). Empty/omitted = auto-assign.

## Output
`synthetic_0001_car_bg-street[_aug-hflip].jpg` + matching `.txt` (YOLO), plus `classes.txt`.

## Run tests
`npm install && npm test && npx tsx test/api.test.ts`

## See it in the browser (demo)
```
npm install
npm run dev
```
Open http://localhost:5173. The API runs on http://localhost:3001 (proxied automatically).
Type full folder paths, e.g. `C:\\Users\\you\\backgrounds`. `server.ts`, `vite.config.ts` and `demo/` are demo-only; do not submit them to the Utoolity repo.
