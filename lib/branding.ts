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

/** Ollama Cloud tag for live uploads (E4B is local-only on ollama.com today). */
export const OLLAMA_CLOUD_MODEL_TAG = 'gemma4:31b';

export const ARTISAN_GRID_WELCOME_KEY = 'lens-artisan-grid-welcomed';
export const PENDING_STUDIO_WELCOME_KEY = 'lens-pending-studio-welcome';

export function getJudgeHomeWelcomeScript(): string {
  return (
    `Welcome to the L.E.N.S. judge demo. ` +
    `This page is for reviewers. ` +
    `Tap Enter Artisan Studio to try the artisan coaching experience.`
  );
}

export function getArtisanStudioWelcomeScript(): string {
  return (
    `Artisan Studio. ` +
    `For this demo, tap a sample photo to hear recorded ${GEMMA_4_E4B} coaching from a local Mac, ` +
    `or upload your own photo for live coaching through ${OLLAMA_CLOUD}. ` +
    `When you are ready, open the voice-guided listing journey. ` +
    `Use Hear page guide anytime to replay these instructions.`
  );
}
