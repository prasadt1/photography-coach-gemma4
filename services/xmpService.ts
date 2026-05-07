/**
 * xmpService.ts — Adobe XMP sidecar generation for Lightroom integration
 *
 * Exports Photography Coach critique data as .xmp files that Lightroom Classic
 * can read to populate star ratings, color labels, and IPTC keywords.
 */

import { PhotoAnalysisV2 } from '../types.v2';

// ─── XMP Mapping Rules ────────────────────────────────────────────────────────

/**
 * Map overall score (average of 5 axes) to Lightroom star rating (1-5)
 */
export function scoreToStarRating(scores: PhotoAnalysisV2['scores']): number {
  const avg = (
    scores.composition +
    scores.lighting +
    scores.technique +
    scores.creativity +
    scores.subjectImpact
  ) / 5;

  // Mapping: 8-10 → 5★, 6-7 → 4★, 4-5 → 3★, 2-3 → 2★, 0-1 → 1★
  if (avg >= 8) return 5;
  if (avg >= 6) return 4;
  if (avg >= 4) return 3;
  if (avg >= 2) return 2;
  return 1;
}

/**
 * Map highest severity from bounding boxes to Lightroom color label
 */
export function severityToColorLabel(analysis: PhotoAnalysisV2): string {
  if (!analysis.boundingBoxes || analysis.boundingBoxes.length === 0) {
    return 'Green'; // No issues = minor/green
  }

  const hasCritical = analysis.boundingBoxes.some(box => box.severity === 'critical');
  const hasModerate = analysis.boundingBoxes.some(box => box.severity === 'moderate');

  if (hasCritical) return 'Red';
  if (hasModerate) return 'Yellow';
  return 'Green';
}

/**
 * Extract top 5 observations as IPTC keywords
 */
export function extractKeywords(analysis: PhotoAnalysisV2): string[] {
  const observations = analysis.rationale?.observations ?? [];

  // Take first 5 observations, clean them up for keyword format
  return observations
    .slice(0, 5)
    .map(obs => {
      // Extract key phrases (remove "I observe...", "There is...", etc.)
      let cleaned = obs
        .replace(/^(I observe|I notice|There is|The photo has|This image shows)/i, '')
        .trim();

      // Truncate to first sentence if too long
      const firstSentence = cleaned.split(/[.!?]/)[0];
      if (firstSentence && firstSentence.length < 100) {
        cleaned = firstSentence;
      }

      // Capitalize first letter
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    })
    .filter(kw => kw.length > 0);
}

/**
 * Generate overall critique summary for dc:description
 */
export function generateDescription(analysis: PhotoAnalysisV2): string {
  const rating = scoreToStarRating(analysis.scores);
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

  const critique = analysis.critique?.overall ?? 'No overall critique available.';

  return `${stars} Photography Coach Critique (Gemma 4)\n\n${critique}\n\nScores: Composition ${analysis.scores.composition}/10, Lighting ${analysis.scores.lighting}/10, Technique ${analysis.scores.technique}/10`;
}

// ─── XMP Template Generation ──────────────────────────────────────────────────

/**
 * Generate XMP sidecar XML content for a given analysis
 */
export function generateXMP(analysis: PhotoAnalysisV2, originalFilename: string): string {
  const rating = scoreToStarRating(analysis.scores);
  const colorLabel = severityToColorLabel(analysis);
  const keywords = extractKeywords(analysis);
  const description = generateDescription(analysis);

  // Escape XML special characters
  const escapeXML = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const timestamp = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Photography Coach v2">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:xmp="http://ns.adobe.com/xap/1.0/"
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
      xmlns:Iptc4xmpCore="http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/">

      <!-- Star Rating (1-5) -->
      <xmp:Rating>${rating}</xmp:Rating>

      <!-- Color Label (Red/Yellow/Green) -->
      <xmp:Label>${colorLabel}</xmp:Label>

      <!-- Modification Date -->
      <xmp:ModifyDate>${timestamp}</xmp:ModifyDate>
      <xmp:MetadataDate>${timestamp}</xmp:MetadataDate>

      <!-- Creator Tool -->
      <xmp:CreatorTool>Photography Coach v2 (Gemma 4 E4B)</xmp:CreatorTool>

      <!-- Description (Overall Critique) -->
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${escapeXML(description)}</rdf:li>
        </rdf:Alt>
      </dc:description>

      <!-- IPTC Keywords (Top 5 Observations) -->
      <dc:subject>
        <rdf:Bag>
${keywords.map(kw => `          <rdf:li>${escapeXML(kw)}</rdf:li>`).join('\n')}
        </rdf:Bag>
      </dc:subject>

      <!-- Title (Original Filename) -->
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">${escapeXML(originalFilename)}</rdf:li>
        </rdf:Alt>
      </dc:title>

      <!-- Photoshop-specific metadata -->
      <photoshop:Headline>${escapeXML(analysis.critique?.overall?.split('.')[0] ?? 'AI Critique')}</photoshop:Headline>

      <!-- Custom metadata: Photography Coach scores -->
      <Iptc4xmpCore:Location>Photography Coach Analysis</Iptc4xmpCore:Location>

    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>`;
}

/**
 * Generate XMP filename from original photo filename
 *
 * Examples:
 *   IMG_1234.JPG → IMG_1234.xmp
 *   photo.jpeg → photo.xmp
 *   DSC_5678.NEF → DSC_5678.xmp
 */
export function getXMPFilename(photoFilename: string): string {
  const lastDot = photoFilename.lastIndexOf('.');
  if (lastDot === -1) {
    return photoFilename + '.xmp';
  }
  return photoFilename.substring(0, lastDot) + '.xmp';
}

// ─── Export Function ──────────────────────────────────────────────────────────

/**
 * Export XMP sidecar for a given analysis
 *
 * @param analysis - The PhotoAnalysisV2 result
 * @param originalFilename - Original photo filename (e.g., "IMG_1234.JPG")
 * @returns XMP file content as string
 */
export function exportXMPSidecar(
  analysis: PhotoAnalysisV2,
  originalFilename: string,
): { filename: string; content: string } {
  const xmpContent = generateXMP(analysis, originalFilename);
  const xmpFilename = getXMPFilename(originalFilename);

  return {
    filename: xmpFilename,
    content: xmpContent,
  };
}

// ─── Batch Export Helper ──────────────────────────────────────────────────────

/**
 * Export multiple XMP sidecars for a batch of analyses
 */
export function exportBatchXMP(
  analyses: Array<{ analysis: PhotoAnalysisV2; filename: string }>,
): Array<{ filename: string; content: string }> {
  return analyses.map(({ analysis, filename }) =>
    exportXMPSidecar(analysis, filename)
  );
}
