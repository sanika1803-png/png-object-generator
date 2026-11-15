'use client';

import { useState } from 'react';

import { AugmentationCard } from './AugmentationCard';
import { ClassListInput, classListError, parseClassLines } from './ClassListInput';
import { FolderInfo } from './FolderInfo';
import { GenerationControls } from './GenerationControls';
import { generateSamples, scanFolders } from './task4Api';
import {
  AUGMENTATION_OPTIONS,
  SIZE_MODE_OPTIONS,
  type SizeMode,
  type Task4FolderScan,
  type Task4Summary,
} from './task4Types';

/**
 * TODO(integration): replace PathField with the existing FolderSelector from
 * apps/frontend/components/shared (one for backgrounds, one for objects, one for output).
 * Everything else only needs the three folder values it returns.
 */
function PathField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded border px-2 py-1" />
    </label>
  );
}

export function PngObjectBackgroundPanel() {
  const [backgroundsDir, setBackgroundsDir] = useState('');
  const [objectsDir, setObjectsDir] = useState('');
  const [outputDir, setOutputDir] = useState('');
  const [scan, setScan] = useState<Task4FolderScan | null>(null);
  const [numSamples, setNumSamples] = useState(50);
  const [sizeMode, setSizeMode] = useState<SizeMode>('percentWidth');
  const [sizeMin, setSizeMin] = useState(15);
  const [sizeMax, setSizeMax] = useState(40);
  const [classText, setClassText] = useState('');
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Task4Summary | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onScan = () => run(async () => setScan(await scanFolders(backgroundsDir, objectsDir)));

  const onGenerate = () =>
    run(async () => {
      setSummary(null);
      setSummary(
        await generateSamples({
          backgroundsDir, objectsDir, outputDir, numSamples,
          // The UI shows percentages as 15; the backend wants fractions like 0.15.
          size: {
            mode: sizeMode,
            min: sizeUnit === '%' ? sizeMin / 100 : sizeMin,
            max: sizeUnit === '%' ? sizeMax / 100 : sizeMax,
          },
          classNames,
          augmentations: Object.fromEntries(Object.entries(enabled).filter(([, v]) => v)),
        }),
      );
    });

  const sizeUnit = SIZE_MODE_OPTIONS.find((o) => o.value === sizeMode)!.unit;
  const classNames = parseClassLines(classText);
  const canGenerate =
    !!scan && !!outputDir.trim() && numSamples >= 1 &&
    sizeMin > 0 && sizeMin <= sizeMax && !classListError(classNames) && !busy;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <PathField label="Backgrounds folder" value={backgroundsDir} onChange={setBackgroundsDir} />
        <PathField label="Objects folder (PNG)" value={objectsDir} onChange={setObjectsDir} />
        <PathField label="Output folder" value={outputDir} onChange={setOutputDir} />
      </section>
      <button onClick={onScan} disabled={busy || !backgroundsDir || !objectsDir} className="rounded border px-3 py-1">
        Scan folders
      </button>

      {scan && (
        <section className="grid gap-3 sm:grid-cols-2">
          <FolderInfo title="Backgrounds" folderName={scan.backgrounds.folderName} rows={[{ label: 'Images', value: scan.backgrounds.totalImages }]} />
          <FolderInfo
            title="Objects"
            folderName={scan.objects.folderName}
            rows={[
              { label: 'PNG objects', value: scan.objects.totalPngs },
              { label: 'Classes', value: scan.objects.classes.join(', ') || '—' },
            ]}
          />
        </section>
      )}

      <GenerationControls
        numSamples={numSamples} sizeMode={sizeMode} sizeMin={sizeMin} sizeMax={sizeMax}
        onChange={(v) => {
          if (v.numSamples !== undefined) setNumSamples(v.numSamples);
          if (v.sizeMode !== undefined) setSizeMode(v.sizeMode);
          if (v.sizeMin !== undefined) setSizeMin(v.sizeMin);
          if (v.sizeMax !== undefined) setSizeMax(v.sizeMax);
        }}
      />

      <ClassListInput value={classText} onChange={setClassText} detectedClasses={scan?.objects.classes ?? []} />

      <section>
        <h3 className="mb-2 font-semibold">Augmentations</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AUGMENTATION_OPTIONS.map((o) => (
            <AugmentationCard key={o.key} option={o} enabled={!!enabled[o.key]} onToggle={(k, v) => setEnabled((p) => ({ ...p, [k]: v }))} />
          ))}
        </div>
      </section>

      <button onClick={onGenerate} disabled={!canGenerate} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
        {busy ? 'Working…' : 'Generate samples'}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {summary && (
        <div className="rounded border p-3 text-sm">
          <div>Generated {summary.generated} of {summary.requested} (skipped {summary.skipped})</div>
          <div>Saved to: {summary.outputDir}</div>
          <div>Class IDs: {Object.entries(summary.classes).map(([n, id]) => `${id} = ${n}`).join(', ')}</div>
          {summary.errors.length > 0 && <div className="text-amber-700">{summary.errors.length} warning(s): {summary.errors[0]}</div>}
        </div>
      )}
    </div>
  );
}
