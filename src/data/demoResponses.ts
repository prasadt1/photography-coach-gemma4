/**
 * demoResponses.ts — Pre-recorded Gemma 4 E4B responses for Demo Mode
 *
 * These are REAL responses from Gemma 4 E4B recorded locally.
 * Demo Mode plays these back when Ollama isn't running, so judges
 * can experience the full product flow on the live URL.
 *
 * STRUCTURE:
 * - 3 sample product photos in public/demo-samples/
 * - Each has a pre-recorded JSON response from Gemma 4 E4B
 * - Samples 1 & 2 form a comparison pair for the Compare feature
 *
 * v3 SCHEMA (narrative-driven):
 * - subject: what's in frame, how many items
 * - critique.framing: primary framing/clutter issue
 * - critique.lighting: primary lighting/color issue
 * - critique.primary_fix: one actionable physical correction
 * - confidence_note: what couldn't be judged (or empty)
 * - alt_text: 15-25 word description
 * - listing_copy: 2-3 sentence marketplace description
 * - ready_to_list: boolean
 */

// Cache-busting version - increment when images change
const IMG_VERSION = 'v2';

export interface DemoResponseV3 {
  subject: string;
  critique: {
    framing: string;
    lighting: string;
    primary_fix: string;
  };
  confidence_note: string;
  alt_text: string;
  listing_copy: string;
  ready_to_list: boolean;
}

export interface DemoResponse {
  /** Unique identifier for this sample */
  id: string;

  /** Display label (e.g., "Hand-Knit Scarf") */
  label: string;

  /** Path to image in public/demo-samples/ */
  imagePath: string;

  /** Category for display */
  category: string;

  /** The v3 Gemma 4 E4B response (grounded, JSON format) */
  response: DemoResponseV3;

  /** Is this part of the comparison pair? */
  isComparisonSample?: boolean;

  /** For comparison: which sample to compare against */
  comparePairId?: string;
}

/**
 * The 3 demo samples.
 * USER TO POPULATE: Replace placeholder responses with real Gemma 4 E4B output.
 *
 * Samples 1 & 2 are a comparison pair (same product, different angles/lighting).
 * Sample 3 is standalone.
 *
 * v3 schema: grounded, factual, no flattery. JSON output.
 */
export const DEMO_RESPONSES: DemoResponse[] = [
  {
    id: 'sample-1',
    label: 'Hand-Knit Scarf (Photo A)',
    imagePath: `/demo-samples/sample-1.jpg?${IMG_VERSION}`,
    category: 'Textiles',
    isComparisonSample: true,
    comparePairId: 'sample-2',
    response: {
      subject: 'I see one hand-knit scarf in brown and cream tones, laid flat on a light wooden surface. Cable knit pattern visible.',
      critique: {
        framing: 'Both ends of the scarf are cut off by the image border. Buyers cannot see the full length.',
        lighting: 'Even, natural light from the left. Colors are reading accurately — the brown is close to cinnamon.',
        primary_fix: 'Move your phone back 8 inches so both ends of the scarf are fully visible in frame.',
      },
      confidence_note: '',
      alt_text: 'Hand-knit chunky cable scarf in warm brown and cream tones, laid flat on light wood surface',
      listing_copy: 'Cozy hand-knit cable scarf in warm earth tones. Chunky cable pattern throughout. Perfect for chilly days.',
      ready_to_list: false,
    },
  },
  {
    id: 'sample-2',
    label: 'Hand-Knit Scarf (Photo B)',
    imagePath: `/demo-samples/sample-2.jpg?${IMG_VERSION}`,
    category: 'Textiles',
    isComparisonSample: true,
    comparePairId: 'sample-1',
    response: {
      subject: 'I see one hand-knit scarf photographed from above. Full length is visible including both fringed ends. Cable pattern runs the full length.',
      critique: {
        framing: 'Full scarf visible with even margins on all sides. No clutter in frame.',
        lighting: 'Soft, even lighting. No harsh shadows. Colors are consistent — browns and creams reading true.',
        primary_fix: 'No fix needed. This photo meets marketplace standards.',
      },
      confidence_note: '',
      alt_text: 'Full-length hand-knit cable scarf in brown and cream, showing complete pattern and fringed ends on wood surface',
      listing_copy: 'Handcrafted cable-knit scarf with soft fringe detail. Warm earth tones complement any winter outfit. Made with care.',
      ready_to_list: true,
    },
  },
  {
    id: 'sample-3',
    label: 'Ceramic Bowl',
    imagePath: `/demo-samples/sample-3.jpg?${IMG_VERSION}`,
    category: 'Ceramics',
    isComparisonSample: false,
    response: {
      subject: 'I see one handmade ceramic bowl with speckled blue-gray glaze. Three-quarter angle shows both interior and exterior profile.',
      critique: {
        framing: 'Bowl is centered and fills the frame well. Background fabric texture is visible and slightly distracting.',
        lighting: 'Soft lighting from the left. The blue-gray glaze is rendering accurately — similar to weathered denim.',
        primary_fix: 'Replace the textured fabric with a solid white or cream backdrop to maximize product focus.',
      },
      confidence_note: '',
      alt_text: 'Handmade ceramic bowl with speckled blue-gray glaze, three-quarter angle showing interior and rim',
      listing_copy: 'Hand-thrown ceramic bowl with unique speckled glaze. Each piece one of a kind. Food-safe stoneware.',
      ready_to_list: false,
    },
  },
];

/**
 * Get demo sample by ID
 */
export function getDemoSample(id: string): DemoResponse | undefined {
  return DEMO_RESPONSES.find((s) => s.id === id);
}

/**
 * Get the comparison pair for a sample
 */
export function getComparisonPair(id: string): [DemoResponse, DemoResponse] | null {
  const sample = getDemoSample(id);
  if (!sample?.isComparisonSample || !sample.comparePairId) return null;

  const pair = getDemoSample(sample.comparePairId);
  if (!pair) return null;

  return [sample, pair];
}

/**
 * Get all comparison samples
 */
export function getComparisonSamples(): DemoResponse[] {
  return DEMO_RESPONSES.filter((s) => s.isComparisonSample);
}

/**
 * Canned comparison result for Demo Mode
 * Compares sample-1 (cropped scarf) vs sample-2 (full scarf)
 */
export const DEMO_COMPARISON_RESULT = {
  winner: 'B' as const,
  reason: 'Photo B shows the complete scarf with both fringed ends visible, giving buyers a clear view of what they are purchasing. Photo A cuts off both ends, making it impossible to judge the full length or see the fringe detail.',
  strengths_a: [
    'Cable knit texture is clearly visible',
    'Warm, natural lighting',
    'Clean wooden background provides good contrast',
  ],
  strengths_b: [
    'Full product visible with even margins',
    'Both fringed ends in frame',
    'Professional flat-lay composition',
    'Ready for marketplace listing',
  ],
  recommendation: 'Use Photo B for your listing. The full-length view helps buyers understand exactly what they are purchasing. Consider taking an additional close-up shot to showcase the cable knit texture visible in Photo A.',
};

/**
 * Simulate Gemma 4 E4B processing delay (~2 seconds)
 */
export function simulateProcessing(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 2000));
}
