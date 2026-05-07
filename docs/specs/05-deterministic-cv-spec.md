# 05. Deterministic CV Spec

**Version:** 1.0
**Status:** Draft
**Dependencies:** 02-output-schema.md, 04-prompt-and-rationale-spec.md
**Owner:** Spec Session Lead

---

## 1. Overview

This spec defines the **deterministic computer vision (CV) layer** that provides grounding data for Gemma 4 E4B's analysis. The CV layer:

1. **Extracts EXIF metadata** from uploaded images (camera settings, lens info, timestamp)
2. **Analyzes image characteristics** via non-ML algorithms (histogram, focus map, edge detection, color distribution)
3. **Generates spatial annotations** (bounding boxes) as fallback if Gemma doesn't produce reliable boxes
4. **Provides evidence data** for LLM prompting and UI visualization

**Core Principle:** CV layer uses **deterministic, interpretable algorithms** (no ML inference). This ensures:
- **Transparency** - Users/developers can understand how grounding data is computed
- **Speed** - No model loading or GPU inference required
- **Privacy** - All processing happens locally (critical for Vault Mode)
- **Reliability** - Deterministic outputs for identical inputs

**Architecture Position:** CV layer runs **before** sending image to Gemma 4 E4B:

```
User uploads image
  → CV layer extracts EXIF + analyzes pixels
  → CV results injected into Gemma prompt (as context)
  → Gemma produces PhotoAnalysisV2 (references CV data in evidence)
  → UI displays analysis + CV visualizations (overlays, histograms)
```

---

## 2. EXIF Metadata Extraction

### 2.1. Purpose

Extract camera settings and metadata embedded in image files to:

1. **Ground technical claims** - LLM references aperture/ISO/shutter speed from EXIF (not guesses)
2. **Improve coaching** - Suggest setting adjustments based on actual capture parameters
3. **Validate estimates** - Compare LLM's settingsEstimate against EXIF ground truth

### 2.2. Target EXIF Fields

**Priority 1 (Required for core coaching):**
- `FocalLength` - Lens focal length in mm (e.g., "35mm")
- `FNumber` (Aperture) - f-stop value (e.g., "f/1.8")
- `ExposureTime` (Shutter Speed) - Exposure duration (e.g., "1/125")
- `ISO` - ISO sensitivity value (e.g., "400")

**Priority 2 (Enhances context):**
- `Make` / `Model` - Camera manufacturer and model (e.g., "Canon EOS R5")
- `LensModel` - Lens name (e.g., "RF 35mm f/1.8 IS STM")
- `DateTimeOriginal` - Capture timestamp (e.g., "2026-05-06T14:23:15Z")
- `Flash` - Flash fired/not fired (e.g., "Flash did not fire")

**Priority 3 (Advanced users):**
- `ExposureMode` - Auto/Manual/Aperture Priority/Shutter Priority
- `MeteringMode` - Evaluative/Spot/Center-weighted
- `WhiteBalance` - Auto/Daylight/Cloudy/Tungsten/etc.
- `ColorSpace` - sRGB/Adobe RGB/ProPhoto RGB

### 2.3. Extraction Library

**Recommended:** `exif-js` (browser-compatible) or `exiftool-vendored` (Node.js, more comprehensive).

**For browser (client-side extraction):**
```typescript
import EXIF from 'exif-js';

function extractEXIF(imageFile: File): Promise<EXIFData> {
  return new Promise((resolve, reject) => {
    EXIF.getData(imageFile, function(this: any) {
      const exif = {
        focalLength: EXIF.getTag(this, 'FocalLength'),
        aperture: EXIF.getTag(this, 'FNumber'),
        shutterSpeed: EXIF.getTag(this, 'ExposureTime'),
        iso: EXIF.getTag(this, 'ISOSpeedRatings'),
        camera: `${EXIF.getTag(this, 'Make')} ${EXIF.getTag(this, 'Model')}`,
        lens: EXIF.getTag(this, 'LensModel'),
        timestamp: EXIF.getTag(this, 'DateTimeOriginal'),
        flash: EXIF.getTag(this, 'Flash')
      };
      resolve(exif);
    });
  });
}
```

**Interface:**
```typescript
interface EXIFData {
  focalLength?: string;      // e.g., "35mm"
  aperture?: string;         // e.g., "f/1.8"
  shutterSpeed?: string;     // e.g., "1/125"
  iso?: string;              // e.g., "400"
  camera?: string;           // e.g., "Canon EOS R5"
  lens?: string;             // e.g., "RF 35mm f/1.8 IS STM"
  timestamp?: string;        // ISO 8601 format
  flash?: string;            // e.g., "Flash did not fire"
  exposureMode?: string;     // e.g., "Manual"
  meteringMode?: string;     // e.g., "Evaluative"
  whiteBalance?: string;     // e.g., "Auto"
  colorSpace?: string;       // e.g., "sRGB"
}
```

### 2.4. Missing EXIF Handling

**Many images lack EXIF** (screenshots, edited photos, social media downloads, scanned film).

**Fallback strategy:**
1. Mark missing fields as `null` or `"unknown"` in EXIFData
2. Inject into Gemma prompt: `"EXIF Metadata: Not available (estimate settings from visual analysis)"`
3. LLM infers settings from visual cues:
   - Depth of field → aperture (shallow DoF = wide aperture like f/1.8)
   - Motion blur → shutter speed (blur = slow shutter)
   - Grain/noise → ISO (visible grain = high ISO)
   - Perspective distortion → focal length (wide = 14-24mm, tele = 70-200mm)

**UI indication:**
- EXIF-backed values: Display normally (e.g., "Aperture: f/1.8")
- Estimated values: Add qualifier (e.g., "Aperture: ~f/1.8 (estimated)")

---

## 3. Image Analysis Algorithms

### 3.1. Histogram Analysis

#### Purpose

Analyze pixel distribution to detect:
- **Exposure issues** - Clipping (blown highlights/crushed shadows)
- **Contrast** - Dynamic range utilization
- **Color balance** - Color cast detection

#### Algorithm

**RGB Histogram:**
1. Load image as ImageData (HTML5 Canvas API or Node.js canvas library)
2. Create 3 arrays (R, G, B) with 256 bins each (0-255)
3. Iterate through pixels, increment bin counts
4. Normalize by total pixel count

**Luminance Histogram:**
1. Convert RGB to luminance: `L = 0.299*R + 0.587*G + 0.114*B`
2. Create 256-bin histogram for L values
3. Calculate percentiles (P1, P50, P99)

**Clipping Detection:**
- **Blown highlights:** If >2% of pixels have L ≥ 254 → highlights clipped
- **Crushed shadows:** If >2% of pixels have L ≤ 1 → shadows clipped

**Contrast Metric:**
- **Dynamic range:** `P99 - P1` (ideal: >200 for high contrast, <100 for low contrast)

**Color Cast Detection:**
- Compare R/G/B histogram peaks
- If R peak >> G/B peaks → warm color cast
- If B peak >> R/G peaks → cool color cast

#### Output

```typescript
interface HistogramAnalysis {
  luminance: {
    histogram: number[];        // 256 bins
    p1: number;                 // 1st percentile
    p50: number;                // Median
    p99: number;                // 99th percentile
    dynamicRange: number;       // P99 - P1
  };
  clipping: {
    highlights: boolean;        // True if >2% pixels at 254-255
    shadows: boolean;           // True if >2% pixels at 0-1
    highlightPercent: number;   // % of clipped highlight pixels
    shadowPercent: number;      // % of clipped shadow pixels
  };
  colorCast: {
    detected: boolean;
    direction: 'warm' | 'cool' | 'neutral';
    intensity: 'low' | 'medium' | 'high';
  };
}
```

#### Implementation

```typescript
function analyzeHistogram(imageData: ImageData): HistogramAnalysis {
  const { data, width, height } = imageData;
  const totalPixels = width * height;
  const luminanceHist = new Array(256).fill(0);

  // Build luminance histogram
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const L = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    luminanceHist[L]++;
  }

  // Calculate percentiles
  let cumulative = 0;
  let p1 = 0, p50 = 0, p99 = 0;
  for (let i = 0; i < 256; i++) {
    cumulative += luminanceHist[i];
    const percentile = cumulative / totalPixels;
    if (percentile >= 0.01 && p1 === 0) p1 = i;
    if (percentile >= 0.50 && p50 === 0) p50 = i;
    if (percentile >= 0.99 && p99 === 0) p99 = i;
  }

  // Detect clipping
  const highlightClipped = luminanceHist[254] + luminanceHist[255];
  const shadowClipped = luminanceHist[0] + luminanceHist[1];
  const highlightPercent = (highlightClipped / totalPixels) * 100;
  const shadowPercent = (shadowClipped / totalPixels) * 100;

  return {
    luminance: {
      histogram: luminanceHist,
      p1,
      p50,
      p99,
      dynamicRange: p99 - p1
    },
    clipping: {
      highlights: highlightPercent > 2,
      shadows: shadowPercent > 2,
      highlightPercent,
      shadowPercent
    },
    colorCast: detectColorCast(imageData) // Helper function
  };
}
```

### 3.2. Focus Map (Sharpness Detection)

#### Purpose

Identify in-focus vs out-of-focus regions to:
- **Validate subject sharpness** - Confirm main subject is sharp
- **Detect focus errors** - Missed focus, front/back focus
- **Support depth-of-field analysis** - Map bokeh regions

#### Algorithm

**Laplacian Variance Method:**
1. Divide image into grid (e.g., 10×10 cells = 100 regions)
2. For each cell:
   - Convert to grayscale
   - Apply Laplacian filter (edge detection)
   - Calculate variance of Laplacian response
   - Higher variance = sharper edges = in focus
3. Normalize variance scores to 0-100 scale
4. Classify cells: sharp (>70), medium (40-70), blurred (<40)

**Grid Output:**
```typescript
interface FocusMap {
  gridSize: { rows: number; cols: number };  // e.g., {rows: 10, cols: 10}
  cells: FocusCell[];                        // 100 cells for 10×10 grid
  peakRegion: { row: number; col: number };  // Cell with highest sharpness
  averageSharpness: number;                  // Global average (0-100)
}

interface FocusCell {
  row: number;
  col: number;
  sharpness: number;                         // 0-100 scale
  classification: 'sharp' | 'medium' | 'blurred';
}
```

#### Implementation

```typescript
function generateFocusMap(imageData: ImageData, gridSize = 10): FocusMap {
  const { width, height } = imageData;
  const cellWidth = Math.floor(width / gridSize);
  const cellHeight = Math.floor(height / gridSize);
  const cells: FocusCell[] = [];

  let maxSharpness = 0;
  let peakRegion = { row: 0, col: 0 };

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const x = col * cellWidth;
      const y = row * cellHeight;
      const cellData = extractCell(imageData, x, y, cellWidth, cellHeight);
      const sharpness = calculateLaplacianVariance(cellData);

      if (sharpness > maxSharpness) {
        maxSharpness = sharpness;
        peakRegion = { row, col };
      }

      cells.push({
        row,
        col,
        sharpness,
        classification: sharpness > 70 ? 'sharp' : sharpness > 40 ? 'medium' : 'blurred'
      });
    }
  }

  const averageSharpness = cells.reduce((sum, c) => sum + c.sharpness, 0) / cells.length;

  return {
    gridSize: { rows: gridSize, cols: gridSize },
    cells,
    peakRegion,
    averageSharpness
  };
}

function calculateLaplacianVariance(cellData: ImageData): number {
  // Apply Laplacian kernel: [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
  // Calculate variance of response
  // Normalize to 0-100 scale
  // Implementation details omitted for brevity
  return 0; // Placeholder
}
```

### 3.3. Edge Density Map

#### Purpose

Detect compositional features:
- **Leading lines** - High edge density in diagonal/curved patterns
- **Clutter** - Excessive edges indicating busy composition
- **Negative space** - Low edge density regions

#### Algorithm

**Sobel Edge Detection:**
1. Convert image to grayscale
2. Apply Sobel filters (horizontal Gx, vertical Gy)
3. Calculate gradient magnitude: `sqrt(Gx² + Gy²)`
4. Threshold to binary edge map (magnitude > threshold)
5. Divide into 3×3 grid (9 regions)
6. Calculate edge density per region (% of edge pixels)

**Output:**
```typescript
interface EdgeDensityMap {
  gridSize: { rows: 3; cols: 3 };
  regions: EdgeRegion[];                     // 9 regions for 3×3 grid
  globalDensity: number;                     // % of edge pixels in entire image
}

interface EdgeRegion {
  row: number;
  col: number;
  density: number;                           // 0-100 (% of edge pixels in region)
  classification: 'cluttered' | 'moderate' | 'sparse';
}
```

#### Implementation

```typescript
function generateEdgeDensityMap(imageData: ImageData): EdgeDensityMap {
  const edgeMap = applySobelFilter(imageData);
  const { width, height } = imageData;
  const cellWidth = Math.floor(width / 3);
  const cellHeight = Math.floor(height / 3);
  const regions: EdgeRegion[] = [];

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = col * cellWidth;
      const y = row * cellHeight;
      const density = calculateRegionDensity(edgeMap, x, y, cellWidth, cellHeight);

      regions.push({
        row,
        col,
        density,
        classification: density > 30 ? 'cluttered' : density > 10 ? 'moderate' : 'sparse'
      });
    }
  }

  const globalDensity = calculateGlobalDensity(edgeMap);

  return { gridSize: { rows: 3, cols: 3 }, regions, globalDensity };
}
```

### 3.4. Color Distribution

#### Purpose

Analyze color usage for:
- **Dominant colors** - Identify primary/secondary colors
- **Color harmony** - Detect complementary/analogous palettes
- **Color temperature** - Overall warm/cool bias

#### Algorithm

**K-Means Clustering (K=5):**
1. Sample 10,000 random pixels from image (performance optimization)
2. Convert RGB to LAB color space (perceptually uniform)
3. Run k-means clustering with k=5 (5 dominant colors)
4. Calculate each cluster's:
   - Centroid (average LAB values)
   - Size (% of pixels in cluster)
   - RGB representation (convert LAB → RGB)

**Output:**
```typescript
interface ColorDistribution {
  dominantColors: DominantColor[];           // 5 colors, sorted by size descending
  temperature: 'warm' | 'cool' | 'neutral';
  harmony: 'complementary' | 'analogous' | 'monochromatic' | 'mixed';
}

interface DominantColor {
  rgb: { r: number; g: number; b: number };
  hex: string;                               // e.g., "#3498db"
  percentage: number;                        // % of image pixels in this cluster
  name?: string;                             // Optional: "Sky Blue", "Forest Green", etc.
}
```

#### Implementation

```typescript
function analyzeColorDistribution(imageData: ImageData): ColorDistribution {
  const samples = samplePixels(imageData, 10000);
  const clusters = kMeansClustering(samples, 5);

  const dominantColors = clusters
    .map(cluster => ({
      rgb: cluster.centroid,
      hex: rgbToHex(cluster.centroid),
      percentage: cluster.size,
      name: getColorName(cluster.centroid) // Optional: map RGB to color name
    }))
    .sort((a, b) => b.percentage - a.percentage);

  const temperature = detectTemperature(dominantColors);
  const harmony = detectHarmony(dominantColors);

  return { dominantColors, temperature, harmony };
}
```

---

## 4. Bounding Box Generation (Fallback)

### 4.1. Purpose

**Spike 1 Sub-Question:** Can Gemma 4 E4B produce reliable bounding boxes for composition issues?

**If YES:** Use Gemma's bounding boxes (LLM understands spatial context better).

**If NO:** CV layer generates bounding boxes as fallback, using:
- Focus map (sharp regions likely contain subjects)
- Edge density (high edge regions likely contain subjects)
- Saliency detection (optional: simple center-bias heuristic)

### 4.2. Fallback Algorithm

**Heuristic-Based Subject Detection:**

1. **Center-weighted saliency:**
   - Assume subject is near image center (common composition pattern)
   - Weight focus map and edge density by distance from center
   - `saliency(x, y) = 0.5 * focus(x, y) + 0.3 * edges(x, y) + 0.2 * centerBias(x, y)`

2. **Threshold and cluster:**
   - Threshold saliency map (top 20% of pixels)
   - Find connected components (regions)
   - Fit bounding boxes around top 3-5 regions

3. **Filter and rank:**
   - Discard tiny boxes (area < 5% of image)
   - Discard edge-hugging boxes (likely false positives)
   - Rank by saliency score

**Output:**
```typescript
interface BoundingBox {
  x: number;               // Top-left X (0-1 normalized)
  y: number;               // Top-left Y (0-1 normalized)
  width: number;           // Width (0-1 normalized)
  height: number;          // Height (0-1 normalized)
  label: string;           // e.g., "Potential subject region"
  confidence: number;      // 0-1 (low confidence for CV-generated boxes)
  source: 'cv' | 'llm';    // 'cv' for fallback, 'llm' for Gemma-generated
}
```

### 4.3. Decision Point (Post-Spike 1)

**After Spike 1 validation on 5 photos:**

**Scenario A: Gemma produces good bounding boxes**
- Use Gemma's boxes (mark `source: 'llm'`)
- CV layer skips bounding box generation
- `boundingBoxes` array populated by Gemma

**Scenario B: Gemma produces unreliable/no bounding boxes**
- Use CV fallback boxes (mark `source: 'cv'`)
- Display boxes with disclaimer: "Auto-detected regions (may be inaccurate)"
- Consider making bounding boxes fully optional per 03-runtime-decisions-and-spikes.md Option B (scope reduction)

**Scenario C: Hybrid approach**
- Gemma produces boxes when confident
- CV fills in gaps when Gemma omits boxes
- Both sources coexist in `boundingBoxes` array (distinguished by `source` field)

---

## 5. CV Data Integration

### 5.1. Injecting into Gemma Prompt

**CV results summarized as text** and injected into user prompt (see 04-prompt-and-rationale-spec.md section 5.1):

```
**EXIF Metadata:**
{exif_json}

**Image Analysis (Deterministic CV):**
- Histogram: Highlights clipped (8% blown), shadows ok, dynamic range 187
- Focus: Peak sharpness at center region, average sharpness 73/100
- Edges: Moderate density (18% edge pixels), highest in top-right region
- Colors: Dominant colors are Sky Blue (32%), Forest Green (24%), Sandy Brown (18%)
- Color temperature: Cool (blue bias)

**Analysis Request:**
[...continues as defined in 04-prompt-and-rationale-spec.md...]
```

**Benefits:**
1. Gemma references quantitative data (e.g., "8% blown highlights" instead of guessing)
2. Evidence field can cite CV sources (e.g., `"source": "cv", "details": "Histogram shows 8% clipped highlights"`)
3. Reduces hallucination (grounded in deterministic measurements)

### 5.2. Storing CV Results

**CV data stored alongside PhotoAnalysisV2** for UI visualization:

```typescript
interface PhotoAnalysisWithCV extends PhotoAnalysisV2 {
  cvData?: {
    exif: EXIFData;
    histogram: HistogramAnalysis;
    focusMap: FocusMap;
    edgeDensity: EdgeDensityMap;
    colorDistribution: ColorDistribution;
  };
}
```

**Storage location:**
- In-memory during session (React state)
- Optional: persist to IndexedDB for session history (Vault Mode requires local storage)

### 5.3. UI Visualization

**CV data powers interactive UI elements:**

1. **Histogram Tab:**
   - Display luminance histogram chart (line graph, 256 bins)
   - Highlight clipped regions (red bars for highlights, blue for shadows)
   - Show P1/P50/P99 markers

2. **Focus Map Overlay:**
   - Render 10×10 grid over image
   - Color-code cells: green (sharp), yellow (medium), red (blurred)
   - Toggle on/off via checkbox

3. **Color Palette:**
   - Display 5 dominant color swatches (large circles)
   - Show percentage per color (e.g., "Sky Blue - 32%")
   - Click to highlight matching regions in image (optional advanced feature)

4. **EXIF Panel:**
   - Display camera settings as cards (aperture, shutter speed, ISO, focal length)
   - Mark estimated values with "~" prefix

**UI spec details deferred to 08-ui-adaptation-spec.md.**

---

## 6. Performance Considerations

### 6.1. Target Performance

**Processing time budget:**
- EXIF extraction: <50ms (library lookup, no computation)
- Histogram analysis: <100ms (single pass through pixels)
- Focus map: <200ms (grid-based, not full-resolution)
- Edge density: <150ms (Sobel filter + grid aggregation)
- Color distribution: <300ms (k-means on 10k samples, not all pixels)

**Total CV processing: <800ms** (well below Gemma inference time of 3-8 seconds)

### 6.2. Optimization Strategies

**For large images (>4K resolution):**

1. **Downsample before analysis:**
   - Resize to 1920×1080 for CV processing
   - Original resolution preserved for display
   - Minor accuracy loss acceptable (histogram/focus map still representative)

2. **Progressive loading:**
   - Extract EXIF immediately (display settings while CV runs)
   - Run histogram first (fastest, most impactful)
   - Focus map and edge density run in parallel (Web Workers)
   - Color distribution last (slowest, least critical)

3. **Skip optional features in Vault Mode:**
   - Edge density map (only needed for advanced spatial analysis)
   - Color distribution (only needed for UI palette display)
   - Focus map at lower resolution (5×5 instead of 10×10)

### 6.3. Browser Compatibility

**Dependencies:**
- HTML5 Canvas API (supported in all modern browsers)
- Web Workers (for parallel CV processing)
- Typed Arrays (Uint8ClampedArray for ImageData)

**Fallback for old browsers:**
- Graceful degradation: skip CV layer, rely on Gemma only
- Display warning: "Some features unavailable (browser too old)"

---

## 7. Privacy and Security (Vault Mode)

### 7.1. Local-Only Processing

**All CV processing happens locally:**
- EXIF extraction: Client-side JS library
- Image analysis: Canvas API in browser (no server calls)
- No image data leaves device

**Vault Mode enforcement:**
- Network egress blocked by architecture (see 06-architecture-spec.md)
- CV layer has no external dependencies (bundle all libraries)

### 7.2. EXIF Scrubbing (Optional Feature)

**For privacy-conscious users:**

Option to **strip EXIF before storage** (remove GPS, timestamp, camera serial number):
- Keep coaching-relevant fields (aperture, ISO, focal length)
- Remove privacy-sensitive fields (GPS, timestamp, camera serial number)
- Offer as checkbox: "Remove location and timestamp from saved data"

**Implementation:**
```typescript
function scrubSensitiveEXIF(exif: EXIFData): EXIFData {
  return {
    focalLength: exif.focalLength,
    aperture: exif.aperture,
    shutterSpeed: exif.shutterSpeed,
    iso: exif.iso,
    lens: exif.lens,
    // Omit: camera, timestamp, GPS, serial number
  };
}
```

---

## 8. Testing and Validation

### 8.1. Unit Tests

**Test each CV algorithm independently:**

1. **Histogram:**
   - Input: Synthetic gradient image (black → white)
   - Expected: Uniform distribution across 256 bins
   - Input: All-white image
   - Expected: All pixels in bin 255, clipping detected

2. **Focus map:**
   - Input: Synthetic sharp/blurred regions (Gaussian blur varying by region)
   - Expected: Sharp regions score >70, blurred <40

3. **Edge density:**
   - Input: Checkerboard pattern (high edge density)
   - Expected: Global density >50%
   - Input: Solid color image (no edges)
   - Expected: Global density <1%

4. **Color distribution:**
   - Input: 5-color synthetic image (equal regions)
   - Expected: 5 clusters with ~20% each

### 8.2. Integration Tests

**Test CV → Gemma → UI pipeline:**

1. Upload photo with EXIF
   - Verify EXIF extracted correctly (compare against exiftool CLI)
   - Verify EXIF injected into Gemma prompt
   - Verify Gemma references EXIF in evidence (e.g., `"source": "exif"`)

2. Upload photo without EXIF
   - Verify Gemma estimates settings (settingsEstimate field)
   - Verify UI marks estimates with "~" prefix

3. Upload high-contrast photo
   - Verify histogram detects clipping
   - Verify Gemma references clipping in critique (e.g., "Sky highlights blown per histogram analysis")

### 8.3. Edge Cases

**Test robustness:**

1. **Corrupted EXIF:** Some cameras write malformed EXIF tags
   - Expected: Library returns null for malformed fields, CV continues
2. **Extreme resolutions:** 12MP+ images, <VGA images
   - Expected: Downsample to 1920×1080, processing time <800ms
3. **Unusual aspect ratios:** 1:3 panoramas, 3:1 horizontal slices
   - Expected: Grid-based algorithms adapt (cells become rectangular)
4. **Monochrome images:** Black and white photos
   - Expected: Color distribution returns grayscale palette

---

## 9. Open Questions (Resolve During Spike 1)

### 9.1. Bounding Box Strategy

**Question:** Does Gemma 4 E4B produce reliable bounding boxes?

**Test during Spike 1:**
- Include 2-3 photos with clear subjects (portrait, single-subject landscape)
- Check if Gemma's boundingBoxes array contains accurate boxes
- Compare against human judgment (are boxes reasonable?)

**Decision:**
- **If reliable** → use Gemma boxes, skip CV fallback
- **If unreliable** → use CV fallback (heuristic-based subject detection)
- **If missing** → make boundingBoxes fully optional (per Option B scope reduction)

### 9.2. CV Data Volume

**Question:** Does injecting full CV summary into prompt increase token count excessively?

**Test:**
- Measure prompt token count with/without CV summary
- If CV adds >200 tokens → consider abbreviating (e.g., histogram summary instead of 256 bins)

**Impact on token budget:**
- Target: Keep total input <3000 tokens (per 04-prompt-and-rationale-spec.md section 6.1)
- CV summary should be <200 tokens

### 9.3. Client-Side vs Server-Side Processing

**Question:** Should CV processing run client-side (browser) or server-side (Node.js)?

**Trade-offs:**

**Client-side (browser):**
- ✅ Privacy (no image upload for CV)
- ✅ Vault Mode compatible (local processing)
- ❌ Performance varies by device (slow on old phones)
- ❌ Blocks UI thread (unless Web Workers used)

**Server-side (Node.js):**
- ✅ Consistent performance (controlled environment)
- ✅ Can use native libraries (faster)
- ❌ Requires image upload (breaks Vault Mode privacy)
- ❌ Adds latency (network round-trip)

**Recommendation:** **Client-side for MVP** (privacy-first, Vault Mode compatible). Server-side as optional optimization for Studio Mode if client-side proves too slow.

---

## 10. Dependencies and Blockers

### 10.1. Blocking Dependencies

**This spec (05) blocks:**
- **06-architecture-spec.md** - needs CV layer design to define data flow
- **08-ui-adaptation-spec.md** - needs CV output formats for visualization components

**This spec (05) is blocked by:**
- **Spike 1 (Gemma via Ollama)** - MUST resolve:
  - Bounding box reliability (use Gemma or CV fallback?)
  - Token budget impact (does CV summary fit within 3000 token input limit?)

### 10.2. Deferred to Post-MVP

**Advanced CV features (not required for hackathon):**
1. **Saliency detection** - ML-based subject detection (requires model inference, breaks deterministic constraint)
2. **Face detection** - For portrait-specific coaching (privacy concerns, requires ML)
3. **Scene classification** - Landscape/portrait/street/macro (requires ML)
4. **Aesthetic scoring** - Predict user preference (requires trained model)

These are **out of scope for v2 MVP** (Gemma 4 E4B handles semantic analysis). CV layer stays deterministic and interpretable.

---

## 11. Success Criteria

**This CV spec succeeds if:**

1. ✅ EXIF extraction works for 90%+ of photos with embedded metadata
2. ✅ Histogram analysis detects clipping accurately (validated against human judgment on 20 test photos)
3. ✅ Focus map correlates with perceived sharpness (Spearman correlation >0.7 on 20 test photos)
4. ✅ CV processing completes in <800ms on typical hardware (M1 MacBook, Pixel 6 phone)
5. ✅ Gemma references CV data in evidence field (4+ evidence items per photo, mix of EXIF/visual/CV sources)
6. ✅ All processing stays local (Vault Mode compatible, no network calls)

---

## 12. Summary

This spec defines the **deterministic computer vision layer** that provides grounding data for Gemma 4 E4B's photography coaching. Key components:

1. **EXIF extraction** - Camera settings (aperture, ISO, shutter speed, focal length) via `exif-js`
2. **Histogram analysis** - Exposure clipping detection, dynamic range measurement
3. **Focus map** - Sharpness distribution via Laplacian variance on 10×10 grid
4. **Edge density** - Compositional clutter detection via Sobel edge detection
5. **Color distribution** - Dominant colors via k-means clustering (k=5)
6. **Bounding boxes (fallback)** - Heuristic-based subject detection if Gemma unreliable

**CV data flows:**
- Summarized as text → injected into Gemma prompt (grounding context)
- Stored alongside PhotoAnalysisV2 → powers UI visualizations (histogram, focus overlay, color palette)

**Next steps:**
1. Resolve bounding box strategy during Spike 1 (use Gemma or CV fallback?)
2. Implement CV layer in `src/services/cvService.ts` (client-side processing)
3. Proceed to **06-architecture-spec.md** to define data flow and component integration

---

**End of 05-deterministic-cv-spec.md**
