---
title: 'StatusBar: Is It Down, or Is It Me?'
date: '2026-09-13'
description: 'Why I built a macOS menu bar app to watch the status pages I depend on, and the CLI, prompt glyph, and webhooks that grew around it.'
category: 'Projects'
---

i depend on a lot of things i don't run. anthropic, github, cloudflare, whatever is underneath the thing i am shipping that afternoon. so when something misbehaves the first question is never "what's the bug". it is "is it me, or is it them", and answering it used to mean opening five status pages that each say "operational" a different way.

statusbar is my answer to that. it lives in the menu bar, watches the pages i care about, and shows me the worst one at a glance.

the thing that actually started it: no two providers agree on how to say "broken". atlassian statuspage says "degraded performance", incident.io has its own words, gatus just tells you an endpoint is down. i didn't want to keep five of these straight, so the app maps all of them onto four levels: operational, degraded, partial outage, major outage. the icon shows the worst one across everything i watch. green means i don't think about it. anything else means i open the popover. adding a source is pasting a url, and it detects the provider from that.

i wanted the status in the terminal too, where i already am, so there is a cli that caches it on every poll and reading it costs nothing:

    statusbar wait npm && npm publish

`wait` blocks until a service comes back, so i can hang a deploy off it instead of refreshing a page. `prompt` prints a glyph i drop into starship or tmux, and a `.statusbar` file in a repo narrows both down to just that project's upstreams. there is a widget, webhooks into slack, discord and teams, shortcuts, and an applescript dictionary.

native swiftui, macos 26 and up. no electron, no dock icon, no telemetry. it talks to the status pages you add and nowhere else. free and open source.

incident detail is only as good as the provider hands over. statuspage gives full timelines; incident.io and instatus expose less through their apis; gatus has no incident history at all and reports per-endpoint health instead. and it is macos-only.

[view on github](https://github.com/alexnodeland/StatusBar) · [project site](https://alexnodeland.github.io/StatusBar/) · [support it](https://ournature.gumroad.com/l/statusbar) · `brew tap alexnodeland/tap && brew install --cask statusbar`
