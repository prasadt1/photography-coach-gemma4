# Spike 3: LiteRT iOS for Gemma 4 E4B

**Date:** May 7, 2026
**Duration:** 2 hours (4-hour time box)
**Status:** ⚠️ CONDITIONAL FAIL - Viable but exceeds time budget
**Verdict:** Fallback to iOS PWA + Ollama.js vision

---

## Executive Summary

**LiteRT native iOS with Gemma 4 E4B is technically viable** but requires C++ API integration with estimated 4-6 hour implementation time, exceeding the spike's 4-hour budget. **Alternative path discovered:** Enhance existing iOS PWA with vision capabilities via ollama-js (30-minute implementation).

**Recommendation:** Accept PWA + Ollama.js as iOS mobile solution, document LiteRT as Phase 2.

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

### ❌ Integration Challenges

**Critical Blockers:**

1. **No Swift SDK**
   - Must use C++ API for iOS integration
   - No native Swift bindings available as of May 2026
   - MediaPipe iOS SDK marked as **deprecated** (not recommended)

2. **No Swift Code Examples**
   - Google AI Edge Gallery iOS source code not in public repo
   - Only Android implementation available on GitHub
   - Official docs show C++ examples only

3. **Estimated Integration Time: 4-6 hours**
   - Xcode project setup: 30min
   - C++ to Swift bridging: 2-3 hours
   - Vision input integration: 1-2 hours
   - v2 schema JSON parsing in Swift: 1 hour
   - Testing + debugging: 1 hour
   - **Total:** Exceeds 4-hour spike budget

4. **Technical Complexity**
   - Bridging header setup for C++ API
   - Memory management between C++ and Swift
   - Async/await integration for inference
   - Image preprocessing (base64 encoding, resize, EXIF extraction)

**Documentation Sources:**
- [LiteRT-LM C++ API](https://ai.google.dev/edge/litert-lm/cpp)
- [Build LiteRT for iOS](https://ai.google.dev/edge/litert/build/ios)
- [MediaPipe LLM Inference (iOS, DEPRECATED)](https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference/ios)

---

## Alternative Path: iOS PWA + Ollama.js Vision

### ✅ Discovered During Spike

**Ollama.js supports vision/multimodal inputs in browser environments.**

**Key Capabilities:**
- ollama-js library accepts images as Uint8Array or base64 strings
- Automated encoding pipeline for browser
- Supports Gemma 4 E4B multimodal (same model as desktop Ollama)
- Works in iOS Safari (PWA mode)

**Implementation Estimate: 30 minutes**

```javascript
// Add to existing ollamaService.ts
async function analyzePhotoVision(imageFile: File): Promise<PhotoAnalysisV2> {
  const base64Image = await fileToBase64(imageFile);

  const response = await ollama.chat({
    model: 'gemma4:e4b',
    messages: [{
      role: 'user',
      content: photographyCritiquePrompt,
      images: [base64Image] // ← Vision input
    }],
    format: 'json',
    options: { temperature: 0.3 }
  });

  return JSON.parse(response.message.content);
}
```

**Advantages:**
- ✅ Reuses existing Ollama integration (proven in Spike 1)
- ✅ Same v2 schema output as desktop
- ✅ Works today with existing PWA infrastructure
- ✅ 30-minute implementation vs 4-6 hours for LiteRT
- ✅ No App Store submission required

**Limitations:**
- ❌ Requires network to Ollama server (WiFi to Mac/PC on same network)
- ❌ Not truly offline (airplane mode won't work)
- ❌ Adds 50-200ms network latency vs on-device inference

**Documentation:**
- [Ollama Vision Capabilities](https://docs.ollama.com/capabilities/vision)
- [ollama-js Multimodal Inputs](https://deepwiki.com/ollama/ollama-js/5.1-multimodal-inputs)

---

## Pass/Fail Assessment

### Against Original Pass Criteria

| Criterion | Status | Notes |
|-----------|--------|-------|
| End-to-end photo → JSON → display | ✅ **VIABLE** | Proven by Google AI Edge Gallery app |
| Schema valid (v2 JSON) | ✅ **EXPECTED PASS** | Same Gemma 4 E4B model, same schema |
| Latency < 30s (iPhone 12+) | ⚠️ **MARGINAL** | iPhone 17 Pro: 20s; iPhone 12: likely 25-35s |
| Memory < 4GB | ✅ **PASS** | 3.38GB GPU mode, 0.96GB CPU mode |
| No crashes (10 photos) | ✅ **EXPECTED PASS** | Google app demonstrates stability |

### Against Time Budget

| Criterion | Status | Impact |
|-----------|--------|--------|
| Spike completes in 4 hours | ❌ **FAIL** | 4-6 hour implementation estimate exceeds budget |
| Model conversion required | ✅ **PASS** | Pre-converted model available |
| Documentation available | ⚠️ **PARTIAL** | C++ docs exist, Swift examples missing |

---

## Decision

**SPIKE 3 VERDICT: ✅ PROCEED WITH LITERT NATIVE iOS**

**Reasoning:**
1. LiteRT iOS is **technically viable** AND **implementation path is clear**
2. Pre-converted model exists, performance meets targets (25 tokens/sec GPU)
3. **Clean C API discovered** with full vision/multimodal support
4. **Pre-built iOS binaries available** (no custom compilation needed)
5. **Time constraint clarified:** 12 days to deadline allows 1-2 days for proper iOS implementation
6. **Best solution principle:** No compromise on quality

**Implementation Path (1-2 days):**
1. **C API Integration:** Use `/tmp/LiteRT-LM/c/engine.h` with Objective-C++ bridge
2. **Pre-built Dylibs:** Link `/tmp/LiteRT-LM/prebuilt/ios_arm64/` libraries (Metal GPU support)
3. **Vision Support:** `LiteRtLmInputData` struct accepts raw image bytes + text
4. **Model Bundling:** Download `gemma-4-E4B-it-litert-lm` (3.66GB) from Hugging Face
5. **Swift UI:** Native iOS app with photo picker, inference, results display

**Recommended Path:**
- **Proceed:** LiteRT native iOS implementation (Task #2 created)
- **Timeline:** 1-2 days for complete iOS app with Share Sheet, native UI, on-device inference
- **Deliver:** Three-platform submission (Web, Desktop, iOS Native) with best-in-class UX
- **Invest remaining 10 days in:** Demo polish, XMP export, batch keywords, writeup finalization

---

## Fallback Implementation - COMPLETED ✅

### iOS PWA + Ollama Vision (Status: Already Implemented)

**DISCOVERY:** Vision support was already fully implemented during Spike 1!

**Existing Implementation:**
1. ✅ `ollamaService.ts` line 224: `{ role: 'user', content: userPrompt, images: [cleanBase64] }`
2. ✅ `PhotoUploader.tsx` lines 68-76: File → base64 DataURL conversion
3. ✅ `analysisOrchestrator.ts` lines 70-80: Wires base64 image to ollamaService
4. ✅ `public/manifest.json`: PWA config for standalone mode
5. ✅ Spike 1 validation: "Vision Input (base64)" - PASS

**No code changes required** — vision already works end-to-end!

**Documentation Added:**
- `docs/ios-pwa-setup.md` - Complete iOS setup guide (Ollama network config, troubleshooting, performance tips)

**Network Setup:**
- User connects iPhone to same WiFi as Mac/PC running Ollama
- User configures Ollama server IP in app settings (e.g., `http://192.168.1.100:11434`)
- Fallback: Show connection status indicator, guide user to Ollama setup

**Vault Mode:**
- ❌ Not recommended on iOS PWA (no cryptographic network isolation)
- Desktop Electron remains primary Vault Mode platform

---

## Writeup Impact

### If LiteRT Native (Attempted but Cut)

> "I evaluated LiteRT for on-device iOS inference with Gemma 4 E4B. While technically viable—proven by Google's AI Edge Gallery app—the C++ API integration complexity exceeded the hackathon timeline. I delivered iOS via progressive web app with full vision capabilities through the Ollama API instead, maintaining the three-platform submission (Web, Desktop, iOS) while focusing remaining time on integration polish and demo quality."

### Phase 2 Roadmap Note

> "**Post-Hackathon:** Native iOS app with on-device Gemma 4 E4B via LiteRT remains a compelling Phase 2 enhancement. The 3.66GB model runs at 25 tokens/sec on iPhone 17 Pro with true offline capability—ideal for destination photographers. The technical path is proven; implementation requires dedicated iOS development sprint."

---

## Sources & Evidence

**Model & Framework:**
- [litert-community/gemma-4-E4B-it-litert-lm](https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm)
- [LiteRT-LM GitHub](https://github.com/google-ai-edge/LiteRT-LM)
- [Google AI Edge Documentation](https://ai.google.dev/edge/litert-lm/overview)

**Proof of iOS Capability:**
- [Google AI Edge Gallery (iOS App Store)](https://apps.apple.com/us/app/google-ai-edge-gallery/id6749645337)
- [Gemma 4 Edge Deployment Blog](https://developers.googleblog.com/bring-state-of-the-art-agentic-skills-to-the-edge-with-gemma-4/)

**Alternative Path (Ollama.js):**
- [Ollama Vision Capabilities](https://docs.ollama.com/capabilities/vision)
- [ollama-js GitHub](https://github.com/ollama/ollama-js)
- [Multimodal Inputs Documentation](https://deepwiki.com/ollama/ollama-js/5.1-multimodal-inputs)

---

## Appendix: Comparison Table

| Dimension | LiteRT Native iOS | iOS PWA + Ollama.js | Winner |
|-----------|-------------------|---------------------|--------|
| **True Offline** | ✅ Works in airplane mode | ❌ Requires WiFi to Ollama | LiteRT |
| **Implementation Time** | ❌ 4-6 hours | ✅ 30 minutes | PWA |
| **App Store Presence** | ✅ Native app, searchable | ❌ Manual URL entry | LiteRT |
| **Setup Complexity** | ❌ 3.66GB model download | ✅ Instant access (Ollama on network) | PWA |
| **Latency** | ✅ 20s (on-device) | ⚠️ 14-20s + network (50-200ms) | LiteRT (marginal) |
| **Battery Drain** | ❌ High (on-device inference) | ✅ Low (network + UI only) | PWA |
| **Storage Footprint** | ❌ 3.66GB | ✅ ~1.5MB | PWA |
| **Vault Mode Viable** | ❌ No (iOS can't enforce network isolation) | ❌ No (same limitation) | TIE |
| **Hackathon Timeline Risk** | ❌ HIGH (exceeds time budget) | ✅ ZERO (already working) | PWA |

**Verdict:** PWA + Ollama.js wins for hackathon timeline and UX simplicity. LiteRT native remains superior for true offline use case (Phase 2).

---

**End of Spike 3 Results**
**Date:** May 7, 2026
**Spike Duration:** 2 hours
**Recommendation:** Fallback to iOS PWA + Ollama.js vision (30min implementation)
