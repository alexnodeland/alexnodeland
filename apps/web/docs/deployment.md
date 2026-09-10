# 🚀 Deployment Guide

This guide covers all deployment options for the Alex Nodeland website.

## 📋 Table of Contents

- [GitHub Pages (Recommended)](#github-pages-recommended)
- [Manual Deployment](#manual-deployment)
- [Other Platforms](#other-platforms)
- [Troubleshooting](#troubleshooting)

## 🌐 GitHub Pages (Recommended)

### Automatic Deployment

The site is configured for automatic deployment to GitHub Pages using GitHub Actions.

**Setup:**

1. Fork this repository
2. Go to Settings → Pages
3. Set Source to "GitHub Actions"
4. Push changes to the `main` branch

**Workflow:**

- Every push to `main` triggers deployment
- Build runs on Ubuntu with Node.js 18
- Site deploys to `https://yourusername.github.io/alexnodeland`

### Manual GitHub Pages Setup

If you prefer manual setup:

```bash
# Build the site
npm run build

# Add and commit the public directory
git add public/
git commit -m "Deploy to GitHub Pages"

# Push to gh-pages branch
git subtree push --prefix public origin gh-pages
```

## 🔧 Manual Deployment

### Build Process

```bash
# Install dependencies
npm install

# Build for production
npm run build

# The built files will be in the 'public' directory
```

### Upload to Hosting Provider

1. **Upload the `public` directory** to your hosting provider
2. **Configure your domain** to point to the uploaded files
3. **Set up HTTPS** (most providers do this automatically)

### Popular Hosting Providers

| Provider | Instructions |
|----------|-------------|
| **Netlify** | Drag & drop the `public` folder to Netlify |
| **Vercel** | Connect your GitHub repository |
| **AWS S3** | Upload `public` folder to S3 bucket |
| **Firebase Hosting** | Use `firebase deploy` command |

## 🌍 Other Platforms

### Netlify

**Option 1: Drag & Drop**

1. Build the site: `npm run build`
2. Go to [Netlify](https://netlify.com)
3. Drag the `public` folder to the deploy area

**Option 2: Git Integration**

1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `public`
4. Deploy automatically on every push

### Vercel

**Option 1: CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts
```

**Option 2: Git Integration**

1. Connect your GitHub repository
2. Vercel will auto-detect Gatsby
3. Deploy automatically on every push

### AWS S3 + CloudFront

```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure

# Sync public directory to S3
aws s3 sync public/ s3://your-bucket-name --delete

# Create CloudFront distribution
# (Use AWS Console for this step)
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file for environment-specific settings:

```bash
# .env
GATSBY_SITE_URL=https://alexnodeland.com
GATSBY_ANALYTICS_ID=your-analytics-id
```

### Custom Domain

**For GitHub Pages:**

1. Add a `CNAME` file to the `public` directory
2. Add your domain to GitHub Pages settings
3. Configure DNS records

**For other providers:**

- Follow the provider's custom domain instructions
- Usually involves adding DNS records

## 📊 Performance Optimization

### Pre-deployment Checklist

- [ ] **Images optimized** - Use WebP format when possible
- [ ] **CSS minified** - Gatsby handles this automatically
- [ ] **JavaScript bundled** - Gatsby handles this automatically
- [ ] **SEO meta tags** - Check all pages have proper meta tags
- [ ] **Sitemap generated** - Gatsby generates this automatically
- [ ] **Robots.txt** - Add if needed

### Performance Testing

```bash
# Build and test locally
npm run build
npm run serve

# Test with Lighthouse
# Open http://localhost:9000 in Chrome
# Run Lighthouse audit
```

## 🐛 Troubleshooting

### Common Issues

**Build Fails:**

```bash
# Check for errors
npm run build

# Common fixes:
npm run clean
npm install
npm run build
```

**Deployment Fails:**

- Check GitHub Actions logs
- Verify all dependencies are installed
- Ensure build command works locally

**Site Not Updating:**

- Clear browser cache
- Check if deployment actually completed
- Verify correct branch is deployed

**404 Errors:**

- Check if `public` directory is uploaded correctly
- Verify file paths are correct
- Check for case sensitivity issues

### GitHub Actions Issues

**Workflow Not Running:**

- Check if Actions are enabled in repository settings
- Verify workflow file is in `.github/workflows/`
- Check for syntax errors in workflow file

**Build Failing:**

- Check Node.js version compatibility
- Verify all dependencies are in `package.json`
- Check for TypeScript errors

## 📚 Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Netlify Documentation](https://docs.netlify.com/)
- [Vercel Documentation](https://vercel.com/docs)
- [Gatsby Deployment Guide](https://www.gatsbyjs.com/docs/deploying-and-hosting/)

## 🆘 Support

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Search existing [GitHub Issues](https://github.com/alexnodeland/alexnodeland/issues)
3. Create a new issue with detailed information
4. Contact [Alex Nodeland](mailto:alex@ournature.studio)
