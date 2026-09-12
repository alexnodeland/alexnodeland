---
title: 'Optimal Wavelet Bases For Audio Compression'
date: '2016-11-01'
description: 'Searching for a general procedure to pick the best wavelet basis for a class of audio, rather than choosing one by taste. Run on the IACS supercomputers.'
category: 'Press'
---

jpeg 2000 swapped the discrete cosine transform for wavelets and got visibly better images at the same bitrate, with none of the block artifacts that give away ordinary jpeg. the obvious question is why the same move is not standard for audio.

part of the answer is that nobody agrees on which wavelet to use. unlike the dct, which is one fixed transform, "wavelet" is a family — and the right member depends on the signal you are compressing. in practice people pick one that has worked before and tune around it.

this research was an attempt at a procedure for picking the basis for a given class of audio, instead of choosing by taste: define what optimal means for that class, then search the space of admissible bases against a real corpus. the search is what needed the iacs supercomputers. the criterion is what needed the mathematics.

[read the full article](https://www.cewit.org/programs/_documents/CEWITNewsletter_NOV2016.pdf) — it is inside the november 2016 newsletter pdf.
