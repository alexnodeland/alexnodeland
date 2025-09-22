import React, { useState } from 'react'
import { exportResumeAsPDF, exportResumeAsMarkdown, downloadMarkdown, exportResumeAsDOCX } from '../../utils/exportResume'
import { ResumeData } from '../../config/resume'

interface ExportButtonsProps {
  resumeData: ResumeData
  resumeElementId: string
  className?: string
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ 
  resumeData, 
  resumeElementId, 
  className = '' 
}) => {
  const [isExporting, setIsExporting] = useState(false)

  const handlePDFExport = async () => {
    setIsExporting(true)
    try {
      console.log('PDF export button clicked')
      await exportResumeAsPDF(resumeData, `${resumeData.personal.name.replace(/\s+/g, '_')}_Resume.pdf`)
    } catch (error) {
      console.error('PDF export failed:', error)
      alert(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleDOCXExport = async () => {
    setIsExporting(true)
    try {
      console.log('DOCX export button clicked')
      await exportResumeAsDOCX(resumeData, `${resumeData.personal.name.replace(/\s+/g, '_')}_Resume.docx`)
    } catch (error) {
      console.error('DOCX export failed:', error)
      alert(`Failed to export DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleMarkdownExport = () => {
    try {
      const markdown = exportResumeAsMarkdown(resumeData)
      downloadMarkdown(markdown, `${resumeData.personal.name.replace(/\s+/g, '_')}_Resume.md`)
    } catch (error) {
      console.error('Markdown export failed:', error)
      alert('Failed to export Markdown. Please try again.')
    }
  }

  return (
    <div className={`export-buttons ${className}`}>
      <h3>export resume</h3>
      <div className="export-actions">
        <button 
          onClick={handlePDFExport}
          disabled={isExporting}
          className="export-button pdf"
        >
          {isExporting ? 'generating...' : '📄 download pdf'}
        </button>
        <button 
          onClick={handleDOCXExport}
          disabled={isExporting}
          className="export-button docx"
        >
          {isExporting ? 'generating...' : '📝 download docx'}
        </button>
        <button 
          onClick={handleMarkdownExport}
          className="export-button markdown"
        >
          📝 download markdown
        </button>
      </div>
    </div>
  )
}

export default ExportButtons
