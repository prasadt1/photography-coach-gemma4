# Quick Test Checklist

**Print this and check off as you test**

---

## iOS PWA Test (15 min)

### Setup
```bash
# Terminal 1: Start Ollama
export OLLAMA_HOST=0.0.0.0:11434
export OLLAMA_ORIGINS="*"
ollama serve

# Terminal 2: Start dev server
npm run dev -- --host
# Note the Network URL (e.g., http://192.168.1.100:5173)
```

### On iPhone
- [ ] Open Safari, go to `http://YOUR_MAC_IP:5173`
- [ ] Upload/take a photo
- [ ] Wait ~30s for analysis
- [ ] See 5-axis radar chart
- [ ] See critique text
- [ ] Test Mentor Chat (ask a question)
- [ ] Add to Home Screen
- [ ] Open as PWA (full-screen)
- [ ] Test again in PWA mode

**Pass?** ⬜ YES ⬜ NO (see troubleshooting in TESTING_GUIDE.md)

---

## Lightroom XMP Test (20 min)

### Prepare
```bash
# Create test folder
mkdir -p ~/Desktop/PhotoCoach_XMP_Test

# Copy 3 photos (good/moderate/poor quality)
```

### For Each Photo
- [ ] Upload to Photography Coach
- [ ] Wait for analysis
- [ ] Statistics tab → "Export XMP for Lightroom"
- [ ] Save to test folder (same directory as photo)

### Lightroom Classic
- [ ] File → Import → Select test folder
- [ ] All 3 photos import
- [ ] Grid View: See star ratings under thumbnails
- [ ] Grid View: See color labels (dots)
- [ ] Select photo → Metadata panel shows Rating + Label
- [ ] Keywording panel shows 5 keywords
- [ ] Filter Bar → "3 stars and up" works
- [ ] Filter Bar → Red label filter works

**Pass?** ⬜ YES ⬜ NO (see troubleshooting in TESTING_GUIDE.md)

---

## Quick Debug Commands

```bash
# Check Ollama
curl http://localhost:11434/api/tags

# Find Mac IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Validate XMP
xmllint --noout ~/Desktop/PhotoCoach_XMP_Test/*.xmp

# View XMP ratings
grep "xmp:Rating" ~/Desktop/PhotoCoach_XMP_Test/*.xmp
```

---

## Expected Results

**iOS PWA:**
- ✅ Analysis: ~20-40 seconds
- ✅ Scores: 0-10 per axis
- ✅ Bounding boxes: If issues found
- ✅ Mentor chat: ~5-10 seconds response

**Lightroom XMP:**
| Photo Quality | Expected Rating | Expected Label |
|---------------|-----------------|----------------|
| Excellent (8-10 avg) | ★★★★★ (5) | Green |
| Good (6-7 avg) | ★★★★☆ (4) | Yellow or Green |
| Moderate (4-5 avg) | ★★★☆☆ (3) | Yellow |
| Poor (2-3 avg) | ★★☆☆☆ (2) | Red or Yellow |
| Very Poor (0-1 avg) | ★☆☆☆☆ (1) | Red |

---

**Full guide:** `docs/TESTING_GUIDE.md`
