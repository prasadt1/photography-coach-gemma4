# L.E.N.S. — Gemma 4 Good Hackathon Submission Brief (v2 FINAL)

**Status:** Product angle locked. Supersedes v1. No further strategic changes.
**Deadline:** May 18, 2026, 11:59 PM UTC (May 19, 1:59 AM Frankfurt).
**Time budget:** ~33 hours remaining across May 13–17.

---

## 1. The Product, In One Sentence

**L.E.N.S. is a voice-guided AI photography coach that helps blind and low-vision artisans capture marketplace-quality product photos, so they can sell what they make at the price their work deserves — entirely on-device, with no internet, no subscription, and no cloud.**

That's the elevator pitch. Everything else is supporting structure.

---

## 2. What Changed From v1

| Decision | v1 | v2 (locked) |
|---|---|---|
| Hero feature | Three co-equal modes | **Artisan Studio (unified)** |
| Studio mode | Separate feature | **Merged into Artisan Studio** as an optional "general critique" sub-flow |
| Quest mode | Demoted but visible | **Removed** from product, landing page, video, writeup. Code can stay dormant. |
| Vault Mode | Separate feature for NDA pros | **Removed as a named feature.** Local-only is an inherent property of the whole product, demonstrated via airplane-mode toggle. |
| Persona | "Blind artisan" | **"Low-vision artisan"** (statistically dominant; 85–90% of legally blind people have residual vision) |
| Alt-text generation | Not in scope | **Added.** Generated alongside listing copy. |
| Desktop Electron | Featured | **Demoted to deployment option** (mentioned in writeup, not a marketing pillar) |

---

## 3. Locked Strategic Decisions

### 3.1 Target Prizes (stacked)

| Prize | Amount | Status |
|---|---|---|
| Digital Equity & Inclusivity Track | $10K | **Primary target** |
| Ollama Track | $10K | **Primary target** |
| Main Track placement (4th–1st) | $10K–$50K | **Secondary target** |

### 3.2 Hero Persona

**Maya** (or your chosen name). Low-vision artisan in rural Tamil Nadu (or your chosen location). Untreated cataracts have reduced her vision; she can see her phone screen with magnification but cannot reliably judge whether her hand-knit scarf photos will work for sighted Etsy buyers. She has slow, unreliable internet. She knits scarves she sells to support her family.

The persona is composite and research-grounded, not a single real person.

### 3.3 Judging weights (real, not assumed)

- Impact & Vision: **40%**
- Video Pitch & Storytelling: **30%**
- Technical Depth & Execution: **30%**

### 3.4 Submission deliverables (all five required)

1. Kaggle Writeup (max 1,500 words)
2. YouTube video (3 min max, public)
3. Public code repository
4. Live demo URL (publicly accessible)
5. Cover image + media gallery

---

## 4. Product Architecture (Final)

```
L.E.N.S.
├── Artisan Studio (HERO — voice-first, accessibility-led)
│   ├── Photo capture + critique
│   ├── Compositional/lighting/framing feedback
│   ├── Color accuracy confirmation
│   ├── Comparative analysis (pick best of N shots)
│   ├── Alt-text generation
│   └── Listing copy generation
│
├── Photo Studio (optional, secondary — for sighted users)
│   └── Same engine, general 5-axis critique
│
└── (Quest mode: REMOVED from product. Code may remain dormant.)

Properties of the whole product (not separate features):
- 100% local execution (Gemma 4 E4B via Ollama)
- No network egress
- No subscription, no API keys, no cloud
- Available as: PWA, iOS, Android, Electron desktop
```

---

## 5. Implementation Tasks for Claude Code

### 5.1 Landing page restructure (estimated: 2 hrs)

- [ ] **Remove the Quest card** from the landing page entirely.
- [ ] **Merge Studio and Artisan into one hero card** titled **"Artisan Studio"**. This is the primary CTA, takes ~70% of the visual weight.
- [ ] **Optional small secondary link** below: *"Sighted photographer? Try general photo critique →"* — links to the same engine in non-accessibility mode.
- [ ] **New hero copy.** Replace "Master Photography with AI Coaching" with one of:
  - *"Helping artisans get the price their work deserves."*
  - *"Photography coaching for the 90% of blind people who can still see."*
  - *"Better product photos. Voice-guided. On-device."*
- [ ] **New subhead:** *"L.E.N.S. helps blind and low-vision artisans capture marketplace-quality photos of their handmade work — fully on-device, no internet, no subscription."*
- [ ] **Footer property strip** (keep): *100% Private · Free Forever · Works Offline · Unlimited Usage*. Add one more pill: **"Powered by Gemma 4 E4B via Ollama"** (or similar — see section 7 on Ollama name-drop requirement).
- [ ] **Bug fix:** "1 photos" → "1 photo" (pluralization).

### 5.2 Artisan Studio feature additions (estimated: 2–3 hrs)

- [ ] **Alt-text generation.** After the critique, output a separate field labeled "Alt-text for your listing" containing a short descriptive sentence usable on Etsy/eBay/Shopify. Schema: `{ critique: {...}, listing_copy: "...", alt_text: "..." }`. Should be 15–25 words, describes product + color + key materials + texture.
- [ ] **Comparative analysis surfacing.** You already have multi-image compare built in. Make it prominent in the Artisan Studio flow: after a user takes a second photo, the UI explicitly asks "Compare with previous?" and the voice response names the winner with reasoning.
- [ ] **Accessibility prompt template.** Create a separate Gemma prompt template for Artisan Studio that:
  - Avoids sighted-photographer jargon ("bokeh," "negative space," "rule of thirds")
  - Uses functional, spatial, action-oriented language ("centered slightly right," "cut off on the left edge," "move the camera 4 inches left")
  - Confirms vs. denies the user's likely knowledge of their product ("the blue color is reading accurately — similar to a clear sky blue")
  - Always offers a next action ("Would you like to take another shot?" / "Would you like to compare to your previous?")
- [ ] **Screen-reader compatibility pass.** Add semantic HTML5 tags, ARIA labels on all interactive elements, focus management, sensible tab order. Use axe-core or Lighthouse to validate. Target: WCAG 2.1 AA on the Artisan Studio page minimum.

### 5.3 Code repository polish (estimated: 2 hrs)

- [ ] **README.md** must include:
  - One-paragraph product description matching section 1 of this brief
  - **Architecture section** explicitly naming: *"Gemma 4 E4B running locally via Ollama"*
  - "Why E4B" paragraph — see section 7 for paste-ready text
  - Install instructions that work on a fresh machine
  - Screenshots of Artisan Studio
  - Links to live demo, video, writeup
- [ ] **Architecture diagram** (ASCII or simple image): user voice/photo input → Web Speech API (TTS) → Ollama → Gemma 4 E4B → schema-enforced JSON → UI with voice feedback.
- [ ] **Code comments** in prompt and schema files explaining design choices.
- [ ] Repository must be **publicly accessible** without login.

### 5.4 Live demo hosting (estimated: 1 hr — DO NOT SKIP)

- [ ] PWA hosted publicly on Vercel, Netlify, or Cloudflare Pages.
- [ ] Because L.E.N.S. requires local Ollama, add a clear banner on first load:
  - "L.E.N.S. requires local Ollama with Gemma 4 E4B."
  - One-click link to setup instructions.
  - Link to demo video as alternative for judges who can't install locally.
- [ ] Test hosted URL on fresh browser, signed out of everything.

### 5.5 Submission checklist (estimated: 1 hr)

- [ ] Cover image (1200x630 or similar)
- [ ] YouTube video uploaded, public, descriptive title
- [ ] Kaggle Writeup under 1,500 words with all attachments linked
- [ ] Live demo URL working
- [ ] Public repo URL working
- [ ] Dry-run the Kaggle submission form before final submit

---

## 6. Tracks to Select on Kaggle

- **Impact Track:** Digital Equity & Inclusivity (primary)
- **Special Technology Track:** Ollama (entered separately if there's a sub-field)
- **Main Track:** automatic (all entries are eligible)

---

## 7. Verified Technical Facts (writeup-ready)

### 7.1 Paste-ready "Why Gemma 4 E4B" paragraph

> *"We selected Gemma 4 E4B specifically because it and E2B are the only models in the Gemma 4 family with a native conformer-based audio encoder (Google AI for Developers, Gemma 4 model card; Google Developers blog, April 2026). The larger 26B and 31B variants offer superior critique quality but lack native audio input, which would force a separate Whisper or cloud STT pipeline — breaking our offline-first promise and adding latency and deployment weight that disproportionately hurts the users we built this for. E4B's single-model architecture is what makes a voice-guided photography coach for blind and low-vision artisans feasible on commodity hardware today."*

### 7.2 Paste-ready "blindness is a spectrum" paragraph

> *"Blindness exists on a clinical spectrum: only 10–15% of legally blind individuals have No Light Perception (NLP). The remaining 85–90% retain varying degrees of residual vision — light/dark perception, color discrimination, large-shape recognition, or restricted fields (WHO, Iowa Department for the Blind). L.E.N.S. is designed for this dominant population: low-vision artisans who can interact with a screen using magnification and high contrast, but who cannot reliably evaluate the qualities of their own product photographs that determine whether sighted buyers click and convert."*

### 7.3 Paste-ready "current implementation vs roadmap" paragraph

> *"Current implementation uses the browser's Web Speech API for text-to-speech output, enabling the PWA to deliver voice feedback without additional dependencies. The architectural roadmap is direct audio ingestion via E4B's native conformer encoder, eliminating the browser-API dependency for fully offline bidirectional voice interaction."*

### 7.4 REQUIRED: Ollama name-drop

The phrase **"Gemma 4 E4B via Ollama"** (or equivalent) must appear:
- At least **2x in video narration**
- At least **3x in writeup**
- At least **1x on landing page** (small badge or footer pill)

The Ollama track criterion verbatim: *"For the best project that utilizes and showcases the capabilities of Gemma 4 running locally via Ollama."* Match the language.

### 7.5 Real anchors to cite in writeup Impact section

- **The Blind Woodsman** — proof blind artisans work professionally with physical media
- **John Bramblitt** — tactile painter, well-known, press coverage
- **Sydney Mufuka, "The Blind Artisan"** — low-vision digital illustrator
- **Royal National Institute of Blind People (RNIB)** — institutional credibility
- **Oaknna Foundation, "Art by Blind"** — trains blind artisans for market-ready work
- **Gifted Back** — non-profit selling handmade goods by blind/low-vision creators

These transform the Impact section from speculative to grounded. You don't need to contact any of them.

---

## 8. Video Script Skeleton (3 min, ~30% of score)

| Time | Section | Content |
|---|---|---|
| 0:00–0:25 | **Persona hook** | Hands. Yarn. The hum of needles. Voiceover introduces Maya — a low-vision artisan in [location], who knits scarves. She knows her work intimately by touch. She just doesn't know if her photos do her work justice. **NO product mentioned yet.** |
| 0:25–0:40 | **Frame the gap** | "She can make beautiful things. She can describe them. What she can't do is see whether the photo she just took will sell them — or whether the buyer will scroll past in 0.4 seconds." |
| 0:40–1:50 | **Demo (the meat)** | Voice input. Photo captured. Gemma 4 E4B via Ollama critiques on-device. Spoken feedback in functional language ("scarf is cut off on the left, light is behind the subject, move the camera 4 inches left"). Retake. Improved photo. Voice: "This one's better — pattern is visible, color is reading accurately, comparable to the previous shot but with stronger lighting." Generate alt-text + listing copy. Toggle airplane mode visibly to prove offline. Caption: **"Gemma 4 E4B running locally via Ollama. No cloud. No STT pipeline."** |
| 1:50–2:15 | **Why this matters** | Three on-screen claims with voiceover: 85–90% of legally blind people have residual vision (low-vision is the dominant case); the residual-vision artisan needs functional photo feedback, not photo description; this experience cannot exist on cloud models for users in rural or low-connectivity regions. |
| 2:15–2:40 | **Why Gemma 4, why Ollama** | Native audio encoder in E4B = no separate STT. Ollama = simple local deployment on commodity hardware. Together = a product that works the same in Tamil Nadu and in Frankfurt, regardless of connectivity. |
| 2:40–3:00 | **Close** | Return to Maya. Side-by-side: first photo (bad) vs. improved photo (good). One sentence: *"L.E.N.S. — so artisans can get the price their work deserves."* URL on screen. |

**First-15-seconds rule:** Highest production value goes to the opening. Cold open. No "Hi I'm X." Hands and yarn first.

---

## 9. Writeup Structure (Kaggle, 1,500 words MAX)

| Section | Word target | Content |
|---|---|---|
| Title + subtitle | — | *"L.E.N.S.: Voice-Guided Photography Coaching for Blind and Low-Vision Artisans, On-Device"* |
| The problem | 200 | The 85–90% residual vision statistic. The marketplace gap for blind/low-vision sellers. Use paragraph 7.2 verbatim. |
| The solution | 200 | Artisan Studio in one paragraph. Screenshot. The price-they-deserve framing. |
| Architecture | 300 | E4B-via-Ollama story (paragraph 7.1 verbatim). Diagram. Data flow: voice/photo → Ollama → Gemma 4 E4B → schema JSON → voice feedback. |
| Technical decisions | 250 | Why E4B over 26B/31B (audio encoder). Why Ollama over cloud. Why schema-enforced JSON. Why Web Speech API now vs. native E4B audio later (paragraph 7.3 verbatim). |
| Demonstration | 150 | What the video shows, the key demo moments. |
| Impact | 250 | Inclusivity track framing. Named anchors (section 7.5). Real artisans, real organizations. The marketplace exclusion problem. |
| Roadmap | 100 | Native E4B audio ingestion, function calling for marketplace integration (Etsy/eBay APIs), additional underserved verticals. |
| Acknowledgments | 50 | Brief credit to Gemma 4 team, Ollama project. |

---

## 10. What NOT to do (anti-patterns)

- ❌ Don't restore Quest mode to the marketing.
- ❌ Don't add new features beyond alt-text and screen-reader compatibility.
- ❌ Don't claim real-time error detection for workshop tools (out of scope).
- ❌ Don't claim multilingual support beyond what's been tested.
- ❌ Don't market Vault Mode as a separate feature. Local-only is inherent.
- ❌ Don't fake a fully voice-first interaction if the implementation still requires some sight to navigate. Use low-vision framing instead.
- ❌ Don't add a cloud fallback for "heavy reasoning tasks." Stays 100% local.
- ❌ Don't save submission for May 18. Submit May 17 evening.
- ❌ Don't run more strategic comparisons with other AIs. The strategy is locked.

---

## 11. Time allocation (May 13–17, ~33 hrs remaining)

| Date | Hours | Focus |
|---|---|---|
| May 13 (today) | 4 | Hand brief to Claude Code; audit current state; landing page restructure begins; write full video script (second-by-second); post accessibility outreach |
| May 14 (Ascension Day) | 10–12 | Landing page complete; alt-text feature added; accessibility prompt template; screen-reader pass; record all video footage |
| May 15 (Fri) | 3 | Writeup first draft (1,500 words) |
| May 16 (Sat) | 10 | Video final edit (4h); writeup polish (2h); code repo cleanup (2h); host live demo publicly (2h) |
| May 17 (Sun) | 7 | Cover image; submission dry run; self-review; **submit early** |

---

## 12. Asks for Claude Code (in priority order)

1. **Audit current state.** Map the existing codebase against the five submission deliverables (section 3.4) and the implementation tasks (section 5). Report:
   - What exists and is working
   - What exists but needs change
   - What's missing entirely
   - Any blockers or contradictions you see
2. **Restructure the landing page** per section 5.1.
3. **Add alt-text generation** to Artisan Studio per section 5.2.
4. **Build the accessibility prompt template** per section 5.2.
5. **Screen-reader compatibility pass** per section 5.2.
6. **Polish README and architecture diagram** per section 5.3.
7. **Set up public live demo hosting** per section 5.4.
8. **Provide feedback on this brief:** anything that seems contradictory, infeasible given the codebase, or that misses something about the existing implementation.

---

**End of brief v2. This document supersedes v1 in full. Time to ship.**
