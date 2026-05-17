# 📷 L.E.N.S. — Local Edge Native Studio

> *The one step between a finished piece and a sale shouldn't depend on someone else's eyes.*

**A private, voice-guided photography coach for blind and low-vision artisans.**

[![Gemma 4 E4B](https://img.shields.io/badge/Powered%20by-Gemma%204%20E4B-4285F4?style=flat-square&logo=google)](https://ollama.com/library)
[![Ollama](https://img.shields.io/badge/Runtime-Ollama-000000?style=flat-square)](https://ollama.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-Apache%202.0-green?style=flat-square)](LICENSE)

🔗 **[Live demo](https://lens-app-gemma4.vercel.app)** · **Demo video:** _add link before submission_ · Built for the **Gemma 4 Good Hackathon**

**Tracks:** Digital Equity & Inclusivity · Ollama

---

## What L.E.N.S. is

Mohan has low vision. He hand-knits sweaters and can finish a flawless cable pattern by touch. He can shape, price, and list a piece on his own — until the one step he cannot finish alone: photographing it well enough to sell online.

**L.E.N.S. closes that gap.** It is a voice-guided photography coach that helps blind and low-vision artisans *verify and improve their product photos before listing their work*. It runs Gemma 4 through Ollama, describes the photo in plain language, names the single most useful thing to fix, and returns alt-text and listing copy ready to paste.

The point isn't a sharper critique than a sighted friend would give — it's that Mohan no longer has to ask. The villain here is **dependence**, not blindness. Today a low-vision maker hires a photographer, waits for a sighted relative, or sends the image to a remote describer. L.E.N.S. removes the intermediary.

---

## Who it's for

Blindness is a spectrum — only an estimated 10–15% of blind and low-vision people have no light perception; the majority retain usable residual vision. Mohan is in that majority: he can frame a shot roughly and operate a phone, but cannot *verify* whether the light is even, the texture sharp, the colour true.

L.E.N.S. is built for that maker first. By the curb-cut effect it then generalizes outward — the same coaching helps any maker who lacks a photographer or a reliable connection — but the design target is always the hardest case: a blind maker, alone, offline.

---

## What it does

### 🎙️ Artisan Studio — the core experience

L.E.N.S. is built **voice-first**, not a visual interface with audio bolted on. The maker photographs a piece, and L.E.N.S. responds like a patient studio mentor — out loud, one priority at a time. For each photo it returns five things:

- **Plain-language scene description** — subject, framing, background, lighting.
- **Colour confirmation** — names the colours it sees, anchored to familiar references, so the maker can check the photo against the real object.
- **One spatial fix** — the single highest-impact change, never an overwhelming checklist.
- **Alt-text** — ready to paste, for the maker's own screen-reader customers.
- **Listing copy** — a short, accurate title and description grounded only in what the photo shows.

Three design choices make this work for a maker who works largely by ear:

- **One fix at a time.** A list of ten corrections is not actionable. The maker hears one change, re-shoots, and L.E.N.S. **compares** the new photo against the first to confirm the fix landed — a closing loop, not an open-ended critique.
- **Glass-box reasoning.** L.E.N.S. says *why* it flagged something, so the maker learns to photograph rather than just gets graded.
- **Anti-hallucination.** It states what it cannot see rather than inventing detail — which matters most precisely because the user cannot visually check the claims.

### 📸 Photo Studio — secondary

A general critique surface for sighted photographers: 5-axis scoring (composition, lighting, technique, creativity, subject impact), spatial bounding-box annotations, deterministic CV grounding (EXIF, histogram, focus map), a mentor chat, and Lightroom XMP sidecar export. An optional AI image-enhancement panel uses the Gemini API with the user's *own* key — clearly separate from the on-device coaching path.

---

## How it runs — three honest modes

L.E.N.S. runs Gemma 4 through **Ollama**, and is honest about where inference happens:

| Mode | What it is | Network |
|------|-----------|---------|
| **Local — Gemma 4 E4B via Ollama** | The actual product. Runs on the maker's own machine; the image never leaves the device. | Fully offline |
| **Ollama Cloud** | Powers the hosted web app and iPhone PWA so anyone — including judges — can try L.E.N.S. without a local install. Real Gemma 4 inference, hosted. | Requires a connection |
| **Demo Mode** | Offline playback of real, previously recorded E4B responses — a no-setup walkthrough. | None |

**On-device is the product; the hosted path is how you try it quickly.** The public demo is labelled honestly: **sample photos** play back real E4B runs recorded on a local Mac; **uploads** use **Ollama Cloud** with `gemma4:e4b`. Every mode produces the **same strict JSON contract**, validated on the client so a malformed response fails loudly instead of degrading silently.

### Two public deployments (one repo)

| URL | Build profile | Experience |
|-----|---------------|------------|
| **[lens-app-gemma4.vercel.app](https://lens-app-gemma4.vercel.app)** | `VITE_DEPLOYMENT_PROFILE=judge` | Home → **Enter Artisan Studio** → sample grid or upload (cloud E4B) → optional voice-guided journey |
| **[photography-coach-gemma4.vercel.app](https://photography-coach-gemma4.vercel.app)** | `artisan` (default) | Boots into the **voice-guided Artisan journey** (submission / video story) |

**Vercel env — judge project (`lens-app-gemma4`):** `VITE_DEPLOYMENT_PROFILE=judge` · `OLLAMA_API_KEY` · `OLLAMA_TARGET=cloud` · `OLLAMA_CLOUD_MODEL=gemma4:e4b` — then redeploy.

> **Why E4B?** Gemma 4's E4B variant is small enough to run on a maker's own laptop through Ollama — and that on-device capability is the whole point: private, offline, free coaching. Larger Gemma 4 variants give sharper critique but cannot run locally on modest hardware.

Gemma is a trademark of Google LLC.

---

## 🚀 Quick start

**Prerequisites:** Node.js 18+ and npm · [Ollama](https://ollama.com) for local inference.

```bash
# 1. Clone
git clone https://github.com/prasadt1/photography-coach-gemma4.git
cd photography-coach-gemma4

# 2. Install dependencies
npm install

# 3. Pull the Gemma 4 model
ollama pull gemma4:e4b

# 4. Start Ollama
ollama serve

# 5. Run the app
npm start
```

Open **http://localhost:5173**, capture or upload a photo, and L.E.N.S. coaches you through it.

> Prefer to skip setup? Open the **[judge try-it demo](https://lens-app-gemma4.vercel.app)** — samples (recorded local E4B) + upload (Ollama Cloud E4B), no install required.

---

## 📱 Try it on a phone

The hosted app is an installable PWA:

1. On iPhone, open **https://lens-app-gemma4.vercel.app** in Safari.
2. Share → **Add to Home Screen**, then launch it full-screen.
3. Grant camera permission once. L.E.N.S. uses a live `getUserMedia` preview, so capture is voice-driven — say *"take photo"* and it grabs the frame; a labelled capture button is always available as an equal alternative.

Phone uploads on the hosted PWA use **Ollama Cloud E4B** (on-device phone inference is on the roadmap — see below). To deploy your own judge copy, set the env vars in the table above on the **lens-app** Vercel project; `/api/analyze` reads them server-side.

---

## 📐 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  CLIENT — React + TypeScript + Vite                          │
│  PWA (installable, getUserMedia camera) · Electron desktop   │
└───────────────────────────────┬──────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────┐
│  INFERENCE — Gemma 4 via Ollama                              │
│  Local E4B (on-device)  ·  Ollama Cloud  ·  Demo Mode        │
│  Priority chain: local → cloud → demo                        │
└───────────────────────────────┬──────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────┐
│  CONTRACT & VALIDATION                                       │
│  One strict JSON schema · Zod + JSON-Schema validation       │
│  Refusal detection · (Electron) hash-chained audit log       │
└──────────────────────────────────────────────────────────────┘
```

- **Strict JSON contract.** One structured object drives all five outputs; the client validates every response.
- **Principles-led prompt.** Gemma is driven by a system prompt that asks for explicit observations, reasoning, and a single prioritized fix.
- **Deterministic CV grounding** (Photo Studio): EXIF, histogram, and focus-map data are extracted client-side and passed alongside the image.
- **Desktop Vault Mode** (Electron): OS-level network isolation and an audit log, for makers who want a guaranteed-offline build.

---

## ♿ Accessibility

Because the users are blind and low-vision, accessibility is part of the build, not bolted on:

- **Voice-first by design.** Every voice action has an equal, clearly labelled tap — the app never depends on either input alone.
- **Screen-reader support.** Semantic landmarks, ARIA live regions for results and status, managed focus, and labelled controls; the app's own voice coaching sits *alongside* a screen reader, not in place of it.
- **Operable without a mouse.** Full keyboard operation with visible focus indicators.
- **Respects user preferences.** Honours `prefers-reduced-motion`; pinch-zoom is never disabled.
- **Contrast.** Targets WCAG 2.2 AA for text.
- **Multilingual.** UI and coaching available in several languages.

> Accessibility is a moving target — verify with an automated scan (axe / Lighthouse) and a real screen-reader pass before each release.

---

## 📦 Platform setup

**Web (Vite + React)**
```bash
npm start       # dev server (http://localhost:5173)
npm run build   # production build → dist/
npm run preview # preview the production build
```

**Desktop (Electron + Vault Mode)** — a guaranteed-offline build with OS-level network isolation:
```bash
npm run electron:dev          # run in development
npm run electron:build:mac    # → .dmg
npm run electron:build:win    # → .exe
npm run electron:build:linux  # → .AppImage
```

**iOS PWA** — install the [hosted app](https://lens-app-gemma4.vercel.app) from Safari's Share menu (see *Try it on a phone* above). Inference runs on Ollama Cloud.

---

## 🗺️ Roadmap

L.E.N.S. is built for the hardest case today; the honest next steps are:

- **Phone-native Gemma** — running the model on the device most makers already carry, once mobile edge runtimes for Gemma 4 mature, so the phone experience becomes as local as the desktop one.
- **Direct publishing** — pushing the finished listing straight to Etsy and Shopify, so the maker never has to leave L.E.N.S.
- **Haptic framing feedback** — vibration cues for alignment, for capture without any audio at all.
- **Wider grounding** — more craft categories in the prompt's grounding examples and a broader screen-reader test matrix.

Nothing above is implied as present: the local desktop path works today; the phone-native path is named as future work.

---

## 🗂️ Project structure

```
photography-coach-gemma4/
├── App.tsx                    # Root app + view routing
├── components/                # UI — AnalysisResults, LiveCameraCapture,
│                              #      ArtisanJourney, SellMode, Header, …
├── services/
│   ├── ollamaService.ts       # Gemma 4 inference (local + Ollama Cloud)
│   ├── analysisOrchestrator.ts# Local → cloud → demo pipeline
│   ├── promptService.ts       # Principles-led system prompt
│   ├── validationService.ts   # JSON contract validation
│   ├── voiceService.ts        # Web Speech API (TTS + voice input)
│   └── demoMode.ts            # Recorded-response playback
├── api/analyze.ts             # Vercel serverless fn → Ollama Cloud
├── electron/                  # Desktop shell + Vault Mode
├── public/                    # PWA manifest + service worker
├── types.v2.ts                # JSON schema types
└── docs/                      # Specs, spikes, integration guides
```

---

## 🧪 Testing

```bash
npm test                 # unit tests
npm run test:integration # pipeline integration tests
npm run test:all         # everything
```

---

## 🔧 Troubleshooting

**"Ollama not found"**
```bash
ollama --version                      # is it installed?
curl http://localhost:11434/api/tags  # is it running?
ollama list | grep gemma              # is the model pulled?
ollama pull gemma4:e4b                # pull it if missing
```

**Slow first analysis** — the first request loads the model (cold start). Warm it up:
```bash
ollama run gemma4:e4b "ready"
```

**Hosted demo returns no analysis** — confirm `OLLAMA_API_KEY`, `OLLAMA_TARGET=cloud`, and `OLLAMA_CLOUD_MODEL=gemma4:e4b` are set on the **lens-app** Vercel project (not just a local `.env`), then redeploy. For local dev with real inference: `OLLAMA_TARGET=local vercel dev` after `ollama pull gemma4:e4b`. See `TROUBLESHOOTING.md` for more.

---

## 🛠️ Built with

Gemma 4 (Google) · Ollama · React 19 · TypeScript · Vite · Electron · Tailwind CSS

---

## 📄 License

Apache License 2.0 — see [LICENSE](LICENSE).

---

## 🔗 Links

- **Live demo:** https://lens-app-gemma4.vercel.app
- **Demo video:** _add before submission_
- **Repository:** https://github.com/prasadt1/photography-coach-gemma4
- **Hackathon:** Gemma 4 Good

---

<div align="center">

**The competence the maker already brings to the craft — extended to the one step that used to require another pair of eyes.**

*L.E.N.S. — Local Edge Native Studio · Gemma 4 E4B via Ollama*

</div>
