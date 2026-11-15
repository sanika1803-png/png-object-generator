import type { AugmentationEngine } from './types.js';

/**
 * Default engine used until the shared Task 1/2 engine is available: it changes nothing.
 *
 * TO CONNECT THE REAL ENGINE: implement `AugmentationEngine` in one small adapter that
 * calls the Task 1/2 function (image + YOLO annotations + config in, image + annotations out),
 * then pass it as `augmentationEngine` in GenerateOptions. No other Task 4 code changes.
 * Do NOT add brightness/flip/rotate code here.
 */
export const passthroughEngine: AugmentationEngine = {
  async apply(image, annotations) {
    return { image, annotations };
  },
};
