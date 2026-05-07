# Lightroom XMP Integration Guide

**Photography Coach v2 → Lightroom Classic Round-Trip**

---

## Overview

Photography Coach can export critique data as XMP sidecar files that Lightroom Classic reads to populate:
- **Star Ratings** (1-5 stars based on overall score)
- **Color Labels** (Red/Yellow/Green based on issue severity)
- **IPTC Keywords** (Top 5 observations from critique)
- **Description** (Overall critique summary)

This enables a **professional workflow**: critique photos with Photography Coach → export XMP → import into Lightroom → filter/sort by ratings and labels.

---

## Quick Start (3 steps)

### 1. Analyze Photo in Photography Coach

1. Open Photography Coach (web or desktop app)
2. Upload a photo
3. Wait for Gemma 4 critique to complete
4. Review results (5-axis scores, spatial issues, recommendations)

### 2. Export XMP Sidecar

1. Scroll to **Statistics tab** (bottom of results page)
2. Click **"Export XMP for Lightroom"** button (blue gradient button)
3. Save the `.xmp` file in the **same directory** as your original photo

**Example:**
```
/Photos/
  ├── IMG_1234.JPG       (original photo)
  └── IMG_1234.xmp       (exported sidecar)
```

**Important:** XMP filename **must match** photo filename (except extension):
- ✅ `IMG_1234.JPG` + `IMG_1234.xmp` → Works
- ❌ `IMG_1234.JPG` + `critique.xmp` → Won't be read by Lightroom

### 3. Import into Lightroom Classic

1. **Open Lightroom Classic**
2. **Navigate to folder** containing photo + XMP sidecar
3. Lightroom **automatically reads** `.xmp` files when loading folders
4. **Verify metadata populated:**
   - **Library Grid View:** Star ratings appear under thumbnails
   - **Metadata Panel:** Color label visible in right sidebar
   - **Keywording Panel:** IPTC keywords appear in keyword list
   - **Caption field:** Overall critique text visible

**If metadata doesn't appear:**
- Right-click photo → **Metadata → Read Metadata from File**
- Or: **Metadata → Read Metadata from Files** (batch operation)

---

## Mapping Rules

### Star Rating (1-5 stars)

Photography Coach calculates **average score** across 5 axes:
```
Average = (Composition + Lighting + Technique + Creativity + Subject Impact) / 5
```

**Mapping:**
| Average Score | Star Rating | Badge Color |
|---------------|-------------|-------------|
| 8.0 - 10.0    | ★★★★★ (5)   | 🟢 Advanced |
| 6.0 - 7.9     | ★★★★☆ (4)   | 🟡 Intermediate |
| 4.0 - 5.9     | ★★★☆☆ (3)   | 🟡 Intermediate |
| 2.0 - 3.9     | ★★☆☆☆ (2)   | 🔴 Beginner |
| 0.0 - 1.9     | ★☆☆☆☆ (1)   | 🔴 Beginner |

**Example:**
```json
{
  "scores": {
    "composition": 8,
    "lighting": 7,
    "technique": 9,
    "creativity": 7,
    "subjectImpact": 8
  }
}
```
Average = (8+7+9+7+8)/5 = **7.8** → **4 stars** ★★★★☆

### Color Label (Red/Yellow/Green)

Based on **highest severity** from spatial issues (bounding boxes):

| Bounding Box Severity | Color Label | Lightroom Display |
|-----------------------|-------------|-------------------|
| **Critical**          | Red         | 🔴 Red label      |
| **Moderate**          | Yellow      | 🟡 Yellow label   |
| **Minor**             | Green       | 🟢 Green label    |
| *No issues*           | Green       | 🟢 Green label    |

**Example:**
If a photo has 3 bounding boxes with severities: `[minor, moderate, minor]`, the label will be **Yellow** (moderate is highest).

### IPTC Keywords (Top 5 Observations)

Photography Coach extracts the **first 5 observations** from `rationale.observations` and formats them as IPTC keywords.

**Original Observations:**
```json
{
  "rationale": {
    "observations": [
      "I observe a clear blue sky dominating the composition",
      "Strong leading lines in the foreground path",
      "Soft golden hour lighting creating warm tones",
      "Sharp focus on the main subject with shallow DOF",
      "Balanced histogram distribution across tonal range"
    ]
  }
}
```

**Exported Keywords** (prefixes removed, capitalized):
```
- Clear blue sky dominating the composition
- Strong leading lines in the foreground path
- Soft golden hour lighting creating warm tones
- Sharp focus on the main subject with shallow DOF
- Balanced histogram distribution across tonal range
```

These appear in Lightroom's **Keywording panel** and are searchable.

### Description Field (Overall Critique)

The XMP `dc:description` field contains:
1. **Visual star rating** (★★★★☆)
2. **Overall critique text** from `critique.overall`
3. **Score breakdown** (Composition 8/10, Lighting 7/10, etc.)

**Example:**
```
★★★★☆ Photography Coach Critique (Gemma 4)

This landscape photo demonstrates strong compositional fundamentals with effective use of leading lines and rule of thirds placement. The golden hour lighting creates pleasing warm tones, though slight overexposure in the sky could be addressed with graduated ND filter or exposure blending.

Scores: Composition 8/10, Lighting 7/10, Technique 9/10
```

This appears in Lightroom's **Caption field** (Metadata panel).

---

## XMP File Structure

The exported `.xmp` file uses **Adobe XMP** standard with Dublin Core and Photoshop namespaces:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Photography Coach v2">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
      xmlns:xmp="http://ns.adobe.com/xap/1.0/"
      xmlns:dc="http://purl.org/dc/elements/1.1/"
      xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/">

      <!-- Star Rating (1-5) -->
      <xmp:Rating>4</xmp:Rating>

      <!-- Color Label (Red/Yellow/Green) -->
      <xmp:Label>Yellow</xmp:Label>

      <!-- Creator Tool -->
      <xmp:CreatorTool>Photography Coach v2 (Gemma 4 E4B)</xmp:CreatorTool>

      <!-- Description (Overall Critique) -->
      <dc:description>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">★★★★☆ Photography Coach Critique...</rdf:li>
        </rdf:Alt>
      </dc:description>

      <!-- IPTC Keywords -->
      <dc:subject>
        <rdf:Bag>
          <rdf:li>Clear blue sky dominating the composition</rdf:li>
          <rdf:li>Strong leading lines in the foreground path</rdf:li>
          ...
        </rdf:Bag>
      </dc:subject>

    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
```

This format is fully compatible with:
- ✅ Adobe Lightroom Classic
- ✅ Adobe Bridge
- ✅ Adobe Photoshop
- ✅ Capture One (partial - ratings and keywords)
- ✅ Photo Mechanic
- ✅ Any XMP-compliant DAM software

---

## Batch Workflow

### Scenario: Critique 50 Photos from a Shoot

1. **Batch analyze** in Photography Coach:
   - Desktop app: Drag 50 photos into app
   - Wait for batch processing to complete
   - Each photo gets analyzed with full v2 schema

2. **Export all XMP sidecars**:
   - For each photo's results page, click "Export XMP for Lightroom"
   - Or: Use batch export feature (if available in desktop app)
   - Save all `.xmp` files in same folder as original photos

3. **Import into Lightroom**:
   - File → Import Photos and Video...
   - Select folder containing photos + XMP files
   - Lightroom reads all XMP sidecars automatically
   - Metadata populates for all photos

4. **Filter and sort**:
   - **Library Filter Bar → Attribute → Ratings**
   - Select "4 stars and up" to view best shots
   - **Sort by Color Label** to prioritize fixes (Red = critical issues first)
   - **Search keywords** to find specific observations (e.g., "golden hour lighting")

5. **Professional workflow**:
   - **5-star photos**: Portfolio candidates, client delivery
   - **4-star photos**: Good shots, minor edits needed
   - **3-star photos**: Usable with significant editing
   - **2-star photos**: Practice shots, learning material
   - **1-star photos**: Rejects, technique issues

---

## Troubleshooting

### XMP Not Read by Lightroom

**Problem:** Lightroom doesn't show star ratings or keywords after XMP import.

**Checklist:**
1. ✅ **Filename match:** `IMG_1234.JPG` must have `IMG_1234.xmp` (exact match, case-sensitive on some systems)
2. ✅ **Same directory:** XMP file must be in same folder as photo
3. ✅ **Read metadata:** Right-click photo → Metadata → Read Metadata from File
4. ✅ **No write protection:** Ensure photo file isn't marked as read-only
5. ✅ **Restart Lightroom:** Close and reopen Lightroom Classic

**Force reload:**
```
1. Select photo in Lightroom
2. Metadata → Read Metadata from File
3. If prompted "The file has been changed externally", click "Import Settings from Disk"
```

### XMP Overwritten by Lightroom

**Problem:** Lightroom overwrites Photography Coach XMP with its own metadata.

**Solution:** Lightroom preference setting:
```
Preferences → Metadata → "Automatically write changes into XMP" should be:
- ✅ UNCHECKED for read-only workflow (recommended)
- ⚠️ CHECKED if you want Lightroom edits to merge with Photography Coach data
```

**Recommended workflow:**
1. Export XMP from Photography Coach
2. Import into Lightroom (don't check "auto-write XMP")
3. Make Lightroom edits
4. Export final images separately (don't overwrite originals)

### Color Labels Not Showing

**Problem:** Star ratings appear, but color labels don't show.

**Cause:** Lightroom Classic uses **text labels** (Red/Yellow/Green/Blue/Purple) internally, which map to colors in the UI.

**Verify:**
```
1. Select photo in Library
2. Right sidebar → Metadata panel
3. Look for "Label" field
4. Should show: "Red", "Yellow", or "Green"
5. Grid view should display colored badge
```

**If still not visible:**
- View → Show/Hide Color Labels (ensure enabled)
- Preferences → Interface → "Show color labels in grid cells"

### Missing Keywords

**Problem:** Keywords don't appear in Keywording panel.

**Debug:**
```
1. Open photo in Lightroom
2. Metadata panel → IPTC section
3. Scroll to "Keywords" field
4. Keywords should be comma-separated list
5. If empty: XMP file may not have <dc:subject> populated
```

**Fix:**
- Re-export XMP from Photography Coach
- Ensure critique has `rationale.observations` populated (not empty array)
- Check XMP file in text editor: look for `<dc:subject>` section

---

## Testing with Sample Photos

### Test Photo Set (Recommended)

To verify the XMP workflow, test with **3 photos of varying quality**:

| Photo Type | Expected Result | Verify |
|------------|----------------|--------|
| **Excellent landscape** (sharp, well-composed) | 5 stars, Green label | High scores (8-10), no critical issues |
| **Moderate portrait** (good subject, slight underexposure) | 3-4 stars, Yellow label | Mid scores (5-7), moderate lighting issue |
| **Beginner snapshot** (blurry, poor composition) | 1-2 stars, Red label | Low scores (0-4), critical composition/focus issues |

**Steps:**
1. Analyze all 3 in Photography Coach
2. Export XMP for each
3. Place XMP files alongside originals
4. Import folder into Lightroom
5. **Verify:**
   - Star ratings match expected range
   - Color labels reflect severity (green/yellow/red)
   - Keywords are relevant to photo content
   - Description contains meaningful critique

**Screenshot checklist:**
- ✅ Library Grid View (star ratings visible under thumbnails)
- ✅ Metadata Panel (color label, keywords, description)
- ✅ Keyword List Panel (all 5 observations appear)
- ✅ Filter Bar (able to filter by rating/label)

---

## Advanced: Custom XMP Panels (Optional)

For power users, create **custom metadata panels** in Lightroom to display Photography Coach scores:

1. Lightroom → Metadata → Edit Metadata Presets
2. Add fields:
   - `Iptc4xmpCore:Location` → Shows "Photography Coach Analysis"
   - `xmp:CreatorTool` → Shows "Photography Coach v2 (Gemma 4 E4B)"
3. Save preset as "Photography Coach Critique"
4. Apply to photos to view full metadata

---

## Known Limitations

### What's Included in XMP

✅ **Star rating** (1-5 scale)
✅ **Color label** (Red/Yellow/Green)
✅ **IPTC keywords** (top 5 observations)
✅ **Description** (overall critique + score breakdown)
✅ **Creator tool** (Photography Coach v2)

### What's NOT Included

❌ **Bounding box coordinates** (XMP doesn't support spatial annotations)
❌ **Detailed score breakdown** (only average → star rating)
❌ **Strengths/Improvements lists** (could be added as custom fields)
❌ **Learning path recommendations** (text format only)

**Workaround:** Export full JSON analysis separately for archival/reference.

---

## Future Enhancements

**Planned features** (Phase 2 or post-hackathon):

- **Batch XMP export** (one-click export for 50+ photos)
- **Custom XMP namespace** (`photoshop:Instructions` field for strengths/improvements)
- **Collection sets** (auto-create Lightroom collections based on critique categories)
- **Smart Collections** (dynamic filters: "All 5-star shots", "Critical lighting issues", etc.)
- **LR Plugin** (direct integration without manual XMP export)

---

## Comparison: XMP vs Direct LR Plugin

| Feature | XMP Sidecar (Current) | Future LR Plugin |
|---------|----------------------|------------------|
| **Setup** | Manual export + import | Automatic sync |
| **Batch support** | Manual per-photo | Batch operations |
| **Real-time** | ❌ Export/import lag | ✅ Live updates |
| **Portability** | ✅ Works across DAMs | ⚠️ Lightroom-only |
| **Complexity** | Low (standard XMP) | Medium (plugin API) |
| **Status** | ✅ **Available Now** | 📅 Planned |

---

## Support & Feedback

**Issues with XMP export:**
- Check `services/xmpService.ts` for mapping logic
- Run tests: `npm test -- xmpService.test.ts`
- Report bugs: [GitHub Issues](https://github.com/prasadt1/photography-coach-gemma4/issues)

**Documentation:**
- XMP Specification: [Adobe XMP Docs](https://www.adobe.com/devnet/xmp.html)
- Lightroom Metadata: [Adobe Help Center](https://helpx.adobe.com/lightroom-classic/help/metadata-basics-actions.html)

---

**Happy editing! 📸**
