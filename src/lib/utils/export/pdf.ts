import jsPDF from 'jspdf';
import {
  CertificationItem,
  CVData,
  EducationItem,
  ExperienceItem,
} from '../../../config/cv';

// Export CV as PDF (clean markdown-style rendering)
export const exportCVAsPDF = async (
  cvData: CVData,
  filename: string = 'resume.pdf'
) => {
  try {
    // Starting PDF export
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 295;
    let yPosition = 20;
    const margin = 20;
    const lineHeight = 6;

    // Helper function to add text with word wrapping
    const addText = (
      text: string,
      fontSize: number = 12,
      isBold: boolean = false,
      isItalic: boolean = false
    ) => {
      pdf.setFontSize(fontSize);
      // jsPDF doesn't support bold + italic combination, so prioritize bold
      if (isBold && isItalic) {
        pdf.setFont('helvetica', 'bold');
      } else if (isBold) {
        pdf.setFont('helvetica', 'bold');
      } else if (isItalic) {
        pdf.setFont('helvetica', 'italic');
      } else {
        pdf.setFont('helvetica', 'normal');
      }

      const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      });
    };

    // Helper function to add a section header
    const addSectionHeader = (text: string) => {
      yPosition += 5;
      addText(text, 16, true);
      yPosition += 3;
      // Add underline
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;
    };

    // Helper function to add a subsection
    const addSubsection = (text: string) => {
      yPosition += 3;
      addText(text, 14, true);
      yPosition += 2;
    };

    // Header
    addText(cvData.personal.name, 20, true);
    addText(cvData.personal.title, 14, false, true);
    yPosition += 2;
    addText(cvData.personal.location, 10);
    addText(cvData.personal.email, 10);
    addText(cvData.personal.website, 10);
    yPosition += 5;

    // Summary
    addSectionHeader('SUMMARY');
    addText(cvData.personal.summary, 10);

    // Experience
    addSectionHeader('EXPERIENCE');
    cvData.experience.forEach((exp: ExperienceItem) => {
      addSubsection(`${exp.title}, ${exp.company}`);
      addText(`${exp.location} | ${exp.duration}`, 10, false, true);
      yPosition += 2;

      exp.achievements.forEach((achievement: string) => {
        addText(`• ${achievement}`, 10);
      });

      if (exp.skills && exp.skills.length > 0) {
        addText(`Skills: ${exp.skills.join(', ')}`, 9, false, true);
      }
      yPosition += 3;
    });

    // Education
    addSectionHeader('EDUCATION');
    cvData.education.forEach((edu: EducationItem) => {
      addSubsection(edu.degree);
      addText(
        `${edu.institution}, ${edu.location} | ${edu.duration}`,
        10,
        false,
        true
      );
      yPosition += 2;

      if (edu.gpa) {
        addText(`GPA: ${edu.gpa}`, 10);
      }

      if (edu.description) {
        addText(edu.description, 10);
      }

      if (edu.relevantCoursework && edu.relevantCoursework.length > 0) {
        addText(`Relevant Coursework: ${edu.relevantCoursework.join(', ')}`, 9);
      }

      if (edu.achievements && edu.achievements.length > 0) {
        edu.achievements.forEach((achievement: string) => {
          addText(`• ${achievement}`, 10);
        });
      }
      yPosition += 3;
    });

    // Skills
    addSectionHeader('SKILLS');
    addText(`Technical: ${cvData.skills.technical.join(', ')}`, 10);
    addText(`Soft Skills: ${cvData.skills.soft.join(', ')}`, 10);
    if (cvData.skills.languages && cvData.skills.languages.length > 0) {
      addText(`Languages: ${cvData.skills.languages.join(', ')}`, 10);
    }

    // Certifications
    if (cvData.certifications && cvData.certifications.length > 0) {
      addSectionHeader('CERTIFICATIONS');
      cvData.certifications.forEach((cert: CertificationItem) => {
        addText(`• ${cert.name}, ${cert.issuer} (${cert.date})`, 10);
      });
    }

    // Download PDF
    // Saving PDF
    pdf.save(filename);
    // PDF export completed successfully
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
