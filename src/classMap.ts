import path from 'node:path';

/** "car_01.png" / "car-2.png" / "car.png" -> "car" so variants share one class. */
export function classNameFromFile(fileName: string): string {
  const stem = path.parse(fileName).name;
  return stem.replace(/[_\-\s]?\d+$/, '') || stem;
}

/**
 * Builds the class name -> id map. Explicit entries win; anything else is assigned
 * the next free id in alphabetical order so results are stable between runs.
 * TODO: swap for the project's own class config if Tasks 1-3 define one.
 */
export function buildClassMap(
  objectFiles: string[],
  explicit: Record<string, number> = {},
): Record<string, number> {
  const map: Record<string, number> = { ...explicit };
  const used = new Set(Object.values(map));
  let next = 0;
  const names = [...new Set(objectFiles.map(classNameFromFile))].sort();
  for (const name of names) {
    if (name in map) continue;
    while (used.has(next)) next++;
    map[name] = next;
    used.add(next);
  }
  return map;
}

export interface ManualClassList {
  /** Cleaned names in id order (index = class id). */
  names: string[];
  /** lowercase name -> id, used to look up an object's class. */
  lookup: Map<string, number>;
}

/** Cleans a user-typed class list. Throws a readable error on empty or duplicate names. */
export function parseManualClassList(raw: string[]): ManualClassList {
  const names = raw.map((n) => String(n).trim()).filter((n) => n.length > 0);
  if (!names.length) throw new Error('Class list is empty');
  const lookup = new Map<string, number>();
  names.forEach((name, id) => {
    const key = name.toLowerCase();
    if (lookup.has(key)) throw new Error(`Class "${name}" appears twice in the class list`);
    lookup.set(key, id);
  });
  return { names, lookup };
}
