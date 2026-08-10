// Component barrel exports for cleaner imports
export { default as Layout } from './layout';
export { default as SEO } from './seo';

// Animated backgrounds system
export * from './animated-backgrounds';

// CV components
export { default as CVControlBar } from './cv/CVControlBar';
export { default as CVSearch } from './cv/CVSearch';
export { default as EducationSection } from './cv/CVEducationSection';
export { default as ExperienceSection } from './cv/CVExperienceSection';
export { default as CVHeader } from './cv/CVHeader';
export { default as SkillsSection } from './cv/CVSkillsSection';
export { default as useCVExport } from './cv/useCVExport';

// Shared UI primitives
export { default as Dropdown } from './ui/Dropdown';
export type { DropdownOption } from './ui/Dropdown';

// Chat components
export * from './chat';
