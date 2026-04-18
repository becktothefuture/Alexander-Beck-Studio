---
name: explain-it-like-im
description: "Explain almost anything in four cumulative age bands: 4, 7, 12, and 16. Use when the user asks to explain something simply, progressively, 'like I'm 5,' 'for different ages,' 'help me learn this fast,' or wants one idea rebuilt from intuitive picture to clearer mechanism and nuance."
---

# Explain It Like Im

## Overview

Explain one idea through four growing layers: age 4, 7, 12, and 16.
Keep the same core idea across all four layers so the user feels one explanation getting sharper, not four separate explanations.

## Working Premise

People learn faster when the same idea is revisited with slightly more depth each time.
Use one stable mental model, keep cognitive load low, and make each step genuinely additive.

## Before You Write

For any topic, decide:
- the simplest truthful core idea
- one familiar image or concrete anchor
- the one new layer each age band will add
- any uncertainty, edge case, or safety concern that must survive simplification

## Output Contract

Default to this exact sequence unless the user explicitly asks for different ages:

1. `4:`
2. `7:`
3. `12:`
4. `16:`

Each band should begin with that exact label and continue on the same line.
Keep the `4:` line very short and sweet by default: one small, truthful sentence.
Let complexity build gradually:
- `4:` one short sentence
- `7:` one or two short sentences
- `12:` two or three sentences with direct mechanism
- `16:` two to four sentences with nuance, limits, or tradeoffs

Default to plain prose rather than bullets unless bullets clearly help.

If the user asks for only one age band, still think through the full progression internally first.
Then output only the band they asked for.

## Age Calibration

Use one stable through-line.
Pick the simplest truthful core idea first, then keep refining that same idea at each age level.

At age 4:
- Use concrete language only
- Keep it tiny
- Give the simplest truthful core idea
- Avoid jargon entirely

At age 7:
- Keep the same image
- Add one more causal step
- Name the most important moving part in plain language

At age 12:
- Explain the mechanism more directly
- Add structure, categories, or process
- Introduce useful vocabulary and define it immediately

At age 16:
- Give the cleanest version
- Add nuance, limits, tradeoffs, or edge cases when relevant
- Use proper terms, but keep the writing readable

## Learning Principles

Optimize for fast learning, not maximal detail.

Use these principles:
- Start with low cognitive load
- Add one layer at a time
- Reuse the same mental model before replacing it
- Move from concrete to abstract
- Keep working memory demands low
- Prefer chunked explanations over one dense block

For a compact reference on why this works, read [references/learning-principles.md](references/learning-principles.md).

## Topic-Specific Moves

For science:
- Start with what the thing does before how it works
- Separate observation from theory when relevant
- Avoid fake certainty when the topic is genuinely uncertain

For math:
- Start with what problem the idea solves
- Use a tiny example before any rule

For code:
- Start with what the code is for
- Then explain input, output, and the main transformation

For abstract topics:
- Anchor the topic in a familiar human situation first
- Then move toward the formal idea

## Guardrails

Do not make the age 4 version inaccurate just to make it cute.
Do not make each age band totally different in metaphor or framing.
Do not merely rewrite the same point with slightly harder words.
Do not flood the age 16 version with jargon.
Do not talk down to the user.
Do not use babyish tone unless the user explicitly wants it.

If the topic is sensitive, high-stakes, or uncertain:
- keep the explanation calm and precise
- mark uncertainty clearly
- avoid oversimplified advice that could mislead

## Final Quality Check

Before finishing, verify:
- all four age bands are present
- the same core idea survives across all four
- each band adds one real layer of understanding
- the explanation becomes more precise with age
- the user could read straight down and feel cumulative learning
