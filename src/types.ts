/** Shared types for the Task 4 (PNG object + background) generator. */

/** One YOLO box, normalized to 0..1 relative to the final image. */
export interface YoloBox {
  classId: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

/** Whatever the user toggled in the Roboflow-style cards (shape defined by Tasks 1/2). */
export type AugmentationConfig = Record<string, unknown>;

export interface AugmentationResult {
  image: Buffer;
  annotations: YoloBox[];
  /** Short tag(s) identifying what was applied, used in the output filename, e.g. "hflip-rot90". */
  suffix?: string;
}

/**
 * The seam to the common augmentation engine built in Tasks 1/2.
 * Task 4 NEVER implements augmentations itself: it only calls this.
 * When the shared engine exists, write a thin adapter that implements this interface.
 */
export interface AugmentationEngine {
  apply(
    image: Buffer,
    annotations: YoloBox[],
    config: AugmentationConfig,
  ): Promise<AugmentationResult>;
}

/**
 * percentWidth/percentHeight: min/max are fractions (0.2 = 20%) of the background width/height.
 * pixelWidth/pixelHeight: min/max are exact pixel sizes of the object's width/height.
 * The other side always follows the object's own aspect ratio, and the object is shrunk if it would not fit.
 */
export type SizeMode = 'percentWidth' | 'percentHeight' | 'pixelWidth' | 'pixelHeight';
export interface SizeSpec {
  mode: SizeMode;
  min: number;
  max: number;
}

export interface GenerateOptions {
  backgroundsDir: string;
  objectsDir: string;
  outputDir: string;
  numSamples: number;
  /** How big the pasted object is. A value is picked uniformly in [min, max] for every sample. */
  size?: SizeSpec;
  /**
   * Manual class list: index in this array IS the class id (["car","person"] -> car=0, person=1).
   * Objects whose class is not in the list are skipped and reported. Matching ignores case.
   */
  classNames?: string[];
  /** Advanced: explicit class name -> id map. Ignored when classNames is given. */
  classMap?: Record<string, number>;
  /** Alpha value above which a pixel counts as part of the object (0-255). */
  alphaThreshold?: number;
  augmentations?: AugmentationConfig;
  augmentationEngine?: AugmentationEngine;
  /** Set for reproducible output. */
  seed?: number;
  jpegQuality?: number;
}

export interface GenerateSummary {
  requested: number;
  generated: number;
  skipped: number;
  outputDir: string;
  classes: Record<string, number>;
  files: string[];
  errors: string[];
}
