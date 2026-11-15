import type { AugmentationOption } from './task4Types';

interface Props {
  option: AugmentationOption;
  enabled: boolean;
  onToggle: (key: string, enabled: boolean) => void;
}

/**
 * Roboflow-style card: image, name, description, toggle.
 * TODO(integration): if Tasks 1/2 already ship a shared augmentation card, delete this
 * file and use that one with the same props.
 */
export function AugmentationCard({ option, enabled, onToggle }: Props) {
  return (
    <div className={`rounded-lg border p-3 ${enabled ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
      <div className="flex h-20 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">
        {option.imageSrc ? <img src={option.imageSrc} alt={option.name} className="h-full" /> : 'preview'}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-medium">{option.name}</span>
        <label className="inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            role="switch"
            aria-label={`Toggle ${option.name}`}
            checked={enabled}
            onChange={(e) => onToggle(option.key, e.target.checked)}
          />
        </label>
      </div>
      <p className="mt-1 text-xs text-gray-600">{option.description}</p>
    </div>
  );
}
