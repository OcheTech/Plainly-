/* Plainly: optional lookups to free, public U.S. National Library of Medicine services.
 *  - RxNorm / RxNav: confirm and normalize medicine names, fix misspellings, find brand names and ingredients
 *  - RxClass (ATC): drug family of medicines that are not in Plainly's built-in list, so safety checks still work
 *  - MedlinePlus Connect: patient-friendly pages for medicines (RxCUI), lab tests (LOINC) and conditions (ICD-10)
 * Only medicine names and standard codes are sent. The document itself never leaves the device.
 * All calls are free, need no key, and fail quietly when offline.
 */
(function () {
  "use strict";
  const RX = "https://rxnav.nlm.nih.gov/REST";
  const MP = "https://connect.medlineplus.gov/service";
  const CACHE_KEY = "plainly-nlm-v1";
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}"); } catch { cache = {}; }
  const save = () => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {} };

  async function getJSON(url, ms = 7000) {
    if (cache[url] !== undefined) return cache[url];
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      cache[url] = j; save();
      return j;
    } finally { clearTimeout(timer); }
  }

  // ATC code prefix -> Plainly class
  const ATC = [
    ["N02BE01", "apap"], ["M01A", "nsaid"], ["B01AA", "anticoagulant"], ["B01AB", "anticoagulant"], ["B01AE", "anticoagulant"], ["B01AF", "anticoagulant"],
    ["B01AC", "antiplatelet"], ["N02A", "opioid"], ["N05BA", "benzodiazepine"], ["N05CD", "benzodiazepine"], ["N05CF", "benzodiazepine"],
    ["C09DX04", "arni"], ["C09A", "ace_inhibitor"], ["C09B", "ace_inhibitor"], ["C09C", "arb"], ["C09D", "arb"], ["C03C", "loop_diuretic"], ["C03A", "thiazide"],
    ["C03BA", "thiazide"], ["C03D", "mra"], ["C07", "beta_blocker"], ["C08", "ccb"], ["C10AA", "statin"], ["J01C", "penicillin"], ["J01D", "cephalosporin"],
    ["J01E", "sulfonamide"], ["J01F", "macrolide"], ["J01M", "fluoroquinolone"], ["J01A", "tetracycline"], ["A10A", "insulin"], ["A10BB", "sulfonylurea"],
    ["A10BA", "biguanide"], ["A10BK", "sglt2"], ["A10BH", "dpp4"], ["A10BJ", "glp1"], ["N06AB", "ssri"], ["N06AX16", "snri"], ["N06AX21", "snri"],
    ["N03AX12", "gabapentinoid"], ["N03AX16", "gabapentinoid"], ["N03A", "anticonvulsant"], ["A12BA", "potassium"], ["A02BC", "ppi"], ["A02BA", "h2"],
    ["H02AB", "corticosteroid"], ["R03AC", "bronchodilator"], ["R03BA", "inhaled_steroid"], ["R03AK", "inhaled_steroid"], ["R06A", "antihistamine"],
    ["H03AA", "thyroid"], ["N05A", "antipsychotic"], ["M03B", "muscle_relaxant"], ["C01DA", "nitrate"], ["C01BD", "antiarrhythmic"], ["C01AA", "heart_rate"],
    ["A06A", "laxative"], ["A04AA", "antiemetic"], ["J05A", "antiviral"], ["L04AX03", "immunosuppressant"], ["L01BA01", "immunosuppressant"],
  ];

  const similar = (a, b) => {
    a = a.toLowerCase(); b = b.toLowerCase();
    if (a === b || b.includes(a) || a.includes(b)) return true;
    // Levenshtein distance <= 2 for misspellings
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length] <= 2;
  };

  /** Resolve a medicine name to RxNorm: {rxcui, name, ingredients[], brands[], classes[]} or null. */
  async function resolveDrug(name) {
    const clean = String(name).replace(/\b(?:tab(?:let)?s?|caps?(?:ule)?s?|ER|XL|SR|DR|HFA|oral|solution)\b/gi, "").trim();
    let rxcui = null;
    const ex = await getJSON(`${RX}/rxcui.json?name=${encodeURIComponent(clean)}&search=2`);
    rxcui = ex?.idGroup?.rxnormId?.[0] || null;
    let corrected = null;
    if (!rxcui) {
      const sp = await getJSON(`${RX}/spellingsuggestions.json?name=${encodeURIComponent(clean)}`);
      const sug = sp?.suggestionGroup?.suggestionList?.suggestion?.[0];
      if (sug && similar(clean.split(/\s+/)[0], sug.split(/\s+/)[0])) {
        corrected = sug;
        const ex2 = await getJSON(`${RX}/rxcui.json?name=${encodeURIComponent(sug)}&search=2`);
        rxcui = ex2?.idGroup?.rxnormId?.[0] || null;
      }
    }
    if (!rxcui) return null;
    const rel = await getJSON(`${RX}/rxcui/${rxcui}/related.json?tty=IN+MIN+BN+PIN`);
    const groups = rel?.relatedGroup?.conceptGroup || [];
    const pick = (tty) => (groups.find((g) => g.tty === tty)?.conceptProperties || []).map((c) => ({ rxcui: c.rxcui, name: c.name }));
    let ingredients = pick("IN");
    if (!ingredients.length) ingredients = [{ rxcui, name: corrected || clean }];
    const brands = pick("BN").map((b) => b.name).slice(0, 4);
    const classes = new Set();
    for (const ing of ingredients.slice(0, 3)) {
      try {
        const cl = await getJSON(`${RX}/rxclass/class/byRxcui.json?rxcui=${ing.rxcui}&relaSource=ATC`);
        (cl?.rxclassDrugInfoList?.rxclassDrugInfo || []).forEach((i) => {
          const id = i.rxclassMinConceptItem.classId;
          const hit = ATC.find(([p]) => id.startsWith(p));
          if (hit) classes.add(hit[1]);
        });
      } catch {}
    }
    return { rxcui, corrected, ingredients: ingredients.map((i) => i.name.toLowerCase()), ingredientIds: ingredients.map((i) => i.rxcui), brands, classes: [...classes] };
  }

  /** MedlinePlus Connect: patient-friendly page. kind: drug (RxCUI) | lab (LOINC) | condition (ICD-10). */
  async function medlineplus(kind, code, lang) {
    const cs = { drug: "2.16.840.1.113883.6.88", lab: "2.16.840.1.113883.6.1", condition: "2.16.840.1.113883.6.90" }[kind];
    const url = `${MP}?mainSearchCriteria.v.cs=${cs}&mainSearchCriteria.v.c=${encodeURIComponent(code)}&knowledgeResponseType=application/json&informationRecipient.languageCode.c=${lang === "es" ? "es" : "en"}`;
    const j = await getJSON(url);
    const entries = j?.feed?.entry || [];
    if (!entries.length) return null;
    // prefer the most specific entry (title containing the code's own name comes last in lab lists)
    const e = kind === "lab" && entries.length > 1 ? entries[entries.length - 1] : entries[0];
    return { title: e.title?._value || "", url: (e.link?.[0]?.href || "").replace(/\?utm_[^#]*/, "") };
  }

  /** Enrich an analysis in place: confirm names, add classes for unknown medicines and MedlinePlus links. */
  async function enrich(R, lang, onUpdate) {
    if (!navigator.onLine) return false;
    const KB = window.PlainlyKB;
    const tasks = R.medications.map(async (m) => {
      try {
        const info = await resolveDrug(m.matched || m.name);
        if (!info) return;
        m.nlm = info;
        if (!m.recognized) {
          m.classes = [...new Set([...(m.classes || []), ...info.classes])];
          m.ingredients = info.ingredients.length ? info.ingredients : m.ingredients;
          if (info.corrected) m.correctedName = info.corrected;
          const first = info.classes[0];
          if (first && KB.CLASSES[first]) { m.purpose = KB.CLASSES[first].purpose; m.caution = KB.CLASSES[first].caution; }
        }
        const page = await medlineplus("drug", info.rxcui, lang);
        if (page) m.info = page;
      } catch {}
    });
    const labTasks = (R.results || []).filter((r) => r.loinc).map(async (r) => { try { r.info = await medlineplus("lab", r.loinc, lang); } catch {} });
    const dxTasks = (R.diagnosis || []).filter((d) => d.icd).map(async (d) => { try { d.info = await medlineplus("condition", d.icd, lang); } catch {} });
    await Promise.all([...tasks, ...labTasks, ...dxTasks]);
    onUpdate && onUpdate();
    return true;
  }

  window.PlainlyNLM = { resolveDrug, medlineplus, enrich };
})();
