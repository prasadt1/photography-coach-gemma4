# Kaggle writeup draft (≤1,500 words)

**Track:** [Main / Impact / Special Technology — e.g. Ollama, LiteRT]

**Title:** Photography Coach v2 — Professional Critique on Gemma 4 at the Edge  
**Subtitle:** From cloud Gemini vision to local Gemma 4 with Studio throughput and Vault-grade trust.

**Project links (fill before submit)**  
- Public repo: https://github.com/prasadt1/photography-coach-gemma4  
- Live demo: `[DEMO_URL]`  
- Video (YouTube, ≤3 min, public): `[VIDEO_URL]`

---

## Summary

Photography Coach AI began as a **Gemini 3 Pro** web application: upload a photo, receive multi-axis critique, spatial hints, mentor chat, and optional refinement. It demonstrated **real multimodal analysis** with structured JSON—not a slide deck.

For **Gemma 4 Good**, we extend that product into **Photography Coach v2**: tiers from hobbyist to working pro, with two modes aligned to real workflows. **Studio mode** emphasizes **throughput**—batch-friendly workflows and consistency. **Vault mode** emphasizes **trust**: local inference, tight egress controls, and a **hash-chained audit log** users can export—without overstating cryptographic guarantees.

We port the UX while replacing implicit “extended thinking” with a **versioned v2 JSON schema**, grounding Gemma with **deterministic CV signals** (EXIF, histograms, sharpness; faces optional per spike), and validating behavior via **spikes**: **Ollama** on desktop; **LiteRT** on Android if a capped spike passes; optional **llama.cpp** quantization appendix on Apple Silicon.

---

## Problem

Photographers produce huge volumes of images. Pros need **fast, repeatable feedback**; sensitive contexts need **local execution** and **traceability**. Cloud-only tools add latency, cost, residency concerns, and opaque outputs.

---

## Architecture

**Clients:** React + Vite web shell carried forward; **Electron** desktop for credible Studio and Vault demos with **Ollama** hosting **Gemma 4 E4B** locally.

**Routing:** Studio may allow explicit cloud endpoints only where the product allows; **Vault blocks cloud critique and optional cloud generation** at orchestration—not only in UI.

**Deterministic layer:** Structured grounding text (or compact JSON) appended to prompts so critique cites measurable signals where possible.

**Outputs:** **Schema v2** (see `docs/specs/02-output-schema.md`) migrates from Gemini-era v1 shapes while preserving UI concepts (scores, critique, overlays, mentor context).

**Vault audit:** append-only, hash-chained events plus export; honest threat model (no forensic-grade claims).

---

## How we use Gemma 4

1. **Local Ollama** for reproducible Gemma pulls and HTTP access from desktop.  
2. **Structured JSON** matching v2; client validation (e.g., Zod/Ajv) to catch drift.  
3. **Vision + principles-led prompts**; bounding boxes remain model-produced JSON unless spikes show CV assistance is required.  
4. **LiteRT** only after a pass/fail mobile spike; otherwise **PWA** remains the floor.

---

## Challenges

- **Schema parity:** Gemma stacks differ from Gemini `responseSchema`; conformance is **tested**, not assumed.  
- **Thinking UX:** prompt explicit observations, reasoning steps, and priority fixes—no hidden reasoning channel.  
- **Economics UI:** remap from Gemini token metadata to **Ollama usage when available**, else **honest estimates**—never fake precision.  
- **Vault honesty:** separate app-level blocking from OS verification guidance.

---

## Why these choices

**Ollama + Electron** gives judges a realistic local path. **Studio + Vault** covers **speed** and **trust**. Optional **llama.cpp** sweep adds rigor without blocking MVP.

---

## Offline Batch Reliability

Real field workflows need **offline batch processing**: analyze hundreds of photos without network, with checkpoint/resume for crash recovery.

**Design:** JSONL job queue (one job per line), sequential execution, checkpoint every 10-12 jobs. If interrupted (crash, power loss, user stop), resume from last checkpoint—no reprocessing.

**Metrics export:** CSV with tokens/sec, latency, TTFT, schema pass rate. Compare quantizations (Q4 vs Q5 vs Q8), measure Gemma performance over large datasets.

**Why it matters:** Pros process volumes; offline reliability builds trust. Checkpoint/resume prevents wasted work. Metrics inform tuning.

---

## Reproducibility (judges)

Clone the public repo, follow README for local Gemma + app run, compare outputs to **`docs/specs/02-output-schema.md`**.

---

## Closing

This is a **measured port** of a working coaching UX to **Gemma 4**: explicit schemas, deterministic grounding, and modes photographers actually need. The video demonstrates the experience; the repository proves the implementation.

---

_Trim in Kaggle’s editor to ≤1,500 words. Expand with concrete metrics (model id, latency, spike results) as implementation lands._
