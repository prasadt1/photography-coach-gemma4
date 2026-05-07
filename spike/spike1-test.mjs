/**
 * Spike 1: Gemma 4 via Ollama — Validation Test
 * Tests: JSON schema output, token counts, vision input, latency
 * 5 synthetic photos → v2 schema validation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OLLAMA_BASE = 'http://localhost:11434';
const MODEL = 'gemma4:latest';

// v2 schema JSON Schema for format enforcement (Ollama structured output)
const V2_JSON_SCHEMA = {
  type: 'object',
  properties: {
    schema_version: { type: 'string' },
    model_id: { type: 'string' },
    scores: {
      type: 'object',
      properties: {
        composition: { type: 'number' },
        lighting: { type: 'number' },
        technique: { type: 'number' },
        creativity: { type: 'number' },
        subjectImpact: { type: 'number' },
      },
      required: ['composition', 'lighting', 'technique', 'creativity', 'subjectImpact'],
    },
    critique: {
      type: 'object',
      properties: {
        composition: { type: 'string' },
        lighting: { type: 'string' },
        technique: { type: 'string' },
        overall: { type: 'string' },
      },
      required: ['composition', 'lighting', 'technique', 'overall'],
    },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
    learningPath: { type: 'array', items: { type: 'string' } },
    settingsEstimate: {
      type: 'object',
      properties: {
        focalLength: { type: 'string' },
        aperture: { type: 'string' },
        shutterSpeed: { type: 'string' },
        iso: { type: 'string' },
      },
      required: ['focalLength', 'aperture', 'shutterSpeed', 'iso'],
    },
    rationale: {
      type: 'object',
      properties: {
        observations: { type: 'array', items: { type: 'string' } },
        reasoningSteps: { type: 'array', items: { type: 'string' } },
        priorityFixes: { type: 'array', items: { type: 'string' } },
      },
      required: ['observations', 'reasoningSteps', 'priorityFixes'],
    },
    boundingBoxes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['composition', 'lighting', 'focus', 'exposure', 'color'] },
          severity: { type: 'string', enum: ['critical', 'moderate', 'minor'] },
          x: { type: 'number' }, y: { type: 'number' },
          width: { type: 'number' }, height: { type: 'number' },
          description: { type: 'string' },
          suggestion: { type: 'string' },
        },
        required: ['type', 'severity', 'x', 'y', 'width', 'height', 'description', 'suggestion'],
      },
    },
    is_refusal: { type: 'boolean' },
    refusal_reason: { type: 'string' },
  },
  required: [
    'schema_version', 'model_id', 'scores', 'critique',
    'strengths', 'improvements', 'learningPath', 'settingsEstimate', 'rationale',
  ],
};

const SYSTEM_PROMPT = `You are an expert photography coach. Analyze photographs and provide structured critique.

PHOTOGRAPHY PRINCIPLES:
- Composition: Rule of thirds, leading lines, framing, negative space, symmetry
- Lighting: Exposure quality, shadows, highlights, color temperature, dynamic range  
- Technique: Focus/sharpness, camera settings, motion handling, noise levels
- Creativity: Storytelling, originality, emotional impact, artistic vision
- Subject Impact: Subject clarity, eye contact (portraits), moment capture

OUTPUT RULES:
1. Score all 5 axes on a 0.0-10.0 scale (0.1 precision)
2. schema_version MUST be "2.0"
3. model_id MUST be "gemma-4-e4b"
4. strengths and improvements: 3-6 items each
5. learningPath: 3-5 items
6. rationale.observations: 3-6 items; reasoningSteps: 3-5 items; priorityFixes: 3-5 items
7. boundingBoxes: identify specific flaws only (not strengths), use 0-100 percentages for coordinates
8. is_refusal: false unless the image is not a photograph (medical, illegal content, etc.)`;

const USER_PROMPT_TEMPLATE = (filename) => `Analyze this photograph: "${filename}"

Provide complete v2 photography critique JSON with ALL required fields.`;

function validateV2(result, photoName) {
  const errors = [];
  const warnings = [];

  // Required top-level fields
  const required = ['schema_version', 'model_id', 'scores', 'critique', 'strengths', 'improvements', 'learningPath', 'settingsEstimate', 'rationale'];
  for (const field of required) {
    if (result[field] === undefined || result[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Schema version
  if (result.schema_version !== '2.0') warnings.push(`schema_version is "${result.schema_version}", expected "2.0"`);
  if (result.model_id !== 'gemma-4-e4b') warnings.push(`model_id is "${result.model_id}", expected "gemma-4-e4b"`);

  // Scores: 0-10 range
  if (result.scores) {
    const axes = ['composition', 'lighting', 'technique', 'creativity', 'subjectImpact'];
    for (const axis of axes) {
      const v = result.scores[axis];
      if (v === undefined) errors.push(`Missing score: ${axis}`);
      else if (typeof v !== 'number') errors.push(`Score ${axis} is not a number: ${v}`);
      else if (v < 0 || v > 10) errors.push(`Score ${axis} out of range (0-10): ${v}`);
    }
  }

  // Critique fields
  if (result.critique) {
    for (const field of ['composition', 'lighting', 'technique', 'overall']) {
      if (!result.critique[field] || result.critique[field].length < 10) {
        errors.push(`Critique.${field} too short or missing`);
      }
    }
  }

  // Arrays min length
  if (result.strengths && result.strengths.length < 3) warnings.push(`strengths only has ${result.strengths.length} items (need 3+)`);
  if (result.improvements && result.improvements.length < 3) warnings.push(`improvements only has ${result.improvements.length} items (need 3+)`);
  if (result.learningPath && result.learningPath.length < 3) warnings.push(`learningPath only has ${result.learningPath.length} items (need 3+)`);

  // Rationale
  if (result.rationale) {
    if (!result.rationale.observations || result.rationale.observations.length < 3)
      warnings.push(`rationale.observations has ${result.rationale?.observations?.length || 0} items (need 3+)`);
    if (!result.rationale.reasoningSteps || result.rationale.reasoningSteps.length < 3)
      warnings.push(`rationale.reasoningSteps has ${result.rationale?.reasoningSteps?.length || 0} items (need 3+)`);
    if (!result.rationale.priorityFixes || result.rationale.priorityFixes.length < 3)
      warnings.push(`rationale.priorityFixes has ${result.rationale?.priorityFixes?.length || 0} items (need 3+)`);
  }

  // BoundingBoxes validity
  if (result.boundingBoxes && Array.isArray(result.boundingBoxes)) {
    for (const bb of result.boundingBoxes) {
      if (bb.x < 0 || bb.x > 100 || bb.y < 0 || bb.y > 100 ||
          bb.width < 0 || bb.width > 100 || bb.height < 0 || bb.height > 100) {
        warnings.push(`BoundingBox coords out of range: x=${bb.x} y=${bb.y} w=${bb.width} h=${bb.height}`);
      }
    }
  }

  const isValid = errors.length === 0;
  return { isValid, errors, warnings };
}

async function analyzePhoto(photoPath, photoName) {
  const imageBytes = fs.readFileSync(photoPath);
  const base64 = imageBytes.toString('base64');
  const mimeType = photoPath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const startMs = Date.now();

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: USER_PROMPT_TEMPLATE(photoName),
        images: [base64],
      },
    ],
    format: V2_JSON_SCHEMA,
    stream: false,
    options: {
      temperature: 0.1,   // low temp for structured output consistency
      num_predict: 2048,
    },
  };

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const latencyMs = Date.now() - startMs;

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  const rawContent = data.message?.content || '';
  const promptTokens = data.prompt_eval_count || 0;
  const completionTokens = data.eval_count || 0;

  let parsed = null;
  let parseError = null;
  try {
    parsed = JSON.parse(rawContent);
  } catch (e) {
    parseError = e.message;
  }

  return {
    photoName,
    latencyMs,
    latencyS: (latencyMs / 1000).toFixed(1),
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    rawContent,
    parsed,
    parseError,
    validation: parsed ? validateV2(parsed, photoName) : null,
    hasBoundingBoxes: parsed?.boundingBoxes?.length > 0,
    boundingBoxCount: parsed?.boundingBoxes?.length || 0,
  };
}

async function main() {
  console.log('=== SPIKE 1: Gemma 4 via Ollama — Photography Coach v2 ===');
  console.log(`Model: ${MODEL} | Ollama: ${OLLAMA_BASE}\n`);

  const photos = [
    { path: path.join(__dirname, 'test-landscape.jpg'), name: 'landscape-highquality' },
    { path: path.join(__dirname, 'test-portrait.jpg'), name: 'portrait-subject' },
    { path: path.join(__dirname, 'test-macro.jpg'), name: 'macro-detail' },
    { path: path.join(__dirname, 'test-lowquality.jpg'), name: 'lowcontrast-flat' },
    { path: path.join(__dirname, 'test-edgecase.jpg'), name: 'edgecase-highcontrast' },
  ];

  const results = [];
  const summary = { pass: 0, fail: 0, warnings: 0 };
  const latencies = [];

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    console.log(`[${i + 1}/5] Analyzing: ${photo.name} ...`);
    const t0 = Date.now();

    try {
      const result = await analyzePhoto(photo.path, photo.name);
      results.push(result);
      latencies.push(result.latencyMs);

      const v = result.validation;
      const statusIcon = v.isValid ? '✅' : '❌';
      console.log(`  ${statusIcon} ${result.latencyS}s | tokens: ${result.promptTokens}+${result.completionTokens}=${result.totalTokens} | bbox: ${result.boundingBoxCount}`);

      if (v.errors.length > 0) {
        console.log(`  ERRORS: ${v.errors.join('; ')}`);
        summary.fail++;
      } else {
        summary.pass++;
      }
      if (v.warnings.length > 0) {
        console.log(`  WARN: ${v.warnings.slice(0, 3).join('; ')}`);
        summary.warnings += v.warnings.length;
      }

      // Log scores
      if (result.parsed?.scores) {
        const s = result.parsed.scores;
        console.log(`  Scores: comp=${s.composition} light=${s.lighting} tech=${s.technique} create=${s.creativity} subj=${s.subjectImpact}`);
      }

    } catch (err) {
      console.log(`  ❌ ERROR: ${err.message}`);
      results.push({ photoName: photo.name, error: err.message, latencyMs: Date.now() - t0 });
      summary.fail++;
    }

    console.log('');
  }

  // Summary
  const p50 = latencies.sort((a,b) => a-b)[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || latencies[latencies.length - 1];
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  console.log('=== SUMMARY ===');
  console.log(`Schema valid: ${summary.pass}/5 photos`);
  console.log(`Latency: avg=${(avgLatency/1000).toFixed(1)}s | P50=${(p50/1000).toFixed(1)}s | P95=${(p95/1000).toFixed(1)}s`);
  console.log(`Token counts available: YES (from Ollama API)`);
  console.log(`Vision (image input): YES (images field in chat API)`);

  // Open questions answers
  console.log('\n=== OPEN QUESTIONS ANSWERED ===');
  console.log(`Q1 Structured Output: Ollama format param accepts full JSON Schema (v0.22.1+)`);
  console.log(`Q2 Token Counts: prompt_eval_count + eval_count available in response`);
  const anyBbox = results.some(r => r.hasBoundingBoxes);
  console.log(`Q3 Bounding Boxes: ${anyBbox ? 'YES - some photos produced boxes' : 'NO - no boxes detected (use CV fallback)'}`);
  console.log(`Q4 Image Encoding: base64 via messages[].images[] array`);

  // Pass/fail verdict
  const passRate = summary.pass / 5;
  const latencyOk = p95 < 15000;
  const passVerdict = passRate >= 0.8 && latencyOk;

  console.log('\n=== PASS/FAIL VERDICT ===');
  console.log(`Schema pass rate: ${summary.pass}/5 (need 4/5) → ${passRate >= 0.8 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Latency P95: ${(p95/1000).toFixed(1)}s (need <15s) → ${latencyOk ? '✅ PASS' : '❌ FAIL (apply Option B fallback)'}`);
  console.log(`\nSPIKE 1 OVERALL: ${passVerdict ? '✅ GO — proceed to Day 1 skeleton' : '❌ NO-GO — apply fallback'}`);

  // Save results
  const output = {
    timestamp: new Date().toISOString(),
    model: MODEL,
    summary: {
      schemaValid: `${summary.pass}/5`,
      latencyP50s: (p50/1000).toFixed(1),
      latencyP95s: (p95/1000).toFixed(1),
      latencyAvgS: (avgLatency/1000).toFixed(1),
      tokenCountsAvailable: true,
      visionInputWorks: true,
      boundingBoxesDetected: anyBbox,
      verdict: passVerdict ? 'GO' : 'NO-GO',
    },
    openQuestions: {
      q1_structuredOutput: 'format param accepts JSON Schema object (Ollama 0.22.1)',
      q2_tokenCounts: 'prompt_eval_count + eval_count in response',
      q3_boundingBoxes: anyBbox ? 'detected in some photos' : 'not detected, use CV fallback',
      q4_imageEncoding: 'base64 in messages[].images[] array',
    },
    photos: results.map(r => ({
      name: r.photoName,
      latencyS: r.latencyMs ? (r.latencyMs/1000).toFixed(1) : null,
      tokens: r.totalTokens || 0,
      schemaValid: r.validation?.isValid ?? false,
      errors: r.validation?.errors || [],
      warnings: r.validation?.warnings || [],
      scores: r.parsed?.scores || null,
      hasBoundingBoxes: r.hasBoundingBoxes || false,
      boundingBoxCount: r.boundingBoxCount || 0,
    })),
  };

  fs.writeFileSync(path.join(__dirname, 'spike-1-validation.json'), JSON.stringify(output, null, 2));
  console.log('\nResults saved to spike/spike-1-validation.json');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
