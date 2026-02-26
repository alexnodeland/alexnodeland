import { CVData } from '../../config/cv';

/**
 * Formats complete CV data with XML section tags for structured model consumption.
 * Includes all available data — the full CV fits easily in any model's context window.
 */
export function formatCV(cvData: CVData): string {
  const sections: string[] = [];

  // Personal info
  sections.push(`<personal>
**${cvData.personal.name}** - ${cvData.personal.title}
Location: ${cvData.personal.location} | Website: ${cvData.personal.website}
${cvData.personal.summary}
</personal>`);

  // Experience (all positions with achievements and skills)
  const expEntries = cvData.experience.map(exp => {
    const lines: string[] = [
      `- **${exp.title}** at ${exp.company} (${exp.duration})`,
    ];
    const achievements = exp.achievements.slice(0, 3).map(a => `  - ${a}`);
    lines.push(...achievements);
    if (exp.skills && exp.skills.length > 0) {
      lines.push(`  Skills: ${exp.skills.join(', ')}`);
    }
    return lines.join('\n');
  });
  sections.push(`<experience>\n${expEntries.join('\n\n')}\n</experience>`);

  // Skills
  const skillLines = [
    `**Technical:** ${cvData.skills.technical.join(', ')}`,
    `**Leadership:** ${cvData.skills.soft.join(', ')}`,
  ];
  if (cvData.skills.languages && cvData.skills.languages.length > 0) {
    skillLines.push(`**Languages:** ${cvData.skills.languages.join(', ')}`);
  }
  sections.push(`<skills>\n${skillLines.join('\n')}\n</skills>`);

  // Education (with descriptions, coursework, and achievements)
  const eduEntries = cvData.education.map(edu => {
    const lines: string[] = [
      `- ${edu.degree} from ${edu.institution} (${edu.duration})`,
    ];
    if (edu.description) {
      lines.push(`  ${edu.description}`);
    }
    if (edu.relevantCoursework && edu.relevantCoursework.length > 0) {
      lines.push(`  Coursework: ${edu.relevantCoursework.join(', ')}`);
    }
    if (edu.achievements && edu.achievements.length > 0) {
      edu.achievements.forEach(a => lines.push(`  - ${a}`));
    }
    return lines.join('\n');
  });
  sections.push(`<education>\n${eduEntries.join('\n\n')}\n</education>`);

  // Certifications
  if (cvData.certifications.length > 0) {
    const certEntries = cvData.certifications.map(
      c => `- ${c.name} (${c.issuer}, ${c.date})`
    );
    sections.push(
      `<certifications>\n${certEntries.join('\n')}\n</certifications>`
    );
  }

  return sections.join('\n\n');
}

/**
 * Creates the complete CV context block for system prompts.
 * Wraps the full CV in <alexs_cv> tags.
 */
export function createCVContextBlock(cvData: CVData): string {
  return `<alexs_cv>\n${formatCV(cvData)}\n</alexs_cv>`;
}

/**
 * Combines CV context with a system prompt.
 * Places CV data at the beginning, with instructions following.
 */
export function combineSystemPromptWithCV(
  systemPrompt: string,
  cvData: CVData
): string {
  const cvContext = createCVContextBlock(cvData);

  return `${cvContext}

${systemPrompt}`;
}
