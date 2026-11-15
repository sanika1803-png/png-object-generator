export interface Task4FolderScan {
  backgrounds: { folderName: string; totalImages: number };
  objects: { folderName: string; totalPngs: number; classes: string[] };
}

export interface Task4Summary {
  requested: number;
  generated: number;
  skipped: number;
  outputDir: string;
  classes: Record<string, number>;
  errors: string[];
}

export type SizeMode = 'percentWidth' | 'percentHeight' | 'pixelWidth' | 'pixelHeight';

export interface SizeModeOption {
  value: SizeMode;
  label: string;
  unit: '%' | 'px';
  /** Sensible starting min/max (in the unit shown to the user). */
  defaultMin: number;
  defaultMax: number;
}

export const SIZE_MODE_OPTIONS: SizeModeOption[] = [
  { value: 'percentWidth', label: '% of background width', unit: '%', defaultMin: 15, defaultMax: 40 },
  { value: 'percentHeight', label: '% of background height', unit: '%', defaultMin: 15, defaultMax: 40 },
  { value: 'pixelWidth', label: 'Exact width in pixels', unit: 'px', defaultMin: 100, defaultMax: 300 },
  { value: 'pixelHeight', label: 'Exact height in pixels', unit: 'px', defaultMin: 100, defaultMax: 300 },
];

export interface AugmentationOption {
  key: string;
  name: string;
  description: string;
  imageSrc?: string;
}

/** Keys are what gets sent to the backend; the shared engine decides how to read them. */
export const AUGMENTATION_OPTIONS: AugmentationOption[] = [
  { key: 'brightness', name: 'Brightness', description: 'Make the image lighter or darker.' },
  { key: 'exposure', name: 'Exposure', description: 'Simulate over/under exposed shots.' },
  { key: 'blur', name: 'Blur', description: 'Soften the image.' },
  { key: 'noise', name: 'Noise', description: 'Add random grain.' },
  { key: 'saturation', name: 'Saturation', description: 'Change color intensity.' },
  { key: 'hue', name: 'Hue', description: 'Shift the colors.' },
  { key: 'grayscale', name: 'Grayscale', description: 'Convert to black and white.' },
  { key: 'motionBlur', name: 'Motion Blur', description: 'Simulate camera or object movement.' },
  { key: 'cameraGain', name: 'Camera Gain', description: 'Simulate sensor gain/ISO.' },
  { key: 'horizontalFlip', name: 'Horizontal Flip', description: 'Mirror left to right.' },
  { key: 'verticalFlip', name: 'Vertical Flip', description: 'Mirror top to bottom.' },
  { key: 'rotation', name: 'Rotation', description: 'Rotate by a random angle.' },
  { key: 'rotation360', name: '360° Rotation', description: 'Rotate in equal steps (360 / X).' },
  { key: 'shear', name: 'Shear', description: 'Slant the image.' },
  { key: 'crop', name: 'Crop', description: 'Crop a random region.' },
  { key: 'zoom', name: 'Zoom', description: 'Zoom in on the scene.' },
  { key: 'cutout', name: 'Cutout', description: 'Blank out random patches.' },
  { key: 'mosaic', name: 'Mosaic', description: 'Combine several images into one.' },
];
