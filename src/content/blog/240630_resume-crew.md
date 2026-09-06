---
title: 'Resume Crew: AI-Powered Career Tools'
date: '2024-06-30'
description: 'A CrewAI system that tailors a resume to a specific posting and prepares you for the interview that follows.'
category: 'Projects'
---

a crewai system that tailors a resume to a specific job posting, then prepares you for the interview that follows.

the agents split the work rather than sharing it. one reads the posting and separates the real requirements from the boilerplate. one rewrites the resume against that reading. one generates the questions you should expect given the gap between the two.

the separation is why it works better than one long prompt. critiquing a resume and rewriting it are different jobs, and a model asked to do both at once tends to soften the critique to fit the rewrite. splitting them means the criticism gets written down before anything acts on it.

[view on github](https://github.com/alexnodeland/resume-crew)
