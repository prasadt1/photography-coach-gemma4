# LENS — Demo Video Script v1

**Target length:** 3:00 (Kaggle hard cap)
**Target platform:** YouTube (public/unlisted)
**Production approach:** Pre-recorded screen captures + voiceover + light music + captions
**Solo dev tooling:** macOS built-in screen recorder + iMovie (free) + Epidemic Sound ($19/month)

---

## Strategic Framing

**Positioning chosen:** Photography-first, privacy as differentiator (NOT "general safe AI platform")

**Tagline:** *"Lightroom edits photos. LENS makes photographers."*

**Story arc:**
- Open with workflow pain (relatable to hobbyists AND pros)
- Show the product solving the pain (workflow + critique)
- Vault Mode as the credibility multiplier (NOT the headline)
- Architecture flash showing Gemma 4 depth
- Close with a vision that's narrow enough to be believable

**Time allocation (FINAL — locked after multi-AI feedback):**
- 65% workflow + critique demo (the user value the judges feel)
- 25% privacy / Vault as differentiator (the trust wow moment)
- 10% architecture / tech credibility (just enough to back the depth claim)

**Locked decisions (do not re-debate):**
- ✅ Variant A — developer-on-camera opener AND closer (12s + 8s). Unanimous AI recommendation.
- ❌ Variant B — real-user testimonial. SKIP. Solo dev, no network. Developer-as-user is the credible substitute.
- ✅ Variant C — Vault Mode + DevTools network shutdown is THE wow moment. Pause 3 full seconds. Music drops. Let silence carry.
- ❌ Tier 2 in-browser — writeup-only. Don't explain WebLLM in the video.
- ❌ iOS PWA showing — skip. Mention in voiceover only.
- 📷 Use YOUR own photos in the demo, not Unsplash. Authenticity > polish.

---

## Shot-by-Shot Script

### 0:00 – 0:25 — HOOK (workflow pain, ONE emotional moment)

**Visual:**
- Open on black screen, white text fade-in: *"You shot 2,000 photos this weekend."*
- Cut to: photographer's MacBook with a Lightroom catalog full of thumbnails (B-roll)
- Cut to: clock spinning forward — the photographer is still there, still culling
- Text overlay fades: *"Most of them will never be seen."*

**Voiceover (intimate, slow):**
> "Photographers don't just take photos. They cull. They critique their own work. They learn — slowly — what makes one frame stronger than the next. But the AI tools meant to help? They edit your photos. They don't teach you anything."

**Why this works:** Specific number (2,000), specific human moment (Sunday night culling), not abstract.

---

### 0:25 – 0:40 — THE REVEAL

**Visual:**
- Cut to: clean app open on desktop. Logo. Title: *"LENS"*
- Subtitle: *"Lightroom edits photos. We make photographers."*
- Zoom into the app interface

**Voiceover:**
> "LENS is the mentor most of us don't have. It runs entirely on your laptop. Costs nothing. And teaches you why — not just what."

**On-screen badge (subtle):** "Powered by Gemma 4 via Ollama · Local · Private"

---

### 0:40 – 1:30 — DEMO: SINGLE PHOTO CRITIQUE (50 seconds)

**Visual:**
- Drag a photo into the app (use a hobbyist-quality photo — landscape or portrait, not a hero shot)
- Watch the analysis run (~5s timelapse if needed — show the loading state briefly)
- Result screen appears with 5-axis scores
- Cursor hovers a numbered pin on the photo → tooltip appears, card on the right highlights
- Click "Mentor Chat" tab
- Type "why is the horizon weak?" → Gemma's response streams in
- Tap the 🎤 mic icon → speak: "and how do I fix it?" → transcript appears
- Reply streams in → tap 🔊 → reply is read aloud (audio plays in video)

**Voiceover (faster pace now):**
> "Drop in a photo. Five-axis scoring with explicit reasoning. Spatial pins point to specific issues. Click any pin to see the fix. Ask the mentor a follow-up by voice — it remembers your photo. Listen to the answer hands-free."

**Captions on screen:**
- "Composition: 6/10 — horizon dead-center"
- "Lighting: 8/10 — strong golden hour"
- 🎤 "and how do I fix it?"
- 🔊 *audio waveform animation*

---

### 1:30 – 2:00 — DEMO: BULK COACH + LIGHTROOM ROUNDTRIP (30 seconds)

**Visual:**
- Click "Bulk Coach" tab
- Drag a folder of ~10 photos (use photos you own or Unsplash mix)
- Progress bar fills, ETA counts down
- Results grid appears, sortable by score
- Click "Save to Lightroom" → ZIP downloads
- Cut to Lightroom Classic open — drag the .xmp files into the matching photos
- Star ratings appear on the photos in Lightroom

**Voiceover:**
> "Bulk Coach scores fifty photos in five minutes. Export XMP sidecars — Lightroom imports the AI scores as star ratings. Your existing workflow, augmented."

**On-screen text overlay:** *"50 photos · ~5 minutes · $0"*

---

### 2:00 – 2:30 — DEMO: VAULT MODE (the credibility moment)

**Visual:**
- Click the Vault toggle → UI tints amber → header pill changes to "🔒 Vault · Client-safe · Audit trail"
- The Vault banner with 3 pillars appears: Network Blocked / Session Record / Client Proof
- Open DevTools Network tab briefly to show: zero outgoing requests during analysis
- Run a critique (fast cut)
- Click "View log" → Privacy Session Report panel
- Click "Download Privacy Report" → HTML file downloads
- Open the HTML in Safari — clean, professional certificate appears
- Pan to: photographer composing email to client with the HTML attached

**Voiceover:**
> "For client work — wedding shoots, unreleased campaigns, anything under NDA — toggle Vault Mode. Network is blocked at the application layer. Every analysis is logged in a tamper-evident chain. Download a Privacy Report and email it to your client. Compliance evidence, not just a promise."

**Caption:** *"What you hand a client when they ask 'did the AI see my photos?'"*

---

### 2:30 – 2:50 — TECH FLASH (architecture credibility)

**Visual:**
- Cut to architecture diagram (Diagram 2 from the writeup, generated)
- Highlight Gemma 4 box → CV grounding box → Vault egress guard box
- Quick zoom on: Gemma 4 E4B label → Ollama label → Two Gemma variants chip
- Brief text overlay: "Gemma 4 E4B for full quality · Gemma 2B in-browser for zero-install"

**Voiceover:**
> "Under the hood: Gemma 4 E4B runs locally via Ollama for every critique. Deterministic CV grounding feeds EXIF and histogram values into the prompt — so the model cites measured evidence, not impressions. A second Gemma variant runs entirely in the browser for visitors without Ollama. Schema-validated JSON output. Open-source, end to end."

---

### 2:50 – 3:00 — CLOSE

**Visual:**
- LENS logo
- Three CTAs:
  - 🌐 photo-coach.dev (live demo)
  - 💻 GitHub → desktop app
  - 📱 Add to home screen on Android (share-target works)
- Final tagline fade in: *"Built on Gemma 4. Local where it matters. Honest about the rest."*

**Voiceover:**
> "LENS. The mentor most of us don't have. Free. Local. Yours."

---

## Production Checklist

### Pre-production (Day 1, May 9)
- [ ] Choose 6-8 hero photos for demo (mix yours + Unsplash)
- [ ] Record yourself speaking the script — get raw VO
- [ ] Generate 3 architecture diagrams (Gemini Image / Excalidraw)
- [ ] Pre-warm Ollama 5 minutes before screen recording

### Recording (Day 2, May 10 — 7-8 hour block)
- [ ] Quit all unnecessary apps (free RAM, prevent notifications)
- [ ] Set screen resolution to 1080p (consistent output)
- [ ] Hide menu bar items, dock icons that aren't relevant
- [ ] Record the 7 demo segments listed above
- [ ] Capture 3-5 B-roll clips (typing, camera on table, photo on screen)
- [ ] Re-record any segment that's slow or has visible bugs

### Editing (Days 3-5, May 11-13)
- [ ] iMovie: assemble in script order
- [ ] Add captions for ALL voiceover (Kaggle judges may watch muted)
- [ ] Add subtle background music (Epidemic Sound — pick one calm track, 60-70 BPM)
- [ ] Color-grade: bump saturation on photo demo segments slightly
- [ ] Export as 1080p MP4
- [ ] Upload to YouTube as **Unlisted** first → review → make public after final review

### Quality gates
- [ ] Total length: ≤3:00 (hard cap)
- [ ] Captions are accurate and readable on mobile
- [ ] No "uhh" or "um" in voiceover
- [ ] Demo segments show real working app (no fake screenshots)
- [ ] Vault Mode segment is visually distinct (amber)
- [ ] Voice features are demonstrated (not just mentioned)
- [ ] Architecture diagram is shown (not just claimed)
- [ ] Closing CTAs are readable on mobile

---

## Backup Plan if Recording Fails

If a demo segment glitches during recording:
1. Skip the broken segment, replace with a static screenshot + voiceover description
2. Don't try to re-record live during the editing window — too risky
3. The architecture flash + voiceover description can compensate for any failed live demo

If Ollama crashes during the recording session:
1. Restart Ollama, wait for warm-up
2. Re-record affected segments
3. If repeating crashes: drop the live Bulk Coach segment, use a pre-recorded GIF of an earlier successful run

---

## Open Questions (For AI Reviewers)

1. **Is the 60/25/15 time allocation right?** Should Vault get more or less screen time?
2. **Is the opening hook ("2,000 photos") strong enough?** Or too pro-focused?
3. **Should we show the iOS PWA briefly?** Adds platform breadth but eats time.
4. **Should the Tier 2 in-browser tier be mentioned?** (Currently NO in the script — too technical for video.)
5. **Should we end with the "for good" angle more explicitly?** (Current close is product-focused.)

---

## 🌟 Judge-Aligned Variants (per Glenn's Tips)

A Gemma team PMM judge (Glenn) explicitly highlighted what made past hackathon winners stand out. The current script needs to be reviewed against his criteria. Three variants to consider:

### Variant A — Add Developer-on-Camera Opener

**Replace 0:00 – 0:25 with:**
- 0:00 – 0:12: **Prasad on camera** (medium close-up, well-lit, neutral background)
  > "Hi, I'm Prasad. I learned photography from a mentor who'd sit with me on Saturday afternoons and tell me *why* one of my photos worked and another didn't. Most people don't have that mentor. I built one."
- 0:12 – 0:25: Cut to MacBook screen with thousands of photo thumbnails, voiceover continues
  > "Photographers cull two thousand photos every weekend. Existing AI tools edit your photos. They don't teach you anything. LENS changes that — and it runs entirely on your laptop."

**Why this works:** Glenn explicitly called "developer on camera" a winning pattern (Skin Health Tracking). Adds trust + personality + specifically aligns with his "tell a story" advice.

**Production note:** Phone camera + window light is sufficient. Don't overproduce.

### Variant B — Add Real-User Testimonial Mid-Video

**Insert at 1:50 (right before Vault Mode segment):**
- Cut to phone-shot interview footage (15s) of a real photographer friend
  > *"I shoot weddings. The cull alone takes me 6 hours. If an AI did this for me — and I could prove to my client nothing left my Mac — that's a real product."*

**Why this works:** Glenn's advice #1 was "talk to real users." Even ONE 15-second informal quote dramatically lifts authenticity.

**Action item:** This week, contact 1-2 photographer friends. Even a Zoom recording of 3 minutes will yield 15 usable seconds.

### Variant C — Strengthen the "Wow" Moment

Glenn's third tip: "showmanship" / "wow factor."

Current candidates for the wow moment in the script:
1. The voice mentor reply read aloud (subtle)
2. Vault Mode toggle visibly cutting the network in DevTools (technical)
3. The Lightroom roundtrip showing star ratings appearing (workflow)

**My honest take:** The strongest "wow" moment is the **Vault Mode + DevTools Network tab combo**. Watching outbound requests literally stop while the AI keeps working is visually unmistakable. Lean into this — pause on it for 3 full seconds, let it land.

**Alternative wow moment:** Run the bulk coach on a folder of 20 photos in 2x speed timelapse, watch them all score in 60 seconds, then export to Lightroom. The "scale" is visceral.

### Recommended Combination

**Locked-in decisions (after constraints review):**

- ✅ **Variant A — Developer-on-camera opener**: DECIDED YES. Solo dev with the authentic personal story (Saturday afternoon mentor) — strongest fit for judge tip "tell a story, show the person." 12-second opener.
- ❌ **Variant B — Real-user testimonial**: DECIDED NO. Solo dev with no photographer network in 9 days; cold-posting on Reddit unlikely to yield usable feedback. Embracing developer-as-user pattern instead — Prasad IS the credible user (hobbyist photographer, the "photographer he would have been with a mentor" is genuinely his story).
- ✅ **Variant C — Vault Mode + DevTools wow moment**: DECIDED YES. Watching outbound network requests stop while AI keeps working = visceral, undeniable. Pause on it for 3 full seconds.

**Final structure (3:00 hard cap):**

```
0:00–0:12  Variant A: Developer on camera, personal story
0:12–0:25  Cut to MacBook screen, voiceover continues, problem framing
0:25–0:40  Reveal — open the app, "Local · Private" badge visible
0:40–1:30  Demo: single critique + voice mentor + spatial pins
1:30–1:55  Demo: Bulk Coach + XMP roundtrip to Lightroom (compressed)
1:55–2:25  Variant C: Vault Mode + DevTools network shutdown moment
2:25–2:50  Tech flash: architecture diagram + Gemma 4 narrative
2:50–3:00  Close: 3 CTAs + tagline + developer face brief return
```

Net: 3:00 with developer presence at open AND close + sharper wow moment.
