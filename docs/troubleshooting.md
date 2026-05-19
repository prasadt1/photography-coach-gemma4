# L.E.N.S. Troubleshooting

This guide covers the current Gemma 4/Ollama setup for L.E.N.S. It replaces the
old cloud-API troubleshooting flow from the earlier cloned project.

## Quick Checks

If analysis does not run, check these first:

```bash
ollama --version
ollama list | grep gemma
ollama pull gemma4:e4b
ollama serve
curl http://localhost:11434/api/tags
```

Then start the app:

```bash
npm install
npm start
```

Open the Vite URL shown in the terminal. The default is
`http://localhost:3000`, but Vite may use another port if 3000 is busy.

## Artisan Studio

Artisan Studio is the L.E.N.S. path for blind and low-vision makers. It can run
against local Gemma 4 E4B, recorded samples, or the judge-only Ollama Cloud
route.

### Local E4B does not respond

Check that Ollama is running and that the model name matches the app config:

```bash
ollama list
ollama pull gemma4:e4b
ollama run gemma4:e4b "ready"
```

If the app runs on a phone or another device, Ollama must listen on the local
network:

```bash
OLLAMA_ORIGINS="*" OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

For local desktop browser use, normal `ollama serve` is enough.

### First analysis is slow

The first request can include model load time. Warm the model before a demo:

```bash
ollama run gemma4:e4b "ready"
```

Warm local runs are still slower than cloud APIs because the product path is
private, local inference.

### Voice prompts do not play

Browsers often require a user gesture before speech or audio playback. Tap the
visible Start, Take Photo, Continue, or Replay controls. The UI should always
provide a labelled tap control for every voice action.

### Uploaded photo uses cloud instead of local

Hosted judge deployments can route uploads through Ollama Cloud. The real local
product path is the desktop/LAN path with Ollama running on the user's machine.
Check the deployment URL and the inference badge shown by the app.

## iOS PWA

Safari requires HTTPS for camera access from a LAN IP. Use the HTTPS dev server
when testing a phone against local E4B:

```bash
npm run setup:https
OLLAMA_ORIGINS="*" OLLAMA_HOST=0.0.0.0:11434 ollama serve
npm run start:https
```

Open the Network URL printed by Vite, such as `https://192.168.x.x:3000`. In
development, the phone calls `/ollama` on the same HTTPS origin and Vite proxies
the request to local Ollama.

If the iPhone cannot connect:

- Confirm the phone and Mac are on the same Wi-Fi.
- Confirm the mkcert root certificate is installed and trusted on the phone.
- Confirm macOS firewall allows incoming connections for Node/Vite and Ollama.
- Confirm `curl http://localhost:11434/api/tags` works on the Mac.
- Use `docs/ios-pwa-setup.md` for the full phone setup flow.

## Photo Studio

Photo Studio is the secondary sighted-photographer surface. It uses the same
Gemma 4/Ollama pipeline for critique, with extra Studio features such as
comparison, deterministic CV evidence, mentor chat, XMP export, and optional
image enhancement.

### CV or EXIF evidence is missing

The app can still analyze without CV evidence. CV extraction requires an image
element and file object in the browser. Some formats, stripped metadata, or
browser limitations may reduce EXIF availability.

### XMP export does not work

Use the Electron desktop build for the strongest export workflow. Browser
downloads can be limited by browser permissions and sandboxing.

### Gemini enhancement fails

The Gemini enhancement panel is optional Studio-only cloud functionality. It
requires the user's own Gemini API key and may require access to Gemini image
models. This path is separate from the local Gemma 4/Ollama product path.

Check local environment variables before starting Vite:

```bash
GEMINI_API_KEY=your_key npm start
```

## Vault Mode

Vault Mode is the Electron desktop posture for confidential work. Use it when
the user needs stronger network isolation than a browser or iOS PWA can enforce.

```bash
npm run electron:dev
```

If Vault Mode blocks a request, that is usually expected. Vault Mode is designed
to prevent external network access during analysis. Use normal Studio Mode for
optional cloud add-ons.

If the audit log export fails, check file permissions in the selected output
folder and try a user-writable location such as Desktop or Documents.

## Hosted Judge Demo

The `lens-app-gemma4` judge deployment uses Ollama Cloud for live uploads and
recorded local E4B outputs for samples. Required Vercel environment variables:

```bash
VITE_DEPLOYMENT_PROFILE=judge
OLLAMA_API_KEY=...
OLLAMA_TARGET=cloud
OLLAMA_CLOUD_MODEL=gemma4:31b
```

After changing Vercel environment variables, redeploy the project. A running
local Ollama instance on your laptop does not affect the hosted judge deployment.

## When To Use Each Path

- Use local desktop or LAN PWA for the real L.E.N.S. product path.
- Use `lens-app-gemma4` for judge uploads without local setup.
- Use recorded samples when model setup or network access is unreliable.
- Use Electron Vault Mode for confidential desktop work.
- Use optional Gemini enhancement only for Studio experiments that can leave the
  local-only guarantee.
