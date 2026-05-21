/** Minimal route to verify Vercel /api deployment (GET or POST). */
export default function handler(
  req: { method?: string },
  res: {
    setHeader(name: string, value: string): void;
    status(code: number): { json(data: unknown): void };
  },
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }
  return res.status(200).json({ ok: true, route: 'health' });
}
