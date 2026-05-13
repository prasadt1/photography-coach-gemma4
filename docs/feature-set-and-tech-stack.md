# LENS — Complete Feature Set & Tech Stack Mapping
**Local Edge-Native Studio for Photography Coaching** (formerly "Photography Coach v2")

**Purpose:** Single source of truth for what's shipped, what tech powers each feature, and how the architecture aligns with hackathon judging tracks. Use this as a reference when reviewing the writeup and video script.

**Last updated:** 2026-05-09

---

## 1. Product Overview (One Sentence)

**LENS (Local Edge-Native Studio)** is a privacy-first AI photography mentor that runs entirely on the user's laptop via Gemma 4 + Ollama — it gives photographers structured, evidence-based critique of their photos with spatial annotations, conversational mentorship, and Lightroom-compatible exports, plus a Vault Mode that proves to clients no data left the device.

---

## 2. Complete Feature Inventory

### A. Core Critique Features

| Feature | What it does | Tech used | User benefit |
|---|---|---|---|
| **Single-photo critique** | Drop one photo, get 5-axis scoring (Composition, Lighting, Technique, Creativity, Subject Impact), spatial bounding boxes flagging issues, transparent rationale | **Gemma 4 E4B** (vision + text) via Ollama; Zod schema validation | Understand what's working and what isn't, with cited evidence |
| **Spatial bounding pins** | Numbered pins on the photo show exactly where issues are (composition, lighting, focus). Click pin → jump to detail card. Click card → highlight pin. | Gemma 4 multimodal output → custom React `SpatialOverlay` component | See issues visually, not just textually |
| **Transparent rationale** | Each critique exposes Observations, Reasoning Steps, Priority Fixes — no black-box answers | Gemma 4 structured JSON output (v2 schema) | Trust + learning — interrogate the AI's reasoning |
| **CV grounding** | Before Gemma sees the photo, deterministic CV tools extract EXIF, RGB histograms, Laplacian sharpness, face/eye coords, color stats. These facts are fed to Gemma's prompt. | Browser-side `cvService.ts` (EXIF.js, canvas) + Gemma prompt | Critique cites measured values ("0.7 EV underexposed") not impressions |
| **Skill-level adaptive output** | Gemma detects whether you're beginner/intermediate/advanced and adapts tone | Gemma 4 reasoning + skill heuristic | Beginner-friendly OR pro-grade language as appropriate |
| **Multilingual critique (8 languages)** | UI dropdown to switch critique + mentor language: EN, ES, PT-BR, HI, FR, DE, JA, ZH. Gemma 4 supports 140+; we ship 8 covering ~3B speakers. | Gemma 4 native multilingual + system prompt addendum (JSON keys English, values translated) | Photographers in non-English regions get critique in their language |
| **Deep Critique mode (configurable reasoning depth)** | Opt-in toggle that asks Gemma to walk through all 5 axes step-by-step before producing JSON. Trades latency for richer rationale. | Gemma 4 chain-of-thought via prompt instruction + relaxed length caps in schema | More nuanced critique when the user wants depth over speed |

### B. Mentor Chat Features

| Feature | What it does | Tech used | User benefit |
|---|---|---|---|
| **Conversational mentor** | Ask follow-up questions about your photo across 5 turns. AI remembers the photo and prior critique. | Gemma 4 text generation via Ollama; conversation history threading | Interrogate any score, ask "why?" |
| **Voice input (STT)** | Tap the 🎤 mic, speak your question, transcript appears in input | Browser-native **Web Speech API** (NOT Gemma — browser-handled) | Hands-free during a shoot, accessibility win |
| **Voice output (TTS)** | Tap 🔊 on any critique or AI reply to hear it read aloud | Browser-native **Web Speech API** (NOT Gemma) | Hands-free, accessibility for low-vision users |

### C. Workflow Features

| Feature | What it does | Tech used | User benefit |
|---|---|---|---|
| **Bulk Coach** | Drop up to 50 photos. Each gets coached, scored, sortable. Background processing with cancel + ETA. | Gemma 4 sequential calls; IndexedDB session persistence | Cull a wedding shoot in 5 minutes instead of 30 |
| **XMP sidecar export** | Export AI scores as `.xmp` files (single or ZIP). Lightroom Classic reads them as star ratings, color labels, keywords. | Custom XMP generator (`xmpService.ts`) | Coach scores integrate into existing editor workflow |
| **Compare Two Photos** | Drop two near-duplicates side-by-side. Gemma picks the keeper, lists strengths of each, recommends. | Gemma 4 multi-image prompt (two photos in one call) | Cull workflow — pick keepers from near-duplicates |
| **Session persistence** | Bulk Coach results survive tab close. Restore on reopen. | IndexedDB | Never lose a 50-photo session to a browser crash |

### D. Privacy / Trust Features (Vault Mode)

| Feature | What it does | Tech used | User benefit |
|---|---|---|---|
| **Vault Mode toggle** | Switch from Studio to Vault. UI turns amber. Banner explains the guarantees. | React state + Vault egress guard | Visual clarity that you've entered a different trust posture |
| **Network egress block** | All `fetch()` calls intercepted; only `localhost` (Ollama) is allowed. Cloud Gemini disabled at orchestration. | TypeScript `fetch` interceptor in `auditService.ts` | App-level network guarantee during analysis |
| **Hash-chained audit log** | Every analysis event → SHA-256 hashed entry → chained to previous hash. Tampering breaks the chain. | `hash-wasm` SHA-256, IndexedDB storage, prev-hash linking | Tamper-evident record of what was analyzed when |
| **Privacy Report HTML export** | Export the audit log as a human-readable HTML certificate. Opens in any browser, prints to PDF, emails to clients. Now includes per-photo SHA-256 **authenticity hashes** so clients can verify the exact photo content was analyzed (not edited). | Custom HTML template generator + SHA-256 image hashes | Compliance evidence; clients can cryptographically verify photo identity with `shasum -a 256 photo.jpg` |
| **EXIF Sanitization (GPS strip)** | One-click "Download photo (GPS stripped)" button on the result page. Removes APP1 EXIF segment from JPEGs before sharing. Built for journalists / NGO field workers protecting subject locations. | Custom JPEG segment walker (`services/exifSanitizer.ts`) | Prevent inadvertent location leaks when sharing sensitive imagery |
| **Plain-English audit panel** | Default view shows "Photo reviewed: IMG_8051.jpg at 14:32" with a verify button. "Technical details" toggle reveals SHA-256 hashes. | React component with toggleable detail layer | Photographers without crypto knowledge can use it |

### E. Tier 2 (Browser Fallback) Features — Opt-In Only

| Feature | What it does | Tech used | User benefit |
|---|---|---|---|
| **Browser AI tier** (`?tier2` flag) | Gemma 2B runs in-browser via WebLLM (LiteRT-class via MLC compiler). Activates when Ollama unavailable. | **Gemma 2B** + **WebLLM** + WebGPU; CV-data-only critique (no vision) | Zero-install fallback; demonstrates the two-Gemma architecture |
| **Model download progress** | First use shows a modal with progress bar (~1.5 GB cached after) | WebLLM init progress callback | Clear UX for the long first download |
| **Hardware warning** | Opt-in only via URL flag because Tier 2 + Ollama can hang smaller Macs | URL param check + amber warning copy | Honest scope — no surprise hangs |

### F. Optional Cloud Features (Studio Mode Only)

| Feature | What it does | Tech used | User benefit |
|---|---|---|---|
| **Enhancement Tips** (cloud) | Generates Lightroom-ready editing recipe + reframing suggestions + reshoot notes | Gemini 2.0 Flash via user's own API key | Detailed editing guidance the local 4B model can't match |
| **Enhanced Image Preview** (cloud) | Generates an actual AI-corrected version of the photo for inspiration | Gemini 3 Pro Image (`gemini-3-pro-image-preview`) via user's API key | Visual reference for what improvements look like |
| **API key handling** | Key held in React state only — never written to disk, never sent anywhere except Google's API | In-memory React state | Zero retention of user credentials |
| **Vault Mode disable** | Cloud features blocked at orchestration layer when Vault is on (not just UI) | Vault-aware orchestrator check | Cloud features can't accidentally be used in Vault Mode |

### G. Platform Features

| Feature | What it does | Tech used | User benefit |
|---|---|---|---|
| **Web app** | Runs in Chrome/Edge/Safari/Firefox at localhost or hosted URL | Vite + React + TypeScript | Try without installing |
| **Electron desktop app** | Native Mac app with full file dialogs and Vault Mode | Electron 33 wrapping the React app | Pro-grade desktop experience; Mac/Win/Linux build pipeline |
| **iOS PWA** | Add-to-Home-Screen via Tailscale to reach Mac-hosted web app from anywhere | Service worker + Tailscale tunnel | Mobile companion to the Mac (Phase 1) |
| **Android PWA + share-target** | Native share sheet — tap Share from any photo app → Photography Coach receives the image | Web Share Target API + service worker | Native-feeling mobile workflow |
| **Offline-capable PWA** | Service worker caches static shell; works offline once installed | Service worker | Resilient to flaky connections |

### H. UX Polish Features

| Feature | What it does | Tech used | User benefit |
|---|---|---|---|
| **Distinct error states** | Ollama down vs. model missing vs. timeout vs. analysis failed — each gets its own actionable error screen | React error classification | No generic "something went wrong" |
| **Heartbeat health check** | 5-second interval pings Ollama. Header pill flips red instantly if it goes down. | `setInterval` health probe | Live status, not stale "ready" claims |
| **Restored session banner** | Detects unfinished Bulk Coach session on reopen; offers to restore | IndexedDB query on mount | Trust that your work isn't lost |
| **Sample photos for first-time users** | 3 starter images on the landing page | Unsplash URLs (hidden in Vault) | Activation tactic — try without uploading your own |

---

## 3. Technology Stack — Honest Mapping

### What we actually use

| Layer | Technology | Role |
|---|---|---|
| **Primary LLM** | **Gemma 4 E4B** (Q4_K_M, 9.6 GB) | All critique, mentor chat, comparison reasoning |
| **Primary runtime** | **Ollama** v0.22.1+ | Serves Gemma 4 locally via HTTP API on `localhost:11434` |
| **Browser fallback LLM** | **Gemma 2B** (q4f16_1) | Tier 2 zero-install fallback |
| **Browser runtime** | **WebLLM** (`@mlc-ai/web-llm`) — MLC compiler → LiteRT-class on-device runtime | Tier 2 in-browser inference |
| **Frontend framework** | React 18 + TypeScript | UI, state |
| **Build tool** | Vite 5 | Dev server + production build |
| **Desktop wrapper** | Electron 33 | Mac/Win/Linux native app |
| **Schema validation** | Zod | Runtime validation of Gemma outputs |
| **CV pipeline** | Custom (EXIF.js + Canvas) | EXIF, histogram, sharpness, color stats |
| **Audit log crypto** | `hash-wasm` SHA-256 | Hash-chained log entries |
| **Storage** | IndexedDB | Sessions, audit log, batch state |
| **Voice I/O** | Browser Web Speech API | STT + TTS (NOT Gemma — important distinction) |
| **Optional cloud** | Gemini 2.0 Flash + Gemini 3 Pro Image | User-key-only enhancement features |

### What we evaluated and explicitly chose NOT to use

| Technology | Status | Reason |
|---|---|---|
| **Cactus** | Evaluated, dropped | React Native SDK + proprietary `.cact` format misalign with React web + Electron stack |
| **llama.cpp (direct)** | Used transitively | Ollama uses llama.cpp internally; we don't call it directly |
| **Unsloth** | Not used | We don't fine-tune Gemma — base model is sufficient |
| **Native Google AI Edge LiteRT** | Not used directly | We use WebLLM (LiteRT-class via MLC) instead — different binary format |
| **Whisper / local TTS** | Considered, dropped | 2 GB extra download for marginal gain over Web Speech API |

### Honest claims for tech depth scoring

**Strong claims (verifiable in code):**
- ✅ "Built entirely on Gemma 4 via Ollama for production critique"
- ✅ "Two Gemma variants — Gemma 4 E4B for full quality, Gemma 2B in-browser for zero-install fallback"
- ✅ "Hash-chained tamper-evident audit log with SHA-256"
- ✅ "Schema-validated JSON output via Zod runtime checks"
- ✅ "Schema-enforced JSON sampling at the token level via Ollama's `format` parameter (not just prompt instruction)"
- ✅ "Deterministic CV grounding feeds measured EXIF + histogram values into Gemma's prompt"
- ✅ "Multi-image prompting for Compare Two Photos workflow"
- ✅ "Streaming token generation for live progress UI"
- ✅ "Refusal-aware schema with `is_refusal` + `refusal_category` for responsible declination"
- ✅ "Long-context conversation: photo + critique + 5 turns of mentor dialogue retained in-context"
- ✅ "Function-calling-style action tokens: Gemma emits `<<show_pin:N>>` / `<<jump_to_tab:X>>` markers in mentor replies; client strips them and renders clickable chips that execute the action"
- ✅ "Native multilingual output: 8 languages exposed via UI selector (EN/ES/PT/HI/FR/DE/JA/ZH), all 140+ Gemma 4 languages available — JSON keys stay English so schema validates, string values are translated"
- ✅ "Configurable reasoning depth: opt-in 'Deep Critique' mode that asks Gemma to walk through chain-of-thought before producing JSON — trades latency for richer rationale"
- ✅ "Explicit Ollama capabilities used: `format` for token-level JSON Schema enforcement, SSE streaming, multimodal `images` array (multi-image for Compare Two), token-usage telemetry, `keep-alive` warm retention, unified Mac/Win/Linux deployment via `localhost:11434`"
- ✅ "Web + Electron desktop + Android share-target + iOS PWA from one codebase"

**Careful claims (need precise wording):**
- ⚠️ "LiteRT-class on-device runtime" — Tier 2 uses WebLLM/MLC, NOT Google AI Edge LiteRT directly
- ⚠️ "Voice-enabled mentor" — voice is browser Web Speech API, NOT Gemma audio. Gemma 3n has audio but isn't shipped here.
- ⚠️ "Network blocked in Vault Mode" — application-level fetch interceptor + OS-level user guidance (Little Snitch). Not a hardware air-gap.

**Claims to AVOID:**
- ❌ "Gemma 4 supports voice/audio" — false, Gemma 4 is text+vision
- ❌ "Physically impossible to phone home" — overstates Vault Mode
- ❌ "Forensic-grade chain of custody" — not what audit log provides
- ❌ "Built with Google AI Edge LiteRT" — not the same as WebLLM/MLC

---

## 4. Hackathon Track Targeting

| Track | Award | Confidence | Why we fit (or don't) |
|---|---|---|---|
| **Main Track** | $50K (1st) / $25K / $15K / $10K | Realistic top-10 | Strong tech, real workflow, two-Gemma narrative, polished demo plan |
| **Ollama Special Tech** | $10K | **High confidence** | Ollama is the production runtime serving every critique, comparison, mentor reply — explicitly the focus |
| **Safety & Trust Impact** | $10K | Stretch but realistic | Vault Mode + audit chain + grounded reasoning + schema validation = "transparency and reliability" textbook fit |
| **LiteRT Special Tech** | $10K | Low — mention only | We use WebLLM (LiteRT-class via MLC compiler), not Google AI Edge LiteRT directly. Don't claim, just mention as architectural depth. |
| **Cactus** | $10K | Skip | React Native architecture mismatch |
| **llama.cpp** | $10K | Skip | We use Ollama (which uses llama.cpp), don't call it directly |
| **Unsloth** | $10K | Skip | We don't fine-tune |
| **Digital Equity Impact** | $10K | Possible | $0/photo local AI = accessible to anyone with a Mac. Overlaps with Safety. |
| **Health & Sciences Impact** | $10K | No | Not a health product |
| **Global Resilience Impact** | $10K | No | Not a disaster/climate product |
| **Future of Education Impact** | $10K | Possible secondary | The mentor chat + skill-adaptive coaching has an education angle |

**Recommended primary targeting: Main Track + Ollama Special Tech (up to $60K combined)**

---

## 5. What's NOT in v2 (Honest Roadmap)

| Item | Status | Why deferred |
|---|---|---|
| Native iOS app with on-device Gemma | Phase 2 | Requires Swift + Core ML/Metal work; out of solo-dev scope for hackathon |
| Native Android app with on-device Gemma | Phase 2 | Same — Kotlin + LiteRT effort |
| Style preset suggestions ("shoot like Salgado") | Future | Nice-to-have, not core |
| Auto-keyword tagging | Future | Useful for pros, but tangential |
| Real-time camera composition coaching | Phase 3 | Requires camera API integration + much larger scope |
| Marketplace of coaching styles | Future | Community feature for after launch |

---

## 6. File-Level Verifiability (For Judges Reviewing the Repo)

| Claim in writeup | File to verify |
|---|---|
| "5-axis scoring schema" | `docs/specs/02-output-schema.md` + `services/validationService.ts` |
| "CV grounding pipeline" | `services/cvService.ts` |
| "Gemma 4 prompt construction" | `services/promptService.ts` + `services/ollamaService.ts` |
| "Tier 2 browser LLM via WebLLM" | `services/browserLLM.ts` + `spikes/browser-llm/` |
| "Compare Two Photos" | `services/ollamaService.ts:comparePhotos` + `components/ComparePanel.tsx` |
| "Vault Mode egress guard" | `services/auditService.ts:installEgressGuard` |
| "Hash-chained audit log" | `services/auditService.ts:logEvent` + `verifyChain` |
| "Privacy Report HTML export" | `components/AuditLogPanel.tsx:handleExport` |
| "XMP export" | `services/xmpService.ts` |
| "Voice I/O via Web Speech API" | `services/voiceService.ts` |
| "Schema validation via Zod" | `services/validationService.ts` |
| "Web Share Target (Android)" | `public/sw.js` + `public/manifest.json:share_target` |
| "Electron desktop build" | `electron/main.ts` + `package.json:electron:build` |

---

## 7. Test Photo Set (For Reproducibility)

8 golden test images in `spike/`:
- `test-landscape.jpg` (well-lit landscape)
- `test-portrait.jpg` (controlled lighting portrait)
- `test-street.jpg` (street photography)
- `test-macro.jpg` (close-up subject)
- `test-wildlife.jpg` (wildlife)
- `test-lowquality.jpg` (intentionally bad photo)
- `test-edgecase.jpg` (edge case)
- `test-transparency.png` (transparent PNG)

These are used for:
- Manual smoke testing
- Comparison harness (Gemma vs Gemini benchmark in `spike/benchmark-gemma-vs-gemini.mjs`)
- Schema validation tests
