import { CVData } from '../../config/cv';
import { estimateTokens } from './chat';

/**
 * Formats CV data to fit within a token budget.
 * Progressively includes sections in priority order:
 *   1. Personal essentials (name, title, location, website)
 *   2. Current role headline
 *   3. Top 5 skills
 *   4. Latest education
 *   5. Personal summary
 *   6. Additional experience (expanding from top to bottom)
 *   7. Additional skills
 *   8. Certifications
 *
 * Stops adding content once the next section would exceed the budget.
 */
export function formatCVWithBudget(
  cvData: CVData,
  tokenBudget: number
): string {
  const sections: string[] = [];
  let currentTokens = 0;

  const tryAdd = (text: string): boolean => {
    const tokens = estimateTokens(text);
    if (currentTokens + tokens > tokenBudget) {
      return false;
    }
    sections.push(text);
    currentTokens += tokens;
    return true;
  };

  // Priority 1: Personal essentials (always include)
  tryAdd(
    `**Alex Nodeland** - ${cvData.personal.title}\nLocation: ${cvData.personal.location} | Website: ${cvData.personal.website}`
  );

  // Priority 2: Current role headline
  const currentRole = cvData.experience[0];
  if (currentRole) {
    tryAdd(
      `**Current Role:** ${currentRole.title} at ${currentRole.company} (${currentRole.duration})`
    );
  }

  // Priority 3: Top 5 technical skills
  const topSkills = cvData.skills.technical.slice(0, 5);
  tryAdd(`**Key Skills:** ${topSkills.join(', ')}`);

  // Priority 4: Latest education
  if (cvData.education[0]) {
    tryAdd(
      `**Education:** ${cvData.education[0].degree} from ${cvData.education[0].institution}`
    );
  }

  // Priority 5: Personal summary
  if (cvData.personal.summary) {
    tryAdd(`**Summary:** ${cvData.personal.summary}`);
  }

  // Priority 6: Additional experience (positions 1..N, each with top 2 achievements)
  for (let i = 1; i < cvData.experience.length; i++) {
    const exp = cvData.experience[i];
    const topAchievements = exp.achievements.slice(0, 2);
    const expText = `- **${exp.title}** at ${exp.company} (${exp.duration})\n  Location: ${exp.location}\n  ${topAchievements.map(a => `- ${a}`).join('\n  ')}`;
    if (!tryAdd(expText)) break;
  }

  // Priority 7: Remaining technical + soft skills
  const remainingTechnical = cvData.skills.technical.slice(5);
  if (remainingTechnical.length > 0) {
    tryAdd(`**Additional Technical Skills:** ${remainingTechnical.join(', ')}`);
  }
  if (cvData.skills.soft.length > 0) {
    tryAdd(`**Leadership Skills:** ${cvData.skills.soft.join(', ')}`);
  }

  // Priority 8: Certifications
  if (cvData.certifications.length > 0) {
    const certText = cvData.certifications
      .map(c => `- ${c.name} (${c.issuer}, ${c.date})`)
      .join('\n');
    tryAdd(`**Certifications:**\n${certText}`);
  }

  return sections.join('\n\n');
}

/**
 * Creates the complete CV context block for system prompts
 * Wraps the formatted CV data in appropriate tags
 */
export function createCVContextBlock(
  cvData: CVData,
  tokenBudget: number = 1200
): string {
  const formattedCV = formatCVWithBudget(cvData, tokenBudget);

  return `<alexs_cv>
${formattedCV}
</alexs_cv>`;
}

/**
 * Combines CV context with a system prompt
 * Places CV data at the beginning for maximum context
 */
export function combineSystemPromptWithCV(
  systemPrompt: string,
  cvData: CVData,
  tokenBudget: number = 1200
): string {
  const cvContext = createCVContextBlock(cvData, tokenBudget);

  return `${cvContext}

${systemPrompt}`;
}

// --- Deprecated wrappers for backward compatibility ---

/** @deprecated Use formatCVWithBudget instead */
export type CVContextLevel = 'concise' | 'medium' | 'full';

/** @deprecated Use formatCVWithBudget instead */
export function formatCVConcise(cvData: CVData): string {
  return formatCVWithBudget(cvData, 200);
}

/** @deprecated Use formatCVWithBudget instead */
export function formatCVMedium(cvData: CVData): string {
  return formatCVWithBudget(cvData, 800);
}

/** @deprecated Use formatCVWithBudget instead */
export function formatCVFull(cvData: CVData): string {
  return formatCVWithBudget(cvData, 3000);
}

/** @deprecated Use formatCVWithBudget instead */
export function formatCVForSystemPrompt(
  cvData: CVData,
  level: CVContextLevel = 'full'
): string {
  const budgetMap: Record<CVContextLevel, number> = {
    concise: 200,
    medium: 800,
    full: 3000,
  };
  return formatCVWithBudget(cvData, budgetMap[level]);
}
