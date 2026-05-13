#!/usr/bin/env node
/**
 * benchmark-gemma-vs-gemini.mjs
 *
 * Runs 5 test photos through BOTH:
 *   - Gemma 4 E4B via Ollama (local)
 *   - Gemini 2.5 Flash via Google AI API (cloud)
 *
 * Outputs results to:
 *   - spike-1-comparison.csv  (score table)
 *   - benchmark-results.json  (full responses)
 *
 * Usage:
 *   GEMINI_API_KEY=your_key node spike/benchmark-gemma-vs-gemini.mjs
 *
 * Requirements:
 *   - Ollama running: ollama serve
 *   - gemma4:latest pulled: ollama pull gemma4:latest
 *   - GEMINI_API_KEY env var set
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ───────────────────────────────────────────────────────────────────

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const OLLAMA_MODEL = 'gemma4:latest';
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODELS_TO_TRY = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

// Photos to benchmark (relative to spike/ folder)
const TEST_PHOTOS = [
  'test-landscape.jpg',
  'test-portrait.jpg',
  'test-lowquality.jpg',
  'test-street.jpg',
  'test-macro.jpg',
];

// ─── Prompts ──────────────────────────────────────────────────────────────────

// Use the same production system prompt the app uses (model is tuned to respond to this)
const SYSTEM_PROMPT = `You are an expert photography coach. Analyze photos concisely and accurately.

PHOTOGRAPHY KNOWLEDGE:
- Composition: rule of thirds, leading lines, framing, negative space, golden ratio
- Lighting: exposure, shadows, highlights, color temperature, hard vs soft light
- Technique: focus/sharpness, aperture/shutter/ISO, white balance, noise
- Creativity: storytelling, subject impact, color harmony, originality

SCORING (0.0-10.0, one decimal): 9-10=gallery | 7-8=strong amateur | 5-6=competent | 3-4=issues | 1-2=major problems

Return a JSON object with these REQUIRED fields:
{
  "schema_version": "2.0",
  "model_id": "gemma-4-e4b",
  "scores": { "composition": X, "lighting": X, "technique": X, "creativity": X, "subjectImpact": X },
  "critique": { "composition": "...", "lighting": "...", "technique": "...", "overall": "..." },
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "...", "..."],
  "learningPath": ["...", "...", "..."],
  "rationale": { "observations": ["..."], "reasoningSteps": ["..."], "priorityFixes": ["..."] },
  "boundingBoxes": [],
  "is_refusal": false
}`;

const USER_PROMPT = 'Analyze this photograph and provide a complete photography critique as JSON.';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function photoToBase64(photoPath) {
  const buf = fs.readFileSync(photoPath);
  return buf.toString('base64');
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function parseScores(text) {
  if (!text || !text.trim()) return null;
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    // Try full parse first
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    // Accept scores from V2 schema or simple scores object
    const scores = parsed.scores || (parsed.composition != null ? parsed : null);
    if (!scores) return null;
    // Validate all 5 axes present
    const axes = ['composition', 'lighting', 'technique', 'creativity', 'subjectImpact'];
    if (!axes.every(ax => typeof scores[ax] === 'number')) return null;
    return scores;
  } catch {
    // Try extracting just the scores block
    try {
      const scoresMatch = text.match(/"scores"\s*:\s*\{([^}]+)\}/);
      if (scoresMatch) {
        const scoresJson = `{${scoresMatch[1]}}`;
        const scores = JSON.parse(scoresJson);
        return scores;
      }
    } catch { /* ignore */ }
    return null;
  }
}

// ─── Gemma via Ollama ─────────────────────────────────────────────────────────

async function runGemma(photoPath) {
  const base64 = photoToBase64(photoPath);
  const start = Date.now();

  const body = {
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: USER_PROMPT, images: [base64] },
    ],
    stream: true,     // streaming = same as web app, avoids timeout on slow thinking
    // No format:'json' — it causes extreme slowdown with thinking mode
    // The production system prompt + structured output request is sufficient
    options: { temperature: 0.1, num_predict: 1200 },
  };

  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(240_000),  // 4 min — generous for thinking model
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    // Accumulate streaming tokens
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let promptTokens, completionTokens;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          fullContent += msg.message?.content ?? '';
          if (msg.done) {
            promptTokens = msg.prompt_eval_count;
            completionTokens = msg.eval_count;
          }
        } catch { /* partial line */ }
      }
    }

    const latencyMs = Date.now() - start;
    const scores = parseScores(fullContent);

    return {
      success: !!scores,
      scores,
      latencyMs,
      rawText: fullContent.slice(0, 300),
      promptTokens,
      completionTokens,
    };
  } catch (err) {
    return { success: false, error: err.message, latencyMs: Date.now() - start };
  }
}

// ─── Gemini via REST API ──────────────────────────────────────────────────────

async function runGemini(photoPath) {
  if (!GEMINI_KEY) {
    return { success: false, error: 'No GEMINI_API_KEY set — skipped', skipped: true };
  }

  const base64 = photoToBase64(photoPath);
  const ext = path.extname(photoPath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  const start = Date.now();

  // Gemini-specific prompt: shorter, explicit JSON-only instruction
  const geminiPrompt = `Score this photo. Respond with ONLY this JSON (no text before or after, no markdown):
{"scores":{"composition":0.0,"lighting":0.0,"technique":0.0,"creativity":0.0,"subjectImpact":0.0},"overall":""}

Replace each 0.0 with the actual score (0.0–10.0). Fill overall with one sentence.
Scale: 9-10=gallery | 7-8=strong amateur | 5-6=competent | 3-4=issues | 1-2=major problems`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: geminiPrompt },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 600,
    },
  };

  let lastErr;
  for (const model of GEMINI_MODELS_TO_TRY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok) {
        const errBody = await res.text();
        if (res.status === 404 || errBody.includes('NOT_FOUND')) {
          lastErr = new Error(`${model} not found`);
          continue; // try next model
        }
        throw new Error(`Gemini HTTP ${res.status}: ${errBody.slice(0, 200)}`);
      }

      const data = await res.json();
      const latencyMs = Date.now() - start;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const scores = parseScores(text);

      if (!scores) {
        // API responded but we couldn't extract scores — show raw for debugging
        console.log(`\n   [DEBUG Gemini raw]: ${text.slice(0, 400)}\n`);
        return {
          success: false,
          error: `Parse failed — model returned unparseable response`,
          latencyMs,
          model,
          rawText: text.slice(0, 500),
        };
      }

      return {
        success: true,
        scores,
        latencyMs,
        model,
        rawText: text.slice(0, 500),
        promptTokens: data.usageMetadata?.promptTokenCount,
        completionTokens: data.usageMetadata?.candidatesTokenCount,
      };
    } catch (err) {
      lastErr = err;
      if (!err.message?.includes('NOT_FOUND') && !err.message?.includes('not found')) {
        break; // non-404 error, don't retry
      }
    }
  }

  return { success: false, error: lastErr?.message || 'All models failed', latencyMs: Date.now() - start };
}

// ─── Delta calculation ────────────────────────────────────────────────────────

function calcDelta(gemmaScores, geminiScores) {
  if (!gemmaScores || !geminiScores) return null;
  const axes = ['composition', 'lighting', 'technique', 'creativity', 'subjectImpact'];
  const deltas = axes.map(ax => Math.abs((gemmaScores[ax] || 0) - (geminiScores[ax] || 0)));
  return {
    max: Math.max(...deltas),
    avg: deltas.reduce((a, b) => a + b, 0) / deltas.length,
    withinTolerance: Math.max(...deltas) <= 2.0,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Photography Coach — Gemma 4 vs Gemini Benchmark');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Gemma model : ${OLLAMA_MODEL} (Ollama)`);
  console.log(`  Gemini key  : ${GEMINI_KEY ? '✅ found' : '❌ missing — Gemini will be skipped'}`);
  console.log(`  Photos      : ${TEST_PHOTOS.length}`);
  console.log('───────────────────────────────────────────────────────────\n');

  const results = [];

  for (const photo of TEST_PHOTOS) {
    const photoPath = path.join(__dirname, photo);
    if (!fs.existsSync(photoPath)) {
      console.log(`⚠️  Skipping ${photo} — file not found`);
      continue;
    }

    console.log(`📷 ${photo}`);

    // Run Gemma
    process.stdout.write('   Gemma 4 (Ollama)  ... ');
    const gemma = await runGemma(photoPath);
    if (gemma.success) {
      const s = gemma.scores;
      console.log(`✅ ${gemma.latencyMs / 1000}s | comp=${s.composition} light=${s.lighting} tech=${s.technique} creat=${s.creativity} subj=${s.subjectImpact}`);
    } else {
      console.log(`❌ ${gemma.error}`);
    }

    // Brief pause between calls
    await sleep(2000);

    // Run Gemini
    process.stdout.write('   Gemini (API)      ... ');
    const gemini = await runGemini(photoPath);
    if (gemini.skipped) {
      console.log(`⏭️  skipped (no API key)`);
    } else if (gemini.success) {
      const s = gemini.scores;
      console.log(`✅ ${gemini.latencyMs / 1000}s [${gemini.model}] | comp=${s.composition} light=${s.lighting} tech=${s.technique} creat=${s.creativity} subj=${s.subjectImpact}`);
    } else {
      console.log(`❌ ${gemini.error}`);
    }

    // Delta
    const delta = calcDelta(gemma.scores, gemini.scores);
    if (delta) {
      const ok = delta.withinTolerance ? '✅' : '⚠️';
      console.log(`   Delta            : ${ok} max=${delta.max.toFixed(1)} avg=${delta.avg.toFixed(1)} within±2=${delta.withinTolerance}`);
    }
    console.log();

    results.push({ photo, gemma, gemini, delta });

    // Pause between photos to avoid Ollama eviction
    await sleep(3000);
  }

  // ─── Write CSV ──────────────────────────────────────────────────────────────

  const csvRows = [
    'photo,gemini_composition,gemini_lighting,gemini_technique,gemini_creativity,gemini_subject,gemma_composition,gemma_lighting,gemma_technique,gemma_creativity,gemma_subject,delta_max,delta_avg,within_tolerance,gemma_latency_s,gemini_latency_s,notes',
  ];

  for (const r of results) {
    const gs = r.gemma.scores || {};
    const gi = r.gemini.scores || {};
    const note = r.gemma.success && r.gemini.success
      ? (r.delta?.withinTolerance ? 'PASS: within ±2 tolerance' : 'WARN: exceeds ±2 tolerance')
      : r.gemini.skipped ? 'GEMINI_SKIPPED: no API key'
      : (!r.gemma.success ? `GEMMA_ERROR: ${r.gemma.error}` : `GEMINI_ERROR: ${r.gemini.error}`);

    csvRows.push([
      r.photo,
      gi.composition ?? 'N/A', gi.lighting ?? 'N/A', gi.technique ?? 'N/A', gi.creativity ?? 'N/A', gi.subjectImpact ?? 'N/A',
      gs.composition ?? 'N/A', gs.lighting ?? 'N/A', gs.technique ?? 'N/A', gs.creativity ?? 'N/A', gs.subjectImpact ?? 'N/A',
      r.delta?.max?.toFixed(1) ?? 'N/A',
      r.delta?.avg?.toFixed(1) ?? 'N/A',
      r.delta?.withinTolerance ?? 'N/A',
      r.gemma.latencyMs ? (r.gemma.latencyMs / 1000).toFixed(1) : 'N/A',
      r.gemini.latencyMs ? (r.gemini.latencyMs / 1000).toFixed(1) : 'N/A',
      `"${note}"`,
    ].join(','));
  }

  const csvPath = path.join(__dirname, 'spike-1-comparison.csv');
  fs.writeFileSync(csvPath, csvRows.join('\n') + '\n');
  console.log(`📊 CSV written → ${csvPath}`);

  // ─── Write full JSON ─────────────────────────────────────────────────────────

  const jsonPath = path.join(__dirname, 'benchmark-results.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    gemmaModel: OLLAMA_MODEL,
    geminiModelsAvailable: GEMINI_MODELS_TO_TRY,
    results,
  }, null, 2));
  console.log(`📄 Full JSON → ${jsonPath}`);

  // ─── Summary ─────────────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  const passed = results.filter(r => r.delta?.withinTolerance).length;
  const skipped = results.filter(r => r.gemini?.skipped).length;
  const gemmaFailed = results.filter(r => !r.gemma.success).length;
  console.log(`  Photos tested    : ${results.length}`);
  console.log(`  Gemma OK         : ${results.length - gemmaFailed}/${results.length}`);
  console.log(`  Gemini skipped   : ${skipped} (no API key)`);
  if (skipped < results.length) {
    console.log(`  Within ±2 delta  : ${passed}/${results.length - skipped}`);
  }

  const avgGemmaLatency = results
    .filter(r => r.gemma.latencyMs)
    .reduce((s, r) => s + r.gemma.latencyMs, 0) / results.length / 1000;
  console.log(`  Avg Gemma latency: ${avgGemmaLatency.toFixed(1)}s`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
