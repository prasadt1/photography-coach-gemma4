# 13. Implementation Roadmap Spec

**Version:** 1.0
**Status:** Draft
**Dependencies:** All prior specs (00-12)
**Owner:** Spec Session Lead

---

## 1. Overview

This spec defines the **implementation roadmap** for Photography Coach v2 (Gemma 4 Edition) hackathon submission, including:

1. **Timeline** - 5-day sprint (Day 1-5, deadline May 19, 2026)
2. **Milestones** - Critical path checkpoints with deliverables
3. **Task breakdown** - Granular tasks per component/service
4. **Dependencies** - What blocks what, parallel work opportunities
5. **Risk mitigation** - Contingency plans for spike failures

**Hackathon Constraint:** Deadline is **May 19, 2026**. All work must complete in 5 days. Prioritize MVP completeness over polish.

---

## 2. Timeline Overview

### 2.1. 5-Day Sprint

```
Day 1 (May 15): Spikes + Foundation
Day 2 (May 16): Core Services
Day 3 (May 17): UI + Integration
Day 4 (May 18): Platform Builds + Testing
Day 5 (May 19): Polish + Submission
```

### 2.2. Daily Milestones

| Day | Milestone | Deliverables | Success Criteria |
|-----|-----------|--------------|------------------|
| Day 1 | Foundation + Spikes | Spike 1/2 complete, services skeleton | 5/5 photos validate, Ollama integration working |
| Day 2 | Core Services | ollamaService, cvService, validationService complete | Analysis pipeline end-to-end functional |
| Day 3 | UI + Integration | Web app UI complete, desktop app scaffold | Studio Mode works, Vault Mode banner visible |
| Day 4 | Platform Builds | Desktop app packaged, iOS PWA tested | All platforms build successfully |
| Day 5 | Submission | Demo video, writeup, repo cleaned | Submission ready by EOD |

---

## 3. Day 1: Foundation + Spikes (May 15)

### 3.1. Morning: Spike 1 - Gemma via Ollama (4 hours, BLOCKING)

**Owner:** Lead dev
**Time box:** 09:00-13:00
**Dependencies:** None (start immediately)

**Tasks:**
1. **Setup Ollama** (30 min)
   - Install Ollama: `brew install ollama` (macOS)
   - Start server: `ollama serve`
   - Pull model: `ollama pull gemma-4-e4b`
   - Verify: `curl http://localhost:11434/api/tags`

2. **Test structured output** (1 hour)
   - Send test prompt to Ollama API
   - Check if native JSON schema enforcement available
   - Document API response format (token counts available?)
   - Test image encoding (base64 inline? separate input?)

3. **Validate 5 test photos** (2 hours)
   - Photos: sample-portrait, sample-landscape, sample-macro, blown-highlights, medical-xray
   - For each: send prompt → parse response → validate schema
   - Record: schema valid? axis scores? latency?
   - Compare scores to Gemini baseline (must be within ±2 points)

4. **Go/no-go decision** (30 min)
   - Review results: 5/5 photos validate? Scores acceptable?
   - **If pass:** Proceed to Day 2 implementation
   - **If fail:** Apply fallback (Option A: prompt iteration +2h, OR Option B: scope reduction)

**Deliverables:**
- `spike-1-results.md` (summary report)
- `spike-1-validation.json` (5 photo outputs)
- `spike-1-comparison.csv` (Gemini vs Gemma scores)

### 3.2. Afternoon: Spike 2 - Cactus (2 hours, OPTIONAL)

**Owner:** Lead dev
**Time box:** 14:00-16:00
**Dependencies:** Spike 1 complete

**Tasks:**
1. Review Cactus documentation (1 hour)
2. Compare API surface to Ollama (30 min)
3. Assess performance claims (30 min)
4. **Decision:** Use Cactus? (If yes: update 07-stack-and-runtime-mapping.md)

**Deliverables:**
- `spike-2-results.md` (decision + rationale)

### 3.3. Late Afternoon: Service Skeleton (2 hours)

**Owner:** Lead dev
**Time box:** 16:00-18:00
**Dependencies:** Spike 1 complete

**Tasks:**
1. Create service files:
   - `src/services/ollamaService.ts` (skeleton functions)
   - `src/services/cvService.ts` (skeleton functions)
   - `src/services/validationService.ts` (Zod schema from 02-output-schema.md)
   - `src/services/auditService.ts` (skeleton functions)

2. Set up project structure:
   - `src/types.ts` (add PhotoAnalysisV2 interface)
   - `src/config.ts` (Ollama base URL, model ID)

3. Wire up basic data flow:
   - App.tsx → ollamaService.analyzePhoto() → console.log result

**Deliverables:**
- Services skeleton compiles (TypeScript no errors)
- Basic Ollama call works (console.log shows JSON response)

---

## 4. Day 2: Core Services (May 16)

### 4.1. Morning: CV Service (4 hours)

**Owner:** Dev 1
**Time box:** 09:00-13:00
**Dependencies:** Day 1 complete

**Tasks:**
1. **EXIF extraction** (1 hour)
   - Implement `extractEXIF()` using exif-js
   - Test on sample images (JPEG with EXIF, PNG without)
   - Handle missing EXIF gracefully

2. **Histogram analysis** (1.5 hours)
   - Implement `analyzeHistogram()` (luminance histogram, clipping detection)
   - Test on blown-highlights.jpg and crushed-shadows.jpg
   - Verify clipping detection accuracy

3. **Focus map** (1.5 hours)
   - Implement `generateFocusMap()` (Laplacian variance on 10×10 grid)
   - Test on sharp center / blurred edges image
   - Verify peak region detection

**Deliverables:**
- `cvService.ts` complete (EXIF, histogram, focus map functional)
- Unit tests pass (90% coverage)

### 4.2. Afternoon: Ollama Service + Validation (4 hours)

**Owner:** Dev 2
**Time box:** 14:00-18:00
**Dependencies:** Spike 1 complete

**Tasks:**
1. **Ollama integration** (2 hours)
   - Implement `analyzePhoto()` (build prompt, call Ollama, parse response)
   - Inject CV data into prompt (EXIF + histogram summary)
   - Handle retries (max 3 attempts, exponential backoff)

2. **Validation service** (1.5 hours)
   - Implement `validatePhotoAnalysisV2()` (Zod validation from 09-validation-and-error-handling-spec.md)
   - Handle refusal mode (is_refusal: true, empty arrays allowed)
   - Test on valid, invalid, and refusal cases

3. **Integration test** (30 min)
   - Run full pipeline: image → cvService → ollamaService → validation → result
   - Verify: schema valid, scores reasonable, evidence present

**Deliverables:**
- `ollamaService.ts` complete (analysis pipeline functional)
- `validationService.ts` complete (100% validation coverage)
- Integration test passes

---

## 5. Day 3: UI + Integration (May 17)

### 5.1. Morning: UI Adaptations (4 hours)

**Owner:** Dev 1
**Time box:** 09:00-13:00
**Dependencies:** Day 2 services complete

**Tasks:**
1. **Update AnalysisResults** (2 hours)
   - Replace `thinking` with `rationale` (observations, reasoningSteps, priorityFixes)
   - Add evidence display section
   - Add refusal detection → RefusalMessage component

2. **New components** (2 hours)
   - Implement RefusalMessage (category-specific messages)
   - Implement ModeSelector (Studio vs Vault cards)
   - Implement VaultModeBanner (top banner for Vault Mode)

**Deliverables:**
- AnalysisResults updated for v2 schema
- RefusalMessage, ModeSelector, VaultModeBanner components complete

### 5.2. Afternoon: Audit Service + Vault Mode (4 hours)

**Owner:** Dev 2
**Time box:** 14:00-18:00
**Dependencies:** Day 2 services complete

**Tasks:**
1. **Audit logging** (2 hours)
   - Implement `appendEvent()` (hash chain logic from 08-vault-mode-spec.md)
   - Implement `verifyAuditLog()` (hash chain verification)
   - Implement `exportJSON()` (audit log export)
   - Store in IndexedDB (using `idb` library)

2. **Vault Mode UI** (2 hours)
   - Implement AuditLogPanel (view events, verify chain, export)
   - Wire up VaultModeBanner buttons (onViewAuditLog, onExportLog)
   - Test audit log flow: upload photo → events logged → verify → export

**Deliverables:**
- `auditService.ts` complete (hash chain functional)
- AuditLogPanel complete
- Vault Mode end-to-end functional (banner + audit log)

---

## 6. Day 4: Platform Builds + Testing (May 18)

### 6.1. Morning: Desktop App (4 hours)

**Owner:** Dev 1
**Time box:** 09:00-13:00
**Dependencies:** Day 3 complete

**Tasks:**
1. **Electron setup** (1 hour)
   - Create `electron/main.ts` (main process from 10-platform-shells-spec.md)
   - Create `electron/vault-policy.ts` (network isolation)
   - Configure electron-builder.json

2. **Network isolation** (1.5 hours)
   - Implement Vault Mode network policy (block non-localhost)
   - Test: attempt external API call → verify blocked
   - Verify audit log records blocked requests

3. **Build packages** (1.5 hours)
   - Build for macOS: `npm run electron:build:mac`
   - Build for Windows (if cross-compile setup): `npm run electron:build:win`
   - Build for Linux: `npm run electron:build:linux`
   - Test: install .dmg on macOS, launch app, verify works

**Deliverables:**
- Desktop app builds successfully (macOS, Windows, Linux)
- Network isolation works (Wireshark test passes)
- `.dmg`, `.exe`, `.AppImage` files ready for distribution

### 6.2. Afternoon: Testing + Bug Fixes (4 hours)

**Owner:** Dev 2
**Time box:** 14:00-18:00
**Dependencies:** Day 4 morning complete

**Tasks:**
1. **Run test suite** (1 hour)
   - Unit tests: `npm run test:unit`
   - Integration tests: `npm run test:integration`
   - E2E tests: `npm run test:e2e`
   - Fix any failures

2. **Manual testing** (2 hours)
   - Web app: Studio Mode happy path (upload → analyze → view results)
   - Web app: Refusal for medical imagery
   - Desktop app: Vault Mode happy path (upload → analyze → audit log → export)
   - iOS PWA: Install to home screen, test with remote Ollama

3. **Bug fixes** (1 hour)
   - Triage critical bugs (blocks core functionality)
   - Fix or document as known issues

**Deliverables:**
- All tests passing (or failures documented)
- Critical bugs fixed
- Manual test checklist complete

### 6.3. Evening: Spike 3 - LiteRT iOS (6 hours, OPTIONAL)

**Owner:** Dev 2
**Time box:** 18:00-24:00
**Dependencies:** Day 4 afternoon complete

**Tasks:**
1. Review LiteRT documentation (1 hour)
2. Attempt to load Gemma 4 E4B model on iOS device (2 hours)
3. Test end-to-end inference (2 hours)
4. **Decision:** Include iOS native in submission? (1 hour)

**Deliverables:**
- `spike-3-results.md` (pass/fail + rationale)
- If pass: iOS native prototype (stretch goal, not blocking)

### 6.4. Evening: Batch Processing (3 hours, OPTIONAL)

**Owner:** Dev 1
**Time box:** 19:00-22:00
**Dependencies:** Day 4 morning complete (Desktop app working)

**Tasks:**
1. **Define JSONL schema** (30 min)
   - Document job schema fields: `job_id`, `photo_path`, `mode`, `model`, `status`, `retries`, timestamps, `output_path`
   - Document result schema: `job_id`, `status`, `output_path`, `tokens`, `latency_ms`, `timestamp`
   - Document checkpoint schema: `last_completed_job_id`, `timestamp`, `total_jobs`, `completed_jobs`, `failed_jobs`

2. **Implement batchService.ts** (1.5 hours)
   - Implement `enqueueJob()` - append job to `jobs.jsonl`
   - Implement `processQueue()` - sequential worker, checkpoint every 10-12 jobs
   - Implement `resumeFromCheckpoint()` - load checkpoint, skip completed jobs
   - Implement `exportMetrics()` - generate `metrics.csv` (tokens/sec, TTFT, latency, schema pass rate)

3. **Crash recovery test** (1 hour)
   - Create test batch (20 photos)
   - Start batch run
   - Interrupt after 8 jobs (kill process)
   - Restart batch runner
   - **Acceptance criteria:** Resumes from job 9, completes remaining 12, no duplicates, checkpoint updated

**Deliverables:**
- `src/services/batchService.ts` complete
- JSONL schema documented in `docs/batch-schema.md`
- Crash recovery test passes
- Batch UI in Desktop app (simple progress bar)

**If time runs out:** Defer to post-MVP. Batch processing is enhancement, not blocking.

---

## 7. Day 5: Polish + Submission (May 19)

### 7.1. Morning: Demo Video (3 hours)

**Owner:** Lead dev
**Time box:** 09:00-12:00
**Dependencies:** Day 4 complete

**Tasks:**
1. **Script demo** (30 min)
   - Outline: intro → Studio Mode demo → Vault Mode demo → key differentiators → call to action
   - Keep under 5 minutes (hackathon judges have limited time)

2. **Record demo** (1.5 hours)
   - Screen record: web app Studio Mode (upload portrait → show results → highlight Gemma 4 E4B)
   - Screen record: desktop app Vault Mode (upload confidential photo → show network isolation → export audit log)
   - Record voiceover (or use text overlays if no mic)

3. **Edit video** (1 hour)
   - Cut to key moments (no dead air)
   - Add captions/annotations
   - Export 1080p MP4

**Deliverables:**
- Demo video (4-5 minutes, <50MB)
- Upload to YouTube (unlisted) or include in repo

### 7.2. Midday: Writeup (3 hours)

**Owner:** Dev 2
**Time box:** 12:00-15:00
**Dependencies:** None (can run in parallel with video)

**Tasks:**
1. **README.md** (1 hour)
   - Project description (what is Photography Coach v2?)
   - Key features (Gemma 4 E4B, Vault Mode, CV grounding)
   - Installation instructions (web app, desktop app, Ollama setup)
   - Screenshots (Studio Mode analysis, Vault Mode banner, refusal message)

2. **HACKATHON_SUBMISSION.md** (1.5 hours)
   - Challenge alignment (why Gemma 4 E4B? why this problem?)
   - Architecture overview (diagram from 06-architecture-spec.md)
   - Technical highlights (network isolation, audit logging, evidence linking)
   - Spike results (Spike 1/2/3/4 outcomes)
   - Future roadmap (iOS native, quantization tuning, additional features)

3. **Codebase cleanup** (30 min)
   - Remove commented-out code
   - Remove console.log statements
   - Ensure all TypeScript compiles (no errors)
   - Format code: `npm run format`

**Deliverables:**
- README.md complete (installation + usage instructions)
- HACKATHON_SUBMISSION.md complete (technical narrative)
- Codebase clean (no obvious cruft)

### 7.3. Afternoon: Submission (3 hours)

**Owner:** Lead dev
**Time box:** 15:00-18:00
**Dependencies:** Video + writeup complete

**Tasks:**
1. **Final checklist** (30 min)
   - ✅ Web app deployed to Vercel/Netlify
   - ✅ Desktop app builds downloadable (GitHub Releases)
   - ✅ Demo video uploaded (YouTube link in README)
   - ✅ README + HACKATHON_SUBMISSION.md in repo
   - ✅ All specs (00-14) in docs/specs/
   - ✅ License file (MIT or Apache 2.0)

2. **Test submission materials** (1 hour)
   - Download desktop app from GitHub Releases → install → verify works
   - Visit deployed web app → verify loads
   - Watch demo video → verify audio/video quality

3. **Submit** (1.5 hours)
   - Submit to hackathon platform (form submission + repo link)
   - Post to social media (Twitter/LinkedIn) for visibility
   - Announce in hackathon Discord/Slack

**Deliverables:**
- Submission complete (confirmed by platform)
- Repo public and accessible
- Demo video live

---

## 8. Parallel Work Opportunities

### 8.1. Day 2 Parallelization

**Dev 1:** CV Service (EXIF, histogram, focus map)
**Dev 2:** Ollama Service + Validation
**Dependency:** None (independent work)

### 8.2. Day 3 Parallelization

**Dev 1:** UI Adaptations (AnalysisResults, RefusalMessage, ModeSelector)
**Dev 2:** Audit Service + Vault Mode UI
**Dependency:** Both need Day 2 services complete

### 8.3. Day 5 Parallelization

**Dev 1:** Demo video
**Dev 2:** Writeup
**Dependency:** None (independent work)

---

## 9. Risk Mitigation

### 9.1. Risk: Spike 1 Fails (Gemma quality insufficient)

**Probability:** Medium (20%)
**Impact:** HIGH (blocks entire project)

**Mitigation:**
- **Fallback Option A:** Prompt iteration (+2 hours, restructure prompts)
- **Fallback Option B:** Scope reduction (3 axes instead of 5, simplify CV layer)
- **Fallback Option C:** Hybrid architecture (Gemma for Vault, Gemini for Studio)
- **Timeline adjustment:** If Option A fails, move to Option B (same day). If Option B fails, pivot to Option C (adds 2 hours to Day 1).

### 9.2. Risk: Desktop App Build Issues

**Probability:** Medium (30%)
**Impact:** MEDIUM (blocks Vault Mode credibility claims)

**Mitigation:**
- Test Electron build early (Day 3 evening, not Day 4 morning)
- Have backup: package for macOS only (primary platform), defer Windows/Linux
- Document web app Vault Mode limitations if desktop fails

### 9.3. Risk: Scope Creep (Feature Additions)

**Probability:** High (50%)
**Impact:** MEDIUM (delays submission)

**Mitigation:**
- Strict "no new features after Day 3" rule
- Focus on core MVP: Studio Mode + Vault Mode + one platform (web or desktop)
- Nice-to-haves (iOS native, quantization tuning, histogram chart) are stretch goals

### 9.4. Risk: Integration Issues (Services Don't Connect)

**Probability:** Low (10%)
**Impact:** HIGH (blocks end-to-end functionality)

**Mitigation:**
- Integration test on Day 2 afternoon (catch issues early)
- Keep interfaces simple (avoid over-abstraction)
- Use TypeScript strictly (catch type mismatches at compile time)

---

## 10. Dependencies and Critical Path

### 10.1. Critical Path

```
Day 1 Morning: Spike 1 (BLOCKING)
  ↓
Day 1 Afternoon: Service Skeleton
  ↓
Day 2 Morning: CV Service
Day 2 Afternoon: Ollama Service + Validation
  ↓ (both must complete)
Day 3 Morning: UI Adaptations
Day 3 Afternoon: Audit Service + Vault Mode
  ↓ (both must complete)
Day 4 Morning: Desktop App Build
Day 4 Afternoon: Testing + Bug Fixes
  ↓
Day 5 Morning: Demo Video
Day 5 Midday: Writeup
Day 5 Afternoon: Submission
```

**Total critical path: ~36 hours of sequential work over 5 days.**

### 10.2. Non-Critical Path (Can Slip)

- Spike 2 (Cactus) - Optional, affects 07 only
- Spike 3 (LiteRT iOS) - Optional, Day 4 evening stretch goal
- Spike 4 (Quantization) - Optional, Day 5 if time permits
- Batch processing (batchService.ts) - Optional Day 4 evening, enhancement for offline workflows
- Histogram/Focus Map UI - Nice-to-have, can defer to post-MVP
- iOS PWA testing - Stretch goal, desktop + web are priorities

---

## 11. Success Criteria

**This roadmap succeeds if:**

1. ✅ Submission complete by May 19, 2026 EOD (deadline met)
2. ✅ Web app functional (Studio Mode works, analysis pipeline end-to-end)
3. ✅ Desktop app packaged (Vault Mode works, network isolation verified)
4. ✅ Demo video complete (4-5 minutes, showcases key differentiators)
5. ✅ Writeup complete (README + HACKATHON_SUBMISSION.md)
6. ✅ Spike 1 passes (5/5 photos validate, Gemma scores acceptable)
7. ✅ Critical path tasks complete (no blocking tasks skipped)

---

## 12. Summary

This spec defines the **5-day implementation roadmap** for Photography Coach v2:

**Day 1:** Spikes + Foundation (Spike 1 BLOCKING, service skeleton)
**Day 2:** Core Services (CV, Ollama, Validation complete)
**Day 3:** UI + Integration (Web app functional, audit logging works)
**Day 4:** Platform Builds + Testing (Desktop app packaged, tests passing)
**Day 5:** Polish + Submission (Demo video, writeup, submit by EOD)

**Critical path:** 36 hours of sequential work. Parallel work on Days 2, 3, 5 reduces wall-clock time.

**Risk mitigation:** Fallback paths for Spike 1 failure (prompt iteration → scope reduction → hybrid architecture).

**Success:** Submission complete by deadline, core MVP functional (Studio + Vault), demo video showcases key differentiators.

**Next:** Proceed to **14-deployment-operations-spec.md** for post-submission operations (if time permits).

---

**End of 13-implementation-roadmap-spec.md**
