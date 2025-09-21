import React from 'react'
import Layout from '../components/layout'
import SEO from '../components/seo'
import './cv.scss'

const CVPage: React.FC = () => {
  return (
    <Layout>
      <SEO title="CV" />
      <div className="cv">
        <header className="cv-header">
          <h1>Alex Nodeland</h1>
          <div className="cv-contact">
            <p><strong>Location:</strong> Upstate, New York, USA</p>
            <p><strong>Email:</strong> alex@ournature.studio</p>
            <p><strong>LinkedIn:</strong> linkedin.com/in/alexnodeland</p>
            <p><strong>Website:</strong> www.alexnodeland.com</p>
          </div>
        </header>

        <section className="cv-section">
          <h2>Objective</h2>
          <p>
            Experienced engineer and mathematician with a strong background in high-performance computing, AI system design, and
            startup development. Proven track record in leading cross-functional teams and managing strategic business partnerships.
            Passionate about transforming complex ideas into user-friendly solutions, optimizing business processes, and driving
            innovation and growth. Seeking to leverage my technical and leadership skills to bring innovative AI products to market and
            drive impactful AI solutions.
          </p>
        </section>

        <section className="cv-section">
          <h2>Experience</h2>
          
          <div className="experience-item">
            <div className="experience-header">
              <h3>Senior AI Engineer, Perch Insights</h3>
              <span className="experience-duration">Remote, NY | 2024 - Present</span>
            </div>
            <ul className="experience-bullets">
              <li>Led AI engineering initiatives that transformed data analysis workflows, enabling business analysts to perform previously impossible automated insights and drastically reducing time-to-insight</li>
              <li>Architected and implemented a DAG-based workflow orchestration framework that enables autonomous AI agents to perform complex multi-step data analysis</li>
              <li>Designed a domain-specific language (DSL) that allows non-technical users to construct sophisticated analysis workflows combining LLM agents with traditional ML models</li>
              <li>Built self-improving AI systems through virtuous feedback loops that automatically capture user feedback, expand evaluation datasets, and power few-shot examples downstream</li>
              <li>Developed tabular insight generator agents using Jinja templating that maintain complete data lineage and provenance tracking, ensuring full auditability for enterprise compliance requirements</li>
              <li>Enhanced the semantic data model with ontological abstractions and higher-order business concepts, enabling automated root cause analysis and data discovery</li>
              <li>Engineered a fault-tolerant distributed worker architecture on AWS (ECS/SNS/SQS) with dead letter queue management and zero-downtime deployments</li>
            </ul>
          </div>

          <div className="experience-item">
            <div className="experience-header">
              <h3>Head of AI, Influize</h3>
              <span className="experience-duration">Remote, NY | 2023 - 2024</span>
            </div>
            <ul className="experience-bullets">
              <li>Pioneered the AI engineering department, developing fully functional AI systems from conceptual models</li>
              <li>Developed and fully implemented RAG-based LLM systems, enhancing the product's capabilities in generating dynamic responses based on retrieved data</li>
              <li>Enhanced data model clarity by developing ontological models</li>
              <li>Improved database security and efficiency by designing and implementing schema and backend infrastructure using Supabase Postgres</li>
              <li>Boosted system security and functionality by building scalable AI pipelines with robust authentication</li>
              <li>Optimized AI pipeline performance by implementing monitoring systems</li>
              <li>Enhanced API throughput and reduced latency by architecting a high-performance, scalable API interface tailored for AI pipeline integrations</li>
              <li>Optimized deployment workflows and enhanced system reliability by adopting Infrastructure as Code (IaC) practices using AWS CloudFormation and setting up a robust CI/CD pipeline with GitHub Actions</li>
              <li>Ensured seamless platform integration by collaborating with external development teams</li>
              <li>Streamlined development and coordination by directing project management with GitHub's self-management system</li>
              <li>Boosted system responsiveness by optimizing database performance for higher scale and efficiency</li>
            </ul>
          </div>

          <div className="experience-item">
            <div className="experience-header">
              <h3>Technical Strategy Consultant</h3>
              <span className="experience-duration">Remote, NY | 2022 - Present</span>
            </div>
            <ul className="experience-bullets">
              <li>Enhanced operational flow by providing strategic guidance to a blockchain unicorn</li>
              <li>Showcased AI potential by delivering a keynote talk on ChatGPT to CIOs and founders</li>
              <li>Improved personal knowledge management systems by advising on AI and LLM utilization</li>
              <li>Developed strategic plans to keep companies at the forefront of technology</li>
              <li>Reduced costs and increased efficiency by facilitating transitions to AI-integrated systems</li>
              <li>Advanced business processes by engaging in AI research and development</li>
              <li>Identified AI solution opportunities through comprehensive market analysis</li>
              <li>Supported startups in technology selection and strategic decision-making</li>
            </ul>
          </div>

          <div className="experience-item">
            <div className="experience-header">
              <h3>Tech Lead, Musiio (acquired by SoundCloud)</h3>
              <span className="experience-duration">Singapore | 2021 - 2022</span>
            </div>
            <ul className="experience-bullets">
              <li>Led a cross-functional team, fostering collaboration with the music team and external partners</li>
              <li>Streamlined development workflows, managing scheduling and coordination with research and sales teams</li>
              <li>Fostered continuous improvement by conducting operational analysis and organizing training sessions</li>
              <li>Mentored team members, supporting career development and engagement</li>
              <li>Ensured effective project management by collaborating with founders on development plans</li>
              <li>Guided technical development, meeting customer and partner requirements</li>
              <li>Managed GCP infrastructure, implementing Kubernetes & Istio and monitoring with Grafana & Prometheus</li>
              <li>Revamped CI/CD process with Jenkins and Cypress, ensuring software quality</li>
              <li>Introduced agile practices (Scrum) to streamline operations and increase productivity</li>
              <li>Improved efficiency by implementing workflow automation and building a custom data ingestion pipeline</li>
            </ul>
          </div>

          <div className="experience-item">
            <div className="experience-header">
              <h3>CEO & Co-Founder, Archanan</h3>
              <span className="experience-duration">Singapore, SG | 2018 - 2022</span>
            </div>
            <ul className="experience-bullets">
              <li>Drove strategic direction by formulating business models and go-to-market strategies</li>
              <li>Provided critical business insights by devising dynamic financial projections</li>
              <li>Ensured seamless workflows by integrating management systems</li>
              <li>Solidified financial foundation by securing early rounds of funding from government, VC, and angel investors</li>
              <li>Expanded client base by attracting early customers, including Fortune 500 companies and national governments</li>
              <li>Brought products to market by spearheading product development from conceptualization to launch</li>
              <li>Fostered rapid growth by expanding the team from 3 to 15 in the first year</li>
              <li>Strengthened partnerships by managing diplomatic relations with multiple levels of government</li>
              <li>Promoted customer loyalty by establishing a strong brand identity</li>
              <li>Secured beneficial terms by negotiating contracts and agreements with partners and suppliers</li>
              <li>Mitigated business risks by implementing risk management strategies</li>
              <li>Maintained transparency by steering investor relations and board communications</li>
              <li>Challenged traditional norms by leveraging technical background to drive innovative solutions</li>
            </ul>
          </div>

          <div className="experience-item">
            <div className="experience-header">
              <h3>Founder in Residence, Entrepreneur First</h3>
              <span className="experience-duration">Singapore, SG | Jan 2018 - Jun 2018</span>
            </div>
            <ul className="experience-bullets">
              <li>Optimized market fit by refining early-stage ideas</li>
              <li>Validated business concepts through comprehensive market research</li>
              <li>Catalyzed product development by securing early LOIs and bringing MVPs to fruition</li>
              <li>Drove business growth by formulating and implementing go-to-market strategies</li>
              <li>Provided key insights through financial modeling to plan and predict business performance</li>
              <li>Initiated a successful venture by co-founding Archanan</li>
              <li>Secured seed capital by leading fundraising efforts</li>
              <li>Broadened network and resources by forming strategic partnerships</li>
              <li>Strengthened market positioning through business development initiatives</li>
            </ul>
          </div>

          <div className="experience-item">
            <div className="experience-header">
              <h3>CTO, Chief Mathematician, Scala Computing</h3>
              <span className="experience-duration">New York, NY | 2016 - 2017</span>
            </div>
            <ul className="experience-bullets">
              <li>Drove financial stability by securing seed capital from prominent VCs and angels</li>
              <li>Elevated company status by gaining membership to the Grand Central Tech Accelerator</li>
              <li>Fast-tracked product development by designing, architecting, and implementing MVPs</li>
              <li>Ensured reliable software solutions by developing, testing, and integrating production code</li>
              <li>Enhanced productivity and collaboration by establishing robust development processes</li>
              <li>Improved software performance by leading a team of developers in delivering cloud middleware solutions</li>
              <li>Advanced technological capabilities by directing algorithm development for complex problems</li>
              <li>Ensured software quality by establishing strict QA standards</li>
              <li>Minimized bugs through efficient code review practices</li>
              <li>Enhanced client service offerings by cultivating strong client relationships</li>
            </ul>
          </div>

          <div className="experience-item">
            <div className="experience-header">
              <h3>Artist in Residence, Center of Excellence in Wireless Information Technology</h3>
              <span className="experience-duration">Stony Brook, NY | 2016 - 2017</span>
            </div>
            <ul className="experience-bullets">
              <li>Pioneered sound technology by designing, prototyping, and testing audio synthesizers</li>
              <li>Contributed to novel audio technologies by engineering unique circuit designs</li>
              <li>Generated creative content using academic research</li>
              <li>Demystified complex concepts through collaboration with music technology industry professionals</li>
              <li>Inspired creativity by leading seminars on the intersection of music and mathematics</li>
              <li>Facilitated collaborative opportunities by networking with industry professionals</li>
            </ul>
          </div>

          <div className="experience-item">
            <div className="experience-header">
              <h3>Researcher, SUNY Research Foundation</h3>
              <span className="experience-duration">Stony Brook, NY | 2016 - 2017</span>
            </div>
            <ul className="experience-bullets">
              <li>Boosted research capabilities by spearheading a supercomputing project funded by the High Performance Computing Consortium of New York</li>
              <li>Contributed to advancements in audio technology by conducting in-depth research on optimal wavelet bases for audio compression</li>
              <li>Provided insights into spectrum trends by performing real-time signal analysis</li>
              <li>Ensured up-to-date practices by liaising with other research teams</li>
              <li>Maintained reliable data sources by organizing and maintaining project documentation</li>
            </ul>
          </div>

          <div className="experience-item">
            <div className="experience-header">
              <h3>Assistant Product Engineer, Absara Audio</h3>
              <span className="experience-duration">Port Jefferson, NY | 2014 - 2015</span>
            </div>
            <ul className="experience-bullets">
              <li>Enhanced product functionality by developing production-grade firmware for digital guitar pedals</li>
              <li>Ensured regular product improvements by contributing to continuous integration and feature releases</li>
              <li>Simplified customer usage by authoring technical documentation and user manuals</li>
              <li>Improved product quality by optimizing processes to reduce software bugs</li>
              <li>Integrated customer feedback into product development</li>
              <li>Ensured software quality by implementing rigorous testing protocols</li>
            </ul>
          </div>

          <div className="experience-item">
            <div className="experience-header">
              <h3>Technician, Absara Audio</h3>
              <span className="experience-duration">Port Jefferson, NY | 2010 - 2014</span>
            </div>
            <ul className="experience-bullets">
              <li>Contributed to product manufacturing by assembling printed circuit boards for audio processing units</li>
              <li>Guaranteed product reliability by conducting rigorous hardware testing</li>
              <li>Ensured customer satisfaction by managing servicing of customer hardware</li>
              <li>Maintained high service standards by leading technical customer service efforts</li>
              <li>Optimized production processes through continuous improvement initiatives</li>
              <li>Ensured quality standards by providing training to new staff</li>
              <li>Contributed to customer service excellence by handling returns and repairs</li>
            </ul>
          </div>
        </section>

        <section className="cv-section">
          <h2>Education</h2>
          
          <div className="education-item">
            <h3>Doctor of Philosophy (Ph.D.), Computational Applied Mathematics</h3>
            <p><strong>Stony Brook University, Stony Brook, NY | 2016 - (Incomplete)</strong></p>
            <p><strong>Acquired Skills:</strong> Advanced computational techniques, complex problem-solving, project management, data-driven decision making</p>
            <p><strong>Relevant coursework:</strong> Numerical Analysis, Numerical Partial Differential Equations, Numerical Linear Algebra, Data Analysis, Applied Real Analysis, Applied Complex Analysis, Parallel Computing.</p>
            <ul>
              <li>Engaged in preliminary research but transitioned to entrepreneurial roles prior to advancing to candidacy.</li>
              <li>Applied research experience at the Center of Excellence in Wireless Information Technology (CEWIT) and SUNY Research Foundation, focusing on audio compression and signal analysis.</li>
            </ul>
          </div>

          <div className="education-item">
            <h3>Bachelor's Degree (BS), Applied Mathematics and Statistics</h3>
            <p><strong>Stony Brook University, Stony Brook, NY | 2013 - 2015</strong></p>
            <p><strong>Acquired Skills:</strong> Statistical modeling, data analysis, problem-solving</p>
            <p><strong>Relevant coursework:</strong> Applied Real and Fourier Analysis, Computation Modeling of Physiological Systems, Discrete Mathematics, Modern Mathematics, Linear Algebra, Operations Research: Deterministic Models, Survey of Probability and Statistics, Research Practices in Biomedical Engineering, Modern Physics, Molecular and Organic Chemistry.</p>
            <ul>
              <li>Member of the University Scholars Program.</li>
            </ul>
          </div>
        </section>

        <section className="cv-section">
          <h2>Certifications</h2>
          <ul className="certifications-list">
            <li>AWS Business Professional, Amazon Web Services, 2018</li>
            <li>AWS TCO and Cloud Economics, Amazon Web Services, 2018</li>
            <li>Responsible Conduct of Research in Engineering, CITI Program, 2017</li>
          </ul>
        </section>
      </div>
    </Layout>
  )
}

export default CVPage
