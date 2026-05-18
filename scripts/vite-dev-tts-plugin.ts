/**
 * Dev-only: POST /api/tts on the Vite server so iPhone on LAN gets natural neural coach audio.
 */

import type { Plugin } from 'vite';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const DEFAULT_VOICE = 'en-US-DavisNeural';

async function synthesize(text: string, voice: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);
  const chunks: Buffer[] = [];
  for await (const chunk of audioStream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function devTtsPlugin(): Plugin {
  return {
    name: 'dev-tts-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0];
        if (url !== '/api/tts') return next();

        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        const bodyChunks: Buffer[] = [];
        req.on('data', (c) => bodyChunks.push(Buffer.from(c)));
        req.on('end', () => {
          void (async () => {
            try {
              const raw = Buffer.concat(bodyChunks).toString('utf8');
              const parsed = JSON.parse(raw || '{}') as { text?: string; voice?: string };
              const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
              if (!text) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'text required' }));
                return;
              }
              const voice =
                typeof parsed.voice === 'string' && parsed.voice.trim()
                  ? parsed.voice.trim()
                  : DEFAULT_VOICE;
              const audio = await synthesize(text.slice(0, 2500), voice);
              res.statusCode = 200;
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Content-Type', 'audio/mpeg');
              res.setHeader('Cache-Control', 'no-store');
              res.end(audio);
            } catch (err) {
              console.error('[dev-tts-api]', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'TTS failed' }));
            }
          })();
        });
      });
    },
  };
}
