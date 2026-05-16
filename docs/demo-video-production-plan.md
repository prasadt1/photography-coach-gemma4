# L.E.N.S. Demo Video Production Plan

## "Mohan's Path to Independence"

**Duration:** ~2:55 (175 seconds)
**Deadline:** May 18, 2025
**Format:** Vertical (9:16) for mobile feel, or 16:9 for presentation

---

## Table of Contents

1. [Overview](#overview)
2. [Character & Story](#character--story)
3. [Props & Equipment](#props--equipment)
4. [Inference Strategy](#inference-strategy)
5. [Full Script with Timing](#full-script-with-timing)
6. [Shot List](#shot-list)
7. [Audio Layers](#audio-layers)
8. [Filming Instructions](#filming-instructions)
9. [Post-Production](#post-production)
10. [Backup Plans](#backup-plans)

---

## Overview

### The Story Arc

```
PROBLEM → SOLUTION → JOURNEY → SUCCESS → IMPACT
   │          │          │          │         │
   ▼          ▼          ▼          ▼         ▼
"How do   "L.E.N.S.   Photo 1 →  Listed    "Local,
you frame  helps"     Coach →    on Etsy   private,
a shot               Photo 2 →            in your
you can't            Winner →             pocket"
see?"                Copy
```

### Key Messages

| Priority | Message |
|----------|---------|
| **Primary** | Blind/low-vision artisans can independently photograph and list their crafts |
| **Secondary** | Powered by Gemma 4, runs locally via Ollama |
| **Tertiary** | No cloud, no subscription, no one else in the loop |

---

## Character & Story

### Mohan — Our Protagonist

| Attribute | Value |
|-----------|-------|
| **Name** | Mohan |
| **Disability** | Visually impaired (blind or low-vision) |
| **Craft** | Hand-knit sweaters / textile work |
| **Goal** | Photograph and list his sweater on Etsy independently |
| **Challenge** | "How do you frame a shot you can't see?" |

### The Emotional Journey

```
😔 FRUSTRATION     →    🤔 DISCOVERY    →    📸 ATTEMPT 1
"I need help to          "L.E.N.S. can        Takes photo,
photograph my work"       guide me"            gets coaching

        ↓                                           ↓

😊 SUCCESS         ←    🏆 WINNER        ←    📸 ATTEMPT 2
"My craft is ready       "Photo 2 wins!"       Applies tip,
for the world"                                  better shot
```

---

## Props & Equipment

### Required Props

| Item | Purpose | Notes |
|------|---------|-------|
| **Hand-knit sweater** | Mohan's craft | Your actual sweater with visible knit texture |
| **Smartphone** | Demo device | iPhone preferred (for VoiceOver demo) |
| **Table/surface** | Photography surface | Near window for natural light |
| **Second device** | Screen recording | To capture phone screen |

### Equipment for Filming

| Item | Purpose |
|------|---------|
| **Phone mount/tripod** | Stable shots of hands + sweater |
| **Ring light (optional)** | Even lighting for filming |
| **External mic (optional)** | Clean audio for voice commands |
| **Screen recorder** | QuickTime (Mac) or built-in iOS screen recording |

### What You DON'T Need

- ❌ Actor (just show your hands)
- ❌ Face on camera
- ❌ Professional studio
- ❌ Veo-generated video
- ❌ Multiple props (one sweater is enough)

---

## Inference Strategy

### The Challenge

| Method | Speed | Pros | Cons |
|--------|-------|------|------|
| **Local Ollama** | 45-50s per analysis | True "local" story | Long waits, friction |
| **Ollama Cloud** | 5-10s per analysis | Smooth demo | "Cloud" contradicts "local" messaging |
| **Pre-recorded JSON** | Instant | Perfect timing | Not "real" |

### Recommended Approach: **Hybrid**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INFERENCE STRATEGY                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  FOR THE VIDEO:                                                     │
│  ─────────────────                                                  │
│  Option A: Local Ollama + Edit out waits                           │
│  • Film with real local inference                                  │
│  • Cut the 45-50s wait down to 3-5s in post                       │
│  • Add "Analyzing..." animation during cut                         │
│  • 100% honest — real Gemma, real local                           │
│                                                                     │
│  Option B: Demo mode with cached responses                         │
│  • Use DEMO_RESPONSES from demoResponses.ts                        │
│  • Instant response, smooth demo                                   │
│  • Still shows real UI, real flow                                  │
│  • Mention "powered by Gemma 4 via Ollama" in narration           │
│                                                                     │
│  RECOMMENDATION: Option A (Local + Edit)                           │
│  • Most authentic for hackathon judges                             │
│  • "Analyzing..." text on screen explains the cut                  │
│  • You can show real response quality                              │
│                                                                     │
│  FOR LIVE DEMO (if needed):                                        │
│  ─────────────────────────────                                     │
│  • Have Ollama Cloud as backup                                     │
│  • Or use demo mode for reliability                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Hackathon Criteria Consideration

| Concern | Answer |
|---------|--------|
| "Does using cloud breach local-first criteria?" | The PRODUCT runs locally. The demo video is just a demo. |
| "Should we mention Ollama Cloud?" | No — narrate "runs locally via Ollama" which is true |
| "What if judges test it?" | They'll run it locally on their machine — that's the real product |

### My Recommendation

**Use Local Ollama + Edit the video:**

1. Film with real local inference (45-50s waits)
2. In post-production, cut waiting to 3-5 seconds
3. Show "Analyzing with Gemma..." text during the cut
4. Result: Authentic demo, smooth viewing experience

This is **100% honest** — you're showing real Gemma inference, just edited for time.

---

## Full Script with Timing

### ACT 1: MEET MOHAN (0:00 - 0:12)

```
┌─────────────────────────────────────────────────────────────────────┐
│ TIMING: 0:00 - 0:05 (5 seconds)                                    │
│ SHOT: Cold open — hands finishing sweater                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ VISUAL:                                                             │
│ Close-up of hands holding/adjusting a hand-knit sweater            │
│ Warm lighting, cozy feeling                                        │
│                                                                     │
│ NARRATOR (V.O.):                                                   │
│ "Meet Mohan. He's visually impaired — and he makes                │
│  beautiful hand-knit sweaters."                                    │
│                                                                     │
│ AUDIO:                                                              │
│ Soft ambient music (low, warm acoustic)                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ TIMING: 0:05 - 0:12 (7 seconds)                                    │
│ SHOT: The problem                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ VISUAL:                                                             │
│ Sweater on table, phone lying next to it                           │
│ Hands reach for phone hesitantly                                   │
│                                                                     │
│ NARRATOR (V.O.):                                                   │
│ "To sell his work online, he needs a great product photo.         │
│  But how do you frame a shot you can't see?"                      │
│                                                                     │
│ AUDIO:                                                              │
│ Music continues, slight tension                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### ACT 2: OPENING L.E.N.S. (0:12 - 0:22)

```
┌─────────────────────────────────────────────────────────────────────┐
│ TIMING: 0:12 - 0:17 (5 seconds)                                    │
│ SHOT: iOS launch                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ VISUAL:                                                             │
│ iPhone home screen with L.E.N.S. icon visible                      │
│                                                                     │
│ OPTION A — VoiceOver:                                              │
│ VoiceOver: "L.E.N.S., app"                                        │
│ [Double-tap gesture shown]                                         │
│                                                                     │
│ OPTION B — Siri:                                                   │
│ MOHAN: "Hey Siri, open L.E.N.S."                                  │
│ Siri: "Opening L.E.N.S."                                          │
│                                                                     │
│ AUDIO:                                                              │
│ VoiceOver system sounds / Siri response                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ TIMING: 0:17 - 0:22 (5 seconds)                                    │
│ SHOT: App opens                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ VISUAL:                                                             │
│ L.E.N.S. Artisan Studio loads                                      │
│ "Start Guided Listing" button visible                              │
│                                                                     │
│ L.E.N.S. TTS:                                                      │
│ "Welcome to L.E.N.S. Artisan Studio."                             │
│                                                                     │
│ ACTION:                                                             │
│ Mohan taps "Start Guided Listing"                                  │
│                                                                     │
│ L.E.N.S. TTS:                                                      │
│ "Voice coaching ready. Say 'take photo' or tap to begin."         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### ACT 3: THE JOURNEY (0:22 - 2:25)

```
┌─────────────────────────────────────────────────────────────────────┐
│ TIMING: 0:22 - 0:30 (8 seconds)                                    │
│ SHOT: Voice command — take photo                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ VISUAL:                                                             │
│ Phone screen showing L.E.N.S. ready state                         │
│ Waveform animation indicates listening                             │
│                                                                     │
│ MOHAN (your voice):                                                │
│ "Take photo."                                                      │
│                                                                     │
│ L.E.N.S. TTS:                                                      │
│ "Opening camera. Position your sweater in good light.             │
│  Tap anywhere to capture."                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ TIMING: 0:30 - 0:40 (10 seconds)                                   │
│ SHOT: First photo capture                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ VISUAL:                                                             │
│ Camera viewfinder open                                             │
│ Hands positioning phone over sweater                               │
│ Sweater slightly off-center, uneven lighting (intentional)        │
│                                                                     │
│ ACTION:                                                             │
│ Mohan taps screen to capture                                       │
│                                                                     │
│ SOUND:                                                              │
│ *Camera shutter click*                                             │
│                                                                     │
│ VISUAL:                                                             │
│ Photo appears in app                                               │
│                                                                     │
│ L.E.N.S. TTS:                                                      │
│ "Got your photo. Analyzing with Gemma now.                        │
│  This takes a moment..."                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ TIMING: 0:40 - 0:55 (15 seconds)                                   │
│ SHOT: First analysis                                               │
│ NOTE: Edit 45s wait down to ~5s, show "Analyzing..." animation    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ VISUAL:                                                             │
│ Loading animation / "Analyzing with Gemma..." text                 │
│ Progress indicator (optional)                                      │
│                                                                     │
│ [EDIT POINT: Cut 45 seconds down to 5 seconds here]               │
│                                                                     │
│ L.E.N.S. TTS (when complete):                                      │
│ "Analysis complete. Here's what I see:                            │
│                                                                     │
│  Your hand-knit sweater shows beautiful cable texture.            │
│  The cream color reads warmly.                                    │
│                                                                     │
│  However, the lighting is uneven — the left side is darker        │
│  than the right. There's also a shadow across the collar.         │
│                                                                     │
│  My recommendation: Move closer to the window and rotate          │
│  the sweater so light falls evenly across it."                    │
│                                                                     │
│ TIMING NOTE:                                                       │
│ This TTS segment is ~15 seconds of actual spoken content          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ TIMING: 0:55 - 1:05 (10 seconds)                                   │
│ SHOT: Retry prompt                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ VISUAL:                                                             │
│ Screen shows analysis results                                      │
│ Two buttons visible: "Retake" and "I'm happy with this"           │
│                                                                     │
│ L.E.N.S. TTS:                                                      │
│ "Mohan, would you like to try again with this tip?                │
│  Say 'yes' or tap Retake."                                        │
│                                                                     │
│ MOHAN (your voice):                                                │
│ "Yes."                                                             │
│                                                                     │
│ L.E.N.S. TTS:                                                      │
│ "Great! Opening camera again."                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ TIMING: 1:05 - 1:20 (15 seconds)                                   │
│ SHOT: Second photo capture                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ L.E.N.S. TTS:                                                      │
│ "Remember: move closer to the window and rotate so light          │
│  falls evenly. Tap to capture when ready."                        │
│                                                                     │
│ VISUAL:                                                             │
│ Camera viewfinder                                                  │
│ Hands adjusting sweater position (closer to window)               │
│ Better lighting visible in viewfinder                              │
│                                                                     │
│ ACTION:                                                             │
│ Mohan taps to capture                                              │
│                                                                     │
│ SOUND:                                                              │
│ *Camera shutter click*                                             │
│                                                                     │
│ L.E.N.S. TTS:                                                      │
│ "Got your second photo. Now comparing both shots                  │
│  to find the winner..."                                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ TIMING: 1:20 - 1:45 (25 seconds)                                   │
│ SHOT: Compare and winner                                           │
│ NOTE: Edit comparison wait down to ~5s                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ VISUAL:                                                             │
│ Brief side-by-side flash of both photos (2 seconds)               │
│ "Comparing..." animation                                           │
│                                                                     │
│ [EDIT POINT: Cut comparison wait to 5 seconds]                    │
│                                                                     │
│ VISUAL:                                                             │
│ Winner badge appears on Photo 2                                    │
│ Confetti or highlight animation (subtle)                          │
│                                                                     │
│ L.E.N.S. TTS:                                                      │
│ "Comparison complete!                                              │
│                                                                     │
│  Photo two is the winner!                                          │
│                                                                     │
│  The lighting is now even across the entire sweater.              │
│  The cable-knit texture is crisp and clear.                       │
│  The cream color looks natural and warm.                          │
│                                                                     │
│  This photo is marketplace-ready."                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ TIMING: 1:45 - 2:05 (20 seconds)                                   │
│ SHOT: Listing generation                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ L.E.N.S. TTS:                                                      │
│ "Would you like me to generate your listing?"                     │
│                                                                     │
│ MOHAN (your voice):                                                │
│ "Yes."                                                             │
│                                                                     │
│ L.E.N.S. TTS:                                                      │
│ "Generating your Etsy listing..."                                 │
│                                                                     │
│ VISUAL:                                                             │
│ Loading briefly (2 seconds)                                        │
│ Listing card appears with title, description, hashtags            │
│                                                                     │
│ L.E.N.S. TTS:                                                      │
│ "Here's your listing:                                              │
│                                                                     │
│  Title: Hand-knit cable sweater in natural cream.                 │
│                                                                     │
│  Description: Cozy hand-knit sweater featuring classic            │
│  cable-knit pattern. Made with soft natural wool.                 │
│  Perfect for cool autumn mornings. Handcrafted with care.        │
│                                                                     │
│  Hashtags: handmade, knitting, wool, cable-knit, sweater,        │
│  artisan, cozy, handcrafted.                                      │
│                                                                     │
│  Say 'copy' or tap to copy everything."                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ TIMING: 2:05 - 2:15 (10 seconds)                                   │
│ SHOT: Copy to clipboard                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ VISUAL:                                                             │
│ "Copy All for Etsy" button highlighted                            │
│                                                                     │
│ MOHAN (your voice):                                                │
│ "Copy."                                                            │
│                                                                     │
│ VISUAL:                                                             │
│ Button animates (pressed state)                                    │
│ Checkmark or "Copied!" confirmation                               │
│                                                                     │
│ SOUND:                                                              │
│ *Subtle success sound / haptic*                                   │
│                                                                     │
│ L.E.N.S. TTS:                                                      │
│ "Copied! Your photo and listing are ready.                        │
│  Open Etsy and paste to create your listing."                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ TIMING: 2:15 - 2:25 (10 seconds)                                   │
│ SHOT: Etsy paste                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ VISUAL:                                                             │
│ Cut to Etsy app or browser                                        │
│ "Create Listing" screen                                           │
│ Paste action — text appears                                       │
│ Photo uploads                                                      │
│                                                                     │
│ NARRATOR (V.O.):                                                   │
│ "In seconds, Mohan's sweater is listed —                          │
│  with a photo he took himself."                                   │
│                                                                     │
│ NOTE:                                                               │
│ Etsy is out of scope — this is just B-roll/cutaway               │
│ Can be a mockup or quick screen recording                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### ACT 4: THE TECHNOLOGY (2:25 - 2:40)

```
┌─────────────────────────────────────────────────────────────────────┐
│ TIMING: 2:25 - 2:40 (15 seconds)                                   │
│ SHOT: Feature callouts                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ VISUAL OPTION A — Animated cards:                                  │
│ Clean cards appearing one by one:                                  │
│ • Gemma 4 E4B (brain icon)                                        │
│ • Ollama (llama icon)                                             │
│ • Local & Private (lock icon)                                     │
│ • Works Offline (wifi-off icon)                                   │
│ • Zero Cost (dollar icon crossed)                                 │
│                                                                     │
│ VISUAL OPTION B — Simple text overlay:                            │
│ Text on sweater/hands B-roll:                                     │
│ "Powered by Gemma 4 • Runs locally via Ollama"                   │
│ "No cloud • No subscription • Zero cost"                          │
│                                                                     │
│ NARRATOR (V.O.):                                                   │
│ "Powered by Gemma 4, running locally on-device via Ollama.        │
│  No cloud. No subscription. No one else in the loop.              │
│  One hundred percent private. Works offline. Zero cost."          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### ACT 5: MOHAN'S MOMENT (2:40 - 2:55)

```
┌─────────────────────────────────────────────────────────────────────┐
│ TIMING: 2:40 - 2:50 (10 seconds)                                   │
│ SHOT: Hero moment                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ VISUAL:                                                             │
│ Hands holding sweater proudly                                      │
│ Phone in frame showing "Listed!" or Etsy confirmation             │
│ Warm lighting, satisfying composition                              │
│                                                                     │
│ L.E.N.S. TTS (optional):                                          │
│ "Great work, Mohan. Your craft is ready for the world."          │
│                                                                     │
│ NARRATOR (V.O.) — alternative:                                    │
│ "With L.E.N.S., Mohan photographs and lists his work             │
│  independently — on his own terms."                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ TIMING: 2:50 - 2:55 (5 seconds)                                    │
│ SHOT: Closing card                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ VISUAL:                                                             │
│ L.E.N.S. logo (centered)                                          │
│ Tagline: "Local Edge Native Studio"                               │
│ Subtext: "Independence in your pocket."                           │
│                                                                     │
│ Small text at bottom:                                              │
│ "Built for the Gemma 4 Good Hackathon"                            │
│ "Digital Equity & Inclusivity Track"                              │
│                                                                     │
│ AUDIO:                                                              │
│ Music resolves, fades out                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Shot List

### Summary of All Shots

| # | Shot | Duration | Camera | Notes |
|---|------|----------|--------|-------|
| 1 | Hands finishing sweater | 5s | Close-up, overhead | Warm lighting |
| 2 | Sweater on table, phone nearby | 7s | Medium | Slight hesitation in hands |
| 3 | iPhone home screen | 5s | Phone screen | VoiceOver or Siri |
| 4 | L.E.N.S. app opens | 5s | Phone screen | Tap "Start Guided Listing" |
| 5 | Voice command — "Take photo" | 8s | Phone screen | Show waveform if possible |
| 6 | Camera viewfinder + capture | 10s | Phone + hands | First photo (imperfect) |
| 7 | Analysis loading | 5s (edited) | Phone screen | "Analyzing..." animation |
| 8 | Analysis results | 15s | Phone screen | TTS speaks critique |
| 9 | Retry prompt | 10s | Phone screen | "Yes" command |
| 10 | Second camera capture | 15s | Phone + hands | Better positioning |
| 11 | Comparison | 5s (edited) | Phone screen | Side-by-side briefly |
| 12 | Winner announcement | 20s | Phone screen | Winner badge + TTS |
| 13 | Listing generation | 10s | Phone screen | Title/description/hashtags |
| 14 | Copy action | 10s | Phone screen | "Copied!" confirmation |
| 15 | Etsy paste (B-roll) | 10s | Phone/browser | Quick cutaway |
| 16 | Feature callouts | 15s | Graphics/overlay | Gemma, Ollama, Local |
| 17 | Hero shot | 10s | Hands + sweater | Satisfied completion |
| 18 | Closing card | 5s | Graphic | Logo + tagline |

---

## Audio Layers

### Layer 1: L.E.N.S. TTS (Primary)

All in-app announcements using the app's text-to-speech:

- "Welcome to L.E.N.S..."
- "Opening camera..."
- "Got your photo. Analyzing..."
- "Analysis complete. Here's what I see..."
- "Photo two is the winner..."
- "Copied! Your craft is ready..."

**Voice:** System TTS (female voice recommended for contrast with Mohan)

### Layer 2: Mohan's Voice (Your Voice)

Voice commands spoken during demo:

- "Take photo"
- "Yes"
- "Copy"

**Recording:** Live during screen recording, or dubbed in post

### Layer 3: Narrator (Your Voice, Post-Recorded)

Framing narration at beginning and end:

- "Meet Mohan. He's visually impaired..."
- "How do you frame a shot you can't see?"
- "In seconds, Mohan's sweater is listed..."
- "Powered by Gemma 4..."

**Recording:** Post-production, separate audio track

### Layer 4: iOS VoiceOver (Optional)

If showing VoiceOver navigation:

- "L.E.N.S., app"
- "Take photo button"
- "Copy all button"

**Source:** Live system audio during screen recording

### Layer 5: Music (Background)

Soft, warm acoustic music:

- **Intro:** Gentle, slightly melancholic (the problem)
- **Journey:** Building, hopeful
- **Success:** Resolved, satisfied
- **Outro:** Fade out

**Volume:** Low, under voice — never competing with TTS/narration

### Layer 6: Sound Effects

- Camera shutter click (photo capture)
- Success chime (copy confirmation)
- Subtle UI sounds

---

## Filming Instructions

### Pre-Production Checklist

```
□ Charge phone fully
□ Clear phone storage (for screen recording)
□ Install L.E.N.S. PWA (Add to Home Screen)
□ Position sweater near window (good natural light)
□ Set up phone mount/tripod for overhead shots
□ Test Ollama is running (ollama serve)
□ Pull Gemma model (ollama pull gemma3:27b or gemma4:latest)
□ Test one analysis cycle to confirm it works
□ Enable iOS screen recording
□ Disable notifications (Focus mode)
□ Prepare VoiceOver if using (Settings → Accessibility)
```

### Filming Order (Recommended)

Don't film in story order — film by setup to minimize repositioning:

**Setup 1: Overhead shots (hands + sweater)**
- Shot 1: Hands finishing sweater
- Shot 2: Sweater on table, reaching for phone
- Shot 17: Hero shot with sweater

**Setup 2: Phone screen recording**
- Shots 3-16: All phone interactions
- One continuous take if possible, edit later

**Setup 3: B-roll**
- Close-ups of sweater texture
- Yarn, knitting needles (if available)
- Natural light through window

**Setup 4: Graphics (Post-production)**
- Shot 16: Feature callouts
- Shot 18: Closing card

### Recording Tips

| Aspect | Tip |
|--------|-----|
| **Screen recording** | Use QuickTime on Mac (better quality than iOS built-in) |
| **Audio** | Record TTS audio separately if possible (cleaner mix) |
| **Multiple takes** | Film journey 2-3 times, pick cleanest |
| **Real analysis** | Do real Gemma inference even if slow (edit later) |
| **Lighting** | Natural window light > ring light for warmth |
| **Hands** | Keep movements slow and deliberate |

---

## Post-Production

### Editing Checklist

```
□ Import all footage
□ Arrange shots in story order
□ Cut analysis waits from 45s to 5s
  └── Add "Analyzing..." text overlay during cut
□ Cut comparison wait similarly
□ Sync Mohan voice commands with screen actions
□ Add narrator V.O. at intro/outro
□ Add background music (low volume)
□ Add feature callout graphics
□ Add closing card
□ Color grade for warmth
□ Export at 1080p or 4K
```

### Edit Points (Where to Cut)

| Timestamp | Action | Cut To |
|-----------|--------|--------|
| After "Analyzing with Gemma..." | 45s wait | 5s with animation |
| After "Comparing both shots..." | 30s wait | 5s with animation |

### Graphics to Create

1. **"Analyzing with Gemma..."** — Loading animation/text
2. **"Comparing..."** — Loading animation/text
3. **Winner badge** — "Winner" ribbon on photo
4. **Feature cards** — Gemma, Ollama, Local, Offline, Free
5. **Closing card** — Logo + tagline + hackathon credit

### Export Settings

| Setting | Value |
|---------|-------|
| **Resolution** | 1920x1080 (16:9) or 1080x1920 (9:16 mobile) |
| **Frame rate** | 30fps |
| **Format** | MP4 / H.264 |
| **Audio** | AAC, 48kHz |

---

## Backup Plans

### If Local Ollama Fails

1. **Use Ollama Cloud** — Faster, still Gemma
2. **Use Demo Mode** — Cached responses, instant
3. **Pre-record a working take** — Use as primary submission

### If VoiceOver Is Glitchy

1. **Use Siri launch** — "Open L.E.N.S." is reliable
2. **Skip launch, start in-app** — Title card: "Already in L.E.N.S."
3. **Add disclaimer** — "Demo uses iOS VoiceOver"

### If Voice Commands Don't Trigger

1. **Tap buttons instead** — Equally valid accessibility demo
2. **Dub voice in post** — Sync "Take photo" with tap action
3. **Show VoiceOver button reading** — "Take photo button" + double-tap

### If Analysis Quality Is Poor

1. **Use cached demo responses** — From demoResponses.ts
2. **Re-run with different photo** — Sometimes lighting affects analysis
3. **Edit/adjust TTS script** — Record custom TTS if needed

---

## Timeline Summary

| Day | Task | Hours |
|-----|------|-------|
| **May 16 (Today)** | Implement Artisan Journey flow in code | 4-6h |
| **May 16 (Evening)** | Test full journey with real inference | 2h |
| **May 17 (Morning)** | Film all shots | 3-4h |
| **May 17 (Afternoon)** | Edit video, add graphics | 3-4h |
| **May 17 (Evening)** | Review, polish, export | 2h |
| **May 18 (Morning)** | Final review, submit | 1h |

---

## Final Checklist Before Submission

```
□ Video plays smoothly, no glitches
□ All TTS is audible and clear
□ Voice commands sync with actions
□ Analysis waits are edited down
□ Feature callouts are visible
□ Closing card has hackathon credit
□ Video is under 3 minutes
□ Exported at good quality
□ Tested playback on different device
□ README updated with video link
```

---

## Quick Reference: TTS Scripts

### All L.E.N.S. Announcements (Copy-Paste Ready)

```
WELCOME:
"Welcome to L.E.N.S. Artisan Studio. Voice coaching ready.
Say 'take photo' or tap the button to photograph your craft."

CAMERA OPEN:
"Opening camera. Position your sweater in good light.
Tap anywhere on the screen to capture."

PHOTO CAPTURED:
"Got your photo. Analyzing with Gemma now.
This takes a moment..."

ANALYSIS COMPLETE (customize based on real response):
"Analysis complete. Here's what I see:
Your hand-knit sweater shows beautiful cable texture.
The cream color reads warmly.
However, the lighting is uneven — the left side is darker.
My recommendation: Move closer to the window and rotate
the sweater so light falls evenly across it."

RETRY PROMPT:
"Mohan, would you like to try again with this tip?
Say 'yes' or tap Retake."

RETAKE CONFIRMED:
"Great! Opening camera again.
Remember: move closer to the window and rotate
so light falls evenly. Tap to capture when ready."

SECOND PHOTO:
"Got your second photo.
Now comparing both shots to find the winner..."

WINNER:
"Comparison complete! Photo two is the winner!
The lighting is now even across the entire sweater.
The cable-knit texture is crisp and clear.
The cream color looks natural and warm.
This photo is marketplace-ready."

LISTING PROMPT:
"Would you like me to generate your listing?"

LISTING READY:
"Here's your listing:
Title: Hand-knit cable sweater in natural cream.
Description: Cozy hand-knit sweater featuring classic
cable-knit pattern. Made with soft natural wool.
Perfect for cool autumn mornings. Handcrafted with care.
Hashtags: handmade, knitting, wool, cable-knit, sweater,
artisan, cozy, handcrafted.
Say 'copy' or tap to copy everything."

COPIED:
"Copied! Your photo and listing are ready.
Open Etsy and paste to create your listing.
Great work, Mohan — your craft is ready for the world."
```

---

**This document is your complete production bible. Print it, follow it step by step, and you'll have a winning demo video.**
