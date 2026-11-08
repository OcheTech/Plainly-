/* Plainly engine: turns a medical document into structured, plain-language data, on the device.
 * Exposes window.PlainlyEngine. No network access here (see nlm.js for optional lookups).
 */
(function () {
  "use strict";
  const KB = window.PlainlyKB;

  // ================================================================== text utilities
  const norm = (s) =>
    String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/[^\p{L}\p{N}%.<>]+/gu, " ").replace(/\s+/g, " ").trim();
  const tokens = (s) => norm(s).split(" ").filter((t) => t.length > 1 || /\d/.test(t));
  function jaccard(a, b) {
    const A = new Set(tokens(a)), B = new Set(tokens(b));
    if (!A.size || !B.size) return 0;
    let i = 0; A.forEach((t) => B.has(t) && i++);
    return i / Math.min(A.size, B.size);
  }
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const WORDNUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, half: 0.5, "½": 0.5, "1/2": 0.5 };
  const num = (s) => (s == null ? null : WORDNUM[String(s).toLowerCase()] ?? parseFloat(String(s).replace(/,/g, "")));

  const BULLET = /^\s*(?:[-–•*·▪◦□☐■>]|\(?\d{1,2}[.)]|[a-z][.)])\s+/;

  /** Lines with sentence parts, bullet info and blank-line boundaries (exact original text kept). */
  function splitLines(text) {
    const out = [];
    let blank = true;
    String(text || "").replace(/\r/g, "").split("\n").forEach((raw) => {
      const l = raw.trim();
      if (!l) { blank = true; return; }
      const parts = [];
      l.split(/(?<=[A-Za-z)%\]][.!?])\s+(?=[A-Z0-9"(])/).forEach((s) => {
        const t = s.trim();
        if (!t) return;
        if (parts.length && /\b([A-Z]|Dr|Mr|Mrs|Ms|St|vs|approx|e\.g|i\.e|No|Jr|Sr)\.$/.test(parts[parts.length - 1])) parts[parts.length - 1] += " " + t;
        else parts.push(t);
      });
      out.push({ line: l, parts, bullet: BULLET.test(raw), blankBefore: blank });
      blank = false;
    });
    return out;
  }
  const splitUnits = (text) => splitLines(text).flatMap((l) => l.parts);
  const stripBullet = (s) => s.replace(BULLET, "").trim();

  // ================================================================== section headers
  const HEADERS = [
    [/^(?:start(?:ing)?|begin|new)\b.*\b(?:medications?|medicines?|meds|prescriptions?)\b|^new (?:medications?|meds|prescriptions?)/i, "meds_new"],
    [/^change(?:d)?\b.*\b(?:medications?|medicines?|meds|how you take)\b|^(?:medications?|meds) (?:that )?changed|^dose changes?/i, "meds_changed"],
    [/^(?:continue|keep taking|unchanged)\b.*\b(?:medications?|medicines?|meds)\b/i, "meds_continue"],
    [/^(?:stop|discontinue(?:d)?|do not take|don't take)\b.*\b(?:medications?|medicines?|meds|taking)\b|^discontinued (?:medications?|meds)|^stop taking/i, "meds_stop"],
    [/^(?:discharge|home|current|outpatient|your)?\s*(?:medications?|medicines?|meds|medication list|prescriptions?|rx)\b/i, "meds"],
    [/^(?:drug\s+)?allerg/i, "allergies"],
    [/warning signs|when to (?:call|seek|get help)|return precautions|reasons? to (?:call|return)|call your doctor if|seek (?:medical )?(?:care|help) if|go to the (?:er|emergency)/i, "warnings"],
    [/^(?:follow[- ]?up|appointments?|upcoming|scheduled|f\/u)\b/i, "followup"],
    [/^(?:pending|results? pending|tests? pending|outstanding)/i, "pending"],
    [/^(?:diet|nutrition|eating)\b/i, "diet"],
    [/^(?:activity|exercise|physical activity|restrictions)\b/i, "activity"],
    [/^(?:wound|incision|dressing|drain)\b.*(?:care)?|^wound care/i, "wound"],
    [/^(?:dx|diagnos[ie]s|reason for (?:visit|admission|hospitalization)|problem list|discharge diagnos|admitting diagnos|principal diagnos|final diagnos)/i, "diagnosis"],
    [/^(?:procedures?|surgery|operation|operations performed)\b/i, "procedure"],
    [/^(?:hospital course|history|hpi|brief summary|summary of stay|assessment)/i, "course"],
    [/^(?:instructions|discharge instructions|patient instructions|home care|care instructions|what to do)/i, "instructions"],
  ];
  function headerOf(lineObj) {
    const l = stripBullet(lineObj.line);
    const colon = l.indexOf(":");
    const head = colon > 0 && colon < 70 ? l.slice(0, colon) : l;
    const rest = colon > 0 && colon < 70 ? l.slice(colon + 1).trim() : "";
    const looksHeader = colon > 0 && colon < 70 ? true : (l.length < 70 && (/^[^a-z]*$/.test(l) || /^(?:start|stop|change|continue)\b.*\b(?:medications?|medicines)\s*$/i.test(l) || /^[\w\s]{0,30}\b(?:medications?|medicines?|meds)(?: list)?\s*$/i.test(l)));
    if (!looksHeader) return null;
    if (/\d+(?:\.\d+)?\s*(?:mg|mcg|units?|mL|g|mEq)\b/i.test(head)) return null; // a medicine line, not a header
    for (const [re, type] of HEADERS) if (re.test(head.trim())) return { type, rest };
    if (!rest && /:\s*$/.test(l) && warningLead(head)) return { type: "warnings", rest: "" };
    return null;
  }

  // ================================================================== plain-language rewrite
  const REPLACE = [
    [/\bPt is an? (\d+) ?y\/?o (?:F|female|woman) (?:who )?(?:presented|presents) with\b/gi, "You are a $1-year-old woman who came in with"],
    [/\bPt is an? (\d+) ?y\/?o (?:M|male|man) (?:who )?(?:presented|presents) with\b/gi, "You are a $1-year-old man who came in with"],
    [/\b(?:pt|patient) (?:was|is)\b/gi, "you were"], [/\b(?:pt|patient) to\b/gi, "you should"], [/\bCOPD exac(?:erbation)?\.?/g, "a COPD flare-up"],
    [/\bCAP\b/g, "pneumonia caught outside the hospital (CAP)"], [/\bSpO2 (\d+)% (?:on )?RA\b/g, "oxygen level $1% on room air"], [/\bReturn precautions given\b/gi, "You were told when to come back"], [/\bpt\b/gi, "you"], [/\bD\/C home\b/gi, "You can go home"], [/\by\/o\b/gi, "year-old"],
    [/\bf\/u\b/gi, "follow-up"], [/\bw\/o\b/gi, "without"], [/\bw\/\s?/gi, "with "], [/\bs\/p\b/gi, "after"], [/\bh\/o\b/gi, "history of"],
    [/\bc\/o\b/gi, "complaining of"], [/\bhx\b/gi, "history"], [/\bdx\b/gi, "diagnosis"], [/\btx\b/gi, "treatment"], [/\babx\b/gi, "antibiotics"],
    [/\bprogressive\b/gi, "worsening"], [/\bdyspnea on exertion\b|\bDOE\b/g, "shortness of breath when active"], [/\bdyspnea\b|\bSOB\b/gi, "shortness of breath"],
    [/\borthopnea\b/gi, "trouble breathing when lying flat"], [/\bbilateral (?:LE|lower extremity) edema\b/gi, "swelling in both legs"], [/\bLE\b/g, "leg"],
    [/\blower extremit(?:y|ies)\b/gi, "legs"], [/\bupper extremit(?:y|ies)\b/gi, "arms"], [/\bedema\b/gi, "swelling"],
    [/\bIV diuresis\b/gi, "water-removing medicine through a vein"], [/\bNet negative ([\d.]+) ?L\b/gi, "About $1 liters of extra fluid was removed"],
    [/\btransitioned to PO\b/gi, "switched to the pill form of"], [/\bprior to\b/gi, "before"], [/\bsubsequently\b/gi, "then"], [/\butilize\b/gi, "use"],
    [/\bEcho showed LVEF (\d+)%/gi, "A heart ultrasound showed your heart pumps at $1% (normal is about 50-70%)"],
    [/\bacute (?:on chronic )?decompensated heart failure\b/gi, "a sudden worsening of heart failure"], [/\bwith reduced ejection fraction \(HFrEF\)/gi, "(a weak heart pump)"],
    [/\bhypertension\b|\bHTN\b/g, "high blood pressure"], [/\bhyperlipidemia\b|\bdyslipidemia\b/gi, "high cholesterol"], [/\bCKD stage (\w+)/gi, "chronic kidney disease (stage $1)"],
    [/\bacute otitis media\b/gi, "a middle ear infection"], [/\bpush fluids\b/gi, "drink plenty of fluids"], [/\bactivity as tolerated\b/gi, "You can be as active as feels comfortable"],
    [/\bambulate\b/gi, "walk"], [/\bambulation\b/gi, "walking"], [/\bno heavy lifting (?:over|greater than|>) ?(\d+) ?(?:lb|lbs|pounds)\b/gi, "Do not lift anything heavier than $1 pounds"],
    [/\blow sodium diet\b/gi, "Eat a low-salt diet"], [/\b(\d+(?:\.\d+)?) ?g (?:sodium|Na) (?:per day|\/day|daily)\b/gi, "$1 grams of salt (sodium) a day"],
    [/\bless than (\d+) g sodium per day\b/gi, "less than $1 grams of salt (sodium) a day"],
    [/\bfluid restriction (?:of )?([\d.]+) ?L(?:\/day| per day| daily)?\b/gi, "Drink no more than $1 liters of fluid a day"],
    [/\bNWB\b/g, "do not put any weight on it"], [/\bWBAT\b/g, "you can put as much weight on it as feels comfortable"], [/\bROM\b/g, "range of motion"],
    [/\bNPO\b/g, "nothing to eat or drink"], [/\bBMP\b/g, "a basic blood test (BMP)"], [/\bCBC\b/g, "a blood count test (CBC)"], [/\bCMP\b/g, "a blood chemistry test (CMP)"],
    [/\b(?:your )?PCP\b/gi, "your regular doctor"], [/\bthe ED\b|\bthe ER\b/g, "the emergency room"], [/\bED\b|\bER\b/g, "emergency room"],
    [/\bmild hyperkalemia\b/gi, "slightly high potassium"], [/\bhyperkalemia\b/gi, "high potassium"], [/\bhypokalemia\b/gi, "low potassium"],
    [/\bpoorly controlled type 2 diabetes mellitus\b/gi, "type 2 diabetes that is not well controlled"], [/\btype 2 diabetes mellitus\b|\bT2DM\b/gi, "type 2 diabetes"],
    [/\bresults consistent with\b/gi, "These results suggest"], [/\bdiscuss statin therapy\b/gi, "Talk about a cholesterol medicine (statin)"],
    [/\bsigns of infection\b/gi, "signs of infection (redness, warmth, pus or fever)"], [/\bsyncope\b/gi, "fainting"], [/\bmelena\b/gi, "black, tarry stools"],
    [/\bhematuria\b/gi, "blood in the urine"], [/\bafebrile\b/gi, "no fever"], [/\bincision\b/gi, "surgical cut (incision)"], [/\bsutures\b/gi, "stitches"],
    [/\bpat dry\b/gi, "gently pat it dry"], [/\bdaily weights?\b/gi, "weigh yourself every day"],
    [/\b(\d+) ?lbs?\b/gi, "$1 pounds"], [/\bhrs\b/gi, "hours"], [/\bx ?(\d+) ?days?\b/gi, "for $1 days"], [/\bx ?(\d+) ?wks?\b/gi, "for $1 weeks"],
  ];
  function plainify(s) {
    let out = stripBullet(String(s));
    REPLACE.forEach(([re, rep]) => (out = out.replace(re, rep)));
    out = out.replace(/^(?:hospital course|instructions|comment|comments|note|notes|other|labs?|plan)\s*:\s*/i, "");
    out = out.replace(/\s+/g, " ").trim();
    return cap(out);
  }

  // ================================================================== medicine (sig) parser
  const STRENGTH_RE = /(\d+(?:[.,]\d+)?(?:\s*[-/]\s*\d+(?:\.\d+)?)*)\s*(mg|mcg|µg|g|gm|mEq|units?|u|iu|ml|%)(?:\s*\/\s*(\d+(?:\.\d+)?)?\s*(ml|actuation|puff|hr|h|tab|tablet|dose|spray))?(?![A-Za-z])/i;
  const AMOUNT_RE = /(?:^|\b)(?:take|give|inhale|inject|use|apply|instill|place|insert|chew)?\s*(\d+(?:\.\d+)?|one|two|three|four|half|½|1\/2)\s*(tabs?|tablets?|caplets?|caps?|capsules?|pills?|puffs?|inhalations?|sprays?|drops?|gtts?|units?|u|ml|patch(?:es)?|suppositor(?:y|ies)|packets?|capfuls?|scoops?)\b/i;
  const FORM_OF = (w) => {
    w = (w || "").toLowerCase();
    if (/^tab|^pill|^caplet/.test(w)) return "tablet"; if (/^cap(?!ful)/.test(w)) return "capsule"; if (/^puff|^inhal/.test(w)) return "puff";
    if (/^spray/.test(w)) return "spray"; if (/^drop|^gtt/.test(w)) return "drop"; if (/^unit|^u$/.test(w)) return "unit"; if (/^ml/.test(w)) return "mL";
    if (/^patch/.test(w)) return "patch"; if (/^suppos/.test(w)) return "suppository"; return "dose";
  };

  function parseFrequency(s) {
    const f = { perDay: null, times: [], intervalH: null, intervalMax: null, key: null, vars: {}, prn: false, prnReason: "", weekly: false, qod: false };
    let m;
    if ((m = s.match(/\bq\.?\s?(\d+)\s*(?:-|to)\s*(\d+)\s*h(?:rs?|ours?)?\b|\bevery\s+(\d+)\s*(?:-|to)\s*(\d+)\s*(?:hours?|hrs?|h)\b/i))) {
      const a = +(m[1] || m[3]), b = +(m[2] || m[4]);
      f.intervalH = a; f.intervalMax = b; f.perDay = Math.floor(24 / a); f.key = "f_qhr"; f.vars = { a, b };
    } else if ((m = s.match(/\bq\.?\s?(\d+)\s*h(?:rs?|ours?)?\b|\bevery\s+(\d+)\s*(?:hours?|hrs?|h)\b/i))) {
      const h = +(m[1] || m[2]);
      f.intervalH = h; f.perDay = Math.floor(24 / h); f.key = "f_qh"; f.vars = { n: h };
    } else if (/\bQID\b|\b(?:four|4) ?(?:times|x) ?(?:a |per |each )?(?:day|daily)\b|4x ?\/ ?day/i.test(s)) { f.perDay = 4; f.key = "f_4"; }
    else if (/\bTID\b|\b(?:three|3) ?(?:times|x) ?(?:a |per |each )?(?:day|daily)\b|3x ?\/ ?day/i.test(s)) { f.perDay = 3; f.key = "f_3"; }
    else if (/\bBID\b|twice (?:a |per |each )?(?:day|daily)|\b(?:two|2) ?(?:times|x) ?(?:a |per |each )?(?:day|daily)\b|2x ?\/ ?day|every 12 hours/i.test(s)) { f.perDay = 2; f.key = "f_2"; }
    else if (/\bq\.?\s?o\.?\s?d\.?\b|every other day|alternate days/i.test(s)) { f.perDay = 0.5; f.key = "f_qod"; f.qod = true; }
    else if (/\b(?:once )?(?:a |per |every |each )?week(?:ly)?\b|\bq\s?(?:wk|week)\b|once a week|every (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(s) && !/\bfor \d+ weeks?\b|\bin \d+ weeks?\b/i.test(s)) { f.perDay = 1 / 7; f.key = "f_weekly"; f.weekly = true; }
    else if (/\bq\.?\s?hs\b|\bHS\b|at bedtime|nightly|every night|before bed/i.test(s)) { f.perDay = 1; f.key = "f_bedtime"; f.times = ["bedtime"]; }
    else if (/\bq\.?\s?am\b|every morning|in the morning|each morning/i.test(s)) { f.perDay = 1; f.key = "f_morning"; f.times = ["morning"]; }
    else if (/\bq\.?\s?pm\b|every evening|in the evening|each evening/i.test(s)) { f.perDay = 1; f.key = "f_evening"; f.times = ["evening"]; }
    else if (/\bdaily\b|\bq\.?\s?d\.?\b|once (?:a |per )?day|every day|1 time (?:a|per) day|once daily|\bOD\b(?!.*(?:drop|gtt|eye))/i.test(s)) { f.perDay = 1; f.key = "f_1"; }
    else if (/\bwith (?:each )?meals\b|\bAC\b|before (?:each )?meals\b|\bTIDAC\b/i.test(s)) { f.perDay = 3; f.key = "f_meals"; f.times = ["morning", "midday", "evening"]; }

    if (/\bPRN\b|\bas needed\b|\bif needed\b|\bwhen needed\b|\bas necessary\b|\bif you need\b/i.test(s)) {
      f.prn = true;
      const r = s.match(/(?:\bPRN|as needed|if needed|when needed)\s*(?:for\s+|to\s+)?([a-z][a-z ,/'-]{2,40}?)(?=\s*(?:[.;)]|$|\bmax|\bnot\b|\bdo not|\bmay\b|\btake\b|\bup to\b|\bwith\b))/i);
      if (r && !/^(?:max|not|do|may|take|up)\b/i.test(r[1])) f.prnReason = r[1].trim();
    }
    if (!f.times.length && f.perDay && !f.weekly && !f.qod) {
      f.times = f.perDay >= 4 ? ["morning", "midday", "evening", "bedtime"] : f.perDay === 3 ? ["morning", "midday", "evening"] : f.perDay === 2 ? ["morning", "evening"] : ["morning"];
      if (f.perDay === 1 && /\bevening\b|\bdinner\b|\bsupper\b/i.test(s)) f.times = ["evening"];
    }
    if (f.weekly || f.qod) f.times = ["morning"];
    if (f.prn) f.times = ["as_needed"];
    return f;
  }

  function parseRoute(s) {
    if (/\b(?:PO|P\.O\.|by mouth|orally|oral)\b/i.test(s)) return "r_oral";
    if (/\b(?:SL|sublingual(?:ly)?|under the tongue)\b/i.test(s)) return "r_sl";
    if (/\b(?:INH|inhale|inhaled|inhalation|nebuli[sz]e|neb|puffs?|HFA|MDI)\b/i.test(s)) return "r_inhaled";
    if (/\b(?:SC|SQ|subcut(?:aneous(?:ly)?)?|sub-?q|under the skin)\b/i.test(s)) return "r_subcut";
    if (/\b(?:IM|intramuscular(?:ly)?)\b/.test(s)) return "r_im";
    if (/\b(?:IV|intravenous(?:ly)?)\b/.test(s)) return "r_iv";
    if (/\bOU\b|both eyes|each eye/i.test(s)) return "r_eye_both";
    if (/\bOD\b.*(?:drop|gtt)|(?:drop|gtt).*\bOD\b|right eye/i.test(s)) return "r_eye_right";
    if (/\bOS\b|left eye/.test(s)) return "r_eye_left";
    if (/\b(?:AU|AD|AS)\b|\bears?\b|\botic\b/.test(s)) return "r_ear";
    if (/\bnasal|nostril|intranasal\b/i.test(s)) return "r_nasal";
    if (/\b(?:PR|rectal(?:ly)?|suppositor)/i.test(s)) return "r_rectal";
    if (/\b(?:TD|transdermal|patch)\b/i.test(s)) return "r_patch";
    if (/\b(?:TOP|topical(?:ly)?|apply|cream|ointment|gel)\b/i.test(s)) return "r_topical";
    return null;
  }

  /** Try to read one medicine from a line. Returns null if the line is not a medicine line. */
  function parseMed(rawLine, section, unknownOk) {
    const line = stripBullet(rawLine).replace(/^(?:rx|med|medication)\s*:\s*/i, "");
    let status = section === "meds_new" ? "new" : section === "meds_changed" ? "changed" : section === "meds_continue" ? "continue" : section === "meds_stop" ? "stop" : null;
    // inline status markers
    let m;
    if ((m = line.match(/^\(?\s*(new|start(?:ed)?|changed?|continue[d]?|stop(?:ped)?|discontinue[d]?|hold)\s*\)?\s*[:\-–]\s*/i))) {
      const w = m[1].toLowerCase();
      status = /^new|^start/.test(w) ? "new" : /^chang/.test(w) ? "changed" : /^cont/.test(w) ? "continue" : "stop";
    }
    if (/\((?:new|started)\)|\bnew medication\b/i.test(line)) status = "new";
    if (/\((?:changed|dose changed|increased|decreased)\)/i.test(line)) status = "changed";
    if (/\((?:stop(?:ped)?|discontinued)\)/i.test(line)) status = "stop";

    KB.DRUG_RE.lastIndex = 0;
    const dm = KB.DRUG_RE.exec(line);
    const sm = line.match(STRENGTH_RE);
    let key = null, name = null, nameIdx = -1;
    if (dm) { key = KB.drugKeyFor(dm[1]); name = dm[1]; nameIdx = dm.index; }
    const hasFreqOrRoute = /\b(?:PO|BID|TID|QID|QHS|QAM|PRN|daily|q\.?\s?\d+\s*h|SL|INH|SC|SQ|IM|IV|by mouth|tab(?:let)?s?|caps?(?:ule)?s?|puffs?|drops?|gtts?|units?|as needed|times a day|every)\b/i.test(line);
    const inMedSection = /^meds/.test(section || "");

    if (key) {
      if (nameIdx > 45 && !inMedSection) return null; // drug merely mentioned deep in a sentence
      // no written strength ("Norco 5-325 1 tab q6h", "Bactrim DS 1 tab BID"): accept when the line
      // starts with the medicine name and has dosing words
      if (!sm && !inMedSection && !status && !/^(?:take|start|continue|resume)\b/i.test(line) && !(nameIdx <= 3 && hasFreqOrRoute)) return null;
      if (sm && sm.index < nameIdx && !inMedSection) return null;
    } else {
      if (!unknownOk || !sm || !hasFreqOrRoute) return null;
      const cand = line.slice(0, sm.index).replace(/^(?:\(?\s*(?:new|changed?|continue|stop)\s*\)?\s*[:\-–]\s*)/i, "").trim().match(/([A-Z][A-Za-z-]{3,}(?:\s+[A-Za-z-]{2,}){0,2})\s*$/);
      if (!cand) return null;
      const first = cand[1].split(/\s+/)[0].toLowerCase();
      if (KB.NOT_DRUGS.has(first)) return null;
      name = cand[1]; nameIdx = line.indexOf(cand[1]);
    }

    const after = line.slice(Math.max(0, nameIdx));
    const freq = parseFrequency(after);
    const route = parseRoute(after);
    const d = key ? KB.DRUGS[key] : null;

    // strength (e.g. "40 mg", "5-325 mg", "160 mg/5 mL", "90 mcg/actuation")
    let strengthText = "", strengthVals = [], strengthUnit = "", perMl = null;
    if (sm) {
      strengthText = sm[0].trim();
      strengthVals = sm[1].split(/\s*[-/]\s*/).map((x) => parseFloat(x.replace(",", ".")));
      strengthUnit = sm[2].toLowerCase().replace(/^u$|^iu$/, "units").replace(/^unit$/, "units").replace("µg", "mcg").replace(/^gm$/, "g");
      if (sm[4] && /ml/i.test(sm[4])) perMl = strengthVals[0] / (parseFloat(sm[3]) || 1);
    }
    // amount per dose
    let amount = null, form = null;
    const am = after.replace(STRENGTH_RE, " ").match(AMOUNT_RE);
    if (am) { amount = num(am[1]); form = FORM_OF(am[2]); }
    if (!form) {
      if (/\btab(?:let)?s?\b|\bER\b|\bXL\b|\bSR\b/i.test(after)) form = "tablet";
      else if (/\bcap(?:sule)?s?\b/i.test(after)) form = "capsule";
      else if (route === "r_inhaled") form = "puff";
      else if (/^r_eye|^r_ear/.test(route || "")) form = "drop";
      else if (strengthUnit === "units") form = "unit";
      else if (route === "r_patch") form = "patch";
      else form = "dose";
    }
    if (amount == null) amount = strengthUnit === "units" ? strengthVals[0] : 1;

    // mg per dose for each ingredient
    const ingredients = d?.ing || (key ? [key] : [name.toLowerCase()]);
    const mgPerDose = {};
    const toMg = (v) => (strengthUnit === "mcg" ? v / 1000 : strengthUnit === "g" ? v * 1000 : strengthUnit === "mg" ? v : null);
    if (strengthVals.length && /mg|mcg|^g$/.test(strengthUnit)) {
      if (perMl != null && form === "mL") mgPerDose[ingredients[0]] = toMg(perMl) * amount;
      else if (strengthVals.length === ingredients.length || strengthVals.length > 1) {
        ingredients.forEach((ing, i) => { if (strengthVals[i] != null) mgPerDose[ing] = toMg(strengthVals[i]) * (form === "dose" ? 1 : amount); });
      } else {
        const per = toMg(strengthVals[0]) * (form === "dose" || form === "unit" ? 1 : amount);
        if (ingredients.length === 1) mgPerDose[ingredients[0]] = per;
        else mgPerDose[ingredients[0]] = per; // a single number on a combo usually refers to the first ingredient
      }
    }
    if (d?.apapPerUnit && mgPerDose.acetaminophen == null) mgPerDose.acetaminophen = d.apapPerUnit * (form === "tablet" || form === "dose" ? amount : 1);

    // duration and stated maximum
    let durationDays = null;
    const dur = after.match(/\b(?:x|for|times)\s*(\d+)\s*(d|days?|wks?|weeks?)\b|\b(\d+)[- ]day course\b/i);
    if (dur) durationDays = dur[3] ? +dur[3] : /^w/i.test(dur[2]) ? +dur[1] * 7 : +dur[1];
    let maxDoses = null, maxMg = null;
    const mx = after.match(/\b(?:max(?:imum)?\.?|no more than|not (?:to )?exceed|do not exceed|up to)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*(mg|g|doses?|tabs?|tablets?|caps?|capsules?|pills?|times|puffs?)?\s*(?:in|per|\/|a|each|every)\s*(?:24\s*h(?:ou)?rs?|day|24h)/i);
    if (mx) {
      if (/mg/i.test(mx[2] || "")) maxMg = +mx[1]; else if (/^g$/i.test(mx[2] || "")) maxMg = +mx[1] * 1000; else maxDoses = +mx[1];
    }
    const withFood = /with (?:food|meals?|a meal)|after meals|\bPC\b/i.test(after) ? "with_food" : /empty stomach|before breakfast|30 min(?:utes)? before|\bAC\b/i.test(after) ? "empty_stomach" : null;

    // max doses per day used for totals
    let dosesPerDay = freq.perDay;
    if (freq.prn && maxDoses) dosesPerDay = maxDoses;
    else if (maxDoses && dosesPerDay) dosesPerDay = Math.min(dosesPerDay, maxDoses);
    const mgPerDay = {};
    Object.entries(mgPerDose).forEach(([ing, mg]) => { if (mg != null && dosesPerDay) mgPerDay[ing] = Math.round(mg * dosesPerDay); });
    if (maxMg && Object.keys(mgPerDay).length === 1) { const ing = Object.keys(mgPerDay)[0]; mgPerDay[ing] = Math.min(mgPerDay[ing], maxMg); }

    // stop sentences: "Stop taking ibuprofen."
    if (/^(?:stop|discontinue|do not take|don't take|quit|hold)\b/i.test(line)) status = "stop";
    if (/^(?:start|begin)\b/i.test(line) && !status) status = "new";

    // other instructions on the line (after the sig)
    const notes = [];
    const tail = after.split(/(?<=[.;])\s+/).slice(1).map((x) => x.trim()).filter(Boolean);
    tail.forEach((x) => notes.push(plainify(x)));
    const complex = /\bthen\b|\btaper\b|\bsliding scale\b|\bper (?:protocol|scale)\b|\bas directed\b|\bexcept\b|\balternat/i.test(after);

    const classes = d ? d.c.slice() : [];
    if (key === "aspirin" && (mgPerDose.aspirin || 0) > (d.nsaidIfAbove || 325)) classes.push("nsaid");
    return {
      key, name: cap(name), recognized: !!key, display: displayName(key, name),
      matched: name, strengthText, strengthVals, strengthUnit, amount, form, route,
      freqKey: freq.key, freqVars: freq.vars, perDay: freq.perDay, times: freq.times, intervalH: freq.intervalH,
      prn: freq.prn, prnReason: freq.prnReason ? plainify(freq.prnReason).replace(/^./, (c) => c.toLowerCase()) : "", weekly: freq.weekly, qod: freq.qod,
      durationDays, maxDoses, maxMg, withFood, ingredients, mgPerDose, mgPerDay, classes,
      status: status || null, notes, complex,
      source_quote: rawLine.trim(),
    };
  }

  function displayName(key, matched) {
    if (!key) return cap(matched);
    const generic = cap(key.replace(/\//g, " + ").replace(/_/g, " "));
    const m = String(matched || "").trim();
    if (!m || m.toLowerCase() === key.toLowerCase()) return generic;
    if (m.toLowerCase().startsWith(key.split("/")[0].toLowerCase())) return cap(m.replace(/\s*[-/]\s*/g, " + "));
    return `${m} (${generic.toLowerCase()})`;
  }

  // "Stop taking aspirin." sentences outside medicine sections
  function parseStopSentence(s) {
    const m = s.match(/^(?:please\s+)?(stop|discontinue|do not (?:take|restart|resume)|don't (?:take|restart)|hold|no longer take)\s+(?:taking\s+|your\s+|the\s+)*(.+)$/i);
    if (!m) return null;
    KB.DRUG_RE.lastIndex = 0;
    const dm = KB.DRUG_RE.exec(m[2]);
    if (!dm || dm.index > 20) return null;
    const key = KB.drugKeyFor(dm[1]);
    if (!key) return null;
    return { key, name: cap(dm[1]), display: displayName(key, dm[1]), matched: dm[1], recognized: true, status: /hold/i.test(m[1]) ? "hold" : "stop", classes: KB.DRUGS[key].c.slice(), ingredients: KB.DRUGS[key].ing || [key], mgPerDay: {}, mgPerDose: {}, times: [], notes: [plainify(s)], source_quote: s, strengthText: "", amount: null, form: null, route: null, freqKey: null, perDay: null };
  }

  // ================================================================== labs
  function parseLab(s) {
    const line = stripBullet(s);
    const m = line.match(/^([A-Za-z][A-Za-z0-9 ,\-/().']*?)[:\s]\s*([<>]?\d+(?:\.\d+)?)\s*([A-Za-z%/µ\d.^*]*(?:\/[A-Za-z\d.^]+)*)\s*(?:\(?\s*(?:ref(?:erence)?(?: range)?[: ]*|normal[: ]*)?([<>]?\s*\d+(?:\.\d+)?\s*(?:-|–|to)?\s*\d*(?:\.\d+)?)\s*\)?)?\s*\[?\s*(H{1,2}|L{1,2}|HIGH|LOW|A|CRIT(?:ICAL)?|\*+)?\s*\]?\s*$/i);
    if (!m) return null;
    const [, testRaw, value, unit, range, flag] = m;
    const test = testRaw.replace(/[:\s]+$/, "").trim();
    if (!range && !flag) return null; // need a range or a flag to be sure it's a lab row
    if (/^(?:take|dose|weight|follow|call|age|room|bed|page|phone|fax|mrn|dob)\b/i.test(test)) return null;
    const lab = KB.LABS.find(([re]) => re.test(test));
    const v = parseFloat(value.replace(/[<>]/g, ""));
    let status = "normal";
    const rr = (range || "").replace(/\s/g, "");
    if (flag && /^h/i.test(flag)) status = "high";
    else if (flag && /^l/i.test(flag)) status = "low";
    else if (/^(\d+(?:\.\d+)?)(?:-|–|to)(\d+(?:\.\d+)?)$/.test(rr)) { const [, lo, hi] = rr.match(/^(\d+(?:\.\d+)?)(?:-|–|to)(\d+(?:\.\d+)?)$/); status = v < +lo ? "low" : v > +hi ? "high" : "normal"; }
    else if (/^<(\d+(?:\.\d+)?)$/.test(rr)) status = v >= +rr.slice(1) ? "high" : "normal";
    else if (/^>(\d+(?:\.\d+)?)$/.test(rr)) status = v <= +rr.slice(1) ? "low" : "normal";
    else if (!range) status = flag ? "unknown" : "unknown";
    let critical = false;
    if (lab && lab[5]) { const [clo, chi] = lab[5]; if ((clo != null && v < clo) || (chi != null && v > chi)) critical = true; }
    if (flag && /crit|hh|ll|\*\*/i.test(flag)) critical = true;
    const meaning = status === "normal" ? "This result is in the normal range." : lab ? (status === "high" ? lab[3] : status === "low" ? lab[4] : "Ask your doctor what this result means.") : status === "unknown" ? "Ask your doctor what this result means." : `This result is ${status === "high" ? "higher" : "lower"} than the normal range. Ask your doctor what it means for you.`;
    return { test: lab ? lab[1] : test, rawTest: test, loinc: lab ? lab[2] : null, value: `${value} ${unit || ""}`.trim(), normal_range: (range || "").trim(), status, critical, meaning, source_quote: s.trim() };
  }

  // ================================================================== warnings, appointments, allergies, pending
  const EMERG_RE = /\b(?:call 911|dial 911|911\b|go to (?:the )?(?:nearest )?(?:emergency|er\b|ed\b)|return to (?:the )?(?:ed|er|emergency)|seek (?:immediate|emergency|urgent) (?:medical )?(?:care|attention|help)|seek (?:medical )?(?:care|attention|help) (?:right away|immediately|now)|emergency (?:room|department)|immediately seek|get emergency help)/i;
  const CALL_RE = /\b(?:call|contact|notify|tell|phone)\s+(?:your|the|us|our)\s*(?:doctor|physician|provider|surgeon|clinic|office|nurse|care team|pcp|cardiologist|team|primary care)?|\bcall us\b|\bcall the (?:clinic|office)\b/i;
  function splitSigns(clause) {
    return clause.replace(/[.:]+$/, "")
      .split(/\s*[,;]\s*|\s+or\s+(?=(?:if\s+)?(?:you|a|an|any|new|severe|worsening|signs|fever|chest|shortness|bleeding|trouble)\b)/i)
      .map((x) => x.replace(/^(?:or|and)\s+/i, "").replace(/^(?:if you (?:have|develop|notice|feel|get)|if you|if|for|you have|any of the following|the following|signs of|symptoms of)\s+/i, "").trim())
      .filter((x) => x.length > 2 && !/^(?:the following|any of these|these symptoms)$/i.test(x))
      // "swelling or redness" -> two signs; but keep "2 lb in a day or 5 lb in a week" together
      .flatMap((x) => { const o = x.match(/^([a-z][a-z ]{1,24}?) or ([a-z][a-z ]{1,24})$/i); return o && !/\d/.test(x) && o[1].split(" ").length <= 3 && o[2].split(" ").length <= 3 ? [o[1], o[2]] : [x]; });
  }
  function warningLead(s) {
    const emergency = EMERG_RE.test(s);
    const call = CALL_RE.test(s);
    if (!emergency && !call) return null;
    return emergency ? "emergency" : "call_doctor";
  }

  const pad = (n) => String(n).padStart(2, "0");
  const localISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  function parseDate(s) {
    let m = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
    if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return new Date(y, +m[1] - 1, +m[2]); }
    m = s.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?/i);
    if (m) return new Date(m[3] ? +m[3] : new Date().getFullYear(), MONTHS[m[1].toLowerCase()], +m[2]);
    return null;
  }
  function parseAppointment(s, refDate, force) {
    if (!force && !/follow[ -]?up|\bf\/u\b|recheck|re-check|appointment|\bappt\b|see (?:dr|your|the)\b|return to (?:clinic|office)|repeat\b|\b(?:bmp|cbc|cmp|labs?|blood (?:work|test)|inr|a1c|x-?ray|ultrasound|echo)\b.{0,30}\bin \d|\bvisit with\b|\bscheduled\b|\bwound check\b|\bsuture removal\b/i.test(s)) return null;
    if (EMERG_RE.test(s) && !/follow/i.test(s)) return null;
    const abs = parseDate(s);
    const time = s.match(/\b(\d{1,2}):(\d{2})\s*([AaPp]\.?[Mm]\.?)?/);
    const rel = s.match(/\b(?:in|within|after)\s+(\d+)(?:\s*(?:-|–|to)\s*(\d+))?\s*(days?|weeks?|wks?|months?)\b|\b(tomorrow|next week)\b/i);
    let date = null, approx = false, whenText = "";
    if (abs) { date = abs; whenText = abs.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
    else if (rel) {
      const ref = refDate || new Date();
      let days = 0;
      if (rel[4]) days = /tomorrow/i.test(rel[4]) ? 1 : 7;
      else { const n = +(rel[2] || rel[1]); days = /^w/i.test(rel[3]) ? n * 7 : /^m/i.test(rel[3]) ? n * 30 : n; }
      date = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + days); approx = true;
      whenText = rel[0].replace(/^in /i, "In ").replace(/^within /i, "Within ");
    } else if (/at (?:your )?follow-up visit|next visit/i.test(s)) whenText = "At your next visit";
    if (time && date) {
      let h = +time[1]; const ap = (time[3] || "").toLowerCase();
      if (ap.startsWith("p") && h < 12) h += 12; if (ap.startsWith("a") && h === 12) h = 0;
      date.setHours(h, +time[2]);
    }
    let what = plainify(s.replace(rel ? rel[0] : "", "").replace(/\s+\./g, ".").replace(/^(?:follow[- ]?up|appointments?)\s*:\s*/i, "")).replace(/[,.\s]+$/, "");
    what = what.replace(/^Follow[ -]?up (?:with|w\/)/i, "See").replace(/^Recheck/i, "Come back for a check-up").replace(/^Return to clinic/i, "Come back to the clinic");
    return { what, when: whenText || "Ask when", date: date ? localISO(date) : null, hasTime: !!(time && date), approx, source_quote: s };
  }
  function parseAllergies(content) {
    if (/\b(?:NKDA|NKA|no known (?:drug )?allergies|none known|no allergies)\b/i.test(content)) return [{ name: "No known allergies", none: true, classes: [] }];
    return content.split(/\s*[,;]\s*(?![^()]*\))/).map((x) => x.trim()).filter(Boolean).map((x) => {
      const r = x.match(/^(.*?)\s*\(([^)]*)\)\s*$/) || x.match(/^(.*?)\s*[-–:]\s*(.+)$/);
      const name = (r ? r[1] : x).trim();
      const reaction = r ? r[2].trim() : "";
      const map = KB.ALLERGY_MAP.find(([re]) => re.test(name));
      KB.DRUG_RE.lastIndex = 0;
      const dm = KB.DRUG_RE.exec(name);
      const dkey = dm ? KB.drugKeyFor(dm[1]) : null;
      return { name, reaction, classes: map ? map[1] : dkey ? KB.DRUGS[dkey].c : [], group: map ? map[2] : null, drugKey: dkey };
    });
  }

  // ================================================================== categories, glossary, decoder, ISMP
  function categorize(s) {
    if (/\b(?:wound|incision|dressing|stitch|suture|staple|drain|bandage|steri-?strip|scab)/i.test(s)) return "cat_wound";
    if (/\b(?:weigh|weight|blood pressure|blood sugar|glucose|temperature|check your|record|log|monitor|pulse|oxygen|peak flow)\b/i.test(s)) return "cat_monitor";
    if (/\b(?:diet|salt|sodium|fluids?|drink|eat|food|meals?|alcohol|caffeine|sugar|carb|grapefruit|water|liters?)\b/i.test(s)) return "cat_diet";
    if (/\b(?:activity|activities|lift|lifting|exercise|walk|walking|drive|driving|bath|shower|swim|work|sex|stairs|rest|sleep|bed|weight-bearing|crutches|sling)\b/i.test(s)) return "cat_activity";
    return "cat_other";
  }

  function glossaryHits(text) {
    const out = [];
    KB.GLOSSARY.forEach(([src, term, plain]) => {
      if (new RegExp(src, src.includes("[A-Z]") ? "" : "i").test(text) && !out.some((g) => g.term === term)) out.push({ term, plain });
    });
    return out;
  }

  const COMMON_WORDS = new Set("attention intention extension pension mention question position condition information medication medications instructions discharge prescription diagnosis appointment emergency temperature pressure procedure recommendation situation solution education evaluation operation infection prevention protection collection direction description application examination station section action nation function caution addition admission allergies everything something anything".split(" "));
  function decodeWord(word) {
    const w = word.toLowerCase();
    if (w.length < 7 || COMMON_WORDS.has(w)) return null;
    const suf = KB.SUFFIXES.slice().sort((a, b) => b[0].length - a[0].length).find(([s]) => w.endsWith(s) && w.length > s.length + 2);
    if (!suf) return null;
    let rem = w.slice(0, -suf[0].length).replace(/[oi]$/, "");
    let pre = null;
    for (const [p, meaning] of KB.PREFIXES.slice().sort((a, b) => b[0].length - a[0].length)) {
      if (rem.startsWith(p) && rem.length - p.length >= 0) { pre = [p, meaning]; break; }
    }
    const restAfterPre = pre ? rem.slice(pre[0].length) : rem;
    const root = KB.ROOTS.slice().sort((a, b) => b[0].length - a[0].length).find(([r]) => restAfterPre.startsWith(r) || rem.startsWith(r));
    if (!root && !pre) return null;
    const short = { hyper: "high", hypo: "low", brady: "slow", tachy: "fast", dys: "difficult or abnormal", poly: "a lot of", olig: "too little", an: "no", a: "no" };
    let guess = suf[1];
    const usePre = pre && (!root || !rem.startsWith(root[0]));
    guess = guess.replace("{p}", usePre ? (short[pre[0]] || pre[1]) + (root ? " " + root[1].replace(/^the /, "") : "") : root ? root[1].replace(/^the /, "") : "")
      .replace("{r}", root ? root[1] : "the body part");
    if (usePre && !/\{p\}/.test(suf[1])) guess = (short[pre[0]] || pre[1]) + " " + guess;
    guess = guess.replace(/\s+/g, " ").trim();
    const parts = [usePre ? pre[0] + "- (" + pre[1] + ")" : null, root ? root[0] + " (" + root[1] + ")" : null, "-" + suf[0]].filter(Boolean);
    return { word, parts: parts.join(" + "), guess: cap(guess) };
  }
  function decodeUnknown(text, glossary) {
    const known = new Set(glossary.map((g) => g.term.toLowerCase()));
    const seen = new Set();
    const out = [];
    (String(text).match(/\b[A-Za-z]{7,}\b/g) || []).forEach((w) => {
      const lw = w.toLowerCase();
      if (seen.has(lw) || known.has(lw)) return;
      seen.add(lw);
      if (KB.GLOSSARY.some(([src]) => new RegExp("^(?:" + src + ")$", "i").test(w))) return;
      KB.DRUG_RE.lastIndex = 0;
      if (KB.DRUG_RE.test(w)) return;
      const d = decodeWord(w);
      if (d) out.push(d);
    });
    return out.slice(0, 10);
  }

  function scanISMP(units) {
    const out = [];
    units.forEach((u) => {
      if (/^[^a-z]{4,}$/.test(u) && !/\d/.test(u)) return; // ALL-CAPS heading
      KB.ISMP.forEach((it) => {
        it.re.lastIndex = 0;
        const m = u.match(it.re);
        if (!m) return;
        if (/AD \/ AS \/ AU/.test(it.abbr) && !/drop|gtt|ear|otic/i.test(u)) return;
        if (/OD \/ OS \/ OU/.test(it.abbr) && !/drop|gtt|eye|ophth|gtts/i.test(u)) return;
        if (it.abbr === "HS" && !/\b(?:mg|tab|take|po|dose|units?)\b/i.test(u)) return;
        const found = m[0].trim();
        const nd = it.abbr === "x3d" ? (found.match(/\d+/) || ["3"])[0] : null;
        const dyn = (s) => (nd ? s.replace(/3/g, nd) : s);
        out.push({ abbr: it.abbr, found, means: dyn(it.means), risk: dyn(it.risk), use: dyn(it.use), source_quote: u });
      });
    });
    return out;
  }

  // ================================================================== readability
  function syllables(word) {
    let w = word.toLowerCase().replace(/[^a-z]/g, "");
    if (!w) return 0; if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
    const m = w.match(/[aeiouy]{1,2}/g);
    return Math.max(1, m ? m.length : 1);
  }
  function fkGrade(text) {
    const t = String(text || "").trim();
    const words = t.match(/[A-Za-z][A-Za-z'-]*/g) || [];
    if (words.length < 8) return null;
    const sentences = Math.max(1, (t.match(/[.!?]+(\s|$)/g) || []).length);
    const syl = words.reduce((a, w) => a + syllables(w), 0);
    return Math.max(1, Math.round((0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59) * 10) / 10);
  }
  const proseOf = (text) => splitUnits(text).filter((u) => !isMetaUnit(u) && u.split(/\s+/).length >= 6 && !/\(\s*[<>]?\d/.test(u)).join(" ");

  // ================================================================== verification and coverage
  function isMetaUnit(u) {
    if (/^(?:patient|name|dob|date of birth|mrn|acct|account|admit(?:ted)? date|admission date|discharge date|date of (?:visit|service)|visit date|collected|received|reported|attending|ordering provider|provider|phone|fax|address|insurance|room|bed|encounter|csn|pcp:)\b/i.test(stripBullet(u))) return true;
    if (/^[A-Z][A-Z ]{5,}(\s+-\s+|$)/.test(u)) return true;
    if (/^[A-Z0-9 ,&\-/()]+:?$/.test(u) && u.length < 60 && !/\d\s*\S*\s+\(/.test(u)) return true;
    if (/:$/.test(u) && u.length < 60) return true;
    return false;
  }
  function verifyQuote(quote, original) {
    const q = norm(quote);
    if (!q) return "unverified";
    if (norm(original).includes(q)) return "verified";
    const qt = tokens(quote); if (!qt.length) return "unverified";
    const ot = new Set(tokens(original));
    return qt.filter((t) => ot.has(t)).length / qt.length >= 0.85 ? "close" : "unverified";
  }
  function quoteMatchesUnit(quote, unit) {
    const q = norm(quote), u = norm(unit);
    if (!q || !u) return false;
    return u.includes(q) || q.includes(u) || jaccard(unit, quote) >= 0.6;
  }
  function coverage(original, quotes) {
    const units = splitUnits(original).filter((u) => !isMetaUnit(u) && tokens(u).length >= 2);
    const qs = quotes.filter(Boolean);
    const uncovered = units.filter((u) => !qs.some((q) => quoteMatchesUnit(q, u)));
    return { total: units.length, covered: units.length - uncovered.length, uncovered };
  }

  // ================================================================== privacy
  function redact(text) {
    let count = 0;
    const rep = (re, fn) => { text = text.replace(re, (...m) => { count++; return fn(...m); }); };
    rep(/\b(Patient|Patient name|Name)\s*:\s*[A-Z][a-z'.-]+(?:,? [A-Z][a-z'.-]*){0,3}/g, (m, k) => `${k}: [NAME]`);
    rep(/\b(DOB|Date of birth)\s*:\s*[0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4}/gi, (m, k) => `${k}: [DATE OF BIRTH]`);
    rep(/\b(MRN|Medical record (?:number|no\.?)|Acct|Account|CSN|Encounter)\s*[:#]?\s*[A-Z0-9-]{4,}/gi, (m, k) => `${k}: [ID]`);
    rep(/\b\d{3}-\d{2}-\d{4}\b/g, () => "[SSN]");
    rep(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, () => "[EMAIL]");
    rep(/\b(Address)\s*:\s*[^\n]+/gi, (m, k) => `${k}: [ADDRESS]`);
    return { text, count };
  }

  // ================================================================== main analysis
  function analyze(text) {
    const lines = splitLines(text);
    const R = {
      document_type: "other", discharge_date: null, diagnosis: [], allergies: [], medications: [], results: [], warning_signs: [], appointments: [],
      pending: [], instructions: [], glossary: [], decoded: [], ismp: [], questions: [], unclear: [], consumed: [],
    };
    const dd = String(text).match(/\b(?:discharge date|date of discharge|visit date|date of (?:visit|service)|collected|date)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    const refDate = dd ? parseDate(dd[1]) : null;
    R.discharge_date = refDate ? localISO(refDate) : null;

    let section = null;
    let warnLead = null; // urgency for a bulleted list that follows "Call 911 if you have:"
    const consume = (q) => R.consumed.push(q);

    lines.forEach((L) => {
      const hdr = headerOf(L);
      if (L.blankBefore && !L.bullet && !hdr) warnLead = null;
      if (hdr) {
        section = hdr.type;
        warnLead = section === "warnings" ? (warningLead(L.line) || "call_doctor") : null;
        const lead = warningLead(L.line);
        if (lead) warnLead = lead;
        if (!hdr.rest) { consume(L.line); return; }
        // inline header "Allergies: penicillin (rash)"
        if (section === "allergies") { R.allergies.push(...parseAllergies(hdr.rest).map((a) => ({ ...a, source_quote: L.line }))); consume(L.line); return; }
        if (section === "procedure") { R.diagnosis.push({ ...mkDiagnosis(hdr.rest, L.line), procedure: true }); consume(L.line); section = null; return; }
        if (section === "diagnosis") {
          hdr.rest.split(/(?<=[.;])\s+/).forEach((d) => { if (d.trim()) R.diagnosis.push(mkDiagnosis(d.trim(), L.line)); });
          consume(L.line); section = null; return;
        }
        if (section === "pending") { R.pending.push({ text: plainify(hdr.rest), source_quote: L.line }); consume(L.line); return; }
        if (section === "warnings" && hdr.rest) {
          splitSigns(hdr.rest).forEach((sign) => R.warning_signs.push({ sign: plainify(sign), urgency: warnLead || "call_doctor", source_quote: L.line }));
          consume(L.line); return;
        }
      }

      // medicine lines. A line can hold several medicines ("Drug A 10 mg daily. Drug B 5 mg BID."):
      // each sentence that names a medicine with a dose starts a new segment; other sentences
      // ("Take with food.") stay attached to the medicine before them.
      let partsToRead = L.parts;
      if (!/^(?:diagnosis|procedure|course|pending)$/.test(section || "")) {
        const SIG_HINT = /\b(?:PO|BID|TID|QID|QHS|QD|PRN|daily|q\.?\s?\d+\s*h|SL|INH|SC|SQ|IM|IV|by mouth|tabs?|tablets?|caps?|puffs?|drops?|gtts?|units?|\d+\s?U)\b/i;
        const startsMed = (p) => { KB.DRUG_RE.lastIndex = 0; const d = KB.DRUG_RE.exec(p); return !!d && d.index < 30 && (STRENGTH_RE.test(p) || SIG_HINT.test(p)); };
        const firstMed = L.parts.findIndex(startsMed);
        const medParts = L.parts.filter(startsMed).length;
        if (medParts >= 2 || (medParts === 1 && firstMed > 0)) {
          const segs = [];
          L.parts.slice(firstMed).forEach((p) => { if (startsMed(p) || !segs.length) segs.push(p); else segs[segs.length - 1] += " " + p; });
          const meds = segs.map((sg) => parseMed(sg, section, true));
          if (meds.every(Boolean)) {
            meds.forEach((m) => R.medications.push(m)); consume(L.line);
            partsToRead = L.parts.slice(0, firstMed); // plain sentences before the first medicine ("D/C home.")
          }
        } else {
          const med = parseMed(L.line, section, true);
          if (med) { R.medications.push(med); consume(L.line); return; }
        }
      }

      const inWarnList = warnLead && (L.bullet || section === "warnings") && !warningLead(L.line);
      partsToRead.forEach((p) => {
        if (isMetaUnit(p)) return;
        const lab = parseLab(p);
        if (lab) { R.results.push(lab); consume(p); return; }
        if (section === "allergies") { R.allergies.push(...parseAllergies(stripBullet(p)).map((a) => ({ ...a, source_quote: p }))); consume(p); return; }
        if (section === "diagnosis") { R.diagnosis.push(mkDiagnosis(stripBullet(p), p)); consume(p); return; }
        if (section === "pending" || /\b(?:pending|not (?:yet )?(?:back|available|resulted|final)|still (?:waiting|pending)|awaiting|will (?:call|contact) you with)\b/i.test(p)) {
          R.pending.push({ text: plainify(p), source_quote: p }); consume(p); return;
        }
        if (inWarnList) {
          // one bullet = one warning sign ("Redness, warmth or pus at the incision" stays together)
          const one = stripBullet(p).replace(/^(?:if you (?:have|develop|notice|feel|get)|if you|if|you have)\s+/i, "").replace(/[.;]+$/, "");
          (L.bullet ? [one] : splitSigns(stripBullet(p))).forEach((sign) => R.warning_signs.push({ sign: plainify(sign), urgency: warnLead, source_quote: p }));
          consume(p); return;
        }
        const stop = parseStopSentence(stripBullet(p));
        if (stop) { R.medications.push(stop); consume(p); return; }
        const lead = warningLead(p);
        if (lead) {
          const m = p.match(/\b((?:for|if)\s+.+)$/i);
          const tail = m ? m[1] : "";
          if (!tail || /(?:following|these|the below|any of)\s*(?:symptoms|signs)?\s*:?\s*$/i.test(p) || /:\s*$/.test(p)) { warnLead = lead; consume(p); return; }
          splitSigns(tail).forEach((sign) => R.warning_signs.push({ sign: plainify(sign), urgency: lead, source_quote: p }));
          consume(p); return;
        }
        const appt = parseAppointment(stripBullet(p), refDate, section === "followup" && (/\d/.test(p) || /\b(?:see|visit|appointment|clinic|dr\.?)\b/i.test(p)) && !/^call\b/i.test(stripBullet(p)));
        if (appt) { R.appointments.push(appt); consume(p); return; }
        if (section === "course" || /^(?:hospital course|history)\b/i.test(p)) {
          R.instructions.push({ text: plainify(p), category: "course", source_quote: p }); consume(p); return;
        }
        R.instructions.push({ text: plainify(p), category: section === "diet" ? "cat_diet" : section === "activity" ? "cat_activity" : section === "wound" ? "cat_wound" : categorize(p), source_quote: p });
        consume(p);
      });
    });

    // merge "stop" sentences with listed meds of the same drug (keep both entries for the conflict check)
    // document type
    const meds = R.medications;
    if (/discharge|admission|hospital course|admitted/i.test(text)) R.document_type = "discharge";
    else if (R.results.length >= 3) R.document_type = "lab_results";
    else if (/after visit|visit summary|clinic visit|urgent care/i.test(text)) R.document_type = "visit_summary";
    else if (meds.length) R.document_type = "prescription";

    // diagnosis also from instruction lines like "You were treated for pneumonia"
    if (!R.diagnosis.length) {
      const m = String(text).match(/(?:treated for|diagnosed with|admitted (?:for|with))\s+([^.\n]+)/i);
      if (m) R.diagnosis.push(mkDiagnosis(m[1].trim(), m[0]));
    }

    R.glossary = glossaryHits(text);
    R.decoded = decodeUnknown(text, R.glossary);
    R.ismp = scanISMP(splitUnits(text));

    // unclear items
    meds.forEach((m) => {
      if (m.status === "stop" || m.status === "hold") return;
      if (!m.perDay && !m.prn && !m.complex) m.unclearFreq = true;
      if (m.complex) R.unclear.push({ key: "complex", text: `${m.display}: the dose changes over time or follows a special plan. Ask for a written day-by-day schedule.`, source_quote: m.source_quote });
    });

    // questions for the care team
    const q = [];
    if (meds.some((m) => m.status === "new")) q.push("What is each new medicine for, and how will I know it is working?");
    meds.filter((m) => m.status !== "stop").slice(0, 2).forEach((m) => q.push(`What should I do if I miss a dose of ${m.display}?`));
    if (meds.some((m) => m.status === "stop")) q.push("What should I do with the medicines I was told to stop?");
    R.results.filter((r) => r.status === "high" || r.status === "low").slice(0, 2).forEach((r) => q.push(`What does my ${r.test} result mean for me, and do I need treatment?`));
    if (R.pending.length) q.push("Who will tell me the results that are still pending, and when?");
    if (R.warning_signs.length) q.push("Which warning signs mean I should go to the emergency room, and which mean I should call you?");
    if (R.appointments.some((a) => a.approx)) q.push("Will you book my follow-up appointments and tests, or do I need to call?");
    q.push("Who can I call with questions after hours, and what is the number?");
    R.questions = q.slice(0, 7);
    return R;
  }

  function mkDiagnosis(text, quote) {
    const c = KB.CONDITIONS.find(([re]) => re.test(text));
    return { text, plain: plainify(text), icd: c ? c[1] : null, condition: c ? c[2] : null, source_quote: quote };
  }

  window.PlainlyEngine = {
    analyze, parseMed, parseLab, parseFrequency, parseAppointment, parseAllergies, plainify, splitLines, splitUnits, isMetaUnit,
    verifyQuote, quoteMatchesUnit, coverage, fkGrade, proseOf, redact, decodeWord, glossaryHits, scanISMP, norm, tokens, stripBullet,
  };
})();
