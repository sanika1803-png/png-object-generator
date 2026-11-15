import { PngObjectBackgroundPanel } from './components/PngObjectBackgroundPanel';

/** Page stays thin on purpose: no logic and no API calls here. */
export default function PngObjectBackgroundPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">PNG Object + Background Generation</h1>
      <PngObjectBackgroundPanel />
    </main>
  );
}
