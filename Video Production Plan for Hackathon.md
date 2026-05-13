# L.E.N.S. — Video Production Plan

**Goal:** 3-minute submission video. ~30% of hackathon score.
**Budget:** ~10–12 hours on May 14 (filming + first edit); 4–6 hours on May 16 (final edit + polish).
**Equipment assumed:** Smartphone, laptop, headphones, internet.

---

## 1. Production Approach

Three sources of footage, mixed throughout:

| Source | Share | What it shows |
|---|---|---|
| Screen recording | ~30% | L.E.N.S. running: voice input, photo capture, Gemma critique, retake, alt-text, listing copy generation, airplane mode toggle |
| Stock + self-filmed B-roll | ~50% | Hands knitting, propping a phone on books, holding yarn, fabric texture — illustrating the persona without showing faces |
| On-screen graphics | ~20% | Text overlays: stats, captions, "Gemma 4 E4B via Ollama" labels, before/after comparisons |

**You do not film faces. You do not cast an actor playing Maya. You film hands, materials, screens, and product photos.** The voiceover does the heavy lifting; visuals are illustration.

---

## 2. Tools (all free except where noted)

### Screen recording
- **Mac:** QuickTime Player (built in, File → New Screen Recording)
- **Cross-platform:** OBS Studio (free, more control)

### Phone camera
- Whatever smartphone you have. Modern phones shoot 1080p or 4K — sufficient.
- Use the rear camera, not selfie. Set to 1080p 30fps minimum; 4K 30fps preferred.

### Audio (voiceover)
- **Best free option:** Your phone's voice recorder app, held 6–8 inches from your mouth, in the quietest room you have (bathroom or closet with clothes works well — sounds dead, no echo).
- **Better option if you have it:** AirPods Pro or similar, recorded into QuickTime.
- **Optional paid:** ElevenLabs or Play.ht for a professional-sounding AI voiceover (~$5 for the volume you need). Useful if you don't like your own voice on camera or your English accent is a concern for the pitch. Pick a voice that sounds warm, not robotic.

### Editor
- **Easiest:** CapCut (free, AI features, good for hackathon-quality videos, lots of templates). Available on desktop and mobile.
- **More powerful:** DaVinci Resolve (free, professional-grade, steeper learning curve)
- **Mac built-in:** iMovie (fine for this scope)

**Recommendation:** Use CapCut unless you already know another editor. The learning curve is the lowest and the AI auto-captions feature will save you 2+ hours.

### Stock footage sources (free, no attribution required)
- **Pexels Videos:** pexels.com/videos — search "hands knitting", "yarn", "weaving hands", "craft", "artisan hands"
- **Pixabay:** pixabay.com/videos
- **Mixkit:** mixkit.co

### Stock music (free)
- **YouTube Audio Library:** youtube.com/audiolibrary — filter "Cinematic" or "Ambient"
- **Pixabay Music:** pixabay.com/music — same caveat
- Avoid anything with vocals or recognizable melody. You want atmospheric.

### On-screen graphics
- **Canva** for any text-overlay graphics, simple charts, the "before/after" comparison panel
- Or just use your editor's built-in text tool

---

## 3. Shot List (in order)

The video script has six segments. For each, here's exactly what to film/source.

### Segment 1 — Persona hook (0:00–0:25)
- **B-roll 1:** Hands knitting or weaving (your hands work, or stock from Pexels). Close-up. Slow movement.
- **B-roll 2:** Yarn or fabric texture (extreme close-up, slow pan).
- **B-roll 3:** A finished scarf or handmade item, laid flat. (Borrow from home, or stock.)
- **Audio:** Voiceover introducing Maya. Background: soft ambient music, low volume.
- **No product on screen yet.**

### Segment 2 — Frame the gap (0:25–0:40)
- **B-roll 1:** A phone propped against a stack of books, screen facing down or away. (Film at home.)
- **B-roll 2:** Hand placing a knitted item in front of the phone. (Film at home.)
- **Audio:** Voiceover sets up the problem. *"She can make beautiful things. She can describe them. What she can't do is see whether the photo she just took will sell them."*

### Segment 3 — Demo / the meat (0:40–1:50)
This is the heaviest segment to produce. Plan it carefully.

- **Screen recording 1:** L.E.N.S. open in browser. User uploads a deliberately bad photo (poorly lit, scarf cut off, distracting background). Show Gemma 4 E4B via Ollama running. Voice output speaks the critique. **Caption overlay:** "Gemma 4 E4B running locally via Ollama. No cloud. No STT pipeline."
- **Screen recording 2:** Same flow with a retaken (better) photo. Voice output speaks improvement.
- **Screen recording 3:** Comparative analysis flow — "compare with previous" — voice names the winner.
- **Screen recording 4:** Alt-text and listing copy output generated.
- **Phone or hand footage:** Toggle airplane mode visibly. Then return to screen recording showing L.E.N.S. still working. **Caption overlay:** "Offline. No network calls."
- **Tip:** Record each screen action multiple times. The first take is always rough. Pick the cleanest for the edit.
- **Tip:** Increase the system zoom or font size in the L.E.N.S. UI when screen recording — small text disappears on YouTube at 1080p.

### Segment 4 — Why this matters (1:50–2:15)
- **Graphics-heavy.** Three on-screen text claims with light B-roll behind them.
  - "85–90% of legally blind people have residual vision."
  - "The marketplace is built for sighted buyers."
  - "Rural artisans don't have reliable internet."
- Behind the text: slow-moving stock B-roll (hands working, a phone screen, a marketplace listing scrolling).

### Segment 5 — Why Gemma 4 / why Ollama (2:15–2:40)
- **Graphics:** Simple architecture diagram on screen — three boxes (Voice → Gemma 4 E4B via Ollama → Voice feedback). You can build this in Canva or your editor's text tool.
- **Text overlay:** Three short claims:
  - "E4B: native audio encoder. No separate STT."
  - "Ollama: one-command local deployment."
  - "Together: works in Tamil Nadu and Frankfurt the same way."

### Segment 6 — Close (2:40–3:00)
- **Side-by-side:** Maya's "before" photo vs. "after" photo. Built in your editor.
- **B-roll:** Return to hands and yarn briefly.
- **Final text on screen:** *"L.E.N.S. — so artisans can get the price their work deserves."*
- **URL on screen** (your live demo + GitHub link).
- Music fades out. No cut to black.

---

## 4. Voiceover Script Approach

Write the full voiceover **before you film anything**. Then time it: read it aloud, time the segments. Adjust until it fits the timestamps in the shot list.

**Tips for recording voiceover:**

- Record in one continuous take per segment. It's faster to re-do a segment than to splice mid-sentence.
- Stand up while recording. Improves projection.
- Aim for ~150 words per minute (3 min = ~450 words total).
- Pause briefly between sentences. The edit will tighten these later.
- Record more than you need — leave 1–2 seconds of silence before and after each take.

**If using your own voice:** Two takes per segment minimum. Pick the warmer, more natural one.

**If using AI voice (ElevenLabs):** Generate with a slightly slower pace than default. The default is too fast for hackathon emotional pacing.

---

## 5. Workflow — May 14 (10–12 hr block)

| Time | Task |
|---|---|
| Hour 1 | Final voiceover script. Print it. Read aloud, time it, adjust. |
| Hour 2 | Record voiceover. All segments. Multiple takes. |
| Hours 3–4 | Screen recordings of L.E.N.S. Multiple takes of each demo flow. Don't rush — these are 30% of your score. |
| Hour 5 | Self-filmed B-roll: hands, phone propped, materials. 20–30 short clips. |
| Hour 6 | Source stock footage from Pexels. Download 10–15 clips matching shot list. |
| Hour 7 | Source stock music. Pick one track, maybe two. |
| Hours 8–10 | First edit pass in CapCut. Voiceover on timeline, B-roll synced to narration, screen recordings cut to demo segment, captions added. |
| Hours 11–12 | Watch full video. Note 10 things to fix. Note them, sleep on them. |

---

## 6. Workflow — May 16 (4–6 hr block)

| Time | Task |
|---|---|
| Hour 1 | Apply fixes from May 14 review. |
| Hour 2 | Pacing pass. Anything dragging? Cut 2–3 seconds from each segment. |
| Hour 3 | Audio mix. Voiceover at -6dB, music at -18dB. Voice should be clearly above music. |
| Hour 4 | Caption pass. Auto-generate in CapCut, then manually fix all proper nouns ("Gemma," "Ollama," "L.E.N.S." — auto-captions will mangle these). |
| Hour 5 | Final export. 1080p, MP4, H.264. Upload to YouTube as **Unlisted** first to verify, then change to Public when ready to submit. |
| Hour 6 | Buffer. |

---

## 7. The First 15 Seconds Rule

The opening 15 seconds decide whether a judge keeps watching. **Treat them as the highest-effort 15 seconds of the entire video.**

- No "Hi I'm X and today I'll show you..."
- No logo splash card. No "intro music swell."
- Cold open. Hands. Materials. Voiceover establishes Maya immediately.
- The product name "L.E.N.S." should not appear until at least 0:30.

If you're going to over-invest in any part of the video, over-invest here.

---

## 8. Common Pitfalls to Avoid

- **Don't over-produce.** Excessive transitions, animated text, complex motion graphics — these signal "tech demo trying to look like an ad" and dilute authenticity. Plain cuts and fades are fine.
- **Don't use stock music with lyrics or a recognizable melody.** Ambient or cinematic, low volume, instrumental.
- **Don't show your face on camera unless you're a strong on-camera presence.** Voiceover-only is more emotional and more focused on the product.
- **Don't include screen recordings of code.** Judges aren't reading your TypeScript at 30fps. Show the running product instead.
- **Don't fake a real testimonial.** No fake quotes. No fake "user" footage. Composite persona, framed honestly through voiceover.
- **Don't run 3:01 or longer.** YouTube will let you upload it; the judges may stop watching at exactly 3:00. Aim for 2:50–2:58.
- **Don't forget to upload as Public** before submission. Unlisted videos won't qualify per submission rules.

---

## 9. Tools-of-Last-Resort Backup Plan

If something breaks on May 14 (CapCut won't open, screen recording fails, etc.):

- **iMovie** (Mac) or **Clipchamp** (Windows) are pre-installed and work fine for a 3-minute project
- **Loom** can record screen + voiceover together in one go — lower quality but reliable
- A 2:30 video that exists beats a 3:00 video that doesn't

---

## 10. Final Self-Test Before Upload

Watch the finished video three times:

1. **Cold:** No audio. Can you follow the story from visuals alone? If not, add captions.
2. **With audio, no visuals:** Listen on headphones only. Does the voiceover stand on its own? Are the key claims ("Gemma 4 E4B via Ollama", "85-90% residual vision", "so they get the price they deserve") clearly audible?
3. **Full:** Watch as a judge would — distracted, half-paying-attention. Did you grip them in the first 15 seconds? Did the demo prove the product works? Did the close leave a feeling?

If yes on all three, ship.

---

**End of video production plan. Hand to Claude Code if you want help drafting the voiceover script word-for-word.**
