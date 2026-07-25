---
title: 'Singapore Startup Hatches At-Scale HPC Dev Cloud'
date: '2019-04-26'
description: "HPCwire covers Archanan's emergence from stealth — a cloud platform that emulates a target supercomputer so you can develop and debug at full scale."
category: 'Press'
---

hpcwire covered our beta launch, which was the first time we said in public what archanan actually did.

the problem we were built around: most supercomputing centres allocate ten percent or less of the machine to development work. if your production run needs thirty thousand cores, you are writing and debugging that code somewhere much smaller and hoping. plenty of organisations have no on-premise cycles for development at all, and anyone evaluating an architecture they do not own yet has nowhere to try it.

what we sold was a functional replica. you develop against an emulation of your target machine's topology and interconnect, at the core count you will actually run on, through a web ide with a parallel debugger attached. it is explicitly not a performance model — the layers of virtualisation mean the timings are not the production timings — but it answers the question that actually burns allocation, which is whether the thing runs at all at scale and how mpi behaves when it does. at launch you could target emulated systems including nscc singapore's aspire-1, or specify a machine that did not exist yet.

lukasz orlowski and i founded it in february 2018, raised a seed round led by sginnovate, and had john gustafson — of gustafson's law — as lead scientific advisor, which remains the most straightforwardly cool sentence in my career.

[read the full article](https://www.hpcwire.com/2019/04/26/singapore-startup-hatches-hpc-dev-cloud/)
