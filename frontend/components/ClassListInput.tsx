interface Props {
  value: string;
  onChange: (text: string) => void;
  /** Class names detected from the object file names (after Scan). */
  detectedClasses: string[];
}

/** Turns the textarea text into a clean list: one class per line, blanks removed. */
export function parseClassLines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

/** Returns the problem with a class list, or null if it is fine. */
export function classListError(names: string[]): string | null {
  const seen = new Set<string>();
  for (const n of names) {
    const k = n.toLowerCase();
    if (seen.has(k)) return `"${n}" appears twice`;
    seen.add(k);
  }
  return null;
}

/**
 * Manual class list: line order = class id (first line is 0). Leave empty to auto-assign.
 * Reusable by other tasks that need a fixed class-id mapping.
 */
export function ClassListInput({ value, onChange, detectedClasses }: Props) {
  const names = parseClassLines(value);
  const error = classListError(names);
  const listed = new Set(names.map((n) => n.toLowerCase()));
  const unmatched = detectedClasses.filter((c) => !listed.has(c.toLowerCase()));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="class-list" className="text-sm font-semibold">
          Class list (optional)
        </label>
        {detectedClasses.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(detectedClasses.join('\n'))}
            className="rounded border px-2 py-0.5 text-xs"
          >
            Fill from detected objects
          </button>
        )}
      </div>
      <textarea
        id="class-list"
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={'One class per line, in order.\nExample:\ncar\nperson\nbicycle'}
        className="w-full rounded border px-2 py-1 font-mono text-sm"
      />
      <p className="text-xs text-gray-500">
        Line order sets the class ID (first line = 0). A PNG named <code>car_1.png</code> belongs to class
        <code> car</code>. Leave empty to assign IDs automatically.
      </p>

      {names.length > 0 && !error && (
        <div className="text-xs text-gray-700">
          IDs: {names.map((n, i) => `${i} = ${n}`).join(', ')}
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}. Each class can only be listed once.</p>}
      {names.length > 0 && unmatched.length > 0 && (
        <p className="text-xs text-amber-700">
          Objects for these classes are not in your list and will be skipped: {unmatched.join(', ')}
        </p>
      )}
    </div>
  );
}
