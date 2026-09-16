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
  engagement: 'full-time',
  achievements: [
    'First achievement',
    { text: 'Customer-facing achievement', tags: ['fde'] },
    { text: 'Shipped an eval harness, 40% fewer regressions', tags: ['ai-eng'], metric: '40%' },
  ],
  skills: ['Skill1', 'Skill2', 'Skill3'],
  // Which one-pagers carry it, and how much of it. Omit to leave it on the
  // full CV alone. See "Four documents, one source" below.
  variants: {
    resume: { maxBullets: 3 },
    fde: { maxBullets: 2 },
  },
}
```

### 3. Export CV

- **PDF**: Click "📄 download pdf" — a link at a PDF typeset by LaTeX during the build
- **DOCX**: Click "📝 download docx" — generated in the browser from the same data
- **Markdown**: Click "📝 download markdown" — plain text, generated in the browser

The CV page has a **full cv / one page** toggle, and all three exports follow
whichever is on screen. The two role-specific resumes are separate documents at
`/cv/fde/` and `/cv/ai-engineer/`, unlinked from the nav. See [Export Options](#-export-options) for how the
one-pager is derived and where its layout lives.

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

As authored in `cvSource` (`ExperienceSource`):

```typescript
{
  title: string;            // Job title
  company: string;          // Company name
  location: string;         // Work location
  duration: string;         // Employment period
  description?: string;     // Optional job description, full CV only
  engagement?: EngagementType;  // full-time | part-time | advisory | freelance
  achievements: Bullet[];   // Strings, or { text, tags?, metric? }
  skills?: string[];        // Optional skills used, full CV only
  variants?: Partial<Record<Exclude<CVVariant, 'full'>, RoleVariantRule>>;
}
```

`buildVariant` resolves that into the `ExperienceItem` the page, the exporters
and the LaTeX template all consume — same fields, but `achievements` is a plain
`string[]` by then, `variants` is gone, and `collapsed` may be set.

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

### Four documents, one source

`src/config/cv.ts` is the only place CV content lives. What is authored there is
`cvSource`; every document is a `CVData` resolved out of it by `buildVariant`:

| Variant       | Artifact                                  | Who it is for                   |
| ------------- | ----------------------------------------- | ------------------------------- |
| `full`        | `static/cv/alex-nodeland-cv.pdf`          | the complete CV, on /cv/        |
| `resume`      | `static/cv/alex-nodeland-resume.pdf`      | the neutral one-pager           |
| `fde`         | `static/cv/alex-nodeland-fde.pdf`         | Forward Deployed Engineer roles |
| `ai-engineer` | `static/cv/alex-nodeland-ai-engineer.pdf` | AI Engineer roles               |

The full CV takes everything in the order it is authored — nothing filtered,
reordered or trimmed, because nothing has to fit. The other three keep only the
roles that name them and only the bullets selected for them.

**Roles** opt in per variant:

```typescript
variants: {
  resume: { maxBullets: 3 },
  fde: { maxBullets: 3 },
  'ai-engineer': { maxBullets: 1, collapse: true },
}
```

A variant missing from the map leaves the role off that document. `collapse`
cuts the role to a single bullet whatever `maxBullets` says — enough to account
for the years without spending the page on a decade-old job. It is one bullet
rather than none on purpose: two entry lines back to back give a parser no
boundary to split jobs on, and the role below gets swallowed.

**Bullets** may be bare strings or carry metadata. Only the ones that need it
pay for the object form:

```typescript
achievements: [
  'a neutral bullet, eligible everywhere',
  { text: 'customer-facing work', tags: ['fde'] },
  { text: 'raised a seed round', tags: ['exec'] },
  { text: 'cut eval latency 40%', tags: ['ai-eng'], metric: '40%' },
],
```

A bullet with no tags is neutral and eligible everywhere. A tagged bullet is
offered to the variants sharing its tag and withheld from the rest — which is
how `exec` bullets (fundraising, board, investor relations) stay off the
IC-facing pages, the thing that most makes a CEO/CTO history read as
overqualified. Within a variant, on-audience bullets come first and, among
those, the ones carrying a `metric` come first again; the strongest-first order
the file is authored in decides every remaining tie.

`metric` **ranks, it does not render** — the number has to appear in `text` too.
Never invent one.

**Engagement type** is per role, and renders beside the dates:

```typescript
engagement: 'freelance',   // full-time | part-time | advisory | freelance
```

This is what stops overlapping entries reading as job-hopping: "Freelance"
beside 2022–Present says the same years counted twice are one person consulting
on the side.

**Summaries, headlines, keyword lists and projects** are all per variant:
`personal.summaryByVariant`, `personal.titleByVariant`, `skills.byVariant`, and
`projects`, which names entries from `src/config/projects.ts` rather than
restating their descriptions.

### PDF — LaTeX, built ahead of time

The PDFs are **not** generated in the browser. `scripts/build-cv.js` renders
`templates/cv/resume.tex.js` and runs pdflatex once per variant.

`npm run build` runs this before `gatsby build`, so `static/cv/` is in place
when Gatsby copies it into the bundle. The CV page's PDF button is a plain
download link at whichever artifact matches the current view; the role-specific
variants are served at `/cv/fde/` and `/cv/ai-engineer/`, which are `noindex`
and absent from the nav and the sitemap.

```bash
just cv          # build every PDF
just cv-debug    # build them and keep the generated .tex alongside
```

The outputs are gitignored — they are generated, so they can never be stale
relative to the data they came from. The deploy workflow apt-installs the TeX
subset the template needs (`texlive-latex-base`, `-recommended`, `-extra`,
`texlive-fonts-recommended`).

**Without pdflatex installed**, `build-cv.js` warns and exits cleanly. The site
still builds; `/cv/*.pdf` just 404s. On macOS: `brew install texlive`.

### Checking that the PDFs can be read by a machine

A resume is read twice: once by a person and once by whatever parses it into
fields. The second reader is the one that rejects you, and it sees only the
PDF's text layer — which is not the same thing as what the page looks like.
Several defects here were invisible on screen and fatal in extraction: section
headings set in small caps that came out as `S UMMARY`, a job title long enough
to wrap that put its date between the two halves of itself, a repo URL that lost
its hyphen to line-breaking.

```bash
npm run check:cv         # check what is in static/cv
npm run check:cv:build   # build every variant first, then check
```

`scripts/check-cv-text.js` runs `pdftotext` in both its modes, and again with
the form feeds stripped — the worst a careless parser can do — and asserts that
every section heading, job title, company, date range and project link comes out
at the start of a line, in order, attached to the right entry. It also holds the
one-pagers to one page. It runs in CI as its own job, `CV text extraction`,
because it needs TeX Live and nothing else in the suite does. **It needs
`pdftotext`**: `brew install poppler`, or `apt-get install poppler-utils`.

If it fails, read the notes at the top of the script — each assertion is there
because something specific went wrong.

### Checking what a resume says to an ATS

```bash
npm run report:cv              # every variant
npm run report:cv -- fde       # one of them
```

`scripts/resume-report.js` goes a step past "the words survived" and reports
what the document looks like as _fields_ — name, email, one record per job with
its dates — using the parser from
[OpenResume](https://github.com/xitanggg/open-resume). A document whose every
line is intact can still hand an employer the wrong date range, and only a
field-level parse shows it.

> **On the licensing.** OpenResume is AGPL-3.0 and this repository is MIT.
> Nothing of theirs is committed here. `scripts/lib/openresume.js` clones the
> parser at a pinned commit into `.openresume/`, which is gitignored, on first
> use; what lives in this repository is the adapter. Keep it that way —
> vendoring their source into the tree would make this repository a
> redistributor and require a per-directory licence carve-out that not
> committing it avoids. The parser is a development tool; the deployed site
> never carries it, so the AGPL's network clause never comes into it.

The same command reports a **keyword gap** against any real job descriptions in
`jd-corpus/` — terms that come up across the postings and appear nowhere in a
variant. See `jd-corpus/README.md`. It is a list of things to check, never a
list to paste: a term belongs on the resume only if it is true of work already
described there.

Neither of these gates the build. The deterministic check is the one CI runs.

### Keeping the one-pagers on one page

`build-cv.js` prints the page count of each artifact and warns — loudly, but
without failing the build — if a one-pager comes out longer:

```
build-cv: rendering CV artifacts
  static/cv/alex-nodeland-resume.pdf  1 page
  static/cv/alex-nodeland-fde.pdf  1 page
  static/cv/alex-nodeland-ai-engineer.pdf  1 page
  static/cv/alex-nodeland-cv.pdf  5 pages
```

`npm run check:cv` is the gate that actually fails. If you add content and it
spills, you have two levers:

1. **Trim content** — drop a bullet, lower a `maxBullets`, shorten a
   `skills.byVariant` list, or name one fewer project for that variant.
2. **Tighten the layout** — the knobs are at the top of `preamble()` in
   `templates/cv/resume.tex.js`: `margin`, `fontSize`, `sectionBefore`,
   `sectionAfter`, `itemSep`, `roleSep`. They are already fairly tight; prefer
   lever 1.

One constraint the layout cannot bend: on the full CV, **keep "Title, Company"
to a single line.** The two-column entry puts the date in a right-hand cell, and
a title that wraps leaves the date sitting between the two halves of it — the
company is severed from the role and the tail of the title becomes an orphan
line. `check-cv-text.js` fails on any entry that does this. The one-pagers set
their meta inline and are not subject to it.

### DOCX — docx.js, generated in the browser

There is no `.docx` equivalent of handing a `.tex` to pdflatex, so the Word
template is expressed in code: `src/lib/utils/export/docx.ts`. It is kept
deliberately parallel to the LaTeX template — same sections in the same order,
same one-line entry heading with place and dates on the right rail, same things
dropped from the one-pager — so a change to one has an obvious counterpart in
the other.

Units follow the OOXML conventions docx.js exposes: font sizes in half-points,
everything else in twips (1 inch = 1440).

### Markdown

`src/lib/utils/export/markdown.ts`, generated in the browser. Structured
markdown for GitHub profiles, text-based applications, and version control.

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

- `src/config/cv.ts` — CV data as `cvSource`, and `buildVariant()` for every derived document
- `src/components/cv/` — CV components
- `src/lib/utils/export/` — DOCX and Markdown exporters
- `templates/cv/resume.tex.js` — the LaTeX template for both PDFs
- `scripts/build-cv.js` — renders the template and runs pdflatex
- `src/pages/cv.tsx` — CV page
- `src/styles/cv.scss` — CV styles

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
