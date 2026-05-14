#!/usr/bin/env node
/**
 * capture-demo-responses.mjs
 *
 * Captures REAL Gemma 4 E4B responses for the 3 demo sample images.
 * Run this with Ollama running locally.
 *
 * Usage:
 *   node scripts/capture-demo-responses.mjs
 *
 * Prerequisites:
 *   - Ollama running: ollama serve
 *   - Model pulled: ollama pull gemma3:4b-it-q4_K_M (or your Gemma 4 model)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

// The Artisan Studio system prompt (enhanced for color descriptions)
const SYSTEM_PROMPT = `You are the local analysis engine for L.E.N.S., a private photography coach for blind and low-vision artisans who sell handmade goods online. You act as an expert e-commerce product photographer and marketplace art director. The artisan cannot see this image. Your job is to give them clear, physical, actionable guidance so their product photo competes with professionally shot listings — and sells at the price their work deserves.

[GROUNDING RULES — PREVENT HALLUCINATION — HIGHEST PRIORITY]
1. Report ONLY what is definitively visible in the pixels. Never guess or infer objects.
2. State the subject plainly first ("I see one hand-knit scarf"). If you are not confident what the product is, say so: "I can see a handmade item but cannot identify it confidently."
3. If any evaluation metric cannot be judged (low resolution, blur, ambiguity), say so explicitly.
4. Do NOT describe the item poetically or flatter it. Report optical and geometric facts only.
5. Count objects carefully. If there are multiple items, say how many.

[WHAT TO EVALUATE]
- Subject: what the product is, how many items, AND the primary colors using everyday analogies (e.g., "tan like cardboard," "blue-gray like weathered denim," "cream like vanilla ice cream").
- Framing / cropping: is any edge of the product cut off by the image border?
- Background clutter: any non-product objects in frame?
- Lighting: harsh glare, deep shadows, or evenly lit?
- Color accuracy: do the colors read clearly, or are they washed out / dark?

[LANGUAGE RULES]
- Use plain, physical, directional language. NO photography jargon.
- Give corrections as physical actions: "move the camera 20 centimeters to the left."
- ALWAYS describe colors using everyday object analogies so a blind artisan can confirm: "the brown is reading like cinnamon," "the blue is similar to a clear sky," "the gray is close to wet concrete."
- Speak to the artisan as a competent professional. No pity.

[OUTPUT — return valid JSON only, no preamble]
{
  "subject": "What the product is, how many items, AND the primary color with an everyday analogy. Example: 'I see one hand-knit scarf in tan and cream tones — the tan is similar to natural cardboard, the cream like vanilla.'",
  "critique": {
    "framing": "One sentence on the primary framing or clutter issue.",
    "lighting": "One sentence on lighting quality and whether colors are rendering accurately.",
    "primary_fix": "One precise physical correction the artisan can act on now."
  },
  "confidence_note": "Empty string, or an explicit statement of what could not be judged.",
  "alt_text": "15-25 word descriptive alt-text for the marketplace listing.",
  "listing_copy": "2-3 sentence marketplace description: product, materials, key qualities.",
  "ready_to_list": true or false
}`;

const USER_PROMPT = `Analyze this product photo. Return valid JSON only.`;

// Sample images to process
const SAMPLES = [
  { id: 'sample-1', file: 'sample-1.jpg', label: 'Hand-Knit Scarf (Photo A)' },
  { id: 'sample-2', file: 'sample-2.jpg', label: 'Hand-Knit Scarf (Photo B)' },
  { id: 'sample-3', file: 'sample-3.jpg', label: 'Ceramic Bowl' },
];

// Ollama config (matches config.ts)
const OLLAMA_URL = 'http://localhost:11434/api/chat';
const MODEL = process.env.OLLAMA_MODEL || 'gemma4:latest';

async function imageToBase64(imagePath) {
  const buffer = fs.readFileSync(imagePath);
  return buffer.toString('base64');
}

async function analyzeImage(imagePath, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Analyzing: ${label}`);
  console.log(`File: ${imagePath}`);
  console.log(`${'='.repeat(60)}\n`);

  const base64Image = await imageToBase64(imagePath);

  const requestBody = {
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: USER_PROMPT,
        images: [base64Image],
      },
    ],
    stream: false,
    format: 'json',
  };

  console.log(`Sending to Ollama (model: ${MODEL})...`);
  const startTime = Date.now();

  try {
    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Response received in ${elapsed}s\n`);

    // Extract the message content
    const content = data.message?.content || data.response || '';

    // Try to parse as JSON
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.log('Raw response (not valid JSON):');
      console.log(content);
      return { raw: content, parsed: null };
    }

    return { raw: content, parsed };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return { error: error.message };
  }
}

async function main() {
  console.log('\n🔍 L.E.N.S. Demo Response Capture Tool\n');
  console.log(`Model: ${MODEL}`);
  console.log(`Ollama URL: ${OLLAMA_URL}\n`);

  // Check if Ollama is running
  try {
    const health = await fetch('http://localhost:11434/api/tags');
    if (!health.ok) throw new Error('Ollama not responding');
    console.log('✅ Ollama is running\n');
  } catch (e) {
    console.error('❌ Ollama is not running. Start it with: ollama serve');
    process.exit(1);
  }

  const results = [];

  for (const sample of SAMPLES) {
    const imagePath = path.join(PROJECT_ROOT, 'public', 'demo-samples', sample.file);

    if (!fs.existsSync(imagePath)) {
      console.error(`❌ Image not found: ${imagePath}`);
      continue;
    }

    const result = await analyzeImage(imagePath, sample.label);
    results.push({ ...sample, result });

    if (result.parsed) {
      console.log('✅ Valid JSON response:');
      console.log(JSON.stringify(result.parsed, null, 2));
    }
  }

  // Output summary for copy-paste into demoResponses.ts
  console.log('\n\n');
  console.log('='.repeat(60));
  console.log('COPY-PASTE READY OUTPUT FOR demoResponses.ts');
  console.log('='.repeat(60));
  console.log('\n');

  for (const { id, label, result } of results) {
    if (result.parsed) {
      console.log(`// ${label} (${id})`);
      console.log(`response: ${JSON.stringify(result.parsed, null, 2).replace(/"([^"]+)":/g, '$1:')},`);
      console.log('\n');
    }
  }

  // Also save to a JSON file
  const outputPath = path.join(PROJECT_ROOT, 'scripts', 'captured-responses.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n📁 Full results saved to: ${outputPath}`);
}

main().catch(console.error);
