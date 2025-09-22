import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'
import { ResumeData } from '../config/resume'

// Export resume as PDF (clean markdown-style rendering)
export const exportResumeAsPDF = async (resumeData: ResumeData, filename: string = 'resume.pdf') => {
  try {
    console.log('Starting PDF export...', { resumeData: resumeData.personal.name, filename })
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = 210
    const pageHeight = 295
    let yPosition = 20
    const margin = 20
    const lineHeight = 6
    const fontSize = 12

    // Helper function to add text with word wrapping
    const addText = (text: string, fontSize: number = 12, isBold: boolean = false, isItalic: boolean = false) => {
      pdf.setFontSize(fontSize)
      // jsPDF doesn't support bold + italic combination, so prioritize bold
      if (isBold && isItalic) {
        pdf.setFont('helvetica', 'bold')
      } else if (isBold) {
        pdf.setFont('helvetica', 'bold')
      } else if (isItalic) {
        pdf.setFont('helvetica', 'italic')
      } else {
        pdf.setFont('helvetica', 'normal')
      }
      
      const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin)
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage()
          yPosition = 20
        }
        pdf.text(line, margin, yPosition)
        yPosition += lineHeight
      })
    }

    // Helper function to add a section header
    const addSectionHeader = (text: string) => {
      yPosition += 5
      addText(text, 16, true)
      yPosition += 3
      // Add underline
      pdf.setLineWidth(0.5)
      pdf.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += 5
    }

    // Helper function to add a subsection
    const addSubsection = (text: string) => {
      yPosition += 3
      addText(text, 14, true)
      yPosition += 2
    }

    // Header
    addText(resumeData.personal.name, 20, true)
    addText(resumeData.personal.title, 14, false, true)
    yPosition += 2
    addText(resumeData.personal.location, 10)
    addText(resumeData.personal.email, 10)
    addText(resumeData.personal.website, 10)
    yPosition += 5

    // Summary
    addSectionHeader('SUMMARY')
    addText(resumeData.personal.summary, 10)

    // Experience
    addSectionHeader('EXPERIENCE')
    resumeData.experience.forEach(exp => {
      addSubsection(`${exp.title}, ${exp.company}`)
      addText(`${exp.location} | ${exp.duration}`, 10, false, true)
      yPosition += 2
      
      exp.achievements.forEach(achievement => {
        addText(`• ${achievement}`, 10)
      })
      
      if (exp.skills && exp.skills.length > 0) {
        addText(`Skills: ${exp.skills.join(', ')}`, 9, false, true)
      }
      yPosition += 3
    })

    // Education
    addSectionHeader('EDUCATION')
    resumeData.education.forEach(edu => {
      addSubsection(edu.degree)
      addText(`${edu.institution}, ${edu.location} | ${edu.duration}`, 10, false, true)
      yPosition += 2
      
      if (edu.gpa) {
        addText(`GPA: ${edu.gpa}`, 10)
      }
      
      if (edu.description) {
        addText(edu.description, 10)
      }
      
      if (edu.relevantCoursework && edu.relevantCoursework.length > 0) {
        addText(`Relevant Coursework: ${edu.relevantCoursework.join(', ')}`, 9)
      }
      
      if (edu.achievements && edu.achievements.length > 0) {
        edu.achievements.forEach(achievement => {
          addText(`• ${achievement}`, 10)
        })
      }
      yPosition += 3
    })

    // Skills
    addSectionHeader('SKILLS')
    addText(`Technical: ${resumeData.skills.technical.join(', ')}`, 10)
    addText(`Soft Skills: ${resumeData.skills.soft.join(', ')}`, 10)
    if (resumeData.skills.languages && resumeData.skills.languages.length > 0) {
      addText(`Languages: ${resumeData.skills.languages.join(', ')}`, 10)
    }

    // Certifications
    if (resumeData.certifications && resumeData.certifications.length > 0) {
      addSectionHeader('CERTIFICATIONS')
      resumeData.certifications.forEach(cert => {
        addText(`• ${cert.name}, ${cert.issuer} (${cert.date})`, 10)
      })
    }

    // Download PDF
    console.log('Saving PDF...', filename)
    pdf.save(filename)
    console.log('PDF export completed successfully')
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}

// Export resume as Markdown
export const exportResumeAsMarkdown = (resumeData: ResumeData): string => {
  let markdown = `# ${resumeData.personal.name}\n`
  markdown += `## ${resumeData.personal.title}\n\n`
  
  // Contact information
  markdown += `**Location:** ${resumeData.personal.location}\n`
  markdown += `**Email:** ${resumeData.personal.email}\n`
  markdown += `**Website:** ${resumeData.personal.website}\n`
  if (resumeData.personal.phone) {
    markdown += `**Phone:** ${resumeData.personal.phone}\n`
  }
  markdown += `\n## Summary\n\n${resumeData.personal.summary}\n\n`
  
  // Experience
  markdown += `## Experience\n\n`
  resumeData.experience.forEach(exp => {
    markdown += `### ${exp.title}, ${exp.company}\n`
    markdown += `**${exp.location}** | ${exp.duration}\n\n`
    if (exp.description) {
      markdown += `${exp.description}\n\n`
    }
    markdown += `**Key Achievements:**\n`
    exp.achievements.forEach(achievement => {
      markdown += `- ${achievement}\n`
    })
    if (exp.skills && exp.skills.length > 0) {
      markdown += `\n**Key Skills:** ${exp.skills.join(', ')}\n`
    }
    markdown += `\n`
  })
  
  // Education
  markdown += `## Education\n\n`
  resumeData.education.forEach(edu => {
    markdown += `### ${edu.degree}\n`
    markdown += `**${edu.institution}**, ${edu.location} | ${edu.duration}\n\n`
    if (edu.gpa) {
      markdown += `**GPA:** ${edu.gpa}\n\n`
    }
    if (edu.description) {
      markdown += `${edu.description}\n\n`
    }
    if (edu.relevantCoursework && edu.relevantCoursework.length > 0) {
      markdown += `**Relevant Coursework:** ${edu.relevantCoursework.join(', ')}\n\n`
    }
    if (edu.achievements && edu.achievements.length > 0) {
      markdown += `**Achievements:**\n`
      edu.achievements.forEach(achievement => {
        markdown += `- ${achievement}\n`
      })
      markdown += `\n`
    }
  })
  
  // Certifications
  if (resumeData.certifications && resumeData.certifications.length > 0) {
    markdown += `## Certifications\n\n`
    resumeData.certifications.forEach(cert => {
      markdown += `- **${cert.name}**, ${cert.issuer} (${cert.date})\n`
    })
    markdown += `\n`
  }
  
  // Skills
  markdown += `## Skills\n\n`
  markdown += `### Technical Skills\n`
  markdown += resumeData.skills.technical.join(', ') + `\n\n`
  markdown += `### Soft Skills\n`
  markdown += resumeData.skills.soft.join(', ') + `\n\n`
  if (resumeData.skills.languages && resumeData.skills.languages.length > 0) {
    markdown += `### Languages\n`
    markdown += resumeData.skills.languages.join(', ') + `\n\n`
  }
  
  return markdown
}

// Export resume as DOCX
export const exportResumeAsDOCX = async (resumeData: ResumeData, filename: string = 'resume.docx') => {
  try {
    console.log('Starting DOCX export...', { resumeData: resumeData.personal.name, filename })
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header
          new Paragraph({
            children: [
              new TextRun({
                text: resumeData.personal.name,
                bold: true,
                size: 32,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: resumeData.personal.title,
                italics: true,
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: resumeData.personal.location,
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: resumeData.personal.email,
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: resumeData.personal.website,
                size: 20,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Summary
          new Paragraph({
            children: [
              new TextRun({
                text: 'SUMMARY',
                bold: true,
                size: 24,
              }),
            ],
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: resumeData.personal.summary,
                size: 20,
              }),
            ],
            spacing: { after: 400 },
          }),

          // Experience
          new Paragraph({
            children: [
              new TextRun({
                text: 'EXPERIENCE',
                bold: true,
                size: 24,
              }),
            ],
            spacing: { before: 400, after: 200 },
          }),
          ...resumeData.experience.flatMap(exp => [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${exp.title}, ${exp.company}`,
                  bold: true,
                  size: 22,
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `${exp.location} | ${exp.duration}`,
                  italics: true,
                  size: 18,
                }),
              ],
              spacing: { after: 200 },
            }),
            ...exp.achievements.map(achievement => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: `• ${achievement}`,
                    size: 18,
                  }),
                ],
                spacing: { after: 100 },
              })
            ),
            ...(exp.skills && exp.skills.length > 0 ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Skills: ${exp.skills.join(', ')}`,
                    italics: true,
                    size: 16,
                  }),
                ],
                spacing: { after: 200 },
              })
            ] : []),
          ]),

          // Education
          new Paragraph({
            children: [
              new TextRun({
                text: 'EDUCATION',
                bold: true,
                size: 24,
              }),
            ],
            spacing: { before: 400, after: 200 },
          }),
          ...resumeData.education.flatMap(edu => [
            new Paragraph({
              children: [
                new TextRun({
                  text: edu.degree,
                  bold: true,
                  size: 22,
                }),
              ],
              spacing: { before: 200, after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `${edu.institution}, ${edu.location} | ${edu.duration}`,
                  italics: true,
                  size: 18,
                }),
              ],
              spacing: { after: 200 },
            }),
            ...(edu.gpa ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `GPA: ${edu.gpa}`,
                    size: 18,
                  }),
                ],
                spacing: { after: 100 },
              })
            ] : []),
            ...(edu.description ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: edu.description,
                    size: 18,
                  }),
                ],
                spacing: { after: 100 },
              })
            ] : []),
            ...(edu.relevantCoursework && edu.relevantCoursework.length > 0 ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Relevant Coursework: ${edu.relevantCoursework.join(', ')}`,
                    size: 16,
                  }),
                ],
                spacing: { after: 100 },
              })
            ] : []),
            ...(edu.achievements && edu.achievements.length > 0 ? 
              edu.achievements.map(achievement => 
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `• ${achievement}`,
                      size: 18,
                    }),
                  ],
                  spacing: { after: 100 },
                })
              )
            : []),
          ]),

          // Skills
          new Paragraph({
            children: [
              new TextRun({
                text: 'SKILLS',
                bold: true,
                size: 24,
              }),
            ],
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Technical: ${resumeData.skills.technical.join(', ')}`,
                size: 18,
              }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Soft Skills: ${resumeData.skills.soft.join(', ')}`,
                size: 18,
              }),
            ],
            spacing: { after: 100 },
          }),
          ...(resumeData.skills.languages && resumeData.skills.languages.length > 0 ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Languages: ${resumeData.skills.languages.join(', ')}`,
                  size: 18,
                }),
              ],
              spacing: { after: 100 },
            })
          ] : []),

          // Certifications
          ...(resumeData.certifications && resumeData.certifications.length > 0 ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'CERTIFICATIONS',
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: { before: 400, after: 200 },
            }),
            ...resumeData.certifications.map(cert => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: `• ${cert.name}, ${cert.issuer} (${cert.date})`,
                    size: 18,
                  }),
                ],
                spacing: { after: 100 },
              })
            ),
          ] : []),
        ],
      }],
    })

    console.log('Generating DOCX buffer...')
    const arrayBuffer = await Packer.toArrayBuffer(doc)
    console.log('ArrayBuffer generated, size:', arrayBuffer.byteLength)
    const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    console.log('Blob created, size:', blob.size)
    console.log('Saving DOCX...', filename)
    saveAs(blob, filename)
    console.log('DOCX export completed successfully')
  } catch (error) {
    console.error('Error generating DOCX:', error)
    throw error
  }
}

// Download markdown file
export const downloadMarkdown = (markdown: string, filename: string = 'resume.md') => {
  const blob = new Blob([markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
