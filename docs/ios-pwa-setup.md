# iOS PWA Setup Guide

This guide explains how to run L.E.N.S. on an iPhone or iPad as an installable
PWA while Gemma 4 E4B runs on a nearby Mac or PC through Ollama.

The PWA is useful for capture: the phone provides the camera and touch
interface, while the computer runs the local model. True on-phone inference is a
future native-app path tracked in `docs/spikes/spike-3-litert-ios.md`.

## Which URL Should I Open?

- Real product / video path:
  `https://photography-coach-gemma4.vercel.app`
  - Use this when the phone should talk to local Gemma 4 E4B running on your
    own machine.
- Judge try-it path:
  `https://lens-app-gemma4.vercel.app`
  - Use this when reviewers need live uploads without local setup. Uploads use
    Ollama Cloud; samples are recorded local E4B runs.
- Local LAN demo:
  `https://<YOUR_COMPUTER_IP>:3000`
  - Use this while developing or recording on the same Wi-Fi network.

## Quick Start: Same Wi-Fi Local E4B

### 1. Pull and start Gemma 4 E4B

On the Mac or PC running Ollama:

```bash
ollama pull gemma4:e4b
OLLAMA_ORIGINS="*" OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

Warm the model before a demo:

```bash
ollama run gemma4:e4b "ready"
```

### 2. Start the HTTPS dev server

Safari requires HTTPS for camera access from a LAN IP.

```bash
npm run setup:https
npm run start:https
```

Open the Network URL printed by Vite, usually
`https://192.168.x.x:3000`. If port 3000 is busy, Vite may choose another port.

In development, the phone calls `/ollama` on the same HTTPS origin and Vite
proxies the request to `127.0.0.1:11434`. This avoids iOS mixed-content errors.

### 3. Install the PWA

1. Connect the iPhone to the same Wi-Fi network as the computer.
2. Open the L.E.N.S. URL in Safari.
3. Tap Share.
4. Choose Add to Home Screen.
5. Name it `L.E.N.S.` and tap Add.
6. Launch it from the home screen and grant camera permission.

## Demo Recording Path

For the guided demo flow, open the LAN URL with:

```text
?record=1
```

Example:

```text
https://192.168.x.x:3000/?record=1
```

The recording path uses tap controls plus voice coaching: welcome, Start, Take
Photo, Take another photo, Continue to listing, and Copy listing. It does not
depend on speech recognition.

## Off-LAN Local E4B

If the phone cannot be on the same Wi-Fi, expose the Mac's local Ollama port with
a temporary tunnel:

```bash
cloudflared tunnel --url http://127.0.0.1:11434
```

Use this only for demos where you understand the privacy trade-off. The most
private product path is still same-machine or same-LAN local Ollama.

## Network Checks

Find the computer's local IP:

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Verify Ollama on the computer:

```bash
curl http://localhost:11434/api/tags
ollama list | grep gemma
```

If the phone cannot connect:

- Confirm the phone and computer are on the same Wi-Fi.
- Confirm Ollama was started with `OLLAMA_HOST=0.0.0.0:11434`.
- Confirm `OLLAMA_ORIGINS="*"` is set for LAN browser requests.
- Confirm the macOS firewall allows incoming connections for Node/Vite and
  Ollama.
- Confirm the mkcert root certificate is installed and trusted on the phone.

## Using Artisan Studio

The core L.E.N.S. phone flow is Artisan Studio:

1. Enter Artisan Studio.
2. Take or upload a product photo.
3. Wait for Gemma 4 to describe the photo and choose one priority fix.
4. Reshoot or continue.
5. Copy the generated alt text and listing copy.

Every voice action should have a visible tap control. If audio does not start,
tap Start or Replay; browsers often require a user gesture before speech.

## Privacy Notes

In the local PWA path, the photo travels from iPhone to the computer running
Ollama, then the result returns to the phone over the local network.

```text
iPhone photo -> local Wi-Fi -> Mac/PC Ollama -> local Wi-Fi -> iPhone result
```

The iOS PWA cannot enforce the same network isolation as Electron Vault Mode.
For confidential work that needs a stronger guarantee, use the desktop Electron
build and Vault Mode.

## PWA vs Native iOS

- PWA today: install from Safari, uses the phone camera, requires a Mac/PC or
  hosted judge path for inference.
- Native iOS later: true on-device inference via LiteRT, with the model running
  on the phone. The feasibility spike is in
  `docs/spikes/spike-3-litert-ios.md`.

## Related Docs

- Architecture: `docs/architecture.md`
- Troubleshooting: `docs/troubleshooting.md`
- LiteRT iOS spike: `docs/spikes/spike-3-litert-ios.md`
- Desktop/Electron commands: `README.md`
