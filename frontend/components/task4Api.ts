import type { SizeMode, Task4FolderScan, Task4Summary } from './task4Types';

/** All network calls for Task 4 live here, not in components or page.tsx. */
// TODO(integration): use the project's existing API client / base URL if there is one.
const BASE = '/api/task4';

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json as T;
}

export const scanFolders = (backgroundsDir: string, objectsDir: string) =>
  post<Task4FolderScan>('/scan', { backgroundsDir, objectsDir });

export const generateSamples = (body: {
  backgroundsDir: string;
  objectsDir: string;
  outputDir: string;
  numSamples: number;
  size: { mode: SizeMode; min: number; max: number };
  /** Manual class list; index = class id. Leave empty to auto-assign. */
  classNames: string[];
  augmentations: Record<string, boolean>;
}) => post<Task4Summary>('/generate', body);
