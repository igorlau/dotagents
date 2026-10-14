# Word list

Words and phrases for the [`docs-writing`](../SKILL.md) skill. Each entry lists the word to replace and what to write instead.

## Filler and judgment words

These words add nothing, or judge difficulty for the reader:

| Avoid | Write instead |
|-------|---------------|
| simply, simple, just, easy, easily, quick, quickly | Delete the word. |
| please (in instructions), please note | Delete the word, or state the information directly. |
| in order to | to |
| carefully, properly, thoroughly | Describe the check: "Confirm that the output shows `READY`." |
| currently, now, as of this writing, presently | Delete the word, or give a version number. |
| latest, new, soon, eventually, in the future | A version number or date. |
| performant | A precise measure, such as "responds in under 100 ms". |
| functionality | features, capabilities |
| leverage, utilize | use |
| desire, wish | want, need |
| via | through, by using, with |
| learnings | lessons, things you learned |
| allows you to | lets you |

## Ambiguous words

These words have more than one meaning:

| Avoid | Write instead |
|-------|---------------|
| should | must (required), can (optional), or a recommendation: "We recommend…" |
| may | can (permission or ability), might (possibility) |
| could, would | can |
| will | Present tense, unless the event happens later. |
| once (meaning "after") | after |
| since, as (meaning "because") | because |
| while (meaning "although") | although |
| above, below (positions) | preceding, following, earlier, later |
| above, below (versions) | later, earlier |
| this, that (alone) | Add a noun: "this command". |
| e.g. | for example, such as |
| i.e. | that is |
| etc., and so on | Name the items, or introduce the list with "including". |
| and/or | Rewrite as "A, B, or both". |
| vice versa | State both directions. |

## Technical terms

| Avoid | Write instead |
|-------|---------------|
| abort, kill, terminate (generic) | stop, exit, cancel, end |
| hang, hung | stops responding, isn't responding |
| hit (a key or button) | press, click |
| hover over | hold the pointer over, point to |
| click on | click |
| check, uncheck, deselect (checkboxes) | select, clear |
| execute | run, unless "run" is less precise |
| application | app, except in fixed terms such as "application programming interface" |
| config | configuration |
| repo | repository |
| regex | regular expression |
| spin up | create, start |
| deprecated (meaning "removed") | removed. "Deprecated" means still available but not recommended. |
| disable (for something broken) | unavailable, inactive |
| display (intransitive) | appear |
| populate (forms) | fill in |
| impact (verb) | affect |
| comprise | consist of, contain, include |
| log in, login (verb) | sign in, unless the product says "log in" |
| sign into | sign in to |
| e-mail | email (not a verb: "send an email") |
| Id, id | ID |
| back-end, front-end | backend, frontend |
| check box | checkbox |
| drop-down (as a noun) | menu, list |
| pop-up | dialog, menu |
| CLI (generic), UI (generic) | Name the specific tool or page. |
| ssh into | use SSH to connect to |
| dummy | placeholder, sample |

## Inclusive language

| Avoid | Write instead |
|-------|---------------|
| whitelist, blacklist | allowlist, denylist or blocklist |
| master, slave | primary, main, leader, controller; replica, secondary, worker |
| sanity check | quick check, confidence check |
| crazy, insane, sane | unexpected, baffling, valid, sensible |
| cripple | slow down, break |
| blind to, turn a blind eye | unaware of, ignore |
| dumb down | simplify |
| guys, you guys | everyone, folks |
| he, she (unknown person) | they |
| man-hours, manpower | person-hours, staff |
| man-in-the-middle | on-path attacker, person-in-the-middle |
| guru, ninja, rockstar | expert |
| native (for people) | Rewrite. For software, use "built-in". |
| first-class citizen | Describe the specific capability. |

## Spelling and form

- **data**: singular mass noun: "the data is", "less data".
- **internet**: lowercase.
- **Markdown**: capitalized.
- **read-only**, **pre-existing**: hyphenated.
- **runtime** for the environment, **run time** for when code runs.
- **setup** is a noun; **set up** is a verb.
- **screenshot** is a noun; the verb is "take a screenshot".

---

Adapted from the word list in the [Google developer documentation style guide](https://developers.google.com/style/word-list), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). This file is a selection; the full list has many more entries.
