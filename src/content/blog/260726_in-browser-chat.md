---
title: 'The Chat Box Is a Language Model on Your Machine'
date: '2026-07-26'
description: 'A 1.2B model runs in your browser and answers from this site — no server, no API key. How the retrieval works, what the optimisation actually bought, and the three things I expected to be true that were not.'
category: 'Projects'
---

there is a chat box on this site. when you open it, your browser downloads a 760MB language model and runs it on your GPU. nothing is sent anywhere — there is no server to send it to. it answers questions about me from the pages you are already reading.

this is a note about how it works and what it cost to make it fast, because most of what i assumed going in was wrong.

## the shape of it

the first version stapled my entire CV — about 4,500 tokens — to the front of every single question. it also ran two throwaway yes/no generations before each answer, to decide whether the question was on-topic at all. three model calls per question, and it knew nothing about the blog or the projects page.

now the site is chunked into 95 passages at build time and embedded into a 111KB file that ships with the page. your browser embeds only your question — one forward pass over about fifteen tokens, roughly two milliseconds — and searches that index. this post is in there too, which is a slightly strange thing to write.

the search is hybrid, and it has to be. this corpus is one person's life, so everything in it is semantically adjacent to everything else; a 384-dimension vector cannot reliably separate "musiio" from "influize". exact term matching carries the proper nouns, embeddings carry the paraphrases ("where did he go to school"), and reciprocal rank fusion combines them without needing the two score scales to mean the same thing, which they don't.

then a gate. if nothing in the index is close enough to your question, there is nothing to ground an answer in, so it says so — in about a tenth of a second, without waking the model at all. that gate replaced both classifier calls and is more accurate than they were. three generations per turn became one.

what reaches the model is a short instruction block, the passages that came back, and your question. it cites what it used, and those citations become links under the answer.

## what it costs

|                    |                     |
| ------------------ | ------------------- |
| download, once     | 760MB, cached after |
| cold load          | ~21s                |
| search             | ~26ms               |
| reading the prompt | ~830ms              |
| writing the answer | ~540ms              |
| a refused question | ~0.1s               |

the interesting line is that reading the prompt costs more than writing the answer — about 2:1. i spent the first half of this optimising the wrong half, because tokens-per-second is the number everyone quotes and it turns out to be the smaller one.

## the bug that had never once worked

the prompt block is identical on every turn, so it should be computed once and reused. that is what a key-value cache is for, and the code had one.

it had never hit. not once.

the cache is filled by running the model over the prompt and keeping the intermediate state. the code asked for that state by the wrong name — a name the library only sets on a different code path — so it always got nothing, always stored nothing, and always silently recomputed. no error, no warning, just a cache that was permanently empty and a comment above it confidently describing the optimisation.

the fix was one function call. it also turned out to matter that this model is a hybrid architecture: half its state lives under different names again, so the obvious string-replacement fix would have quietly dropped half of it. worth about 420ms a turn, which is a quarter of the answer.

i only found it because i had started printing the hit rate. it read `0/12`.

## three things i was wrong about

**smaller is not faster.** i tried a model with half the parameters expecting roughly half the latency. it was two to four times _slower_, because it wrote several hundred words where the larger one writes forty. decoding is per-token. verbosity swamps everything.

**the genuinely fast one lies.** a 230M model loads in nine seconds instead of twenty-one and answers in under a second. asked whether i knew a language that appears nowhere in my skills list — with that list sitting in its context — it said yes. asked whether i had worked at a company i have never worked at, it said yes to that too. i tried to fix it with worked examples, including one showing it declining exactly that kind of question, two hundred tokens above where it was asked. it kept agreeing. that is not a prompt problem; models that small accept the premise of whatever you ask them.

those examples also made the _large_ model worse. one of them mentioned musiio, and that was enough for it to start reaching for musiio in unrelated answers. names in a cached prefix get grabbed.

**reasoning bought nothing.** there is a variant of the same model that thinks step by step first. it scored worse in every category while taking four times as long, because it spent 658 tokens reasoning before the visitor saw a word. reading four retrieved passages is not a reasoning problem — the answer is already sitting in the context.

the lineup is now one model. every rejection is written down next to it, with the command to re-check the claim.

## the evals, and why a perfect score is useless

there is a graded battery of 68 questions covering grounded lookups, multi-passage synthesis, follow-ups that depend on the previous turn, questions built on false premises, things that must be refused, and things that must _not_ be refused.

the earlier version had twelve cases and the model passed all twelve. that felt good and was worthless: a saturated test can only ever tell you something broke, never that something improved, so it cannot help you choose between two versions.

expanding it immediately found a whole failure class the small set never touched. asked where i got my MBA — i don't have one — the model reported a doctorate i never finished. asked how old i am, it worked it out from my job dates and offered "early thirties." asked why i left a company, it invented a motive and hedged it with "probably."

it currently sits at 55/68. that is the point. the gap is where the work is — dates it gets wrong, gibberish it answers instead of refusing, and a couple of roleplay prompts that still talk it out of its job.

each case is scored continuously rather than pass/fail, and every lost point comes with a written note about what went wrong, because "worse" is not enough to act on and "invented a credential the question assumed" is.

## a note on grading yourself

five times during this, a failure turned out to be my measurement rather than the model. the harness looked for `doesn't` and the model wrote `doesn’t` with a typographic apostrophe. it looked for "no mention of" and got "no clear indication that." it reported every answer as two seconds slower than it was, because it counted its own settling delay.

each one looked exactly like a regression. if you are optimising against a number, the number is part of the system, and it is usually the least tested part of it.

## what it still gets wrong

ask it "archanan?" — just the word — and it recites where that company sits in my timeline instead of telling you what it was. the answer is being pulled out of the career summary that sits in every prompt, and i have not found a way to stop that without breaking the follow-up questions the summary is there to serve.

it also will not tell you anything that is not on this site, which is most things. that is the design, not a limitation to be fixed. it can tell you where i worked and what i have built; it cannot tell you what i think about your architecture. for that, [email me](mailto:alex@ournature.studio).
