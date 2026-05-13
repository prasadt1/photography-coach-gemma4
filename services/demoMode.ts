/**
 * demoMode.ts — Pre-recorded Gemma 4 E4B responses for Demo Mode
 *
 * When Ollama is not running (e.g., on deployed Vercel), Artisan Studio
 * falls back to Demo Mode with pre-recorded responses on sample images.
 */

export interface DemoSample {
  id: string;
  label: string;
  imageUrl: string;
  thumbnailUrl: string;
  response: string;
}

/**
 * Three pre-recorded product photo samples with Gemma 4 E4B responses.
 * These are real product-style photos that match our artisan use case.
 */
export const DEMO_SAMPLES: DemoSample[] = [
  {
    id: 'knit-scarf',
    label: 'Hand-Knit Scarf',
    imageUrl: 'https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=300&q=60',
    response: `[WHAT_I_SEE]: I see a hand-knit scarf in warm earth tones — browns, creams, and rust — laid flat on a light wooden surface. The texture of the knit is clearly visible with a chunky cable pattern.

[COLOR_CHECK]: The colors are reading accurately. The warm brown is similar to cinnamon or milk chocolate, and the cream sections are a true off-white. Good color representation.

[FRAMING_STATUS]: The scarf fills about 70% of the frame, which is good. However, both ends of the scarf are cut off at the edges of the photo.

[TOP_FIX]: Move your phone back about 8 inches so both ends of the scarf are fully visible. Buyers want to see the full length and any fringe or finishing details.

[NEXT_ACTION]: Take another shot with the complete scarf in frame. The lighting and surface are working well.

[LISTING_SCORE]: 6/10

[VERDICT]: Needs minor fixes

[BACKGROUND]: Clean, good contrast

[LIGHTING]: Even, natural

[PRODUCT_FOCUS]: Clear texture

[ALT_TEXT]: Hand-knit chunky cable scarf in warm brown and cream tones, laid flat on light wood surface

[SUGGESTED_TAGS]: handknit, scarf, chunky knit, cable pattern, winter accessories, handmade, cozy`,
  },
  {
    id: 'ceramic-bowl',
    label: 'Ceramic Bowl',
    imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=300&q=60',
    response: `[WHAT_I_SEE]: I see a handmade ceramic bowl with a speckled glaze in soft blue-gray tones. The bowl is photographed from a three-quarter angle on what appears to be a neutral linen surface.

[COLOR_CHECK]: The blue-gray glaze is rendering true — it's a soft, muted tone like weathered denim or morning fog. The speckles add nice visual interest.

[FRAMING_STATUS]: The bowl is well-centered and fills the frame appropriately. The angle shows both the interior and the exterior profile nicely.

[TOP_FIX]: The background is slightly busy with visible fabric texture. Consider using a solid backdrop or moving the bowl to a cleaner surface for maximum product focus.

[NEXT_ACTION]: This is close to listing-ready. One more shot with a simpler background would be perfect.

[LISTING_SCORE]: 8/10

[VERDICT]: Ready to list

[BACKGROUND]: Acceptable, minor distraction

[LIGHTING]: Soft, flattering

[PRODUCT_FOCUS]: Excellent detail

[ALT_TEXT]: Handmade ceramic bowl with speckled blue-gray glaze, shown from three-quarter angle displaying interior and rim

[SUGGESTED_TAGS]: ceramic, pottery, handmade bowl, speckled glaze, stoneware, artisan, kitchenware`,
  },
  {
    id: 'wooden-cutting-board',
    label: 'Wooden Cutting Board',
    imageUrl: 'https://images.unsplash.com/photo-1588165171080-c89acfa5ee83?w=800&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1588165171080-c89acfa5ee83?w=300&q=60',
    response: `[WHAT_I_SEE]: I see a handcrafted wooden cutting board with beautiful grain patterns. The wood appears to be walnut or a similar dark hardwood with lighter streaks running through it. It's photographed on a light marble or stone surface.

[COLOR_CHECK]: The wood tones are rich and warm — deep chocolate brown with honey-colored grain lines. The colors look natural and appealing.

[FRAMING_STATUS]: The cutting board is positioned at a slight angle which adds visual interest. The full board is visible with good margins on all sides.

[TOP_FIX]: The lighting is creating a slight shadow on the left side. Rotate the board or adjust your light source so the grain pattern is evenly illuminated across the entire surface.

[NEXT_ACTION]: Adjust the lighting angle and take one more shot. You're very close to a perfect listing photo.

[LISTING_SCORE]: 7/10

[VERDICT]: Needs minor fixes

[BACKGROUND]: Clean, professional

[LIGHTING]: Good but uneven

[PRODUCT_FOCUS]: Grain visible

[ALT_TEXT]: Handcrafted walnut cutting board with natural grain patterns, photographed on light marble surface

[SUGGESTED_TAGS]: cutting board, walnut, handmade, woodworking, kitchen, charcuterie board, artisan, hardwood`,
  },
];

/**
 * Check if we're in Demo Mode (Ollama not available).
 * This is determined by the ollamaReady state passed from parent.
 */
export function isDemoMode(ollamaReady: boolean | null): boolean {
  return ollamaReady === false;
}

/**
 * Get a demo sample by ID.
 */
export function getDemoSample(id: string): DemoSample | undefined {
  return DEMO_SAMPLES.find((s) => s.id === id);
}

/**
 * Simulate the ~2 second processing delay.
 */
export function simulateProcessing(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 2000));
}
