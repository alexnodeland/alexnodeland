import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import {
  CertificationItem,
  CVData,
  EducationItem,
  ExperienceItem,
} from '../../../config/cv';

// Export CV as DOCX
export const exportCVAsDOCX = async (
  cvData: CVData,
  filename: string = 'resume.docx'
) => {
  try {
    // Starting DOCX export
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Header
            new Paragraph({
              children: [
                new TextRun({
                  text: cvData.personal.name,
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
                  text: cvData.personal.title,
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
                  text: cvData.personal.location,
                  size: 20,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: cvData.personal.email,
                  size: 20,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: cvData.personal.website,
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
                  text: cvData.personal.summary,
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
            ...cvData.experience.flatMap((exp: ExperienceItem) => [
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
              ...exp.achievements.map(
                (achievement: string) =>
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
              ...(exp.skills && exp.skills.length > 0
                ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Skills: ${exp.skills.join(', ')}`,
                          italics: true,
                          size: 16,
                        }),
                      ],
                      spacing: { after: 200 },
                    }),
                  ]
                : []),
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
            ...cvData.education.flatMap((edu: EducationItem) => [
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
              ...(edu.gpa
                ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `GPA: ${edu.gpa}`,
                          size: 18,
                        }),
                      ],
                      spacing: { after: 100 },
                    }),
                  ]
                : []),
              ...(edu.description
                ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: edu.description,
                          size: 18,
                        }),
                      ],
                      spacing: { after: 100 },
                    }),
                  ]
                : []),
              ...(edu.relevantCoursework && edu.relevantCoursework.length > 0
                ? [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Relevant Coursework: ${edu.relevantCoursework.join(', ')}`,
                          size: 16,
                        }),
                      ],
                      spacing: { after: 100 },
                    }),
                  ]
                : []),
              ...(edu.achievements && edu.achievements.length > 0
                ? edu.achievements.map(
                    (achievement: string) =>
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
                  text: `Technical: ${cvData.skills.technical.join(', ')}`,
                  size: 18,
                }),
              ],
              spacing: { after: 100 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Soft Skills: ${cvData.skills.soft.join(', ')}`,
                  size: 18,
                }),
              ],
              spacing: { after: 100 },
            }),
            ...(cvData.skills.languages && cvData.skills.languages.length > 0
              ? [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `Languages: ${cvData.skills.languages.join(', ')}`,
                        size: 18,
                      }),
                    ],
                    spacing: { after: 100 },
                  }),
                ]
              : []),

            // Certifications
            ...(cvData.certifications && cvData.certifications.length > 0
              ? [
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
                  ...cvData.certifications.map(
                    (cert: CertificationItem) =>
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
                ]
              : []),
          ],
        },
      ],
    });

    // Generating DOCX buffer
    const arrayBuffer = await Packer.toArrayBuffer(doc);
    // ArrayBuffer generated
    const blob = new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    // Blob created
    // Saving DOCX
    saveAs(blob, filename);
    // DOCX export completed successfully
  } catch (error) {
    console.error('Error generating DOCX:', error);
    throw error;
  }
};
