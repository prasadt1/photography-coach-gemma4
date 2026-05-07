# Spike 2 Results: Cactus Evaluation
**Date:** 2026-05-07  
**Time spent:** ~35 min (hard cap: 2 hours)  
**Source:** https://cactuscompute.com/docs · https://github.com/cactus-compute/cactus · https://github.com/cactus-compute/cactus-gemma

---

## Decision: ❌ FAIL — Drop Cactus

Cactus fails 3 of 4 pass criteria for our architecture. Drop entirely; stick with vanilla Ollama.

---

## Evidence Against Integration

### Criterion 1: Gemma 4 E4B Support ✅ PASS
- `cactus-compute/cactus-gemma` repo (April 2026): confirmed Gemma 4 demo app exists
- Gemma 4 multimodal on-device AI demonstrated

### Criterion 2: TypeScript SDK ❌ FAIL
- Cactus provides: **React Native SDK** (`cactus-react-native`), Flutter, Swift, Kotlin, C++ FFI
- There is **no web/browser or Node.js TypeScript package**
- The Vercel AI SDK has a `@ai-sdk/cactus` provider (PR #7295) but it is a thin wrapper requiring the native engine — it does not run in a browser or Electron renderer
- Our stack: **React (web) + Electron (desktop)** — neither is served by the React Native SDK

### Criterion 3: Clear Value ❌ FAIL for our use case
Cactus's headline features:
- **Hybrid cloud routing** → conflicts directly with Vault Mode (we need *guaranteed* no cloud calls, not smart routing)
- **ARM SIMD mobile kernels** → our desktop/web targets don't benefit; Ollama already uses Metal GPU on Mac
- **Proprietary `.cact` format** → would require converting `gemma4:latest` (GGUF) to `.cact`; additional toolchain dependency with no GGUF compatibility

### Criterion 4: Architecture Fit ❌ FAIL
- `.cact` proprietary model format requires model download/conversion; our existing `gemma4:latest` in Ollama is GGUF, incompatible
- Cloud fallback requires a **Cactus API key** and account — paid tier for anything beyond basic local
- Integration would mean: replace Ollama with Cactus engine, convert model, update all API calls, lose Vault Mode guarantee
- Ollama is already validated (Spike 1), is GGUF-native, and has 100% GPU on this machine

---

## What Cactus Is Good For (Not Our Use Case)
Cactus excels at **mobile on-device AI** (iOS/Android React Native apps) with ARM NPU acceleration and automatic cloud fallback. It is an excellent choice for a React Native photography app on iPhone — but our iOS strategy is PWA floor + LiteRT stretch (Spike 3), not React Native.

If the project pivoted to React Native iOS, Cactus would be the right call.

---

## Impact on Architecture
- No changes to `07-stack-and-runtime-mapping.md` beyond this note
- Ollama remains the sole inference backend (vanilla, no Cactus layer)
- Note added to "Future Work": Cactus viable if project pivots to React Native iOS

---

## Artifacts
- `spike-2-results.md` — this file
MARKDOWN
echo "Written"