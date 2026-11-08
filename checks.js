/* Plainly medication safety checks. Each check targets a well-documented error pattern:
 *  - acetaminophen over 4 g/day and acetaminophen in several products (FDA acetaminophen safety campaign)
 *  - duplicate medicines / two NSAIDs / two anticoagulants
 *  - opioid + benzodiazepine or other sedatives (FDA boxed warning, 2016; gabapentinoids, FDA 2019)
 *  - anticoagulant + NSAID or antiplatelet (bleeding)
 *  - ACE inhibitor/ARB + diuretic + NSAID ("triple whammy" acute kidney injury)
 *  - several potassium-raising medicines
 *  - allergy conflicts; medicines the same document says to avoid; STOP and TAKE for the same drug
 *  - methotrexate written as daily (ISMP: daily-instead-of-weekly deaths)
 *  - Joint Commission / ISMP error-prone abbreviations; critical lab values; unclear frequency
 * Findings are framed as "ask your pharmacist", never as advice to change treatment.
 */
(function () {
  "use strict";
  const KB = window.PlainlyKB;
  const fmt = (n) => String(Math.round(n)); // no thousands separator: keeps the translation number-lock exact

  function flagsOf(m) {
    const f = new Set();
    (m.classes || []).forEach((c) => (KB.CLASSES[c]?.flags || []).forEach((x) => f.add(x)));
    if (m.key && KB.DRUGS[m.key]?.sedating) f.add("sedating");
    if (m.key && KB.DRUGS[m.key]?.serotonergic) f.add("serotonergic");
    return f;
  }

  function run(R, text) {
    const out = [];
    const add = (id, level, detail, meds = [], quotes = []) =>
      out.push({ id, level, titleKey: "ck_" + id, detail, meds: meds.map((m) => m.display || m), quotes: quotes.filter(Boolean) });
    const active = R.medications.filter((m) => m.status !== "stop" && m.status !== "hold");
    active.forEach((m) => (m._flags = flagsOf(m)));
    const withFlag = (f) => active.filter((m) => m._flags.has(f));
    const q = (arr) => arr.map((m) => m.source_quote);

    // ---- acetaminophen total
    const apap = active.filter((m) => (m.ingredients || []).includes("acetaminophen") || m._flags.has("apap"));
    if (apap.length) {
      const total = apap.reduce((a, m) => a + (m.mgPerDay?.acetaminophen || 0), 0);
      const known = apap.every((m) => m.mgPerDay?.acetaminophen);
      if (total > 4000) {
        add("apap_over", "danger", `Taken as written, these could add up to about ${fmt(total)} mg of acetaminophen (Tylenol) in 24 hours: ${apap.map((m) => `${m.display} (up to ${fmt(m.mgPerDay.acetaminophen || 0)} mg)`).join(", ")}. The usual adult maximum is 4,000 mg a day, and many experts advise 3,000 mg or less. Too much can cause serious liver damage.`, apap, q(apap));
      } else if (apap.length >= 2) {
        add("apap_dup", "caution", `${apap.map((m) => m.display).join(" and ")} all contain acetaminophen (Tylenol)${known ? `, up to about ${fmt(total)} mg a day together` : ""}. Do not take them close together unless your care team told you to, and avoid other products with acetaminophen, such as many cold and flu medicines.`, apap, q(apap));
      } else if (total >= 4000) {
        add("apap_max", "info", `${apap[0].display} as written can reach ${fmt(total)} mg of acetaminophen a day, the most allowed. Do not take any other product that contains acetaminophen, including cold and flu medicines.`, apap, q(apap));
      }
    }

    // ---- duplicates by ingredient
    const byIng = {};
    active.forEach((m) => (m.ingredients || [m.key]).forEach((ing) => { if (ing && ing !== "acetaminophen") (byIng[ing] ||= []).push(m); }));
    Object.entries(byIng).forEach(([ing, arr]) => {
      if (arr.length >= 2) add("dup", "caution", `${ing.charAt(0).toUpperCase() + ing.slice(1)} appears in more than one line: ${arr.map((m) => m.source_quote).join(" | ")}. Taking both could double the dose. Ask whether you should take one or both.`, arr, q(arr));
    });

    // ---- two NSAIDs
    const nsaids = withFlag("nsaid");
    if (nsaids.length >= 2) add("two_nsaid", "caution", `${nsaids.map((m) => m.display).join(" and ")} are both anti-inflammatory pain medicines (NSAIDs). Taking two together raises the risk of stomach bleeding and kidney problems without better pain relief.`, nsaids, q(nsaids));

    // ---- anticoagulants
    const ac = withFlag("anticoagulant");
    if (ac.length >= 2) add("two_anticoag", "danger", `${ac.map((m) => m.display).join(" and ")} are both blood thinners. Sometimes two are used together for a short, planned time (for example while warfarin starts working). Make sure you know exactly when to stop one of them.`, ac, q(ac));
    const bleedPartners = active.filter((m) => !m._flags.has("anticoagulant") && (m._flags.has("nsaid") || (m.classes || []).includes("antiplatelet")));
    if (ac.length && bleedPartners.length) add("bleed", "caution", `${ac.map((m) => m.display).join(", ")} (a blood thinner) together with ${bleedPartners.map((m) => m.display).join(", ")} raises the chance of bleeding. Your doctor may want this, but know the signs: unusual bruising, black stools, blood in urine, or vomiting blood.`, [...ac, ...bleedPartners], q([...ac, ...bleedPartners]));

    // ---- opioid + sedatives
    const op = withFlag("opioid");
    const sed = active.filter((m) => !m._flags.has("opioid") && m._flags.has("sedating"));
    if (op.length && sed.length) add("opioid_sedative", "danger", `${op.map((m) => m.display).join(", ")} (an opioid) with ${sed.map((m) => m.display).join(", ")} can together cause extreme sleepiness and dangerously slow breathing. The FDA requires its strongest warning on opioids taken with benzodiazepines. Ask whether you should take them at the same time, and do not drink alcohol.`, [...op, ...sed], q([...op, ...sed]));
    if (op.length && !withFlag("laxative").length) add("opioid_constipation", "info", `${op.map((m) => m.display).join(", ")} usually causes constipation. Ask whether you should also take a stool softener or laxative.`, op, q(op));

    // ---- triple whammy
    const raas = withFlag("raas"), diur = withFlag("diuretic");
    if (raas.length && diur.length && nsaids.length) add("triple", "caution", `${[...raas, ...diur, ...nsaids].map((m) => m.display).join(", ")}: a blood pressure medicine (ACE inhibitor/ARB), a water pill and an NSAID together can strain the kidneys, especially if you get dehydrated.`, [...raas, ...diur, ...nsaids], q([...raas, ...diur, ...nsaids]));

    // ---- potassium
    const kr = withFlag("k_raising"), ks = withFlag("k_supplement");
    if (kr.length + ks.length >= 2 && (ks.length || kr.length >= 2)) add("potassium", "info", `${[...kr, ...ks].map((m) => m.display).join(", ")} can each raise your potassium level. Your doctor may want this combination, which is why potassium blood tests matter. Do not use salt substitutes (they contain potassium) unless your doctor says so.`, [...kr, ...ks], q([...kr, ...ks]));

    // ---- allergies
    (R.allergies || []).filter((a) => !a.none).forEach((a) => {
      const hits = active.filter((m) => (a.drugKey && m.key === a.drugKey) || (m.classes || []).some((c) => a.classes.includes(c)) || (a.classes.includes("nsaid") && m._flags.has("nsaid")));
      if (hits.length) add("allergy", "danger", `You are listed as allergic to ${a.name}${a.reaction ? ` (${a.reaction})` : ""}, and ${hits.map((m) => m.display).join(", ")} is in the same medicine family. Ask your pharmacist or doctor before taking it.`, hits, [...q(hits), a.source_quote]);
      if (a.classes.includes("penicillin")) {
        const ceph = active.filter((m) => (m.classes || []).includes("cephalosporin"));
        if (ceph.length) add("allergy", "caution", `You are listed as allergic to ${a.name}. ${ceph.map((m) => m.display).join(", ")} is a related antibiotic (a cephalosporin). Most people with a penicillin allergy can take it safely, but make sure your prescriber knows about your reaction.`, ceph, q(ceph));
      }
    });

    // ---- the document says to avoid something that is on the list
    const units = window.PlainlyEngine.splitUnits(text);
    units.forEach((u) => {
      if (!/\b(?:avoid|do not (?:take|use)|don't (?:take|use)|no more|stop taking|should not take)\b/i.test(u)) return;
      if (R.medications.some((m) => m.status === "stop" && m.source_quote === u)) return; // reported by stop_and_take
      let hits = [];
      if (/\bNSAIDs?\b|anti-?inflammator/i.test(u)) hits = active.filter((m) => m._flags.has("nsaid") || (/aspirin/i.test(u) && m.key === "aspirin"));
      ["ibuprofen", "naproxen", "aspirin", "acetaminophen"].forEach((k) => { if (new RegExp("\\b" + k + "\\b", "i").test(u)) hits.push(...active.filter((m) => m.key === k || (m.ingredients || []).includes(k))); });
      if (/blood thinners?|anticoagula/i.test(u)) hits.push(...withFlag("anticoagulant"));
      if (/sleeping pills?|sedatives?/i.test(u)) hits.push(...withFlag("sedating"));
      hits = [...new Set(hits)].filter((m) => !norm(u).includes(norm(m.source_quote)));
      if (hits.length) add("avoid_conflict", "danger", `Your document says: "${u}" But ${hits.map((m) => m.display).join(", ")} is on your medicine list. Ask which instruction is right before your next dose.`, hits, [u, ...q(hits)]);
    });

    // ---- methotrexate
    active.filter((m) => KB.DRUGS[m.key]?.weekly && m.perDay >= 1).forEach((m) =>
      add("mtx", "danger", `${m.display} is written to be taken ${m.perDay >= 2 ? "more than once a day" : "every day"}. For arthritis and psoriasis it is almost always taken once a WEEK, and taking it daily by mistake has caused deaths. Confirm the schedule with your pharmacist before the next dose.`, [m], [m.source_quote]));

    // ---- per-drug label maximum
    active.forEach((m) => {
      const d = KB.DRUGS[m.key];
      if (!d?.maxDaily) return;
      const mg = m.mgPerDay?.[m.key];
      if (mg && mg > d.maxDaily) add("max_dose", "caution", `${m.display} as written could reach ${fmt(mg)} mg a day. The usual label maximum is ${fmt(d.maxDaily)} mg a day.`, [m], [m.source_quote]);
    });

    // ---- STOP and TAKE for the same medicine
    const stopped = R.medications.filter((m) => m.status === "stop");
    stopped.forEach((s) => {
      const both = active.filter((m) => m.key && m.key === s.key);
      if (both.length) add("stop_and_take", "caution", `${s.display} is listed to STOP ("${s.source_quote}") and also to take ("${both[0].source_quote}"). Ask which is right.`, [s, ...both], [s.source_quote, ...q(both)]);
    });

    // ---- unclear frequency, unknown names
    active.filter((m) => m.unclearFreq).forEach((m) => add("no_freq", "caution", `How often to take ${m.display} is not written clearly ("${m.source_quote}"). Ask your pharmacist exactly when to take it.`, [m], [m.source_quote]));
    active.filter((m) => !m.recognized && !m.nlm).forEach((m) => add("unknown_drug", "info", `"${m.name}" is not in Plainly's medicine list${navigator.onLine ? " and could not be confirmed online" : ""}. Check the spelling with your pharmacist.`, [m], [m.source_quote]));

    // ---- critical labs
    (R.results || []).filter((r) => r.critical).forEach((r) => add("critical", "danger", `${r.test}: ${r.value} is far outside the usual range. If your care team has not already talked with you about this result, contact them today. If you feel very unwell, get urgent care.`, [], [r.source_quote]));

    // ---- error-prone abbreviations (grouped)
    const seen = new Set();
    (R.ismp || []).forEach((i) => {
      if (seen.has(i.abbr)) return; seen.add(i.abbr);
      add("ismp", "info", `"${i.found}" means ${i.means}. ${i.risk} Safer to write: ${i.use}.`, [], [i.source_quote]);
    });

    const order = { danger: 0, caution: 1, info: 2 };
    out.sort((a, b) => order[a.level] - order[b.level]);
    return out;
  }
  const norm = (s) => window.PlainlyEngine.norm(s);

  window.PlainlyChecks = { run, flagsOf };
})();
