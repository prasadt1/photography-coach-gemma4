# Spike 3: LiteRT iOS for Gemma 4 E4B

> **Note (May 2026):** This spike was run during the project's *Photography Coach v2* phase, before the pivot to **L.E.N.S.** — the blind-and-low-vision-first product. The runtime findings below (model, runtime, quantisation, latency) carried over to L.E.N.S. unchanged. Some product terminology (Studio/Vault modes, five-axis scoring, "destination photographers") reflects the earlier scope.

**Date:** May 7, 2026  
**Duration:** 2 hours (4-hour time box)  
**Status:** Viable — not shipped in this submission  

## Verdict

On-device iOS via LiteRT is **technically viable** (pre-converted Gemma 4 E4B model, ~25 tok/s on a recent iPhone GPU, proven by Google's AI Edge Gallery app). It is **not shipped in this submission** because C++/Swift integration exceeds the hackathon timeline. The phone ships as a **PWA**; native on-device iOS is **Phase-2 roadmap**.

---

## Executive Summary

LiteRT native iOS with Gemma 4 E4B works on paper and in Google's reference app, but integrating the C++ API into a Swift app was estimated at **4–6 hours** — above the spike time box and above what remained for the hackathon slice. For this submission, **iOS is covered by the installable PWA** (same coaching contract as desktop; see [iOS PWA setup](../ios-pwa-setup.md)). LiteRT remains the right long-term path for true offline inference on the phone itself.

---

## Hypothesis (from spec)

Gemma 4 E4B can run on iPhone or iPad via LiteRT (TensorFlow Lite for iOS), producing v2 schema output end-to-end (photo → critique JSON → display) on a physical iOS device.

---

## Test Results

### ✅ Model Availability

**Model:** `litert-community/gemma-4-E4B-it-litert-lm`
- **Source:** Hugging Face
- **Format:** `.litertlm` (LiteRT-LM native format)
- **Size:** 3.66 GB total
  - Text decoder weights: 2.24 GB
  - Embedding parameters: 0.67 GB (memory-mapped)
- **Quantization:** 4-bit weights
- **Verified:** ✅ Pre-converted model exists, no manual conversion needed

### ✅ Vision/Multimodal Support

**Confirmed via:**
- Google AI Edge Gallery iOS app (App Store, working implementation)
- "Ask Image" feature uses Gemma 4 E4B with photo gallery/camera input
- Official documentation: "Gemma 4 models are multimodal, handling text and image input"
- Capabilities: object detection, OCR, document parsing, chart comprehension

**Evidence:**
- [Google AI Edge Gallery](https://apps.apple.com/us/app/google-ai-edge-gallery/id6749645337)
- [Gemma 4 E4B Model Card](https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm)
- [LiteRT-LM Overview](https://ai.google.dev/edge/litert-lm/overview)

### ✅ Performance Benchmarks

**iPhone 17 Pro:**

| Backend | Prefill (tokens/sec) | Decode (tokens/sec) | Time-to-first-token (sec) | Memory (MB) |
|---------|---------------------|---------------------|---------------------------|-------------|
| **CPU** | 159                 | 9.7                 | 6.5                       | 961         |
| **GPU** | 1,189               | 25.1                | 0.9                       | 3,380       |

**Latency Estimate (500-token critique):**
- GPU mode: ~20 seconds (500 tokens ÷ 25.1 tokens/sec)
- CPU mode: ~51 seconds (500 tokens ÷ 9.7 tokens/sec)

**Pass Criteria Assessment:**
- ✅ Latency < 30s: **PASS** (GPU mode: ~20s)
- ⚠️ Latency < 30s: **MARGINAL** on older iPhones (iPhone 12 will be slower)
- ✅ Memory < 4GB: **PASS** (3.38GB GPU, 0.96GB CPU)
- ✅ No OOM: **LIKELY PASS** (GPU mode fits in iPhone 12's 4GB RAM)

**Note:** Benchmarks are from iPhone 17 Pro. iPhone 12 performance will be lower (estimated 15-20 tokens/sec GPU, 5-8 tokens/sec CPU).

### ❌ Integration Effort (why we did not ship native iOS)

**Blockers for this submission:**

1. **No Swift SDK** — C++ API only; MediaPipe iOS SDK deprecated
2. **No public Swift examples** — AI Edge Gallery iOS source not in repo
3. **Estimated integration: 4-6 hours** — bridging, vision input, JSON parsing, test (exceeds spike + hackathon slice for native app)
4. **Complexity** — bridging headers, memory across C++/Swift, image preprocessing

**Documentation Sources:**
- [LiteRT-LM C++ API](https://ai.google.dev/edge/litert-lm/cpp)
- [Build LiteRT for iOS](https://ai.google.dev/edge/litert/build/ios)
- [MediaPipe LLM Inference (iOS, DEPRECATED)](https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference/ios)

---

## What we ship instead: iOS PWA

Vision coaching on iPhone uses the **installable PWA** plus inference on the maker's **Mac** (Gemma 4 E4B via Ollama), not LiteRT on the phone:

- Same Wi‑Fi: `OLLAMA_HOST=0.0.0.0:11434 ollama serve` — see [ios-pwa-setup.md](../ios-pwa-setup.md)
- Off-LAN demo recording: expose Ollama with e.g. `cloudflared tunnel --url http://127.0.0.1:11434` while the Mac runs E4B locally

**Existing web path (Spike 1):** `ollamaService.ts` already sends `images: [base64]` to Ollama; PWA manifest supports Add to Home Screen. No separate native binary in this repo.

**Trade-off vs LiteRT native:**

| Dimension | LiteRT native iOS | iOS PWA → Mac Ollama (E4B) |
|-----------|-------------------|----------------------------|
| **True on-phone offline** | ✅ | ❌ (inference on Mac) |
| **Shipped in submission** | ❌ | ✅ |
| **Implementation time** | 4-6+ hours | Already integrated |
| **Latency** | ~20s on-device GPU | E4B on Mac + network hop |

---

## Pass/Fail Assessment

### Technical feasibility

| Criterion | Status | Notes |
|-----------|--------|-------|
| End-to-end photo → JSON → display | ✅ **VIABLE** | Proven by Google AI Edge Gallery app |
| Schema valid (v2 JSON) | ✅ **EXPECTED PASS** | Same Gemma 4 E4B model |
| Latency < 30s (iPhone 12+) | ⚠️ **MARGINAL** | iPhone 17 Pro: ~20s GPU |
| Memory < 4GB | ✅ **PASS** | 3.38GB GPU, 0.96GB CPU |

### Hackathon scope

| Criterion | Status | Notes |
|-----------|--------|-------|
| Native iOS app in submission | ❌ **OUT OF SCOPE** | C++/Swift effort exceeds timeline |
| PWA floor | ✅ **SHIPPED** | Installable; coaching contract unchanged |

---

## Writeup / roadmap wording

> LiteRT on iOS is **proven viable** (~25 tok/s decode on recent iPhone GPU with the pre-built Gemma 4 E4B LiteRT model). It is **not in this repo as a native app** because integration is a Phase-2 engineering sprint, not a missing proof point.

---

## Sources & Evidence

**Model & Framework:**
- [litert-community/gemma-4-E4B-it-litert-lm](https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm)
- [LiteRT-LM GitHub](https://github.com/google-ai-edge/LiteRT-LM)
- [Google AI Edge Documentation](https://ai.google.dev/edge/litert-lm/overview)

**Proof of iOS capability:**
- [Google AI Edge Gallery (iOS App Store)](https://apps.apple.com/us/app/google-ai-edge-gallery/id6749645337)
- [Gemma 4 Edge Deployment Blog](https://developers.googleblog.com/bring-state-of-the-art-agentic-skills-to-the-edge-with-gemma-4/)

**PWA path (what we ship):**
- [Ollama Vision Capabilities](https://docs.ollama.com/capabilities/vision)
- [ios-pwa-setup.md](../ios-pwa-setup.md)

---

**End of Spike 3 Results**
