---
title: 'Crewlit: Multi-Agent AI Systems in Your Browser'
date: '2024-07-06'
description: 'CrewAI in a browser — define agents, tasks and crews in a Streamlit UI instead of a Python file.'
category: 'Projects'
---

crewai in a browser, so that building a multi-agent system does not have to start with a python file.

it is a streamlit app for defining agents, tasks and crews, wiring them together, and running them with the output streaming back as it happens. nothing it does is impossible from a script — the point is that it removes the hour of boilerplate between understanding what a multi-agent system is and having one in front of you.

the interesting design constraint is that a crew is a graph of agents with dependencies, and most people's first instinct is to build it as a list. the ui exists mostly to make the graph visible before you run it.

[view on github](https://github.com/alexnodeland/crewlit)
