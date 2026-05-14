# L.E.N.S.: Voice-Guided Photography Coaching for Blind and Low-Vision Artisans, On-Device

*The lens between the artisan's hands and the sighted marketplace — on-device, voice-guided, powered by Gemma 4 E4B via Ollama.*

**Tracks:** Digital Equity & Inclusivity | Ollama Special Technology | Main Track

**Links:**
- **Public repo:** https://github.com/prasadt1/photography-coach-gemma4
- **Live demo:** https://lens-app-gemma4.vercel.app/
- **Video (YouTube, ≤3 min):** [VIDEO_URL]

---

L.E.N.S. — Local Edge Native Studio — is the lens between the artisan's hands and the sighted marketplace. For 85–90% of legally blind people who retain some residual vision, the gap between making beautiful work and photographing it to sell is the gap L.E.N.S. closes.

## The Problem

Blindness exists on a clinical spectrum: only 10–15% of legally blind individuals have No Light Perception (NLP). The remaining 85–90% retain varying degrees of residual vision — light/dark perception, color discrimination, large-shape recognition, or restricted fields (WHO, Iowa Department for the Blind).

L.E.N.S. is designed for this dominant population: **low-vision artisans who can interact with a screen using magnification and high contrast, but who cannot reliably evaluate the qualities of their own product photographs** that determine whether sighted buyers click and convert.

These artisans — weavers, potters, knitters, woodworkers — create beautiful handmade goods. They know their products intimately by touch. But marketplace success depends on photo quality: 90% of Etsy shoppers say photo quality is their top purchase factor. High-quality photos can lift conversion rates by up to 94%.

Existing assistive apps (TapTapSee, Seeing AI, Be My Eyes) *describe* what's in a photo. They don't *coach* someone to take a better one. Cloud-based AI coaching requires reliable internet — a luxury many rural artisans in developing countries don't have. L.E.N.S. fills this gap: **voice-guided product photography coaching that runs entirely offline, on commodity hardware, at zero ongoing cost.**

---

## The Solution

**Artisan Studio** is the heart of L.E.N.S. — a voice-first photography coaching experience designed for low-vision marketplace sellers.

**How it works:**

1. **Describe first:** The AI starts by confirming what's in frame — "I see a blue hand-knit scarf on a wooden surface with soft lighting from the left."

2. **Confirm colors:** For users who can't verify color accuracy, the AI compares to familiar references — "The blue is reading accurately, similar to a clear sky blue."

3. **Guide spatially:** Coaching uses functional language (inches, left/right) not photography jargon — "Move your phone back 6 inches to capture the full length of the scarf."

4. **Generate assets:** Alt-text and listing copy are produced automatically, ready to paste into Etsy, eBay, or Shopify.

5. **Voice output:** All feedback is spoken aloud via Web Speech API, sentence by sentence for clarity.

The same engine serves sighted photographers through **Photo Studio** — offering 5-axis critique, spatial bounding boxes, and mentor chat — but Artisan Studio is the accessibility-first hero.

---

## Architecture

```
                         ┌─────────────────────────────────┐
                         │        User Device (PWA)        │
                         │  ┌───────────┐  ┌────────────┐  │
        Voice Input ───▶ │  │ Web Speech│  │  React UI  │  │ ◀── Camera
                         │  │   API     │  │ (Artisan)  │  │
                         │  └─────┬─────┘  └─────┬──────┘  │
                         │        │              │         │
                         │        ▼              ▼         │
                         │  ┌─────────────────────────┐    │
                         │  │  Analysis Orchestrator  │    │
                         │  │   + CV Grounding        │    │
                         │  └───────────┬─────────────┘    │
                         │              │                  │
                         └──────────────┼──────────────────┘
                                        │ HTTP (localhost)
                                        ▼
                         ┌─────────────────────────────────┐
                         │     Ollama (localhost:11434)    │
                         │  ┌─────────────────────────┐    │
                         │  │   Gemma 4 E4B (Q4_K_M)  │    │
                         │  │   • 300M audio encoder  │    │
                         │  │   • Schema JSON output  │    │
                         │  │   • Multi-image support │    │
                         │  └─────────────────────────┘    │
                         └─────────────────────────────────┘
```

**Key architectural decisions:**

- **Schema-enforced JSON:** Ollama's `format` parameter forces structured output at token level — scores, bounding boxes, and rationale in one reliable pass.
- **Deterministic CV grounding:** EXIF, histogram, and focus map are extracted client-side and injected into prompts. The model cites this evidence.
- **Progressive Web App:** Installable on iOS/Android via Safari/Chrome. Web Share Target receives photos from the system share sheet.
- **Local-only by design:** No cloud fallback in Artisan Studio. Offline capability is a feature, not an edge case.

---

## Technical Decisions

**Why Gemma 4 E4B (not 26B or 31B)?**

We selected Gemma 4 E4B specifically because it and E2B are the only models in the Gemma 4 family with a **native 300M-parameter audio encoder**. The larger 26B and 31B variants offer superior critique quality but lack native audio input, which would force a separate Whisper or cloud STT pipeline — breaking our offline-first promise and adding latency and deployment weight that disproportionately hurts the users we built this for. E4B's single-model architecture is what makes a voice-guided photography coach for blind and low-vision artisans feasible on commodity hardware today.

**Why Ollama (not cloud inference)?**

- **Zero cost per photo:** Cloud AI subscriptions ($10–20/month) are prohibitive for artisans in developing economies. Local inference is free forever after model download.
- **Works offline:** Rural Tamil Nadu has intermittent connectivity at best. L.E.N.S. works the same online or offline.
- **Privacy inherent:** Photos never leave the device. No consent dialogs, no compliance concerns.

**Current implementation vs. roadmap:**

Current implementation uses the browser's Web Speech API for text-to-speech output, enabling the PWA to deliver voice feedback without additional dependencies. The architectural roadmap is direct audio ingestion via E4B's native conformer encoder, eliminating the browser-API dependency for fully offline bidirectional voice interaction.

---

## Demonstration

The 3-minute video demonstrates:

1. **Persona introduction:** Maya, a low-vision artisan in rural India who knits scarves. She knows her work by touch but can't judge her photos.

2. **Core demo:** Upload a product photo. Hear the AI describe what it sees, confirm colors, identify framing issues, and coach spatial adjustments.

3. **Retake flow:** Second photo scores higher. Alt-text and listing copy generated.

4. **Offline proof:** Airplane mode toggled on-camera. Analysis runs identically — no internet required.

5. **Technical walkthrough:** Why E4B, why Ollama, why schema enforcement matters.

The video prioritizes emotional clarity (hands, craft, transformation) over feature exhaustiveness.

---

## Impact

**Digital Equity & Inclusivity Track:**

L.E.N.S. addresses a genuine market exclusion. Only 1% of Indian handloom weavers and craftspeople currently sell online (IDR, 2024). Only 20% have received any digital selling training. Many have low vision — cataracts are endemic in rural South Asia.

We didn't guess at this use case. Real organizations support blind artisans professionally:

- **The Blind Woodsman** — professional woodworker who is legally blind
- **John Bramblitt** — tactile painter with extensive press coverage
- **Oaknna Foundation "Art by Blind"** — trains blind artisans for market-ready work
- **Gifted Back** — non-profit selling handmade goods by blind/low-vision creators
- **RNIB** — Royal National Institute of Blind People supports artisan employment

L.E.N.S. doesn't require these artisans to use cloud services, pay subscriptions, or have reliable internet. The product works where they live.

**Sighted photographers** also benefit — the same engine provides 5-axis critique, spatial annotations, and mentor chat — but the accessibility use case is what distinguishes L.E.N.S. from generic "AI photo critique" tools.

---

## Roadmap

**Phase 2: Native Audio Ingestion**
- Integrate E4B's conformer encoder for bidirectional voice without Web Speech API
- Eliminate browser dependency for fully offline voice interaction

**Phase 3: Marketplace Integration**
- Direct upload to Etsy/eBay/Shopify via API with pre-generated alt-text and tags
- Photo-to-listing pipeline in one voice-guided session

**Phase 4: Haptic Feedback**
- Phone vibration when composition is optimal
- Enables "feeling" the perfect shot for users who can't see the screen

---

## Acknowledgments

Thanks to the Gemma 4 team at Google DeepMind for releasing E4B with a native audio encoder — the technical foundation that makes this possible. Thanks to the Ollama project for making local inference accessible to developers without ML infrastructure. Built for the Gemma 4 Good Hackathon.

---

*Word count: ~1,380 (under 1,500 limit)*
