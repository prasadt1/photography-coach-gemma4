/**
 * Save the winning product photo — Share sheet on iOS (Save Image), download fallback elsewhere.
 */

export type SaveProductPhotoResult = 'shared' | 'downloaded' | 'failed';

function dataUrlToFile(dataUrl: string, filename: string): File | null {
  try {
    const [header, base64] = dataUrl.split(',');
    if (!base64) return null;
    const mime = header.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  } catch {
    return null;
  }
}

export async function saveProductPhoto(dataUrl: string): Promise<SaveProductPhotoResult> {
  const filename = `lens-product-${Date.now()}.jpg`;
  const file = dataUrlToFile(dataUrl, filename);
  if (!file) return 'failed';

  try {
    if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Product photo for your shop',
      });
      return 'shared';
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return 'failed';
    console.warn('[saveProductPhoto] share failed:', err);
  }

  try {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return 'downloaded';
  } catch (err) {
    console.warn('[saveProductPhoto] download failed:', err);
    return 'failed';
  }
}
