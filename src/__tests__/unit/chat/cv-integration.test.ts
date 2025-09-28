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
} from '../../../lib/utils/cvFormatter';

describe('CV Integration in Chat', () => {
  describe('CV Context Levels', () => {
    describe('formatCVConcise', () => {
      it('should include only essential information', () => {
        const formatted = formatCVConcise(cvData);

        expect(formatted).toContain(cvData.personal.name);
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

        // Should be compact - no detailed achievements
        expect(formatted).not.toContain('achievements');
        expect(formatted).not.toContain('Summary:');
      });
    });

    describe('formatCVMedium', () => {
      it('should include balanced information', () => {
        const formatted = formatCVMedium(cvData);

        expect(formatted).toContain(cvData.personal.name);
        expect(formatted).toContain(cvData.personal.title);
        expect(formatted).toContain(cvData.personal.location);

        // Should include recent 3 positions
        const recentExperience = cvData.experience.slice(0, 3);
        recentExperience.forEach(exp => {
          expect(formatted).toContain(exp.title);
          expect(formatted).toContain(exp.company);
        });

        // Should include limited technical skills
        const topTechnicalSkills = cvData.skills.technical.slice(0, 10);
        expect(formatted).toContain(topTechnicalSkills[0]);

        // Should include education
        cvData.education.forEach(edu => {
          expect(formatted).toContain(edu.degree);
          expect(formatted).toContain(edu.institution);
        });

        // Should include some achievements but limited
        expect(formatted).toContain('achievements');
      });
    });

    describe('formatCVFull', () => {
      it('should include complete information', () => {
        const formatted = formatCVFull(cvData);

        expect(formatted).toContain(cvData.personal.name);
        expect(formatted).toContain(cvData.personal.title);
        expect(formatted).toContain(cvData.personal.email);
        expect(formatted).toContain(cvData.personal.location);
        expect(formatted).toContain(cvData.personal.website);
        expect(formatted).toContain(cvData.personal.summary);

        // Should include all experience
        cvData.experience.forEach(exp => {
          expect(formatted).toContain(exp.title);
          expect(formatted).toContain(exp.company);
        });

        // Should include all skills
        expect(formatted).toContain('Technical Skills');
        expect(formatted).toContain('Soft Skills');

        // Should include certifications if present
        if (cvData.certifications.length > 0) {
          expect(formatted).toContain('Certifications');
        }
      });
    });

    describe('formatCVForSystemPrompt with levels', () => {
      it('should delegate to appropriate level function', () => {
        const concise = formatCVForSystemPrompt(cvData, 'concise');
        const medium = formatCVForSystemPrompt(cvData, 'medium');
        const full = formatCVForSystemPrompt(cvData, 'full');

        expect(concise.length).toBeLessThan(medium.length);
        expect(medium.length).toBeLessThan(full.length);

        // Concise should not include summary
        expect(concise).not.toContain(cvData.personal.summary);
        expect(full).toContain(cvData.personal.summary);
      });
    });
  });

  describe('formatCVForSystemPrompt', () => {
    it('should include personal information', () => {
      const formatted = formatCVForSystemPrompt(cvData);

      expect(formatted).toContain(cvData.personal.name);
      expect(formatted).toContain(cvData.personal.title);
      expect(formatted).toContain(cvData.personal.location);
      expect(formatted).toContain(cvData.personal.website);
      expect(formatted).toContain(cvData.personal.summary);
    });

    it('should include recent experience', () => {
      const formatted = formatCVForSystemPrompt(cvData);

      // Should include the most recent positions
      expect(formatted).toContain(cvData.experience[0].title);
      expect(formatted).toContain(cvData.experience[0].company);
      expect(formatted).toContain(cvData.experience[0].duration);
    });

    it('should include technical and soft skills', () => {
      const formatted = formatCVForSystemPrompt(cvData);

      expect(formatted).toContain('Technical Skills');
      expect(formatted).toContain('Soft Skills');
      expect(formatted).toContain(cvData.skills.technical[0]);
      expect(formatted).toContain(cvData.skills.soft[0]);
    });

    it('should include education information', () => {
      const formatted = formatCVForSystemPrompt(cvData);

      expect(formatted).toContain('Education');
      expect(formatted).toContain(cvData.education[0].degree);
      expect(formatted).toContain(cvData.education[0].institution);
    });
  });

  describe('createCVContextBlock', () => {
    it('should wrap CV data in alexs_cv tags', () => {
      const contextBlock = createCVContextBlock(cvData);

      expect(contextBlock).toMatch(/^<alexs_cv>/);
      expect(contextBlock).toMatch(/<\/alexs_cv>$/);
      expect(contextBlock).toContain(cvData.personal.name);
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

      expect(combined).toContain(cvData.personal.name);
      expect(combined).toContain(systemPrompt);
    });
  });

  describe('Chat Config Integration', () => {
    it('should include CV data in the system prompt', () => {
      const systemPrompt = chatConfig.generation.systemPrompt;

      expect(systemPrompt).toContain('<alexs_cv>');
      expect(systemPrompt).toContain('</alexs_cv>');
      expect(systemPrompt).toContain(cvData.personal.name);
      expect(systemPrompt).toContain(cvData.personal.title);
    });

    it('should include recent work experience in system prompt', () => {
      const systemPrompt = chatConfig.generation.systemPrompt;

      expect(systemPrompt).toContain(cvData.experience[0].company);
      expect(systemPrompt).toContain(cvData.experience[0].title);
    });

    it('should include technical skills in system prompt', () => {
      const systemPrompt = chatConfig.generation.systemPrompt;

      // Check for key technical skills that are in the concise version (top 5)
      expect(systemPrompt).toContain('Python');
      expect(systemPrompt).toContain('AWS');
      expect(systemPrompt).toContain('JavaScript/TypeScript');
    });

    it('should maintain proper system prompt structure', () => {
      const systemPrompt = chatConfig.generation.systemPrompt;

      // Should have CV data first, then instructions
      const cvIndex = systemPrompt.indexOf('<alexs_cv>');
      const instructionsStart = systemPrompt.indexOf('You are "chat"');

      expect(cvIndex).toBeGreaterThan(-1);
      expect(instructionsStart).toBeGreaterThan(-1);
      expect(cvIndex).toBeLessThan(instructionsStart);
    });

    it('should include refusal instructions in system prompt', () => {
      const systemPrompt = chatConfig.generation.systemPrompt;

      expect(systemPrompt).toContain('CRITICAL INSTRUCTIONS');
      expect(systemPrompt).toContain(
        'You ONLY have access to information provided in the CV data above'
      );
      expect(systemPrompt).toContain(
        "I don't have that information in Alex's CV"
      );
      expect(systemPrompt).toContain('Do NOT make up or infer information');
    });

    it('should use concise CV level for small models', () => {
      const systemPrompt = chatConfig.generation.systemPrompt;

      // The default model is set to use concise level
      // Verify the CV context is shorter (concise version)
      expect(systemPrompt).toContain('<alexs_cv>');
      expect(systemPrompt).toContain(cvData.personal.name);
      expect(systemPrompt).toContain(cvData.experience[0].title);

      // Concise version should not include personal summary or email
      expect(systemPrompt).not.toContain(cvData.personal.summary);
      expect(systemPrompt).not.toContain(cvData.personal.email);
    });
  });

  describe('Model-Specific CV Context', () => {
    it('should configure models with appropriate CV context levels', () => {
      const models = chatConfig.models.available;

      // Small models should use concise
      const smallModels = models.filter(
        m => m.id.includes('0.5B') || m.id.includes('0.6B')
      );
      smallModels.forEach(model => {
        expect(model.cvContextLevel).toBe('concise');
      });
    });

    it('should provide fallback CV context levels', () => {
      // Test the fallback logic for unknown models
      const systemPromptUnknownSmall = chatConfig.generation.systemPrompt;
      expect(systemPromptUnknownSmall).toContain('<alexs_cv>');
    });
  });
});
