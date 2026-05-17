/**
 * Ollama JSON schema for Artisan Studio (blind/low-vision) coaching output.
 * Matches parseArtisanResponseV3 / ARTISAN_ACCESSIBILITY_SYSTEM_PROMPT.
 */
export const ARTISAN_V3_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    subject: { type: 'string' },
    critique: {
      type: 'object',
      properties: {
        framing: { type: 'string' },
        lighting: { type: 'string' },
        primary_fix: { type: 'string' },
      },
      required: ['framing', 'lighting', 'primary_fix'],
    },
    ratings: {
      type: 'object',
      properties: {
        lighting: { type: 'number' },
        framing: { type: 'number' },
        background: { type: 'number' },
        focus: { type: 'number' },
      },
      required: ['lighting', 'framing', 'background', 'focus'],
    },
    primary_issue: { type: 'string' },
    confidence_note: { type: 'string' },
    alt_text: { type: 'string' },
    listing_copy: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    ready_to_list: { type: 'boolean' },
  },
  required: [
    'subject',
    'critique',
    'ratings',
    'primary_issue',
    'confidence_note',
    'alt_text',
    'listing_copy',
    'tags',
    'ready_to_list',
  ],
} as const;
