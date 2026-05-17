/**
 * Tap-only demo guidance — spoken + visible hints must use the same button labels.
 * Used when shouldUseTapOnlyDemo() (LAN HTTPS / ?record=1).
 */

export const TAP_BTN_PRIMARY =
  'w-full sm:w-auto min-h-[56px] px-8 py-4 bg-[#C06B45] hover:bg-[#A6552F] text-white rounded-full text-xl font-bold shadow-xl transition-colors focus:outline-none focus:ring-4 focus:ring-[#C06B45]/50';

export const TAP_BTN_SECONDARY =
  'w-full sm:w-auto min-h-[56px] px-8 py-4 bg-[#F4ECDC] border-2 border-[#D8CDB8] hover:border-[#C06B45] text-[#241F18] rounded-full text-xl font-bold transition-colors focus:outline-none focus:ring-4 focus:ring-[#C06B45]/50';

export const TAP_HINT_CLASS = 'text-base sm:text-lg text-[#241F18] font-semibold text-center max-w-lg mx-auto leading-relaxed';

export const TAP_LABELS = {
  start: 'Start',
  takePhoto: 'Take Photo',
  takeAnotherPhoto: 'Take another photo',
  continueToListing: 'Continue to listing',
  copyListing: 'Copy listing',
} as const;

export const TAP_GUIDANCE = {
  welcome: {
    title: 'Welcome to L.E.N.S.',
    hint: `Tap ${TAP_LABELS.start} to hear instructions, then open the camera.`,
    tts:
      'Welcome to L.E.N.S. Artisan Studio. I help you photograph your craft and prepare a listing. ' +
      `Tap ${TAP_LABELS.start} to continue. I will open the camera and tell you when to capture.`,
  },
  camera: {
    hint: `When you are ready, tap the large orange ${TAP_LABELS.takePhoto} button at the bottom of the screen.`,
    tts:
      `Position your craft in good light. When you are ready, tap the large orange ${TAP_LABELS.takePhoto} button at the bottom of the screen.`,
  },
  retake: {
    hint: `Tap ${TAP_LABELS.takeAnotherPhoto} below to try again with the suggested fix.`,
    ttsSuffix: `Tap ${TAP_LABELS.takeAnotherPhoto} at the bottom of the screen to try again.`,
  },
  comparison: {
    hint: `Tap ${TAP_LABELS.continueToListing} below to see your listing text.`,
    tts:
      `Photo comparison complete. Tap ${TAP_LABELS.continueToListing} at the bottom of the screen to see your listing.`,
  },
  listing: {
    hint: `Tap ${TAP_LABELS.copyListing} below to copy your description and tags.`,
    ttsSuffix: `Tap ${TAP_LABELS.copyListing} at the bottom of the screen to copy everything.`,
  },
} as const;
