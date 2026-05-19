# L.E.N.S. Architecture

L.E.N.S. has two user-facing surfaces on top of one Gemma 4/Ollama runtime. The
headline product is Artisan Studio: a voice-guided flow for blind and low-vision
makers who need to verify and improve product photos without depending on
another person's eyes. Photo Studio is a secondary critique surface for sighted
photographers and batch workflows.

The mode split matters because privacy claims are not the same for every path.
Artisan Studio is designed around local Gemma 4 E4B via Ollama, recorded local
samples, or a clearly labelled judge-only Ollama Cloud path. Photo Studio can
also use optional cloud features, such as Gemini image enhancement with the
user's own API key.

![L.E.N.S. system architecture](images/architecture.png)

## Shared Foundations

Both modes use the same React/Vite client, TypeScript data model, and validation
boundary.

- `App.tsx` owns top-level routing between Home, Artisan Studio, Photo Studio,
  and Vault Mode.
- `config.ts` decides whether the browser should reach local Ollama, the Vite
  `/ollama` LAN proxy, or the Vercel `/api/analyze` cloud route.
- `types.v2.ts` defines the structured analysis shape used across the app.
- `services/validationService.ts` validates model output before the UI treats it
  as a valid critique.
- `services/cvService.ts` extracts deterministic photo signals such as EXIF,
  histogram, and focus information when an image element and file are available.
- `services/promptService.ts` builds the task-specific prompts that turn those
  observations into coaching.
- `services/ollamaService.ts` is the primary model adapter for Gemma 4 through
  Ollama.
- `services/analysisOrchestrator.ts` coordinates CV extraction, model inference,
  validation, progress updates, and Vault Mode audit logging.

The shared rule is strict output handling: model responses are parsed and
validated before display. A malformed response should fail loudly instead of
silently becoming advice.

## Mode 1: Artisan Studio

Artisan Studio is the L.E.N.S. product path. It is built for a maker who can take
a rough photo but cannot reliably inspect focus, colour, lighting, or background
quality. The interface speaks one useful correction at a time, then helps the
maker produce alt text and listing copy.

Key UI and flow files:

- `components/HomePage.tsx` presents the L.E.N.S. story and routes into the
  Artisan path.
- `components/ArtisanJourney.tsx` provides the guided camera journey used for
  the voice-first demo flow.
- `components/SellMode.tsx` handles the Artisan Studio upload/capture workflow,
  sample playback, analysis, spoken feedback, and listing output.
- `lib/sellModeAnalysis.ts` normalizes live, cloud, and sample responses into
  the same result shape.
- `components/MarketplaceListingPreview.tsx` renders copy-ready listing output.
- `services/voiceCoach.ts`, `lib/artisanSpeech.ts`, and
  `lib/artisanTapGuidance.ts` provide voice prompts, tap guidance, and fallback
  controls.

Artisan inference paths:

- Local product path: browser or Electron app sends the image to local Ollama
  running `gemma4:e4b`; the image stays on the maker's machine.
- LAN phone path: iPhone PWA reaches the same local Mac via HTTPS Vite dev
  server and the `/ollama` proxy, avoiding mixed-content failures.
- Judge try-it path: hosted `lens-app-gemma4` uploads use the Vercel
  `/api/analyze` route to Ollama Cloud. Samples are recorded from local E4B runs.
- Demo path: pre-recorded E4B samples show the flow without requiring model
  setup.

Artisan output is intentionally practical: scene description, colour
confirmation, one spatial fix, alt text, and listing copy. The model should say
what it cannot verify instead of inventing details the maker cannot visually
check.

## Mode 2: Photo Studio

Photo Studio is the secondary critique surface. It remains in the repo because it
supports the broader photography workflow: single-photo critique, comparison,
deterministic CV evidence, mentor chat, XMP export, and Vault Mode.

Key UI and flow files:

- `components/PhotoUploader.tsx` handles drag/drop and file selection.
- `components/AnalysisResults.tsx` renders score cards, critique, spatial
  annotations, evidence, mentor chat, export actions, and the optional Gemini
  enhancement panel.
- `components/ModeSelector.tsx` switches between Studio and Vault where that
  selector is shown.
- `components/ComparePanel.tsx` compares two photos and can pass a chosen image
  into Artisan Studio.
- `components/EvidencePanel.tsx`, `components/SpatialOverlay.tsx`, and
  `components/AuditLogPanel.tsx` expose grounding, annotations, and audit
  evidence.
- `services/xmpService.ts` and `electron/xmpService.ts` export Lightroom sidecar
  metadata for Studio workflows.

Photo Studio uses the same Gemma 4/Ollama pipeline by default. Its critique is
more technical than Artisan Studio: composition, lighting, technique, creativity,
subject impact, bounding boxes, rationale, and settings estimates.

The optional `components/GeminiEnhancementPanel.tsx` and
`services/geminiService.ts` path is Studio-only. It uses the user's own Gemini
API key to request image-enhancement tips or generated previews. That path sits
outside the local-only guarantee that defines Artisan Studio and should stay
clearly labelled as optional cloud functionality.

## Vault Mode

Vault Mode is the Electron desktop posture for confidential work. It is not a
separate coaching product; it is a network-isolated way to run the Studio
surface.

- `electron/main.ts` creates the desktop window and switches between Studio and
  Vault.
- `electron/vault-policy.ts` applies the Electron session-level network policy.
- `electron/preload.ts` exposes the small IPC surface needed by the renderer.
- `services/auditService.ts` and `components/AuditLogPanel.tsx` record and
  display local audit evidence.

Vault Mode is the right path when the user needs a stronger guarantee than a
browser PWA can provide. The iOS PWA cannot enforce the same operating-system
network isolation.

## Deployment Modes

The repo supports three honest runtime postures:

- Local E4B: `gemma4:e4b` served by Ollama on the user's machine. This is the
  real product path.
- Ollama Cloud: hosted judge uploads route through Vercel to Ollama Cloud so
  reviewers can try the app without installing a local model.
- Demo Mode: recorded local E4B examples for a no-setup walkthrough.

The browser chooses its endpoint in `config.ts`. In local development, HTTPS LAN
traffic can go through Vite's `/ollama` proxy in `vite.config.ts`. In production
judge mode, `api/analyze.ts` proxies to Ollama Cloud using server-side
credentials.

## What Is Not Current Architecture

The repository was cloned from an earlier cloud-first photo critique project.
Old root-level docs that describe that API-first architecture are not part of the
Gemma 4 L.E.N.S. architecture. Current docs should describe Gemma 4 via Ollama,
the Artisan-first product path, and Studio-only optional cloud integrations
separately.
