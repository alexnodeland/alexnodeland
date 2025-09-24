import {
  CertificationItem,
  CVData,
  EducationItem,
  ExperienceItem,
} from '../../../config/cv';

// Export resume as Markdown
export const exportCVAsMarkdown = (cvData: CVData): string => {
  let markdown = `# ${cvData.personal.name}\n`;
  markdown += `## ${cvData.personal.title}\n\n`;

  // Contact information
  markdown += `**Location:** ${cvData.personal.location}\n`;
  markdown += `**Email:** ${cvData.personal.email}\n`;
  markdown += `**Website:** ${cvData.personal.website}\n`;
  if (cvData.personal.phone) {
    markdown += `**Phone:** ${cvData.personal.phone}\n`;
  }
  markdown += `\n## Summary\n\n${cvData.personal.summary}\n\n`;

  // Experience
  markdown += `## Experience\n\n`;
  cvData.experience.forEach((exp: ExperienceItem) => {
    markdown += `### ${exp.title}, ${exp.company}\n`;
    markdown += `**${exp.location}** | ${exp.duration}\n\n`;
    if (exp.description) {
      markdown += `${exp.description}\n\n`;
    }
    markdown += `**Key Achievements:**\n`;
    exp.achievements.forEach((achievement: string) => {
      markdown += `- ${achievement}\n`;
    });
    if (exp.skills && exp.skills.length > 0) {
      markdown += `\n**Key Skills:** ${exp.skills.join(', ')}\n`;
    }
    markdown += `\n`;
  });

  // Education
  markdown += `## Education\n\n`;
  cvData.education.forEach((edu: EducationItem) => {
    markdown += `### ${edu.degree}\n`;
    markdown += `**${edu.institution}**, ${edu.location} | ${edu.duration}\n\n`;
    if (edu.gpa) {
      markdown += `**GPA:** ${edu.gpa}\n\n`;
    }
    if (edu.description) {
      markdown += `${edu.description}\n\n`;
    }
    if (edu.relevantCoursework && edu.relevantCoursework.length > 0) {
      markdown += `**Relevant Coursework:** ${edu.relevantCoursework.join(', ')}\n\n`;
    }
    if (edu.achievements && edu.achievements.length > 0) {
      markdown += `**Achievements:**\n`;
      edu.achievements.forEach((achievement: string) => {
        markdown += `- ${achievement}\n`;
      });
      markdown += `\n`;
    }
  });

  // Certifications
  if (cvData.certifications && cvData.certifications.length > 0) {
    markdown += `## Certifications\n\n`;
    cvData.certifications.forEach((cert: CertificationItem) => {
      markdown += `- **${cert.name}**, ${cert.issuer} (${cert.date})\n`;
    });
    markdown += `\n`;
  }

  // Skills
  markdown += `## Skills\n\n`;
  markdown += `### Technical Skills\n`;
  markdown += cvData.skills.technical.join(', ') + `\n\n`;
  markdown += `### Soft Skills\n`;
  markdown += cvData.skills.soft.join(', ') + `\n\n`;
  if (cvData.skills.languages && cvData.skills.languages.length > 0) {
    markdown += `### Languages\n`;
    markdown += cvData.skills.languages.join(', ') + `\n\n`;
  }

  return markdown;
};
