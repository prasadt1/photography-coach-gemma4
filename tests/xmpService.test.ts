/**
 * xmpService.test.ts — Unit tests for XMP sidecar generation
 */

import { describe, it, expect } from 'vitest';
import {
  scoreToStarRating,
  severityToColorLabel,
  extractKeywords,
  generateDescription,
  generateXMP,
  getXMPFilename,
  exportXMPSidecar,
} from '../services/xmpService';
import { PhotoAnalysisV2 } from '../types.v2';

describe('xmpService', () => {
  // Mock analysis with various score ranges
  const createMockAnalysis = (avgScore: number, severity: 'critical' | 'moderate' | 'minor' | null = null): PhotoAnalysisV2 => ({
    schema_version: '2.0',
    model_id: 'gemma-4-e4b',
    quantization: 'Q4_K_M',
    timestamp: Date.now(),
    scores: {
      composition: avgScore,
      lighting: avgScore,
      technique: avgScore,
      creativity: avgScore,
      subjectImpact: avgScore,
    },
    critique: {
      composition: 'Test composition critique',
      lighting: 'Test lighting critique',
      technique: 'Test technique critique',
      overall: 'This is an overall test critique of the photo.',
    },
    strengths: ['Strength 1', 'Strength 2'],
    improvements: ['Improvement 1', 'Improvement 2'],
    learningPath: ['Learn topic 1', 'Learn topic 2'],
    settingsEstimate: {
      focalLength: '50mm',
      aperture: 'f/2.8',
      shutterSpeed: '1/250',
      iso: 'ISO 400',
    },
    rationale: {
      observations: [
        'Clear blue sky dominates composition',
        'Strong leading lines in foreground',
        'Soft golden hour lighting',
        'Sharp focus on main subject',
        'Balanced histogram distribution',
      ],
      reasoningSteps: ['Step 1', 'Step 2'],
      priorityFixes: ['Fix 1', 'Fix 2'],
    },
    boundingBoxes: severity
      ? [
          {
            type: 'composition',
            severity,
            x: 0.1,
            y: 0.2,
            width: 0.3,
            height: 0.4,
            description: 'Test issue',
            suggestion: 'Test fix',
          },
        ]
      : [],
    is_refusal: false,
    refusal_reason: '',
  });

  describe('scoreToStarRating', () => {
    it('should map scores 8-10 to 5 stars', () => {
      const scores = { composition: 8, lighting: 9, technique: 10, creativity: 8.5, subjectImpact: 9.5 };
      expect(scoreToStarRating(scores)).toBe(5);
    });

    it('should map scores 6-7.99 to 4 stars', () => {
      const scores = { composition: 6, lighting: 7, technique: 6.5, creativity: 7.5, subjectImpact: 7 };
      expect(scoreToStarRating(scores)).toBe(4);
    });

    it('should map scores 4-5.99 to 3 stars', () => {
      const scores = { composition: 4, lighting: 5, technique: 4.5, creativity: 5.5, subjectImpact: 5 };
      expect(scoreToStarRating(scores)).toBe(3);
    });

    it('should map scores 2-3.99 to 2 stars', () => {
      const scores = { composition: 2, lighting: 3, technique: 2.5, creativity: 3.5, subjectImpact: 3 };
      expect(scoreToStarRating(scores)).toBe(2);
    });

    it('should map scores 0-1.99 to 1 star', () => {
      const scores = { composition: 0, lighting: 1, technique: 0.5, creativity: 1.5, subjectImpact: 1 };
      expect(scoreToStarRating(scores)).toBe(1);
    });
  });

  describe('severityToColorLabel', () => {
    it('should return Red for critical severity', () => {
      const analysis = createMockAnalysis(5, 'critical');
      expect(severityToColorLabel(analysis)).toBe('Red');
    });

    it('should return Yellow for moderate severity', () => {
      const analysis = createMockAnalysis(5, 'moderate');
      expect(severityToColorLabel(analysis)).toBe('Yellow');
    });

    it('should return Green for minor severity', () => {
      const analysis = createMockAnalysis(5, 'minor');
      expect(severityToColorLabel(analysis)).toBe('Green');
    });

    it('should return Green for no bounding boxes', () => {
      const analysis = createMockAnalysis(5, null);
      expect(severityToColorLabel(analysis)).toBe('Green');
    });
  });

  describe('extractKeywords', () => {
    it('should extract top 5 observations as keywords', () => {
      const analysis = createMockAnalysis(5);
      const keywords = extractKeywords(analysis);

      expect(keywords).toHaveLength(5);
      expect(keywords[0]).toBe('Clear blue sky dominates composition');
      expect(keywords[1]).toBe('Strong leading lines in foreground');
    });

    it('should clean up observation prefixes', () => {
      const analysis = createMockAnalysis(5);
      analysis.rationale.observations = [
        'I observe a bright sunset',
        'I notice sharp focus on subject',
        'There is good contrast',
      ];

      const keywords = extractKeywords(analysis);
      expect(keywords[0]).toBe('A bright sunset');
      expect(keywords[1]).toBe('Sharp focus on subject');
      expect(keywords[2]).toBe('Good contrast');
    });

    it('should handle missing rationale gracefully', () => {
      const analysis = createMockAnalysis(5);
      delete (analysis as any).rationale;

      const keywords = extractKeywords(analysis);
      expect(keywords).toHaveLength(0);
    });
  });

  describe('generateDescription', () => {
    it('should include star rating visualization', () => {
      const analysis = createMockAnalysis(9); // 5 stars
      const desc = generateDescription(analysis);

      expect(desc).toContain('★★★★★');
    });

    it('should include overall critique text', () => {
      const analysis = createMockAnalysis(5);
      const desc = generateDescription(analysis);

      expect(desc).toContain('This is an overall test critique');
    });

    it('should include score breakdown', () => {
      const analysis = createMockAnalysis(7);
      const desc = generateDescription(analysis);

      expect(desc).toContain('Composition 7/10');
      expect(desc).toContain('Lighting 7/10');
      expect(desc).toContain('Technique 7/10');
    });
  });

  describe('getXMPFilename', () => {
    it('should replace .jpg extension with .xmp', () => {
      expect(getXMPFilename('IMG_1234.JPG')).toBe('IMG_1234.xmp');
      expect(getXMPFilename('photo.jpg')).toBe('photo.xmp');
    });

    it('should replace .jpeg extension with .xmp', () => {
      expect(getXMPFilename('DSC_5678.jpeg')).toBe('DSC_5678.xmp');
    });

    it('should replace .NEF extension with .xmp', () => {
      expect(getXMPFilename('RAW_9012.NEF')).toBe('RAW_9012.xmp');
    });

    it('should append .xmp if no extension exists', () => {
      expect(getXMPFilename('photo')).toBe('photo.xmp');
    });
  });

  describe('generateXMP', () => {
    it('should generate valid XML structure', () => {
      const analysis = createMockAnalysis(8);
      const xmp = generateXMP(analysis, 'test.jpg');

      expect(xmp).toContain('<?xml version="1.0"');
      expect(xmp).toContain('<x:xmpmeta');
      expect(xmp).toContain('<rdf:RDF');
      expect(xmp).toContain('</x:xmpmeta>');
    });

    it('should include star rating', () => {
      const analysis = createMockAnalysis(9); // 5 stars
      const xmp = generateXMP(analysis, 'test.jpg');

      expect(xmp).toContain('<xmp:Rating>5</xmp:Rating>');
    });

    it('should include color label', () => {
      const analysis = createMockAnalysis(5, 'critical');
      const xmp = generateXMP(analysis, 'test.jpg');

      expect(xmp).toContain('<xmp:Label>Red</xmp:Label>');
    });

    it('should include keywords as rdf:Bag', () => {
      const analysis = createMockAnalysis(5);
      const xmp = generateXMP(analysis, 'test.jpg');

      expect(xmp).toContain('<dc:subject>');
      expect(xmp).toContain('<rdf:Bag>');
      expect(xmp).toContain('Clear blue sky dominates composition');
      expect(xmp).toContain('Strong leading lines in foreground');
    });

    it('should escape XML special characters', () => {
      const analysis = createMockAnalysis(5);
      analysis.critique.overall = 'Test with <angle> & "quotes"';

      const xmp = generateXMP(analysis, 'test.jpg');

      expect(xmp).toContain('&lt;angle&gt;');
      expect(xmp).toContain('&amp;');
      expect(xmp).toContain('&quot;');
    });

    it('should include Creator Tool metadata', () => {
      const analysis = createMockAnalysis(5);
      const xmp = generateXMP(analysis, 'test.jpg');

      expect(xmp).toContain('L.E.N.S. (Gemma 4 E4B)');
    });
  });

  describe('exportXMPSidecar', () => {
    it('should return both filename and content', () => {
      const analysis = createMockAnalysis(7);
      const result = exportXMPSidecar(analysis, 'IMG_1234.JPG');

      expect(result.filename).toBe('IMG_1234.xmp');
      expect(result.content).toContain('<?xml version');
      expect(result.content).toContain('<xmp:Rating>4</xmp:Rating>'); // score 7 → 4 stars
    });

    it('should generate complete XMP with all metadata', () => {
      const analysis = createMockAnalysis(9, 'moderate');
      const result = exportXMPSidecar(analysis, 'test.jpg');

      const { content } = result;

      // Verify all key sections are present
      expect(content).toContain('<xmp:Rating>5</xmp:Rating>');
      expect(content).toContain('<xmp:Label>Yellow</xmp:Label>');
      expect(content).toContain('<dc:subject>');
      expect(content).toContain('<dc:description>');
      expect(content).toContain('Clear blue sky');
    });
  });
});
