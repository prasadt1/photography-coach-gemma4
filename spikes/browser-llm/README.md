# Browser LLM Spike — Day 1

Goal: pick the best library for running Gemma 2B in the browser as a Tier 2 fallback when Ollama isn't available.

## How to run

These are static HTML files. They need to be served (CORS reasons), not opened with `file://`.

```bash
cd spikes/browser-llm
python3 -m http.server 8000
# or: npx serve .
```

Then open the URLs below in **Chrome** (best WebGPU support):

| File | Library | URL |
|---|---|---|
| `01-webllm.html` | WebLLM (`@mlc-ai/web-llm`) | http://localhost:8000/01-webllm.html |
| `02-mediapipe.html` | MediaPipe LLM Inference | http://localhost:8000/02-mediapipe.html |
| `03-transformersjs.html` | Transformers.js | http://localhost:8000/03-transformersjs.html |

Each page has two buttons: **Load model** then **Run inference**. The same photo-critique prompt is used in all three so we can compare quality directly.

## What we're measuring

| Metric | Target | Why it matters |
|---|---|---|
| Cold-start (first load) | < 2 min on cable | Anything more is a UX disaster |
| Warm-start (cached) | < 10 s | Repeat visits should be instant |
| Tokens/sec on M-series Mac | ≥ 5 tok/s | Below this is unusable |
| iOS Safari support | "loads & runs" | The whole reason for Tier 2 |
| Output quality | Coherent 3-sentence critique | Comparable to Tier 1 baseline |

## Decision rules

- **PASS** all three metrics on at least one library → ship Tier 2 with that library
- Cross-browser support is a tiebreaker if multiple pass

## Notes on each candidate

### WebLLM
- Easiest setup — single CDN import, model auto-downloads from HF
- Best Gemma performance via MLC compiler
- WebGPU only (no WASM fallback) — might be a problem on iOS
- Model: `gemma-2-2b-it-q4f16_1-MLC` (~1.5 GB)

### MediaPipe LLM Inference
- Official Google library, LiteRT-based — strong narrative for the hackathon
- **Gotcha**: requires you to manually download the `.task` file from Kaggle (gated, must accept terms)
- Supports both GPU (WebGPU) and CPU paths
- Likely best iOS Safari support
- Model: `gemma-2-2b-it-gpu-int4.task` (~1.5 GB)

### Transformers.js
- Largest community, ONNX runtime under the hood
- WebGPU + WASM fallback (auto)
- Slower than WebLLM in practice
- Model: `onnx-community/gemma-2-2b-it` (~2 GB total ONNX shards)

## Result template

After testing, fill in:

```
WebLLM:
  Cold-start: ___ min     Warm-start: ___ s     Speed: ___ tok/s
  iOS Safari: PASS / FAIL
  Quality (1-5): ___      Notes: ___

MediaPipe:
  Cold-start: ___ min     Warm-start: ___ s     Speed: ___ tok/s
  iOS Safari: PASS / FAIL
  Quality (1-5): ___      Notes: ___

Transformers.js:
  Cold-start: ___ min     Warm-start: ___ s     Speed: ___ tok/s
  iOS Safari: PASS / FAIL
  Quality (1-5): ___      Notes: ___

PICK: ___
```
