# Plainly accuracy results

Everything here runs in the browser: open `bench/index.html` (development set) or `bench/heldout.html` (held-out set).
Raw results are saved as JSON next to this file.

## How the test was done

- **Development set** (`cases.js`): 35 prescription lines, 10 non-medicine lines, 22 safety scenarios (15 with a real problem, 7 that must *not* raise an alarm), 10 lab rows, 10 abbreviation cases and 3 warning-sign lists. Written in wording different from the demo samples, and labelled by hand **before** the first run, using standard pharmacy interpretation (for example "q4-6h PRN" = up to 6 doses a day).
- **Held-out set** (`heldout.js`): 20 more prescription lines, 5 non-medicine lines, 8 safety scenarios, 5 labs, 4 abbreviation cases and 2 warning lists. Written **after** the development fixes and run **once**. Its first score is the honest estimate for text Plainly has not seen.
- Every case was written by the team, not taken from real patients. This is an engineering test, not a clinical validation.

## Development set

| Measure | First run | After fixes |
|---|---|---|
| Medicine lines recognized | 35/35 (100%) | 35/35 (100%) |
| Medicine fields correct (doses per day, PRN, route, duration, daily mg, time of day) | 75/77 (97.4%) | 77/77 (100%) |
| Non-medicine lines correctly ignored (lab rows, vitals, diet) | 10/10 (100%) | 10/10 (100%) |
| Safety problems detected | 16/18 (88.9%) | 18/18 (100%) |
| Safe medicine lists with no false alarm | 7/7 (100%) | 7/7 (100%) |
| Lab result high/low/normal | 10/10 (100%) | 10/10 (100%) |
| Critical lab values flagged | 10/10 (100%) | 10/10 (100%) |
| Error-prone abbreviations found | 10/10 (100%) | 10/10 (100%) |
| Warning-sign lists split correctly | 1/3 (33%) | 3/3 (100%) |

What failed on the first run, and what was fixed:

1. "every 6 **hrs**" and "2 **caplets**" were not understood. This made a Tylenol line count 500 mg a day instead of up to 4,000 mg.
2. Lines with no "mg" written ("Norco 5-325 1 tab q6h", "Bactrim DS 1 tab BID") were ignored. As a result, an acetaminophen duplicate and a sulfa-allergy conflict were **missed**.
3. "Seek medical care **right away**" was not recognized as an emergency instruction, and "swelling **or** redness" was kept as one sign.

## Held-out set (run once)

| Measure | Result |
|---|---|
| Medicine lines recognized | 20/20 (100%) |
| Medicine fields correct | **35/38 (92.1%)** |
| Non-medicine lines correctly ignored | 5/5 (100%) |
| Safety problems detected | 6/6 (100%) |
| Safe medicine lists with no false alarm | 3/3 (100%) |
| Lab status / critical values | 5/5 and 5/5 (100%) |
| Error-prone abbreviations | 4/4 (100%), no false flags |
| Warning-sign lists | 2/2 (100%) |

The 3 field errors share one cause: "three times **daily**" and "four times **daily**" (a number word plus "daily") were read as once a day. This was fixed afterwards and now scores 38/38. The **92.1%** figure is the one we report as the unbiased estimate.

## On-device translation test

Five safety-relevant sentences were translated into 7 languages with the free OPUS-MT models running in the browser (`?mt=local`). The **number lock** rejected these translations and showed English instead:

| Language | Rejected by number lock | Meaning errors we saw that the lock cannot catch |
|---|---|---|
| Spanish | 0/5 | none seen |
| French | 0/5 | none seen |
| Chinese | 2/5 | drug name transliterated |
| Russian | 2/5 | none seen |
| Vietnamese | 1/5 | "acetaminophen" became "brightness" |
| Arabic | 3/5 | "swelling behind the ear" became "swimming behind the ear" |
| Hindi | 0/5 | "call your doctor" was dropped |

What we changed because of this test:

- **Medicine-name lock.** In Latin-script languages, a translation that loses a medicine name is rejected. In other scripts, the English name is added in brackets.
- **Warning signs and safety alerts always show the English original underneath.**
- **Each language has an honest quality label.** Vietnamese, Arabic and Hindi are marked "basic". When those models are used, the page tells the patient about their legal right to a free medical interpreter.
- **Chrome's built-in on-device translator is used first when available.** It gave noticeably better results in our tests.

Doses, times, routes, warning urgency and safety-check titles never pass through machine translation; they use the fixed wording in `js/i18n.js`.
