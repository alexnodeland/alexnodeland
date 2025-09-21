import React from 'react'
import Layout from '../components/layout'
import SEO from '../components/seo'
import { Link } from 'gatsby'
import './404.scss'

const NotFoundPage: React.FC = () => {
  return (
    <Layout>
      <SEO title="404: Not Found" />
      <div className="not-found">
        <h1>404: Not Found</h1>
        <p>Sorry, the page you're looking for doesn't exist.</p>
        <Link to="/" className="back-home">← Back to Home</Link>
      </div>
    </Layout>
  )
}

export default NotFoundPage
