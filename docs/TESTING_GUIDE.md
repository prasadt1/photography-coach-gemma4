# Testing Guide: iOS PWA + Lightroom XMP

**Quick verification guide for Photography Coach v2 features**

---

## Part 1: iOS PWA Vision Testing (15 minutes)

### Prerequisites

- ✅ iPhone or iPad (iOS 15+)
- ✅ Mac/PC with Ollama running
- ✅ Both devices on **same WiFi network**
- ✅ Gemma 4 E4B model installed (`ollama pull gemma4:e4b`)

---

### Step 1: Start Ollama with Network Access

**On your Mac:**

```bash
# Allow Ollama to accept connections from local network
export OLLAMA_HOST=0.0.0.0:11434
export OLLAMA_ORIGINS="*"
ollama serve
```

Keep this terminal window open (Ollama must stay running).

**Verify Ollama is accessible:**
```bash
# In a new terminal window
curl http://localhost:11434/api/tags

# Should return JSON with "models": [...]
```

---

### Step 2: Find Your Mac's IP Address

**macOS:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Look for a line like:
```
inet 192.168.1.100 netmask 0xffffff00 broadcast 192.168.1.255
```

Your IP is: **192.168.1.100** (example - yours will differ)

**Alternative (GUI):**
- System Settings → Network → Wi-Fi → Details → TCP/IP tab
- Look for "IPv4 Address"

---

### Step 3: Start Photography Coach Dev Server

**In project directory:**
```bash
# Start Vite dev server with network access
npm run dev -- --host

# Server will show:
# ➜  Local:   http://localhost:5173/
# ➜  Network: http://192.168.1.100:5173/
```

**Note the Network URL** (you'll use this on iPhone)

---

### Step 4: Open on iPhone

**On your iPhone (connected to same WiFi):**

1. Open **Safari** (not Chrome - Safari required for PWA features)
2. Navigate to: `http://192.168.1.100:5173/` (use YOUR Mac's IP)
3. You should see Photography Coach homepage

**Expected result:**
- ✅ App loads (may take a few seconds)
- ⚠️ "Ollama offline" warning in header (expected - need to configure)

---

### Step 5: Configure Ollama Connection (Temporary Fix)

**Quick test method (no code changes needed):**

The app currently looks for Ollama at `http://localhost:11434`, which won't work from iPhone.

**Option A: Use browser console (temporary test)**
1. Safari → Develop → [Your iPhone] → [Photography Coach]
2. Console tab
3. Run:
   ```javascript
   localStorage.setItem('OLLAMA_BASE_URL', 'http://192.168.1.100:11434');
   location.reload();
   ```
4. App reloads and should connect to Ollama

**Option B: Edit config temporarily**
```bash
# On Mac, edit config.ts
nano config.ts

# Change line:
baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
# To:
baseUrl: process.env.OLLAMA_BASE_URL || 'http://192.168.1.100:11434',

# Save and Vite will hot-reload
```

---

### Step 6: Test Photo Analysis

**On iPhone:**

1. **Take a test photo** (Camera icon in uploader)
   - Or select from Photos library
   - Or use sample photo from homepage

2. **Watch for progress:**
   - "🧠 Gemma 4 is thinking..."
   - Progress bar (CV analysis → Gemma inference)
   - Takes ~20-40 seconds

3. **Verify results display:**
   - ✅ 5-axis radar chart visible
   - ✅ Scores displayed (Composition, Lighting, etc.)
   - ✅ Critique text appears
   - ✅ Spatial overlay with bounding boxes (if issues found)
   - ✅ Can scroll through Strengths, Improvements, Learning Path

4. **Test Mentor Chat tab:**
   - Switch to "Mentor Chat" tab
   - Ask: "How can I improve the lighting?"
   - Wait for response (~5-10 seconds)
   - ✅ Response appears with specific suggestions

---

### Step 7: Install as PWA (Optional but Recommended)

**Test full PWA experience:**

1. Safari → **Share button** (⬆️ icon)
2. Scroll down → **"Add to Home Screen"**
3. Name: "Photography Coach"
4. Tap **Add**

5. **Open from Home Screen** (not Safari):
   - Tap the new app icon
   - App opens **full-screen** (no Safari UI)
   - Looks like native app

6. **Re-test photo analysis**:
   - Upload another photo
   - Verify full workflow works in standalone mode

---

### iOS PWA Test Checklist

| Feature | Status | Notes |
|---------|--------|-------|
| **App loads on iPhone** | ⬜ | Via Safari, network URL |
| **Connects to Ollama** | ⬜ | Green "Ollama ready" indicator |
| **Photo upload works** | ⬜ | From camera or library |
| **CV analysis runs** | ⬜ | EXIF, histogram, focus map |
| **Gemma 4 inference completes** | ⬜ | 20-40 seconds |
| **5-axis scores display** | ⬜ | Radar chart visible |
| **Critique text appears** | ⬜ | Overview tab populated |
| **Bounding boxes work** | ⬜ | Spatial overlay (if issues found) |
| **Mentor chat responds** | ⬜ | Follow-up questions work |
| **PWA installation** | ⬜ | Add to Home Screen successful |
| **Standalone mode** | ⬜ | Full-screen, no Safari chrome |

---

### Common iOS PWA Issues

**"Ollama offline" persists:**
- ✅ Check Mac/iPhone on same WiFi
- ✅ Verify Ollama running: `curl http://192.168.1.100:11434/api/tags`
- ✅ Check firewall: System Settings → Network → Firewall (allow port 11434)
- ✅ Try Safari private browsing (sometimes cache issues)

**Photos won't upload:**
- ✅ Safari permissions: Settings → Safari → Camera (allow)
- ✅ Try selecting from library instead of camera
- ✅ Install as PWA first (better camera access)

**Analysis hangs at "Gemma 4 is thinking":**
- ✅ Check Mac terminal - Ollama should show request logs
- ✅ Verify model loaded: `ollama list` (should show gemma4:e4b)
- ✅ Try smaller test photo first (<2MB)

**No bounding boxes appear:**
- ⚠️ This is normal if photo has no issues
- ✅ Test with a deliberately flawed photo (blurry, overexposed)
- ✅ Check Detailed Analysis tab → Spatial Issues section

---

## Part 2: Lightroom XMP Testing (20 minutes)

### Prerequisites

- ✅ Adobe Lightroom Classic installed (any version)
- ✅ Photography Coach running (web or desktop)
- ✅ 3 test photos (varied quality)

---

### Step 1: Prepare Test Photos

**Select 3 photos with different characteristics:**

**Photo 1: High Quality**
- Well-composed landscape or portrait
- Good lighting, sharp focus
- Expected: 4-5 stars, Green label

**Photo 2: Moderate Quality**
- Decent composition, some issues (slight overexposure, soft focus)
- Expected: 3 stars, Yellow label

**Photo 3: Low Quality**
- Blurry, poor composition, bad lighting
- Expected: 1-2 stars, Red label

**Copy to test folder:**
```bash
# Create test folder
mkdir -p ~/Desktop/PhotoCoach_XMP_Test

# Copy your 3 test photos there
cp /path/to/good-photo.JPG ~/Desktop/PhotoCoach_XMP_Test/
cp /path/to/moderate-photo.JPG ~/Desktop/PhotoCoach_XMP_Test/
cp /path/to/poor-photo.JPG ~/Desktop/PhotoCoach_XMP_Test/
```

---

### Step 2: Analyze Photos in Photography Coach

**For each of the 3 photos:**

1. **Upload to Photography Coach** (web or desktop app)
2. **Wait for analysis** to complete
3. **Review results:**
   - Note the average score
   - Check for bounding boxes (severity levels)
   - Read observations in Rationale section
4. **Switch to Statistics tab** (bottom of page)
5. **Click "Export XMP for Lightroom"** (blue button)
6. **Save to test folder** (same directory as photo)

**After 3 exports, your folder should look like:**
```
~/Desktop/PhotoCoach_XMP_Test/
  ├── good-photo.JPG
  ├── good-photo.xmp          ← Exported sidecar
  ├── moderate-photo.JPG
  ├── moderate-photo.xmp      ← Exported sidecar
  ├── poor-photo.JPG
  └── poor-photo.xmp          ← Exported sidecar
```

---

### Step 3: Verify XMP Files

**Quick sanity check before Lightroom:**

```bash
# Open one XMP file in text editor
cat ~/Desktop/PhotoCoach_XMP_Test/good-photo.xmp

# Look for these sections:
# <xmp:Rating>5</xmp:Rating>          (star rating)
# <xmp:Label>Green</xmp:Label>        (color label)
# <dc:subject>                        (keywords)
#   <rdf:Bag>
#     <rdf:li>Clear blue sky...</rdf:li>
```

**Verify XML is well-formed:**
```bash
# macOS (xmllint pre-installed)
xmllint --noout ~/Desktop/PhotoCoach_XMP_Test/good-photo.xmp

# Should return nothing (silence = success)
# Any errors indicate malformed XML
```

---

### Step 4: Import into Lightroom Classic

**Open Lightroom Classic:**

1. **File → Import Photos and Video...**
2. **Source panel (left):**
   - Navigate to: `~/Desktop/PhotoCoach_XMP_Test`
   - Select folder
3. **Import dialog:**
   - **Don't check** "Don't import suspected duplicates" (in case photos already in catalog)
   - **File Handling:** "Copy" or "Add" (your choice)
   - **Import Destination:** Choose or create a new folder
4. **Click "Import"** button

**What happens:**
- Lightroom imports 3 photos
- **Automatically reads** `.xmp` sidecars
- Metadata populated immediately

---

### Step 5: Verify Metadata in Library View

**Switch to Library module (G key):**

**Check Grid View (G key):**
- ✅ **Star ratings visible** under thumbnails
  - good-photo.JPG should show 4-5 stars (★★★★★)
  - moderate-photo.JPG should show 3 stars (★★★☆☆)
  - poor-photo.JPG should show 1-2 stars (★☆☆☆☆)

- ✅ **Color labels visible** (small colored dot on thumbnail)
  - good-photo.JPG → Green dot
  - moderate-photo.JPG → Yellow dot
  - poor-photo.JPG → Red dot

**If ratings/labels don't appear:**
- Right-click photo → **Metadata → Read Metadata from File**
- Or: Select all 3 photos → **Metadata → Read Metadata from Files**

---

### Step 6: Verify Metadata in Detail

**Select one photo → Right sidebar:**

**Metadata Panel:**
1. **Expand "IPTC" section:**
   - **Title:** Should show original filename
   - **Caption:** Should show critique summary (★★★★☆ Photography Coach Critique...)
   - **Keywords:** Scroll down to see list

2. **Expand "EXIF and IPTC" section (if available):**
   - **Rating:** Shows stars (1-5)
   - **Label:** Shows color name (Red/Yellow/Green)

**Keywording Panel (right sidebar):**
- ✅ **Keyword Tags** section lists all keywords
- Should see 5 keywords from observations:
  - "Clear blue sky dominating composition"
  - "Strong leading lines in foreground"
  - etc.

**Caption/Description:**
- Library → Metadata panel → Caption field
- Should show full critique text with star visualization

---

### Step 7: Test Filtering and Sorting

**Library Filter Bar (top of Library module):**

**Filter by Rating:**
1. Click **Attribute** tab
2. **Rating section:** Click "3 stars and up" (★★★ ≥)
3. ✅ Only good-photo and moderate-photo should show
4. Clear filter (None button)

**Filter by Color Label:**
1. Attribute tab → **Label section**
2. Click **Red** label
3. ✅ Only poor-photo should show
4. Try **Yellow** → moderate-photo
5. Try **Green** → good-photo

**Search by Keyword:**
1. Click **Text** tab in Filter Bar
2. **Any Searchable Field** dropdown → Select "Keywords"
3. Type part of a keyword: "golden hour"
4. ✅ Photos with that keyword appear

**Sort by Rating:**
1. Library → View → Sort → Rating
2. Photos arrange by star count (1★ → 5★ or reverse)

---

### Lightroom XMP Test Checklist

| Feature | Photo 1 (Good) | Photo 2 (Moderate) | Photo 3 (Poor) | Notes |
|---------|----------------|-----------------------|----------------|-------|
| **XMP file created** | ⬜ | ⬜ | ⬜ | Same filename as .JPG |
| **XMP is valid XML** | ⬜ | ⬜ | ⬜ | `xmllint --noout` succeeds |
| **Import successful** | ⬜ | ⬜ | ⬜ | All 3 in Lightroom catalog |
| **Star rating visible** | ⬜ (4-5★) | ⬜ (3★) | ⬜ (1-2★) | Grid view thumbnails |
| **Color label visible** | ⬜ (Green) | ⬜ (Yellow) | ⬜ (Red) | Colored dot on thumbnail |
| **Keywords populated** | ⬜ | ⬜ | ⬜ | Keywording panel (5 keywords) |
| **Caption/description** | ⬜ | ⬜ | ⬜ | Metadata panel |
| **Filter by rating works** | ⬜ | ⬜ | ⬜ | "3 stars and up" filter |
| **Filter by label works** | ⬜ | ⬜ | ⬜ | Red/Yellow/Green filters |
| **Keyword search works** | ⬜ | ⬜ | ⬜ | Text search finds photos |

---

### Common Lightroom Issues

**XMP not read (no metadata appears):**

**Solution 1: Force metadata read**
```
1. Select all 3 photos in Library
2. Metadata → Read Metadata from Files
3. Confirm dialog: "Import Settings from Disk"
```

**Solution 2: Check filename matching**
```bash
# In test folder, verify exact match (case-sensitive):
ls -la ~/Desktop/PhotoCoach_XMP_Test/

# Should see pairs:
# IMG_1234.JPG  ← photo
# IMG_1234.xmp  ← sidecar (exact match except extension)
```

**Solution 3: Re-export XMP**
```
1. In Photography Coach, export XMP again
2. Ensure saving with EXACT same base name as photo
3. Overwrite existing .xmp file
4. In Lightroom: Metadata → Read Metadata from File
```

**Color labels show wrong colors:**

Lightroom uses **text labels internally** (Red/Yellow/Green/Blue/Purple).

**Check:**
1. Select photo
2. Metadata panel → "Label" field
3. Should show text: "Red", "Yellow", or "Green"
4. If showing different color, XMP may have wrong value

**Fix:** View → Label Set → ensure "Review Status" or "Bridge Default" is selected

**Keywords appear as one long string:**

XMP uses `<rdf:Bag>` with separate `<rdf:li>` elements.

**Verify XMP structure:**
```xml
<!-- Correct: -->
<dc:subject>
  <rdf:Bag>
    <rdf:li>Keyword one</rdf:li>
    <rdf:li>Keyword two</rdf:li>
  </rdf:Bag>
</dc:subject>

<!-- Wrong (comma-separated): -->
<dc:subject>Keyword one, Keyword two</dc:subject>
```

If wrong format, re-export from Photography Coach.

---

## Part 3: End-to-End Workflow Test (30 minutes)

**Complete workflow: Mobile → Desktop → Lightroom**

### Scenario: Wedding Photographer Field Workflow

**Step 1: Shoot on Location (iPhone)**
1. Take 10 photos with iPhone during a walk
2. Use Photography Coach PWA to critique 3 "hero shots"
3. Review scores, note which need editing

**Step 2: Transfer to Desktop**
1. AirDrop photos from iPhone to Mac
2. Or: Import from iPhone via cable
3. Place in working folder

**Step 3: Batch Analyze on Desktop**
1. Open Photography Coach desktop app
2. Drag all 10 photos into app
3. Wait for batch processing
4. Review outlier detection results

**Step 4: Export XMP for All**
1. For each analyzed photo, export XMP sidecar
2. Save all XMP files to same folder as photos
3. Should have 10 .JPG + 10 .xmp files

**Step 5: Import to Lightroom**
1. File → Import → Select folder
2. Lightroom reads all 10 XMP sidecars
3. Star ratings and labels populate

**Step 6: Filter and Edit**
1. Filter: "4 stars and up" → See best shots
2. Filter: "Red label" → See critical issues to fix
3. Edit best shots in Develop module
4. Export final images for client delivery

**Step 7: Archive**
1. Export Photography Coach JSON for all 10 photos
2. Save to external drive with originals + XMP
3. Complete paper trail for future reference

---

## Screenshots to Capture (for Documentation)

### iOS PWA Screenshots

1. **Homepage on iPhone** (Safari, before Add to Home Screen)
2. **Add to Home Screen dialog** (Share menu)
3. **PWA app icon** on iPhone home screen
4. **Photo upload screen** (full-screen, no Safari chrome)
5. **"Gemma 4 is thinking"** loading state
6. **Results: Radar chart + scores** (overview tab)
7. **Spatial overlay** with bounding boxes
8. **Mentor chat** conversation

### Lightroom XMP Screenshots

1. **Test folder** (Finder, showing .JPG + .xmp pairs)
2. **Lightroom Grid View** (star ratings visible under thumbnails)
3. **Lightroom Grid View** (color labels visible as colored dots)
4. **Metadata Panel** (expanded, showing Rating, Label, Keywords)
5. **Keywording Panel** (5 keywords listed)
6. **Filter Bar** (filtering by "3 stars and up")
7. **Filter Bar** (filtering by Red color label)
8. **XMP file in text editor** (showing XML structure)

---

## Quick Test Commands

**Check Ollama status:**
```bash
# Is it running?
curl http://localhost:11434/api/tags

# Is model loaded?
ollama list | grep gemma4
```

**Check network connectivity:**
```bash
# From Mac (should work):
curl http://192.168.1.100:11434/api/tags

# From iPhone (via Safari console or nslookup app):
# Navigate to: http://192.168.1.100:11434/api/tags
# Should see JSON response
```

**Validate XMP files:**
```bash
# Check XML well-formedness
xmllint --noout *.xmp

# Count XMP files
ls -1 *.xmp | wc -l

# View ratings in XMP files
grep -h "xmp:Rating" *.xmp
```

**Test Lightroom metadata read:**
```bash
# Check if Lightroom created .xmp sidecar (in addition to original)
# Note: LR may create its own XMP if "auto-write" is enabled
ls -la ~/Pictures/Lightroom/

# Lightroom catalogs store metadata internally too
# Original .xmp files should remain unchanged
```

---

## Troubleshooting Decision Tree

**Problem: iOS PWA not working**
```
Is Ollama running?
├─ No → Start with: OLLAMA_HOST=0.0.0.0:11434 ollama serve
└─ Yes → Can Mac curl Ollama?
    ├─ No → Check firewall (System Settings → Network → Firewall)
    └─ Yes → Can iPhone reach Mac's IP?
        ├─ No → Check same WiFi, ping from iPhone
        └─ Yes → Check browser console for errors (Safari → Develop → iPhone)
```

**Problem: Lightroom not reading XMP**
```
Do .xmp files exist?
├─ No → Re-export from Photography Coach
└─ Yes → Do filenames match exactly?
    ├─ No → Rename: IMG_1234.JPG needs IMG_1234.xmp (not critique.xmp)
    └─ Yes → Is XML valid?
        ├─ No → xmllint shows errors → Re-export
        └─ Yes → Force read: Metadata → Read Metadata from File
```

---

## Success Criteria

✅ **iOS PWA Test Passed:**
- Photo uploads from iPhone
- Gemma 4 analysis completes (20-40s)
- Results display correctly (scores, critique, bounding boxes)
- Mentor chat responds to questions
- PWA installs and runs full-screen

✅ **Lightroom XMP Test Passed:**
- XMP files export successfully
- Star ratings appear in Grid View (match expected ranges)
- Color labels visible and correct (Red/Yellow/Green)
- Keywords populated in Keywording panel (5 observations)
- Filters work (rating, label, keyword search)

✅ **Both features production-ready** → Move to next Phase 2 task

---

**Need help?** Check:
- `docs/ios-pwa-setup.md` (detailed iOS troubleshooting)
- `docs/integrations/lightroom-xmp.md` (XMP specification details)
- `TROUBLESHOOTING.md` (general app issues)
