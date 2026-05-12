# 03-runtime-decisions-and-spikes.md

**Spec Session:** Photography Coach v2 (Gemma 4 Edition)
**Author:** Claude (Spec Session Agent)
**Date:** 2026-05-06
**Dependencies:** 00-baseline-audit.md, 01-product-spec.md, 02-output-schema.md
**Status:** Tier 1 - Awaiting Review

---

## Executive Summary

This spec defines **4 spikes** that inform implementation decisions and runtime confidence. Each spike has a clear hypothesis, pass/fail criteria, time box, and fallback path.

**Implementation-Critical:** Spike 1 (Gemma 4 E4B via Ollama) blocks implementation decisions and runtime configuration. If Spike 1 fails, fallback to Gemma-preserving options (prompt iteration, scope reduction, or emergency hybrid with Gemma for Vault + Gemini for Studio web). Tier 2+ specs can be drafted with documented assumptions.

**Optional Spikes:** Spikes 2-4 are optional experiments. Failure triggers documented fallbacks but does not block spec drafting or MVP floor.

---

## Spike Overview Table

| Spike | Purpose | Time Box | Blocks Implementation? | Fallback if Fail |
|-------|---------|----------|------------------------|------------------|
| **1. Gemma 4 E4B via Ollama** | Validate local inference quality + structured output | 4 hours | ✅ YES (implementation decisions) | Gemma-preserving fallback: Option A (prompt iteration +2h), Option B (scope reduction), or Option C (hybrid: Gemma for Vault, Gemini for Studio web) |
| **2. Cactus Verification** | Optional: Evaluate Cactus vs vanilla Ollama | 2 hours (Day 1 hard cap) | ❌ NO (optional experiment) | Drop Cactus; use vanilla Ollama (already documented) |
| **3. LiteRT iOS** | Optional: Validate on-device iOS inference | 6 hours (Day 4 only) | ❌ NO (optional enhancement) | iOS ships as PWA-only (already guaranteed floor) |
| **4. llama.cpp Quantization** | Optional: Benchmark Q4/Q5/Q8 for writeup | 4 hours | ❌ NO (optional tuning) | Use Q4_K_M default; skip benchmark appendix |

---

## Spike 1: Gemma 4 E4B via Ollama on M-series Mac

### Hypothesis

**Gemma 4 E4B can produce v2 schema-compliant output with quality comparable to Gemini 3 Pro baseline on a golden image set, when run via Ollama on M-series Mac (or comparable Linux/Windows hardware).**

### Test Procedure

**Setup:**
1. Install Ollama (https://ollama.ai/)
2. Pull Gemma 4 E4B model: `ollama pull gemma:4b-e4b-q4_k_m`
3. Verify model SHA-256 matches published weights (provenance check)
4. Select 5 reference photos from golden image set:
   - 1 high-quality landscape (score 8+/10 expected)
   - 1 high-quality portrait (score 8+/10 expected)
   - 1 low-quality landscape (score 4-6/10 expected)
   - 1 low-quality portrait (score 4-6/10 expected)
   - 1 edge case (high dynamic range, motion blur, or unusual composition)

**Execution:**
1. Extract EXIF + histogram for each photo (deterministic CV grounding)
2. Construct prompt with photography principles + EXIF context + v2 schema instructions (JSON Schema from 02-output-schema.md)
3. Call Ollama API: `POST http://localhost:11434/api/generate` with Gemma 4 E4B model
4. Parse raw response → validate against v2 schema (Zod + Ajv)
5. Record metrics:
   - Schema validation pass/fail
   - Axis scores vs Gemini 3 Pro baseline (± difference)
   - Bounding box presence (detected vs expected)
   - Rationale quality (observations, reasoning, fixes present and substantive?)
   - Latency (time-to-first-token, total generation time)
   - Token counts (if Ollama provides)

**Baseline Comparison:**
- Run same 5 photos through Gemini 3 Pro (geminiService.ts existing code)
- Compare axis scores (composition, lighting, technique, creativity, subjectImpact)
- Acceptable deviation: **± 2 points** per axis (e.g., Gemini:8.5 vs Gemma:7.0 is acceptable; Gemini:8.5 vs Gemma:5.0 is fail)

---

### Pass Criteria

**Must achieve ALL of the following:**

1. ✅ **Schema Validation:** 5/5 photos produce valid v2 schema (Zod + Ajv pass)
2. ✅ **Axis Score Accuracy:** 4/5 photos have axis scores within ± 2 of Gemini 3 Pro baseline (at least 4 of 5 axes per photo)
3. ✅ **Bounding Box Detection:** 3/5 photos produce at least 1 bounding box (if Gemini baseline had boxes)
4. ✅ **Rationale Quality:** All 5 photos have substantive rationale (observations: 3+ items, reasoning: 3+ items, priorityFixes: 3+ items)
5. ✅ **Latency:** < 15s end-to-end per photo (P95, M-series Mac, Q4_K_M quantization)

**Strong Pass (Stretch):**
- 5/5 photos schema-valid
- 5/5 photos axis scores within ± 1
- 5/5 photos have bounding boxes (if baseline had them)
- < 10s latency (P95)

---

### Fail Criteria

**Fails if ANY of the following:**

1. ❌ **Schema Failures:** < 4/5 photos produce valid v2 schema (hallucinated fields, missing required fields, type mismatches)
2. ❌ **Axis Score Deviation:** < 3/5 photos have acceptable axis scores (deviation > 2 points from baseline)
3. ❌ **Empty Rationale:** Any photo has empty or single-item rationale arrays
4. ❌ **Latency:** > 20s per photo (P95) - too slow for user experience
5. ❌ **Ollama Instability:** Crashes, hangs, or errors on > 1/5 photos

---

### Time Box

**4 hours** (half-day allocation)

**Breakdown:**
- 1 hour: Ollama setup, model pull, verification
- 2 hours: Prompt engineering + 5 photo runs + baseline comparison
- 1 hour: Metrics analysis + pass/fail decision

---

### Fallback Path if Fail

**Option A: Restructure Prompts (1 additional iteration)**
- If schema validation fails but rationale quality is good → simplify schema, drop optional fields
- If axis scores deviate but rationale is substantive → relax scoring precision (± 3 points acceptable)
- If bounding boxes missing → make bounding boxes optional, rely on deterministic CV to generate them
- **Budget:** +2 hours for prompt iteration
- **Re-test:** Same 5 photos, updated prompt
- **Go/No-Go:** If Option A fails, proceed to Option B

**Option B: Scope Reduction (Gemma-Preserving)**
- Make bounding boxes fully optional (deterministic CV generates them, Gemma provides text critique only)
- Reduce critique schema to 3 axes instead of 5 (composition, lighting, technique)
- Simplify CV layer (skip edge density and color distribution, keep histogram + focus map only)
- **Impact:** Reduced scope but core Gemma 4 E4B differentiation preserved, web Studio + Vault modes both remain
- **Budget:** +1 hour for schema simplification
- **Writeup Narrative:** "Focused on core critique quality with Gemma 4 E4B; streamlined schema to 3 axes for MVP reliability."

**Option C: Hybrid Architecture (Gemma-Preserving)**
- Use Gemma 4 E4B for local Vault Mode (working pros, confidentiality use case)
- Use Gemini 3 Pro for web Studio Mode (hobbyists, speed-first use case)
- Both modes use v2 schema (Gemma and Gemini outputs compatible)
- **Impact:** Dual-model architecture; increases complexity but preserves both wedges
- **Budget:** +2 hours for dual-model integration
- **Writeup Narrative:** "Hybrid approach: Gemma 4 E4B for confidential workflows, Gemini 3 Pro for web convenience."

---

### Decision Maker

**Spec session lead** (user) makes go/no-go call after reviewing:
- Schema validation report (5/5 pass/fail)
- Axis score comparison CSV (Gemini vs Gemma, per-photo, per-axis)
- Rationale examples (best and worst from 5 photos)
- Latency percentiles (P50, P95, P99)

**Output Artifacts:**
- `spike-1-results.md` (summary report)
- `spike-1-validation.json` (5 photos × v2 schema outputs)
- `spike-1-comparison.csv` (axis scores: Gemini vs Gemma)
- `spike-1-latency.txt` (timing logs)

---

### Open Questions (Answer During Spike)

1. **Structured Output Support:** Does Ollama support native `responseSchema` enforcement? OR must we rely on prompt + client-side validation?
   - **Test:** Check Ollama API docs + experiment with schema parameter
   - **Fallback:** If no native support → enforce via Zod/Ajv post-parse

2. **Token Count Availability:** Does Ollama API return token counts (prompt + completion)?
   - **Test:** Inspect `/api/generate` response for `eval_count`, `prompt_eval_count` fields
   - **Fallback:** If unavailable → economics dashboard shows "N/A" or estimates via client-side tokenization

3. **Model Quantization Impact:** Is Q4_K_M sufficient quality, or do we need Q5_K_M / Q8_0?
   - **Test:** Run same 5 photos at Q4_K_M vs Q5_K_M (if time permits)
   - **Decision:** Choose quantization that meets pass criteria with best latency

4. **Bounding Box Reliability:** Can Gemma 4 E4B produce bounding boxes via structured output, or must deterministic CV generate them?
   - **Test:** Check if Gemma outputs valid bounding boxes (coordinates, descriptions) on 3+/5 photos
   - **Fallback:** If unreliable → deterministic CV generates boxes based on EXIF + histogram analysis

---

## Spike 2: Cactus Verification

### Hypothesis

**Cactus (https://cactus.ai or similar) supports Gemma 4 E4B with intelligent local/cloud routing, integrates with our TypeScript stack, and provides clear value over vanilla Ollama.**

### Test Procedure

**Time Box:** 2 hours **HARD CAP** on Day 1

**Execution:**
1. Read Cactus official documentation (website, GitHub, API docs)
2. Identify Gemma 4 E4B support (explicit model list or generic LLM support)
3. Check integration requirements:
   - TypeScript SDK available?
   - Requires backend server or client-side usable?
   - Supports structured output (JSON schema enforcement)?
   - Provides local/cloud routing decision logic?
4. Evaluate value proposition:
   - Does Cactus add features beyond Ollama? (Smarter routing? Better schema adherence? Model caching?)
   - Does it complicate architecture? (Extra dependencies? Auth requirements?)
   - Does it cost money? (Pricing model, free tier limits?)

**No Code Implementation Required** - Documentation review only

---

### Pass Criteria

**Must achieve ALL of the following:**

1. ✅ **Gemma 4 E4B Support:** Documented support for Gemma 4 E4B (explicit or via generic LLM adapter)
2. ✅ **TypeScript SDK:** Official SDK or REST API usable from TypeScript/Node.js
3. ✅ **Clear Value:** At least one of:
   - Intelligent local/cloud routing (auto-fallback if local inference fails)
   - Better structured output enforcement than vanilla Ollama
   - Model version management (automatic updates, A/B testing)
4. ✅ **Architecture Fit:** Integrates without requiring backend rewrite or paid API keys for MVP

---

### Fail Criteria

**Fails if ANY of the following:**

1. ❌ **No Gemma Support:** Documentation does not mention Gemma 4 E4B or generic LLM support
2. ❌ **SDK Missing:** No TypeScript SDK or REST API is Python-only / proprietary format
3. ❌ **No Clear Value:** Cactus appears to be thin wrapper around Ollama with no added features
4. ❌ **Architectural Complexity:** Requires backend server, paid API keys, or non-trivial integration effort

---

### Time Box

**2 hours** (Day 1 hard cap)

**If not verified within 2 hours:** Mark as FAIL and proceed with fallback (vanilla Ollama).

---

### Fallback Path if Fail

**Drop Cactus from architecture entirely.**

**Rationale:**
- 2-hour cap ensures no time wasted on dead-end investigation
- Vanilla Ollama is known-good baseline (Spike 1 validates)
- Cactus adds complexity without clear value if documentation is unclear

**Documentation:**
- Add note in `07-stack-and-runtime-mapping.md`: "Cactus evaluated on Day 1; dropped due to [reason: no Gemma support / unclear value / integration complexity]."
- Update architecture diagram to show vanilla Ollama only

---

### Decision Maker

**Spec session agent** (autonomous decision during spike)

**Output Artifacts:**
- `spike-2-cactus-eval.md` (summary of findings: pass/fail, rationale, links to docs)

**Track Evidence (if PASS):**
- Mention in writeup: "Cactus integration enables intelligent local/cloud routing"
- Add Cactus logo/badge to architecture diagram in repo README
- Demo video: briefly show Cactus fallback behavior (if time permits)

---

## Spike 3: LiteRT iOS for Gemma 4 E4B

### Hypothesis

**Gemma 4 E4B can run on iPhone or iPad via LiteRT (TensorFlow Lite for iOS), producing v2 schema output end-to-end (photo → critique JSON → display) on a physical iOS device.**

### Known Pre-emptions (add before starting Day 4)

> **iSWA Delegate Crash** — Gemma 4's Interleaved Sparse-Dense Attention (iSWA) tensor shapes fail to compile on some mobile NPU/GPU delegates, causing "Failed to create engine" with 0.00 tokens/sec.
> **Fix:** Force XNNPACK CPU delegate as the first fallback in your delegate list before trying GPU/NPU delegates.
> ```swift
> // LiteRT iOS — force XNNPACK before attempting GPU delegate
> var options = InterpreterOptions()
> options.delegates = [XNNPackDelegate(), MetalDelegate()]
> ```

> **Speculative Decoding (2× speed)** — If using LiteRT-LM CLI, append:
> ```
> --enable-speculative-decoding=true
> ```
> Delivers 2× decode speed on mobile GPUs with no quality degradation. Add to iOS launch args and demo video.

---

### Test Procedure

**Time Box:** 6 hours (Day 4 only, **NOT** before)

**Prerequisite:** Spike 1 must PASS (Gemma works on desktop Ollama)

**Setup:**
1. Install Xcode + iOS SDK
2. Set up LiteRT iOS framework (CocoaPods or Swift Package Manager)
3. Convert Gemma 4 E4B model to TFLite format (if not already available):
   - Check if Google provides pre-converted Gemma 4 E4B TFLite weights
   - If not: attempt conversion via TFLite converter (may require quantization tuning)
4. Build minimal iOS app (SwiftUI or UIKit):
   - Photo picker (UIImagePickerController)
   - Image → base64 → LiteRT inference
   - JSON response parser → display scores/critique

**Execution:**
1. Load one test photo (from golden set) into iOS app
2. Run full pipeline: pick photo → inference → parse JSON → display results
3. Record metrics:
   - Model load time (cold start)
   - Inference latency (time-to-first-token, total generation time)
   - Memory usage (peak RAM during inference)
   - Battery drain (% per photo, measured over 10 photos)
   - Schema validation (does output match v2 schema?)

---

### Pass Criteria

**Must achieve ALL of the following:**

1. ✅ **End-to-End Success:** Photo → critique JSON → display works on physical iOS device (not simulator)
2. ✅ **Schema Valid:** Output matches v2 schema (Zod validation passes)
3. ✅ **Latency Acceptable:** < 30s per photo (iPhone 12 or newer)
4. ✅ **Memory Feasible:** < 4GB RAM peak (iPhone 12 has 4GB total)
5. ✅ **No Crashes:** 10 photos processed without app crash or iOS memory warning

**Strong Pass (Stretch):**
- < 20s latency
- < 3GB RAM
- Battery drain < 5% per photo

---

### Fail Criteria

**Fails if ANY of the following:**

1. ❌ **Model Conversion Fails:** Cannot convert Gemma 4 E4B to TFLite format
2. ❌ **Inference Fails:** Model loads but inference crashes, hangs, or returns invalid output
3. ❌ **Latency Too High:** > 45s per photo (unacceptable UX)
4. ❌ **Memory Overflow:** App crashes due to OOM on iPhone 12
5. ❌ **Spike Exceeds Time Box:** > 6 hours invested without end-to-end success

---

### Time Box

**6 hours** (Day 4 only)

**Breakdown:**
- 2 hours: LiteRT setup, model conversion (or download pre-converted weights)
- 3 hours: iOS app build, integration, testing
- 1 hour: Metrics collection, pass/fail decision

**Why Day 4?** Must wait until desktop Ollama path is validated (Spike 1) and core architecture is stable (Tier 2 complete).

---

### Fallback Path if Fail

**iOS ships as PWA-only for MVP.**

**Rationale:**
- PWA is known-good baseline (Capacitor wrapper works today)
- LiteRT is stretch goal, not floor MVP
- 6-hour cap prevents time sinkhole

**Impact on Product:**
- Serious Amateur tier: iOS PWA (Capacitor) using web-based inference (Ollama.js if feasible, else server-side)
- Working Pro tier: No iOS Vault Mode (desktop-only)
- Roadmap: Mark LiteRT iOS as "Phase 2" (post-hackathon)

**Documentation:**
- Add note in `10-platform-shells-spec.md`: "LiteRT iOS attempted on Day 4; marked as Phase 2 due to [reason: model conversion complexity / latency / memory constraints]."
- Update comparison harness to note "iOS: PWA-only for MVP"

---

### Decision Maker

**Spec session lead** (user) makes go/no-go call after reviewing:
- iOS app screen recording (photo → critique → display)
- Latency logs (10 photos)
- Memory profiler screenshot (Xcode Instruments)
- Battery drain report (Settings → Battery → App usage)

**Output Artifacts:**
- `spike-3-ios-demo.mp4` (screen recording if pass)
- `spike-3-metrics.txt` (latency, memory, battery)
- `spike-3-status.md` (pass/fail, rationale)

---

## Spike 4: llama.cpp Quantization Sweep

### Hypothesis

**Quantization tradeoffs (Q4_K_M vs Q5_K_M vs Q8_0) are measurable and documentable, providing valuable comparison data for hackathon writeup appendix.**

### Test Procedure

**Time Box:** 4 hours

**Setup:**
1. Install llama.cpp (https://github.com/ggerganov/llama.cpp)
2. Download Gemma 4 E4B in 3 quantizations:
   - `gemma-4b-e4b-Q4_K_M.gguf`
   - `gemma-4b-e4b-Q5_K_M.gguf`
   - `gemma-4b-e4b-Q8_0.gguf`
3. Select 10 test photos (subset of golden image set):
   - 5 high-quality (score 8+/10)
   - 5 low-quality (score 4-6/10)

**Execution:**
1. Run each photo through all 3 quantizations via llama.cpp CLI:
   ```bash
   ./main -m gemma-4b-e4b-Q4_K_M.gguf -p "Analyze this photo..." --image photo.jpg
   ```
2. Record metrics per quantization:
   - **Tokens/sec** (throughput)
   - **Time-to-first-token** (TTFT, latency until first output)
   - **Total generation time** (end-to-end)
   - **Peak memory** (via Activity Monitor / `htop`)
   - **Schema validation pass rate** (% of 10 photos that produce valid v2 schema)
   - **Axis score deviation** (vs Gemini 3 Pro baseline, calculate MAE per axis)

**Baseline:** Q4_K_M is the "known-good" quantization (Spike 1 uses Q4). Compare Q5 and Q8 against Q4.

---

### Pass Criteria

**Must achieve ALL of the following:**

1. ✅ **Sweep Completes:** All 10 photos × 3 quantizations = 30 runs complete without crashes
2. ✅ **Metrics Captured:** tokens/sec, TTFT, memory, schema pass rate recorded for all 30 runs
3. ✅ **Clear Tradeoff:** Q5 or Q8 shows measurably better quality (schema pass rate or axis score accuracy) at cost of latency/memory
4. ✅ **Visualizable:** Data exportable as CSV → chart for writeup appendix

**Strong Pass (Stretch):**
- Q8 produces axis scores within ± 0.5 of Gemini baseline (vs Q4's ± 2)
- Q4 achieves 2× tokens/sec of Q8 (clear speed advantage)

---

### Fail Criteria

**Fails if ANY of the following:**

1. ❌ **Incomplete Sweep:** < 25/30 runs complete (crashes, errors, hangs)
2. ❌ **No Clear Tradeoff:** Q4/Q5/Q8 perform identically (no measurable quality or speed difference)
3. ❌ **Spike Exceeds Time Box:** > 4 hours invested without usable data
4. ❌ **Data Not Exportable:** Metrics not captured in structured format (CSV, JSON)

---

### Time Box

**4 hours**

**Breakdown:**
- 1 hour: llama.cpp setup, model downloads
- 2 hours: 30 runs (10 photos × 3 quantizations)
- 1 hour: Data analysis, CSV export, chart generation

---

### Fallback Path if Fail

**Skip llama.cpp benchmark appendix in writeup.**

**Rationale:**
- Quantization comparison is "nice-to-have" analysis, not core MVP feature
- 4-hour cap prevents time waste if llama.cpp is unstable or results are inconclusive
- Writeup can still describe quantization tradeoffs qualitatively (based on Spike 1 findings)

**Impact on Writeup:**
- Remove "Appendix B: Quantization Benchmarks" section
- Add note in "Future Work": "Quantization sweep (Q4 vs Q5 vs Q8) planned but deferred due to time constraints; Q4_K_M selected based on latency/quality balance."
- Keep main writeup focus on Studio/Vault dual-wedge narrative

**Documentation:**
- Add note in `13-writeup-outline.md`: "llama.cpp quantization appendix cut due to [reason: incomplete sweep / inconclusive results / time overrun]."

---

### Decision Maker

**Spec session agent** (autonomous decision during spike)

**Output Artifacts:**
- `spike-4-quantization.csv` (30 rows: photo ID, quantization, tokens/sec, TTFT, memory, schema pass, axis MAE)
- `spike-4-chart.png` (visualization: quantization vs latency, quantization vs quality)
- `spike-4-summary.md` (findings: which quantization wins for speed? for quality? recommended choice?)

**Track Evidence (if PASS):**
- Writeup appendix: "Appendix B: Quantization Benchmarks" with charts and analysis
- Mention in main writeup: "Evaluated Q4/Q5/Q8 quantizations; selected [X] for optimal balance"
- Include spike-4-chart.png in repo docs/ for judges

---

## Runtime Decision Matrix

### Decision Points Informed by Spikes

| Decision | Spike Dependency | If Pass | If Fail |
|----------|------------------|---------|---------|
| **Primary LLM Runtime** | Spike 1 | Ollama (Q4_K_M by default) | Scope reduction (Option B) OR hybrid architecture (Option C) |
| **Structured Output Strategy** | Spike 1 (sub-question) | Native Ollama schema if available, else Zod/Ajv post-parse | Zod/Ajv client-side enforcement + prompt engineering |
| **Token Count Tracking** | Spike 1 (sub-question) | Display real token counts in economics dashboard | Show "N/A" or estimate via client-side tokenization |
| **Cactus Integration** | Spike 2 | Include Cactus in 07-stack-and-runtime-mapping.md | Drop Cactus; use vanilla Ollama |
| **iOS Native Path** | Spike 3 | LiteRT iOS in 10-platform-shells-spec.md | iOS = PWA-only; mark LiteRT as Phase 2 |
| **Quantization Choice** | Spike 4 | Recommend Q5 or Q8 if quality justifies latency cost | Default to Q4_K_M (Spike 1 baseline) |
| **Writeup Appendix** | Spike 4 | Include quantization benchmark charts | Cut appendix; mention qualitatively in "Future Work" |

---

## Open Questions

### Pre-Implementation Decisions (Spike 1 Informs Runtime Configuration)

**Spike 1 ONLY - informs implementation decisions (Tier 2+ specs can be drafted with assumptions):**

1. **Ollama Integration Layer** (depends on Spike 1 - **implementation-critical**):
   - If Ollama has native structured output → use `responseSchema` parameter (like Gemini)
   - If not → enforce schema client-side (Zod parse → retry if invalid → fallback after 3 retries)
   - **Tier 2 assumption:** Client-side validation (safe default)

2. **Bounding Box Generation** (depends on Spike 1 sub-test - **implementation-critical**):
   - If Gemma produces reliable bounding boxes → use model output directly
   - If unreliable → deterministic CV layer generates boxes based on EXIF + histogram + focus map
   - **Tier 2 assumption:** CV fallback available (documented in 05-deterministic-cv-spec.md)

3. **Economics Dashboard** (depends on Spike 1 token count check - **implementation-critical**):
   - If Ollama provides token counts → display real metrics (like v1 Gemini baseline)
   - If not → show simplified economics ("Local inference: $0 API cost, compute time: Xs")
   - **Tier 2 assumption:** Token counts unavailable (safe fallback)

4. **Cactus Integration** (depends on Spike 2 - **optional experiment, NOT blocking**):
   - If Cactus passes verification → update 07-stack-and-runtime-mapping.md to make LLM backend configurable
   - If fails → vanilla Ollama only (already documented as default)
   - **Tier 2 assumption:** Vanilla Ollama (safe default)

---

### Post-Tier-2 Decisions (Resolved During Implementation, Day 4-5)

**Spike 3 and Spike 4 - these do NOT block Tier 2 specs:**

5. **iOS Platform Target** (depends on Spike 3 - Day 4):
   - If LiteRT passes → iOS gets native app with on-device inference
   - If fails → iOS = PWA via Capacitor, inference via web (Ollama.js or server-side)
   - **Tier 2 assumption:** iOS = PWA floor (10-platform-shells-spec.md documents PWA path + LiteRT stretch)

6. **Quantization Recommendation** (depends on Spike 4 - Day 5):
   - If Q8 significantly better quality → recommend Q8 for Working Pro tier (Vault Mode)
   - If Q4/Q5/Q8 equivalent → stick with Q4 for speed
   - **Tier 2 assumption:** Q4_K_M baseline (Spike 1), document Q5/Q8 as optional in 07-stack-and-runtime-mapping.md

---

## Spike Execution Schedule

**Recommended Order:**

1. **Day 1 Morning:** Spike 1 (Gemma 4 E4B via Ollama) - **BLOCKING**
   - 4-hour time box
   - Go/no-go decision by Day 1 EOD
   - If fail → emergency pivot (Option A prompt iteration OR Option B scope reduction OR Option C hybrid)

2. **Day 1 Afternoon:** Spike 2 (Cactus verification) - **OPTIONAL**
   - 2-hour hard cap
   - Autonomous decision (no user review needed)
   - If fail → drop Cactus, proceed with vanilla Ollama

3. **Day 2-3:** Tier 2 spec writing (architecture, prompts, CV, stack mapping)
   - Informed by Spike 1 + Spike 2 results

4. **Day 4 Morning:** Spike 3 (LiteRT iOS) - **OPTIONAL**
   - 6-hour time box
   - Go/no-go decision by Day 4 EOD
   - If fail → iOS = PWA-only, mark LiteRT as Phase 2

5. **Day 5 (Flexible):** Spike 4 (llama.cpp quantization) - **OPTIONAL**
   - 4-hour time box
   - Autonomous decision (no user review needed)
   - If fail → skip appendix, focus on main writeup

**Total Spike Budget:** 16 hours (4 + 2 + 6 + 4)

**Critical Path:** 4 hours (Spike 1 only)

---

## DEFERRED Items (Out of Spike Scope)

### Deferred to Tier 2 Specs

1. **Prompt Engineering Details** (04-prompt-and-rationale-spec.md):
   - Exact wording of system prompt for Gemma 4 E4B
   - Few-shot examples per axis score
   - Refusal prompt testing (medical, identity, surveillance)
   - **Dependency:** Spike 1 must pass to inform prompt structure

2. **Deterministic CV Tool Selection** (05-deterministic-cv-spec.md):
   - EXIF library choice per platform (exifr vs exiftool-vendored)
   - Histogram bin count (8 vs 16 vs 256 bins)
   - Laplacian variance threshold per genre (portraits vs landscapes)
   - Face detection confidence threshold (0.5 vs 0.7 vs 0.9)
   - **Dependency:** None (can proceed in parallel with spikes)

3. **Orchestration Layer Design** (06-architecture-spec.md):
   - Mode router implementation (feature flags vs environment vars)
   - Network egress blocker (fetch interceptor vs service worker vs Electron IPC)
   - Gemini gen module isolation (separate service vs blocked at fetch level)
   - **Dependency:** Spike 1 (Ollama integration pattern) + Spike 2 (Cactus decision)

4. **Platform-Specific Builds** (10-platform-shells-spec.md):
   - Electron packaging (model bundling vs user-installed Ollama)
   - iOS Capacitor config (PWA vs native)
   - Web worker feasibility for browser-based Ollama.js
   - **Dependency:** Spike 3 (iOS path decision)

5. **Evaluation Harness** (09-evaluation-and-benchmark-spec.md):
   - Golden image set curation (50 photos with ground truth scores)
   - Regression prompt suite (20 mentor chat prompts)
   - Comparison harness output format (CSV vs JSON vs HTML report)
   - **Dependency:** Spike 1 (must have working Gemma inference to evaluate)

---

## Summary of Spike Dependencies

```
Spike 1 (Gemma 4 E4B via Ollama)  ← BLOCKING
  ↓ [if pass]
  ├─→ Tier 2 Architecture Specs (04, 05, 06, 07)
  ├─→ Spike 3 (LiteRT iOS, Day 4)
  ├─→ Spike 4 (llama.cpp quantization)
  └─→ Comparison Harness Development

Spike 2 (Cactus)  ← OPTIONAL (Day 1, 2-hour cap)
  ↓ [if pass → use Cactus; if fail → vanilla Ollama]
  └─→ 07-stack-and-runtime-mapping.md

Spike 3 (LiteRT iOS)  ← OPTIONAL (Day 4, requires Spike 1 pass)
  ↓ [if pass → native iOS; if fail → PWA-only]
  └─→ 10-platform-shells-spec.md

Spike 4 (llama.cpp)  ← OPTIONAL (Day 5, no dependencies)
  ↓ [if pass → appendix in writeup; if fail → skip appendix]
  └─→ 13-writeup-outline.md
```

---

**End of 03-runtime-decisions-and-spikes.md**

**Status:** ✅ Complete - Ready for Tier 1 review

**Next:** STOP for Tier 1 review per spec session rules
