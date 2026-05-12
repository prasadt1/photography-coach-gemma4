# 08. Vault Mode Spec

**Version:** 1.0
**Status:** Draft
**Dependencies:** 01-product-spec.md, 06-architecture-spec.md, 07-stack-and-runtime-mapping.md
**Owner:** Spec Session Lead

---

## 1. Overview

This spec defines **Vault Mode** - a confidentiality-first operating mode for Photography Coach v2 designed for working professionals handling sensitive client work (NDA-bound shoots, legal case photography, corporate confidential projects).

**Key Characteristics:**
1. **100% local processing** - All inference happens on-device via Gemma 4 E4B + Ollama
2. **Network isolation** - Desktop app (Electron) blocks all non-localhost network requests
3. **Audit logging** - Tamper-evident hash-chained log of all operations
4. **No cloud services** - Gemini image generation architecturally disabled
5. **Transparent operation** - Users can verify no data leaves device via audit log export

**Deployment Target:** **Desktop app (Electron) required** for credible network isolation. Web app fallback available for development/demo but lacks cryptographic enforcement of network boundaries (see section 3.2).

**Differentiation from Studio Mode:**
- Studio Mode: Speed-first, optional cloud features, network access allowed
- Vault Mode: Confidentiality-first, local-only, network-isolated, audit-logged

---

## 2. Use Cases and Requirements

### 2.1. Target Users

**Primary:** Working professional photographers with confidentiality obligations

**Specific scenarios:**
1. **Wedding photographers** - Client NDAs prohibit sharing images pre-delivery
2. **Legal photographers** - Evidence documentation for court cases (chain of custody)
3. **Corporate photographers** - Unannounced product launches, executive portraits
4. **Editorial photographers** - Embargo agreements on newsworthy events
5. **Medical photographers** - HIPAA-adjacent work (medical equipment, facilities)

**Common requirements:**
- Prove to clients that images never left device
- Maintain audit trail for contractual compliance
- Avoid cloud processing for sensitive subject matter
- Maintain full coaching functionality without compromise

### 2.2. Functional Requirements

#### FR-1: Local-Only Inference
- **Requirement:** All photo analysis via Gemma 4 E4B + Ollama (localhost:11434)
- **Verification:** Audit log records only localhost API calls
- **Enforcement:** Desktop app network policy blocks non-localhost requests

#### FR-2: Cloud Service Blocking
- **Requirement:** Gemini image generation disabled (no API calls possible)
- **Verification:** Service layer throws error if generation attempted in Vault Mode
- **UI:** Generate button grayed out with "🔒 Disabled in Vault Mode" label

#### FR-3: Audit Logging
- **Requirement:** Tamper-evident hash-chained log of all operations
- **Verification:** Hash chain validation passes on every event
- **Persistence:** Stored in local IndexedDB, never cleared automatically
- **Export:** JSON export with cryptographic integrity proof

#### FR-4: Session Isolation
- **Requirement:** Cannot switch to Studio Mode mid-session (prevents accidental cloud call)
- **Verification:** Mode switching requires app restart or explicit session reset
- **UI:** Mode selection locked during analysis session

#### FR-5: Transparent Operation
- **Requirement:** Users can inspect all operations via audit log
- **Verification:** Every API call, file operation, and mode change logged
- **UI:** "Export Audit Log" button always accessible in Vault Mode

### 2.3. Non-Functional Requirements

#### NFR-1: Performance Parity
- **Requirement:** Vault Mode analysis latency within 10% of Studio Mode
- **Rationale:** Local inference via Gemma 4 E4B should match or exceed cloud speed
- **Measurement:** P50 latency <5s, P95 <9s (same targets as Studio Mode)

#### NFR-2: Zero Network Leakage
- **Requirement:** Desktop app network policy has zero false negatives (100% block rate)
- **Verification:** Penetration testing with external monitoring
- **Enforcement:** Electron session.webRequest API (whitelist localhost only)

#### NFR-3: Audit Integrity
- **Requirement:** Hash chain survives process crashes, power loss
- **Verification:** Last committed event always has valid chain link
- **Implementation:** Atomic writes to IndexedDB, flush after every event

---

## 3. Network Isolation Architecture

### 3.1. Desktop App (Electron) - Primary Deployment

**Why Desktop Required:**
- Web browsers **cannot cryptographically enforce** network boundaries
- JavaScript fetch() can be intercepted by extensions, dev tools, or modified runtimes
- Vault Mode trust claims (NDA compliance, legal chain of custody) require **verifiable isolation**

**Electron Implementation:**

```typescript
// electron/main.ts
import { app, BrowserWindow, session } from 'electron';

function createVaultWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Photography Coach - Vault Mode',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  // Network isolation: Block all non-localhost requests
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = new URL(details.url);
    const isLocalhost =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '::1';

    if (!isLocalhost) {
      console.log(`[Vault Mode] Blocked external request: ${details.url}`);
      // Log to audit trail
      auditLog.recordBlockedRequest(details.url, details.method);
      callback({ cancel: true });
    } else {
      console.log(`[Vault Mode] Allowed localhost request: ${details.url}`);
      callback({ cancel: false });
    }
  });

  win.loadFile('dist/index.html');
}

app.whenReady().then(() => {
  createVaultWindow();
});
```

**Whitelist (allowed):**
- `http://localhost:*` - Ollama API, dev server
- `http://127.0.0.1:*` - Ollama API (IPv4 loopback)
- `http://[::1]:*` - Ollama API (IPv6 loopback)
- `file://` - Local file system (audit log export, image loading)

**Blacklist (blocked):**
- All other HTTP/HTTPS requests
- WebSocket connections to non-localhost
- DNS requests (implicitly blocked by hostname check)

### 3.2. Web App Fallback - Development/Demo Only

**Limitations:**
- No cryptographic network isolation (relies on service-level checks only)
- Browser extensions can intercept fetch() calls
- Dev tools can bypass request blocking
- User can modify JavaScript to remove checks

**When Web Fallback Acceptable:**
- Development and testing (dev team trusts local environment)
- Demo/proof-of-concept (no real confidential images)
- Non-professional use (hobbyists without NDA obligations)

**When Web Fallback NOT Acceptable:**
- Production use with confidential client work
- Legal/contractual compliance scenarios
- Any use case where audit log is required proof

**UI Disclaimer (Web Vault Mode):**
```
⚠️ Web Browser Limitation

Vault Mode in browser provides policy-based network isolation only.
For cryptographically enforced isolation (required for confidential work),
use the desktop app.

[Download Desktop App] [Continue Anyway]
```

### 3.3. Network Isolation Testing

**Test scenarios:**

1. **Positive test (should succeed):**
   - Upload photo → Ollama API call (localhost:11434) → analysis completes
   - Export audit log → save to local file system → file created

2. **Negative test (should be blocked):**
   - Attempt Gemini API call → blocked by Electron webRequest
   - Attempt external URL fetch → blocked by Electron webRequest
   - Attempt WebSocket to cloud service → blocked

3. **Penetration test (external monitoring):**
   - Run desktop app with network traffic monitor (Wireshark, Charles Proxy)
   - Upload photo, run full analysis workflow
   - Verify ZERO non-localhost packets sent

**Expected result:** 100% block rate on non-localhost requests.

---

## 4. Audit Logging

### 4.1. Hash Chain Design

**Structure:**
```typescript
interface AuditEvent {
  id: string;                    // UUID v4
  timestamp: number;             // Unix timestamp (milliseconds)
  eventType: AuditEventType;     // Enum: see section 4.2
  details: Record<string, any>;  // Event-specific data
  previousHash: string;          // SHA-256 hash of previous event
  currentHash: string;           // SHA-256 hash of this event
}

type AuditEventType =
  | 'session_start'
  | 'mode_selected'
  | 'photo_upload'
  | 'cv_analysis'
  | 'ollama_request'
  | 'ollama_response'
  | 'mentor_chat'
  | 'network_blocked'
  | 'export_log'
  | 'session_end';
```

**Hash computation:**
```typescript
async function computeHash(event: Omit<AuditEvent, 'currentHash'>): Promise<string> {
  const data = JSON.stringify({
    id: event.id,
    timestamp: event.timestamp,
    eventType: event.eventType,
    details: event.details,
    previousHash: event.previousHash
  });

  const msgBuffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**Chain linking:**
```typescript
async function appendEvent(
  eventType: AuditEventType,
  details: Record<string, any>
): Promise<void> {
  const events = await auditLog.getAllEvents();
  const lastEvent = events[events.length - 1];

  const newEvent: Omit<AuditEvent, 'currentHash'> = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    eventType,
    details,
    previousHash: lastEvent ? lastEvent.currentHash : '0'.repeat(64) // Genesis
  };

  const currentHash = await computeHash(newEvent);
  const completeEvent: AuditEvent = { ...newEvent, currentHash };

  await auditLog.saveEvent(completeEvent);
}
```

### 4.2. Event Types and Details

#### session_start
```json
{
  "eventType": "session_start",
  "details": {
    "appVersion": "2.0.0",
    "platform": "darwin",
    "nodeVersion": "20.11.0",
    "electronVersion": "33.0.0"
  }
}
```

#### mode_selected
```json
{
  "eventType": "mode_selected",
  "details": {
    "mode": "vault",
    "previousMode": null
  }
}
```

#### photo_upload
```json
{
  "eventType": "photo_upload",
  "details": {
    "imageHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "mimeType": "image/jpeg",
    "fileSize": 2847293,
    "exifAvailable": true
  }
}
```

#### cv_analysis
```json
{
  "eventType": "cv_analysis",
  "details": {
    "imageHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "durationMs": 742,
    "exifExtracted": true,
    "histogramGenerated": true,
    "focusMapGenerated": true
  }
}
```

#### ollama_request
```json
{
  "eventType": "ollama_request",
  "details": {
    "endpoint": "http://localhost:11434/api/generate",
    "model": "gemma-4-e4b",
    "promptTokens": 1847,
    "imageHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }
}
```

#### ollama_response
```json
{
  "eventType": "ollama_response",
  "details": {
    "completionTokens": 1053,
    "durationMs": 4782,
    "isRefusal": false,
    "schemaValid": true
  }
}
```

#### mentor_chat
```json
{
  "eventType": "mentor_chat",
  "details": {
    "turnNumber": 3,
    "questionLength": 87,
    "responseTokens": 342,
    "durationMs": 2134
  }
}
```

#### network_blocked
```json
{
  "eventType": "network_blocked",
  "details": {
    "url": "https://generativelanguage.googleapis.com/v1/models/gemini-3-pro-image-preview:generateContent",
    "method": "POST",
    "reason": "Non-localhost request blocked by Vault Mode policy"
  }
}
```

#### export_log
```json
{
  "eventType": "export_log",
  "details": {
    "eventCount": 42,
    "exportFormat": "json",
    "filePath": "/Users/photographer/Desktop/audit-log-2026-05-06.json"
  }
}
```

#### session_end
```json
{
  "eventType": "session_end",
  "details": {
    "photosAnalyzed": 5,
    "totalDurationMs": 38472,
    "networkBlockedCount": 0
  }
}
```

### 4.3. Storage and Persistence

**IndexedDB schema:**
```typescript
interface AuditLogDB {
  events: {
    key: string;              // event.id
    value: AuditEvent;
    indexes: {
      timestamp: number;
      eventType: AuditEventType;
    };
  };
}
```

**Write strategy:**
- **Atomic writes:** Each event committed immediately (no batching)
- **Durability:** Wait for IndexedDB transaction to complete before returning
- **Crash recovery:** Last event in DB always has valid chain link

**Retention policy:**
- **Never auto-delete** - Vault Mode audit logs persist indefinitely
- **User can export and archive** - Recommended: export after each project
- **Manual clearing** - Settings option: "Clear All Audit Logs" (requires confirmation + password)

### 4.4. Verification Algorithm

```typescript
async function verifyAuditLog(): Promise<{ valid: boolean; error?: string }> {
  const events = await auditLog.getAllEvents();

  if (events.length === 0) {
    return { valid: true }; // Empty log is valid
  }

  // Verify genesis event
  if (events[0].previousHash !== '0'.repeat(64)) {
    return {
      valid: false,
      error: `Genesis event has invalid previousHash: ${events[0].previousHash}`
    };
  }

  // Verify chain links
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1];
    const curr = events[i];

    if (curr.previousHash !== prev.currentHash) {
      return {
        valid: false,
        error: `Chain broken at event ${i}: expected previousHash ${prev.currentHash}, got ${curr.previousHash}`
      };
    }

    // Recompute current hash and verify
    const recomputedHash = await computeHash({
      id: curr.id,
      timestamp: curr.timestamp,
      eventType: curr.eventType,
      details: curr.details,
      previousHash: curr.previousHash
    });

    if (recomputedHash !== curr.currentHash) {
      return {
        valid: false,
        error: `Event ${i} hash mismatch: expected ${curr.currentHash}, computed ${recomputedHash}`
      };
    }
  }

  return { valid: true };
}
```

**UI display:**
```typescript
// In Vault Mode settings panel
const { valid, error } = await verifyAuditLog();

if (valid) {
  displaySuccess('✅ Audit log integrity verified (all events valid)');
} else {
  displayError(`⚠️ Audit log corrupted: ${error}`);
}
```

### 4.5. Export Format

**JSON structure:**
```json
{
  "exportTimestamp": "2026-05-06T18:47:23.482Z",
  "appVersion": "2.0.0",
  "totalEvents": 42,
  "chainVerified": true,
  "events": [
    {
      "id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
      "timestamp": 1746540195000,
      "eventType": "session_start",
      "details": { "appVersion": "2.0.0", "platform": "darwin" },
      "previousHash": "0000000000000000000000000000000000000000000000000000000000000000",
      "currentHash": "8f7e6d5c4b3a2918f7e6d5c4b3a2918f7e6d5c4b3a2918f7e6d5c4b3a2918f7e"
    },
    {
      "id": "e5f6g7h8-90ab-cdef-1234-567890abcdef",
      "timestamp": 1746540196000,
      "eventType": "mode_selected",
      "details": { "mode": "vault", "previousMode": null },
      "previousHash": "8f7e6d5c4b3a2918f7e6d5c4b3a2918f7e6d5c4b3a2918f7e6d5c4b3a2918f7e",
      "currentHash": "3c4b5a6978901234567890ab3c4b5a6978901234567890ab3c4b5a6978901234"
    }
    // ... more events ...
  ],
  "metadata": {
    "photosAnalyzed": 5,
    "totalDurationSeconds": 38.472,
    "networkBlockedCount": 0,
    "ollamaRequestCount": 8
  }
}
```

**File naming convention:**
```
audit-log-{YYYY-MM-DD}-{HH-MM-SS}.json
```

**Export trigger:**
- User clicks "Export Audit Log" button in Vault Mode settings
- Electron save dialog opens
- File written to user-selected location
- Export event appended to audit log

---

## 5. UI/UX for Vault Mode

### 5.1. Mode Selection

**Entry point:** Landing screen (before photo upload) or settings modal.

**Vault Mode card:**
```
┌─────────────────────────────────────────┐
│  🔒 Vault Mode                          │
│                                         │
│  100% Local • Network-Isolated          │
│  Audit-Logged                           │
│                                         │
│  For confidential client work           │
│  (NDA-bound, legal, corporate)          │
│                                         │
│  ⚠️ Requires desktop app for            │
│     verifiable network isolation        │
│                                         │
│  [Select Vault Mode]                    │
└─────────────────────────────────────────┘
```

**Desktop app check:**
- If running in Electron → allow Vault Mode
- If running in browser → show warning (see section 3.2)

### 5.2. Vault Mode Indicator

**Persistent banner** (top of screen, visible on all tabs):
```
┌───────────────────────────────────────────────────┐
│ 🔒 VAULT MODE ACTIVE • Network Isolated           │
│ All processing local • Audit log recording        │
│ [View Audit Log] [Export Log]                    │
└───────────────────────────────────────────────────┘
```

**Color scheme:**
- Background: Dark blue (#1e3a8a)
- Text: White (#ffffff)
- Icons: Gold (#fbbf24) for lock/shield

### 5.3. Disabled Features

**Image generation button** (AI Enhancement tab):
```
┌─────────────────────────────────────────┐
│  🔒 Generate Ideal Version              │
│     (Disabled in Vault Mode)            │
│                                         │
│  Image generation requires cloud        │
│  service, which is blocked in Vault.    │
└─────────────────────────────────────────┘
```

**Style:**
- Button grayed out (opacity: 0.5)
- Cursor: not-allowed
- Tooltip on hover: "Image generation disabled in Vault Mode (network isolation policy)"

### 5.4. Audit Log Panel

**Access:** Click "View Audit Log" in Vault Mode banner.

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  Audit Log                              [Close] │
├─────────────────────────────────────────────────┤
│  ✅ Chain Verified (42 events)                  │
│  Session start: 2026-05-06 14:23:15             │
│  Last event: 2026-05-06 14:47:23 (24 min ago)   │
│                                                 │
│  [Export Log] [Verify Chain] [Clear All Logs]  │
├─────────────────────────────────────────────────┤
│  📋 Recent Events:                              │
│                                                 │
│  14:47:23 - ollama_response                     │
│    ✓ Schema valid, 1053 tokens, 4.8s           │
│                                                 │
│  14:47:18 - ollama_request                      │
│    → localhost:11434, gemma-4-e4b, 1847 tokens │
│                                                 │
│  14:47:17 - cv_analysis                         │
│    ✓ EXIF extracted, histogram, focus map      │
│                                                 │
│  14:47:16 - photo_upload                        │
│    📷 image/jpeg, 2.7MB, hash: e3b0c44...      │
│                                                 │
│  [Show All 42 Events]                           │
└─────────────────────────────────────────────────┘
```

**Interactive features:**
- Click event → expand to show full details JSON
- Click "Verify Chain" → run verification algorithm, display result
- Click "Export Log" → Electron save dialog, export JSON

### 5.5. Mode Switching Constraints

**Cannot switch mid-session:**
```
┌─────────────────────────────────────────┐
│  ⚠️ Cannot Switch Modes                 │
│                                         │
│  You have an active analysis session.   │
│  To switch from Vault Mode to Studio    │
│  Mode, you must:                        │
│                                         │
│  1. Export your audit log (recommended) │
│  2. Reset the session                   │
│                                         │
│  [Export Log & Reset] [Cancel]          │
└─────────────────────────────────────────┘
```

**Session reset:**
- Clears current image, analysis, mentor chat
- Keeps audit log (user can export first)
- Allows mode selection again

---

## 6. Testing and Validation

### 6.1. Functional Tests

**Test case: VT-1 (Local-Only Inference)**
- Precondition: Desktop app in Vault Mode, Ollama running
- Steps: Upload photo → wait for analysis
- Expected: Analysis completes, audit log shows ollama_request/response events
- Verification: Network monitor shows zero non-localhost packets

**Test case: VT-2 (Cloud Service Blocking)**
- Precondition: Desktop app in Vault Mode
- Steps: Attempt to generate corrected image
- Expected: Button disabled, no API call made
- Verification: Audit log shows zero network_blocked events (button never clickable)

**Test case: VT-3 (Audit Chain Integrity)**
- Precondition: Vault Mode with 10+ events in audit log
- Steps: Click "Verify Chain"
- Expected: Verification passes, green checkmark displayed
- Verification: Manual hash recomputation matches stored hashes

**Test case: VT-4 (Session Isolation)**
- Precondition: Active analysis in Vault Mode
- Steps: Attempt to switch to Studio Mode
- Expected: Modal blocks switch, requires session reset
- Verification: Mode remains "vault" after cancel

**Test case: VT-5 (Audit Export)**
- Precondition: Vault Mode with 20+ events
- Steps: Click "Export Log" → save file → open file
- Expected: Valid JSON, chainVerified: true, all events present
- Verification: External JSON validator confirms structure

### 6.2. Security Tests

**Test case: ST-1 (Network Penetration)**
- Precondition: Desktop app in Vault Mode, Wireshark running
- Steps: Upload 3 photos, run full analysis workflow, export audit log
- Expected: Zero non-localhost packets captured by Wireshark
- Verification: Filter packets by destination != 127.0.0.1, count == 0

**Test case: ST-2 (Forced Cloud Call)**
- Precondition: Desktop app in Vault Mode, modified dev build
- Steps: Inject code to call fetch('https://google.com'), trigger call
- Expected: Electron webRequest blocks call, audit log shows network_blocked event
- Verification: Fetch promise rejects, no response received

**Test case: ST-3 (Audit Tampering)**
- Precondition: Vault Mode with 10 events in audit log
- Steps: Open IndexedDB in dev tools → modify event details → verify chain
- Expected: Verification fails, hash mismatch detected
- Verification: Error message shows exact event where chain broke

### 6.3. Performance Tests

**Test case: PT-1 (Latency Parity)**
- Precondition: Same hardware, same image
- Steps: Analyze in Studio Mode (run 1) → analyze in Vault Mode (run 2)
- Expected: Vault Mode latency within 10% of Studio Mode
- Measurement: P50 latency <5s, P95 <9s

**Test case: PT-2 (Audit Overhead)**
- Precondition: Vault Mode with audit logging enabled
- Steps: Analyze 10 photos, measure total time
- Expected: Audit logging adds <2% overhead
- Measurement: Compare with audit logging disabled (dev flag)

---

## 7. Compliance and Legal

### 7.1. Documentation for Clients

**Photographers using Vault Mode can provide clients with:**

1. **Audit log export** - Proves all processing happened locally
2. **Architecture diagram** - Shows network isolation mechanism
3. **Verification instructions** - Client can verify hash chain integrity
4. **Open-source code** - Client's technical team can audit implementation

**Sample client documentation:**
```
Photography Coach v2 - Vault Mode Confidentiality Statement

Your images were analyzed using Photography Coach v2 in Vault Mode:

✅ 100% local processing (Gemma 4 E4B via Ollama on photographer's device)
✅ Zero cloud API calls (verified via attached audit log)
✅ Network-isolated desktop app (Electron with cryptographic enforcement)
✅ Tamper-evident audit log (hash chain verified)

Attached: audit-log-2026-05-06.json (42 events, chain verified)

To verify integrity:
1. Open audit log JSON
2. Check "chainVerified": true
3. Optionally: Run independent verification script (see GitHub repo)

Questions? Contact: [photographer email]
```

### 7.2. Limitations and Disclaimers

**What Vault Mode DOES guarantee:**
- All inference happens locally (no cloud LLM calls)
- Network isolation prevents accidental data leakage
- Audit log provides verifiable proof of local processing

**What Vault Mode DOES NOT guarantee:**
- Physical device security (malware, keyloggers, screen capture)
- Operating system integrity (rootkits, modified OS)
- User behavior (screenshots, camera photos of screen)
- Third-party app interference (screen recording software)

**Disclaimer text (settings panel):**
```
Vault Mode provides network-level isolation and audit logging.
It does NOT protect against:
- Device malware or operating system compromise
- Physical screen capture (cameras, screenshots)
- User actions outside the app

For maximum confidentiality, use Vault Mode on a dedicated,
malware-free device in a secure physical environment.
```

---

## 8. Open Questions and Assumptions

### 8.1. Assumptions

1. **Ollama trust:** Assumes Ollama itself doesn't make unauthorized network calls (trust open-source implementation)
2. **Electron trust:** Assumes Electron's webRequest API reliably blocks requests (trust Chromium implementation)
3. **IndexedDB reliability:** Assumes IndexedDB writes are durable (OS crashes don't corrupt last event)

### 8.2. Open Questions (Resolve During Implementation)

**Q1: Should audit log include image hashes or actual images?**
- **Option A:** Hash only (current spec) - Smaller logs, more private
- **Option B:** Thumbnail images - Easier client verification (see which photo = which analysis)
- **Recommendation:** Hash only (Option A), with optional thumbnail export as separate feature

**Q2: Should web app Vault Mode be disabled entirely?**
- **Option A:** Allow web Vault Mode with disclaimer (current spec)
- **Option B:** Block web Vault Mode, force desktop app download
- **Recommendation:** Option A (allow with disclaimer) for flexibility during development

**Q3: Should audit log encrypt sensitive details?**
- **Option A:** Plain JSON (current spec) - Human-readable, easier verification
- **Option B:** Encrypted details field - Hide image hashes, prompt content
- **Recommendation:** Option A for MVP, add encryption option in post-MVP settings

---

## 9. Dependencies and Blockers

### 9.1. Blocking Dependencies

**This spec (08) blocks:**
- **10-platform-shells-spec.md** - needs Vault Mode requirements to define desktop app features

**This spec (08) is blocked by:**
- **06-architecture-spec.md** - network isolation architecture (complete)
- **07-stack-and-runtime-mapping.md** - Electron dependencies (complete)

### 9.2. Implementation Dependencies

**Must have before Vault Mode works:**
1. Electron app packaged and tested (see 10-platform-shells-spec.md)
2. Ollama running locally (runtime requirement)
3. Audit log service implemented (auditService.ts)
4. IndexedDB storage working (idb library)

---

## 10. Success Criteria

**Vault Mode succeeds if:**

1. ✅ Network penetration test shows zero non-localhost packets (100 photo analysis session)
2. ✅ Audit log verification passes on 100% of test cases (including crash recovery)
3. ✅ Performance parity: Vault Mode latency within 10% of Studio Mode (P50 <5s, P95 <9s)
4. ✅ Client documentation enables photographers to prove confidentiality to clients
5. ✅ UI clearly indicates Vault Mode status (persistent banner, disabled features)
6. ✅ Desktop app requirement clearly communicated (no false trust in web app Vault Mode)

---

## 11. Summary

This spec defines **Vault Mode** - a confidentiality-first operating mode with:

1. **Network isolation:** Desktop app (Electron) blocks all non-localhost requests
2. **Audit logging:** Tamper-evident hash-chained log of all operations
3. **Local-only processing:** Gemma 4 E4B + Ollama, no cloud services
4. **Transparent operation:** Users can verify + export audit logs
5. **Client-ready:** Photographers can prove confidentiality to clients

**Deployment:** Desktop app (Electron) required for credible network isolation. Web app fallback available for development/demo with explicit limitations.

**Next steps:**
1. Implement Electron network policy (section 3.1)
2. Implement audit logging service (section 4)
3. Implement UI indicators (section 5)
4. Proceed to **09-validation-and-error-handling-spec.md** for unified refusal handling

---

**End of 08-vault-mode-spec.md**
