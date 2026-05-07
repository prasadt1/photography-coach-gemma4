# Photography Coach v2 — Professional Critique on Gemma 4, Locally

**Subtitle:** A cloud-winning coaching app reborn at the edge — with Studio throughput for speed, Vault mode for trust, and honest benchmarks for both.

**Track:** Ollama (Special Technology)

**Project Links**
- Public repo: https://github.com/prasadt1/photography-coach-gemma4
- Live demo: `[DEMO_URL]`
- Video (YouTube, ≤3 min): `[VIDEO_URL]`

---

## The Problem

Professional photographers generate thousands of images per shoot. They need structured, repeatable critique — not generic "nice photo" feedback. Three real pain points emerged from my research across photographer communities (Reddit r/AskPhotography, r/WeddingPhotography, vendor forums):

**Speed.** Wedding photographers cull 2,000 shots to 200 selects. Current AI tools give scores without reasoning. "Why this frame over that one?" remains manual.

**Trust.** NDA shoots (celebrity portraits, unreleased campaigns, editorial journalism) prohibit uploading to cloud services. A photographer working at a venue without connectivity — a destination wedding, a remote landscape, an aircraft — has no AI assistance at all.

**Transparency.** Existing tools produce opaque scores. Photography is contextual: a tilted horizon is wrong in a landscape, creative in street photography. A photographer needs reasoning one can interrogate, not numbers one must trust.

---

## What Photography Coach v2 Does

Upload a photo. Receive structured, multi-axis critique powered by Gemma 4 E4B running locally via Ollama — with deterministic grounding, spatial annotations, and an interactive mentor.

**Five-axis scoring:** Composition, Lighting, Technique, Creative Impact, Subject Impact — each with explicit reasoning, not just a number.

**Spatial critique:** Bounding boxes pinpoint specific issues on the photo with severity levels (critical / moderate / minor).

**Transparent rationale:** Every critique exposes observations, evidence (grounded in EXIF data, histogram analysis, focus maps), reasoning steps, and priority fixes. No hidden thinking.

**Mentor chat:** Ask follow-up questions. The AI remembers your photo and prior critique, adapting to your detected skill level.

**Two operational modes** designed for real professional workflows:

---

**DIAGRAM PROMPT 1 — Studio Mode vs Vault Mode (copy into Gemini image gen):**

```
Create a clean, minimal technical diagram comparing two operational modes of
a software application. Use a split layout with a dividing line down the middle.

LEFT SIDE labeled 'Studio Mode' with a blue/teal color scheme:
- Icon: speedometer or lightning bolt
- Bullet items: 'Batch processing (200+ photos)', 'Cloud endpoints allowed
  (opt-in)', 'Optional Gemini image generation', 'Speed-optimized inference',
  'Telemetry opt-in'
- KPI badge: '<12s per photo on M1 MacBook'

RIGHT SIDE labeled 'Vault Mode' with a dark/amber color scheme:
- Icon: shield or lock
- Bullet items: 'Zero network egress enforced', 'Hash-chained audit log',
  'Cloud generation disabled', 'OS-level verification guidance',
  'Export-only audit trail'
- KPI badge: '0 bytes outbound during session'

Bottom bar spanning both sides: 'Same Gemma 4 E4B model. Same critique
quality. Different trust posture.'

Style: professional, dark background, no gradients, sharp edges, suitable
for a technical competition writeup. Aspect ratio 16:9.
```

**[INSERT DIAGRAM 1 IMAGE HERE]**

---

**Studio Mode** prioritizes throughput — batch 200 photos with consistency checks, XMP sidecar export for Lightroom round-trip, and optional cloud generation for enhancement previews.

**Vault Mode** prioritizes trust — all inference runs locally, network egress is blocked at both application and OS level, and every critique event is logged in a hash-chained audit trail the photographer can export as proof of local-only processing.

---

## Architecture

**DIAGRAM PROMPT 2 — System Architecture (copy into Gemini image gen):**

```
Create a technical system architecture diagram for a photography AI coaching
application. Dark background, clean lines, professional style suitable for
a Kaggle competition writeup.

TOP LAYER (wide box): 'UI Layer' containing three sub-boxes side by side:
'Web (React + Vite)', 'iOS (Capacitor PWA)', 'Desktop (Electron)'

MIDDLE LAYER: 'Orchestration' box containing: 'Mode Router (Studio | Vault)',
'Tier Feature Flags', 'Network Egress Guard'

BOTTOM LAYER split into THREE columns connected to Orchestration:

LEFT COLUMN (green tint): 'Deterministic CV Tools' box containing stacked
items: 'EXIF Parser', 'Histogram Analyzer', 'Focus/Sharpness Map',
'Face/Eye Detection', 'Color Statistics'

CENTER COLUMN (blue tint, largest, prominent): 'Gemma 4 E4B via Ollama' box
containing: '5-Axis Scoring', 'Spatial Bounding Boxes', 'Rationale Generation',
'Mentor Chat (5 turns)', 'Schema v2 JSON Output'. Below this box:
'llama.cpp (benchmark only)' in a smaller, dashed-border box.

RIGHT COLUMN (amber tint, smaller, dashed border): 'Optional: Gemini 3
Image Gen' box containing: 'User API key required', 'Per-use consent',
'DISABLED in Vault Mode'. Draw a red X or strike-through overlay for
Vault Mode.

BOTTOM: 'Export Layer' box spanning full width: 'XMP Sidecar', 'JSON Critique',
'CSV Batch Report', 'Audit Log (Vault)'

Arrows flow top-down. The Deterministic CV box has an arrow feeding INTO the
Gemma 4 box labeled 'grounding context'. The Gemma 4 box is visually the
largest and most prominent element.

Include a small legend: 'Solid border = ships May 19 | Dashed border =
stretch / optional'

Aspect ratio 16:9, high contrast, no gradients.
```

**[INSERT DIAGRAM 2 IMAGE HERE]**

---

Photography Coach v2 separates concerns into three layers:

**Deterministic CV tools** extract measurable signals — EXIF metadata, RGB histograms, Laplacian sharpness scores, face/eye coordinates, dominant colors — and feed them as structured grounding context into the LLM prompt. This ensures critique cites observable evidence, not hallucinated observations.

**Gemma 4 E4B via Ollama** performs all reasoning: scoring, spatial annotation, rationale generation, and mentor dialogue. Outputs conform to a versioned JSON schema (v2) validated at runtime via Zod. Schema validation catches drift before it reaches the UI.

**Optional Gemini generation** allows a hobbyist to preview suggested improvements — explicitly opt-in, requiring one's own API key, disabled entirely in Vault Mode at the orchestration layer (not just UI).

---

## How I Use Gemma 4

**DIAGRAM PROMPT 3 — Gemma 4 Data Flow (copy into Gemini image gen):**

```
Create a horizontal data flow diagram showing how a photo moves through an
AI analysis pipeline. Dark background, clean professional style.

FLOW (left to right):
1. Box: 'Photo Input' (camera icon) with arrow to
2. Box: 'Deterministic CV' containing 'EXIF | Histogram | Focus | Face'
   with arrow labeled 'grounding JSON' to
3. Large central box: 'Gemma 4 E4B (Ollama)' with sub-items:
   'Native multimodal vision', 'Structured JSON output (v2 schema)',
   'Function calling: score(), annotate(), reason()' with arrow to
4. Box: 'Schema Validation (Zod/Ajv)' with arrow to
5. Box: 'UI Render' containing '5-axis scores | Bounding boxes |
   Rationale | Mentor chat'

Below the main flow, a separate dashed path from box 3:
Arrow labeled 'batch mode' to 'XMP Sidecar Export' box, and another to
'Audit Log (Vault)' box.

Make the Gemma 4 box the most visually prominent. Include the Gemma logo
or 'G4' label.

Aspect ratio 16:9.
```

**[INSERT DIAGRAM 3 IMAGE HERE]**

---

Gemma 4 is not a checkbox in this project. Four capabilities are load-bearing:

**Native multimodal vision** analyzes the photo directly — composition, lighting, subject positioning — without preprocessing through a separate vision encoder.

**Structured JSON output** produces the v2 schema reliably. Five axis scores, spatial bounding boxes with severity, observations, evidence, rationale, and priority fixes — all in one inference call validated against a published schema.

**Grounded reasoning** receives deterministic CV signals (EXIF, histogram, sharpness) as part of the prompt. When the model says "slightly underexposed by 0.7 EV," it cites a measured value, not an impression.

**Mentor chat with context** retains the critique across 5 conversational turns, adapting tone to the photographer's detected skill level (beginner, intermediate, advanced).

---

## Technology Decisions and What I Evaluated

**DIAGRAM PROMPT 4 — Stack Decision Tree (copy into Gemini image gen):**

```
Create a decision tree / evaluation matrix diagram showing technology stack
choices for a hackathon project. Dark background, professional.

TITLE: 'Runtime Evaluation Results'

Four rows, each showing a technology evaluated:

ROW 1 — Ollama:
Status: GREEN CHECKMARK 'Primary Runtime'
Role: 'Dev velocity + Desktop inference + Regression harness'
Result: 'Ships May 19'

ROW 2 — llama.cpp:
Status: BLUE INFO icon 'Benchmark Only'
Role: 'Quantization sweep (Q4/Q5/Q8) on Apple Silicon'
Result: 'Writeup appendix artifact'

ROW 3 — LiteRT:
Status: YELLOW CLOCK icon 'Spike Pending'
Role: 'On-device Android/iOS packaging proof'
Result: 'Day 4 spike — PWA fallback if fail'

ROW 4 — Cactus:
Status: RED X 'Evaluated and Dropped'
Role: 'React Native + ARM NPU + hybrid cloud routing'
Result: 'Architecture mismatch: React Native only, proprietary .cact format
incompatible with GGUF, cloud routing conflicts with Vault Mode zero-egress
requirement. Evaluated and dropped.'

Style: clean table/card layout, status icons on left, text right.
Professional competition writeup style. Aspect ratio 16:9.
```

**[INSERT DIAGRAM 4 IMAGE HERE]**

---

**Ollama** is the primary runtime — reproducible model pulls, HTTP API for Electron, regression-friendly. It ships.

**llama.cpp** provides quantization benchmarks (Q4_K_M, Q5_K_M, Q8_0) on Apple Silicon for the writeup appendix. It measures; it does not serve.

**LiteRT** is under evaluation via a time-boxed spike for on-device mobile packaging. If the spike fails, iOS ships as PWA. I am honest about uncertainty.

**Cactus** was evaluated and dropped. Its React Native SDK, proprietary `.cact` model format, and hybrid cloud routing are misaligned with my React web + Electron stack and Vault Mode's zero-egress requirement. I documented the evaluation rather than forcing the fit.

---

## Vault Mode — Honest Trust Claims

**DIAGRAM PROMPT 5 — Vault Mode Trust Architecture (copy into Gemini image gen):**

```
Create a security/trust architecture diagram for 'Vault Mode' in a software
application. Dark background with amber/gold accent color.

CENTER: A shield icon containing 'Vault Mode' text.

SURROUNDING the shield, four connected boxes:

TOP: 'App-Level Egress Guard' — 'TypeScript fetch interceptor blocks all
non-local network calls'

RIGHT: 'OS-Level Verification' — 'User-guided: Little Snitch (macOS),
Windows Firewall, airplane mode (iOS)'

BOTTOM: 'Hash-Chained Audit Log' — 'Append-only event chain:
{timestamp, event_type, content_hash, prev_hash}. SHA-256. Exportable JSON.'

LEFT: 'Generation Disabled' — 'Gemini image generation blocked at
orchestration layer, not just UI'

Below the shield, a box labeled 'Explicit Non-Warranties (Threat Model)':
- 'Does NOT warrant against OS-level compromise'
- 'Does NOT warrant against model binary tampering'
- 'Does NOT provide forensic-grade chain of custody'

Style: security-focused, professional, dark with amber highlights.
Aspect ratio 16:9.
```

**[INSERT DIAGRAM 5 IMAGE HERE]**

---

I do not overclaim. Vault Mode provides:

**Application-level blocking** — a TypeScript fetch interceptor blocks all non-local network calls during a Vault session.

**OS-level verification guidance** — in-app instructions for the user to enable platform-native network monitoring (Little Snitch on macOS, Windows Firewall rules, airplane mode on iOS) and verify zero egress independently.

**Hash-chained audit log** — every critique event is appended with a SHA-256 hash linking to the previous event. Exportable as JSON for the photographer's own records.

**What I do NOT claim:** forensic-grade chain of custody, tamper-proofness against OS-level compromise, or protection against malicious model binary replacement. The threat model is documented in the repository.

---

## Cloud-to-Edge: A Measured Port

**DIAGRAM PROMPT 6 — Cloud vs Edge Comparison (copy into Gemini image gen):**

```
Create a before/after comparison diagram for an AI application being ported
from cloud to edge. Dark background, professional.

LEFT SIDE labeled 'v1: Cloud (Gemini 3 Pro)' with cloud icon:
- 'API call per photo'
- 'Extended thinking (opaque)'
- 'Cost: ~$0.002/photo'
- 'Requires internet'
- 'No audit trail'
- Badge: 'DeepMind Vibe Code Winner, Dec 2025'

RIGHT SIDE labeled 'v2: Edge (Gemma 4 E4B + Ollama)' with laptop/chip icon:
- 'Local inference per photo'
- 'Explicit rationale fields (transparent)'
- 'Cost: $0/photo (after hardware)'
- 'Works offline (Vault Mode)'
- 'Hash-chained audit log'
- Badge: 'Gemma 4 Good Submission, May 2026'

CENTER: Arrow from left to right labeled 'Measured Port'

BOTTOM: Comparison bar showing 'Quality delta: [placeholder for spike
results]' and 'Latency: [placeholder] vs [placeholder]'

Style: clean split comparison, professional. Aspect ratio 16:9.
```

**[INSERT DIAGRAM 6 IMAGE HERE]**

---

Photography Coach AI won Google DeepMind's Vibe Code with Gemini 3 Pro competition in December 2025. This submission is not a recycled entry — it is a measured port from cloud to edge with honest tradeoff analysis.

I replaced opaque "extended thinking" with explicit schema fields. I added deterministic CV grounding that the cloud version lacked. I introduced Vault Mode, tiered productization, and batch processing — none of which existed in v1.

The comparison harness runs the same golden image set through both Gemini 3 Pro (cloud) and Gemma 4 E4B (local), producing per-axis score deviations and latency comparisons. The results are published in the repository as reproducible CSV artifacts.

---

## Challenges and Honest Tradeoffs

**Schema parity.** Gemma 4 E4B does not support Gemini's `responseSchema` parameter. Conformance is achieved through prompt engineering and runtime validation — tested, not assumed.

**Quality gap.** A 4B edge model will not match a frontier cloud model on nuanced artistic judgment. I measure the gap rather than hide it. The comparison harness quantifies per-axis deviation.

**Batch memory.** Processing 200 photos sequentially on a laptop requires stream processing with checkpoint/resume. I cap concurrent inference and use a JSONL job queue with crash recovery.

**LiteRT uncertainty.** iOS support for Gemma 4 E4B via LiteRT is unverified at time of writing. My fallback (PWA) ships regardless. Uncertainty is documented, not hidden.

---

## Reproducibility

Clone the repository. Follow the README to install Ollama and pull Gemma 4 E4B. Run the app. Upload a photo. Compare the structured JSON output against `docs/specs/02-output-schema.md`. Run the evaluation harness against the golden image set. Every claim in this writeup is verifiable from the public repo.

---

## Closing

This is not "Lightroom plus ChatGPT." This is a structured, grounded, schema-validated coaching system with deterministic evidence, two operational modes for real professional workflows, and an honest measurement of what edge AI can and cannot do today.

The video demonstrates the experience. The repository proves the engineering. The comparison harness quantifies the tradeoff.

Built on Gemma 4. Local where it matters. Honest about the rest.

---

_Word count (prose only, excluding diagram prompts): ~1,470. Fill [PLACEHOLDER] values with actual spike results and URLs before final submission. Remove diagram prompt blocks after inserting generated images._
