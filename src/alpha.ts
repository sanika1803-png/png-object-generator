import sharp from 'sharp';

export interface TrimmedObject {
  /** PNG buffer (RGBA) cropped tightly to the visible pixels. */
  buffer: Buffer;
  width: number;
  height: number;
}

/**
 * Reads the PNG alpha channel, finds the tight bounding box of visible pixels
 * (alpha > threshold) and returns the object cropped to it.
 */
export async function trimTransparentPadding(
  pngPath: string,
  alphaThreshold = 10,
): Promise<TrimmedObject> {
  const { data, info } = await sharp(pngPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info; // channels === 4 after ensureAlpha
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const rowStart = y * width * channels;
    for (let x = 0; x < width; x++) {
      if (data[rowStart + x * channels + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) {
    throw new Error(`PNG is fully transparent (no pixel above alpha ${alphaThreshold}): ${pngPath}`);
  }

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  const buffer = await sharp(pngPath)
    .ensureAlpha()
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .png()
    .toBuffer();

  return { buffer, width: cropW, height: cropH };
}
