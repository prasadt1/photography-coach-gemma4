# L.E.N.S. Photography Coach — Session Handoff

## Goal

Building **L.E.N.S. (Local Edge Native Studio)** — an AI photography coach for the **Gemma 4 Good Hackathon** (Kaggle, $100k+ prize pool). The app provides instant photo feedback using Gemma 4 running locally via Ollama. Three modes: Studio (full critique), Quest (daily challenges), Artisan (product photos for sellers). Deadline: May 18, 2026.

---

## Current State

**App is feature-complete and demo-ready.** All three modes functional with polished UI.

### Completed This Session:
- ✅ HomePage styling polishes (interactive voice preview, connection animation, card watermarks)
- ✅ QuestMode UX enhancements (offline lock state, segmented progress bar, challenge icons with pulse animation)
- ✅ Studio Mode demo prep (seamless sample selection with preview, dual-column compare layout, technical keyword highlighting)
- ✅ ModeSelector polish (Lock icon on Vault Mode, green highlighting for "Gemma 4 E4B", "Batch", "Gemini")
- ✅ Fixed QuestMode right navigation arrow (pointer-events-none on blur decoration)

### Key Architecture:
- React + TypeScript + Tailwind CSS
- Ollama for local Gemma 4 inference (~45s on M4 16GB)
- Optional Gemini API tier for faster cloud inference
- Voice feedback via Web Speech API (sentence-by-sentence to avoid Chrome truncation)
- Confetti celebrations in Quest Mode
- Studio → Sell mode image handoff ("Optimize for Marketplace" flow)

---

## Files in Flight

None — all changes committed to working state. TypeScript compiles cleanly.

---

## Changed This Session

| File | Changes |
|------|---------|
| `components/HomePage.tsx` | Voice preview click handler, connection state animation (1.5s loading), card background watermarks (Aperture/Target/Tag icons at 0.05 opacity) |
| `components/QuestMode.tsx` | Offline upload lock state (padlock icon, 40% opacity), segmented 7-block progress bar, challenge grid icons (Grid3X3, Route, Sunrise, etc.), TODAY card pulse animation |
| `components/ModeSelector.tsx` | `highlightTechKeywords()` function for green accent on tech terms, Lock icon next to "Vault Mode" title |
| `App.tsx` | Sample preview state (`samplePreview`), `handleSampleSelect()` / `handleAnalyzeSample()`, dual-column compare slots (`compareSlotA`/`compareSlotB`), 50/50 split layout for Compare tab |

---

## Failed Attempts

| Attempt | Issue | Resolution |
|---------|-------|------------|
| QuestMode right arrow not clickable | Background blur div (`bg-emerald-500/10 blur-3xl`) was intercepting clicks | Added `pointer-events-none` to decoration div + `relative z-10` to nav container |
| Unused imports after refactor | TypeScript errors for `Upload`, `handleSampleClick` | Removed unused code |

---

## Next Steps

### Immediate (Pre-Submission):
1. **Record 3-minute demo video** — Pre-record to control pacing; speed up "thinking" sections in post
2. **Add developer on-camera segment** — Judge tip: 10-15s of Prasad explaining impact
3. **Finalize Kaggle writeup** — ≤1,500 words, emphasize Gemma 4 features + local-first architecture

### Optional Enhancements:
- Add "Fast Mode" toggle using `gemma3:4b` for ~10-15s local inference
- Cached demo responses for instant playback during recording
- Get 1-2 real photographer quotes for video/writeup

---

## Key Context for Next Session

### Hackathon Strategy:
- **70% of score** comes from video (Impact 40pts + Video Pitch 30pts)
- **Ollama Special Track** ($10k) requires LOCAL inference — don't deploy exclusively to cloud
- Main track allows cloud Gemma, but local preserves eligibility for both tracks
- Judges watch video primarily; Live Demo URL just needs to prove it's real

### Machine Specs:
- Apple M4, 16GB RAM
- `gemma4:latest` (12B, 9.6GB) — memory-constrained, hence ~45s latency
- Options: pre-record video, use Gemini API for faster demo, or pull smaller model

### Important Files:
- `docs/kaggle-rubric.md` — Full judging criteria + judge tips from Glenn (Gemma PMM)
- `docs/demo-video-script.md` — 3-minute video structure
- `docs/claude-kaggle-writeup-draft.md` — Writeup draft

---

## Commands

```bash
# Start dev server
npm start

# Check TypeScript
npx tsc --noEmit

# Check Ollama status
ollama list

# Pull faster model (optional)
ollama pull gemma3:4b
```
