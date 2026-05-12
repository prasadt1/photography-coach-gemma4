# Manual Test Checklist — Day 4

**Date:** 2026-05-07  
**Spec:** `13-implementation-roadmap-spec.md §6.2`, `10-platform-shells-spec.md §8`  
**Status:** IN PROGRESS

---

## Prerequisites

- [ ] `ollama serve` running on localhost:11434
- [ ] `gemma4:latest` model pulled (`ollama pull gemma4`)
- [ ] Web app running: `npm run start` (http://localhost:3000)
- [ ] Desktop app built: `dist-electron/Photography Coach-1.0.0-arm64.dmg`

---

## P-1: Web App — Studio Mode Happy Path

**Test case from spec §8.1**

Steps:
1. Open http://localhost:3000 in Chrome
2. Observe: Ollama status indicator shows ✅ connected
3. Select Studio Mode from ModeSelector
4. Upload a portrait photo (drag-drop or click)
5. Wait for Gemma 4 analysis to complete
6. View results: scores, rationale, evidence

Expected:
- [ ] Analysis completes without error
- [ ] Scores display (0–10 range) for all 5 axes
- [ ] Rationale tab shows observations + priorityFixes
- [ ] Evidence panel shows EXIF / CV data
- [ ] Session history updates in sidebar

**Result:** ___________  
**Notes:** ___________

---

## P-1b: Web App — Refusal for Medical Imagery

Steps:
1. Upload a medical X-ray or non-photographic image
2. Wait for Gemma 4 response

Expected:
- [ ] RefusalMessage component appears (not a blank/error screen)
- [ ] Refusal category shown (e.g., `MEDICAL_CONTENT` or `NOT_PHOTOGRAPHY`)
- [ ] "On-device processing" notice visible

**Result:** ___________  
**Notes:** ___________

---

## P-2: Desktop App — Vault Mode Happy Path

**Test case from spec §8.1 — P-2**

Steps:
1. Open `dist-electron/Photography Coach-1.0.0-arm64.dmg`
2. Install and launch the app
3. App opens in Studio Mode by default
4. Use menu or ModeSelector to switch to Vault Mode
5. Observe: VaultModeBanner appears at top ("🔒 Vault Mode Active")
6. Upload a photo and wait for analysis
7. Click "View Audit Log" in VaultModeBanner
8. Observe: AuditLogPanel shows events with hash values
9. Click "Verify Chain" — expect: ✅ chain valid
10. Click "Export Log" — native save dialog appears

Expected:
- [ ] App launches without crash
- [ ] VaultModeBanner visible in Vault Mode
- [ ] Analysis completes (Ollama on same machine)
- [ ] Audit log shows ≥1 entry after analysis
- [ ] "Verify Chain" returns valid
- [ ] "Export Log" opens native save dialog

**Vault Mode network isolation test:**
11. While in Vault Mode, attempt any action that would call a cloud API
12. Expected: call is blocked, console logs `[Vault Policy] BLOCKED → ...`

**Result:** ___________  
**Notes:** ___________

---

## P-3: iOS PWA — Install to Home Screen

Steps:
1. Connect iPhone to same WiFi as Mac
2. Find Mac's local IP: `ipconfig getifaddr en0`
3. Open Safari on iPhone → http://<mac-ip>:3000
4. Tap Share → "Add to Home Screen"
5. Launch from home screen icon

Expected:
- [ ] App opens in full-screen standalone mode (no Safari chrome)
- [ ] App title "Photography Coach" shows on home screen
- [ ] ModeSelector visible on launch
- [ ] Ollama health check fails with instructions (remote Ollama not configured)

**Result:** ___________  
**Notes:** ___________

---

## Automated Test Results

| Suite | Tests | Status |
|---|---|---|
| Unit (`npm run test:unit`) | 49 | ✅ PASS |
| Integration (`npm run test:integration`) | 5 | ✅ PASS |
| E2E (`npm run test:e2e`) | — | PENDING |

---

## Known Issues / Bugs

| ID | Severity | Description | Status |
|---|---|---|---|
| B-1 | Low | `index.css` not found at build time (Vite warning) | Documented — runtime resolve |
| B-2 | Low | Large bundle warning (852 kB) — code splitting not yet applied | Deferred post-MVP |
| B-3 | Info | `sharp` excluded from Electron bundle (server-only, not needed in renderer) | Fixed |

---

## Sign-off

- [ ] P-1 Studio Mode: PASS
- [ ] P-1b Refusal: PASS  
- [ ] P-2 Vault Mode: PASS
- [ ] P-3 iOS PWA: PASS / DEFERRED
- [ ] All automated tests: PASS
- [ ] No blocking bugs remaining
