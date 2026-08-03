# About narrative: three skimmable alternatives v1

Status: alternative editorial directions for review

Prepared: 2026-08-02

These alternatives keep the same story, animation order, travelling titles, proof moments, discipline reveal, project stack, and finale as the [continuous monologue options](ABOUT-NARRATIVE-MONOLOGUE-OPTIONS-v1.md). They change the reading rhythm by alternating short prose with semantic bullet lists.

| Version | Tonal emphasis | Core words |
| --- | --- | ---: |
| A | Warm and direct | 201 |
| B | Reflective and human | 208 |
| C | Forward and energetic | 219 |

Core counts include visible list labels and bullet items. Fixed interface titles, supporting discipline copy, media labels, and actions remain outside the count.

## Implementation note

The About renderer already supports a styled editorial `list` block. The current two mixed editorial stacks do not yet accept list modules beside prose, logos, and the project stack. These drafts show the intended semantic structure. A selected direction will need a small list-module extension inside `EditorialStack`; bullet glyphs should not be pasted into prose strings because the line-reveal renderer would flatten their structure.

## Version A — warm and direct

### Opener — `text-promise-main`

**Title**

> About Me

**Description**

> I’m a designer who loves turning complex ideas into products, systems and experiences people can understand and enjoy.

### Early travelling titles

`text-complexity-idea`

> I’ve always been drawn to problems that cross boundaries…

`text-complexity-conditions`

> …because one way of thinking is rarely enough.

### First reading block

**Prose**

> Hi, I’m Alex. I’m a designer at heart, happiest when ideas start becoming real.

**List module**

> **The path widened:**
>
> - Communication Design showed me how visual language can feel human.
> - Print led to interfaces.
> - Working with developers opened behaviour and systems.

**Prose**

> Each step made design feel more useful, more collaborative and more alive to me.

`[Client logo grid and shared caption]`

### Bridge travelling titles

`text-complexity-curiosity`

> One part of the work kept opening into another…

`text-complexity-listen`

> …until disciplines stopped feeling separate.

`[Shared discipline reveal]`

### Second reading block

**Prose**

> I listen first, then make something real enough for the people involved to discuss.

**List module**

> **That means:**
>
> - Question assumptions.
> - Prototype before choices close.
> - Keep direction open for the team.

**Prose**

> Human judgement matters more as AI enters daily life. I use it to explore, not to replace care, character or responsibility.

`[Project impressions]`

**List module**

> **Questions follow me home:**
>
> - How can AI earn trust?
> - What should technology clarify?
> - Why redesign the iOS keyboard?

### Closing travelling titles

`text-life-momentum`

> I don’t know which question will stay…

`text-life-form`

> …but uncertainty makes room for possibility…

`text-life-character`

> …and something new can begin there.

### Finale — `text-epilogue-invitation`

**Title**

> Let’s talk.

**Description**

> If you’re exploring an unfamiliar problem, I’d love to hear where it might lead.

`[Explore the Lab · See My Work · Get in Touch · LinkedIn]`

## Version B — reflective and human

### Opener — `text-promise-main`

**Title**

> About Me

**Description**

> I’m a designer exploring how visual language and technology can help people find a human way through complexity.

### Early travelling titles

`text-complexity-idea`

> I’ve always been fascinated by things we don’t quite understand…

`text-complexity-conditions`

> …especially when several kinds of thinking are needed.

### First reading block

**Prose**

> Hi, I’m Alex. I’m a designer at heart, happiest when an idea starts becoming visible.

**List module**

> **What held my attention:**
>
> - Images can make an idea felt.
> - Movement can change what people understand.
> - Interfaces can build trust, or quietly weaken it.

**Prose**

> That interest carried me from print into digital products, then towards behaviour, identity and systems.

`[Client logo grid and shared caption]`

### Bridge travelling titles

`text-complexity-curiosity`

> The work widened whenever the questions changed…

`text-complexity-listen`

> …and boundaries gradually mattered less.

`[Shared discipline reveal]`

### Second reading block

**Prose**

> I work best when a team can think together before an answer hardens.

**List module**

> **So I try to:**
>
> - Listen before deciding.
> - Make the question tangible.
> - Leave room for other people’s marks.

**Prose**

> AI and other technology can feel opaque or unsettling. I use AI to explore possibilities, while keeping nuance and human judgement visible.

`[Project impressions]`

**List module**

> **The questions that linger:**
>
> - How do we make complexity approachable?
> - What makes unfamiliar technology trustworthy?
> - Can an irritating keyboard become a better idea?

### Closing travelling titles

`text-life-momentum`

> I can’t predict the next question…

`text-life-form`

> …but curiosity keeps me moving…

`text-life-character`

> …towards whatever we might make next.

### Finale — `text-epilogue-invitation`

**Title**

> Let’s talk.

**Description**

> If you’re facing a difficult question, I’d be happy to explore it with you.

`[Explore the Lab · See My Work · Get in Touch · LinkedIn]`

## Version C — forward and energetic

### Opener — `text-promise-main`

**Title**

> About Me

**Description**

> I’m a designer working across products and technology, looking for clearer, more human ways to turn uncertainty into something useful.

### Early travelling titles

`text-complexity-idea`

> The problems I enjoy rarely arrive in one neat category…

`text-complexity-conditions`

> …so I’ve learned to follow them across disciplines.

### First reading block

**Prose**

> Hi, I’m Alex. I’m a designer at heart, and I love seeing difficult ideas take shape.

**List module**

> **The work kept expanding:**
>
> - Visual language led to interfaces.
> - Interfaces led to behaviour and systems.
> - Systems opened questions about identity and trust.

**Prose**

> Over more than a decade, those questions have drawn me towards products, emerging technology and new ways of making.

`[Client logo grid and shared caption]`

### Bridge travelling titles

`text-complexity-curiosity`

> Each answer opened a different kind of question…

`text-complexity-listen`

> …and my practice kept growing to meet it.

`[Shared discipline reveal]`

### Second reading block

**Prose**

> I start by listening and turning an uncertain idea into something the team can respond to.

**List module**

> **Then we can:**
>
> - Test the assumptions.
> - Keep important choices open.
> - Build character into the answer.

**Prose**

> Human judgement matters more as AI speeds up the work. I use it to explore faster, while keeping the outcome clear and worth trusting.

`[Project impressions]`

**List module**

> **What keeps pulling me forward:**
>
> - AI, trust and privacy.
> - Robotics and unfamiliar human problems.
> - Small frustrations that might become useful tools.

### Closing travelling titles

`text-life-momentum`

> I can’t know what comes next…

`text-life-form`

> …because uncertainty leaves room to imagine…

`text-life-character`

> …and gives us something new to make.

### Finale — `text-epilogue-invitation`

**Title**

> Let’s talk.

**Description**

> If you’re shaping something unfamiliar, I’d love to hear what it could become.

`[Explore the Lab · See My Work · Get in Touch · LinkedIn]`

## Shared supporting copy

Use the same client caption, discipline labels and descriptions, project-stack label, and finale actions as the continuous monologue options. This keeps the review focused on reading rhythm rather than changing every supporting element at once.

## Comparison notes

- Version A is the shortest and easiest to scan. Its bullets are direct without becoming a service list.
- Version B uses bullets as observations and questions, which best preserves its reflective character.
- Version C uses bullets to show progression and action, which strengthens its forward momentum.
- In every option, prose introduces the human reason, bullets expose the structure, and travelling titles carry the story into the next animated state.
