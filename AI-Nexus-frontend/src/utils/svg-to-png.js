/**
 * Convert an SVG URL to a PNG data URL so it can be embedded in PDFs.
 * @react-pdf/renderer does not support SVG; this allows the SVG logo to appear in the certificate.
 * @param {string} svgUrl - Path or URL to the SVG (e.g. /logo/logo-full.svg)
 * @param {number} [width=280] - Output width in pixels (2x for sharpness)
 * @param {number} [height=96] - Output height in pixels
 * @returns {Promise<string|null>} PNG data URL or null on failure
 */
export function svgToPngDataUrl(svgUrl, width = 280, height = 96) {
  return fetch(svgUrl)
    .then((res) => res.text())
    .then((svgText) => {
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(null);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png'));
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.src = url;
      });
    })
    .catch(() => null);
}
