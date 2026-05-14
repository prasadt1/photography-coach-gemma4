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
 */

export interface DemoResponse {
  /** Unique identifier for this sample */
  id: string;

  /** Display label (e.g., "Hand-Knit Scarf") */
  label: string;

  /** Path to image in public/demo-samples/ */
  imagePath: string;

  /** Category for display */
  category: string;

  /** The raw Gemma 4 E4B response (accessibility format) */
  response: {
    whatISee: string;
    colorCheck: string;
    framingStatus: string;
    topFix: string;
    nextAction: string;
    listingScore: number;
    verdict: string;
    background: string;
    lighting: string;
    productFocus: string;
    altText: string;
    suggestedTags: string[];
    /** Optional: composition/lighting tips for extended TTS */
    compositionTip?: string;
    lightingTip?: string;
    /** Optional: listing copy for marketplace */
    listingCopy?: string;
  };

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
 */
export const DEMO_RESPONSES: DemoResponse[] = [
  {
    id: 'sample-1',
    label: 'Hand-Knit Scarf (Photo A)',
    imagePath: '/demo-samples/sample-1.jpg',
    category: 'Textiles',
    isComparisonSample: true,
    comparePairId: 'sample-2',
    response: {
      // PLACEHOLDER - Replace with real Gemma 4 E4B response
      whatISee: 'I see a hand-knit scarf in warm earth tones — browns, creams, and rust — laid flat on a light wooden surface. The texture of the knit is clearly visible with a chunky cable pattern.',
      colorCheck: 'The colors are reading accurately. The warm brown is similar to cinnamon or milk chocolate, and the cream sections are a true off-white.',
      framingStatus: 'The scarf fills about 70% of the frame. However, both ends are cut off at the edges.',
      topFix: 'Move your phone back about 8 inches so both ends of the scarf are fully visible. Buyers want to see the full length.',
      nextAction: 'Take another shot with the complete scarf in frame.',
      listingScore: 6,
      verdict: 'Needs minor fixes',
      background: 'Clean, good contrast',
      lighting: 'Even, natural',
      productFocus: 'Clear texture visible',
      altText: 'Hand-knit chunky cable scarf in warm brown and cream tones, laid flat on light wood surface',
      suggestedTags: ['handknit', 'scarf', 'chunky knit', 'cable pattern', 'winter accessories', 'handmade'],
      compositionTip: 'Try a diagonal placement to add visual interest while keeping the full scarf in frame.',
      lightingTip: 'The natural light is working well. Maintain this soft, even lighting.',
      listingCopy: 'Cozy hand-knit cable scarf in warm earth tones. Perfect for chilly days.',
    },
  },
  {
    id: 'sample-2',
    label: 'Hand-Knit Scarf (Photo B)',
    imagePath: '/demo-samples/sample-2.jpg',
    category: 'Textiles',
    isComparisonSample: true,
    comparePairId: 'sample-1',
    response: {
      // PLACEHOLDER - Replace with real Gemma 4 E4B response
      whatISee: 'I see the same hand-knit scarf, now photographed from directly above with the full length visible. Both fringed ends are in frame, and the cable pattern runs the full length.',
      colorCheck: 'Colors remain accurate — the browns and creams are consistent with the first photo.',
      framingStatus: 'Excellent framing. The full scarf is visible with even margins on all sides.',
      topFix: 'This shot is strong. Consider adding a small prop for scale reference, like a coffee mug or book.',
      nextAction: 'This photo is ready to list. You could take one lifestyle shot showing the scarf worn or draped.',
      listingScore: 8,
      verdict: 'Ready to list',
      background: 'Clean, professional',
      lighting: 'Even, soft',
      productFocus: 'Full product visible',
      altText: 'Full-length hand-knit cable scarf in brown and cream, showing complete pattern and fringed ends',
      suggestedTags: ['handknit', 'scarf', 'cable pattern', 'winter', 'handmade', 'cozy'],
      compositionTip: 'The overhead angle works perfectly for flat-lay product photography.',
      lightingTip: 'Lighting is ideal — soft and even with no harsh shadows.',
      listingCopy: 'Handcrafted cable-knit scarf with soft fringe detail. Made with love, built to last.',
    },
  },
  {
    id: 'sample-3',
    label: 'Ceramic Bowl',
    imagePath: '/demo-samples/sample-3.jpg',
    category: 'Ceramics',
    isComparisonSample: false,
    response: {
      // PLACEHOLDER - Replace with real Gemma 4 E4B response
      whatISee: 'I see a handmade ceramic bowl with a speckled glaze in soft blue-gray tones. The bowl is photographed from a three-quarter angle showing both the interior and exterior profile.',
      colorCheck: 'The blue-gray glaze is rendering true — a soft, muted tone like weathered denim. The speckles add visual interest.',
      framingStatus: 'The bowl is well-centered and fills the frame appropriately. Good angle choice.',
      topFix: 'The background fabric texture is slightly distracting. A solid backdrop would maximize product focus.',
      nextAction: 'Try one more shot with a cleaner background, then this is ready to list.',
      listingScore: 7,
      verdict: 'Needs minor fixes',
      background: 'Acceptable, minor distraction',
      lighting: 'Soft, flattering',
      productFocus: 'Excellent detail',
      altText: 'Handmade ceramic bowl with speckled blue-gray glaze, three-quarter angle showing interior and rim',
      suggestedTags: ['ceramic', 'pottery', 'handmade bowl', 'speckled glaze', 'stoneware', 'artisan'],
      compositionTip: 'The three-quarter angle is perfect for showing both form and interior.',
      lightingTip: 'Soft lighting flatters the glaze. Avoid direct light that could create hot spots.',
      listingCopy: 'Hand-thrown ceramic bowl with unique speckled glaze. Each piece one of a kind.',
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
 * Simulate Gemma 4 E4B processing delay (~2 seconds)
 */
export function simulateProcessing(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 2000));
}
