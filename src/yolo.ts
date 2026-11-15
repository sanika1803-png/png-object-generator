import type { YoloBox } from './types.js';

export interface PixelBox {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

/** Clips a pixel box to the image and converts it to a normalized YOLO box. */
export function pixelBoxToYolo(
  box: PixelBox,
  imgW: number,
  imgH: number,
  classId: number,
): YoloBox | null {
  const x1 = Math.max(0, box.xMin);
  const y1 = Math.max(0, box.yMin);
  const x2 = Math.min(imgW, box.xMax);
  const y2 = Math.min(imgH, box.yMax);
  if (x2 <= x1 || y2 <= y1) return null;

  return {
    classId,
    centerX: (x1 + x2) / 2 / imgW,
    centerY: (y1 + y2) / 2 / imgH,
    width: (x2 - x1) / imgW,
    height: (y2 - y1) / imgH,
  };
}

/** Returns a list of problems; an empty list means the box is valid. */
export function validateYoloBox(box: YoloBox): string[] {
  const errors: string[] = [];
  const eps = 1e-6;
  if (!Number.isInteger(box.classId) || box.classId < 0) errors.push(`bad classId ${box.classId}`);
  for (const [name, v] of [
    ['centerX', box.centerX],
    ['centerY', box.centerY],
    ['width', box.width],
    ['height', box.height],
  ] as const) {
    if (!Number.isFinite(v)) errors.push(`${name} is not finite`);
  }
  if (errors.length) return errors;

  if (box.centerX < 0 || box.centerX > 1) errors.push('centerX outside 0..1');
  if (box.centerY < 0 || box.centerY > 1) errors.push('centerY outside 0..1');
  if (box.width <= 0 || box.width > 1) errors.push('width outside (0,1]');
  if (box.height <= 0 || box.height > 1) errors.push('height outside (0,1]');
  if (box.centerX - box.width / 2 < -eps || box.centerX + box.width / 2 > 1 + eps) {
    errors.push('box extends past left/right edge');
  }
  if (box.centerY - box.height / 2 < -eps || box.centerY + box.height / 2 > 1 + eps) {
    errors.push('box extends past top/bottom edge');
  }
  return errors;
}

export function formatYoloLine(box: YoloBox): string {
  const f = (n: number) => n.toFixed(6);
  return `${box.classId} ${f(box.centerX)} ${f(box.centerY)} ${f(box.width)} ${f(box.height)}`;
}

export function formatYoloFile(boxes: YoloBox[]): string {
  return boxes.map(formatYoloLine).join('\n') + '\n';
}
