import { CVData } from '../../config/cv';

/**
 * Formats complete CV data with XML section tags for structured model consumption.
 * Always includes the full CV — at ~1,053 tokens it fits easily in any model's context window.
 */
export function formatCV(cvData: CVData): string {
  const sections: string[] = [];

  // Personal info
  sections.push(`<personal>
**${cvData.personal.name}** - ${cvData.personal.title}
Location: ${cvData.personal.location} | Website: ${cvData.personal.website}
${cvData.personal.summary}
</personal>`);

  // Experience (all positions, top 3 achievements each)
  const expEntries = cvData.experience.map(exp => {
    const achievements = exp.achievements
      .slice(0, 3)
      .map(a => `  - ${a}`)
      .join('\n');
    return `- **${exp.title}** at ${exp.company} (${exp.duration})\n${achievements}`;
  });
  sections.push(`<experience>\n${expEntries.join('\n\n')}\n</experience>`);

  // Skills
  sections.push(`<skills>
**Technical:** ${cvData.skills.technical.join(', ')}
**Leadership:** ${cvData.skills.soft.join(', ')}
</skills>`);

  // Education
  const eduEntries = cvData.education.map(
    edu => `- ${edu.degree} from ${edu.institution} (${edu.duration})`
  );
  sections.push(`<education>\n${eduEntries.join('\n')}\n</education>`);

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
 * Places CV data at the beginning for maximum context.
 */
export function combineSystemPromptWithCV(
  systemPrompt: string,
  cvData: CVData
): string {
  const cvContext = createCVContextBlock(cvData);

  return `${cvContext}

${systemPrompt}`;
}
