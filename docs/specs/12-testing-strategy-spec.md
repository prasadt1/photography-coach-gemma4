# 12. Testing Strategy Spec

**Version:** 1.0
**Status:** Draft
**Dependencies:** All prior specs (00-11)
**Owner:** Spec Session Lead

---

## 1. Overview

This spec defines the **comprehensive testing strategy** for Photography Coach v2, including:

1. **Test pyramid** - Unit → Integration → E2E test distribution
2. **Test categories** - Functional, security, performance, compatibility
3. **Test environments** - Dev, staging, production
4. **Test data** - Photo test set, expected outputs, edge cases
5. **CI/CD integration** - Automated test runs on commit/PR

**Testing Philosophy:** "Test what matters." Focus on critical paths (analysis pipeline, Vault Mode isolation, refusal handling) over exhaustive coverage of UI permutations.

---

## 2. Test Pyramid

### 2.1. Distribution Target

```
        /\
       /  \     E2E Tests (10%)
      /    \    - Full user workflows
     /------\   - Platform-specific
    /        \
   /  Integ.  \ Integration Tests (30%)
  /   Tests    \- Component integration
 /              \- API contracts
/--------------\
|              | Unit Tests (60%)
|  Unit Tests  |- Pure functions
|              |- Component logic
```

**Rationale:**
- **60% unit tests:** Fast feedback, pinpoint failures, high ROI
- **30% integration tests:** Catch interface mismatches, validate data flow
- **10% E2E tests:** Validate critical user journeys, expensive but essential

### 2.2. Test Count Targets

| Layer | Target Count | Execution Time |
|-------|--------------|----------------|
| Unit | 150-200 tests | <10 seconds |
| Integration | 50-75 tests | 30-60 seconds |
| E2E | 10-20 tests | 3-5 minutes |
| **Total** | **210-295 tests** | **<6 minutes** |

---

## 3. Test Categories

### 3.1. Functional Tests

**Scope:** Feature correctness (does it work as specified?).

**Critical paths:**
1. Photo upload → CV analysis → Ollama inference → schema validation → UI display
2. Refusal detection → category identification → RefusalMessage display
3. Vault Mode → network blocking → audit logging → log export
4. Mentor chat → context building → follow-up inference → history tracking

**Coverage target:** 80% of critical path code, 50% of non-critical code.

### 3.2. Security Tests

**Scope:** Vault Mode isolation, data privacy, audit integrity.

**Test cases:**
1. **Network isolation (desktop app):** Wireshark capture shows zero non-localhost packets during 100-photo session
2. **Audit chain integrity:** Tampering detection (modify event → verification fails)
3. **Refusal enforcement:** Medical/identity/surveillance imagery triggers refusal (0% false negatives)
4. **API key protection:** Gemini API key not logged in plaintext (check logs, audit trail)

**Coverage target:** 100% of security-critical code paths.

### 3.3. Performance Tests

**Scope:** Latency, throughput, resource usage.

**Benchmarks:**
- Photo analysis (end-to-end): P50 <5s, P95 <9s
- CV processing: P95 <800ms
- Ollama inference: P50 3-5s (Q4_K_M baseline)
- Schema validation: <10ms per parse

**Load tests:**
- 100 photos analyzed sequentially: total time <10 minutes
- Session history (100 entries): IndexedDB query <50ms
- Audit log (1000 events): verification <500ms

### 3.4. Compatibility Tests

**Scope:** Browser/platform/model compatibility.

**Browsers (web app):**
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Test on latest + 2 previous major versions

**Platforms (desktop app):**
- macOS (Intel + Apple Silicon), Windows (x64, ARM64), Linux (x64)

**Models (Ollama):**
- Gemma 4 E4B (Q4_K_M, Q5_K_M, Q8_0)
- Graceful degradation if model unavailable (clear error message)

---

## 4. Unit Tests

### 4.1. CV Service Tests

**File:** `src/services/cvService.test.ts`

**Test cases:**

```typescript
describe('cvService', () => {
  describe('extractEXIF', () => {
    it('extracts standard EXIF fields from JPEG', async () => {
      const file = loadTestImage('sample-portrait.jpg');
      const exif = await extractEXIF(file);
      expect(exif.focalLength).toBe('35mm');
      expect(exif.aperture).toBe('f/1.8');
    });

    it('returns null for missing EXIF fields', async () => {
      const file = loadTestImage('screenshot-no-exif.png');
      const exif = await extractEXIF(file);
      expect(exif.focalLength).toBeNull();
    });
  });

  describe('analyzeHistogram', () => {
    it('detects blown highlights (>2% at 254-255)', () => {
      const imageData = createTestImageData({ highlightPercent: 5 });
      const histogram = analyzeHistogram(imageData);
      expect(histogram.clipping.highlights).toBe(true);
      expect(histogram.clipping.highlightPercent).toBeGreaterThan(2);
    });

    it('calculates dynamic range correctly', () => {
      const imageData = createTestImageData({ p1: 20, p99: 240 });
      const histogram = analyzeHistogram(imageData);
      expect(histogram.luminance.dynamicRange).toBe(220);
    });
  });

  describe('generateFocusMap', () => {
    it('creates 10x10 grid for standard image', () => {
      const imageData = createTestImageData({ width: 1000, height: 1000 });
      const focusMap = generateFocusMap(imageData);
      expect(focusMap.cells.length).toBe(100);
      expect(focusMap.gridSize).toEqual({ rows: 10, cols: 10 });
    });

    it('identifies sharp regions correctly', () => {
      const imageData = createSharpCenterBlurredEdges();
      const focusMap = generateFocusMap(imageData);
      const centerCell = focusMap.cells.find(c => c.row === 5 && c.col === 5);
      expect(centerCell?.classification).toBe('sharp');
    });
  });
});
```

**Coverage target:** 90% of cvService functions.

### 4.2. Validation Service Tests

**File:** `src/services/validationService.test.ts`

**Test cases:**

```typescript
describe('validationService', () => {
  describe('validatePhotoAnalysisV2', () => {
    it('validates correct v2 schema', () => {
      const data = loadFixture('valid-analysis-v2.json');
      const result = validatePhotoAnalysisV2(data);
      expect(result.schema_version).toBe('2.0');
      expect(result.model_id).toBe('gemma-4-e4b');
    });

    it('throws on missing required field', () => {
      const data = loadFixture('invalid-missing-scores.json');
      expect(() => validatePhotoAnalysisV2(data)).toThrow('Missing required field');
    });

    it('allows empty arrays for refusal mode', () => {
      const data = {
        ...loadFixture('valid-analysis-v2.json'),
        is_refusal: true,
        refusal_reason: 'Medical imagery detected',
        refusal_category: 'medical',
        strengths: [],
        improvements: []
      };
      const result = validatePhotoAnalysisV2(data);
      expect(result.strengths).toEqual([]);
      expect(result.improvements).toEqual([]);
    });

    it('enforces minItems for non-refusal', () => {
      const data = {
        ...loadFixture('valid-analysis-v2.json'),
        is_refusal: false,
        strengths: ['one', 'two'] // < 3 items
      };
      expect(() => validatePhotoAnalysisV2(data)).toThrow('must have at least 3 items');
    });

    it('validates refusal category enum', () => {
      const data = {
        ...loadFixture('valid-analysis-v2.json'),
        is_refusal: true,
        refusal_category: 'invalid-category'
      };
      expect(() => validatePhotoAnalysisV2(data)).toThrow('Invalid enum value');
    });
  });
});
```

**Coverage target:** 100% of validation logic (critical path).

### 4.3. Audit Service Tests

**File:** `src/services/auditService.test.ts`

**Test cases:**

```typescript
describe('auditService', () => {
  describe('appendEvent', () => {
    it('creates genesis event with zero hash', async () => {
      await auditLog.clear();
      await auditLog.appendEvent('session_start', { appVersion: '2.0.0' });
      const events = await auditLog.getAllEvents();
      expect(events[0].previousHash).toBe('0'.repeat(64));
    });

    it('links events with hash chain', async () => {
      await auditLog.clear();
      await auditLog.appendEvent('session_start', {});
      await auditLog.appendEvent('photo_upload', { imageHash: 'abc123' });
      const events = await auditLog.getAllEvents();
      expect(events[1].previousHash).toBe(events[0].currentHash);
    });
  });

  describe('verifyAuditLog', () => {
    it('passes verification for valid chain', async () => {
      await auditLog.clear();
      await auditLog.appendEvent('session_start', {});
      await auditLog.appendEvent('photo_upload', {});
      const result = await auditLog.verify();
      expect(result.valid).toBe(true);
    });

    it('fails verification if event tampered', async () => {
      await auditLog.clear();
      await auditLog.appendEvent('session_start', {});
      await auditLog.appendEvent('photo_upload', {});

      // Tamper with event
      const events = await auditLog.getAllEvents();
      events[1].details.imageHash = 'tampered';
      await auditLog.saveEvent(events[1]); // Overwrite

      const result = await auditLog.verify();
      expect(result.valid).toBe(false);
      expect(result.error).toContain('hash mismatch');
    });
  });
});
```

**Coverage target:** 100% of hash chain logic (security-critical).

### 4.4. Component Tests (React)

**File:** `src/components/RefusalMessage.test.tsx`

**Test cases:**

```typescript
import { render, screen } from '@testing-library/react';
import { RefusalMessage } from './RefusalMessage';

describe('RefusalMessage', () => {
  it('displays medical refusal message', () => {
    const analysis = {
      ...mockAnalysisV2(),
      is_refusal: true,
      refusal_category: 'medical',
      refusal_reason: 'X-ray detected'
    };

    render(<RefusalMessage analysis={analysis} onReset={jest.fn()} />);

    expect(screen.getByText('Medical Imagery Detected')).toBeInTheDocument();
    expect(screen.getByText(/X-ray, procedures, injuries/)).toBeInTheDocument();
  });

  it('calls onReset when button clicked', () => {
    const onReset = jest.fn();
    const analysis = mockRefusalAnalysis('identity');

    render(<RefusalMessage analysis={analysis} onReset={onReset} />);

    const button = screen.getByRole('button', { name: /Upload Different Photo/i });
    button.click();

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('expands technical details on click', () => {
    const analysis = mockRefusalAnalysis('surveillance');

    render(<RefusalMessage analysis={analysis} onReset={jest.fn()} />);

    const details = screen.getByText('Technical Details');
    details.click();

    expect(screen.getByText(/Reason:/)).toBeVisible();
    expect(screen.getByText(/Category:/)).toBeVisible();
  });
});
```

**Coverage target:** 70% of component logic (focus on interactive elements).

---

## 5. Integration Tests

### 5.1. CV → Ollama Pipeline Test

**File:** `tests/integration/analysis-pipeline.test.ts`

**Test case:**

```typescript
describe('Analysis Pipeline', () => {
  it('completes full pipeline from image to validated result', async () => {
    // 1. Load test image
    const imageFile = loadTestImage('sample-portrait.jpg');
    const base64 = await fileToBase64(imageFile);

    // 2. Run CV analysis
    const cvData = await cvService.analyzeImage(imageFile);
    expect(cvData.exif.focalLength).toBe('35mm');
    expect(cvData.histogram.luminance.p50).toBeGreaterThan(0);

    // 3. Call Ollama (assumes Ollama running locally)
    const analysis = await ollamaService.analyzePhoto(base64, 'image/jpeg', cvData);

    // 4. Validate schema
    expect(analysis.schema_version).toBe('2.0');
    expect(analysis.model_id).toBe('gemma-4-e4b');
    expect(analysis.scores.composition).toBeGreaterThanOrEqual(0);
    expect(analysis.scores.composition).toBeLessThanOrEqual(10);

    // 5. Verify evidence references CV data
    const cvEvidence = analysis.evidence?.find(e => e.source === 'cv');
    expect(cvEvidence).toBeDefined();
  });

  it('handles refusal for medical imagery', async () => {
    const imageFile = loadTestImage('medical-xray.jpg');
    const base64 = await fileToBase64(imageFile);
    const cvData = await cvService.analyzeImage(imageFile);

    const analysis = await ollamaService.analyzePhoto(base64, 'image/jpeg', cvData);

    expect(analysis.is_refusal).toBe(true);
    expect(analysis.refusal_category).toBe('medical');
    expect(analysis.strengths).toEqual([]);
    expect(analysis.improvements).toEqual([]);
  });
});
```

**Dependencies:** Requires Ollama running with Gemma 4 E4B model.

### 5.2. Vault Mode Audit Logging Test

**File:** `tests/integration/vault-audit.test.ts`

**Test case:**

```typescript
describe('Vault Mode Audit Logging', () => {
  it('logs all events in correct sequence', async () => {
    await auditLog.clear();

    // Simulate Vault Mode session
    await auditLog.appendEvent('session_start', { appVersion: '2.0.0' });
    await auditLog.appendEvent('mode_selected', { mode: 'vault' });
    await auditLog.appendEvent('photo_upload', { imageHash: 'abc123' });
    await auditLog.appendEvent('cv_analysis', { durationMs: 742 });
    await auditLog.appendEvent('ollama_request', { model: 'gemma-4-e4b' });
    await auditLog.appendEvent('ollama_response', { completionTokens: 1053 });

    const events = await auditLog.getAllEvents();
    expect(events.length).toBe(6);

    // Verify event types in order
    expect(events.map(e => e.eventType)).toEqual([
      'session_start',
      'mode_selected',
      'photo_upload',
      'cv_analysis',
      'ollama_request',
      'ollama_response'
    ]);

    // Verify chain integrity
    const verification = await auditLog.verify();
    expect(verification.valid).toBe(true);
  });

  it('exports audit log with verification', async () => {
    // ... populate log ...

    const exported = await auditLog.exportJSON();
    const parsed = JSON.parse(exported);

    expect(parsed.totalEvents).toBeGreaterThan(0);
    expect(parsed.chainVerified).toBe(true);
    expect(parsed.events).toBeInstanceOf(Array);
  });
});
```

### 5.3. Network Isolation Test (Desktop App)

**File:** `tests/integration/vault-network-isolation.test.ts`

**Test case (manual, requires Electron + Wireshark):**

```typescript
describe('Vault Mode Network Isolation', () => {
  it('blocks external API calls (manual verification)', async () => {
    // This test requires manual verification with Wireshark
    // 1. Start Wireshark, capture on localhost interface
    // 2. Launch desktop app in Vault Mode
    // 3. Analyze 5 photos
    // 4. Stop capture, filter for non-localhost traffic
    // 5. Verify: Zero non-localhost packets (100% block rate)

    console.log('Manual test: Verify Wireshark capture shows zero external packets');
    console.log('Expected: All traffic to localhost:11434 only');
  });
});
```

---

## 6. E2E Tests

### 6.1. Studio Mode Happy Path

**File:** `tests/e2e/studio-mode.spec.ts`

**Test case (Playwright):**

```typescript
import { test, expect } from '@playwright/test';

test('Studio Mode: Upload photo → analyze → view results', async ({ page }) => {
  // 1. Navigate to app
  await page.goto('http://localhost:5173');

  // 2. Select Studio Mode
  await page.click('text=Select Studio Mode');

  // 3. Upload photo
  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles('tests/fixtures/sample-portrait.jpg');

  // 4. Wait for analysis (max 15s)
  await page.waitForSelector('text=Analysis complete', { timeout: 15000 });

  // 5. Verify Overview tab shows scores
  await expect(page.locator('text=Composition')).toBeVisible();
  await expect(page.locator('text=Lighting')).toBeVisible();

  // 6. Switch to Detailed Analysis tab
  await page.click('text=Detailed Analysis');

  // 7. Verify rationale section
  await expect(page.locator('text=Gemma 4 E4B Reasoning Process')).toBeVisible();
  await expect(page.locator('text=Observations')).toBeVisible();
});

test('Studio Mode: Refusal for medical imagery', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.click('text=Select Studio Mode');

  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles('tests/fixtures/medical-xray.jpg');

  // Wait for refusal message
  await page.waitForSelector('text=Medical Imagery Detected', { timeout: 15000 });

  // Verify refusal UI
  await expect(page.locator('text=🏥')).toBeVisible();
  await expect(page.locator('text=Upload Different Photo')).toBeVisible();
});
```

### 6.2. Vault Mode Happy Path

**File:** `tests/e2e/vault-mode.spec.ts`

**Test case (Playwright + Electron):**

```typescript
import { _electron as electron } from 'playwright';
import { test, expect } from '@playwright/test';

test('Vault Mode: Analyze photo with audit logging', async () => {
  // 1. Launch Electron app
  const app = await electron.launch({ args: ['.'] });
  const page = await app.firstWindow();

  // 2. Select Vault Mode
  await page.click('text=Select Vault Mode');

  // 3. Verify Vault Mode banner visible
  await expect(page.locator('text=VAULT MODE ACTIVE')).toBeVisible();

  // 4. Upload photo
  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles('tests/fixtures/sample-landscape.jpg');

  // 5. Wait for analysis
  await page.waitForSelector('text=Analysis complete', { timeout: 15000 });

  // 6. Open audit log
  await page.click('text=View Audit Log');

  // 7. Verify audit events logged
  await expect(page.locator('text=photo_upload')).toBeVisible();
  await expect(page.locator('text=ollama_request')).toBeVisible();
  await expect(page.locator('text=ollama_response')).toBeVisible();

  // 8. Verify chain
  await page.click('text=Verify Chain');
  await expect(page.locator('text=✅ Chain Verified')).toBeVisible();

  await app.close();
});
```

### 6.3. Cross-Platform Test (Desktop App)

**File:** `tests/e2e/cross-platform.spec.ts`

**Test case:**

```typescript
test('Desktop app launches on macOS/Windows/Linux', async () => {
  // This test runs on CI with multiple OS runners (GitHub Actions)
  // - macos-latest
  // - windows-latest
  // - ubuntu-latest

  const app = await electron.launch({ args: ['.'] });
  const page = await app.firstWindow();

  // Verify app window opens
  expect(await page.title()).toContain('Photography Coach');

  // Verify mode selector visible
  await expect(page.locator('text=Studio Mode')).toBeVisible();
  await expect(page.locator('text=Vault Mode')).toBeVisible();

  await app.close();
});
```

---

## 7. Test Data

### 7.1. Test Image Set

**Required test images (store in `tests/fixtures/`):**

| Filename | Type | Purpose | Expected Behavior |
|----------|------|---------|-------------------|
| sample-portrait.jpg | JPEG, EXIF | Standard portrait, well-exposed | Normal analysis |
| sample-landscape.jpg | JPEG, EXIF | Landscape, wide angle | Normal analysis |
| sample-macro.jpg | JPEG, EXIF | Macro photography, shallow DoF | Normal analysis |
| blown-highlights.jpg | JPEG | Overexposed sky | CV detects clipping |
| crushed-shadows.jpg | JPEG | Underexposed, lost detail | CV detects clipping |
| no-exif.png | PNG, no EXIF | Screenshot or edited | EXIF extraction returns null |
| medical-xray.jpg | JPEG | X-ray image | Refusal: medical |
| identity-passport.jpg | JPEG | Passport photo | Refusal: identity |
| surveillance-camera.jpg | JPEG | Security camera footage | Refusal: surveillance |
| corrupted.jpg | Invalid JPEG | Corrupted file | Error: image load failure |

**Total:** 10 test images (~20MB total).

### 7.2. Expected Outputs (Fixtures)

**Store expected analysis JSON in `tests/fixtures/expected/`:**

- `sample-portrait-v2.json` - Expected PhotoAnalysisV2 for sample-portrait.jpg
- `sample-landscape-v2.json` - Expected PhotoAnalysisV2 for sample-landscape.jpg
- `refusal-medical-v2.json` - Expected refusal response for medical-xray.jpg

**Use for regression testing:** Compare actual output vs expected (with tolerance for score variance ±0.5 points).

---

## 8. CI/CD Integration

### 8.1. GitHub Actions Workflow

**File:** `.github/workflows/test.yml`

```yaml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run test:unit
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      ollama:
        image: ollama/ollama:latest
        ports:
          - 11434:11434
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - name: Pull Gemma model
        run: docker exec ollama ollama pull gemma-4-e4b
      - run: npm run test:integration

  e2e-tests:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - name: Install Ollama
        run: |
          # OS-specific Ollama installation
          # ... (omitted for brevity)
      - run: ollama pull gemma-4-e4b
      - run: npm run test:e2e
```

### 8.2. Pre-commit Hooks

**File:** `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run unit tests (fast, <10s)
npm run test:unit

# Type check
npm run typecheck

# Lint
npm run lint
```

**Rationale:** Fast unit tests run on every commit. Integration/E2E tests run on CI (too slow for local hooks).

---

## 9. Test Maintenance

### 9.1. Test Stability

**Flaky test protocol:**
- If test fails intermittently (>5% failure rate), mark as flaky with `test.fixme()`
- Investigate root cause (timing issue, external dependency, resource constraint)
- Fix or rewrite test to be deterministic

**Example flaky test:**
```typescript
test.fixme('Ollama inference completes in <5s', async () => {
  // This test is flaky due to Ollama load variance
  // TODO: Add retry logic or increase timeout
});
```

### 9.2. Test Data Updates

**When to update test fixtures:**
- V2 schema changes (add/remove fields)
- Expected score changes (Gemma 4 E4B model updates)
- New refusal categories added

**Process:**
1. Update `tests/fixtures/expected/*.json`
2. Run regression tests: `npm run test:regression`
3. Review diff, ensure changes intentional
4. Commit fixture updates with descriptive message

---

## 10. Success Criteria

**This testing strategy succeeds if:**

1. ✅ Test pyramid balanced (60/30/10 unit/integration/E2E)
2. ✅ Critical paths covered (analysis pipeline, Vault Mode, refusal handling)
3. ✅ Security tests validate Vault Mode isolation (100% block rate verified)
4. ✅ Performance benchmarks documented (P50 <5s, P95 <9s)
5. ✅ CI/CD pipeline runs all tests on commit/PR
6. ✅ Test data comprehensive (10 test images covering edge cases)
7. ✅ Flaky tests identified and fixed (<2% failure rate)

---

## 11. Summary

This spec defines **comprehensive testing strategy** for Photography Coach v2:

**Test pyramid:** 60% unit, 30% integration, 10% E2E (210-295 total tests, <6 minutes execution)

**Categories:** Functional (correctness), Security (Vault isolation), Performance (latency benchmarks), Compatibility (browsers/platforms)

**Critical coverage:**
- CV → Ollama pipeline (integration)
- Refusal handling (unit + integration)
- Vault Mode audit logging (integration)
- Network isolation (manual verification with Wireshark)

**CI/CD:** GitHub Actions runs all tests on commit/PR, pre-commit hooks run unit tests locally

**Next:** Proceed to **13-implementation-roadmap-spec.md** for sprint/milestone planning.

---

**End of 12-testing-strategy-spec.md**
