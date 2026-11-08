# Plainly

**Ctrl+V your medical paperwork. Understand it in your language, and catch medicine mistakes before they hurt you.**

Plainly is a free website for patients and caregivers, and for the nurses who write their instructions.

- **Understand a document.** Paste text, photograph, or upload a PDF of a discharge note, prescription or lab report. Plainly explains it in plain words and builds a daily medicine schedule. It lists warning signs (emergency vs. call your doctor), next steps, results still pending and test results. Every point links to the sentence it came from.
- **Medicine safety checks.** 19 checks for well-documented error patterns, such as acetaminophen from several products above 4 g a day, an opioid with a benzodiazepine, an allergy conflict, a medicine the same note says to avoid, or methotrexate written as daily.
- **Your language.** Doses, times and warnings use fixed, hand-written wording in 8 languages. Other sentences are machine-translated on the device, and rejected if a number or medicine name changes.
- **Compare two medicine lists.** For example, the hospital list against the bottles at home. Brand and generic names are matched, and every difference is explained.
- **For clinicians.** Check a note before handing it out: reading level, jargon density, Joint Commission/ISMP error-prone abbreviations, missing safe-discharge elements (AHRQ Project RED), and an editable plain-language draft.
- **Take it home.** Calendar reminders (.ics) for every dose and appointment, a printable bilingual medicine card, and read-aloud.

**Cost: $0.** No server, no account, no API key, no paid AI. Documents never leave the device.

## Run it

Any static web server works; nothing needs to be built.

```bash
cd plainly
python -m http.server 8000
# open http://localhost:8000
```

**Deploy for free:** push the `plainly/` folder to GitHub and turn on GitHub Pages, or use Netlify or Cloudflare Pages. After the first visit it works offline: it is an installable web app with a service worker.

Demo links: `?sample=discharge`, `?sample=surgery`, `?sample=labs`, `?sample=prescription`, `&lang=es` (or zh, vi, ar, hi, fr, ru), `?tool=reconcile`, `?tool=clinician`.

## How it works

| Layer | What it does | Where |
|---|---|---|
| Document reader | Sections (START / CHANGE / CONTINUE / STOP medicines, allergies, diagnosis, follow-up, pending, warnings), prescription shorthand (strength, amount, form, route, frequency, PRN reason, duration, maximum, food), lab rows with reference ranges and flags, bulleted warning lists, appointments (absolute and relative dates), plain-language rewriting, glossary, medical word-part decoder | `js/engine.js`, `js/kb.js` |
| Safety checks | 19 checks; every finding links to its source sentences and says what to ask | `js/checks.js` |
| Free NLM data (optional) | RxNorm (spelling correction, ingredients, drug class through ATC for medicines not in the built-in list) and MedlinePlus Connect (patient pages in English and Spanish for medicines, lab tests by LOINC, and conditions by ICD-10). Only names and codes are sent. | `js/nlm.js` |
| Translation | Hand-written templates for safety-critical wording. For other text, Chrome's built-in on-device Translator when available, otherwise OPUS-MT models in a Web Worker (Transformers.js). Number lock, medicine-name lock, English shown under warnings. | `js/i18n.js`, `js/translate.js`, `js/mt-worker.js` |
| Reading files | Photos: Tesseract.js OCR on the device. PDFs: pdf.js text extraction. | `js/app.js` |
| Outputs | .ics reminders, bilingual medicine card, print, read-aloud (Web Speech API) | `js/exporters.js`, `js/app.js` |
| Tools | List comparison, clinician note checker | `js/reconcile.js`, `js/writer.js` |

## Accuracy

See [bench/RESULTS.md](bench/RESULTS.md). Held-out set, run once: 100% of medicine lines recognized, 92.1% of medicine fields correct, and 100% on safety problems, safe-case alarms, labs, critical values, abbreviations and warning lists (small sets). Translation quality limits and mitigations are documented there too.

## Limits

- Plainly explains documents; it does not diagnose or give medical advice. Every safety finding says "ask your pharmacist or doctor".
- The built-in medicine list covers 180 common medicines (405 generic and brand names). Others are recognized online through RxNorm, or flagged as "not recognized".
- Interaction checks cover a small set of high-risk, well-established combinations. Plainly is not a complete interaction database.
- Translations of the fixed wording were written by the team and need review by native-speaking clinicians. On-device machine translation for Vietnamese, Arabic and Hindi is basic, and the page says so.
- Photo reading (OCR) can make mistakes. The text is shown for checking before it is explained.

## Sources

- Health literacy: U.S. National Assessment of Adult Literacy (12% proficient); Economist Impact 2026 (1 in 4 adults across 40 countries, $303B a year).
- Discharge comprehension: heart-failure study, PMC4241117 (14 of 145 understood all instructions); Engel et al., *Ann Emerg Med* (78% missed part of their care).
- Language access: KevinMD 2025 (25M+ U.S. residents with limited English proficiency); Boostlingo 2025 interpreter report. The free-interpreter requirement comes from Title VI of the Civil Rights Act and ACA Section 1557.
- Medication safety: FDA acetaminophen dosing and liver-injury communications; FDA 2016 boxed warning on opioids with benzodiazepines; FDA 2019 warning on gabapentinoids; ISMP List of Error-Prone Abbreviations; Joint Commission "Do Not Use" list; ISMP alerts on daily-instead-of-weekly methotrexate.
- Discharge content: AHRQ Re-Engineered Discharge (Project RED) toolkit.
- Data: RxNorm, RxClass and MedlinePlus Connect (U.S. National Library of Medicine).
