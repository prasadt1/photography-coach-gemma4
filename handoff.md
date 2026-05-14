# L.E.N.S. Photography Coach — Session Handoff

## Goal

Building **L.E.N.S. (Local Edge Native Studio)** — an AI photography coach for the **Gemma 4 Good Hackathon** (Kaggle, $100k+ prize pool). The app provides instant photo feedback using Gemma 4 running locally via Ollama. Three modes: Studio (full critique), Quest (daily challenges), Artisan (product photos for sellers). **Deadline: May 18, 2026.**

---

## Latest Session: May 14, 2026 — Ollama Cloud Fallback

### Summary
Implemented **Ollama Cloud fallback** so the Vercel live demo can perform REAL Gemma 4 analysis when local Ollama isn't available.

### Completed ✅

1. **3-Tier Inference Fallback System**
   | Priority | Source | When Used |
   |----------|--------|-----------|
   | 1 | Local Ollama | localhost only (dev environment) |
   | 2 | Ollama Cloud | Deployed sites (Vercel) via `/api/analyze` |
   | 3 | Demo Mode | Fallback with canned responses |

2. **Vercel Serverless API Route** (`api/analyze.ts`)
   - Proxies requests to `https://ollama.com/api/chat`
   - Uses `gemma4` model (vision-capable)
   - Auth via `OLLAMA_API_KEY` Bearer token

3. **UI Inference Source Badges**
   - 🟢 Green: "Local · Private"
   - 🔵 Blue: "Cloud · Real Gemma 4"
   - ⚪ Gray: "Demo"

4. **SellMode (Artisan Studio) Updates**
   - Shows BOTH upload button AND demo samples when cloud available
   - Demo samples ALWAYS use canned responses (instant)
   - Upload uses cloud fallback chain

5. **Mixed Content Fixes**
   - `checkOllamaHealth()` skips on deployed sites
   - `analyzePhotoWithFallback()` skips local path on deployed sites
   - No more HTTP→HTTPS errors

### Files Modified This Session

| File | Changes |
|------|---------|
| `api/analyze.ts` | **NEW** — Vercel serverless function for Ollama Cloud |
| `services/ollamaService.ts` | Added `detectInferenceSource()`, `analyzePhotoWithFallback()`, `checkCloudAvailability()`, skip local on deployed |
| `services/analysisOrchestrator.ts` | Added `analyzeForSellModeWithFallback()`, exports |
| `config.ts` | Added `OLLAMA_CLOUD_CONFIG`, `InferenceSource` type |
| `components/SellMode.tsx` | Uses fallback chain, shows source badges, updated layout |
| `components/HomePage.tsx` | Shows inference source badge |
| `vercel.json` | Updated rewrites for API routes |

---

## Vercel Environment Variables

| Variable | Required | Value |
|----------|----------|-------|
| `OLLAMA_API_KEY` | ✅ Yes | API key from ollama.com/settings/keys |
| `OLLAMA_CLOUD_MODEL` | Optional | Default: `gemma4` |

**User has Ollama Pro account ($20/month) and API key is set in Vercel.**

---

## Current Status

### Working ✅
- Demo sample thumbnails → canned responses
- Inference source detection and badges
- Mixed Content errors eliminated
- Build compiles successfully
- Last commit pushed: `4eb1da3`

### Pending Verification ⏳

**Last deployment was fixing vercel.json runtime error. Need to verify:**

1. Vercel deployment succeeded
2. `/api/analyze` health check returns 200:
   ```bash
   curl -X POST https://lens-app-gemma4.vercel.app/api/analyze \
     -H "Content-Type: application/json" \
     -d '{"healthCheck": true}'
   ```
   Expected: `{"status":"ok","cloudConfigured":true,"model":"gemma4",...}`

3. Uploading a photo triggers real Gemma 4 analysis via cloud

---

## Debugging Guide

### If cloud upload fails:

1. **Check Vercel Function Logs:**
   - Vercel Dashboard → Project → Logs tab
   - Look for `/api/analyze` requests

2. **Common error codes from API:**
   - `NO_API_KEY` — OLLAMA_API_KEY not set in Vercel
   - `INVALID_API_KEY` — Wrong API key
   - `MODEL_NOT_FOUND` — Try different model: `gemma3:27b`, `llama3.2-vision`
   - `CLOUD_ERROR` — Check details in logs

3. **Test health check manually** (curl command above)

---

## Architecture Reference

### Inference Flow (Deployed Site)
```
User uploads photo
  → SellMode.tsx handleFileChange()
    → analyzeForSellModeWithFallback() [analysisOrchestrator.ts]
      → analyzePhotoWithFallback() [ollamaService.ts]
        → (deployed) analyzePhotoCloud()
          → fetch('/api/analyze')
            → api/analyze.ts
              → fetch('https://ollama.com/api/chat')
              → Response
```

### Demo Sample Flow (Always Canned)
```
User clicks demo thumbnail
  → handleDemoSampleSelect()
    → sample.response (from DEMO_RESPONSES)
    → No API call, instant
```

---

## Key Decisions Made

1. **Demo samples always use canned responses** — Consistent, instant demos regardless of cloud state

2. **Upload uses cloud when available** — Real Gemma 4 analysis for judges to test

3. **Ollama Cloud model: `gemma4`** — Vision-capable, matches local Gemma 4 E4B

4. **API endpoint: `https://ollama.com/api/chat`** — Same format as local Ollama

5. **Skip local Ollama on deployed sites** — Prevents Mixed Content errors

---

## Previous Session Work (Still Valid)

- ✅ HomePage styling (voice preview, connection animation)
- ✅ QuestMode UX (offline lock, segmented progress, challenge icons)
- ✅ Studio Mode demo prep (sample selection, compare layout)
- ✅ ModeSelector polish (tech keyword highlighting)
- ✅ Voice feedback via Web Speech API

---

## Next Steps

### Immediate (Verify Cloud):
1. Check Vercel deployment succeeded
2. Test `/api/analyze` health check
3. Upload a photo and verify cloud analysis works
4. Check voice mode speaks cloud results

### Pre-Submission:
1. Record 3-minute demo video
2. Finalize Kaggle writeup (≤1,500 words)
3. Test on mobile browser

---

## Commands

```bash
# Start dev server
npm start

# Check TypeScript
npx tsc --noEmit

# Build for production
npm run build

# Check Ollama status (local)
ollama list

# Test API health check
curl -X POST https://lens-app-gemma4.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"healthCheck": true}'
```

---

## Important Files

| File | Purpose |
|------|---------|
| `api/analyze.ts` | Vercel serverless function for cloud |
| `services/ollamaService.ts` | All Ollama/cloud inference logic |
| `config.ts` | Environment detection, cloud config |
| `components/SellMode.tsx` | Artisan Studio with fallback |
| `docs/kaggle-rubric.md` | Judging criteria |
| `docs/demo-video-script.md` | Video structure |

---

## Hackathon Context

- **70% of score** from video (Impact 40pts + Video Pitch 30pts)
- **Ollama Special Track** ($10k) requires LOCAL inference
- Main track allows cloud Gemma
- Live Demo URL proves it's real; video is primary evaluation
- Machine: Apple M4, 16GB RAM
