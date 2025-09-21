import React from 'react'
import { MDXProvider as BaseMDXProvider } from '@mdx-js/react'
import ExperienceItem from './ExperienceItem'
import EducationItem from './EducationItem'
import CTASection from './CTASection'

const components = {
  ExperienceItem,
  EducationItem,
  CTASection,
}

interface MDXProviderProps {
  children: React.ReactNode
}

const MDXProvider: React.FC<MDXProviderProps> = ({ children }) => {
  return (
    <BaseMDXProvider components={components}>
      {children}
    </BaseMDXProvider>
  )
}

export default MDXProvider
