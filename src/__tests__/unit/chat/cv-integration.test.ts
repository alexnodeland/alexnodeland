/**
 * Tests for CV data integration in chat system
 */

import { chatConfig } from '../../../config/chat';
import { cvData } from '../../../config/cv';
import {
  combineSystemPromptWithCV,
  createCVContextBlock,
  formatCVConcise,
  formatCVForSystemPrompt,
  formatCVFull,
  formatCVMedium,
  formatCVWithBudget,
} from '../../../lib/utils/cvFormatter';

describe('CV Integration in Chat', () => {
  describe('Token-Budget CV Formatting', () => {
    describe('formatCVWithBudget', () => {
      it('should include personal essentials at any budget', () => {
        const formatted = formatCVWithBudget(cvData, 50);
        expect(formatted).toContain(cvData.personal.title);
      });

      it('should include more content at higher budgets', () => {
        const small = formatCVWithBudget(cvData, 200);
        const large = formatCVWithBudget(cvData, 2000);
        expect(large.length).toBeGreaterThan(small.length);
      });

      it('should include current role at moderate budget', () => {
        const formatted = formatCVWithBudget(cvData, 400);
        expect(formatted).toContain(cvData.experience[0].title);
        expect(formatted).toContain(cvData.experience[0].company);
      });

      it('should include summary at higher budget', () => {
        const formatted = formatCVWithBudget(cvData, 800);
        expect(formatted).toContain(cvData.personal.summary);
      });

      it('should not exceed token budget significantly', () => {
        const budget = 300;
        const formatted = formatCVWithBudget(cvData, budget);
        const tokens = Math.ceil(formatted.length / 4);
        // Allow margin since sections are added atomically
        expect(tokens).toBeLessThanOrEqual(budget + 100);
      });
    });
  });

  describe('CV Context Levels (deprecated wrappers)', () => {
    describe('formatCVConcise', () => {
      it('should include only essential information', () => {
        const formatted = formatCVConcise(cvData);

        expect(formatted).toContain(cvData.personal.title);
        expect(formatted).toContain(cvData.personal.location);
        expect(formatted).toContain(cvData.personal.website);

        // Should include current role
        expect(formatted).toContain(cvData.experience[0].title);
        expect(formatted).toContain(cvData.experience[0].company);

        // Should include top 5 skills only
        const topSkills = cvData.skills.technical.slice(0, 5);
        topSkills.forEach(skill => {
          expect(formatted).toContain(skill);
        });

        // Should include latest education
        expect(formatted).toContain(cvData.education[0].degree);
        expect(formatted).toContain(cvData.education[0].institution);
      });
    });

    describe('formatCVMedium', () => {
      it('should include balanced information', () => {
        const formatted = formatCVMedium(cvData);

        expect(formatted).toContain(cvData.personal.title);
        expect(formatted).toContain(cvData.personal.location);

        // Should include current role
        expect(formatted).toContain(cvData.experience[0].title);
        expect(formatted).toContain(cvData.experience[0].company);
      });
    });

    describe('formatCVFull', () => {
      it('should include complete information', () => {
        const formatted = formatCVFull(cvData);

        expect(formatted).toContain(cvData.personal.title);
        expect(formatted).toContain(cvData.personal.location);
        expect(formatted).toContain(cvData.personal.website);
        expect(formatted).toContain(cvData.personal.summary);

        // Should include all experience
        cvData.experience.forEach(exp => {
          expect(formatted).toContain(exp.title);
          expect(formatted).toContain(exp.company);
        });
      });
    });

    describe('formatCVForSystemPrompt with levels', () => {
      it('should delegate to appropriate level function', () => {
        const concise = formatCVForSystemPrompt(cvData, 'concise');
        const medium = formatCVForSystemPrompt(cvData, 'medium');
        const full = formatCVForSystemPrompt(cvData, 'full');

        expect(concise.length).toBeLessThan(medium.length);
        expect(medium.length).toBeLessThan(full.length);
      });
    });
  });

  describe('formatCVForSystemPrompt', () => {
    it('should include personal information', () => {
      const formatted = formatCVForSystemPrompt(cvData);

      expect(formatted).toContain(cvData.personal.title);
      expect(formatted).toContain(cvData.personal.location);
      expect(formatted).toContain(cvData.personal.website);
      expect(formatted).toContain(cvData.personal.summary);
    });

    it('should include recent experience', () => {
      const formatted = formatCVForSystemPrompt(cvData);

      expect(formatted).toContain(cvData.experience[0].title);
      expect(formatted).toContain(cvData.experience[0].company);
      expect(formatted).toContain(cvData.experience[0].duration);
    });

    it('should include skills', () => {
      const formatted = formatCVForSystemPrompt(cvData);

      expect(formatted).toContain(cvData.skills.technical[0]);
    });

    it('should include education information', () => {
      const formatted = formatCVForSystemPrompt(cvData);

      expect(formatted).toContain(cvData.education[0].degree);
      expect(formatted).toContain(cvData.education[0].institution);
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

    it('should format CV based on token budget for the default model', () => {
      const systemPrompt = chatConfig.generation.getSystemPrompt(
        'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );

      expect(systemPrompt).toContain('<alexs_cv>');
      expect(systemPrompt).toContain(cvData.experience[0].title);
      // Budget-based formatting includes summary (budget=1200 is generous)
      expect(systemPrompt).toContain(cvData.personal.summary);
    });
  });

  describe('Model-Specific CV Context', () => {
    it('should produce longer CV context for LFM than Qwen', () => {
      const lfmPrompt = chatConfig.generation.getSystemPrompt(
        'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );
      const qwenPrompt = chatConfig.generation.getSystemPrompt(
        'onnx-community/Qwen3-0.6B-ONNX'
      );
      // LFM has cvTokenBudget 1200, Qwen has 600
      expect(lfmPrompt.length).toBeGreaterThan(qwenPrompt.length);
    });

    it('should include CV tags in both model prompts', () => {
      const qwenPrompt = chatConfig.generation.getSystemPrompt(
        'onnx-community/Qwen3-0.6B-ONNX'
      );
      expect(qwenPrompt).toContain('<alexs_cv>');
      expect(qwenPrompt).toContain('</alexs_cv>');
    });

    it('should provide fallback CV context for unknown models', () => {
      // Unknown model falls back to default budget of 1200
      const unknownPrompt =
        chatConfig.generation.getSystemPrompt('unknown-model-id');
      expect(unknownPrompt).toContain('<alexs_cv>');
    });
  });
});
