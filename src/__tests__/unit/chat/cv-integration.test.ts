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

    it('should include per-role skills when available', () => {
      const formatted = formatCV(cvData);

      // First experience entry has skills
      const firstWithSkills = cvData.experience.find(
        exp => exp.skills && exp.skills.length > 0
      );
      if (firstWithSkills && firstWithSkills.skills) {
        firstWithSkills.skills.forEach(skill => {
          expect(formatted).toContain(skill);
        });
      }
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

    it('should include languages when available', () => {
      const formatted = formatCV(cvData);

      if (cvData.skills.languages && cvData.skills.languages.length > 0) {
        cvData.skills.languages.forEach(lang => {
          expect(formatted).toContain(lang);
        });
      }
    });

    it('should include all education entries with details', () => {
      const formatted = formatCV(cvData);

      cvData.education.forEach(edu => {
        expect(formatted).toContain(edu.degree);
        expect(formatted).toContain(edu.institution);
        expect(formatted).toContain(edu.duration);

        if (edu.description) {
          expect(formatted).toContain(edu.description);
        }
        if (edu.relevantCoursework && edu.relevantCoursework.length > 0) {
          edu.relevantCoursework.forEach(course => {
            expect(formatted).toContain(course);
          });
        }
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

    it('should include rules and grounding constraints', () => {
      const systemPrompt = chatConfig.generation.getSystemPrompt(
        'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );

      expect(systemPrompt).toContain('Rules:');
      expect(systemPrompt).toContain('Answer ONLY from the <alexs_cv> data');
      expect(systemPrompt).toContain("not in Alex's CV");
      expect(systemPrompt).toContain('Never invent or assume facts');
    });

    it('should include few-shot examples', () => {
      const systemPrompt = chatConfig.generation.getSystemPrompt(
        'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );

      expect(systemPrompt).toContain('Examples:');
      expect(systemPrompt).toContain('User:');
      expect(systemPrompt).toContain('Assistant:');
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

    it('should reinforce grounding constraint at end of prompt', () => {
      const systemPrompt = chatConfig.generation.getSystemPrompt(
        'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );

      expect(systemPrompt).toMatch(/answer ONLY from the CV data above\.$/);
    });
  });

  describe('Model-Specific Prompting', () => {
    it('should produce identical CV context for all models', () => {
      const lfmPrompt = chatConfig.generation.getSystemPrompt(
        'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );
      const qwenPrompt = chatConfig.generation.getSystemPrompt(
        'onnx-community/Qwen3-0.6B-ONNX'
      );

      // CV data should be identical
      const lfmCV = lfmPrompt.match(/<alexs_cv>[\s\S]*<\/alexs_cv>/)?.[0];
      const qwenCV = qwenPrompt.match(/<alexs_cv>[\s\S]*<\/alexs_cv>/)?.[0];
      expect(lfmCV).toBe(qwenCV);
    });

    it('should use different suffixes per model', () => {
      const lfmPrompt = chatConfig.generation.getSystemPrompt(
        'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );
      const qwenPrompt = chatConfig.generation.getSystemPrompt(
        'onnx-community/Qwen3-0.6B-ONNX'
      );

      expect(lfmPrompt).not.toBe(qwenPrompt);
    });

    it('should include thinking guidance for LFM', () => {
      const lfmPrompt = chatConfig.generation.getSystemPrompt(
        'LiquidAI/LFM2.5-1.2B-Thinking-ONNX'
      );

      expect(lfmPrompt).toContain('identify which CV section');
    });

    it('should include conciseness constraint for Qwen', () => {
      const qwenPrompt = chatConfig.generation.getSystemPrompt(
        'onnx-community/Qwen3-0.6B-ONNX'
      );

      expect(qwenPrompt).toContain('1-3 sentences');
    });

    it('should include CV tags in both model prompts', () => {
      const qwenPrompt = chatConfig.generation.getSystemPrompt(
        'onnx-community/Qwen3-0.6B-ONNX'
      );
      expect(qwenPrompt).toContain('<alexs_cv>');
      expect(qwenPrompt).toContain('</alexs_cv>');
    });

    it('should use Qwen suffix for unknown models', () => {
      const qwenPrompt = chatConfig.generation.getSystemPrompt(
        'onnx-community/Qwen3-0.6B-ONNX'
      );
      const unknownPrompt =
        chatConfig.generation.getSystemPrompt('unknown-model-id');

      expect(unknownPrompt).toBe(qwenPrompt);
    });
  });
});
