# 📄 CV Management Guide

This guide explains how to easily update and maintain your CV using the structured data system.

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Data Structure](#data-structure)
- [Updating Resume Content](#updating-CV-content)
- [Export Options](#export-options)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

The CV system uses structured data that makes it incredibly easy to:

- **Update content** in one place
- **Export to multiple formats** (PDF, Markdown)
- **Maintain consistency** across all sections
- **Add new sections** without touching HTML/CSS

## 🚀 Quick Start

### 1. Update Personal Information

Edit `src/config/cv.ts`:

```typescript
personal: {
  name: 'Your Name',
  title: 'Your Professional Title',
  email: 'your@email.com',
  location: 'Your Location',
  website: 'www.yourwebsite.com',
  summary: 'Your professional summary...'
}
```

### 2. Add New Experience

```typescript
{
  title: 'New Job Title',
  company: 'Company Name',
  location: 'City, State',
  duration: '2024 - Present',
  achievements: [
    'First achievement',
    'Second achievement',
    'Third achievement'
  ],
  skills: ['Skill1', 'Skill2', 'Skill3']
}
```

### 3. Export CV

- **PDF**: Click "📄 Download PDF" button (clean markdown-style rendering)
- **DOCX**: Click "📝 Download DOCX" button (Microsoft Word format)
- **Markdown**: Click "📝 Download Markdown" button (plain text format)

## 📊 Data Structure

### Personal Information

```typescript
personal: {
  name: string;           // Your full name
  title: string;          // Professional title
  email: string;          // Contact email
  phone?: string;         // Optional phone number
  location: string;       // City, State, Country
  website: string;        // Your website
  summary: string;        // Professional summary
}
```

### Experience Items

```typescript
{
  title: string;          // Job title
  company: string;        // Company name
  location: string;       // Work location
  duration: string;       // Employment period
  description?: string;   // Optional job description
  achievements: string[]; // List of achievements
  skills?: string[];      // Optional skills used
  highlights?: string[];  // Optional key highlights
}
```

### Education Items

```typescript
{
  degree: string;                    // Degree name
  institution: string;               // School name
  location: string;                  // School location
  duration: string;                  // Study period
  gpa?: string;                     // Optional GPA
  relevantCoursework?: string[];     // Optional coursework
  achievements?: string[];           // Optional achievements
  description?: string;              // Optional description
}
```

### Skills

```typescript
skills: {
  technical: string[];    // Technical skills
  soft: string[];         // Soft skills
  languages?: string[];   // Optional languages
}
```

## ✏️ Updating Resume Content

### Adding New Experience

1. **Open** `src/config/CV.ts`
2. **Find** the `experience` array
3. **Add** new experience object:

```typescript
{
  title: 'Senior Software Engineer',
  company: 'Tech Company',
  location: 'San Francisco, CA',
  duration: '2023 - Present',
  achievements: [
    'Led development of new product features',
    'Improved system performance by 40%',
    'Mentored junior developers'
  ],
  skills: ['React', 'Node.js', 'AWS']
}
```

### Updating Existing Experience

1. **Find** the experience item in the array
2. **Update** any field you want to change
3. **Save** the file - changes appear immediately

### Adding New Education

```typescript
{
  degree: 'Master of Science in Computer Science',
  institution: 'University Name',
  location: 'City, State',
  duration: '2020 - 2022',
  gpa: '3.8/4.0',
  relevantCoursework: [
    'Advanced Algorithms',
    'Machine Learning',
    'Database Systems'
  ]
}
```

### Updating Skills

```typescript
skills: {
  technical: [
    'Python', 'JavaScript', 'React', 'Node.js',
    'AWS', 'Docker', 'Kubernetes', 'PostgreSQL'
  ],
  soft: [
    'Leadership', 'Communication', 'Problem Solving',
    'Team Management', 'Strategic Planning'
  ],
  languages: ['English (Native)', 'Spanish (Conversational)']
}
```

## 📤 Export Options

### PDF Export

- **What it does**: Creates a clean, professional PDF with markdown-style formatting
- **Use case**: Professional applications, printing, ATS systems
- **Quality**: High-resolution, clean typography, proper spacing
- **Format**: Structured sections with clear hierarchy
- **File size**: Optimized for sharing and email

### DOCX Export

- **What it does**: Creates a Microsoft Word document
- **Use case**: Applications requiring Word format, easy editing
- **Format**: Professional layout with proper formatting
- **Compatibility**: Opens in Microsoft Word, Google Docs, LibreOffice
- **Features**: Editable text, proper spacing, professional appearance

### Markdown Export

- **What it does**: Creates a clean text version
- **Use case**: GitHub profiles, text-based applications, version control
- **Format**: Structured markdown with headers and lists
- **Compatibility**: Works with any markdown viewer
- **Features**: Plain text, easy to edit, version control friendly

### Export Process

1. **Click** the export button you want
2. **Wait** for processing (PDF takes a few seconds)
3. **File downloads** automatically
4. **Rename** if needed

## 🎨 Customization

### Adding New Sections

1. **Update** the `ResumeData` interface in `src/config/CV.ts`
2. **Add** the section to the `cvData` object
3. **Create** a component for the section
4. **Add** it to the CV page

### Styling Changes

- **Colors**: Update CSS variables in `src/styles/global.scss`
- **Layout**: Modify `src/styles/cv.scss`
- **Components**: Edit individual component styles

### Adding New Fields

1. **Update** the TypeScript interface
2. **Add** the field to the data
3. **Update** the component to display it
4. **Add** styling if needed

## 📝 Best Practices

### Content Writing

- **Use action verbs**: "Led", "Developed", "Implemented"
- **Be specific**: Include numbers and metrics when possible
- **Keep it relevant**: Focus on achievements that matter
- **Be consistent**: Use similar formatting throughout

### Data Organization

- **Chronological order**: Most recent first
- **Complete information**: Fill in all relevant fields
- **Consistent formatting**: Use the same date format, etc.
- **Regular updates**: Keep information current

### Export Quality

- **Test exports**: Check both PDF and Markdown outputs
- **Review formatting**: Ensure everything looks good
- **Check links**: Verify all URLs work
- **Update regularly**: Keep exports current

## 🔧 Advanced Features

### Conditional Sections

Some sections only show if they have content:

```typescript
{cvData.certifications && cvData.certifications.length > 0 && (
  <section className="cv-section">
    <h2>Certifications</h2>
    {/* Certification content */}
  </section>
)}
```

### Dynamic Content

The system automatically:

- **Formats dates** consistently
- **Handles missing fields** gracefully
- **Generates proper links** for contact info
- **Maintains responsive design**

### Type Safety

All data is fully typed, so you get:

- **Autocomplete** in your editor
- **Error checking** for missing fields
- **Consistent structure** across all sections

## 🐛 Troubleshooting

### Common Issues

**Export not working:**

- Check browser console for errors
- Ensure all required fields are filled
- Try refreshing the page

**PDF looks wrong:**

- Check that the CV content fits on the page
- Verify all images are loaded
- Try a different browser

**Markdown formatting issues:**

- Check for special characters in content
- Ensure proper line breaks
- Verify markdown syntax

### Getting Help

1. **Check console**: Look for JavaScript errors
2. **Validate data**: Ensure all required fields are present
3. **Test components**: Verify individual sections work
4. **Check styles**: Make sure CSS is loading properly

## 📚 Related Files

- `src/config/cv.ts` - Main CV data
- `src/components/cv/` - CV components
- `src/utils/exportCV.ts` - Export utilities
- `src/pages/cv.mdx` - CV page
- `src/styles/cv.scss` - Resume styles

## 🎉 Benefits

### For You

- **Easy updates**: Change content in one place
- **Multiple formats**: Export to PDF or Markdown
- **Consistent design**: Professional appearance
- **Type safety**: No more typos or missing fields

### For Visitors

- **Professional look**: Clean, modern design
- **Easy to read**: Well-organized information
- **Downloadable**: Can save your CV
- **Responsive**: Works on all devices

This system makes CV management incredibly easy while maintaining a professional appearance. You can update your CV in minutes and export it in any format you need!
