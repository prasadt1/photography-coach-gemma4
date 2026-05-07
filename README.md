# 📷 Photography Coach – Gemma 4 Edition

**Professional AI Photography Coaching Running 100% Locally**

[![Gemma 4 E4B](https://img.shields.io/badge/Powered%20by-Gemma%204%20E4B-4285F4?style=for-the-badge&logo=google)](https://deepmind.google/technologies/gemma/gemma-4/)
[![Ollama](https://img.shields.io/badge/Runtime-Ollama-000000?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=)](https://ollama.com)
[![React](https://img.shields.io/badge/React-18%2B-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-Apache%202.0-green?style=flat-square)](LICENSE)

---

## 🏆 Built for Gemma 4 Good Hackathon

An intelligent photography coaching system powered by **Google Gemma 4 E4B** running entirely on your device. Get professional-grade critique, spatial annotations, and personalized recommendations—**with zero cloud dependencies and complete privacy**.

**Three platforms. One AI. Full control.**
- 🌐 **Web App** (Studio Mode) – Batch processing, cloud-optional
- 🖥️ **Desktop App** (Vault Mode) – Network-isolated, cryptographically air-gapped
- 📱 **iOS PWA** – Mobile critique with full vision support

---

## ✨ What Makes This Different

### 🔒 Privacy-First Architecture

**Vault Mode** (Desktop only):
- **Cryptographic network isolation** – OS-level egress guard prevents ANY network traffic
- **Hash-chained audit log** – Tamper-evident record of every analysis
- **Zero-knowledge architecture** – Photos never leave your machine
- **Use case:** Confidential client work, NDAs, competitive intelligence

**Studio Mode** (Web/Desktop):
- **Local-first with cloud fallback** – Ollama primary, optional Gemini enhancement
- **Batch processing** – Analyze 50-200 photos with outlier detection
- **XMP export for Lightroom** – Star ratings, color labels, IPTC keywords
- **Use case:** Wedding photographers, stock photography, portfolio review

### 🎯 Professional Features

**5-Axis Critique System:**
- Composition (rule of thirds, leading lines, symmetry)
- Lighting (exposure, dynamic range, color temperature)
- Technical Execution (sharpness, focus, depth of field)
- Creative Impact (originality, artistic merit)
- Subject Impact (story, emotion, engagement)

**Spatial Annotations:**
- Pinpointed issues with bounding boxes
- Severity levels (critical/moderate/minor)
- Color-coded overlays (red/yellow/green)
- Hover to highlight, click to inspect

**Deterministic CV Grounding:**
- EXIF extraction (focal length, aperture, ISO, shutter speed)
- Histogram analysis (tonal distribution, clipping detection)
- Focus map computation (Laplacian variance on grid)
- Gemma 4 sees BOTH image AND technical data

**Mentor Chat:**
- Follow-up questions with full context
- "How can I improve the lighting?"
- "What focal length would work better?"
- Gemma 4 provides specific, actionable advice

### 🚀 Production-Grade Stack

**Inference Runtime:**
- **Ollama** (primary) – Gemma 4 E4B (Q4_K_M, 9.6GB)
- Structured JSON output via schema enforcement
- Token streaming with progress tracking
- Model warm-up for sub-20s latency

**Integrations:**
- **Lightroom Classic** – XMP sidecar export (ratings, labels, keywords)
- **Electron** – Desktop app with OS-level network controls
- **Progressive Web App** – iOS-installable, camera access
- **Evaluation harness** – Automated golden-set testing

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and npm
- **Ollama** ([ollama.com](https://ollama.com)) for local inference
- (Optional) **Gemini API key** for cloud enhancement mode

### Installation

```bash
# 1. Clone repository
git clone https://github.com/prasadt1/photography-coach-gemma4.git
cd photography-coach-gemma4

# 2. Install dependencies
npm install

# 3. Install Gemma 4 E4B model (9.6GB download)
ollama pull gemma4:e4b

# 4. Start Ollama server
ollama serve

# 5. Launch web app
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) → Upload a photo → Get critique! 🎉

---

## 📦 Platform-Specific Setup

### 🌐 Web App (Vite + React)

**Development:**
```bash
npm run dev                    # Start dev server
npm run build                  # Production build
npm run preview                # Preview production build
```

**Deployment:**
```bash
# Deploy to Vercel/Netlify
npm run build
# Upload dist/ folder
```

**Environment Variables** (optional):
```env
# .env.local
VITE_GEMINI_API_KEY=your_key_here  # For cloud enhancement mode (Studio only)
OLLAMA_BASE_URL=http://localhost:11434  # Default Ollama endpoint
```

### 🖥️ Desktop App (Electron + Vault Mode)

**Build Desktop App:**
```bash
# Install Electron dependencies
npm install --save-dev electron electron-builder

# Build for current platform
npm run build:electron          # macOS (DMG/app)
# OR
npm run build:electron:win      # Windows (exe/portable)
# OR
npm run build:electron:linux    # Linux (AppImage/deb)
```

**Vault Mode Features:**
- Network isolation via OS-level controls
- Audit log with cryptographic hashing
- No cloud fallback (Ollama only)
- Egress guard intercepts all fetch() calls

**Run in development:**
```bash
npm run electron:dev
```

### 📱 iOS PWA (Progressive Web App)

**Setup Ollama for network access:**
```bash
# On Mac/PC, allow Ollama to accept connections from local network
export OLLAMA_HOST=0.0.0.0:11434
export OLLAMA_ORIGINS="*"
ollama serve
```

**Find your machine's IP:**
```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

**On iPhone:**
1. Connect to **same WiFi** as Mac/PC
2. Safari → `http://YOUR_COMPUTER_IP:5173`
3. Tap Share (⬆️) → "Add to Home Screen"
4. Open app from home screen (runs full-screen)
5. Upload photo → Get critique

**Detailed guide:** See `docs/ios-pwa-setup.md`

---

## 🎨 Features Overview

### Multi-Dimensional Analysis

**5-Axis Scoring** (0-10 per axis):
```
Composition:   8.5/10  ✨
Lighting:      7.0/10  💡
Technique:     9.0/10  🎯
Creativity:    6.5/10  🎨
Subject:       8.0/10  👁️
```

**Detailed Critique:**
- Composition: "Strong use of leading lines draws the eye to the focal point. Rule of thirds placement is effective."
- Lighting: "Golden hour light creates warm tones, though slight overexposure in sky could benefit from graduated ND filter."
- Technique: "Excellent sharpness on subject with pleasing bokeh in background. f/2.8 aperture choice is appropriate."

**Spatial Issues** (Bounding Boxes):
- 🔴 **Critical:** Overexposed highlights in top-right (clipped whites)
- 🟡 **Moderate:** Subject slightly off-center, consider cropping
- 🟢 **Minor:** Foreground distraction in bottom-left corner

### Deterministic CV Grounding

**Before Gemma 4 sees your photo, we extract:**

**EXIF Metadata:**
```json
{
  "focalLength": "50mm",
  "aperture": "f/2.8",
  "shutterSpeed": "1/250s",
  "iso": "ISO 400",
  "camera": "Canon EOS R5",
  "lens": "RF 50mm f/1.8"
}
```

**Histogram Analysis:**
```json
{
  "shadowsClipped": 2.3,
  "highlightsClipped": 8.1,
  "midtonesAvg": 128,
  "contrastRatio": 4.2
}
```

**Focus Map:**
```json
{
  "sharpnessScore": 0.82,
  "focusRegion": {"x": 45, "y": 38, "width": 25, "height": 30},
  "grid": [[0.2, 0.8, 0.9], ...]
}
```

Gemma 4 receives **image + technical context** → More accurate, grounded critique.

### Lightroom Integration

**Export XMP sidecars with:**
- ⭐ **Star ratings** (1-5 stars based on average score)
- 🏷️ **Color labels** (Red/Yellow/Green based on severity)
- 🔖 **IPTC keywords** (Top 5 observations from critique)
- 📝 **Description** (Overall critique summary)

**Workflow:**
1. Analyze 50 photos in Photography Coach
2. Export XMP sidecars for each
3. Import folder into Lightroom Classic
4. Filter by "4 stars and up" → See best shots
5. Filter by "Red label" → See critical issues to fix

**Guide:** See `docs/integrations/lightroom-xmp.md`

---

## 📐 Architecture

### Three-Layer Design

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: Deterministic CV (Client-Side)                   │
│  ├─ EXIF extraction (exif-js)                              │
│  ├─ Histogram analysis (Canvas API)                        │
│  ├─ Focus map computation (Laplacian variance)             │
│  └─ Face/eye detection (future: TensorFlow.js)             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: Gemma 4 E4B Inference (Local or Cloud)          │
│  ├─ Primary: Ollama (localhost, zero-cost)                 │
│  ├─ Input: base64 image + CV grounding data                │
│  ├─ Output: v2 schema JSON (structured, validated)         │
│  └─ Fallback: Gemini API (Studio Mode only, optional)      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: Validation & Audit (Trustworthy AI)             │
│  ├─ Zod schema validation (type safety)                    │
│  ├─ AJV JSON Schema validation (structure)                 │
│  ├─ Implicit refusal detection (safety)                    │
│  └─ Hash-chained audit log (Vault Mode only)               │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
photography-coach-gemma4/
├── components/              # React UI components
│   ├── AnalysisResults.tsx  # Main results display (5-axis, spatial, mentor)
│   ├── PhotoUploader.tsx    # Drag-and-drop uploader
│   ├── SpatialOverlay.tsx   # Bounding box annotations
│   ├── VaultModeBanner.tsx  # Security indicators
│   └── ...
├── services/                # Core business logic
│   ├── ollamaService.ts     # Gemma 4 inference via Ollama
│   ├── cvService.ts         # Deterministic CV grounding
│   ├── validationService.ts # Schema validation (Zod + AJV)
│   ├── auditService.ts      # Hash-chained audit log
│   ├── promptService.ts     # Photography principles system prompt
│   ├── xmpService.ts        # Lightroom XMP export
│   └── analysisOrchestrator.ts  # Pipeline coordinator
├── electron/                # Desktop app (Vault Mode)
│   ├── main.ts              # Electron main process
│   ├── preload.ts           # IPC bridge
│   └── vault-policy.ts      # Network isolation enforcement
├── docs/                    # Documentation
│   ├── specs/               # 14 comprehensive spec documents
│   ├── spikes/              # Spike results (Ollama, Cactus, LiteRT)
│   ├── integrations/        # Lightroom XMP guide
│   └── ios-pwa-setup.md     # iOS PWA installation guide
├── tests/                   # Test suites
│   ├── unit/                # 49 unit tests (services)
│   └── integration/         # 5 integration tests (pipeline)
├── public/                  # Static assets
│   ├── manifest.json        # PWA manifest
│   └── sw.js                # Service worker
├── types.v2.ts              # TypeScript types (v2 schema)
├── config.ts                # App configuration
└── vitest.config.ts         # Test runner config
```

---

## 🧪 Testing

### Unit Tests (49 tests)

```bash
npm test                     # Run all tests
npm test -- cvService        # Test CV grounding
npm test -- xmpService       # Test XMP export
npm test -- validation       # Test schema validation
```

### Integration Tests (5 tests)

```bash
npm test -- integration      # Full pipeline tests
```

### Manual Testing

**iOS PWA + Lightroom XMP:**
```bash
# See comprehensive testing guide
cat docs/TESTING_GUIDE.md

# Quick checklist
cat docs/QUICK_TEST_CHECKLIST.md
```

### Evaluation Harness

```bash
# Run golden-set comparison (Gemini vs Gemma)
npm run eval
```

---

## 📚 Documentation

### Specifications (14 documents in `docs/specs/`)

- **00-baseline-audit.md** – Project baseline and goals
- **01-product-spec.md** – Feature requirements and user stories
- **02-output-schema.md** – v2 JSON schema definition
- **03-runtime-decisions-and-spikes.md** – Technology evaluation
- **04-prompt-and-rationale-spec.md** – Photography principles prompt
- **05-deterministic-cv-spec.md** – CV grounding implementation
- **06-architecture-spec.md** – System design and data flow
- **07-stack-and-runtime-mapping.md** – Platform matrix
- **08-vault-mode-spec.md** – Network isolation specification
- **09-validation-and-error-handling-spec.md** – Safety guarantees
- **10-platform-shells-spec.md** – Web/Desktop/iOS implementation
- **11-ui-adaptation-spec.md** – Responsive design patterns
- **12-testing-strategy-spec.md** – Test coverage plan
- **13-implementation-roadmap-spec.md** – 5-day sprint timeline

### Spike Results (3 documents in `docs/spikes/`)

- **spike-1-results.md** – Gemma 4 E4B via Ollama (PASS)
- **spike-2-results.md** – Cactus evaluation (FAIL/DROP)
- **spike-3-litert-ios.md** – LiteRT iOS investigation (BLOCKED, PWA fallback)

### Integration Guides

- **docs/integrations/lightroom-xmp.md** – Lightroom Classic workflow
- **docs/ios-pwa-setup.md** – iOS PWA installation and troubleshooting
- **docs/TESTING_GUIDE.md** – Comprehensive testing instructions

---

## 🔧 Troubleshooting

### "Ollama not found" Error

```bash
# 1. Verify Ollama is installed
ollama --version

# 2. Check if Ollama is running
curl http://localhost:11434/api/tags

# 3. Verify model is installed
ollama list | grep gemma4

# 4. Pull model if missing
ollama pull gemma4:e4b

# 5. Restart Ollama
ollama serve
```

### Slow Analysis (>60 seconds)

**First request is slow (model loading):**
```bash
# Warm up model before using app
ollama run gemma4:e4b "Ready"
```

**Subsequent requests should be ~20-30 seconds.**

### iOS PWA Can't Connect to Ollama

```bash
# 1. Start Ollama with network access
export OLLAMA_HOST=0.0.0.0:11434
export OLLAMA_ORIGINS="*"
ollama serve

# 2. Check firewall allows port 11434
# macOS: System Settings → Network → Firewall
# Linux: sudo ufw allow 11434/tcp
# Windows: Defender Firewall → Inbound Rules → New Rule (port 11434)

# 3. Verify iPhone on same WiFi as Mac/PC
```

**Full troubleshooting:** See `TROUBLESHOOTING.md`

---

## 🚢 Deployment

### Web App (Vercel/Netlify)

```bash
# 1. Build production bundle
npm run build

# 2. Deploy to Vercel
vercel deploy

# 3. Set environment variable (optional)
# VITE_GEMINI_API_KEY=your_key (for cloud enhancement)
```

### Desktop App (Electron)

```bash
# macOS
npm run build:electron
# Output: dist-electron/Photography Coach.dmg

# Windows
npm run build:electron:win
# Output: dist-electron/Photography Coach Setup.exe

# Linux
npm run build:electron:linux
# Output: dist-electron/Photography Coach.AppImage
```

---

## 📊 Performance

### Gemma 4 E4B Benchmarks (MacBook M1 Max, 64GB)

| Metric | Cold Start | Warm (After Model Load) |
|--------|-----------|-------------------------|
| **Time to First Token** | ~40s | ~0.5s |
| **Generation Speed** | 27 tokens/sec | 27 tokens/sec |
| **Full Critique** | ~60-80s | ~20-30s |
| **Memory Usage** | 9.6GB (model) | 9.6GB (model) |
| **CPU Usage** | 300-400% | 300-400% |

**Optimization tips:**
- Run `ollama run gemma4:e4b "test"` to warm up model
- Use Q4_K_M quantization (balance quality/speed)
- Close memory-intensive apps during batch processing

---

## 🤝 Contributing

This is a hackathon submission for **Gemma 4 Good** (May 19, 2026 deadline).

**After the hackathon:**
- Issues and PRs welcome
- Focus areas: Android app, batch XMP export, LiteRT iOS native
- See `docs/specs/13-implementation-roadmap-spec.md` for Phase 2 plans

---

## 📄 License

**Apache License 2.0** – See [LICENSE](LICENSE) file for details.

You are free to use, modify, and distribute this software for commercial or non-commercial purposes, with attribution.

---

## 🙏 Acknowledgments

**Built with:**
- **Google Gemma 4** – Multimodal vision model ([deepmind.google/gemma-4](https://deepmind.google/technologies/gemma/gemma-4/))
- **Ollama** – Local LLM runtime ([ollama.com](https://ollama.com))
- **React** + **TypeScript** – UI framework ([react.dev](https://react.dev))
- **Vite** – Build tool ([vitejs.dev](https://vitejs.dev))
- **Electron** – Desktop app framework ([electronjs.org](https://electronjs.org))
- **Recharts** – Data visualization ([recharts.org](https://recharts.org))

**Inspired by:**
- **DeepMind Vibe Code** winner (Gemini 3 Pro version, 2025)
- Professional photography workflows (Lightroom, Capture One)
- Privacy-first AI principles

**Special thanks:**
- Google DeepMind for Gemma 4 E4B
- Ollama team for production-ready local inference
- Photography community for feedback and testing

---

## 🔗 Links

- **Hackathon:** [Gemma 4 Good on Kaggle](https://www.kaggle.com/competitions/gemma-4-good-2026)
- **Model:** [Gemma 4 on Hugging Face](https://huggingface.co/google/gemma-4-E4B-it)
- **Previous Version:** [Photography Coach AI (Gemini 3 Pro)](https://github.com/prasadt1/photography-coach-ai-gemini3)
- **Live Demo:** (URL to be added after deployment)
- **Video Demo:** (URL to be added after recording)

---

**Questions? Feedback?**
- 📧 Email: [your-email] (add before submission)
- 🐛 Issues: [GitHub Issues](https://github.com/prasadt1/photography-coach-gemma4/issues)
- 📚 Docs: See `docs/` directory for comprehensive guides

---

<div align="center">

**Built with ❤️ for photographers, by a photographer**

*Powered by Gemma 4 E4B • Running 100% Locally • Zero Cloud Dependencies*

</div>
