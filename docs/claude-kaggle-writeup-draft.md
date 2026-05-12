# LENS — Local Edge-Native Studio for Photography Coaching

**Subtitle:** Photo editors edit photos. LENS makes photographers — locally on your laptop, edge-native via Gemma 4, with real reasoning you can interrogate.

**Track:** Ollama (Special Technology) · Main Track

**Project Links**
- Public repo: https://github.com/prasadt1/photography-coach-gemma4
- Live demo: `[DEMO_URL]`
- Video (YouTube, ≤3 min): `[VIDEO_URL]`

---

## Why I Built This

I learned photography by handing photos to a mentor on Saturday afternoons. He'd tell me *why* one was good and another weak — not just that they were. Most people don't have that mentor. They have software that auto-edits photos to look "better" without explaining the difference. LENS is the mentor — patient, always available, on your laptop, costing nothing. It doesn't edit; it teaches. The name says it: **L**ocal, **E**dge-native, **N**ative app, **S**tudio workflow.

An earlier cloud version won DeepMind's Vibe Code (Dec 2025). **LENS is the cloud-to-edge port** — same idea, rebuilt on Gemma 4 via Ollama with privacy as a first-class differentiator.

---

## The Problem

**Editors edit, they don't teach.** Editor AI does auto-enhance, generative remove, AI masking. Makes the photo look better; doesn't explain why. Auto-fix users learn nothing.

**Cloud uploads break trust.** NDA shoots (weddings with children, unreleased campaigns, editorial work) can't legally use cloud AI. Casual users want photos to stay local.

**Opaque scores, no learning loop.** Most "AI critique" outputs a number with no path to understanding. Photographers need reasoning they can interrogate.

---

## What LENS Does

Upload a photo. Get structured, multi-axis critique powered by Gemma 4 E4B running locally via Ollama: **5-axis scoring** with explicit reasoning, **spatial bounding boxes** pinpointing issues, **transparent rationale** citing EXIF/histogram/focus evidence, and a **mentor chat** (with voice input + spoken critique playback) that adapts to your skill level. **Compare Two Photos** picks the keeper from near-duplicates with reasoning. Two operational modes:

---

**DIAGRAM 1 — LENS Hero:**

```
Cinematic product hero image, like an Apple keynote opening slide or the
hero section of stripe.com. 16:9 aspect ratio. Premium, confident, photographic.

SCENE: A 3/4-angle photorealistic MacBook Pro sits in dramatic moody lighting
on a dark surface. The laptop screen is the focal point and shows the actual
LENS app interface in dark mode: a photo critique screen with numbered amber
pins overlaid on a portrait photograph, a five-axis score panel on the right
showing "Composition 8.4 / Lighting 7.1 / Technique 8.0", and the header
text "LENS · Local · Private" with a small green status dot.

FLOATING IN FRONT of the laptop, levitating with subtle depth-of-field blur
behind them, are three glassmorphism cards arranged in an arc:
- Left card (frosted dark glass, electric-blue glow): "GEMMA 4 · LOCAL"
  with a tiny chip "Ollama · localhost"
- Center card (frosted dark glass, AMBER glow, slightly larger and more
  prominent): "VAULT MODE" with subtitle "Network blocked · Audit log on"
  and a thin amber padlock outline beside the text
- Right card (frosted dark glass, emerald glow): "$0 / PHOTO" with subtitle
  "Works offline forever"

BACKGROUND: Atmospheric, slightly out-of-focus dark scene suggesting a
photographer's studio — hint of a camera lens bokeh in the upper-right
corner (real lens, not illustrated). Subtle volumetric light from screen-left.

WORDMARK in the bottom-left of the frame: "LENS — Local Edge-Native Studio"
in clean Inter sans-serif, white. Below that, smaller slate text:
"Photo editors edit photos. LENS makes photographers."

Style references: Apple Vision Pro reveal, Linear.app product hero, Arc
browser landing page. Premium, dark, confident. Real photography lens visible
as a subtle background prop reinforces the "LENS" brand. Vault Mode card is
the visual anchor — make it glow more amber than the others.

Avoid: clip-art icons, flat infographic look, plain colored boxes, generic
abstract shapes. This is a HERO PRODUCT IMAGE, not a diagram.
```

**[INSERT DIAGRAM 1 IMAGE HERE]**

---

**Studio Mode** prioritizes throughput — batch up to 50 photos, XMP sidecar export for Lightroom, optional cloud generation for enhancement previews.

**Vault Mode** prioritizes trust — local inference, network egress blocked at app + OS level, hash-chained audit trail exportable as a Privacy Report for clients.

---

## Who It's For

**Hobbyist Hana** — drops a photo, asks "why is the horizon weak?", learns. Free, no account.

**Intermediate Ivan** — runs Bulk Coach, sorts by score, exports XMP ratings to his editor. Builds intuition over months.

**Pro Priya** — wedding/commercial. Bulk + XMP for cull. Vault Mode + Privacy Report for NDA shoots, handed to clients as compliance evidence.

---

## Why Not Just Use Editor AI?

| | Editor AI (subscription) | LENS |
|---|---|---|
| Edits the photo | ✅ | ❌ (by design) |
| Explains *why* it works | ❌ | ✅ |
| Mentor chat with memory | ❌ | ✅ |
| Cited reasoning (EXIF + CV) | ❌ | ✅ |
| Runs fully offline | Partial | ✅ |
| Cost | $9–20/mo | $0 |
| Cloud-free for sensitive work | ❌ | ✅ |

Editors edit. We coach. They compose — XMP exports to any major editor.

---

## Beyond the Hobbyist

Same architecture serves underserved users. **Photography students** without subscriptions get the same AI feedback rich-school students do — in their own language (8 supported, 140+ via Gemma). **Low-vision photographers** use voice mode that describes the scene first ("I see a ceramic bowl on a wooden table..."), then provides spatial guidance via clock-face directions—enabling independent framing. **Journalists, NGO field workers, human-rights documentarians** use Vault Mode + EXIF strip to prove sensitive imagery never left the device.

**Accessibility Roadmap (Phase 2):** Haptic feedback vibration when composition is perfect, dedicated scene description mode for full environmental context, and voice-first product photography workflow—opening visual marketplaces to blind artisans selling handmade goods on Etsy and Shopify.

---

## Architecture

**DIAGRAM 2 — System Architecture:**

```
Isometric 3D architecture visualization with depth and atmosphere — the kind
of system diagram you'd see on aws.amazon.com/architecture or in a Vercel
infrastructure blog post. Dark navy background (#0f172a) with subtle radial
glow from center. 16:9 aspect ratio. Premium, confident, dimensional.

LAYOUT: Four floating horizontal layers stacked at a slight isometric angle
(about 15 degrees), like translucent glass slabs hovering above each other,
connected by glowing electric-blue light beams flowing top-to-bottom. Each
slab has frosted-glass material treatment with thin 1px borders that catch
the light.

LAYER 1 (top, smallest depth) — "INTERFACE" label in slate-300 small caps:
Three glassmorphism panels side by side, each showing a tiny rendered UI
mockup inside:
- Web browser window (Safari-style chrome) showing "LENS" header
- macOS Electron app icon shape
- Phone outline with "Share → LENS" overlay
Each has a subtle electric-blue underglow.

LAYER 2 — "ORCHESTRATION" label:
One wide frosted slab with three glowing chips inside:
"Studio | Vault" toggle, "Tier 1 | Tier 2" router, "EN/ES/PT/HI/FR/DE/JA/ZH"
language pills. The chips look like illuminated buttons, not flat text.

LAYER 3 (largest, most prominent, glowing brightest) — "AI ENGINES":
This layer is taller and lit more dramatically than the others. Three
columns inside, varying widths:
- LEFT column (emerald glow, 25% width): "DETERMINISTIC CV" — small chips
  for EXIF, Histogram, Sharpness, Color, Faces. A glowing emerald arrow
  shoots horizontally to the right labeled "grounding evidence".
- CENTER column (50% width, dramatic ELECTRIC BLUE glow, raised slightly
  higher than its neighbors like a hero card): The Gemma logo or a glowing
  "G4" mark, with bold text "GEMMA 4 E4B" and subtitle "via Ollama". Below,
  a 2x3 grid of glowing chips: "Vision", "Schema JSON", "Multi-image",
  "Grounded reasoning", "Streaming", "Action tokens".
- RIGHT column (cyan glow, 25% width, slightly translucent/faded to suggest
  fallback): "TIER 2 · BROWSER" — chips for Gemma 2B, WebLLM, WebGPU. Has
  a small "?tier2" tag suggesting opt-in.

LAYER 4 (bottom) — "OUTPUT" label:
One wide slab with five glowing output chips: "5-axis JSON", "Spatial Pins",
"XMP → Lightroom", "Privacy Report", "GPS-stripped Photo".

ATMOSPHERIC DETAILS: Subtle particles drift between the layers. Faint grid
lines on the dark background suggest a digital landscape. A small "LENS"
wordmark sits in the top-left corner, glowing faintly. Bottom-right shows
"Gemma 4 + Ollama" in slate-500 small caps.

Style references: AWS architecture diagrams reimagined by Apple, Stripe
infrastructure marketing graphics, Vercel edge-network visualizations.

Avoid: flat 2D box-and-arrow look, clip-art icons, generic infographic
appearance. This must feel three-dimensional and atmospheric.
```

**[INSERT DIAGRAM 2 IMAGE HERE]**

---

Three layers:

**Deterministic CV** extracts EXIF, RGB histograms, Laplacian sharpness, face coordinates, color stats — fed as grounding context to the LLM prompt so critique cites observable evidence, not hallucinations.

**Gemma 4 E4B via Ollama** does all reasoning: scoring, spatial annotation, rationale, mentor chat. Outputs conform to a versioned JSON schema validated at runtime via Zod.

**Tier 2 — Gemma 2B in-browser via WebLLM** is an opt-in fallback (`?tier2`) for users without Ollama. WebGPU, CV-only critique.

**Optional cloud (Gemini)** for editing recipes + AI previews — opt-in, user's key, disabled in Vault.

---

## How I Use Gemma 4

**DIAGRAM 3 — Gemma 4 Pipeline:**

```
A cinematic horizontal data-flow visualization showing a single photograph
transforming into rich AI critique. Dark navy background (#0f172a) with
moody atmospheric lighting and subtle volumetric light from the left.
16:9 aspect ratio. Style: a marketing graphic for OpenAI's vision API or
the kind of "how it works" hero on character.ai's homepage.

LEFT THIRD — THE PHOTO:
A real photorealistic landscape photograph (golden hour mountain scene with
a person silhouetted in foreground) is shown as a beautifully framed image
with a thin white border, slightly tilted at 5 degrees. Underneath the
photo, a small floating chip in slate-300 reads "JPEG · 24mm · f/8 · 1/250s".
A glowing emerald light beam emerges from the photo and arcs into...

CENTER-LEFT — DETERMINISTIC CV:
A compact glassmorphism panel with emerald-green accents shows the photo
broken into deterministic measurements: a tiny histogram graph, a sharpness
focus map heatmap, a face-detection bounding box, and EXIF text. The panel
emits a glowing "grounding evidence" beam (emerald, with the words floating
along it in slate-300 italic) that arcs into the giant center.

CENTER (40% of width, the visual hero, dramatically lit) — GEMMA 4:
A large hovering hexagonal node with bright electric-blue inner glow and a
soft outer halo. The "G" logo or "GEMMA 4 E4B" wordmark sits in the center
in bold white. Around the hexagon edges, six small floating chips orbit it
like satellites, each with a thin connecting line: "Vision" "Schema JSON"
"Multi-image" "Grounded reasoning" "Streaming + refusal" "Action tokens".
A subtle "via Ollama · Q4_K_M" caption drifts beneath. The entire node
casts a soft electric-blue ambient glow on the surrounding scene.

CENTER-RIGHT — ZOD VALIDATION:
A small frosted-glass diamond with violet accent showing a green checkmark
and the text "v2 schema · 100% pass". The output beam continues right.

RIGHT THIRD — THE OUTPUTS:
A cluster of four small UI mockup cards shown at slight 3D angles like
playing cards being dealt, each rendering a real-looking screenshot:
- A scored photo with amber numbered pins overlaid
- A mentor chat bubble interface with an avatar
- An XMP file icon with "→ Lightroom" arrow showing star ratings
- An HTML "Privacy Report" certificate document

ATMOSPHERIC DETAILS: Faint particles flow between stages along the light
beams. The center Gemma node is the brightest element by far — everything
else is moodier, lit by reflected glow from the model.

WORDMARK: "LENS" in clean white serif top-left. "From pixels to coaching
in 22 seconds · all on your Mac" caption bottom-center in slate-300 italic.

Style references: anthropic.com Claude marketing visuals, vercel.com edge
function diagrams, the Apple keynote slides showing data flowing through
Apple Intelligence. Cinematic, premium, atmospheric.

Avoid: flat box-and-arrow look, clip-art, plain colored rectangles,
sterile infographic style. Treat this like a movie poster for Gemma 4.
```

**[INSERT DIAGRAM 3 IMAGE HERE]**

---

Six Gemma 4 capabilities do the heavy work:

**Native multimodal vision** — image and text in a single inference call.

**Schema-enforced JSON sampling** — Ollama's `format` parameter constrains generation at the token level. v2 schema (scores, boxes, observations, evidence, rationale) enforced in one call.

**Multi-image prompting** — Compare Two sends both photos in one message; model picks the keeper with reasoning.

**Glass Box reasoning** — every critique exposes Observations, Reasoning Steps, and Priority Fixes (same schema that won v1's Education track). CV signals (EXIF, histogram, sharpness) feed the prompt; "underexposed by 0.7 EV" cites a measured value.

**Streaming + refusal awareness** — live token stream; `is_refusal` field lets the model decline ambiguous content with a typed reason.

**Function-calling-style action tokens** — mentor emits `<<show_pin:N>>` / `<<jump_to_tab:X>>`; client renders clickable chips.

Three more ride the same architecture: **mentor chat** with 5-turn context + voice I/O; **multilingual output** in 8 UI languages (140+ via Gemma); a **"Deep Critique" toggle** for stepwise rationale.

---

## Technology Decisions and What I Evaluated

**DIAGRAM 4 — Runtime Evaluation Matrix:**

```
A premium engineering decision log — visually rich, not a flat table. Style
references: Linear's release notes pages, Vercel's product comparison pages,
Stripe's pricing comparison cards. Dark navy background (#0f172a) with
moody atmospheric lighting. 16:9 aspect ratio. Confident, calm, judge-credible.

LAYOUT: Four 3D floating cards stacked at a slight isometric angle (10°
tilt), arranged from top to bottom with a slight overlap. Each card has
frosted glass material treatment with a unique colored glow that hints at
its status. The cards visually descend in opacity so the chosen tech
(Ollama, top) is the brightest and the dropped one (Cactus, bottom) is
faded and slightly desaturated.

TITLE above the cards in slate-200 with subtle glow:
"Runtime Evaluation — What We Picked and Why"
Subtitle in slate-400 italic: "Hackathon-honest. No claims we can't back."

CARD 1 (TOP, brightest, EMERALD glow, large bold green checkmark badge
floating off the left edge):
Tech: "OLLAMA" in giant bold white text
Tag: emerald chip "PRIMARY RUNTIME · SHIPPING"
Body text in slate-300:
"Production runtime serving Gemma 4 for every critique. Uses: format
JSON enforcement at token level, SSE streaming, multimodal images array
(multi-image for Compare Two), eval_count telemetry, keep-alive warm
retention, unified Mac/Win/Linux deployment via localhost:11434."

CARD 2 (CYAN glow, BLUE info badge):
Tech: "llama.cpp" in bold white
Tag: cyan chip "BENCHMARK"
Body: "Quantization study (Q4_K_M / Q5_K_M / Q8_0) on Apple Silicon.
Informed our Q4_K_M production choice. Study in repo."

CARD 3 (CYAN glow, info badge):
Tech: "LiteRT-class via WebLLM/MLC" in bold white
Tag: cyan chip "OPT-IN TIER 2"
Body: "In-browser Gemma 2B fallback for users without Ollama. Working
under WebGPU. Gated behind ?tier2 flag — hardware-dependent."

CARD 4 (BOTTOM, faded/desaturated, ROSE-RED strikethrough badge):
Tech: "Cactus" in slightly muted gray
Tag: rose chip "EVALUATED & DROPPED"
Body: "React Native + proprietary .cact format misalign with our
React-web + Electron stack. Documented the decision rather than
forcing the fit. Honesty > forcing a wrong-stack integration."

BOTTOM BANNER (full width, subtle electric-blue gradient, premium feel):
"Targeting: Main Track + Ollama Special Tech. Stretch: Safety & Trust."

ATMOSPHERIC DETAILS: Faint particles or grid lines in background. Subtle
volumetric light pouring in from upper-left. The cards should feel like
they're hovering with depth, not pasted flat.

Style references: Linear changelog cards, Vercel pricing tier comparison,
Apple keynote feature comparison slides. Premium, confident, atmospheric.

Avoid: flat 2D table appearance, clip-art icons, generic infographic look,
plain rectangles in a row.
```

**[INSERT DIAGRAM 4 IMAGE HERE]**

---

**Ollama** — primary runtime. Specific capabilities used: `format` schema-enforced JSON at token level, SSE streaming, multimodal `images` array (multi-image for Compare Two), token-usage telemetry, `keep-alive` warm retention, unified Mac/Win/Linux via `localhost:11434`. `ollama pull gemma4` gives users the same Q4_K_M weights.

**llama.cpp** — quantization benchmarks (Q4/Q5/Q8) on Apple Silicon. Measures; doesn't serve.

**LiteRT** — Three-way spike (MediaPipe, WebLLM/MLC, Transformers.js) picked WebLLM (LiteRT-class via MLC). Shipped as **Tier 2** in-browser fallback. Memory contention with Ollama on smaller Macs gated it behind `?tier2`. Tier 1 (Ollama) is production; Tier 2 is two-Gemma-variant proof.

**Cactus** — evaluated, dropped. React Native + proprietary `.cact` format misalign with our stack.

**Track targeting (honest):** Primary fit is **Main + Ollama Special Tech** — Ollama serves Gemma 4 for every critique. LiteRT-class via Tier 2 (WebLLM/MLC). Cactus + Unsloth not architectural fits.

---

## Vault Mode — Honest Trust Claims

**DIAGRAM 5 — Vault Mode Trust Stack:**

```
A dramatic, cinematic visualization centered on the metaphor of a literal
vault. Dark navy background (#0f172a) with rich AMBER accent lighting
(#f59e0b). 16:9 aspect ratio. Style references: 1Password marketing
visuals, Apple's privacy.apple.com hero pages, Stripe security page.

CENTER LEFT (50% of width) — THE VAULT METAPHOR:
A photorealistic 3D rendering of a heavy modern vault door, dark brushed
metal with amber LED status lights along the edges, partially open at a
dramatic 3/4 angle. Through the doorway you can faintly see a softly-lit
interior with hovering geometric shapes representing photos (small tilted
photo frames floating). The vault door has a subtle "LENS" wordmark
etched on it. Amber glow spills out of the vault into the surrounding
darkness, casting long dramatic shadows.

A small glowing chip floats in the foreground center labeled
"VAULT MODE · ACTIVE" in amber, with a small green dot.

CENTER RIGHT (50% of width) — THE TRUST STACK:
Five floating horizontal cards arranged vertically with subtle isometric
tilt, each with frosted-glass material and amber edge glow. They appear
to hover IN FRONT of the vault, suggesting the layers of trust the vault
provides. Top to bottom:

LAYER 1: "🔒 NETWORK EGRESS BLOCK"
  · "fetch() interceptor — only localhost:11434 allowed"

LAYER 2: "🛡️ OS-LEVEL GUIDANCE"
  · "Pairs with Little Snitch / firewall / airplane mode"

LAYER 3: "⛓️ HASH-CHAINED AUDIT LOG"
  · "SHA-256 chain · tampering breaks the seal"

LAYER 4: "📸 PER-PHOTO AUTHENTICITY HASH"
  · "shasum -a 256 verifies the exact photo content"

LAYER 5 (bottom, slightly emphasized with brighter glow):
  "🌍 EXIF SANITIZATION · GPS STRIP"
  · "One-click privacy for journalists, NGO field workers"

Note: the emoji icons inside the cards should look like clean modern
glyphs, not emoji-style. Render as embossed or etched marks.

ABOVE THE STACK, a small slate-300 italic caption:
"What Vault Mode does NOT claim:"
Below in dim slate-500 with strikethrough lines:
"× Forensic chain of custody  × OS-compromise resistance  × Hardware air-gap"

BOTTOM BANNER (full width, deep amber gradient):
"Built for photographers under NDA. Output: a Privacy Report your client
can verify. Honest threat model in the repo."

ATMOSPHERIC DETAILS: Volumetric amber light beams emanating from the vault.
A few dust particles drifting in the light. A faint photographer silhouette
visible far in the background, suggesting the user this is built for.

Style: dramatic, cinematic, premium. Like a movie poster for a privacy
product. NOT a clip-art shield with arrows. NOT a flat infographic.
The vault metaphor should be the visual anchor — believable, beautiful,
slightly mysterious. Think Mission Impossible meets minimalist product design.
```

**[INSERT DIAGRAM 5 IMAGE HERE]**

---

No overclaiming. Vault Mode: app-level network blocking, OS-level verification guidance, hash-chained audit log exportable as a Privacy Report (with per-photo SHA-256 authenticity hashes for client verification), and a one-click **EXIF strip** that removes GPS coords before sharing — for journalists and NGO documentarians. Not forensic-grade — full threat model in the repo.

---

## Cloud-to-Edge: A Measured Port

**DIAGRAM 6 — Cloud → Edge Transformation:**

```
A cinematic transformation visualization — the visual story of a product
moving from the cloud onto the photographer's own laptop. 16:9 aspect ratio.
Dark navy background (#0f172a) with dramatic side-lighting. Style:
Apple keynote "before/after" comparison slide meets a movie before/after
poster.

LAYOUT: Split frame, but not equal halves. Left third is the "cloud past",
right two-thirds is the "edge present" with a bold transformation moment
in the middle.

LEFT THIRD (35% width) — "v1 · CLOUD" (subtitle "Photography Coach · Dec 2025"):
Atmosphere: cooler, slightly muted, distant. A photorealistic illustration
of the Earth from low orbit at night, with bright glowing data center
clusters and a dotted line tracing a photo's data path from a small laptop
icon up to a cloud. Subtle teal-blue glow. Feels distant, expensive, opaque.

A small frosted card overlays the lower-left of this section showing:
"💸 ~$0.002/photo · ☁️ Internet required · 🌫️ Opaque thinking · ⚪ No audit"

Below the cloud, a small gold trophy icon with the text:
"🏆 DeepMind Vibe Code Winner"

CENTER STRIP (6% width, the transformation moment):
A dramatic vertical light-beam barrier transitioning from cool teal on the
left to warm electric-blue on the right. Inside the beam, a small badge
floating with bold uppercase text "PORT TO EDGE" and below in slate-300
small italic: "Same idea. Rebuilt local."

RIGHT TWO-THIRDS (59% width) — "v2 · EDGE" (subtitle "LENS · May 2026"):
Atmosphere: warm, intimate, close. A photorealistic 3D rendering of a
MacBook on a wooden desk in a photographer's studio, screen showing the
LENS app with a critique in progress. Soft warm window light from one side.
A subtle electric-blue glow emanates from the laptop suggesting the local
AI is alive inside it. A camera and a coffee mug sit nearby — the
photographer's actual workspace.

Floating around the laptop are 5–7 small glassmorphism chips, each with a
green checkmark, arranged like leaves catching the warm light:
  ✓ "Local Gemma 4 E4B via Ollama"
  ✓ "$0/photo · works offline"
  ✓ "Cited evidence (CV grounding)"
  ✓ "Hash-chained audit + Privacy Report"
  ✓ "Voice mentor · 8 languages"
  ✓ "Compare Two · Multi-image"
  ✓ "Two-Gemma-variant architecture"

Below the laptop, a confident solid electric-blue badge:
"Gemma 4 Good · Targeting Main + Ollama tracks"

BOTTOM BANNER (full width, deep slate background with subtle blue gradient):
"Same product idea. Rebuilt local. Proven private. Honest about what we
cut, what we kept, and what we added."

ATMOSPHERIC DETAILS: The right side feels significantly warmer, brighter,
and closer than the left. The composition draws the viewer's eye left-to-right,
ending on the warm laptop scene. Use depth of field to emphasize the
transition.

Style references: Apple's Mac Studio launch graphics, the Linear "v1 → v2"
release announcement style, Stripe's annual update visuals. Cinematic,
confident, story-driven.

Avoid: flat side-by-side rectangles, identical column treatment, clip-art,
generic infographic boxes.
```

**[INSERT DIAGRAM 6 IMAGE HERE]**

---

v1 (Photography Coach) won DeepMind's Vibe Code Education track in Dec 2025 — same Glass Box schema, but cloud-bound. LENS keeps the schema intact (continuity for any returning judge), replaces cloud Gemini with local Gemma 4 E4B, and adds CV grounding, Vault, batch, mentor chat, voice, multilingual, Compare Two. I've used LENS on my own weekend shoots — it surfaces composition flaws I'd missed for years. A [comparison harness](https://github.com/prasadt1/photography-coach-gemma4/tree/main/spike) runs both versions on the same golden set.

---

## Challenges and Honest Tradeoffs

**Schema parity.** Gemma 4 lacks Gemini's `responseSchema`. Conformance via prompt engineering + runtime Zod validation.

**Quality gap.** A 4B edge model won't match frontier cloud on nuanced judgment. The comparison harness quantifies per-axis deviation rather than hiding it.

**Batch memory.** Web caps batches at 50, sequential to prevent Ollama overload. Desktop batch mode (planned) supports larger sets with checkpoint/resume.

**Mobile inference gap.** True offline on-device Gemma 4 is Phase 2.

---

## How to Run

**Prerequisites:** macOS, Windows, or Linux with 16GB+ RAM

```bash
# 1. Install Ollama (if not already installed)
curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull Gemma 4 E4B model (9.6GB, one-time download)
ollama pull gemma-4-e4b

# 3. Start Ollama server
ollama serve

# 4. Clone and setup Photography Coach
git clone https://github.com/prasadt1/photography-coach-gemma4
cd photography-coach-gemma4
npm install

# 5. Run web app (localhost:5173)
npm run dev

# 6. Build desktop app (optional)
npm run electron:build
```

**First analysis:** ~30-40s (warm-up included). Subsequent ~20-25s.
**Batch mode:** Up to 50 photos → sequential → export all XMP as ZIP.
**Android:** Install PWA → any photo app → Share → Photography Coach.
**iOS companion:** [Tailscale](https://tailscale.com) on Mac + iPhone → `npm run dev -- --host` → open `http://YOUR_TAILSCALE_HOSTNAME:5173` in Safari → Add to Home Screen. Works from any network.

---

## Reproducibility

Every claim is verifiable from the public repo: schema spec (`docs/specs/02-output-schema.md`), CV grounding (`services/cvService.ts`), Vault enforcement (`electron/vault-policy.ts`), XMP export (`services/xmpService.ts` + 76 passing tests), spike results (`spike/spike-1-results.md`), and 8 golden test photos in `spike/`. Clone, run, inspect.

---

## Mobile Strategy — Honest Scope, Clear Roadmap

Most amateur photographers shoot on phone. Two phases:

**Today — Companion PWA:** Installable on iOS and Android. Android Web Share Target gives a native share-sheet experience. iOS PWA + Tailscale makes the app reachable anywhere the Mac is online.

**Phase 2 — Native:** iOS via Core ML + Metal running quantized Gemma on-device. Android follows on Pixel 8+ / Galaxy S24+. Current build proves the interaction model honestly, without overpromising offline.

---



Every photographer deserves a mentor. LENS puts one on every laptop — free, private, honest. Built on Gemma 4 via Ollama. The mentor I wished I'd had, now yours.

---

---

## Before Final Submission

**ACTION ITEMS:**

1. **Deploy live demo** to GitHub Pages, Vercel, or Netlify → update `[DEMO_URL]` on line 9
2. **Record 3-minute demo video** showing:
   - Single photo analysis (web)
   - Batch mode with XMP export
   - Vault Mode desktop app
   - iOS PWA on iPhone
   Upload to YouTube → update `[VIDEO_URL]` on line 10
3. **Generate diagrams** using the 6 diagram prompts in this document:
   - Use Gemini Image Generator, DALL-E, or Excalidraw
   - Insert PNGs at `[INSERT DIAGRAM X IMAGE HERE]` markers
   - Remove diagram prompt blocks after insertion
4. **Spell-check and final proofread** (all technical claims verified as of May 7, 2026)

_Word count (prose only, excluding diagram prompts and this TODO block): ~1,443 (under 1,500 limit with 57-word safety margin)_
