import { CVData } from '../../config/cv';

export type CVContextLevel = 'concise' | 'medium' | 'full';

/**
 * Formats CV data for inclusion in system prompts - CONCISE version
 * Minimal context for small models with limited context windows
 */
export function formatCVConcise(cvData: CVData): string {
  const sections: string[] = [];

  // Essential personal info only
  sections.push(`**Alex Nodeland** - ${cvData.personal.title}`);
  sections.push(
    `Location: ${cvData.personal.location} | Website: ${cvData.personal.website}`
  );

  // Only current position
  const currentRole = cvData.experience[0];
  sections.push(
    `**Current Role:** ${currentRole.title} at ${currentRole.company} (${currentRole.duration})`
  );

  // Top 5 technical skills
  const topSkills = cvData.skills.technical.slice(0, 5);
  sections.push(`**Key Skills:** ${topSkills.join(', ')}`);

  // Latest education only
  sections.push(
    `**Education:** ${cvData.education[0].degree} from ${cvData.education[0].institution}`
  );

  return sections.join('\n');
}

/**
 * Formats CV data for inclusion in system prompts - MEDIUM version
 * Balanced context for medium-sized models
 */
export function formatCVMedium(cvData: CVData): string {
  const sections: string[] = [];

  // Personal Information (brief)
  sections.push(`**Personal Information:**
- Name: ${cvData.personal.name}
- Title: ${cvData.personal.title}
- Location: ${cvData.personal.location}
- Website: ${cvData.personal.website}`);

  // Recent experience (top 3 positions)
  const recentExperience = cvData.experience.slice(0, 3);
  sections.push(`**Recent Experience:**`);
  recentExperience.forEach(exp => {
    // Limit achievements to top 2 for medium version
    const topAchievements = exp.achievements.slice(0, 2);
    sections.push(`
- **${exp.title}** at ${exp.company} (${exp.duration})
  - Location: ${exp.location}
  - Key achievements: ${topAchievements.map(a => `• ${a}`).join('\n    ')}`);
  });

  // Skills (limited)
  const topTechnicalSkills = cvData.skills.technical.slice(0, 10);
  const topSoftSkills = cvData.skills.soft.slice(0, 5);
  sections.push(`**Technical Skills:** ${topTechnicalSkills.join(', ')}`);
  sections.push(`**Leadership Skills:** ${topSoftSkills.join(', ')}`);

  // Education
  sections.push(`**Education:**`);
  cvData.education.forEach(edu => {
    sections.push(`- ${edu.degree} from ${edu.institution} (${edu.duration})`);
  });

  return sections.join('\n\n');
}

/**
 * Formats CV data for inclusion in system prompts - FULL version
 * Complete context for large models with extensive context windows
 */
export function formatCVFull(cvData: CVData): string {
  const sections: string[] = [];

  // Personal Information
  sections.push(`**Personal Information:**
- Name: ${cvData.personal.name}
- Title: ${cvData.personal.title}
- Email: ${cvData.personal.email}
- Location: ${cvData.personal.location}
- Website: ${cvData.personal.website}
- Summary: ${cvData.personal.summary}`);

  // Experience (include all positions)
  sections.push(`**Experience:**`);
  cvData.experience.forEach(exp => {
    sections.push(`
- **${exp.title}** at ${exp.company} (${exp.duration})
  - Location: ${exp.location}
  - Key achievements: ${exp.achievements.map(a => `• ${a}`).join('\n    ')}`);
  });

  // Skills
  sections.push(`**Technical Skills:**
- ${cvData.skills.technical.join(', ')}`);

  sections.push(`**Soft Skills:**
- ${cvData.skills.soft.join(', ')}`);

  // Education
  sections.push(`**Education:**`);
  cvData.education.forEach(edu => {
    sections.push(`- ${edu.degree} from ${edu.institution} (${edu.duration})`);
  });

  // Certifications
  if (cvData.certifications.length > 0) {
    sections.push(`**Certifications:**`);
    cvData.certifications.forEach(cert => {
      sections.push(`- ${cert.name} from ${cert.issuer} (${cert.date})`);
    });
  }

  return sections.join('\n\n');
}

/**
 * Main CV formatting function that delegates to appropriate level
 */
export function formatCVForSystemPrompt(
  cvData: CVData,
  level: CVContextLevel = 'full'
): string {
  switch (level) {
    case 'concise':
      return formatCVConcise(cvData);
    case 'medium':
      return formatCVMedium(cvData);
    case 'full':
    default:
      return formatCVFull(cvData);
  }
}

/**
 * Creates the complete CV context block for system prompts
 * Wraps the formatted CV data in appropriate tags
 */
export function createCVContextBlock(
  cvData: CVData,
  level: CVContextLevel = 'full'
): string {
  const formattedCV = formatCVForSystemPrompt(cvData, level);

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
  level: CVContextLevel = 'full'
): string {
  const cvContext = createCVContextBlock(cvData, level);

  return `${cvContext}

${systemPrompt}`;
}
