---
title: 'Vanilla ReAct: Minimalist Agent Framework'
date: '2024-07-09'
description: 'A ReAct agent in Python with no framework underneath it — the loop, in the open, against the OpenAI API.'
category: 'Projects'
---

a react agent in python with no framework underneath it, written when every agent library was adding abstraction faster than i could read it.

react is a small idea. the model reasons about what to do, takes an action, observes the result, and repeats until it decides it is finished. that is a loop, a prompt template, and a way to dispatch tool calls — it fits on a page against the openai api.

the repository is that page, kept deliberately readable. it is not trying to compete with the frameworks; it is trying to be the thing you read first, so that when you do adopt one you can tell which parts are solving your problem and which parts are solving the framework's. quite a lot of what gets called an agent is this loop with retries and logging around it.

[view on github](https://github.com/alexnodeland/vanilla-react)
