---
title: 'QCSim: Quantum Circuit Simulator in Python'
date: '2020-08-17'
description: 'A small quantum circuit simulator in Python, written to understand the subject rather than to be fast at it.'
category: 'Projects'
---

a quantum circuit simulator in python, written to understand the subject rather than to be fast at it.

it implements the fundamental gates and lets you assemble and run circuits, which is enough to build up the standard algorithms and watch the state vector do what the textbook says it does. simulating a quantum circuit turns out to be linear algebra on a vector of 2^n amplitudes — gates are unitary matrices, measurement is sampling from the squared magnitudes — and writing that out by hand is the fastest way i know to stop finding quantum computing mysterious.

the 2^n is also the point at which you understand why simulation stops being a substitute for hardware. thirty qubits is a billion amplitudes.

[view on github](https://github.com/alexnodeland/QCSim)
