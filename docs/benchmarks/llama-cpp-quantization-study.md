# Why We Chose Q4_K_M (and Ollama) for Production

**Purpose:** Document the architectural reasoning behind selecting Gemma 4 E4B Q4_K_M served via Ollama as the production runtime for Photography Coach.
**Tester:** Prasad
**Hardware:** MacBook (Apple Silicon, 16 GB unified memory)
**Date:** May 2026
**Track relevance:** Provides the architectural reasoning behind our Ollama choice. We considered llama.cpp (and indeed Ollama uses it under the hood) but did not implement direct llama.cpp deployment for this submission.

---

## Why This Document Exists

The hackathon's llama.cpp Special Tech Track asks for "innovative implementation of Gemma 4 on resource-constrained hardware." Photography Coach v2 ships with Ollama as its runtime (which uses llama.cpp internally). This document explains the architectural reasoning so judges understand the choice was deliberate, not accidental.

We also evaluated three Gemma 4 E4B quantization variants — Q4_K_M, Q5_K_M, Q8_0 — to inform the production model selection. The reasoning below summarizes that evaluation at the architectural level. **Detailed lab benchmarks are not included in this document; the production decision was driven by qualitative tradeoff analysis on a single development machine, not by a formal benchmark suite.**

---

## The Tradeoff Space

Photography Coach v2 needed a model that:

1. **Fits in ≤12 GB RAM** on a typical photographer's MacBook (alongside Lightroom, Chrome, and other workflow apps)
2. **Returns a structured JSON critique in ≤30 seconds (warm)** for acceptable UX
3. **Maintains output quality comparable to the cloud baseline** on the photo critique task
4. **Runs on commodity Apple Silicon** without GPU configuration or Linux-specific tooling

Three Gemma 4 E4B quantizations were available:

| Variant | File size | Memory footprint (loaded) | Quality (qualitative) |
|---|---|---|---|
| **Q4_K_M** | ~9.6 GB | ~10 GB | Strong, with mild precision loss |
| **Q5_K_M** | ~11 GB | ~11.5 GB | Closer to base, marginally better |
| **Q8_0** | ~17 GB | ~18 GB | Near-base quality |

---

## The Decision: Q4_K_M via Ollama

We chose Q4_K_M for production based on these architectural reasons:

### 1. Memory headroom on the target hardware

A typical photographer runs Lightroom (~3-5 GB), Chrome (~1-2 GB), and the OS (~3-4 GB). On a 16 GB MacBook, that leaves ~5-7 GB free. Q8_0 alone needs 18 GB loaded — it would push the system into swap, drastically slowing everything down. Q5_K_M is workable but tight. Q4_K_M leaves comfortable headroom.

### 2. Latency budget for the UX

Photography Coach is interactive — a photographer drops a photo and waits for a critique. Beyond ~30 seconds, the UX feels broken. Quantizations larger than Q4_K_M increase token-generation time, pushing closer to or past this threshold on a typical MacBook. The latency penalty is real and visible.

### 3. Quality drift is below user-perception threshold

We display 5-axis scores rounded to 0.5 in the UI. Anecdotal comparison of Q4_K_M vs higher quantizations on our 8 golden test images showed score drift below the rounding precision — the model would say "composition: 6.4" with one quant and "6.5" with another. Not visible to users.

### 4. Ollama defaults to Q4_K_M for Gemma 4

Matching Ollama's default quantization reduces friction for users running `ollama pull gemma4`. They get exactly what we tested.

### 5. Structured output reliability

All three quantizations produced valid v2 schema JSON via Ollama's `format` parameter (token-level constraint). Q4_K_M was sufficient — no schema-validity issues observed.

---

## Why Ollama (Instead of Direct llama.cpp Deployment)

We considered shipping a llama.cpp HTTP server bundled with the Electron app. We chose Ollama for these architectural reasons:

| Concern | Direct llama.cpp | Ollama (chosen) |
|---|---|---|
| **Reproducibility** | We'd ship a binary; users trust us | `ollama pull gemma4` — official model, user-verifiable |
| **Update path** | We re-package on every Gemma update | Users `ollama pull` — no app update needed |
| **Concurrent requests** | Raw llama.cpp HTTP server doesn't queue | Ollama queues automatically |
| **Cross-platform builds** | We maintain Mac/Win/Linux binaries | Ollama abstracts the platform |
| **Install friction** | One `.dmg` for the user | One extra step (Ollama install) |

The architectural cost is one extra install step. We mitigated this with explicit error states pointing the user to the install command. For our hackathon scope and target user (a photographer who can install Lightroom can install Ollama), this was the right tradeoff.

---

## What We Did NOT Do (Honest Scope)

- **No detailed benchmark sweep CSV.** Production decision was made on tradeoff reasoning + hands-on testing, not formal benchmark methodology. Future work could add a real benchmark harness with statistical rigor.
- **No deployment to actually-resource-constrained hardware** (Raspberry Pi, low-power ARM). Apple Silicon MacBooks are commodity hardware but not "constrained" in the llama.cpp track's sense.
- **No comparison with non-Gemma models** at equivalent quantizations.

This study was designed to make a production decision, not to publish research. The decision held: Q4_K_M via Ollama works reliably, fits the hardware, and ships clean.

---

## Reproducibility

To verify the production model choice yourself:

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull the model (Ollama defaults to Q4_K_M)
ollama pull gemma4

# Start Ollama
ollama serve

# In another terminal, run Photography Coach
git clone https://github.com/prasadt1/photography-coach-gemma4
cd photography-coach-gemma4
npm install
npm run dev
```

If you want to test other quantizations:

```bash
# Q5_K_M (heavier, marginally higher quality, requires more RAM)
ollama pull gemma4:q5_K_M

# Q8_0 (heaviest, near-base quality, will push 16 GB Macs into swap)
ollama pull gemma4:q8_0
```

Then update `services/ollamaService.ts:OLLAMA_CONFIG.model` to the new tag and restart the dev server.

---

## Limitations

This document is architectural reasoning, not a formal benchmark report. Some claims are based on hands-on observation rather than measured data. A future version could add:
- A real benchmark harness (`spike/benchmark-quantization.mjs` is a starting point)
- A larger test set than 8 photos
- Statistical comparison across multiple runs
- Cross-platform performance data (Intel Mac, Linux, Windows)

For the hackathon submission's purpose — explaining why Q4_K_M via Ollama is the right production choice — the reasoning above is sufficient.
