/**
 * Vercel Serverless API: /api/tts — neural coach audio (Edge TTS).
 */

type VercelRequest = {
  method?: string;
  body?: { text?: string; voice?: string };
};

type VercelResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  json(data: unknown): VercelResponse;
  send(data: Buffer): void;
  end(): void;
};

const MAX_CHARS = 2500;
const DEFAULT_VOICE = 'en-US-JennyNeural';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) {
    return res.status(400).json({ error: 'text required' });
  }

  const spoken = text.slice(0, MAX_CHARS);
  const voice =
    typeof req.body?.voice === 'string' && req.body.voice.trim()
      ? req.body.voice.trim()
      : DEFAULT_VOICE;

  try {
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(spoken);
    const chunks: Buffer[] = [];

    for await (const chunk of audioStream as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk));
    }

    const audio = Buffer.concat(chunks);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(audio);
  } catch (err) {
    console.error('[api/tts]', err);
    return res.status(500).json({
      error: 'TTS failed',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
