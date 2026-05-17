#!/usr/bin/env node
/**
 * Generate /public/audio/demo-sample-{1,2,3}-analysis.wav from demo JSON (run on macOS).
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/audio');
mkdirSync(outDir, { recursive: true });

const samples = [
  {
    id: '1',
    subject:
      'I see one knitted item, appearing to be a narrow fabric swatch, with a primary color of light brown, similar to dried autumn leaves.',
    framing:
      'The object is placed centrally across the wood surface, but there is excessive unused space above and below it.',
    lighting:
      'The lighting is uneven, causing a strong shadow immediately below the knitted item and slightly darkening the color.',
    primary_fix:
      'Place the knitted item on a clean, flat surface and move the camera directly over the object.',
    ready_to_list: false,
  },
  {
    id: '2',
    subject:
      'I see one rectangular woven textile piece in shades of beige and brown — the overall color is similar to unbleached coffee grounds.',
    framing:
      'The product is centered and fully visible, but the surrounding background wood is unevenly lit and distracts from the item.',
    lighting:
      'The lighting is generally even but lacks direction, which makes the texture readable but the colors flat and dull.',
    primary_fix:
      'Place the textile on a clean, flat background surface that has consistent color and minimal grain.',
    ready_to_list: false,
  },
  {
    id: '3',
    subject:
      'I see one ceramic bowl with a primary color that is a mottled blue-gray, similar to wet concrete.',
    framing: 'The bowl is centered and fully visible; no parts are cut off by the edge.',
    lighting:
      'The lighting is generally even, but there is a strong, slightly distracting glare on the inside curve of the bowl.',
    primary_fix:
      'Move the camera up and slightly to the left, and change the angle so the light hits the bowl at a flatter angle.',
    ready_to_list: false,
  },
];

function buildScript(s) {
  const parts = ['Analysis complete.', `What I see: ${s.subject}`];
  const colour = s.subject.match(/similar to [^.]+\./i)?.[0];
  if (colour) parts.push(`Colour check: ${colour}`);
  parts.push(`Lighting: ${s.lighting}`);
  parts.push(`Framing: ${s.framing}`);
  parts.push(`Your next step: ${s.primary_fix}`);
  return parts.join(' ');
}

for (const s of samples) {
  const text = buildScript(s);
  const aiff = join(outDir, `demo-sample-${s.id}-analysis.aiff`);
  const wav = join(outDir, `demo-sample-${s.id}-analysis.wav`);
  console.log('Generating', wav);
  execFileSync('say', ['-v', 'Samantha', '-r', '175', '-o', aiff, text]);
  execFileSync('afconvert', ['-f', 'WAVE', '-d', 'LEI16', aiff, wav]);
}

console.log('Done.');
