# Alex Nodeland - Personal Website

A modern, responsive personal website built with Gatsby and TypeScript, showcasing Alex Nodeland's professional experience and expertise in AI engineering, technical consulting, and startup development.

## 🚀 Features

- **Modern Tech Stack**: Built with Gatsby 5, TypeScript, and SCSS
- **Responsive Design**: Mobile-first approach with clean, professional styling
- **Fast Performance**: Static site generation with optimized loading
- **SEO Optimized**: Proper meta tags and structured data
- **GitHub Pages Ready**: Automated deployment via GitHub Actions

## 📁 Project Structure

```
src/
├── components/          # Reusable React components
│   ├── layout.tsx      # Main layout wrapper
│   ├── layout.scss     # Layout styles
│   └── seo.tsx         # SEO component
├── pages/              # Gatsby pages
│   ├── index.tsx       # Homepage
│   ├── index.scss      # Homepage styles
│   ├── cv.tsx          # CV/Resume page
│   └── cv.scss         # CV page styles
├── styles/             # Global styles
│   └── global.scss     # Global CSS reset and base styles
└── images/             # Static images and assets
```

## 🛠️ Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run develop

# Build for production
npm run build

# Serve production build locally
npm run serve

# Clean Gatsby cache
npm run clean
```

### Available Scripts

- `npm run develop` - Start development server (usually at http://localhost:8000)
- `npm run build` - Build production site
- `npm run serve` - Serve production build locally
- `npm run clean` - Clean Gatsby cache

## 🚀 Deployment

This site is configured for automatic deployment to GitHub Pages via GitHub Actions.

### GitHub Pages Setup

1. **Enable GitHub Pages**: Go to your repository settings and enable GitHub Pages
2. **Set Source**: Set the source to "GitHub Actions"
3. **Push to Main**: The site will automatically deploy when you push to the main branch

### Manual Deployment

```bash
# Build the site
npm run build

# The built files will be in the 'public' directory
# Upload these to your hosting provider
```

## 🎨 Customization

### Updating Content

- **Homepage**: Edit `src/pages/index.tsx` and `src/pages/index.scss`
- **CV Page**: Edit `src/pages/cv.tsx` and `src/pages/cv.scss`
- **Site Metadata**: Update `gatsby-config.js`

### Styling

- **Global Styles**: Edit `src/styles/global.scss`
- **Component Styles**: Each component has its own `.scss` file
- **Layout Styles**: Edit `src/components/layout.scss`

### SEO

- **Meta Tags**: Update the SEO component in `src/components/seo.tsx`
- **Site Config**: Modify `siteMetadata` in `gatsby-config.js`

## 📱 Responsive Design

The site is fully responsive with breakpoints for:
- Mobile devices (< 768px)
- Tablets (768px - 1024px)
- Desktop (> 1024px)

## 🔧 Technologies Used

- **Gatsby 5** - Static site generator
- **TypeScript** - Type-safe JavaScript
- **React 18** - UI library
- **SCSS** - CSS preprocessor
- **GitHub Actions** - CI/CD pipeline
- **GitHub Pages** - Hosting

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📞 Contact

- **Email**: alex@ournature.studio
- **LinkedIn**: [linkedin.com/in/alexnodeland](https://linkedin.com/in/alexnodeland)
- **Website**: [alexnodeland.com](https://alexnodeland.com)