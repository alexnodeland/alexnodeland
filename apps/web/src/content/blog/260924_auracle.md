---
title: 'Auracle: A Synthesizer That Learns What You Like'
date: '2026-09-24'
description: 'A playable modular synth in the browser that evolves patches, asks which you prefer, and fits a Bayesian model of your taste that steers the search and reports its own confidence.'
category: 'Projects'
---

sound design tools make you pick. presets and randomizers are fast and shallow: you audition until something works, and nothing builds up. patching from scratch is deep and slow. genetic-algorithm synths tried to split the difference with star-a-generation workflows, but they forget everything between sessions and can't tell you why they suggest what they suggest.

auracle treats it as inference. it generates patches, plays them to you, and asks which of two you prefer. from those answers, plus star ratings and your own hand edits, it fits a model of your taste, and that model changes how evolution _proposes_ the next patches, not only how it scores them. over a session it stops guessing and starts proposing.

it is built on two of my other libraries. a patch is a term in a typed grammar over [quiver](https://quiver-dsp.com/)'s combinators: a tree whose types are signal kinds, so every mutation, crossover and hand edit gives you a valid, playable patch by construction. the search is typed metropolis–hastings from [fugue-evo](https://evo.fugue.run/), walking toward the grammar's prior times exp(β · utility). parsimony comes from the prior, how hard it searches is one dial, and locking a knob gives exact conditional refinement of everything else.

taste is a max of linear experts: a handful of style lenses, so you are allowed to like several unrelated islands of sound. the model carries a posterior, predicts every duel before you vote, and shows its running calibration, so you can check whether its confidence is honest. old votes fade with a half-life.

i expected refinement to get stuck on one island, and wrote that down as an open question. measured against a synthetic user who likes two unrelated sounds, 20.9% of refinement events crossed between islands, and 0 of 8 seeds ended with the pool on one island only. i had the geometry wrong. the walk is over a tree grammar, and one structural move swaps a whole subtree, so there is no valley to cross. the reference keeps the old entry, crossed out, next to the measurement.

it is also just a synthesizer. four voices in an audioworklet, the computer keyboard or web midi, an arpeggiator, glide, unison, and a rack of forty-two modules with typed cables you can rewire while it plays, sidechaining included. you can ignore the model and play it.

what it can't do yet: the patch is a tree, so one output can't feed two places, and there is no feedback. both are deferred on purpose, because either one means migrating the genome format, and nothing yet says the search is starved for them. it is 0.x, so the save format can change: save your taste profile before you update. it runs in the browser with nothing to install, and your bank and taste model stay there.

[play it](https://auracle.alexnodeland.com/play/) · [project site and films](https://auracle.alexnodeland.com/) · [view on github](https://github.com/alexnodeland/auracle)
