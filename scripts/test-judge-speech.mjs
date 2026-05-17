import { chromium } from 'playwright';

const url = process.argv[2] || 'https://lens-app-gemma4.vercel.app/';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const logs = [];
page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));

await page.goto(url, { waitUntil: 'networkidle' });

const hasButton = await page.getByRole('button', { name: /Hear demo guide/i }).count();
console.log('Hear demo guide buttons:', hasButton);

const voiceBtn = page.getByRole('button', { name: /Voice/i });
const voiceLabel = await voiceBtn.textContent().catch(() => 'n/a');
console.log('Voice control:', voiceLabel);

const result = await page.evaluate(async () => {
  const btn = [...document.querySelectorAll('button')].find((b) =>
    /Hear demo guide/i.test(b.textContent || ''),
  );
  if (!btn) return { error: 'no button' };
  if (btn.disabled) return { error: 'button disabled', disabled: true };

  const synth = window.speechSynthesis;
  const before = { speaking: synth.speaking, pending: synth.pending, paused: synth.paused, voices: synth.getVoices().length };

  btn.click();

  await new Promise((r) => setTimeout(r, 300));

  const afterClick = { speaking: synth.speaking, pending: synth.pending, paused: synth.paused };

  // Direct speak test in same evaluate (user-gesture simulation may not apply)
  const u = new SpeechSynthesisUtterance('Direct test phrase.');
  u.lang = 'en-US';
  let events = [];
  u.onstart = () => events.push('start');
  u.onend = () => events.push('end');
  u.onerror = (e) => events.push(`error:${e.error}`);
  synth.resume();
  synth.speak(u);

  await new Promise((r) => setTimeout(r, 500));

  return {
    before,
    afterClick,
    afterDirect: { speaking: synth.speaking, pending: synth.pending, events },
    hasSynth: !!synth,
  };
});

console.log(JSON.stringify(result, null, 2));
console.log('Console logs from page:', logs.filter((l) => !l.includes('tailwind')).slice(0, 20));

await browser.close();
