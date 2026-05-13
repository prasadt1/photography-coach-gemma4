/**
 * exifSanitizer.ts — strip sensitive EXIF metadata from image files.
 *
 * Photographers in journalism, NGO field work, or human-rights documentation
 * need to share images without leaking GPS coordinates, device serial numbers,
 * or timestamps that could de-anonymize sources or subjects.
 *
 * This is a CLIENT-SIDE strip — the original file is never modified; we return
 * a new Blob with the chosen fields removed.
 */

export interface SanitizationOptions {
  stripGPS?: boolean;        // default true — GPS coordinates
  stripDeviceInfo?: boolean; // default false — Make/Model/Serial
  stripTimestamps?: boolean; // default false — DateTime fields
  stripAuthorship?: boolean; // default false — Artist/Copyright
}

export interface SanitizationResult {
  blob: Blob;
  originalSize: number;
  newSize: number;
  fieldsStripped: string[];
}

/**
 * Strip selected EXIF fields from a JPEG file by parsing EXIF segments and
 * rewriting only the parts we want to keep. Falls back to "no-op" for non-JPEG.
 *
 * Implementation note: This uses a simple JPEG segment walker rather than a
 * full EXIF rewriter. We zero-out the entire APP1 (EXIF) segment when GPS strip
 * is requested with no other writes, then optionally re-emit a minimal APP1 with
 * only the fields the user wants to keep.
 *
 * For the hackathon scope, we strip the entire APP1 segment when stripGPS is
 * on (effectively removing all EXIF). This is a strong privacy guarantee at the
 * cost of also losing camera-settings metadata. A future version could surgically
 * remove only GPS tags.
 */
export async function sanitizeExif(
  file: File,
  options: SanitizationOptions = { stripGPS: true },
): Promise<SanitizationResult> {
  const opts: Required<SanitizationOptions> = {
    stripGPS: options.stripGPS ?? true,
    stripDeviceInfo: options.stripDeviceInfo ?? false,
    stripTimestamps: options.stripTimestamps ?? false,
    stripAuthorship: options.stripAuthorship ?? false,
  };

  const fieldsStripped: string[] = [];
  if (opts.stripGPS) fieldsStripped.push('GPS coordinates');
  if (opts.stripDeviceInfo) fieldsStripped.push('Camera make/model/serial');
  if (opts.stripTimestamps) fieldsStripped.push('Date/time stamps');
  if (opts.stripAuthorship) fieldsStripped.push('Artist/Copyright');

  // For non-JPEG, return the file as-is with a note
  if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
    return {
      blob: file,
      originalSize: file.size,
      newSize: file.size,
      fieldsStripped: [], // can't sanitize PNG/WebP via this method
    };
  }

  const buffer = await file.arrayBuffer();
  const view = new Uint8Array(buffer);
  const newView = stripJpegApp1(view); // strips entire EXIF segment

  const blob = new Blob([new Uint8Array(newView)], { type: file.type });
  return {
    blob,
    originalSize: file.size,
    newSize: blob.size,
    fieldsStripped,
  };
}

/**
 * Walk a JPEG byte stream and return a new Uint8Array with all APP1 (EXIF)
 * segments removed. JPEG structure: SOI (0xFFD8) → segments (each starting with 0xFF + marker
 * + 2-byte length) → SOS (0xFFDA) → image data → EOI (0xFFD9).
 *
 * APP1 marker = 0xFFE1. We skip these segments entirely.
 */
function stripJpegApp1(view: Uint8Array): Uint8Array {
  // Validate JPEG signature
  if (view.length < 2 || view[0] !== 0xFF || view[1] !== 0xD8) {
    return view; // not a JPEG, return as-is
  }

  const out: number[] = [0xFF, 0xD8]; // SOI
  let i = 2;

  while (i < view.length) {
    if (view[i] !== 0xFF) {
      // No more segments — copy rest as-is (image data + EOI)
      for (let j = i; j < view.length; j++) out.push(view[j]);
      break;
    }

    const marker = view[i + 1];

    // SOS marker (0xDA) — start of image data, no more EXIF segments past this
    if (marker === 0xDA) {
      for (let j = i; j < view.length; j++) out.push(view[j]);
      break;
    }

    // Standalone markers (no length): RST0-RST7 (0xD0-0xD7), 0x01
    if ((marker >= 0xD0 && marker <= 0xD7) || marker === 0x01) {
      out.push(0xFF, marker);
      i += 2;
      continue;
    }

    // Segments with length
    if (i + 3 >= view.length) break;
    const segLen = (view[i + 2] << 8) | view[i + 3];
    const segEnd = i + 2 + segLen;

    // APP1 (0xE1) is the EXIF segment — skip it
    if (marker === 0xE1) {
      i = segEnd;
      continue;
    }

    // Copy this segment as-is
    for (let j = i; j < segEnd && j < view.length; j++) out.push(view[j]);
    i = segEnd;
  }

  return new Uint8Array(out);
}

/**
 * Generate a download filename for a sanitized image.
 * "wedding-001.jpg" → "wedding-001-clean.jpg"
 */
export function sanitizedFilename(originalName: string): string {
  const dot = originalName.lastIndexOf('.');
  if (dot === -1) return originalName + '-clean';
  return originalName.slice(0, dot) + '-clean' + originalName.slice(dot);
}

/**
 * Trigger a browser download of the sanitized file.
 */
export function downloadSanitizedFile(file: File, blob: Blob, originalName?: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizedFilename(originalName ?? file.name);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
