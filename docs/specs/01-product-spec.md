# 01-product-spec.md

**Spec Session:** Photography Coach v2 (Gemma 4 Edition)
**Author:** Claude (Spec Session Agent)
**Date:** 2026-05-06
**Dependencies:** 00-baseline-audit.md
**Status:** Tier 1 - Awaiting Review

---

## Executive Summary

Photography Coach v2 is a **tiered AI photography critique system** running **Gemma 4 E4B locally** via Ollama, with optional cloud generation and dual operational modes (Studio for throughput, Vault for confidentiality). The product differentiates on **two wedges**:

1. **Speed/Throughput** - Local inference with batch processing capabilities (Studio Mode)
2. **Confidentiality/Offline Trust** - Network-isolated analysis with audit logging (Vault Mode)

**Target Users:**
- Hobbyist photographers (free tier, web-only)
- Serious amateurs (Pro tier, desktop + iOS)
- Working professionals (Pro tier, Vault Mode, audit compliance)

**Submission Deadline:** May 19, 2026 01:59 GMT+2

**MVP Floor:** Web Studio Mode + Desktop Ollama integration + Vault demo slice + comparison narrative writeup.

---

## 1. Tiered Product Roadmap

### Tier Definitions

| Tier | Target User | Hardware Assumption | Core Features | Platform Support |
|------|-------------|---------------------|---------------|------------------|
| **Hobbyist** | Casual photographers learning basics | Browser-capable device (laptop/tablet/phone) | Web Studio Mode, 5-axis critique, spatial overlay, free mentor chat (5 turns) | Web only |
| **Serious Amateur** | Enthusiasts with portfolio goals | Desktop/laptop with 16GB+ RAM, iOS device | All Hobbyist + Desktop Ollama, iOS PWA, unlimited mentor chat, batch processing | Web + Desktop + iOS PWA |
| **Working Pro** | Professional photographers needing confidentiality | Desktop/laptop with 32GB+ RAM, dedicated GPU optional | All Serious Amateur + Vault Mode, audit log export, network egress verification, priority support | Desktop (Vault Mode) + Web (Studio Mode) |

---

### Tier × Mode Compatibility Matrix

| Mode | Hobbyist | Serious Amateur | Working Pro |
|------|----------|-----------------|-------------|
| **Studio Mode (Web)** | ✅ Full access | ✅ Full access | ✅ Full access |
| **Studio Mode (Desktop)** | ❌ Not available | ✅ Full access | ✅ Full access |
| **Vault Mode (Desktop)** | ❌ Not available | ❌ Not available | ✅ Full access |

**Note:** Vault Mode is Pro-only. Web-based Vault has limited credibility (egress harder to verify); desktop Vault is the credible MVP path.

---

## 2. Studio Mode Definition

### Purpose

Optimize for **speed and throughput** when confidentiality is not a concern. Allow cloud-assisted workflows where tier permits.

### Core Behavior

- **Local Gemma 4 E4B inference** via Ollama (default path)
- **Optional cloud critique APIs** (if explicitly enabled by user in Pro tier, using user's API key) - Hobbyist tier: local-only
- **Optional Gemini image generation** (paid opt-in, user's API key, disabled by default)
- **Telemetry allowed** (usage analytics, crash reports, opt-out available)
- **Auto-cloud backup** (if user enables in Pro tier)
- **No audit log** (optional session history for economics only)

### KPIs (Performance Targets)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Latency (Single Photo)** | < 10s end-to-end (upload → display) | P95 on M-series Mac, Gemma 4 E4B Q4_K_M |
| **Throughput (Batch 10 Photos)** | < 60s total (6s avg per photo) | Desktop only, sequential processing |
| **Model Load Time** | < 5s cold start | Ollama with preloaded model |
| **Memory Footprint** | < 8GB RAM (model + app) | Q4_K_M quantization |

**Success Criteria:** Faster than cloud API round-trip for users with local GPU; comparable for CPU-only.

---

## 3. Vault Mode Definition

### Purpose

Provide **network-isolated, auditable photography critique** for working professionals handling sensitive client work (e.g., celebrity shoots, confidential corporate events, legal evidence photography).

### Core Behavior

- **100% local inference** - Gemma 4 E4B via Ollama, no network calls
- **Network egress blocked** - Orchestration layer prevents all cloud API calls
- **Audit log enabled** - Hash-chained event log with photo metadata (no photo pixels stored)
- **Optional Gemini generation DISABLED** - Architectural enforcement, not just UI graying
- **Cloud critique APIs BLOCKED** - If any exist in Studio Mode, must be unreachable in Vault
- **Telemetry disabled** - No usage analytics, no crash reports
- **Auto-backup disabled** - All data stays local

### KPIs (Trust & Verification)

| Metric | Target | Verification Method |
|--------|--------|---------------------|
| **Zero Network Egress** | 0 packets to non-localhost during 30min session | Wireshark capture, Little Snitch logs (macOS), Windows Firewall logs, tcpdump (Linux) |
| **Audit Log Integrity** | Hash chain validates with 0 breaks | Export JSON → validate prev_hash chain |
| **Model Provenance** | SHA-256 match with published Gemma 4 E4B weights | Pre-flight check on Ollama model load |
| **Startup Verification** | < 10s user confirmation of network isolation | In-app guidance panel with platform-specific instructions |

**Success Criteria:** User can demonstrate zero network activity to auditors via OS-level tools.

---

### Vault Mode Threat Model (Explicit Non-Warranties)

**What Vault Mode DOES:**
- ✅ Prevents application-level network calls (fetch interceptor + orchestration layer blocking)
- ✅ Logs all analysis events in tamper-evident format (hash-chained)
- ✅ Provides OS-level verification guidance (Little Snitch, firewall, tcpdump)

**What Vault Mode DOES NOT:**
- ❌ Warrant against OS-level compromise (malware, rootkits)
- ❌ Warrant against malicious model binary replacement (user must verify SHA-256)
- ❌ Warrant against side-channel attacks (timing, power analysis)
- ❌ Warrant against user-authorized uploads outside Vault Mode
- ❌ Provide forensic-grade chain of custody (use professional tools for legal evidence)
- ❌ Prevent screen recording or screenshots by OS or third-party apps

**Honest Positioning:** Vault Mode is **"trust but verify"** - we make it easy to verify, but verification is user's responsibility.

---

## 4. Feature Matrix: Mode × Feature

| Feature | Studio Mode (Web) | Studio Mode (Desktop) | Vault Mode (Desktop) | Implementation Notes |
|---------|-------------------|----------------------|---------------------|---------------------|
| **Local Gemma 4 E4B inference** | ✅ (via Ollama.js in browser if feasible, else server-side) | ✅ (via Ollama local HTTP) | ✅ (via Ollama local HTTP) | Spike 1 validates browser feasibility |
| **Cloud Gemma API calls** | 🟡 Pro tier opt-in only (user key) | 🟡 Pro tier opt-in only (user key) | ❌ Blocked at architecture | Orchestration layer enforces |
| **Optional Gemini image generation** | 🟡 Paid opt-in (user key) | 🟡 Paid opt-in (user key) | ❌ Blocked at architecture | Isolated module, never default |
| **5-axis critique (composition, lighting, technique, creativity, subject)** | ✅ | ✅ | ✅ | Core feature, all modes |
| **Spatial overlay (bounding boxes)** | ✅ | ✅ | ✅ | Model outputs via JSON (default path) |
| **Deterministic CV grounding (EXIF, histogram, focus)** | ✅ | ✅ | ✅ | Supplements LLM, defined in 05 |
| **Mentor chat (5 turns free, unlimited Pro)** | ✅ | ✅ | ✅ | Local inference only in Vault |
| **Session history (economics dashboard)** | ✅ | ✅ | ❌ (optional: session-only, no persistence) | Vault minimizes logging |
| **Audit log generation** | ❌ | ❌ (optional: Pro tier) | ✅ Required | Hash-chained, exportable JSON |
| **Audit log export** | N/A | 🟡 Pro tier if enabled | ✅ Required | JSON format, no photo pixels |
| **Telemetry / analytics** | ✅ Opt-out available | ✅ Opt-out available | ❌ Disabled | Sentry, Posthog, etc. |
| **Auto-cloud backup** | 🟡 Pro tier opt-in | 🟡 Pro tier opt-in | ❌ Disabled | Google Drive, Dropbox, etc. |
| **Network egress verification guidance** | N/A | N/A | ✅ Required | In-app panel with platform instructions |
| **Batch processing (10+ photos)** | 🟡 Pro tier (if web workers feasible) | ✅ Pro tier | ✅ Pro tier | Sequential processing, no parallelization in MVP |

**Legend:**
- ✅ = Enabled for all users in this mode/tier
- 🟡 = Conditional (Pro tier, user opt-in, or feasibility spike)
- ❌ = Disabled or blocked

---

## 5. Hero Workflows

### Workflow 1: Hobbyist Web Studio (Free Tier)

**Scenario:** Sarah is a hobbyist learning landscape photography. She uploads a sunset photo to the web app.

**Input:**
- JPG photo (3MB, 4000×3000px)
- Camera: iPhone 13 Pro
- EXIF: f/1.5, 1/120s, ISO 100, 26mm equiv

**Process:**
1. Upload via drag-drop → browser resizes to 2048px max dimension
2. EXIF extracted via exifr (browser-side)
3. Histogram calculated via canvas API
4. Gemma 4 E4B analyzes via Ollama.js (or server-side if browser inference fails spike)
5. Response parsed: 5 scores + critique + 3 bounding boxes + thinking process
6. UI displays 5-tab dashboard in < 10s

**Output (v2 Schema):**
```json
{
  "schema_version": "2.0",
  "model_id": "gemma-4-e4b",
  "quantization": "Q4_K_M",
  "scores": {
    "composition": 7.5,
    "lighting": 9.0,
    "technique": 6.0,
    "creativity": 7.0,
    "subjectImpact": 8.5
  },
  "critique": {
    "composition": "Strong use of rule of thirds with horizon at lower third...",
    "lighting": "Golden hour light beautifully captured...",
    "technique": "Slight motion blur in clouds suggests slower shutter...",
    "overall": "A compelling sunset landscape with excellent lighting..."
  },
  "strengths": [
    "Golden hour timing maximizes warm tones",
    "Horizon placement follows rule of thirds",
    "Leading line from foreground path draws eye to sunset"
  ],
  "improvements": [
    "Use tripod or faster shutter (1/250s+) to eliminate cloud blur",
    "Foreground path is underexposed; consider graduated ND filter or HDR",
    "Sky is slightly overexposed in upper right; reduce highlights -0.5 stops"
  ],
  "learningPath": [
    "Master graduated ND filters for high dynamic range scenes",
    "Practice shutter speed control for motion vs. sharpness",
    "Study histogram reading to avoid clipping highlights"
  ],
  "settingsEstimate": {
    "focalLength": "26mm equiv",
    "aperture": "f/1.5",
    "shutterSpeed": "1/120s",
    "iso": "100"
  },
  "boundingBoxes": [
    {
      "type": "exposure",
      "severity": "moderate",
      "x": 65, "y": 10, "width": 30, "height": 20,
      "description": "Overexposed sky in upper right quadrant, losing cloud detail",
      "suggestion": "Reduce highlights by -0.5 stops or use graduated ND filter"
    },
    {
      "type": "focus",
      "severity": "minor",
      "x": 20, "y": 75, "width": 40, "height": 15,
      "description": "Foreground path slightly soft due to motion blur",
      "suggestion": "Use faster shutter (1/250s) or tripod for tack-sharp foreground"
    },
    {
      "type": "exposure",
      "severity": "moderate",
      "x": 10, "y": 70, "width": 50, "height": 25,
      "description": "Underexposed foreground losing shadow detail",
      "suggestion": "Bracket exposures or use fill light to balance dynamic range"
    }
  ],
  "rationale": {
    "observations": [
      "Horizon positioned at lower third, classic landscape composition",
      "Golden hour light creates warm color temperature (~5500K estimated)",
      "High dynamic range scene (bright sky vs dark foreground)",
      "Slight motion blur visible in cloud edges",
      "EXIF confirms f/1.5 aperture (wide open, shallow DOF risk)"
    ],
    "reasoningSteps": [
      "Evaluated composition against rule of thirds → strong placement",
      "Analyzed lighting quality → golden hour optimal for landscapes",
      "Assessed technical execution → motion blur indicates handheld at 1/120s",
      "Checked dynamic range → clipping in highlights (upper right) and shadows (foreground)",
      "Compared aperture choice → f/1.5 appropriate for low-light but risks soft edges"
    ],
    "priorityFixes": [
      "Address highlight clipping (moderate severity, affects sky detail)",
      "Correct foreground underexposure (moderate severity, loses path detail)",
      "Improve sharpness via faster shutter or tripod (minor severity, refinement)"
    ]
  },
  "evidence": [
    {"field": "focalLength", "source": "EXIF", "value": "4.2mm (26mm equiv)"},
    {"field": "aperture", "source": "EXIF", "value": "f/1.5"},
    {"field": "shutterSpeed", "source": "EXIF", "value": "1/120s"},
    {"field": "iso", "source": "EXIF", "value": "100"},
    {"field": "histogram_clipping", "source": "CV", "value": "highlights: 12% clipped, shadows: 8% clipped"}
  ]
}
```

**Gemma Necessity:** ✅ **Critical** - Requires multi-modal vision + text reasoning to correlate EXIF, histogram, and spatial issues. Deterministic CV alone cannot generate natural language critique or prioritize fixes contextually.

**User Outcome:** Sarah learns she needs a tripod and ND filter. She follows the learning path to study HDR techniques. Next photo shows improvement.

---

### Workflow 2: Serious Amateur Desktop Batch (Pro Tier)

**Scenario:** Mike is a serious amateur processing 20 photos from a portrait session. He uses Desktop Studio Mode for batch throughput.

**Input:**
- 20 RAW files (CR3 format, 25MB each)
- Camera: Canon R5
- EXIF: f/2.8, 1/200s, ISO 400, 85mm

**Process:**
1. Drag-drop 20 files into desktop app
2. App converts RAW → JPG via sharp library (server-side)
3. EXIF extracted via exiftool-vendored
4. Batch queue created (sequential processing)
5. Gemma 4 E4B analyzes each photo via Ollama (6s avg per photo)
6. Progress bar updates after each completion
7. Results dashboard shows grid view with thumbnails + scores
8. Mike clicks individual photos to see detailed critique

**Output:** 20 analyses in < 2 minutes (60s floor, 120s typical)

**Gemma Necessity:** ✅ **Critical** - Batch consistency requires same model for all 20 photos. Cloud API would have rate limits and cost scaling issues. Local Gemma enables unlimited batch without per-request costs.

**User Outcome:** Mike identifies that 8/20 photos have harsh lighting (needs fill flash). He re-shoots those 8 with corrected setup. Time saved: 2 hours of trial-and-error.

---

### Workflow 3: Working Pro Vault Mode (Pro Tier)

**Scenario:** Jessica is a professional photographer editing photos from a confidential corporate event. Client contract requires no cloud uploads. She uses Vault Mode on desktop.

**Input:**
- 50 event photos (JPG, 10MB each)
- Camera: Nikon Z9
- EXIF: f/4, 1/125s, ISO 1600, 35mm
- **Requirement:** Prove zero network activity to client auditor

**Process:**
1. Launch desktop app in Vault Mode
2. App displays network egress verification panel:
   - macOS: "Enable Little Snitch monitoring → screenshot logs → email to auditor"
   - Windows: "Configure Windows Firewall outbound rule → Resource Monitor screenshot"
   - Linux: "Run tcpdump on all interfaces → capture log"
3. Jessica enables Little Snitch, starts capture
4. Uploads 50 photos (batch processing)
5. Gemma 4 E4B analyzes locally (6s avg per photo = 5 minutes total)
6. Audit log records every analysis event with hash chain
7. Jessica exports audit log JSON + Little Snitch capture
8. Reviews detailed critique for 10 flagged photos (harsh lighting, motion blur)
9. Exits Vault Mode, sends audit artifacts to client

**Output:**
- 50 critiques (5 minutes processing)
- Audit log JSON (2KB, hash-chained, exportable)
- Little Snitch capture showing 0 non-localhost packets
- Client satisfaction: confidentiality verified

**Gemma Necessity:** ✅ **Critical** - Cloud APIs are non-negotiable for this use case. Gemma 4 E4B local inference is the only path to contractual compliance.

**User Outcome:** Jessica retains corporate client (high-value contract) by demonstrating verifiable confidentiality. Competitor using cloud APIs loses bid.

---

## 6. Mode × Tier Feature Enablement

### Hobbyist (Free Tier)

| Feature | Studio Web | Studio Desktop | Vault Desktop |
|---------|------------|----------------|---------------|
| 5-axis critique | ✅ | N/A | N/A |
| Spatial overlay | ✅ | N/A | N/A |
| Mentor chat | ✅ (5 turns) | N/A | N/A |
| Deterministic CV grounding | ✅ | N/A | N/A |
| Batch processing | ❌ | N/A | N/A |
| Audit log | ❌ | N/A | N/A |
| Optional cloud inference | ❌ | N/A | N/A |

**Monetization:** Free tier drives user acquisition. Upsell to Pro for batch + desktop + unlimited chat.

---

### Serious Amateur (Pro Tier - Paid)

| Feature | Studio Web | Studio Desktop | Vault Desktop |
|---------|------------|----------------|---------------|
| 5-axis critique | ✅ | ✅ | N/A |
| Spatial overlay | ✅ | ✅ | N/A |
| Mentor chat | ✅ (unlimited) | ✅ (unlimited) | N/A |
| Deterministic CV grounding | ✅ | ✅ | N/A |
| Batch processing | 🟡 (if feasible) | ✅ | N/A |
| Audit log | ❌ | 🟡 (opt-in) | N/A |
| Optional cloud inference | 🟡 (user key) | 🟡 (user key) | N/A |

**Monetization:** Subscription (e.g., $10/month or $100/year). Value: unlimited mentor chat + batch processing + desktop convenience.

---

### Working Pro (Pro Tier - Paid)

| Feature | Studio Web | Studio Desktop | Vault Desktop |
|---------|------------|----------------|---------------|
| 5-axis critique | ✅ | ✅ | ✅ |
| Spatial overlay | ✅ | ✅ | ✅ |
| Mentor chat | ✅ (unlimited) | ✅ (unlimited) | ✅ (unlimited) |
| Deterministic CV grounding | ✅ | ✅ | ✅ |
| Batch processing | 🟡 (if feasible) | ✅ | ✅ |
| Audit log | ❌ | 🟡 (opt-in) | ✅ (required) |
| Optional cloud inference | 🟡 (user key) | 🟡 (user key) | ❌ (blocked) |
| Network egress verification | N/A | N/A | ✅ (required) |
| Audit log export | N/A | 🟡 (if enabled) | ✅ (required) |

**Monetization:** Same Pro subscription. Differentiation: Vault Mode access for confidentiality use cases.

---

## 7. Explicit Non-Goals

**What This Product DOES NOT Do:**

1. **Medical Claims About Subjects**
   - ❌ No diagnosis of skin conditions, health issues, or medical assessments
   - ❌ No suggestions to photograph medical procedures or confidential health records
   - ✅ Refusal prompt: "I cannot provide medical assessments of subjects in photos."

2. **Identity Recognition**
   - ❌ No facial recognition to identify specific people
   - ❌ No suggestions to build face databases or person tracking systems
   - ✅ Face/eye detection for composition only (anonymized bounding boxes, no ID)

3. **IP-Violating Generation**
   - ❌ No "in the style of [living artist]" reproductions via optional image generation
   - ❌ No suggestions to copy copyrighted compositions or trademarks
   - ✅ Refusal prompt: "I cannot generate images that mimic copyrighted artistic styles."

4. **Surveillance Use Cases**
   - ❌ No optimization for CCTV, security camera, or covert photography critique
   - ❌ No suggestions to improve concealment or stealth photography techniques
   - ✅ Refusal prompt: "This tool is designed for creative photography, not surveillance."

5. **Minor Identification**
   - ❌ No age estimation or minor-specific suggestions
   - ❌ No COPPA/child safety features (out of scope for hackathon MVP)
   - ✅ Generic composition feedback only (no subject-specific identity analysis)

6. **Auto-Publishing to Social Media**
   - ❌ No Instagram/Facebook/TikTok API integration
   - ❌ No automatic posting or scheduled uploads
   - ✅ User manually exports critiqued photos

7. **Real-Time Video Analysis**
   - ❌ No live camera feed critique
   - ❌ No frame-by-frame video processing
   - ✅ Static photo analysis only (MVP scope)

8. **Professional Retouching Services**
   - ❌ No human-in-the-loop retouching marketplace
   - ❌ No professional photographer matchmaking
   - ✅ AI critique + optional AI generation only

**Why These Exclusions Matter:**
- **Legal:** Avoid medical/identity liability
- **Ethical:** Prevent surveillance misuse
- **Scope:** Focus on core critique competency for hackathon timeline

---

## 8. MVP Checklist & Cuts (May 19 Floor)

### Floor MVP (Must Ship - Submission-Grade)

**Core Features:**
- ✅ Web app with Studio Mode (single photo critique)
- ✅ Desktop Electron wrapper with Ollama integration
- ✅ Gemma 4 E4B local inference path (via Ollama)
- ✅ v2 schema output (5 scores + critique + bounding boxes + rationale)
- ✅ Deterministic CV grounding (EXIF + histogram)
- ✅ 5-tab dashboard (Overview, Details, Mentor, Enhancement, Economics)
- ✅ Vault Mode **demo slice** (desktop-only, 5-10 photos, audit log generated)
- ✅ Cloud-vs-edge comparison harness (50 golden photos, CSV output)
- ✅ 1500-word Kaggle writeup with comparison thesis

**Evaluation Artifacts:**
- ✅ 50 golden photos validated against v2 schema
- ✅ Comparison report (Gemini 3 Pro vs Gemma 4 E4B)
- ✅ Vault Mode network capture (Wireshark screenshot showing 0 egress)

**Documentation:**
- ✅ README.md updated (Gemma 4 E4B branding)
- ✅ ARCHITECTURE.md updated (Ollama integration diagram)
- ✅ Vault Mode threat model documented

**Video:**
- ✅ 3-minute demo video (Studio + Vault dual-wedge showcase)

---

### Stretch (Nice-to-Have)

**If Time Permits (Prioritized):**
1. 🟡 Batch processing (10+ photos) - Desktop Studio Mode
2. 🟡 iOS PWA deployment (Capacitor build)
3. 🟡 llama.cpp quantization benchmark (appendix in writeup)
4. 🟡 Optional Gemini image generation (paid opt-in, isolated module)
5. 🟡 Audit log in-app viewer (Vault Mode)

**Explicitly Cut if Schedule Slips:**
1. ❌ Optional Gemini gen demo segment (drop entirely)
2. ❌ llama.cpp benchmark appendix (mark as "future work")
3. ❌ LiteRT iOS native (PWA-only fallback)
4. ❌ Vault Mode polished demo (audit log infrastructure stays, demo cut)

**Floor Reached - Do Not Cut Below:**
- Web Studio Mode with local Gemma inference
- Desktop Ollama integration
- Vault Mode demo slice (even if rough)
- Comparison harness output

---

### Gate G2 (May 11, 18:00 CET)

**Criteria:**
- ✅ End-to-end Studio Mode runs cleanly 3× (upload → critique → display)
- ✅ Gemma 4 E4B outputs valid v2 schema on 10 test photos
- ✅ Recording of demo workflow is submission-grade quality

**If Failed:**
- Re-prioritize: cut optional features, focus on core critique path
- Escalate: identify blockers (Ollama instability, schema validation, model hallucination)

---

### Gate G3 (May 16, 18:00 CET)

**Criteria:**
- ✅ YouTube unlisted upload complete (3-minute demo)
- ✅ Repository public-readable (no secrets exposed)
- ✅ Writeup at 1400±100 words (comparison thesis drafted)
- ✅ Vault Mode demo recordable (network capture shows 0 egress)

**If Failed:**
- Emergency cut: Vault Mode becomes writeup-only (no video demo)
- Emergency cut: Optional gen feature dropped entirely
- Emergency cut: Comparison harness output becomes static tables (no live runs)

---

## 9. Pricing & Monetization (Placeholders)

**Hackathon Scope:** No actual payment integration. Document tier structure for judges.

### Hobbyist (Free Tier)

**Cost to User:** $0

**Value Prop:** Learn photography basics with AI critique. 5-turn mentor chat included.

**Limitations:**
- Web-only (no desktop/iOS)
- 5 mentor chat turns per photo
- No batch processing
- No Vault Mode

**Target Conversion:** 10% of free users upgrade to Pro within 3 months.

---

### Serious Amateur (Pro Tier - Paid)

**Cost to User:** Pro tier paid subscription (pricing TBD)

**Value Prop:** Unlimited mentor chat + batch processing + desktop convenience + iOS PWA.

**Includes:**
- All Hobbyist features
- Unlimited mentor chat
- Desktop app with Ollama (local inference, no per-photo costs)
- iOS PWA
- Batch processing (10+ photos)
- Optional cloud inference (user's API key)
- Optional audit log (Studio Mode)

**Target Users:** 1,000 paying users at launch (10,000 free users × 10% conversion).

---

### Working Pro (Pro Tier - Paid)

**Cost to User:** Same as Serious Amateur (same subscription, Vault Mode included)

**Value Prop:** Confidentiality compliance + audit logging for professional client work.

**Includes:**
- All Serious Amateur features
- Vault Mode (desktop-only)
- Network egress verification guidance
- Required audit log with export
- Priority support (if implemented post-hackathon)

**Target Users:** 100 working pros needing confidentiality (corporate, celebrity, legal photographers).

**Why No Price Increase?** Vault Mode is a feature flag, not additional compute cost. Differentiate on compliance, not pricing.

---

## 10. Competitive Differentiation

**How Photography Coach v2 Differentiates:**

**Note:** Competitor feature assessments based on publicly available documentation as of May 2026. Feature availability may change.

| Feature | Photography Coach v2 | Aftershoot | Imagen AI | Luminar Neo |
|---------|---------------------|------------|-----------|-------------|
| **Local Inference (No Cloud Required)** | ✅ Gemma 4 E4B via Ollama | ❌ Cloud-only | ❌ Cloud-only | 🟡 Some local filters |
| **Vault Mode (Network-Isolated)** | ✅ Desktop | ❌ Not available | ❌ Not available | ❌ Not available |
| **Audit Log (Compliance)** | ✅ Hash-chained | ❌ Not available | ❌ Not available | ❌ Not available |
| **Multi-Dimensional Scoring** | ✅ 5 axes | 🟡 Overall score only | 🟡 Overall score only | ❌ No scoring |
| **Transparent Reasoning (Rationale)** | ✅ Observations + reasoning + fixes | ❌ Black box | ❌ Black box | ❌ Black box |
| **Spatial Critique (Bounding Boxes)** | ✅ Severity-coded overlays | ❌ Not available | ❌ Not available | ❌ Not available |
| **Mentor Chat** | ✅ Context-aware, 5-turn free | ❌ Not available | ❌ Not available | ❌ Not available |
| **Batch Processing** | ✅ Desktop (Pro tier) | ✅ Cloud-based | ❌ Single photo | ✅ Batch editing |
| **Cost Model** | Free tier + Pro subscription | Subscription (pricing varies) | Pay-per-photo | One-time purchase (pricing varies) |

**Key Differentiators:**
1. **Vault Mode** - Differentiates by addressing corporate/legal confidentiality use cases with network-isolated analysis
2. **Transparent Reasoning** - Exposes "why" behind critique, not just "what"
3. **Local Inference** - No per-photo API costs, no rate limits, works offline
4. **Dual Wedge** - Speed (Studio) + Confidentiality (Vault) = two distinct value propositions

**Scope vs Related Tools:**
- Aftershoot offers mature batch editing features (auto-culling, color grading)
- Imagen AI offers cloud-scale performance optimized for high-volume studios
- Luminar Neo offers professional-grade retouching tools (sky replacement, portrait enhancement)

Photography Coach v2 is **not** a full retouching suite. It's a **critique + coaching** tool focusing on structured feedback and learning, complementing rather than replacing editing workflows.

---

## 11. Success Metrics (Post-Hackathon Roadmap)

**Phase 1: MVP Launch (May 19)**
- ✅ Submission accepted by judges
- ✅ Demo video views: 1,000+ (YouTube)
- ✅ GitHub stars: 100+ (open source release)

**Phase 2: Beta Launch (June 2026)**
- Target: 1,000 free users (Hobbyist tier)
- Target: 100 paid users (Pro tier)
- KPI: 10% free-to-paid conversion
- KPI: < 5s latency (P95, Studio Mode)
- KPI: 0 network egress verified in Vault Mode (10 beta testers)

**Phase 3: Scale (Q3 2026)**
- Target: 10,000 free users
- Target: 1,000 paid users
- KPI: 5 mentor chat turns average per user
- KPI: 20% batch processing adoption (Pro users)
- KPI: 10 working pros using Vault Mode regularly

**Phase 4: Enterprise (Q4 2026)**
- Target: 5 enterprise customers (photo studios, event companies)
- KPI: White-label deployments
- KPI: API access for integration with Lightroom/Capture One
- KPI: Custom model fine-tuning for studio-specific style

---

## Appendix A: Regulatory & Compliance Stance

**Hackathon Scope:** Not legally compliant with GDPR/HIPAA/etc. Document aspirations only.

### GDPR (EU Data Protection)

**Current Stance:** Not compliant (no DPA, no data controller registration).

**Post-Hackathon Path:**
- Implement data deletion requests (14-day SLA)
- Cookie consent banner (web)
- Data processing agreement (Pro tier customers)
- EU server hosting (if user base justifies)

**Vault Mode Implication:** Local-only processing helps GDPR compliance (no cross-border data transfers).

---

### HIPAA (US Healthcare)

**Current Stance:** Not applicable (not marketed for medical photography).

**Refusal Prompt:** "This tool is not intended for medical use. For HIPAA-compliant photo analysis, consult a medical imaging provider."

---

### COPPA (Child Privacy)

**Current Stance:** Not compliant (no age verification, no parental consent).

**Mitigation:** Terms of service state "13+ only" (standard for non-COPPA apps).

**Post-Hackathon Path:**
- Age verification gate (DOB entry)
- Parental consent flow (if targeting child photographers)

---

## Appendix B: Open Questions for Tier 2

**Deferred to Tier 2 Specs:**

1. **Prompt Engineering (04-prompt-and-rationale-spec.md):**
   - Exact system prompt wording for Gemma 4 E4B
   - Few-shot examples per axis score
   - Refusal prompt testing

2. **Deterministic CV (05-deterministic-cv-spec.md):**
   - Which histogram bins to extract (8-bin? 16-bin? 256-bin?)
   - Laplacian variance threshold per genre (portraits: 100? landscapes: 200?)
   - Face detection confidence threshold (0.5? 0.7? 0.9?)

3. **Architecture (06-architecture-spec.md):**
   - Orchestration layer module boundaries
   - Mode router implementation (feature flags? environment vars? config file?)
   - Gemini gen module isolation (separate service? blocked at fetch level?)

4. **Ollama Integration (07-stack-and-runtime-mapping.md):**
   - Ollama.js browser feasibility (Spike 1 dependency)
   - Model auto-download vs documented pull
   - Fallback if Ollama unavailable (cloud API? error?)

5. **Vault Mode (08-vault-mode-spec.md):**
   - Fetch interceptor implementation (Proxy? Service Worker? Electron IPC?)
   - Audit log schema (JSON fields, hash algorithm, export format)
   - Network verification guidance (platform-specific screenshots)

---

**End of 01-product-spec.md**

**Status:** ✅ Complete - Ready for Tier 1 review

**Next:** 02-output-schema.md (v1 frozen + v2 definition + migration)
