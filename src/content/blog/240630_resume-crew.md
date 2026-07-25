---
title: 'Resume Crew: AI-Powered Career Tools'
date: '2024-06-30'
description: 'A CrewAI system that tailors a resume to a specific posting and prepares you for the interview that follows.'
category: 'Projects'
---

a crewai system that tailors a resume to a specific job posting, then prepares you for the interview that follows.

the agents split the work rather than sharing it. one reads the posting and extracts what is genuinely being asked for, as opposed to what the boilerplate says. one rewrites the resume against that reading. one generates the questions you should expect given the gap between the two.

that separation is the whole reason it works better than a single long prompt. critiquing a resume and rewriting it are different jobs, and a model asked to do both at once will soften the critique to justify the rewrite it has already started composing. splitting them forces the criticism to be written down before anything acts on it.

[view on github](https://github.com/alexnodeland/resume-crew)
