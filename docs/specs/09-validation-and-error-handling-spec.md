# 09. Validation and Error Handling Spec

**Version:** 1.0
**Status:** Draft
**Dependencies:** 02-output-schema.md, 04-prompt-and-rationale-spec.md, 06-architecture-spec.md
**Owner:** Spec Session Lead

---

## 1. Overview

This spec defines **validation and error handling** for Photography Coach v2, including:

1. **Unified refusal handling** - Explicit `is_refusal` fields (eliminates Tier 2 schema/validation split)
2. **Schema validation** - Zod-based runtime validation with clear error messages
3. **Retry logic** - Automatic retries for transient failures
4. **Error scenarios** - Comprehensive error taxonomy with user-facing messages
5. **Debugging support** - Structured logging for development and troubleshooting

**Core Enhancement (from Tier 2 deferred item):** This spec **unifies refusal semantics** by adding explicit fields to v2 schema, eliminating the temporary split between strict prompt schema (minItems: 3) and lenient runtime validation (allows empty arrays for refusal).

---

## 2. Unified Refusal Handling

### 2.1. Problem Statement (Tier 2 Split)

**Tier 2 approach (temporary):**
- **Prompt schema (JSON Schema):** Enforces `minItems: 3` for `strengths` and `improvements` arrays (strict, encourages substantive content)
- **Runtime validation (Zod):** Detects refusal via implicit signal (all scores = 0.0), relaxes constraints conditionally
- **Issue:** Brittle (relies on inferring intent from scores), inconsistent (different rules for prompting vs validation)

**Example of split:**
```typescript
// JSON Schema (prompt-time)
"strengths": { "type": "array", "items": { "type": "string" }, "minItems": 3, "maxItems": 6 }

// Zod validation (runtime)
if (allScoresZero) {
  // Refusal detected, relax constraints
  strengths: z.array(z.string()).max(6) // No minItems
} else {
  strengths: z.array(z.string()).min(3).max(6)
}
```

### 2.2. Tier 3 Solution (Unified Refusal)

**Add explicit fields to PhotoAnalysisV2 schema:**

```typescript
interface PhotoAnalysisV2 {
  // ... existing fields ...
  schema_version: string;
  model_id: string;
  quantization?: string;
  timestamp?: number;
  scores: ScoreBreakdown;
  critique: CritiqueBreakdown;
  strengths: string[];
  improvements: string[];
  learningPath: string[];
  settingsEstimate: CameraSettings;
  boundingBoxes?: BoundingBox[];
  rationale: Rationale;
  evidence?: EvidenceItem[];
  tokenUsage?: TokenUsage;

  // NEW: Explicit refusal fields
  is_refusal?: boolean;                   // Explicit refusal flag
  refusal_reason?: string;                // Human-readable reason
  refusal_category?: RefusalCategory;     // Structured category
}

type RefusalCategory =
  | 'medical'        // Medical imagery (injuries, procedures, conditions)
  | 'identity'       // Identity documents (passports, licenses, ID cards)
  | 'surveillance'   // Surveillance footage with identifiable faces
  | 'inappropriate'  // Inappropriate content (adult, violent, etc.)
  | 'other';         // Other refusal reasons
```

**Benefits:**
1. **Unambiguous detection:** Check `is_refusal === true` (no score inference)
2. **Unified validation:** Same rules for prompt schema and runtime validation
3. **Structured reasons:** UI can display category-specific messages
4. **Future-proof:** Easy to add new categories

### 2.3. Updated Prompt Instructions

**System prompt addition** (replaces Tier 2 refusal protocol):

```
**IMPORTANT - Refusal Protocol:**

If the image depicts content outside photography coaching scope:
- Medical imagery (injuries, surgical procedures, X-rays, medical conditions)
- Identity documents (passports, driver's licenses, ID cards, credit cards)
- Surveillance footage (security camera footage with identifiable faces)
- Inappropriate content (adult content, graphic violence, etc.)

You MUST refuse analysis by setting:

1. is_refusal: true
2. refusal_category: (select appropriate category)
3. refusal_reason: (brief explanation, e.g., "Medical imagery detected - X-ray scan")
4. All scores: 0.0
5. All critique fields: "Analysis declined - image outside coaching scope"
6. strengths: [] (empty array)
7. improvements: [] (empty array)
8. learningPath: ["Photography Coach focuses on creative and technical photography. This image type is outside our scope."]
9. rationale.observations: ["Refusal triggered: {category}"]
10. rationale.reasoningSteps: ["Analysis declined per content policy"]
11. rationale.priorityFixes: [] (empty array)

This ensures schema validity while clearly signaling refusal.
```

### 2.4. Updated JSON Schema

**Refusal fields** (added to JSON Schema for prompt-time enforcement):

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "schema_version",
    "model_id",
    "scores",
    "critique",
    "strengths",
    "improvements",
    "learningPath",
    "settingsEstimate",
    "rationale"
  ],
  "properties": {
    "is_refusal": {
      "type": "boolean",
      "description": "True if analysis was refused due to content policy"
    },
    "refusal_reason": {
      "type": "string",
      "description": "Human-readable explanation of refusal (required if is_refusal is true)"
    },
    "refusal_category": {
      "type": "string",
      "enum": ["medical", "identity", "surveillance", "inappropriate", "other"],
      "description": "Structured refusal category (required if is_refusal is true)"
    },
    "strengths": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 0,
      "maxItems": 6,
      "description": "Empty array allowed if is_refusal is true, otherwise min 3"
    },
    "improvements": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 0,
      "maxItems": 6,
      "description": "Empty array allowed if is_refusal is true, otherwise min 3"
    }
    // ... other fields ...
  }
}
```

**Note:** While JSON Schema draft-07 supports conditional validation via `if`/`then`/`else`, we intentionally keep conditional `minItems` enforcement in Zod (see section 2.5) for simplicity. The JSON Schema above uses `minItems: 0` (permissive) for prompting, while Zod enforces stricter rules at runtime based on `is_refusal` flag. This separation keeps the prompt-time schema simpler and centralizes validation logic in one place.

### 2.5. Updated Zod Schema

**Unified validation** (no more conditional logic):

```typescript
import { z } from 'zod';

// Refusal category enum
const refusalCategorySchema = z.enum([
  'medical',
  'identity',
  'surveillance',
  'inappropriate',
  'other'
]);

// PhotoAnalysisV2 schema with refusal fields
export const photoAnalysisV2Schema = z.object({
  schema_version: z.string().regex(/^\d+\.\d+$/),
  model_id: z.string(),
  quantization: z.enum(['Q4_K_M', 'Q5_K_M', 'Q8_0', 'FP16']).optional(),
  timestamp: z.number().int().positive().optional(),

  scores: z.object({
    composition: z.number().min(0).max(10),
    lighting: z.number().min(0).max(10),
    technique: z.number().min(0).max(10),
    creativity: z.number().min(0).max(10),
    subjectImpact: z.number().min(0).max(10)
  }),

  critique: z.object({
    composition: z.string(),
    lighting: z.string(),
    technique: z.string(),
    overall: z.string()
  }),

  strengths: z.array(z.string()).max(6),
  improvements: z.array(z.string()).max(6),
  learningPath: z.array(z.string()).min(2).max(4),

  settingsEstimate: z.object({
    focalLength: z.string(),
    aperture: z.string(),
    shutterSpeed: z.string(),
    iso: z.string()
  }),

  boundingBoxes: z.array(z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().min(0).max(1),
    height: z.number().min(0).max(1),
    label: z.string(),
    confidence: z.number().min(0).max(1),
    source: z.enum(['cv', 'llm'])
  })).optional(),

  rationale: z.object({
    observations: z.array(z.string()).min(1).max(8),
    reasoningSteps: z.array(z.string()).min(1).max(5),
    priorityFixes: z.array(z.string()).max(3)
  }),

  evidence: z.array(z.object({
    claim: z.string(),
    source: z.enum(['visual', 'exif', 'cv']),
    details: z.string(),
    confidence: z.enum(['high', 'medium', 'low']).optional()
  })).optional(),

  tokenUsage: z.object({
    promptTokens: z.number().int().nonnegative(),
    completionTokens: z.number().int().nonnegative(),
    totalTokens: z.number().int().nonnegative()
  }).optional(),

  // NEW: Refusal fields
  is_refusal: z.boolean().optional(),
  refusal_reason: z.string().optional(),
  refusal_category: refusalCategorySchema.optional()
});

// Validation function with refusal-aware refinement
export function validatePhotoAnalysisV2(data: unknown): PhotoAnalysisV2 {
  const parsed = photoAnalysisV2Schema.parse(data);

  // If refusal flagged, verify consistency
  if (parsed.is_refusal === true) {
    // Refusal must have reason and category
    if (!parsed.refusal_reason || !parsed.refusal_category) {
      throw new Error('Refusal must include refusal_reason and refusal_category');
    }

    // Refusal should have zero scores (convention, not enforced)
    const allScoresZero = Object.values(parsed.scores).every(score => score === 0.0);
    if (!allScoresZero) {
      console.warn('Refusal flagged but scores are non-zero (unusual but allowed)');
    }

    // Empty arrays allowed for strengths/improvements
    // (no minItems check needed)
  } else {
    // Non-refusal: enforce minItems for strengths/improvements
    if (parsed.strengths.length < 3) {
      throw new Error(`strengths array must have at least 3 items (got ${parsed.strengths.length})`);
    }
    if (parsed.improvements.length < 3) {
      throw new Error(`improvements array must have at least 3 items (got ${parsed.improvements.length})`);
    }
  }

  return parsed as PhotoAnalysisV2;
}
```

**Key changes:**
- No conditional logic based on score values (explicit `is_refusal` flag)
- Refusals must provide `refusal_reason` and `refusal_category`
- Non-refusals enforce `minItems: 3` for strengths/improvements
- Warning (not error) if refusal has non-zero scores (flexible for edge cases)

### 2.6. UI Refusal Handling

**Detection:**
```typescript
if (analysis.is_refusal === true) {
  // Display refusal message
  displayRefusalMessage(analysis);
} else {
  // Display normal analysis
  displayAnalysisResults(analysis);
}
```

**Refusal message component:**
```typescript
function RefusalMessage({ analysis }: { analysis: PhotoAnalysisV2 }) {
  const categoryMessages = {
    medical: {
      icon: '🏥',
      title: 'Medical Imagery Detected',
      description: 'Photography Coach focuses on creative and technical photography. Medical imagery (X-rays, procedures, injuries) is outside our scope.'
    },
    identity: {
      icon: '🪪',
      title: 'Identity Document Detected',
      description: 'For privacy and security, we cannot analyze identity documents (passports, licenses, ID cards).'
    },
    surveillance: {
      icon: '📹',
      title: 'Surveillance Footage Detected',
      description: 'We cannot analyze surveillance footage or security camera images with identifiable faces for privacy reasons.'
    },
    inappropriate: {
      icon: '⚠️',
      title: 'Inappropriate Content Detected',
      description: 'This image contains content outside our coaching scope.'
    },
    other: {
      icon: '🚫',
      title: 'Analysis Declined',
      description: 'This image is outside our coaching scope.'
    }
  };

  const msg = categoryMessages[analysis.refusal_category!];

  return (
    <div className="refusal-card">
      <div className="refusal-icon">{msg.icon}</div>
      <h3>{msg.title}</h3>
      <p>{msg.description}</p>
      <details>
        <summary>Details</summary>
        <p>Reason: {analysis.refusal_reason}</p>
      </details>
      <button onClick={resetSession}>Upload Different Photo</button>
    </div>
  );
}
```

---

## 3. Schema Validation

### 3.1. Validation Pipeline

**Flow:**
```
Ollama response (JSON string)
  → JSON.parse()
  → validatePhotoAnalysisV2() (Zod)
  → Typed PhotoAnalysisV2 object
  → Client code
```

**Error handling:**
```typescript
async function analyzePhoto(...): Promise<PhotoAnalysisV2> {
  const response = await fetch(`${config.ollama.baseUrl}/api/generate`, { ... });
  const result = await response.json();

  try {
    const parsed = JSON.parse(result.response);
    return validatePhotoAnalysisV2(parsed);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Schema validation failed
      throw new ValidationError('Invalid analysis format', error.errors);
    } else if (error instanceof SyntaxError) {
      // JSON parse failed
      throw new ValidationError('Malformed JSON response', error);
    } else {
      throw error;
    }
  }
}
```

### 3.2. Validation Errors

**Error types:**

1. **Missing required field:**
   ```
   ValidationError: Missing required field 'critique.overall'
   ```

2. **Type mismatch:**
   ```
   ValidationError: Expected number for 'scores.composition', got string
   ```

3. **Out of range:**
   ```
   ValidationError: 'scores.lighting' must be between 0 and 10 (got 12.5)
   ```

4. **Array constraints:**
   ```
   ValidationError: 'strengths' array must have at least 3 items (got 1)
   ```

5. **Enum mismatch:**
   ```
   ValidationError: Invalid refusal_category 'spam' (must be one of: medical, identity, surveillance, inappropriate, other)
   ```

**User-facing message:**
```
⚠️ Analysis Error

The AI produced an invalid response format. This may indicate:
- Model confusion or hallucination
- Prompt engineering issue
- Model quantization artifacts

Please try:
1. Re-uploading the photo (sometimes works on retry)
2. Using a different photo
3. Checking Ollama is running correctly

Technical details: {error.message}
```

---

## 4. Retry Logic

### 4.1. Retry Strategy

**Transient failures** (retry automatically):
- Network errors (connection refused, timeout)
- HTTP 500/503 (Ollama server error)
- Malformed JSON (parse error)
- Schema validation failure (missing/invalid fields)

**Permanent failures** (do NOT retry):
- HTTP 404 (model not found)
- HTTP 403 (permission denied)
- Refusal (is_refusal: true)
- Client-side errors (invalid image format)

**Retry configuration:**
```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelay: 1000,      // 1 second
  backoffMultiplier: 2,    // Exponential backoff
  maxDelay: 10000          // Cap at 10 seconds
};
```

### 4.2. Retry Implementation

```typescript
async function analyzePhotoWithRetry(
  image: string,
  mimeType: string,
  cvData: CVData,
  attempt: number = 1
): Promise<PhotoAnalysisV2> {
  try {
    return await analyzePhoto(image, mimeType, cvData);
  } catch (error) {
    // Check if error is retryable
    if (!isRetryable(error) || attempt >= RETRY_CONFIG.maxAttempts) {
      throw error;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
      RETRY_CONFIG.maxDelay
    );

    console.log(`Retry attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts} after ${delay}ms`);

    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, delay));

    // Retry
    return analyzePhotoWithRetry(image, mimeType, cvData, attempt + 1);
  }
}

function isRetryable(error: Error): boolean {
  if (error instanceof ValidationError) return true;
  if (error instanceof NetworkError) return true;
  if (error instanceof OllamaServerError && error.statusCode >= 500) return true;
  return false;
}
```

### 4.3. User Feedback During Retries

**UI state:**
```typescript
const [retryState, setRetryState] = useState<{
  attempt: number;
  maxAttempts: number;
  lastError: string;
} | null>(null);

// Display in PhotoUploader thinking animation
{retryState && (
  <div className="retry-notice">
    ⚠️ Retry {retryState.attempt}/{retryState.maxAttempts}
    <br />
    {retryState.lastError}
  </div>
)}
```

---

## 5. Error Scenarios

### 5.1. Error Taxonomy

#### E1: Ollama Not Running
**Symptom:** Connection refused on localhost:11434
**User message:**
```
🔌 Local Inference Unavailable

Ollama is not running. Please start Ollama:

Terminal command:
  ollama serve

Then reload the app.

[Retry Connection] [View Troubleshooting Guide]
```

#### E2: Model Not Found
**Symptom:** HTTP 404 from Ollama API
**User message:**
```
📦 Model Not Found

Gemma 4 E4B model is not installed. Please pull the model:

Terminal command:
  ollama pull gemma-4-e4b

This may take 5-10 minutes (downloads ~4GB).

[Retry After Install] [View Installation Guide]
```

#### E3: Ollama Server Error
**Symptom:** HTTP 500/503 from Ollama API
**User message:**
```
⚠️ Inference Error

Ollama encountered an error during analysis.
This may be a temporary issue.

Automatically retrying (attempt 2/3)...

If this persists, try:
- Restarting Ollama (ollama serve)
- Using a smaller quantization (Q4 instead of Q8)
- Checking Ollama logs

[Cancel] [View Logs]
```

#### E4: Schema Validation Failure
**Symptom:** Zod validation error after 3 retries
**User message:**
```
⚠️ Invalid Analysis Format

The AI produced an unexpected response format after 3 attempts.

This may indicate:
- Model hallucination or confusion
- Quantization artifacts (try Q5 or Q8 instead of Q4)
- Image too complex for model

Please try:
1. Re-uploading the photo
2. Using a simpler/smaller image
3. Reporting this issue (Help → Report Bug)

Technical details: {error.message}

[Try Again] [Upload Different Photo] [Report Issue]
```

#### E5: Network Blocked (Vault Mode)
**Symptom:** Attempted cloud API call blocked by Electron
**User message:**
```
🔒 Network Request Blocked

Vault Mode blocked an attempted cloud API call:
  {url}

This is expected behavior - Vault Mode is working correctly.
All processing remains local.

Audit log has been updated with blocked request details.

[OK]
```

#### E6: Timeout
**Symptom:** Ollama inference exceeds 30 seconds
**User message:**
```
⏱️ Analysis Timeout

Analysis took longer than 30 seconds and was cancelled.

This may be due to:
- Large image size (>10MP)
- Slow quantization (Q8 slower than Q4)
- System resource constraints

Please try:
1. Resizing image (max 4K resolution)
2. Using faster quantization (Q4_K_M)
3. Closing other apps to free RAM

[Retry] [Resize & Retry] [Cancel]
```

#### E7: Image Load Error
**Symptom:** Cannot decode image file
**User message:**
```
🖼️ Image Error

Cannot read image file. Please check:
- File is a valid image (JPEG, PNG, WebP)
- File is not corrupted
- File size is under 10MB

[Upload Different Photo]
```

#### E8: EXIF Extraction Error
**Symptom:** exif-js throws error
**User message:**
```
ℹ️ EXIF Unavailable

Cannot extract camera settings from this image.
Analysis will proceed with estimated settings.

(This is common for screenshots, edited photos, or scanned images)

[Continue]
```

### 5.2. Error Recovery Actions

**User-initiated:**
- Retry (same image, same prompt)
- Upload different photo
- Check Ollama status
- View troubleshooting guide
- Report issue (GitHub, Discord)

**Automatic:**
- Retry with exponential backoff (max 3 attempts)
- Fallback to simpler CV (skip edge density, color distribution)
- Degrade gracefully (skip EXIF, skip bounding boxes)

---

## 6. Debugging and Logging

### 6.1. Structured Logging

**Log levels:**
- `ERROR` - Failures requiring user action or retry
- `WARN` - Degraded functionality (EXIF unavailable, CV skipped)
- `INFO` - Normal operations (photo uploaded, analysis started)
- `DEBUG` - Detailed diagnostics (prompt sent, token counts, timing)

**Example logs:**
```
[INFO] Photo uploaded: image/jpeg, 2.7MB, hash: e3b0c44...
[DEBUG] EXIF extracted: f/1.8, 1/125, ISO 400, 35mm
[DEBUG] CV analysis: 742ms (histogram, focus map, edges, colors)
[DEBUG] Ollama request: localhost:11434, gemma-4-e4b, 1847 tokens
[DEBUG] Ollama response: 4782ms, 1053 tokens, schema valid
[INFO] Analysis complete: composition 4.5, lighting 5.0, technique 8.0
```

**Error logs:**
```
[ERROR] Ollama connection failed: ECONNREFUSED localhost:11434
[ERROR] Schema validation failed: Missing required field 'critique.overall'
[WARN] EXIF extraction failed: Unsupported JPEG format (SOF15)
[WARN] Bounding box generation skipped: focus map unreliable
```

### 6.2. Console Output (Development)

**Enable verbose logging:**
```typescript
// config.ts
export const config = {
  logging: {
    level: process.env.NODE_ENV === 'development' ? 'DEBUG' : 'INFO',
    enableConsole: true,
    enableFile: false
  }
};

// logger.ts
export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (config.logging.level === 'DEBUG') {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    console.info(`[INFO] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  }
};
```

### 6.3. Error Reporting

**Bug report template:**
```markdown
## Error Report

**Error type:** {error.name}
**Error message:** {error.message}
**Occurred at:** {timestamp}

**System info:**
- App version: {appVersion}
- Platform: {platform}
- Ollama version: {ollamaVersion}
- Model: {modelId}
- Quantization: {quantization}

**Steps to reproduce:**
1. {user description}

**Logs:**
```
{last 50 log lines}
```

**Screenshot:** (if applicable)

**Audit log:** (if Vault Mode)
```
{audit log export}
```
```

**User action:**
- Click "Report Issue" button → opens GitHub issue with pre-filled template
- Or: Copy error details → paste in Discord/email

---

## 7. Testing

### 7.1. Validation Tests

**Test case: V-1 (Valid analysis)**
- Input: Well-formed PhotoAnalysisV2 JSON
- Expected: `validatePhotoAnalysisV2()` returns typed object
- Verification: No errors thrown

**Test case: V-2 (Refusal with fields)**
- Input: JSON with `is_refusal: true`, `refusal_reason`, `refusal_category`
- Expected: Validation passes, empty arrays allowed
- Verification: No errors thrown

**Test case: V-3 (Refusal without fields)**
- Input: JSON with `is_refusal: true`, missing `refusal_reason`
- Expected: Validation fails
- Verification: Error: "Refusal must include refusal_reason and refusal_category"

**Test case: V-4 (Non-refusal with short arrays)**
- Input: JSON with `is_refusal: false`, `strengths: ["one", "two"]` (< 3 items)
- Expected: Validation fails
- Verification: Error: "strengths array must have at least 3 items (got 2)"

**Test case: V-5 (Out of range score)**
- Input: JSON with `scores.composition: 12.5` (> 10)
- Expected: Validation fails
- Verification: Zod error: "Number must be less than or equal to 10"

### 7.2. Retry Tests

**Test case: R-1 (Transient error recovers)**
- Setup: Mock Ollama to fail twice, succeed on 3rd attempt
- Expected: `analyzePhotoWithRetry()` returns valid result after 2 retries
- Verification: Success after 3 total attempts

**Test case: R-2 (Permanent error fails immediately)**
- Setup: Mock Ollama to return 404 (model not found)
- Expected: `analyzePhotoWithRetry()` throws immediately, no retries
- Verification: Only 1 attempt, error propagates

**Test case: R-3 (Max retries exceeded)**
- Setup: Mock Ollama to fail 3 times
- Expected: `analyzePhotoWithRetry()` throws after 3 attempts
- Verification: Error message includes "after 3 attempts"

### 7.3. Error Handling Tests

**Test case: E-1 (Ollama not running)**
- Setup: Stop Ollama server
- Expected: Connection error, user sees "Ollama Not Running" message
- Verification: Error code ECONNREFUSED

**Test case: E-2 (Invalid JSON)**
- Setup: Mock Ollama to return malformed JSON
- Expected: JSON parse error, retry logic triggered
- Verification: Retry count increments, eventually fails if persistent

**Test case: E-3 (Network blocked in Vault Mode)**
- Setup: Desktop app in Vault Mode, attempt Gemini API call
- Expected: Electron blocks request, audit log records event
- Verification: fetch() rejects, network_blocked event in audit log

---

## 8. Dependencies and Blockers

### 8.1. Blocking Dependencies

**This spec (09) blocks:**
- All implementation work (schema validation is foundational)

**This spec (09) is blocked by:**
- **02-output-schema.md** - v2 schema definition (complete, now updated with refusal fields)
- **04-prompt-and-rationale-spec.md** - refusal protocol (complete, now updated with explicit fields)

### 8.2. Schema Migration

**Tier 2 → Tier 3 schema changes:**

**Before (Tier 2):**
```typescript
interface PhotoAnalysisV2 {
  // ... fields ...
  // No explicit refusal fields
  // Refusal detected via all scores = 0.0
}
```

**After (Tier 3):**
```typescript
interface PhotoAnalysisV2 {
  // ... fields ...
  is_refusal?: boolean;
  refusal_reason?: string;
  refusal_category?: RefusalCategory;
}
```

**Migration strategy:**
- Old prompts (without refusal fields) still work (fields are optional)
- New prompts (with refusal fields) preferred for clarity
- Runtime validation handles both old and new formats gracefully

---

## 9. Success Criteria

**This spec succeeds if:**

1. ✅ Refusal detection is unambiguous (`is_refusal === true`, no score inference)
2. ✅ Prompt schema and runtime validation use same rules (no split)
3. ✅ Validation error rate <5% on 100 test photos (Spike 1 validation set)
4. ✅ Retry logic recovers from transient errors 90%+ of the time
5. ✅ User-facing error messages are actionable (users know what to do)
6. ✅ All error scenarios have documented recovery paths

---

## 10. Summary

This spec defines **validation and error handling** with:

1. **Unified refusal handling:** Explicit `is_refusal`, `refusal_reason`, `refusal_category` fields (eliminates Tier 2 split)
2. **Schema validation:** Zod-based with clear error messages
3. **Retry logic:** Automatic retries for transient failures (max 3 attempts, exponential backoff)
4. **Error taxonomy:** 8 common error scenarios with user-facing messages
5. **Debugging support:** Structured logging, error reporting

**Key enhancement:** Prompt schema and runtime validation now unified - both check `is_refusal` flag instead of inferring from score values.

**Next steps:**
1. Update 02-output-schema.md to include refusal fields in v2 schema
2. Update 04-prompt-and-rationale-spec.md with new refusal protocol
3. Implement unified validation in validationService.ts
4. Proceed to **10-platform-shells-spec.md** for platform-specific deployment

---

**End of 09-validation-and-error-handling-spec.md**
