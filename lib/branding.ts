/**
 * User-facing model & runtime names (align with README / Kaggle writeup).
 * Prose: Gemma 4 E4B · Ollama tag: gemma4:e4b · Schema id: gemma-4-e4b
 */

export const GEMMA_4_E4B = 'Gemma 4 E4B';
export const GEMMA_4 = 'Gemma 4';
export const OLLAMA_MODEL_TAG = 'gemma4:e4b';
export const GEMMA_SCHEMA_ID = 'gemma-4-e4b';
export const GEMMA_TRADEMARK = 'Gemma is a trademark of Google LLC.';
export const OLLAMA_CLOUD = 'Ollama Cloud';

/** Gemma open-models hub — family overview */
export const GEMMA_FAMILY_URL = 'https://deepmind.google/models/gemma/';

/** Gemma 4 — use when citing Gemma 4 or E4B in prose (E4B is a Gemma 4 variant) */
export const GEMMA_4_URL = 'https://deepmind.google/models/gemma/gemma-4/';

/** Official model card (documents E4B and other Gemma 4 sizes) */
export const GEMMA_4_MODEL_CARD_URL =
  'https://ai.google.dev/gemma/docs/core/model_card_4';

/** Prefer model card for “Gemma 4 E4B” links — Google has no separate E4B-only page */
export const GEMMA_4_E4B_DOCS_URL = GEMMA_4_MODEL_CARD_URL;

export function getJudgeHomeWelcomeScript(): string {
  return (
    `Welcome to L.E.N.S., Local Edge Native Studio. ` +
    `A voice-guided photography coach for blind and low-vision artisans, powered by ${GEMMA_4_E4B} through Ollama. ` +
    `This is the judge try-it demo. ` +
    `On this page, tap Enter Artisan Studio. ` +
    `Inside, try a sample photo first — those play recorded ${GEMMA_4_E4B} coaching from a local Mac. ` +
    `Or upload your own photo for live coaching through ${OLLAMA_CLOUD}. ` +
    `You can also open the full voice-guided listing journey from there. ` +
    `Use the Voice button at the top right to turn spoken feedback on or off.`
  );
}
