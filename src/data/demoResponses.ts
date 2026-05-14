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
 * The 3 demo samples with REAL Gemma 4 E4B responses.
 * Captured 2026-05-14 using scripts/capture-demo-responses.mjs
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
    // REAL Gemma 4 E4B response captured 2026-05-14 (v2 with color analogies)
    response: {
      subject: 'I see one knitted item, appearing to be a narrow fabric swatch, with a primary color of light brown, similar to dried autumn leaves.',
      critique: {
        framing: 'The object is placed centrally across the wood surface, but there is excessive unused space above and below it.',
        lighting: 'The lighting is uneven, causing a strong shadow immediately below the knitted item and slightly darkening the color. This makes the color read as darker than necessary.',
        primary_fix: 'Place the knitted item on a clean, flat surface and move the camera directly over the object, ensuring the light source is directly above or slightly to the side to eliminate the noticeable shadow underneath the fabric.',
      },
      confidence_note: '',
      alt_text: 'Close-up, horizontal view of a woven, knitted swatch in a light brown, natural yarn, displayed against a wooden surface.',
      listing_copy: 'Showcase the texture and pattern of this hand-knitted swatch. The yarn is a natural, light brown color, perfect for complementing earthy tones. This piece emphasizes the craftsmanship of the stitch work.',
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
    // REAL Gemma 4 E4B response captured 2026-05-14 (v2 with color analogies)
    response: {
      subject: 'I see one rectangular woven textile piece in shades of beige and brown — the overall color is similar to unbleached coffee grounds.',
      critique: {
        framing: 'The product is centered and fully visible, but the surrounding background wood is unevenly lit and distracts from the item.',
        lighting: 'The lighting is generally even but lacks direction, which makes the texture readable but the colors flat and dull.',
        primary_fix: 'Place the textile on a clean, flat background surface that has consistent color and minimal grain or texture, such as a solid piece of pale gray poster board.',
      },
      confidence_note: '',
      alt_text: 'Woven textile piece featuring horizontal cable knit pattern, suitable for home decor or seasonal accent.',
      listing_copy: 'This hand-woven textile features a detailed, structured cable knit pattern. Crafted from durable, natural fibers, it adds rustic warmth and texture to any seasonal display or accent piece. Ideal for holiday decorating or rustic staging.',
      ready_to_list: false,
    },
  },
  {
    id: 'sample-3',
    label: 'Ceramic Bowl',
    imagePath: `/demo-samples/sample-3.jpg?${IMG_VERSION}`,
    category: 'Ceramics',
    isComparisonSample: false,
    // REAL Gemma 4 E4B response captured 2026-05-14 (v2 with color analogies)
    response: {
      subject: 'I see one ceramic bowl with a primary color that is a mottled blue-gray, similar to wet concrete.',
      critique: {
        framing: 'The bowl is centered and fully visible; no parts are cut off by the edge.',
        lighting: 'The lighting is generally even, but there is a strong, slightly distracting glare on the inside curve of the bowl, and the colors appear accurate.',
        primary_fix: 'Move the camera up and slightly to the left, and change the angle so the light hits the bowl at a flatter, more overhead angle to reduce the interior glare.',
      },
      confidence_note: '',
      alt_text: 'A single, speckled blue-gray ceramic bowl resting on coarse tan burlap fabric.',
      listing_copy: 'This handcrafted ceramic bowl features a speckled blue-gray glaze reminiscent of wet concrete. The piece is durable and unique, making it perfect for serving or display.',
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
// Comparison based on Gemma 4 E4B analysis of both photos (captured 2026-05-14)
export const DEMO_COMPARISON_RESULT = {
  winner: 'B' as const,
  reason: 'Photo B shows the product centered and fully visible with even lighting that makes the texture readable. Photo A has excessive unused space and uneven lighting that darkens the color.',
  strengths_a: [
    'Light brown color similar to dried autumn leaves is visible',
    'Product is centered across the frame',
    'Cable knit texture is clear',
  ],
  strengths_b: [
    'Product is centered and fully visible',
    'Beige and brown tones read accurately',
    'Cable knit pattern detail is readable',
    'Better overall framing',
  ],
  recommendation: 'Use Photo B as your primary listing image. To improve it further, place the textile on a clean, flat background with consistent color — such as pale gray poster board — to reduce distraction from the wood grain.',
};

/**
 * Simulate Gemma 4 E4B processing delay (~2 seconds)
 */
export function simulateProcessing(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 2000));
}
