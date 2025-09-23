# Alex Nodeland Portfolio

A modern, responsive portfolio website built with Gatsby, React, TypeScript, and SCSS. Features a retro-futuristic design with dark/light theme support, blog functionality, and an interactive CV.

## 🚀 Features

- **Modern Tech Stack**: Gatsby, React, TypeScript, SCSS
- **Responsive Design**: Mobile-first approach with retro-futuristic aesthetics
- **Theme Support**: Dark/light mode with system preference detection
- **Blog System**: MD-powered blog with search and filtering
- **Interactive CV**: Exportable resume with modern styling
- **Performance Optimized**: Fast loading with optimized images and code splitting
- **SEO Ready**: Meta tags, structured data, and social sharing

## 🏗️ Architecture

This project follows modern architectural principles with:

- **Barrel Exports**: Clean, organized imports across all modules
- **Type Safety**: Comprehensive TypeScript definitions
- **Component Organization**: Logical grouping of UI components
- **SCSS Architecture**: Modular styles with variables, mixins, and animations
- **Custom Hooks**: Reusable React logic
- **Configuration Management**: Centralized config and constants

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed structure documentation.

## 🛠️ Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/alexnodeland/alexnodeland.git
cd alexnodeland

# Install dependencies
npm install

# Start development server
npm run develop
```

### Available Scripts

- `npm run develop` - Start development server
- `npm run build` - Build for production
- `npm run serve` - Serve production build
- `npm run clean` - Clean Gatsby cache
- `npm run type-check` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 📁 Project Structure

```
src/
├── components/     # Reusable React components
├── config/        # Configuration and data
├── constants/     # Application constants
├── content/       # Blog posts and content
├── hooks/         # Custom React hooks
├── pages/         # Gatsby pages
├── styles/        # SCSS stylesheets
├── templates/     # Page templates
├── types/         # TypeScript definitions
└── utils/         # Utility functions
```

## 🎨 Design System

The design features a retro-futuristic aesthetic with:

- **Color Palette**: Neon greens, electric blues, and hot pink accents
- **Typography**: JetBrains Mono for a technical, modern feel
- **Animations**: Subtle glows, hover effects, and smooth transitions
- **Layout**: Clean, academic-inspired structure with grid systems
- **Responsive**: Mobile-first design with breakpoint-based layouts

## 🔧 Configuration

Key configuration files:

- `src/config/site.ts` - Site metadata and settings
- `src/config/resume.ts` - Resume data and types
- `src/config/homepage.ts` - Homepage content
- `gatsby-config.js` - Gatsby configuration

## 📝 Content Management

- **Blog Posts**: Written in MD format in `src/content/blog/`
- **Resume Data**: Managed in `src/config/resume.ts`
- **Homepage Content**: Configured in `src/config/homepage.ts`

## 🚀 Deployment

The site is optimized for deployment on:

- **GitHub Pages** (current)
- **Netlify**
- **Vercel**
- **AWS S3 + CloudFront**

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines and submit pull requests for any improvements.

## 📞 Contact

- **Email**: [alex@ournature.studio](mailto:alex@ournature.studio)
- **LinkedIn**: [alexnodeland](https://linkedin.com/in/alexnodeland)
- **Website**: [alexnodeland.com](https://alexnodeland.com)

---

Built with ❤️ by Alex Nodeland
