# L.E.N.S.: Voice-Guided Photography Coaching for Blind and Low-Vision Artisans, On-Device

*The lens between the artisan's hands and the sighted marketplace — on-device, voice-guided, powered by Gemma 4 E4B via Ollama.*

**Tracks:** Digital Equity & Inclusivity | Ollama Special Technology | Main Track

**Links:**
- **Public repo:** https://github.com/prasadt1/photography-coach-gemma4
- **Live demo:** https://lens-app-gemma4.vercel.app/
- **Video (YouTube, ≤3 min):** [VIDEO_URL]

---

L.E.N.S. — Local Edge Native Studio — is the lens between the artisan's hands and the sighted marketplace. A blind or low-vision artisan can make beautiful work, but selling it online means clearing a barrier they cannot see: photo quality. Buyers judge a listing in under a second, and that judgment is entirely visual. Every existing fix — hiring a photographer, asking a sighted volunteer through a service like Be My Eyes, or using a cloud AI tool — solves the photo problem by introducing a dependence: on a person's time, an internet connection, a subscription, or handing your work to someone else. L.E.N.S. removes the dependence. It runs entirely on the artisan's own device, so the artisan does it themselves — privately, for free, offline, on their own terms.

---

## Blindness Is a Spectrum

Blindness exists on a clinical spectrum: only 10–15% of legally blind individuals have No Light Perception (NLP). The remaining 85–90% retain varying degrees of residual vision (WHO; Iowa Department for the Blind). L.E.N.S. is designed for this dominant population: low-vision artisans who can interact with a screen using magnification and high contrast, but who cannot reliably evaluate the qualities of their own product photographs that determine whether sighted buyers click.

---

## The Solution

**Artisan Studio** is the heart of L.E.N.S. — a voice-first photography coaching experience designed for low-vision marketplace sellers.

**How it works:**

1. **Describe first:** The AI starts by confirming what is in frame — "I see a blue hand-knit scarf on a wooden surface with soft lighting from the left."

2. **Confirm colors:** For users who cannot verify color accuracy, the AI compares to familiar references — "The blue is reading accurately, similar to a clear sky blue."

3. **Guide spatially:** Coaching uses functional language (inches, left/right) not photography jargon — "Move your phone back 6 inches to capture the full length of the scarf."

4. **Generate assets:** Alt-text and listing copy are produced automatically, ready to paste into Etsy, eBay, or Shopify.

5. **Voice output:** All feedback is spoken aloud via Web Speech API, sentence by sentence for clarity.

---

## Why Gemma 4 E4B

Gemma 4 E4B is not the right model here because it critiques better than a large cloud model — it does not. It is the right model because it is the only thing that lets the critique happen independently. Running locally means no dependence on connectivity. Open weights mean no dependence on a subscription. On-device inference means the artisan's photos — often of unreleased, original work — never leave their hands. And E4B specifically: it and E2B are the only models in the Gemma 4 family with a native conformer-based audio encoder, which makes a voice-first interface feasible without a separate speech pipeline. Independence is the goal; Gemma 4 E4B running locally via Ollama is the mechanism. They are the same argument.

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
                         │  └─────────────────────────┘    │
                         └─────────────────────────────────┘
```

**Key decisions:**
- **Schema-enforced JSON:** Ollama's `format` parameter forces structured output at token level.
- **Progressive Web App:** Installable on iOS/Android. Web Share Target receives photos from the system share sheet.
- **Local-only by design:** No cloud fallback in Artisan Studio. Offline capability is a feature, not an edge case.

---

## Honest Roadmap

The current implementation requires a local model runtime (Ollama). This is the proof-of-concept delivery mechanism, not the finished product. The roadmap is zero-setup, phone-native on-device deployment, and Gemma 4 E4B's compact footprint is what makes that roadmap credible rather than aspirational. What the current MVP proves is that the full critique-and-optimize engine runs entirely locally, with no network calls, on commodity hardware.

**What ships today:**
- Voice-guided critique via Gemma 4 E4B + Ollama (100% local)
- TTS feedback via Web Speech API
- Alt-text and listing copy generation
- Offline PWA installable on iOS and Android

**What comes next:**
- Bidirectional voice via E4B native audio encoder
- Direct marketplace upload (Etsy, Shopify) with pre-generated metadata
- Haptic feedback for composition alignment

---

## Impact

**Digital Equity & Inclusivity Track:**

We did not guess at this use case. Real people and organizations support blind artisans professionally:

- **The Blind Woodsman** — professional woodworker who is legally blind
- **John Bramblitt** — tactile painter with extensive press coverage
- **Sydney Mufuka ("The Blind Artisan")** — pottery artist creating market-ready work
- **Royal National Institute of Blind People (RNIB)** — supports artisan employment programs
- **Oaknna Foundation ("Art by Blind")** — trains blind artisans for market-ready work
- **Gifted Back** — non-profit selling handmade goods by blind/low-vision creators

L.E.N.S. does not require these artisans to use cloud services, pay subscriptions, or have reliable internet. The product works where they live.

---

## Demonstration

The 3-minute video demonstrates:

1. **Persona introduction:** Maya, a low-vision artisan in rural India who knits scarves. She knows her work by touch and wants to verify her photos independently before listing.

2. **Core demo:** Upload a product photo. Hear L.E.N.S. describe what it sees, confirm colors, identify framing issues, and coach spatial adjustments.

3. **Retake flow:** Second photo improves. Alt-text and listing copy generated, ready to paste.

4. **Offline proof:** Airplane mode toggled on-camera. Analysis runs identically — no internet required.

5. **Technical walkthrough:** Why E4B, why Ollama, why schema enforcement matters.

The video shows the workflow, not a pity narrative. Hands, craft, transformation.

---

## Acknowledgments

Thanks to the Gemma 4 team at Google DeepMind for releasing E4B with a native audio encoder — the technical foundation that makes this possible. Thanks to the Ollama project for making local inference accessible to developers without ML infrastructure. Built for the Gemma 4 Good Hackathon.

---

*Word count: ~1,107 (under 1,500 limit)*
