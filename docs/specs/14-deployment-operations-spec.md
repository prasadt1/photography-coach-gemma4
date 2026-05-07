# 14. Deployment and Operations Spec

**Version:** 1.0
**Status:** Draft
**Dependencies:** 07-stack-and-runtime-mapping.md, 10-platform-shells-spec.md, 13-implementation-roadmap-spec.md
**Owner:** Spec Session Lead

---

## 1. Overview

This spec defines **deployment procedures and operational guidelines** for Photography Coach v2, including:

1. **Deployment procedures** - How to deploy web app, desktop app, iOS PWA
2. **Monitoring** - Health checks, error tracking, usage analytics
3. **Troubleshooting** - Common issues and solutions
4. **Updates** - How to ship updates post-launch
5. **Scaling** - Performance optimization for growing user base

**Operational Philosophy:** "Ship fast, monitor closely, fix quickly." Hackathon MVP prioritizes deployment speed over operational maturity. Post-MVP: iterate based on real user feedback.

---

## 2. Web App Deployment

### 2.1. Deployment Target: Vercel (Recommended)

**Why Vercel:**
- Free tier sufficient for MVP (100GB bandwidth/month)
- Automatic HTTPS
- Global CDN (fast load times worldwide)
- Git integration (deploy on push to main)

**Alternative:** Netlify, Cloudflare Pages, GitHub Pages (all work, similar features).

### 2.2. Deployment Steps

**Prerequisites:**
- GitHub repository public
- Vite build tested locally (`npm run build` succeeds)

**Vercel deployment:**
```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy (follow prompts)
vercel

# 4. Promote to production
vercel --prod

# Output: https://photography-coach-v2.vercel.app
```

**Automatic deployments:**
```bash
# Connect GitHub repo to Vercel dashboard
# Every push to main → automatic deploy
# Every PR → automatic preview deploy
```

### 2.3. Environment Variables

**Set in Vercel dashboard (Settings → Environment Variables):**

| Variable | Value | Purpose |
|----------|-------|---------|
| `VITE_OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint (users run locally) |
| `VITE_DEFAULT_MODE` | `studio` | Default mode selection |
| `VITE_ENABLE_IMAGE_GENERATION` | `true` | Enable Gemini image gen feature |

**Note:** These are build-time vars (baked into client bundle). No secrets exposed.

### 2.4. Custom Domain (Optional)

**Setup:**
1. Buy domain (e.g., photographycoach.ai)
2. Add domain in Vercel dashboard (Settings → Domains)
3. Update DNS records (CNAME → cname.vercel-dns.com)
4. Wait for SSL certificate (automatic, 5-10 minutes)

**Result:** `https://photographycoach.ai` → web app

---

## 3. Desktop App Distribution

### 3.1. Distribution Target: GitHub Releases

**Why GitHub Releases:**
- Free hosting (unlimited bandwidth)
- Version tracking (tag releases: v2.0.0, v2.0.1, etc.)
- Download analytics (GitHub tracks download counts)
- Automatic with electron-builder

**Alternative:** Self-hosted S3 + CloudFront, Dropbox public links (more control, costs money).

### 3.2. Release Procedure

**Step 1: Tag release**
```bash
# Create git tag
git tag v2.0.0
git push origin v2.0.0
```

**Step 2: Build packages**
```bash
# Build for all platforms
npm run electron:build

# Output:
# dist-electron/Photography-Coach-2.0.0-universal.dmg (macOS)
# dist-electron/Photography-Coach-Setup-2.0.0.exe (Windows)
# dist-electron/Photography-Coach-2.0.0.AppImage (Linux)
```

**Step 3: Create GitHub Release**
```bash
# Via GitHub CLI
gh release create v2.0.0 \
  --title "Photography Coach v2.0.0" \
  --notes "Initial release with Gemma 4 E4B support" \
  dist-electron/*.dmg \
  dist-electron/*.exe \
  dist-electron/*.AppImage
```

**Step 4: Announce**
- Update README.md with download links
- Post on social media (Twitter, LinkedIn)
- Notify hackathon judges (Discord, Slack)

### 3.3. Installation Instructions (User-Facing)

**macOS:**
```
1. Download Photography-Coach-2.0.0-universal.dmg
2. Open .dmg file
3. Drag Photography Coach to Applications folder
4. Launch from Applications
5. If "unidentified developer" warning: System Preferences → Security & Privacy → Open Anyway
```

**Windows:**
```
1. Download Photography-Coach-Setup-2.0.0.exe
2. Run installer
3. Follow prompts (default settings OK)
4. Launch from Start Menu
5. If SmartScreen warning: Click "More info" → "Run anyway"
```

**Linux:**
```
1. Download Photography-Coach-2.0.0.AppImage
2. Make executable: chmod +x Photography-Coach-2.0.0.AppImage
3. Run: ./Photography-Coach-2.0.0.AppImage
4. (Optional) Right-click → "Integrate and run" for system integration
```

---

## 4. iOS PWA Deployment

### 4.1. Deployment

**PWA uses same web app deployment** (Vercel/Netlify).

**Additional setup:**
- Ensure `manifest.json` in public/ folder (already in repo)
- Ensure service worker registered (sw.js)
- Test on iOS Safari (Add to Home Screen)

### 4.2. Installation Instructions (User-Facing)

**iOS (Safari):**
```
1. Open https://photography-coach-v2.vercel.app in Safari
2. Tap Share button (bottom middle)
3. Scroll down → tap "Add to Home Screen"
4. Tap "Add" (top right)
5. Icon appears on home screen
6. Launch like native app (no Safari chrome)
```

**Ollama access for iOS:**
```
1. Install Ollama on Mac/PC (same network as iPhone)
2. Configure Ollama IP in app settings (e.g., 192.168.1.100:11434)
3. Ensure Mac/PC and iPhone on same WiFi
```

---

## 5. Monitoring

### 5.1. Health Checks

**Web app:**
- Vercel dashboard shows deployment status (success/failure)
- Uptime monitoring: UptimeRobot (free, ping every 5 minutes)
- Alert on downtime (email, Slack webhook)

**Desktop app:**
- No central monitoring (runs on user's device)
- Encourage users to report issues via GitHub Issues

**Ollama dependency:**
- Users responsible for running Ollama locally
- Troubleshooting guide for "Ollama not running" error

### 5.2. Error Tracking (Post-MVP)

**Recommended: Sentry**
- Free tier: 5,000 errors/month
- Catches JavaScript errors, unhandled promise rejections
- Source maps for stack traces

**Setup:**
```typescript
// src/main.tsx
import * as Sentry from '@sentry/react';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: 'https://...@sentry.io/...',
    environment: 'production',
    release: 'photography-coach-v2@2.0.0'
  });
}
```

**Not required for hackathon MVP** (adds complexity). Defer to post-MVP.

### 5.3. Usage Analytics (Post-MVP)

**Recommended: Plausible Analytics**
- Privacy-friendly (GDPR compliant, no cookies)
- Free for <10k pageviews/month
- Simple dashboard (pageviews, bounce rate, top pages)

**Setup:**
```html
<!-- index.html -->
<script defer data-domain="photographycoach.ai" src="https://plausible.io/js/script.js"></script>
```

**Not required for hackathon MVP**. Defer to post-MVP.

---

## 6. Troubleshooting Guide

### 6.1. Common Issues (Web App)

#### Issue: "Ollama not running"

**Symptom:** Connection refused on localhost:11434

**Solution:**
```bash
# 1. Check if Ollama is running
curl http://localhost:11434/api/tags

# 2. If fails, start Ollama
ollama serve

# 3. Verify model installed
ollama list | grep gemma-4-e4b

# 4. If model missing, pull it
ollama pull gemma-4-e4b

# 5. Reload web app
```

#### Issue: "Model not found"

**Symptom:** HTTP 404 from Ollama API

**Solution:**
```bash
# Pull Gemma 4 E4B model
ollama pull gemma-4-e4b

# Verify
ollama list

# Reload app
```

#### Issue: "Analysis timeout"

**Symptom:** Analysis takes >30 seconds, times out

**Solution:**
1. Check system resources (RAM usage, CPU load)
2. Close other apps to free RAM
3. Try smaller image (<4K resolution)
4. Use faster quantization (Q4_K_M instead of Q8_0)

#### Issue: "Invalid JSON response"

**Symptom:** Schema validation fails after 3 retries

**Solution:**
1. Check Ollama logs: `ollama logs`
2. Try different photo (current photo may confuse model)
3. Report issue on GitHub with photo + error message

### 6.2. Common Issues (Desktop App)

#### Issue: "Network request blocked" (Vault Mode)

**Symptom:** Attempted cloud API call blocked by Electron

**Solution:**
- This is expected behavior (Vault Mode working correctly)
- Audit log records blocked request
- No action needed (feature, not bug)

#### Issue: "App won't open" (macOS)

**Symptom:** "Photography Coach is damaged and can't be opened"

**Solution:**
```bash
# Remove quarantine attribute
xattr -d com.apple.quarantine /Applications/Photography\ Coach.app

# Or: System Preferences → Security & Privacy → Open Anyway
```

#### Issue: "Audit log export fails"

**Symptom:** Save dialog doesn't appear

**Solution:**
1. Check file permissions (can app write to selected folder?)
2. Try different folder (Desktop, Documents)
3. Report issue on GitHub if persistent

### 6.3. Batch Processing Operations (Desktop Only)

#### How to start offline batch run

**Prerequisites:**
- Desktop app installed and running
- Ollama server running (`ollama serve`)
- Gemma 4 E4B model pulled (`ollama pull gemma-4-e4b`)
- Folder of photos prepared (JPEG/PNG)

**Steps:**
1. Open Desktop app
2. File menu → "Batch Analysis"
3. Select folder of photos
4. Configure:
   - Mode: Studio or Vault
   - Model: `gemma-4-e4b` (default)
   - Checkpoint cadence: 10-12 jobs (default)
   - Output folder: Where to save results
5. Click "Start Batch"
6. Monitor progress (X/N jobs completed, ETA)
7. Wait for completion (or interrupt and resume later)

**Output files:**
- `jobs.jsonl` - Input queue
- `results.jsonl` - Output log
- `checkpoint.json` - Resume state
- `metrics.csv` - Batch metrics
- `outputs/*.json` - Individual photo analyses (PhotoAnalysisV2)

#### How to inspect queue/checkpoint files

**Check batch progress:**
```bash
# Count total jobs
wc -l jobs.jsonl

# Count completed jobs
grep '"status":"completed"' results.jsonl | wc -l

# View checkpoint
cat checkpoint.json

# View last result
tail -1 results.jsonl | jq .
```

**Check metrics:**
```bash
# View metrics summary
cat metrics.csv | column -t -s,

# Calculate average latency
awk -F, 'NR>1 {sum+=$6; count++} END {print sum/count " ms"}' metrics.csv

# Calculate schema pass rate
awk -F, 'NR>1 {total++; if($7=="true") pass++} END {print pass/total*100 "%"}' metrics.csv
```

#### How to resume after interruption

**Scenario:** Batch run interrupted (app crash, user stop, power loss).

**Steps:**
1. Restart Desktop app
2. File menu → "Resume Batch"
3. Select batch folder (containing `checkpoint.json`)
4. App reads checkpoint, skips completed jobs
5. Click "Resume"
6. Processing continues from last checkpoint

**Verification:**
- Check `checkpoint.json` - shows last completed job_id
- Check `results.jsonl` - no duplicate job_ids
- Monitor progress - starts from checkpoint, not job 1

**Example:**
```bash
# Before interruption
cat checkpoint.json
# {"last_completed_job_id":"025","timestamp":"2026-05-15T11:30:45Z","total_jobs":100,"completed_jobs":25,"failed_jobs":0}

# After resume
tail -1 checkpoint.json
# {"last_completed_job_id":"100","timestamp":"2026-05-15T12:15:23Z","total_jobs":100,"completed_jobs":100,"failed_jobs":2}
```

#### Disk/memory guardrails and retention policy

**Disk space check:**
- Batch start fails if <5GB free disk space
- Error message: "Insufficient disk space. Free at least 5GB before starting batch."

**Memory limits:**
- Process one photo at a time (no batch loading)
- Free memory after each job (avoid leaks)
- Desktop app monitors RAM usage, warns if >80% consumed

**Retention policy:**
- Keep last 30 days of batch artifacts (default, configurable)
- Auto-cleanup runs on app start
- Files deleted: `jobs.jsonl`, `results.jsonl`, `checkpoint.json`, `metrics.csv`, `outputs/*.json`
- User can export metrics before cleanup

**Manual cleanup:**
```bash
# Delete old batches
find ~/PhotoCoach/batches -type d -mtime +30 -exec rm -rf {} \;

# Check disk usage
du -sh ~/PhotoCoach/batches

# Export metrics before cleanup
cp metrics.csv ~/Documents/batch-metrics-$(date +%Y%m%d).csv
```

**Vault Mode behavior:**
- Batch analysis allowed in Vault Mode (all local processing)
- Audit log records batch events: `batch_started`, `batch_checkpoint`, `batch_completed`
- No cloud endpoints called (network isolation enforced)
- Export audit log after batch run for compliance

---

## 7. Update Strategy

### 7.1. Web App Updates

**Automatic:** Deploy to Vercel → users get update on next page load.

**Cache busting:**
- Vite generates hashed filenames (e.g., `index-abc123.js`)
- Old cached files ignored automatically

**Breaking changes:**
- If schema changes (v2.0 → v2.1), warn users in README
- Add migration guide if needed

### 7.2. Desktop App Updates

**Manual (MVP):** Users download new version from GitHub Releases.

**Automated (post-MVP):**
- Use electron-updater (built into electron-builder)
- Check for updates on app launch
- Prompt user: "Update available, download now?"
- Download + install in background, restart to apply

**Setup (post-MVP):**
```typescript
// electron/main.ts
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('update-downloaded', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: 'A new version has been downloaded. Restart to install?',
    buttons: ['Restart', 'Later']
  }).then(result => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});
```

---

## 8. Scaling Considerations

### 8.1. Current Architecture (MVP)

**No backend** - All processing client-side or local Ollama.

**Bottlenecks:**
1. **User's device performance** - Slow devices = slow analysis
2. **Ollama model size** - 4GB model download on first use
3. **IndexedDB storage** - Capped at ~50MB (browsers), limits session history

**Not a problem for MVP** (hackathon demo, <100 users).

### 8.2. Post-MVP Scaling

**If user base grows (>1,000 users):**

**Option 1: Cloud Ollama (Optional Fallback)**
- Deploy Ollama on cloud VM (AWS, GCP, Azure)
- Expose via HTTPS API (Ollama + nginx reverse proxy)
- Users without local Ollama can use cloud instance (Studio Mode only, not Vault)
- **Cost:** ~$50-100/month (VM + bandwidth)

**Option 2: Serverless Inference (Future)**
- Use Google Cloud Run + Gemma 4 E4B container
- Scale to zero when idle, scale up on demand
- Users pay per inference (pay-as-you-go)
- **Cost:** Variable (~$0.001 per analysis)

**Option 3: Hybrid (Recommended)**
- Default: Local Ollama (free, private)
- Fallback: Cloud Ollama for users without local setup (paid, convenience)
- Vault Mode: Always local (privacy guarantee)

---

## 9. Security Considerations

### 9.1. Web App Security

**HTTPS:** Enforced by Vercel (automatic SSL certificate).

**Content Security Policy (CSP):**
```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  connect-src 'self' http://localhost:11434 https://generativelanguage.googleapis.com;
">
```

**Rate limiting:** Not needed for MVP (no backend to abuse).

### 9.2. Desktop App Security

**Code signing (recommended, not required for hackathon):**
- macOS: Apple Developer ID certificate ($99/year)
- Windows: Code signing certificate (DigiCert, ~$200/year)
- Linux: No code signing required

**Without code signing:**
- macOS: "Unidentified developer" warning (users can bypass via System Preferences)
- Windows: SmartScreen warning (users can click "More info" → "Run anyway")
- Linux: No warnings

**Network isolation (Vault Mode):**
- Electron's `session.webRequest` API blocks non-localhost (cryptographic enforcement)
- Verified via Wireshark penetration test

### 9.3. Gemini API Key Storage

**Studio Mode (optional image generation):**
- User provides API key via settings
- Stored in IndexedDB (plaintext, not encrypted in MVP)
- **Post-MVP:** Encrypt API key using Web Crypto API before storing

**Vault Mode:**
- No Gemini API key (image generation disabled)
- No cloud services used

---

## 10. Backup and Recovery

### 10.1. User Data (Session History, Audit Logs)

**Storage:** IndexedDB (local, per-device).

**Backup strategy:**
1. **Export audit log** (Vault Mode): User clicks "Export Log" → saves JSON file
2. **Session history**: Not exported in MVP (post-MVP feature: export as CSV/JSON)

**Recovery:**
- If IndexedDB cleared (browser cache cleared), data lost
- Recommend users export audit logs after each Vault Mode session

### 10.2. Application State

**No persistent state on server** (stateless web app).

**Recovery:**
- Users can always re-deploy from GitHub repo
- Version tags preserve release history (v2.0.0, v2.0.1, etc.)

---

## 11. Operational Runbook

### 11.1. Deployment Checklist

**Pre-deployment:**
- [ ] All tests passing (`npm run test:unit`, `npm run test:integration`)
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Web app builds successfully (`npm run build`)
- [ ] Desktop app packages successfully (`npm run electron:build`)

**Deployment:**
- [ ] Push to GitHub main branch (triggers Vercel deploy)
- [ ] Create GitHub Release with tag (vX.Y.Z)
- [ ] Upload desktop app packages to GitHub Release
- [ ] Update README.md with download links
- [ ] Announce on social media

**Post-deployment:**
- [ ] Verify web app loads (check Vercel URL)
- [ ] Download + test desktop app (macOS, Windows, Linux)
- [ ] Check GitHub Release page (downloads working?)
- [ ] Monitor error logs (Sentry, if enabled)

### 11.2. Rollback Procedure

**Web app:**
```bash
# Rollback to previous Vercel deployment
vercel rollback

# Or: Deploy specific commit
git checkout v2.0.0
vercel --prod
```

**Desktop app:**
```bash
# Unpublish GitHub Release (if broken)
gh release delete v2.0.1

# Users can download previous version (v2.0.0)
```

### 11.3. Incident Response

**Critical incident (app completely broken):**
1. **Assess:** What's broken? (web app down? desktop app won't launch?)
2. **Rollback:** Revert to last known good version (see 11.2)
3. **Notify:** Post status update (GitHub README, social media)
4. **Fix:** Investigate root cause, apply fix, deploy
5. **Post-mortem:** Document incident, prevent recurrence

**Non-critical issue (minor bug):**
1. Create GitHub Issue (user reports or internal discovery)
2. Triage (P0: critical, P1: important, P2: nice-to-have)
3. Schedule fix (next release, post-MVP, won't-fix)
4. Deploy fix in next release

---

## 12. Post-Launch Roadmap

### 12.1. Short-Term (Week 1-2)

**User feedback:**
- Monitor GitHub Issues (bug reports, feature requests)
- Engage with hackathon judges (answer questions, clarifications)
- Fix critical bugs (P0: blocks core functionality)

**Quick wins:**
- Add histogram chart (if not in MVP)
- Improve error messages (based on user feedback)
- Optimize CV performance (if users report slowness)

### 12.2. Medium-Term (Month 1-3)

**Feature additions:**
- iOS native app (if Spike 3 passed)
- Parallel batch processing (multi-worker, replace single-worker MVP)
- Session history export (CSV/JSON)
- API key encryption (Web Crypto API)

**Quality improvements:**
- Unit test coverage 90%+
- E2E test coverage for critical paths
- Documentation (user guide, developer guide)

### 12.3. Long-Term (Month 3+)

**Platform expansion:**
- Android app (React Native or PWA)
- Cloud Ollama (optional fallback for users without local setup)
- Self-hosted option (Docker image for privacy-conscious users)

**Advanced features:**
- Portfolio review (analyze entire folder, generate report)
- Style transfer (learn from user's favorite photos)
- Multi-language support (Spanish, French, German, etc.)

---

## 13. Success Criteria

**This deployment/operations spec succeeds if:**

1. ✅ Web app deploys to Vercel (public URL accessible)
2. ✅ Desktop app packages for macOS/Windows/Linux (downloadable from GitHub Releases)
3. ✅ iOS PWA installable (Add to Home Screen works)
4. ✅ Troubleshooting guide covers common issues (users can self-serve)
5. ✅ Update strategy defined (web auto-updates, desktop manual for MVP)
6. ✅ Monitoring setup (health checks, error tracking optional for MVP)
7. ✅ Operational runbook complete (deployment checklist, rollback procedure, incident response)

---

## 14. Summary

This spec defines **deployment and operations** for Photography Coach v2:

**Deployment:**
- **Web app:** Vercel (automatic HTTPS, global CDN, git integration)
- **Desktop app:** GitHub Releases (tag vX.Y.Z, upload packages, announce)
- **iOS PWA:** Same as web app (Add to Home Screen for installation)

**Monitoring:**
- Health checks (UptimeRobot, free)
- Error tracking (Sentry, optional post-MVP)
- Usage analytics (Plausible, optional post-MVP)

**Troubleshooting:**
- Common issues documented (Ollama not running, model not found, timeouts)
- User-facing solutions (clear steps, no jargon)

**Updates:**
- Web app: Automatic (deploy to Vercel)
- Desktop app: Manual download (MVP), auto-update (post-MVP via electron-updater)

**Scaling:**
- MVP: Local-only (no backend, no bottlenecks)
- Post-MVP: Optional cloud Ollama fallback for users without local setup

**Operations:**
- Deployment checklist (pre-flight, deployment, post-deployment)
- Rollback procedure (Vercel rollback, GitHub Release unpublish)
- Incident response (assess → rollback → notify → fix → post-mortem)

**Post-launch roadmap:**
- Short-term: Fix bugs, quick wins (histogram, error messages)
- Medium-term: iOS native, batch analysis, history export
- Long-term: Android, cloud fallback, portfolio review

---

**End of 14-deployment-operations-spec.md**

**Tier 4 Complete. All 14 specs created (00-14). Ready for review.**
