---
title: 'QCSim: Quantum Circuit Simulator in Python'
date: '2020-08-17'
description: 'A small quantum circuit simulator in Python, written to understand the subject rather than to be fast at it.'
category: 'Projects'
---

the fast simulators exist and are better than anything i would write. this one is for reading.

it implements the fundamental gates and lets you assemble and run circuits, which is enough to build up the standard algorithms and watch the state vector do what the textbook says it does. simulating a quantum circuit is linear algebra on a vector of 2^n amplitudes, where gates are unitary matrices and measurement is sampling from the squared magnitudes, and there is not much more to it than that.

the 2^n is also why simulation is no substitute for hardware: thirty qubits is a billion amplitudes.

[view on github](https://github.com/alexnodeland/QCSim)
