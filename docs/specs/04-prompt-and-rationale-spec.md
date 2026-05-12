# 04. Prompt and Rationale Spec

**Version:** 1.0
**Status:** Draft
**Dependencies:** 02-output-schema.md, 03-runtime-decisions-and-spikes.md
**Owner:** Spec Session Lead

---

## 1. Overview

This spec defines the prompt engineering strategy for **Gemma 4 E4B** via Ollama, including:

1. **System prompt** - Photography coaching principles and output schema instructions
2. **User prompt structure** - Image + EXIF metadata + analysis request
3. **Rationale guidance** - How Gemma should structure its reasoning process (observations → reasoning → priority fixes)
4. **Evidence linking** - How to ground claims in image features (deterministic CV + visual observations)
5. **Refusal handling** - When and how to refuse analysis (medical, identity, surveillance imagery)
6. **Token budget** - Input/output token targets for Gemma 4 E4B inference

**Core Constraint:** Gemma 4 E4B is the primary critique engine. Prompts must work with Ollama's API surface (structured output via JSON mode or client-side validation per Spike 1 results).

**Deferred Item (from Tier 1 review):** Formalize refusal semantics with explicit `is_refusal` and `refusal_reason` fields to unify prompt/schema/runtime behavior. This will be addressed in **Tier 3 (09-validation-and-error-handling-spec.md)**.

---

## 2. System Prompt

### 2.1. Role and Identity

```
You are an expert photography coach analyzing images for photographers at all skill levels (hobbyists, serious amateurs, and working professionals). Your goal is to provide actionable, specific feedback that helps photographers improve their craft.

You evaluate photographs across five dimensions:
1. **Composition** - Rule of thirds, leading lines, framing, balance, negative space
2. **Lighting** - Direction, quality, contrast, shadows, highlights, color temperature
3. **Technical Execution** - Focus, sharpness, exposure, depth of field, noise
4. **Creativity** - Originality, storytelling, mood, perspective, artistic choices
5. **Subject Impact** - Subject isolation, relevance, emotional connection, narrative clarity

Your analysis must be:
- **Specific**: Reference exact image elements (e.g., "foreground subject at bottom-right", "harsh overhead lighting creating nose shadow")
- **Actionable**: Suggest concrete improvements with measurable changes (e.g., "lower camera angle by 30cm", "use f/2.8 to blur background")
- **Grounded**: Link every critique point to observable image features or EXIF metadata
- **Encouraging**: Balance strengths and improvements; even struggling photos have learning opportunities
```

### 2.2. Photography Principles (Inherited from v1)

The system prompt must include **photography coaching principles** that guide evaluation. These principles are carried forward from v1 Gemini baseline (documented in 00-baseline-audit.md lines 119-120).

**v2 Enhancement:** Add explicit grounding instructions:

```
When analyzing, always:
1. Reference specific image regions (e.g., "top-left third", "middle ground at horizon line")
2. Ground technical claims in EXIF data when available (focal length, aperture, shutter speed, ISO)
3. Identify visual evidence for your observations (e.g., "blown highlights in sky visible as RGB 255,255,255 patches")
4. Provide measurable improvements (e.g., "crop 10% from left edge", "increase exposure by +1 stop")
```

### 2.3. Output Schema Instructions

```
Return your analysis as **valid JSON** conforming to PhotoAnalysisV2 schema (v2.0).

Required fields:
- schema_version: "2.0"
- model_id: "gemma-4-e4b"
- quantization: (if applicable, e.g., "Q4_K_M")
- timestamp: (Unix timestamp in milliseconds)
- scores: { composition, lighting, technique, creativity, subjectImpact } (each 0.0-10.0)
- critique: { composition, lighting, technique, overall } (paragraph strings)
- strengths: array of 3-6 specific strengths
- improvements: array of 3-6 specific improvements
- learningPath: array of 2-4 learning resources or next steps
- settingsEstimate: { focalLength, aperture, shutterSpeed, iso } (infer from EXIF or image analysis)
- rationale: { observations, reasoningSteps, priorityFixes } (see section 3 below)
- evidence: array of evidence items linking claims to sources (see section 4 below)

Optional fields:
- boundingBoxes: spatial annotations for composition issues (see 05-deterministic-cv-spec.md for fallback)

**IMPORTANT - Refusal Mode:**
If the image depicts medical content (injuries, surgical procedures, medical conditions), identity documents (passports, licenses, ID cards), or surveillance footage with identifiable faces, you MUST refuse analysis:

1. Set all scores to 0.0
2. Set all critique fields to: "Analysis declined - image outside coaching scope"
3. Set strengths and improvements to empty arrays []
4. Set learningPath to ["Photography Coach focuses on creative and technical photography. This image type is outside our scope."]
5. Set rationale.observations to ["Image content detected: [medical/identity/surveillance]"]
6. Set rationale.reasoningSteps to ["Analysis declined per content policy"]
7. Set rationale.priorityFixes to []

This ensures schema validity while signaling refusal to the client.
```

---

## 3. Rationale Structure

### 3.1. Purpose

The **rationale** field (renamed from v1 "thinking") exposes the model's reasoning process to:

1. **Build trust** - Users see how the model reached its conclusions
2. **Enable debugging** - Developers can identify prompt/model issues
3. **Support learning** - Photographers understand the analysis methodology

### 3.2. Schema Definition

```typescript
interface Rationale {
  observations: string[];      // 5-8 raw observations about the image
  reasoningSteps: string[];    // 3-5 reasoning steps from observations to scores
  priorityFixes: string[];     // 2-3 highest-impact improvements (subset of improvements array)
}
```

### 3.3. Observations

**Guidelines for Gemma 4 E4B:**

```
List 5-8 factual observations about the image. These should be:
- **Objective**: Describe what you see without judgment (e.g., "subject positioned at right edge" not "subject poorly positioned")
- **Specific**: Reference exact locations, colors, shapes, patterns
- **Grounded**: Link observations to EXIF metadata where relevant (e.g., "f/1.8 aperture (from EXIF) creates shallow depth of field visible in background blur")
- **Comprehensive**: Cover composition, lighting, technical execution, and subject matter

Example observations:
- "Subject (person) occupies bottom-right quadrant, facing left"
- "Horizon line tilted ~3° clockwise (visible in water line at top edge)"
- "Harsh directional lighting from top-right creates strong nose shadow"
- "Background bokeh shows circular blur (f/1.8 from EXIF)"
- "Sky region shows RGB values near (255, 255, 255) indicating blown highlights"
```

### 3.4. Reasoning Steps

**Guidelines for Gemma 4 E4B:**

```
Describe 3-5 steps showing how observations lead to scores and critique:

1. Start with raw observations
2. Apply photography principles (rule of thirds, lighting direction, etc.)
3. Evaluate strengths and weaknesses
4. Assign scores based on evaluation
5. Prioritize improvements by impact

Example reasoning steps:
- "Observation: Subject at right edge → Analysis: Violates rule of thirds, creates visual imbalance → Impact: Composition score reduced to 4.0"
- "Observation: f/1.8 aperture with background blur → Analysis: Effective subject isolation via shallow DoF → Impact: Technique score boosted to 8.0"
- "Observation: Harsh top-right lighting with nose shadow → Analysis: Unflattering portrait lighting (no fill light) → Impact: Lighting score 5.0, improvement needed"
```

### 3.5. Priority Fixes

**Guidelines for Gemma 4 E4B:**

```
Identify the 2-3 highest-impact improvements from your improvements array. These should:
- **Maximize impact**: Focus on changes that improve multiple scores (e.g., fixing blown highlights improves lighting + technique)
- **Be feasible**: Suggest changes achievable in post-processing or via reshoot with minor adjustments
- **Be ordered**: List in priority order (highest impact first)

Example priority fixes:
- "Crop to place subject on left third line (improves composition from 4.0 → 7.0)"
- "Recover blown highlights via exposure reduction -1 stop (improves lighting + technique)"
- "Add fill flash or reflector for next shoot to eliminate nose shadow (improves lighting from 5.0 → 8.0)"
```

---

## 4. Evidence Linking

### 4.1. Purpose

The **evidence** array links critique claims to their sources, enabling:

1. **Transparency** - Users see how conclusions were reached
2. **Verification** - Developers can audit model claims against image data
3. **Grounding** - Reduces hallucination by requiring explicit source citations

### 4.2. Schema Definition

```typescript
interface EvidenceItem {
  claim: string;                          // The critique claim being supported
  source: 'visual' | 'exif' | 'cv';       // Source type
  details: string;                        // Supporting details from the source
  confidence?: 'high' | 'medium' | 'low'; // Optional confidence level
}
```

### 4.3. Evidence Types

#### Visual Evidence

**Source:** Direct observation of image pixels/features.

**Example:**
```json
{
  "claim": "Sky highlights are blown (overexposed)",
  "source": "visual",
  "details": "Top 20% of image shows RGB values at (255, 255, 255) with no detail recovery possible",
  "confidence": "high"
}
```

#### EXIF Evidence

**Source:** Metadata embedded in image file (focal length, aperture, shutter speed, ISO, camera model, lens, timestamp).

**Example:**
```json
{
  "claim": "Shallow depth of field achieved via wide aperture",
  "source": "exif",
  "details": "EXIF aperture: f/1.8 (35mm lens on full-frame sensor)",
  "confidence": "high"
}
```

#### CV Evidence (Deterministic Computer Vision)

**Source:** Automated image analysis (histogram, focus map, edge detection, color distribution). See **05-deterministic-cv-spec.md** for details.

**Example:**
```json
{
  "claim": "Subject is sharp while background is blurred",
  "source": "cv",
  "details": "Focus map shows peak sharpness at center region (subject face), edge detection minimal in background",
  "confidence": "high"
}
```

### 4.4. Evidence Guidelines

**For Gemma 4 E4B:**

```
For every major claim in your critique, provide at least one evidence item. Prioritize:

1. **EXIF evidence** for technical claims (aperture, focal length, exposure settings)
2. **Visual evidence** for compositional and lighting claims (subject placement, shadow direction, color balance)
3. **CV evidence** (when available) for quantitative claims (sharpness distribution, histogram analysis)

Confidence levels:
- **high**: Directly observable or from EXIF metadata
- **medium**: Inferred from image analysis (e.g., estimating focal length from perspective)
- **low**: Subjective or speculative (e.g., "photographer likely intended X")

Aim for 4-8 evidence items per analysis. Every score and major critique point should be traceable to at least one evidence item.
```

---

## 5. User Prompt Structure

### 5.1. Prompt Template

```
Analyze this photograph based on the photography principles provided in the system prompt.

**Image:** [base64-encoded image data will be provided via Ollama's image input mechanism]

**EXIF Metadata (if available):**
{exif_json}

**Analysis Request:**
Provide a comprehensive photography coaching analysis covering:
1. Composition (rule of thirds, leading lines, balance, framing)
2. Lighting (direction, quality, shadows, highlights, color temperature)
3. Technical Execution (focus, sharpness, exposure, depth of field, noise)
4. Creativity (originality, storytelling, mood, perspective)
5. Subject Impact (isolation, relevance, emotional connection, narrative)

Return your analysis as valid JSON conforming to PhotoAnalysisV2 schema (v2.0).

**Remember:**
- Ground all claims in observable evidence (visual, EXIF, or CV)
- Provide specific, actionable improvements with measurable changes
- Balance strengths and improvements
- Expose your reasoning process via the rationale field
- If the image depicts medical content, identity documents, or surveillance footage, refuse analysis per the refusal protocol
```

### 5.2. EXIF Injection

**Input Format:**
```json
{
  "focalLength": "35mm",
  "aperture": "f/1.8",
  "shutterSpeed": "1/125",
  "iso": "400",
  "camera": "Canon EOS R5",
  "lens": "RF 35mm f/1.8 IS STM",
  "timestamp": "2026-05-06T14:23:15Z"
}
```

**Handling Missing EXIF:**
- If EXIF unavailable → prompt includes `"EXIF Metadata: Not available (estimate settings from visual analysis)"`
- Gemma must infer settings from visual cues (depth of field → aperture, motion blur → shutter speed, grain → ISO)
- settingsEstimate field becomes best-guess estimation rather than EXIF-grounded fact

### 5.3. Multi-Turn Context (Mentor Chat)

**For follow-up questions** (Mentor Chat feature), the user prompt structure changes:

```
**Previous Analysis Summary:**
- Composition Score: {score}
- Lighting Score: {score}
- Top 3 Improvements: {improvement_list}
- Overall Critique: {critique.overall}

**Conversation History:**
{formatted_chat_history}

**Current Question:**
{user_question}

**Instructions:**
As the photographer's mentor, respond directly and personally to their question. Reference the image and their specific scores/issues from the previous analysis. Maintain context from the conversation history. Show your reasoning process via the thinking field.

Return response as JSON:
{ "answer": string, "thinking": { observations, reasoningSteps, priorityFixes } }
```

**Note:** Mentor chat responses use a simplified schema (answer + thinking) rather than full PhotoAnalysisV2. This is inherited from v1 behavior (see 00-baseline-audit.md lines 203-217).

---

## 6. Token Budget and Optimization

### 6.1. Target Token Counts

**Input (Prompt + Image Encoding):**
- System prompt: ~800 tokens
- User prompt (without EXIF): ~150 tokens
- User prompt (with EXIF): ~200 tokens
- Image encoding: **Variable** (depends on Ollama's internal tokenization; expect 500-2000 tokens for typical photos)
- **Total input target:** 1500-3000 tokens

**Output (JSON Response):**
- PhotoAnalysisV2 JSON: ~800-1200 tokens (estimated)
  - Scores: ~50 tokens
  - Critique fields: ~300 tokens
  - Strengths/improvements: ~200 tokens
  - Rationale: ~250 tokens
  - Evidence: ~150 tokens
  - Settings/metadata: ~50 tokens
- **Total output target:** 800-1200 tokens

**Round-trip total:** 2300-4200 tokens per analysis

### 6.2. Token Count Tracking

**Dependency:** Spike 1 must determine if Ollama API returns token counts (prompt_eval_count, eval_count).

**If available:**
- Display real token counts in economics dashboard (like v1 Gemini baseline)
- Track per-photo and session-cumulative totals

**If unavailable:**
- Fallback to client-side estimation (tokenize prompt via tiktoken or similar)
- Economics dashboard shows "N/A" or estimated counts with disclaimer

### 6.3. Optimization Strategies

**For production inference:**

1. **Prompt caching** (if Ollama supports it):
   - Cache system prompt (static across requests)
   - Only EXIF + user request changes per photo

2. **Schema simplification** (if Spike 1 reveals latency issues):
   - Make boundingBoxes fully optional (rely on deterministic CV)
   - Reduce evidence array to 4 items minimum (currently 4-8)

3. **Batching** (future optimization, not MVP):
   - Batch multiple photos in single request for portfolio review use case

---

## 7. Refusal Handling

### 7.1. Refusal Triggers

Gemma 4 E4B must refuse analysis for:

1. **Medical imagery**: Injuries, surgical procedures, X-rays, medical conditions, wounds
2. **Identity documents**: Passports, driver's licenses, ID cards, credit cards, SSN cards
3. **Surveillance footage**: Security camera footage with identifiable faces, license plates

**Rationale:** These image types:
- Violate privacy norms (identity docs, surveillance)
- Require medical expertise (medical imagery)
- Are outside the scope of photography coaching

### 7.2. Refusal Protocol

**When refusal triggered:**

1. Set all scores to `0.0` (composition, lighting, technique, creativity, subjectImpact)
2. Set all critique fields to: `"Analysis declined - image outside coaching scope"`
3. Set `strengths` and `improvements` to empty arrays `[]`
4. Set `learningPath` to single-item array: `["Photography Coach focuses on creative and technical photography. This image type is outside our scope."]`
5. Set `rationale`:
   ```json
   {
     "observations": ["Image content detected: [medical/identity/surveillance]"],
     "reasoningSteps": ["Analysis declined per content policy"],
     "priorityFixes": []
   }
   ```
6. Set `evidence` to empty array `[]` (or single item explaining refusal)

**This ensures:**
- Schema validation passes (all required fields present)
- Client code detects refusal via all-zero scores (per 02-output-schema.md validatePhotoAnalysisV2() function)
- User sees clear refusal message instead of confusing partial output

### 7.3. Deferred: Explicit Refusal Fields

**Carried forward from Tier 1 review:**

The current refusal protocol relies on **implicit signaling** (all scores = 0.0). This creates a **temporary split** between:

1. **Prompt schema (strict):** JSON Schema enforces minItems: 3 for strengths/improvements (encourages substantive output during prompting)
2. **Runtime validation (lenient):** Zod's `validatePhotoAnalysisV2()` relaxes constraints when detecting refusal (all scores = 0.0), allowing empty arrays

**This split works for MVP but is brittle** (relies on inferring intent from score values). Future enhancement (Tier 3 - 09-validation-and-error-handling-spec.md):

**Add explicit fields to v2 schema:**
```typescript
interface PhotoAnalysisV2 {
  // ... existing fields ...
  is_refusal?: boolean;           // Explicit refusal flag
  refusal_reason?: string;        // Human-readable reason
  refusal_category?: 'medical' | 'identity' | 'surveillance' | 'other';
}
```

**Benefits:**
- Unambiguous refusal detection (no need to check all scores = 0.0)
- Unifies prompt schema and runtime validation (both check `is_refusal` field)
- Structured refusal reasons (UI can show category-specific messages)
- Future-proof for additional refusal categories

**This will be formalized in Tier 3.** For now, Tier 2 specs proceed with implicit refusal (all scores = 0.0) and temporary schema/validation split.

---

## 8. Prompt Examples

### 8.1. Example 1: Successful Analysis

**Input:**
```
[System prompt as defined in section 2]

Analyze this photograph based on the photography principles provided in the system prompt.

**Image:** [Portrait photo: person at right edge, harsh overhead lighting, f/1.8 aperture, 35mm focal length]

**EXIF Metadata:**
{
  "focalLength": "35mm",
  "aperture": "f/1.8",
  "shutterSpeed": "1/125",
  "iso": "400",
  "camera": "Canon EOS R5",
  "lens": "RF 35mm f/1.8 IS STM"
}

[Analysis request as defined in section 5.1]
```

**Expected Output (truncated for brevity):**
```json
{
  "schema_version": "2.0",
  "model_id": "gemma-4-e4b",
  "quantization": "Q4_K_M",
  "timestamp": 1746540195000,
  "scores": {
    "composition": 4.5,
    "lighting": 5.0,
    "technique": 8.0,
    "creativity": 6.5,
    "subjectImpact": 7.0
  },
  "critique": {
    "composition": "Subject positioned at right edge creates visual imbalance and violates rule of thirds. Horizon line tilted ~3° clockwise. Negative space on left is underutilized.",
    "lighting": "Harsh overhead lighting creates unflattering nose shadow and forehead hotspot. No fill light or reflector used. Color temperature appears neutral (~5500K).",
    "technique": "Sharp focus on subject face with effective shallow DoF (f/1.8) for background separation. Exposure well-balanced except for minor sky clipping. Minimal noise at ISO 400.",
    "overall": "Technically proficient portrait with strong subject isolation via bokeh, but compositional placement and lighting direction need improvement. Subject's expression and pose show good emotional connection."
  },
  "strengths": [
    "Shallow depth of field (f/1.8) effectively isolates subject from background",
    "Sharp focus on subject's eyes and face",
    "Good subject expression and natural pose",
    "Clean background with pleasing bokeh"
  ],
  "improvements": [
    "Reposition subject to left third line for better visual balance (crop or reshoot)",
    "Straighten horizon line (rotate 3° counter-clockwise in post)",
    "Add fill light or reflector to soften nose shadow (for future shoots)",
    "Recover blown sky highlights via exposure reduction -0.5 stops"
  ],
  "learningPath": [
    "Study rule of thirds composition - try placing subjects on vertical third lines",
    "Learn portrait lighting patterns (Rembrandt, loop, butterfly) to control shadows",
    "Practice using reflectors or fill flash to balance harsh directional light"
  ],
  "settingsEstimate": {
    "focalLength": "35mm",
    "aperture": "f/1.8",
    "shutterSpeed": "1/125",
    "iso": "400"
  },
  "rationale": {
    "observations": [
      "Subject (person) occupies bottom-right quadrant, facing left",
      "Horizon line tilted ~3° clockwise (visible in background elements)",
      "Harsh directional lighting from top creates nose shadow",
      "Background shows circular bokeh indicating wide aperture (f/1.8 from EXIF)",
      "Sky region at top shows RGB values near (255, 255, 255) - blown highlights",
      "Subject's eyes are sharp with good catch lights",
      "Color temperature appears neutral daylight (~5500K)"
    ],
    "reasoningSteps": [
      "Observation: Subject at right edge → Violates rule of thirds, creates imbalance → Composition score 4.5",
      "Observation: f/1.8 aperture with background blur → Effective subject isolation → Technique score 8.0",
      "Observation: Harsh overhead lighting with nose shadow → Unflattering portrait lighting → Lighting score 5.0",
      "Observation: Sharp focus on eyes, good expression → Strong subject connection → Subject Impact score 7.0"
    ],
    "priorityFixes": [
      "Reposition subject to left third line (highest impact: composition 4.5 → 7.5)",
      "Add fill light for future portraits (improves lighting from 5.0 → 8.0)"
    ]
  },
  "evidence": [
    {
      "claim": "Shallow depth of field achieved via wide aperture",
      "source": "exif",
      "details": "EXIF aperture: f/1.8 (35mm lens)",
      "confidence": "high"
    },
    {
      "claim": "Sky highlights are blown (overexposed)",
      "source": "visual",
      "details": "Top 15% of image shows RGB values at (255, 255, 255)",
      "confidence": "high"
    },
    {
      "claim": "Subject is sharp while background is blurred",
      "source": "visual",
      "details": "Face region shows crisp edges and detail, background shows circular blur patterns",
      "confidence": "high"
    },
    {
      "claim": "Horizon line tilted ~3° clockwise",
      "source": "visual",
      "details": "Background horizontal elements (water line, fence) slope downward right",
      "confidence": "medium"
    }
  ],
  "tokenUsage": {
    "promptTokens": 1847,
    "completionTokens": 1053,
    "totalTokens": 2900
  }
}
```

### 8.2. Example 2: Refusal (Medical Imagery)

**Input:**
```
[System prompt]

Analyze this photograph...

**Image:** [X-ray showing fractured bone]

**EXIF Metadata:** Not available

[Analysis request]
```

**Expected Output:**
```json
{
  "schema_version": "2.0",
  "model_id": "gemma-4-e4b",
  "quantization": "Q4_K_M",
  "timestamp": 1746540195000,
  "scores": {
    "composition": 0.0,
    "lighting": 0.0,
    "technique": 0.0,
    "creativity": 0.0,
    "subjectImpact": 0.0
  },
  "critique": {
    "composition": "Analysis declined - image outside coaching scope",
    "lighting": "Analysis declined - image outside coaching scope",
    "technique": "Analysis declined - image outside coaching scope",
    "overall": "Analysis declined - image outside coaching scope"
  },
  "strengths": [],
  "improvements": [],
  "learningPath": [
    "Photography Coach focuses on creative and technical photography. This image type is outside our scope."
  ],
  "settingsEstimate": {
    "focalLength": "unknown",
    "aperture": "unknown",
    "shutterSpeed": "unknown",
    "iso": "unknown"
  },
  "rationale": {
    "observations": [
      "Image content detected: medical imagery (X-ray)"
    ],
    "reasoningSteps": [
      "Analysis declined per content policy - medical imagery requires specialized expertise"
    ],
    "priorityFixes": []
  },
  "evidence": [],
  "tokenUsage": {
    "promptTokens": 1523,
    "completionTokens": 187,
    "totalTokens": 1710
  }
}
```

**Client handling:**
- `validatePhotoAnalysisV2()` detects all scores = 0.0
- UI displays refusal message: "This image is outside our coaching scope. Photography Coach focuses on creative and technical photography."

---

## 9. Prompt Iteration Strategy

### 9.1. Spike 1 Validation

**During Spike 1 (Gemma 4 E4B via Ollama):**

1. Test prompts on 5 diverse photos (portrait, landscape, street, macro, action)
2. Validate schema conformance (all 5 must parse without errors)
3. Compare axis scores to Gemini 3 Pro baseline (±2 points acceptable per 03-runtime-decisions-and-spikes.md)
4. Inspect rationale quality (observations specific? reasoning logical? priority fixes actionable?)
5. Check evidence linking (4+ evidence items per photo? sources accurate?)

**Pass criteria:**
- 5/5 photos validate against PhotoAnalysisV2 schema
- Axis scores within ±2 of Gemini baseline
- Rationale demonstrates clear reasoning chain
- Evidence items ground major claims

**Fail scenarios → fallback paths:**
- Schema validation fails → simplify schema (Option A: drop optional fields)
- Axis scores deviate → relax precision (±3 points), tune prompts
- Rationale quality poor → add more reasoning examples to system prompt
- Evidence linking missing → add explicit "cite evidence for every claim" instruction

### 9.2. Post-Spike Refinement

**After Spike 1 pass:**

1. **A/B test prompt variations** (if time allows):
   - Shorter system prompt (reduce token count)
   - More directive language ("You MUST cite evidence")
   - Additional examples in prompt

2. **Collect edge cases:**
   - Low-light photos (ISO 6400+)
   - Extreme compositions (rule-breaking intentional art)
   - Ambiguous subjects (abstract, experimental)

3. **Iterate on refusal detection:**
   - Test medical imagery (bandages, medical equipment) vs acceptable photos (doctor headshots, medical building exteriors)
   - Test surveillance footage (security cameras) vs acceptable photos (street photography with incidental people)

---

## 10. Open Questions for Spike 1

### 10.1. Structured Output Support

**Question:** Does Ollama support native JSON schema enforcement (like Gemini's `responseSchema`)?

**Test:** Check Ollama API docs + experiment with schema parameter in `/api/generate` endpoint.

**Impact on prompts:**
- **If YES** → Include JSON Schema in API call, rely on Ollama to enforce structure
- **If NO** → Add more explicit schema instructions to system prompt, enforce via Zod client-side

**Fallback:** If no native support → client-side validation with retry logic (parse → validate → retry if invalid, max 3 attempts per 03-runtime-decisions-and-spikes.md).

### 10.2. Image Encoding

**Question:** How does Ollama encode images in prompts? (Base64 inline? Separate image input? Token count impact?)

**Test:** Send test image via Ollama API, inspect token counts and latency.

**Impact on token budget:**
- If image encoding is expensive (2000+ tokens) → prioritize prompt brevity
- If encoding is efficient (500 tokens) → prompts can be more verbose

### 10.3. Refusal Detection Reliability

**Question:** Can Gemma 4 E4B reliably detect medical/identity/surveillance imagery?

**Test:** Include 2-3 edge case images in Spike 1 validation set:
- Medical equipment in clinical setting (should refuse)
- Doctor headshot (should NOT refuse - just a portrait)
- Security camera footage with faces (should refuse)
- Street photography with incidental people (should NOT refuse)

**Impact:**
- If detection unreliable → add pre-processing CV filter to catch obvious cases before sending to Gemma
- If detection works well → trust Gemma's content classification

---

## 11. Prompt Versioning and Storage

### 11.1. Version Control

**Prompts are code.** Store in version control:

```
src/prompts/
  system-prompt-v2.0.txt         # Main system prompt for Gemma 4 E4B
  user-prompt-template-v2.0.txt  # User prompt template
  refusal-protocol-v2.0.txt      # Refusal handling instructions
  mentor-prompt-template-v2.0.txt # Mentor chat follow-up prompt
```

**Version bump triggers:**
- Schema changes (e.g., v2.0 → v2.1 adds new fields)
- Prompt strategy changes (e.g., adding few-shot examples)
- Model changes (e.g., Gemma 4 E4B → Gemma 5)

### 11.2. Prompt A/B Testing (Future)

**For production optimization:**

1. Store multiple prompt variants (A/B/C) with metadata (version, performance metrics)
2. Randomly assign users to prompt variant (50/50 split A vs B)
3. Track metrics: schema validation rate, user satisfaction (explicit feedback), critique quality (human eval sample)
4. Promote winning variant after statistical significance (e.g., 200 photos per variant)

**Not required for hackathon MVP**, but document prompt versioning for future iterations.

---

## 12. Dependencies and Blockers

### 12.1. Blocking Dependencies

**This spec (04) blocks:**
- **06-architecture-spec.md** - needs prompt structure to define Ollama integration layer
- **08-ui-adaptation-spec.md** - needs rationale structure to design UI components
- **09-validation-and-error-handling-spec.md** - needs refusal protocol for error handling

**This spec (04) is blocked by:**
- **Spike 1 (Gemma via Ollama)** - MUST resolve:
  - Structured output support (native JSON schema or client-side validation?)
  - Image encoding mechanism (base64 inline or separate input?)
  - Token count availability (real metrics or estimation?)

**Timeline:** Spike 1 must complete on Day 1 morning (4-hour time box) before finalizing this spec. Current version is **draft assuming Spike 1 pass**. If Spike 1 fails → fallback to Option B/C per 03-runtime-decisions-and-spikes.md.

### 12.2. Deferred to Tier 3

**Explicit refusal fields** (`is_refusal`, `refusal_reason`, `refusal_category`) → **09-validation-and-error-handling-spec.md**

Current implicit refusal (all scores = 0.0) works for MVP but should be formalized in Tier 3 for production robustness.

---

## 13. Success Criteria

### 13.1. Prompt Quality Metrics

**This prompt spec succeeds if:**

1. ✅ Gemma 4 E4B produces valid PhotoAnalysisV2 JSON in 95%+ of cases (Spike 1 validation)
2. ✅ Axis scores within ±2 points of Gemini baseline (per-photo comparison)
3. ✅ Rationale field demonstrates clear reasoning chain (observations → reasoning → priority fixes)
4. ✅ Evidence array contains 4+ items per analysis, grounding major claims
5. ✅ Refusal protocol correctly identifies medical/identity/surveillance imagery (100% on test set)
6. ✅ Token budget stays within 2300-4200 tokens per analysis (90th percentile)

### 13.2. User Experience Metrics (Post-Launch)

**Measured via user feedback:**

1. Critique specificity: Users rate suggestions as "actionable" (target: 80%+ positive)
2. Rationale clarity: Users find reasoning process helpful (target: 75%+ positive)
3. Refusal appropriateness: Zero false positives on acceptable photography (portraits, street, etc.)

---

## 14. Summary

This spec defines the **prompt engineering strategy for Gemma 4 E4B** as the core critique engine for Photography Coach v2. Key decisions:

1. **System prompt** provides photography principles + schema instructions + refusal protocol
2. **User prompt** includes image + EXIF + analysis request
3. **Rationale structure** (observations → reasoning → priority fixes) exposes model's reasoning
4. **Evidence linking** grounds claims in visual/EXIF/CV sources
5. **Refusal handling** uses implicit signaling (all scores = 0.0) for MVP, with explicit fields deferred to Tier 3
6. **Token budget** targets 2300-4200 tokens per analysis

**Next steps:**
1. Complete Spike 1 (Gemma via Ollama) on Day 1 morning to validate prompt strategy
2. Iterate prompts based on Spike 1 results (schema conformance, score accuracy, rationale quality)
3. Proceed to **05-deterministic-cv-spec.md** to define grounding data for evidence linking

**Deferred item:** Formalize refusal semantics with explicit fields in Tier 3 (09-validation-and-error-handling-spec.md).

---

**End of 04-prompt-and-rationale-spec.md**
