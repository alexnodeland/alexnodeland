/**
 * Tests for CV data integration in chat system
 */

import { chatConfig } from '../../../config/chat';
import { cvData } from '../../../config/cv';
import {
  combineSystemPromptWithCV,
  createCVContextBlock,
  formatCV,
} from '../../../lib/utils/cvFormatter';

describe('CV Integration in Chat', () => {
  describe('formatCV', () => {
    it('should include personal information', () => {
      const formatted = formatCV(cvData);

      expect(formatted).toContain(cvData.personal.name);
      expect(formatted).toContain(cvData.personal.title);
      expect(formatted).toContain(cvData.personal.location);
      expect(formatted).toContain(cvData.personal.website);
      expect(formatted).toContain(cvData.personal.summary);
    });

    it('should include all experience positions', () => {
      const formatted = formatCV(cvData);

      cvData.experience.forEach(exp => {
        expect(formatted).toContain(exp.title);
        expect(formatted).toContain(exp.company);
        expect(formatted).toContain(exp.duration);
      });
    });

    it('should include technical and leadership skills', () => {
      const formatted = formatCV(cvData);

      cvData.skills.technical.forEach(skill => {
        expect(formatted).toContain(skill);
      });
      cvData.skills.soft.forEach(skill => {
        expect(formatted).toContain(skill);
      });
    });

    it('should include all education entries', () => {
      const formatted = formatCV(cvData);

      cvData.education.forEach(edu => {
        expect(formatted).toContain(edu.degree);
        expect(formatted).toContain(edu.institution);
        expect(formatted).toContain(edu.duration);
      });
    });

    it('should include certifications', () => {
      const formatted = formatCV(cvData);

      cvData.certifications.forEach(cert => {
        expect(formatted).toContain(cert.name);
        expect(formatted).toContain(cert.issuer);
      });
    });

    it('should use XML section tags', () => {
      const formatted = formatCV(cvData);

      expect(formatted).toContain('<personal>');
      expect(formatted).toContain('</personal>');
      expect(formatted).toContain('<experience>');
      expect(formatted).toContain('</experience>');
      expect(formatted).toContain('<skills>');
      expect(formatted).toContain('</skills>');
      expect(formatted).toContain('<education>');
      expect(formatted).toContain('</education>');
      expect(formatted).toContain('<certifications>');
      expect(formatted).toContain('</certifications>');
    });
  });

  describe('createCVContextBlock', () => {
    it('should wrap CV data in alexs_cv tags', () => {
      const contextBlock = createCVContextBlock(cvData);

      expect(contextBlock).toMatch(/^<alexs_cv>/);
      expect(contextBlock).toMatch(/<\/alexs_cv>$/);
      expect(contextBlock).toContain(cvData.personal.title);
    });
  });

  describe('combineSystemPromptWithCV', () => {
    it('should place CV data before system prompt', () => {
      const systemPrompt = 'You are a helpful assistant.';
      const combined = combineSystemPromptWithCV(systemPrompt, cvData);

      expect(combined).toMatch(/^<alexs_cv>/);
      expect(combined).toContain(systemPrompt);
      expect(combined.indexOf('<alexs_cv>')).toBeLessThan(
        combined.indexOf(systemPrompt)
      );
    });

    it('should include both CV data and system prompt', () => {
      const systemPrompt = 'You are a helpful assistant.';
      const combined = combineSystemPromptWithCV(systemPrompt, cvData);

      expect(combined).toContain(cvData.personal.title);
      expect(combined).toContain(systemPrompt);
    });
  });

  describe('Chat Config Integration', () => {
    it('should include CV data in the system prompt', () => {
      const systemPrompt = chatConfig.generation.getSystemPrompt(
        'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );

      expect(systemPrompt).toContain('<alexs_cv>');
      expect(systemPrompt).toContain('</alexs_cv>');
      expect(systemPrompt).toContain(cvData.personal.title);
    });

    it('should include recent work experience in system prompt', () => {
      const systemPrompt = chatConfig.generation.getSystemPrompt(
        'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );

      expect(systemPrompt).toContain(cvData.experience[0].company);
      expect(systemPrompt).toContain(cvData.experience[0].title);
    });

    it('should include technical skills in system prompt', () => {
      const systemPrompt = chatConfig.generation.getSystemPrompt(
        'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );

      expect(systemPrompt).toContain(cvData.skills.technical[0]);
    });

    it('should maintain proper system prompt structure', () => {
      const systemPrompt = chatConfig.generation.getSystemPrompt(
        'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );

      // Should have CV data first, then instructions
      const cvIndex = systemPrompt.indexOf('<alexs_cv>');
      const instructionsStart = systemPrompt.indexOf('You are "chat"');

      expect(cvIndex).toBeGreaterThan(-1);
      expect(instructionsStart).toBeGreaterThan(-1);
      expect(cvIndex).toBeLessThan(instructionsStart);
    });

    it('should include refusal instructions in system prompt', () => {
      const systemPrompt = chatConfig.generation.getSystemPrompt(
        'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );

      expect(systemPrompt).toContain('Rules:');
      expect(systemPrompt).toContain('Answer only from the CV data above');
      expect(systemPrompt).toContain("not covered in Alex's CV");
      expect(systemPrompt).toContain('Do not invent or assume information');
    });

    it('should include full CV with all experience and summary', () => {
      const systemPrompt = chatConfig.generation.getSystemPrompt(
        'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );

      expect(systemPrompt).toContain('<alexs_cv>');
      expect(systemPrompt).toContain(cvData.experience[0].title);
      expect(systemPrompt).toContain(cvData.personal.summary);

      // All positions should be present
      cvData.experience.forEach(exp => {
        expect(systemPrompt).toContain(exp.title);
      });
    });
  });

  describe('Model-Agnostic CV Context', () => {
    it('should produce identical CV context for all models', () => {
      const lfmPrompt = chatConfig.generation.getSystemPrompt(
        'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );
      const qwenPrompt = chatConfig.generation.getSystemPrompt(
        'onnx-community/Qwen3-0.6B-ONNX'
      );

      expect(lfmPrompt).toBe(qwenPrompt);
    });

    it('should include CV tags in both model prompts', () => {
      const qwenPrompt = chatConfig.generation.getSystemPrompt(
        'onnx-community/Qwen3-0.6B-ONNX'
      );
      expect(qwenPrompt).toContain('<alexs_cv>');
      expect(qwenPrompt).toContain('</alexs_cv>');
    });

    it('should provide same CV context for unknown models', () => {
      const knownPrompt = chatConfig.generation.getSystemPrompt(
        'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );
      const unknownPrompt =
        chatConfig.generation.getSystemPrompt('unknown-model-id');

      expect(unknownPrompt).toBe(knownPrompt);
    });
  });
});
