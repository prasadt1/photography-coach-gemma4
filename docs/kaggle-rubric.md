# Kaggle Hackathon — Judging Criteria & Submission Requirements

**Hackathon:** Gemma 4 Good Hackathon (Kaggle)
**Source:** Official Kaggle hackathon page (verbatim)
**Submission deadline:** May 18, 2026 11:59 PM UTC
**Word limit:** 1,500 words for writeup (penalty if exceeded)
**Video limit:** 3 minutes max, posted to YouTube (no login required)

---

## Judging Criteria (Total: 100 points)

### 1. Impact & Vision (40 points) — LARGEST CATEGORY

> *"As demonstrated in your video, how clearly and compellingly does your project address a significant real-world problem? Is the vision inspiring and does the solution have a tangible potential for positive change?"*

**Key signals judges look for:**
- Significant real-world problem (not contrived)
- Clarity of the problem statement
- Compelling demonstration in the video
- Inspiring vision
- Tangible potential for positive change

**This category is judged primarily on the VIDEO, not the writeup.**

### 2. Video Pitch & Storytelling (30 points)

> *"How exciting, engaging, and well-produced is the video? Does it tell a powerful story that captures the viewer's imagination?"*

**Key signals:**
- Excitement / energy
- Engagement
- Production quality
- Powerful storytelling arc (problem → tension → resolution)
- Captures imagination

**The video is overwhelmingly the artifact that scores this category.**

### 3. Technical Depth & Execution (30 points)

> *"As verified by the code repository and writeup, how innovative is the use of Gemma 4's unique features? Is the technology real, functional, well-engineered, and not just faked for the demo?"*

**Key signals:**
- Innovative use of Gemma 4's unique features (multimodal, structured output, etc.)
- Real, functional technology (not faked)
- Well-engineered code
- Verified by reviewing the GitHub repo
- Verified by reviewing the writeup

**This category is judged via the writeup + repo. Code quality and architecture matter.**

---

## Submission Requirements (All Mandatory)

### A. Kaggle Writeup (≤1,500 words)
- Title + subtitle
- Detailed analysis of the submission
- Track must be selected
- Word count ≤1,500 (penalty if exceeded)
- Acts as "the proof of work" — backs up the video with engineering verification
- Should explain: architecture, how Gemma 4 is used, challenges overcome, why technical choices were right

### B. Demo Video (≤3 minutes)
- **Hosted on YouTube** (public or unlisted; no login)
- Direct link to the video
- "The most important part of your submission"
- Should: tell a story, demonstrate real-world impact, leave judges inspired

### C. Public Code Repository
- GitHub or Kaggle Notebook
- Publicly accessible (no login, no paywall)
- Well-documented
- Clearly shows Gemma 4 implementation
- Used to verify project authenticity

### D. Live Demo
- URL or downloadable files for a working demo
- Publicly accessible (no login, no paywall)
- Lets judges experience the project firsthand

### E. Media Gallery
- Cover image **required** to submit
- Any additional images/videos that support the submission

---

## Tracks We're Targeting

### Main Track ($100,000 pool)
- 1st: $50,000
- 2nd: $25,000
- 3rd: $15,000
- 4th: $10,000

> *"Awarded to the best overall projects that demonstrate exceptional vision, technical execution, and potential for real-world impact."*

### Special Technology Track — Ollama ($10,000)

> *"For the best project that utilizes and showcases the capabilities of Gemma 4 running locally via Ollama."*

**Eligibility:** Projects can win Main + Special Tech simultaneously.

### Possibly Eligible Secondary Tracks (Stretch)

**Impact Track — Safety & Trust ($10,000):**
> *"Pioneer frameworks for transparency and reliability, ensuring AI remains grounded and explainable."*

**Impact Track — Digital Equity & Inclusivity ($10,000):**
> *"Break down barriers through linguistic diversity, intuitive interfaces, and tools that help close the AI skills gap."*

**Impact Track — Future of Education ($10,000):**
> *"Reimagine the learning journey by building multi-tool agents that adapt to the individual and empower the educator through seamless integration."*

---

## What Judges DO NOT Evaluate Directly

Note that the rubric does NOT have line items for:
- "Product polish" (only via Video Pitch indirectly)
- "Demo readiness" (only via the Live Demo requirement)
- "Number of features"
- "Size of feature set"

**Implication:** Adding more features after MVP doesn't score directly. Polish that shows up in the video does.

---

## Strategic Implications for Photography Coach v2

| Score driver | Where to invest |
|---|---|
| Impact & Vision (40 pts) | **VIDEO** — emotional opener, real-world problem framing, "for good" angle |
| Video Pitch (30 pts) | **VIDEO** — production quality, music, captions, narrative arc |
| Technical Depth (30 pts) | **WRITEUP + REPO** — clean architecture, honest claims, verifiable code |

The video is the dominant artifact for **70%** of the score (Impact + Video Pitch). Even Technical Depth gets indirectly boosted when the writeup explains complexity clearly.

---

## Anti-patterns to Avoid

Based on common hackathon failure modes:
- Tutorial-style "click-through" videos (low storytelling)
- Inventory-list pitches ("look at all the things we built")
- Fake demos that look impressive but don't work
- Abstract "AI is amazing" framing with no concrete user
- Overstating capabilities the code doesn't have
- Generic AI fluff with no specific human moment
- Writeup that reads like marketing copy, not engineering
- Slow opening — judges decide in the first 20 seconds

---

## 🌟 Direct Judge Tips (from Glenn, Gemma team PMM, in Kaggle discussion)

**Verbatim post from a Gemma 4 Good Hackathon judge:**

> Hi Kagglers,
> My name is Glenn, and I'm a PMM on the Gemma team. I've been part of this journey since the very first Gemma release...
>
> As a judge, I'm looking for projects with technical depth, but I also want to help your work reach as many people as possible. **A powerful video is the best way to ensure your solution gets the attention it deserves.** While Video Pitch & Storytelling is 30% of your score, its real value is in helping the world understand the impact of what you've built.

### Three Past Winners He Highlighted

| Past project | Why it stood out |
|---|---|
| **Assistive Tech for the Visually Impaired** | "Deeply personal. A developer built a device to help his blind brother navigate the world. It perfectly captures the spirit of the Health & Sciences and Digital Equity tracks by solving a real-world accessibility challenge with empathy." |
| **Skin Health Tracking** | "A masterclass in a demo video. **The developer is on camera, clearly explaining the impact, and showing the app in action.** It's professional, grounded, and clearly demonstrates the real-world utility." |
| **Voice-Controlled Computing** | "While not a Gemma project, the **showmanship** here stands out. Forward-thinking use case + **seamless execution**. A great example of the **'wow' factor.**" |

### His Three Pieces of Advice (Explicit)

1. **Talk to real users.** *"If possible, interview the people you're building for. Their feedback will make your solution more practical and your story much more authentic."*

2. **Tell a story.** *"Don't just show the code; show us the person whose life is changed by your solution."*

3. **Show, don't just tell.** *"Use your 3-minute video to prove your project is functional and impactful."*

### Implications for Photography Coach v2

| Judge criterion | Our current state | What to add |
|---|---|---|
| **Personal story / empathy** | Writeup has the "Saturday mentor" hook (good) | Open the video with the same personal moment, voiced by the developer |
| **Developer on camera** | Video script is voiceover + screen recording only | **Add 10-15s of Prasad on camera** — opener or closer |
| **Real user feedback** | None yet | Get 1-2 short photographer quotes (even informal) — include in video AND writeup |
| **Showmanship / wow factor** | Vault Mode is the architectural wow; voice + Compare Two are demo wows | Make sure ONE moment hits "wow" — most likely candidate: live voice mentor reply with TTS, or the moment Vault Mode visibly cuts the network |
| **"Show don't tell" — functional and impactful** | Strong on functional; needs more on impactful | Show concrete outcome: "this saved Priya 2 hours on her Sunday cull" or similar |

**These tips are signal — Glenn is on the judging panel and wrote this himself. Treat them as additional rubric, not advisory.**
