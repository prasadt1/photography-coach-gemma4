# iOS PWA Setup Guide

**Photography Coach v2 on iPhone/iPad**

---

## Quick Start (3 steps)

### 1. Start Ollama on Your Computer

On your **Mac or PC**, ensure Ollama is running and accessible on your local network:

```bash
# macOS/Linux: Allow network access
OLLAMA_HOST=0.0.0.0:11434 ollama serve

# Or set environment variable permanently:
export OLLAMA_HOST=0.0.0.0:11434
ollama serve
```

**Windows (PowerShell):**
```powershell
$env:OLLAMA_HOST="0.0.0.0:11434"
ollama serve
```

**Verify model is installed:**
```bash
ollama pull gemma4:e4b
```

---

### 2. Find Your Computer's IP Address

**macOS:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
# Look for line like: inet 192.168.1.100 netmask...
```

**Windows:**
```powershell
ipconfig
# Look for "IPv4 Address" under your active network adapter
```

**Linux:**
```bash
ip addr show | grep "inet "
```

Your local IP will look like: `192.168.1.100` or `10.0.0.50`

---

### 3. Open Photography Coach on iPhone

1. **Connect iPhone to Same WiFi** as your computer
2. **Open Safari** on iPhone
3. **Navigate to:** `https://your-deployed-app-url.vercel.app`
   (Or `http://<YOUR_COMPUTER_IP>:5173` if running dev server locally)
4. **Tap Share button** (⬆️ icon)
5. **Select "Add to Home Screen"**
6. **Name it** "Photography Coach" → **Add**
7. **Open the app** from your home screen (runs full-screen, no Safari chrome)

---

## Network Configuration

### Option A: Local Development Server

If running `npm run dev` on your computer:

```bash
# Start Vite with network access
npm run dev -- --host
```

iPhone can access via: `http://192.168.1.100:5173` (replace with your IP)

### Option B: Deployed Web App (Recommended)

Deploy to Vercel/Netlify (see main README), then:
- iPhone accesses `https://photography-coach.vercel.app`
- Ollama runs on Mac/PC at `http://192.168.1.100:11434`
- App auto-detects Ollama on local network

### Configuring Ollama Server URL (if not localhost)

If the app can't find Ollama automatically, you may need to update the config:

**Edit `config.ts` before deploying:**
```typescript
export const OLLAMA_CONFIG = {
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  // For iOS PWA, set to your computer's IP:
  // baseUrl: 'http://192.168.1.100:11434',
  ...
};
```

Or pass as environment variable when deploying:
```bash
OLLAMA_BASE_URL=http://192.168.1.100:11434 npm run build
```

---

## Using the App

1. **Tap the camera icon** or drag-and-drop a photo
2. **Select photo** from:
   - Camera Roll (Photos app)
   - Take new photo (Camera)
   - Files app
3. **Wait for analysis** (~20-40 seconds)
4. **View results:**
   - 5-axis scores (composition, lighting, technique, creativity, subject impact)
   - Detailed critique with spatial bounding boxes
   - Strengths, improvements, learning path
   - Mentor chat for follow-up questions

---

## Troubleshooting

### "Ollama not found" or "Connection refused"

**Check:**
1. ✅ Ollama is running on your computer (`ollama list` should show gemma4:e4b)
2. ✅ iPhone is on the **same WiFi network** as computer
3. ✅ Firewall allows port 11434:
   ```bash
   # macOS: System Settings → Network → Firewall → Options
   # Allow incoming connections for ollama

   # Linux:
   sudo ufw allow 11434/tcp

   # Windows: Windows Defender Firewall → Advanced Settings → Inbound Rules
   # New Rule → Port → TCP 11434 → Allow
   ```
4. ✅ Ollama is bound to `0.0.0.0`, not just `127.0.0.1`
   ```bash
   # Verify with:
   lsof -i :11434
   # Should show: *:11434 (LISTEN)
   # NOT: localhost:11434 (LISTEN)
   ```

### Slow Analysis (>60 seconds)

- **Normal:** First request is slow (model loading), subsequent requests ~20-30s
- **Solution:** Run `ollama run gemma4:e4b "test"` on computer to warm up model before using app

### Photos Not Uploading

- **iOS Safari blocks camera** in regular browser mode
- **Solution:** Install as PWA (Add to Home Screen) for full camera access

### No Results Displayed

- **Check Safari Console:** Open on Mac → Safari → Develop → [Your iPhone] → [Photography Coach]
- **Look for:** CORS errors, network errors, or JSON parsing errors
- **Common fix:** Ensure OLLAMA_ORIGINS is set:
  ```bash
  export OLLAMA_ORIGINS="*"
  ollama serve
  ```

---

## Offline Mode

**Limitation:** iOS PWA requires network access to Ollama server (Mac/PC).

**Workaround for remote shoots:**
- Set up Ollama on a portable Mac/PC at the shoot location
- iPhone connects to Mac's WiFi hotspot
- Both devices on same local network (no internet required)

**True offline:** Only available via native iOS app (LiteRT - not currently available, see docs/spikes/spike-3-litert-ios.md)

---

## Performance Tips

### Reduce Latency

1. **Use WiFi 5/6** (faster than WiFi 4)
2. **Position iPhone close to router** for strong signal
3. **Warm up model** before shooting:
   ```bash
   ollama run gemma4:e4b "Ready"
   ```
4. **Close background apps** on iPhone for more memory

### Battery Saving

- **Inference runs on Mac/PC** (not iPhone) → battery drain is minimal
- iPhone only handles UI + network → ~1-2% per photo

---

## Security & Privacy

### Data Flow

```
iPhone Photo → WiFi (local network) → Mac/PC Ollama → Analysis → WiFi → iPhone Results
```

**NO DATA LEAVES LOCAL NETWORK**
- No cloud API calls
- No internet connection required (once app is installed)
- Photo data never uploaded to external servers

### Vault Mode on iOS

⚠️ **Not Recommended** — iOS PWA cannot cryptographically enforce network isolation.

**For confidential work:** Use Desktop Electron app (Vault Mode) instead.

**Why:** iOS restricts network-level controls; PWA cannot guarantee zero egress like Electron can.

---

## Comparison: PWA vs Native iOS

| Feature | iOS PWA (Current) | Native iOS (Future) |
|---------|------------------|---------------------|
| **Installation** | Add to Home Screen (instant) | App Store download |
| **Offline** | ❌ Requires WiFi to Ollama | ✅ True offline (on-device model) |
| **Setup** | Ollama on Mac/PC required | Model bundled in app |
| **Performance** | 20-30s (network + inference) | 15-25s (on-device only) |
| **Storage** | ~2MB app cache | ~4GB (includes model) |
| **Battery** | Very low (network + UI) | Moderate (on-device inference) |
| **Vault Mode** | ⚠️ Not recommended | ⚠️ Not recommended (iOS restriction) |
| **Status** | ✅ **Available Now** | 📅 Phase 2 (pending LiteRT iOS prebuilts) |

---

## Next Steps

- **Deploy web app:** See [DEPLOYMENT.md](../DEPLOYMENT.md)
- **Desktop app:** See [README.md](../README.md) for Electron build instructions
- **Native iOS:** Track progress in [spike-3-litert-ios.md](./spikes/spike-3-litert-ios.md)

---

**Questions? Issues?**
- GitHub: [photography-coach-gemma4](https://github.com/prasadt1/photography-coach-gemma4)
- Troubleshooting: [TROUBLESHOOTING.md](../TROUBLESHOOTING.md)
