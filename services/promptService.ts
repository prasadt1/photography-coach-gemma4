/**
 * promptService.ts — Prompt templates for Gemma 4 E4B
 * Centralises all system prompts, user templates, and tone calibration.
 *
 * Sources: docs/specs/04-prompt-and-rationale-spec.md
 */

import { PhotoAnalysisV2, CVData } from '../types.v2';

// ─── System prompt ─────────────────────────────────────────────────────────────

/**
 * Spike 1 tuned: explicit per-field length caps reduce output from ~1100 to ~380 tokens.
 * This brings warm latency from ~78s to ~22s (target: <25s P95 on 16GB, <15s on 32GB+).
 */
export const PHOTOGRAPHY_PRINCIPLES = `You are an expert photography coach. Analyze photos concisely and accurately.

PHOTOGRAPHY KNOWLEDGE:
- Composition: rule of thirds, leading lines, framing, negative space, golden ratio
- Lighting: exposure, shadows, highlights, color temperature, hard vs soft light
- Technique: focus/sharpness, aperture/shutter/ISO, white balance, noise
- Creativity: storytelling, subject impact, color harmony, originality

SCORING (0.0-10.0, one decimal): 9-10=gallery | 7-8=strong amateur | 5-6=competent | 3-4=issues | 1-2=major problems

STRICT OUTPUT RULES (keep response compact):
1. schema_version: "2.0" | model_id: "gemma-4-e4b"
2. critique fields: 1-2 sentences each, specific and direct
3. strengths: exactly 3 items, max 15 words each
4. improvements: exactly 3 items, max 15 words each
5. learningPath: exactly 3 items, max 10 words each
6. rationale.observations: exactly 3 items, max 15 words each
7. rationale.reasoningSteps: exactly 3 items, max 15 words each
8. rationale.priorityFixes: exactly 3 items, max 12 words each
9. boundingBoxes: ALWAYS output EXACTLY 2 boxes. No more, no less. NEVER output [].
   Each box highlights a SPECIFIC REGION of the image — not the whole frame.
   BOX SIZES: width 25-60, height 20-55. NEVER width>65 or height>60.
   BOX 1 — the single WORST composition/subject flaw: draw around the specific area (e.g. dead-centre subject, cut-off element, distracting corner object).
   BOX 2 — the single WORST lighting/exposure flaw: draw around the specific zone (e.g. blown-out sky patch, deep shadow clump, harsh highlight on face).
   Boxes must cover DIFFERENT regions. No full-image boxes.
   x, y, width, height: INTEGERS 0-100. description ≤8 words. suggestion ≤8 words.
   Landscape example box 1: {"type":"composition","severity":"moderate","x":15,"y":30,"width":55,"height":45,"description":"Horizon bisects frame dead centre","suggestion":"Reframe to upper or lower third"}
   Landscape example box 2: {"type":"exposure","severity":"moderate","x":5,"y":2,"width":55,"height":30,"description":"Sky highlights blown, detail lost","suggestion":"Expose sky, lift shadows in edit"}
10. is_refusal: true ONLY for medical/ID/inappropriate content (not for stylistic or quality issues)`;

// ─── Critique prompt builder ───────────────────────────────────────────────────

export function buildCritiquePrompt(cvData?: CVData): string {
  let contextSection = '';

  if (cvData) {
    const lines: string[] = [];

    // EXIF grounding
    if (cvData.exif && Object.keys(cvData.exif).length > 0) {
      const relevant = ['Make', 'Model', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO', 'Flash', 'WhiteBalance', 'ExposureMode'];
      const exifLines = relevant
        .filter(k => cvData.exif[k] != null && cvData.exif[k] !== '')
        .map(k => `  ${k}: ${cvData.exif[k]}`);
      if (exifLines.length > 0) {
        lines.push('EXIF METADATA (use for camera settings estimate):');
        lines.push(...exifLines);
      }
    }

    // CV grounding
    if (cvData.highlightClipping != null) {
      lines.push(`HIGHLIGHT CLIPPING: ${cvData.highlightClipping.toFixed(1)}%`);
    }
    if (cvData.shadowClipping != null) {
      lines.push(`SHADOW CLIPPING: ${cvData.shadowClipping.toFixed(1)}%`);
    }
    if (cvData.focusMap?.sharpnessScore != null) {
      lines.push(`SHARPNESS SCORE (Laplacian): ${cvData.focusMap.sharpnessScore.toFixed(2)} (0=blurry, 1=sharp)`);
    }
    if (cvData.colorStats) {
      lines.push(`COLOR TEMPERATURE: ${cvData.colorStats.temperature}`);
      lines.push(`AVERAGE SATURATION: ${(cvData.colorStats.saturation * 100).toFixed(0)}%`);
    }
    if (cvData.faceCount != null) {
      lines.push(`DETECTED FACES: ${cvData.faceCount}`);
    }

    if (lines.length > 0) {
      contextSection = `\n\nDETERMINISTIC ANALYSIS (verified measurements — use as evidence for your critique):\n${lines.join('\n')}\n`;
    }
  }

  return `Analyze this photograph and provide a complete photography critique.${contextSection}

Return a JSON object with ALL required fields for schema_version 2.0. Be specific, constructive, and educational.`;
}

// ─── Mentor chat prompt builder ────────────────────────────────────────────────

export function buildMentorPrompt(analysis: PhotoAnalysisV2): string {
  const scoresSummary = Object.entries(analysis.scores)
    .map(([k, v]) => `${k}: ${v}/10`)
    .join(', ');

  return `You are a photography mentor continuing a coaching session. The photographer just received this critique:

SCORES: ${scoresSummary}
OVERALL: ${analysis.critique.overall}
TOP IMPROVEMENTS: ${analysis.improvements.slice(0, 3).join(' | ')}
LEARNING PATH: ${analysis.learningPath.join(', ')}

Answer the photographer's follow-up questions. Be encouraging but honest. 
Keep responses concise (2-4 sentences). Reference specific aspects of their photo when relevant.
Do NOT repeat the full critique — focus on what they're asking.`;
}
