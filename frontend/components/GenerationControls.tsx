import { SIZE_MODE_OPTIONS, type SizeMode } from './task4Types';

interface Props {
  numSamples: number;
  sizeMode: SizeMode;
  /** Shown in the mode's own unit (percent number like 15, or pixels like 100). */
  sizeMin: number;
  sizeMax: number;
  onChange: (v: { numSamples?: number; sizeMode?: SizeMode; sizeMin?: number; sizeMax?: number }) => void;
}

export function GenerationControls({ numSamples, sizeMode, sizeMin, sizeMax, onChange }: Props) {
  const mode = SIZE_MODE_OPTIONS.find((o) => o.value === sizeMode)!;
  const max = mode.unit === '%' ? 100 : 20000;

  const changeMode = (value: SizeMode) => {
    const next = SIZE_MODE_OPTIONS.find((o) => o.value === value)!;
    // Switching between % and px would make the old numbers meaningless, so reset to defaults.
    onChange(
      next.unit === mode.unit
        ? { sizeMode: value }
        : { sizeMode: value, sizeMin: next.defaultMin, sizeMax: next.defaultMax },
    );
  };

  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <label className="text-sm">
        Number of samples
        <input
          type="number" min={1} max={10000} value={numSamples}
          onChange={(e) => onChange({ numSamples: Number(e.target.value) })}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <label className="text-sm">
        Object size based on
        <select
          value={sizeMode}
          onChange={(e) => changeMode(e.target.value as SizeMode)}
          className="mt-1 w-full rounded border px-2 py-1"
        >
          {SIZE_MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Min size ({mode.unit})
        <input
          type="number" min={1} max={max} value={sizeMin}
          onChange={(e) => onChange({ sizeMin: Number(e.target.value) })}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <label className="text-sm">
        Max size ({mode.unit})
        <input
          type="number" min={1} max={max} value={sizeMax}
          onChange={(e) => onChange({ sizeMax: Number(e.target.value) })}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </label>
      <p className="text-xs text-gray-500 sm:col-span-4">
        Set min = max for one fixed size. The other side follows the object's shape, and the object shrinks if it would not fit.
      </p>
    </div>
  );
}
