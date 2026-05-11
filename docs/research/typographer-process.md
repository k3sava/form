# How real typographers think — distilled heuristics for FORM

Sources cited inline. Compiled 2026-05-11 from interviews, podcasts, and practitioner essays.

## How real typographers READ a phrase before they design
- **Find the single word that carries the meaning.** Paula Scher: "Words have meaning and typography has feeling. When you put them together it's a spectacular combination." She identifies which word is doing the emotional lifting, then differentiates it visually. ([Eye Magazine](https://eyemagazine.com/feature/article/reputations-paula-scher))
- **Listen for cadence in heard speech, not written copy.** Anthony Burrill: "I try to remember things that people say that have a nice ring to them, nice honesty, really" — the *Work Hard and Be Nice to People* line came from an elderly woman in a supermarket queue. ([Smashing](https://www.smashingmagazine.com/2014/01/anthony-burrill-work-hard-be-nice-to-people/))
- **Decide whether the content wants warmth or coldness.** Sagmeister: "We go with handwriting when the content is personal, emotional, and deeply human, but we might also go against that and express personal content in deliberately cold typography." ([CreativePro](https://creativepro.com/typetalk-the-typographic-expressions-of-stefan-sagmeister/))
- **Ask whether the phrase has a literal referent.** Scher used Rockwell for the High Line: "If you're going to design a logo for a railroad that was going to be turned into a park, it should have railroad type in it." ([Eye Magazine](https://eyemagazine.com/feature/article/reputations-paula-scher))
- **Audit emotional weight per word before sizing anything.** evo-poster encodes this explicitly: NLP emotion-tagging runs on the phrase before any layout decisions. ([evo-poster](https://github.com/sergiomrebelo/evo-poster))

## How they pick the COMPOSITION SHAPE
- **Architecture before aesthetics.** Vignelli: "Design begins with architecture (grids, proportion, hierarchy) not aesthetics" — the structural skeleton is locked before a typeface is chosen.
- **Constraint drives shape.** Hatch Show Print: "the printer is the designer" — the drawer of available wood type literally constrains shape; condensed faces stretch tall, extended faces fill wide bands. Bryce McCloud: "your first answer just isn't possible, so you have to go with Answer F."
- **For parallel beats, use a stacked block.** Mike Joyce's Swissted: tight rectangular block, lowercase Akzidenz-Grotesk — bands act as horizontal stripes because punk show lineups are inherently list-shaped. ([Interview Mag](https://www.interviewmagazine.com/culture/mike-joyces-swiss-style))
- **For monumental statements, one big word and let everything else cower.** Scher's Public Theater posters: scale, weight, angle "narrow, widen, and turn like the city's streets" — one word is monumental, rest are subordinate.
- **Standardize when you need to be a magazine.** Crouwel at Stedelijk: a fixed grid "as if the posters were issues of a magazine," all weights of Univers on the same baseline because Univers shares x-height across weights.

## SCALE & weight decisions
- **Limit yourself to three sizes.** Body / sub / display. Constraint forces intentional contrast; unlimited scaling produces mush.
- **One prima ballerina.** "Only one was the prima ballerina, and everything else bowed to her" — exactly one focal element.
- **Use weight, not size, when the phrase is rhythmically equal.** Crouwel chose Univers specifically because all weights sit on the same baseline at the same x-height — hierarchy via weight only.
- **Always bold; non-negotiable for slogans.** Burrill: "The wood type that I use is always especially bold... I mean what I'm saying."
- **Condensed for long phrases, extended for short.** 19th-century letterpress logic encoded in evo-poster: "condensed typefaces for lengthy sentences and extended typefaces for shorter ones."
- **Modulate height + weight + font *together*** — never just one variable — when you want a word to read as a different *kind* of word.

## LINE-BREAK decisions
- **Break at the payoff.** Burrill's "WORK HARD / AND BE NICE / TO PEOPLE" puts the imperative on line 1 and the recipient on line 3 — the gift gets isolated.
- **Never let a single word dangle unless it's the punchline.** Avoid widows — *unless* the widow is the word you want to land on.
- **Break at the natural beat, not the grammatical clause.** Mike Joyce's Swissted shows: band / venue / date — each line is one breath.
- **Break to fit the block; rewrite if you must.** Hatch: physical wood-type width decides the break; designers swap a synonym before they break ugly.
- **Tightness signals belonging.** Distance between elements signals connection — tight bonds, gaps separate.
- **Isolate the verb when the verb is the message.** Scher's "Bring in 'Da Noise, Bring in 'Da Funk" repeats "Bring in" as a parallel cadence — line breaks reinforce the chant.

## Kill-list
- **No Helvetica when feeling is needed.** Scher: Helvetica "neutralises feeling." Joyce: "every single design is set in lowercase berthold akzidenz-grotesk – not helvetica" — and "not Helvetica" is explicit.
- **No decoration that doesn't carry meaning.** Joyce: "the Swiss Modernists purged all decoration... bold and structured can still be vivid and filled with emotion."
- **No expressionist self-indulgence (for the systematizers).** Crouwel: "a designer should have a cool and detached approach."
- **No exposed grid.** Vignelli: the grid "is like underwear. You wear it, but it's not to be exposed."
- **No phrase you don't mean.** Burrill: "You've got to mean it. People do know when you don't mean it."

## Practitioner short blurbs
- **Paula Scher** — type *as* image: scale extremes, mixed faces, angled stacks. Public Theater posters are canon.
- **Stefan Sagmeister** — content dictates form; will literally carve into skin to make typography authentic.
- **Mike Joyce (Swissted)** — single lockup: lowercase Akzidenz-Grotesk, dense rectangular block, abstract geometric mark; punk content in Swiss skin.
- **Anthony Burrill** — bold wood type, three-line block, no irony; partners with letterpress printer Adams of Rye.
- **Erik Spiekermann** — engineer's clarity: hierarchy as readable system, not expression.
- **Massimo Vignelli** — four typefaces in fifty years; grid is the skeleton, type the surface.
- **Wim Crouwel** — pure grid, Univers in all weights on one baseline.
- **Louise Fili** — hand-sketches the name "over and over again, letting it speak to her" before touching a computer; vintage food/cultural lettering.
- **Hatch Show Print** — preservation through production; the drawer of physical wood type is the design system.

## Open-source code worth studying
- **[sergiomrebelo/evo-poster](https://github.com/sergiomrebelo/evo-poster)** — genetic algorithm with explicit fitness functions for legibility, alignment, balance, typeface pairing, negative-space; NLP emotion-tagging before layout. The most legible academic encoding of poster heuristics.
- **[IllusionInk/Processing_Swiss-Posters](https://github.com/IllusionInk/Processing_Swiss-Posters)** — Swiss-style poster replication in Processing.
- **[openrndr/workshop-generative-posters](https://github.com/openrndr/workshop-generative-posters)** — data-driven poster workshop; clean parameterization reference.
- **[teotimepacreau/Swiss-International-Style-Responsive](https://github.com/teotimepacreau/Swiss-International-Style-Responsive)** — responsive web International Typographic Style.
- **[spacetypeco/generative-typography-SU20](https://github.com/spacetypeco/generative-typography-SU20)** — SAIC course materials; manipulating digital type as building blocks.

## Three posters to study
1. **Paula Scher — "Bring in 'Da Noise, Bring in 'Da Funk"** (Public Theater, 1995). Mixed weights, narrow/wide stretches, type that "turns like the city's streets." Parallel-cadence stacking + repetition as chant.
2. **Stefan Sagmeister — AIGA Detroit lecture poster** (1999). Words carved into his skin; the medium *is* the message.
3. **Anthony Burrill — "Work Hard and Be Nice to People"** (2004). Three-line wood-type block; the payoff "TO PEOPLE" isolated on line 3.

---

## How FORM should embody this (action list)

### Layer 1 — Read (parser + intent)
- One word, not many, gets the max scale. Currently my detector can over-flag.
- Three discrete tiers (display / sub / body), not a continuous scale.
- Add a `temperature` field (warm/cold/neutral) for face selection.
- Add a `literal-referent` field for shape hints (tree, city, fall, rise).

### Layer 2 — Shape (composition archetype, NEW)
Eight archetypes, picked by heuristic from parse tree:
- **BLOCK** — equal-width solid (declarative wisdom). Default fallback.
- **MONUMENT** — one giant word, others cower (imperative + short).
- **TREE** — lines progressively widen toward base, payoff at apex (long narrative w/ time payoff).
- **INVERTED** — lines progressively narrow toward base, payoff alone (contrast pairs, irony).
- **DIAMOND** — narrow / wide / narrow (symmetric truth, balanced argument).
- **STACK** — equal-height row bands per beat (parallel beats, lists).
- **HANGING-DROP** — body stacked, last word isolated with whitespace.
- **OFF-AXIS** — asymmetric placement (broken expectation, irony).

### Layer 3 — Render (per-philosophy)
Each philosophy (GRID, EDITORIAL, BRUTALIST, KINETIC, PAINTERLY, MYCELIUM) takes the chosen archetype + its scale-per-line spec and renders the type in its visual technique. Composition is decoupled from rendering.

### Kill-list to enforce
- No more than 3 distinct scales per composition.
- Default voice for "feeling" should NOT be Helvetica — use Akzidenz-Grotesk or fall back to Inter/system bold.
- BASELINE off by default in GRID (the grid is underwear).
- Always render at least one mode in pure bold.
- For Painterly/Mycelium: literal-referent should drive shape (tree → tree-like branch growth, city → urban grid).
