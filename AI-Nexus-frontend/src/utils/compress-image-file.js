import { getProxySafeMaxBytes } from './upload-proxy-limits';

/**
 * Resize/compress raster images before admin upload (keeps payloads under common 1MB proxy limits).
 * SVG files are returned unchanged.
 */
export async function compressImageFileForUpload(
  file,
  { maxWidth = 1920, maxHeight = 1920, maxBytes = getProxySafeMaxBytes(), quality = 0.82 } = {}
) {
  if (!file || typeof File === 'undefined') return file;
  const type = String(file.type || '').toLowerCase();
  if (!type.startsWith('image/') || type === 'image/svg+xml' || type === 'image/gif') {
    return file;
  }
  if (file.size <= maxBytes) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const { width, height } = fitDimensions(image.width, image.height, maxWidth, maxHeight);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(image, 0, 0, width, height);

    const outputType = type === 'image/png' ? 'image/jpeg' : type;
    let currentQuality = quality;
    let blob = await canvasToBlob(canvas, outputType, currentQuality);

    while (blob.size > maxBytes && currentQuality > 0.45) {
      currentQuality -= 0.08;
      blob = await canvasToBlob(canvas, outputType, currentQuality);
    }

    if (!blob || blob.size >= file.size) return file;

    const ext = outputType === 'image/jpeg' ? '.jpg' : outputType === 'image/webp' ? '.webp' : '.png';
    const baseName = String(file.name || 'image').replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${baseName}${ext}`, { type: outputType, lastModified: Date.now() });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function fitDimensions(width, height, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}
