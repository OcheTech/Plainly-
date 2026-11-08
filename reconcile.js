/* Plainly medication reconciliation: compare two medicine lists (e.g. hospital discharge list vs.
 * the pill bottles at home). Medication discrepancies at transitions of care are among the most
 * common causes of preventable medication harm. Matching uses generic names, brand names and
 * ingredients (built-in list, plus RxNorm when online), so "Lasix" matches "furosemide".
 */
(function () {
  "use strict";
  const E = window.PlainlyEngine, KB = window.PlainlyKB;

  const ingKey = (m) => (m.ingredients && m.ingredients.length ? m.ingredients.slice().sort().join("+") : (m.key || m.name || "").toLowerCase());
  const strengthOf = (m) => (m.strengthVals && m.strengthVals.length ? m.strengthVals.join("/") + " " + (m.strengthUnit || "") : "").trim();
  const perDayOf = (m) => (m.prn ? "prn" : m.perDay != null ? String(Math.round(m.perDay * 100) / 100) : "?");
  const doseMg = (m) => Object.values(m.mgPerDose || {})[0];

  function compare(textA, textB) {
    const A = E.analyze(textA).medications.filter((m) => m.status !== "stop");
    const B = E.analyze(textB).medications.filter((m) => m.status !== "stop");
    const stoppedA = E.analyze(textA).medications.filter((m) => m.status === "stop");
    const rows = [];
    const usedB = new Set();
    A.forEach((a) => {
      const bi = B.findIndex((b, i) => !usedB.has(i) && ingKey(b) === ingKey(a));
      if (bi < 0) { rows.push({ type: "onlyA", a, b: null }); return; }
      usedB.add(bi);
      const b = B[bi];
      const diffs = [];
      const da = doseMg(a), db = doseMg(b);
      if (da != null && db != null ? Math.abs(da - db) > 0.001 : strengthOf(a) !== strengthOf(b)) diffs.push("dose");
      if (perDayOf(a) !== perDayOf(b)) diffs.push("frequency");
      rows.push({ type: diffs.length ? "changed" : "same", a, b, diffs });
    });
    B.forEach((b, i) => {
      if (usedB.has(i)) return;
      const wasStopped = stoppedA.find((s) => ingKey(s) === ingKey(b));
      rows.push({ type: wasStopped ? "stoppedButHome" : "onlyB", a: wasStopped || null, b });
    });
    // same drug family in different lines (e.g. warfarin at home, apixaban from hospital)
    const families = ["anticoagulant", "nsaid", "beta_blocker", "ace_inhibitor", "arb", "statin", "ppi", "ssri", "opioid", "benzodiazepine", "sulfonylurea", "insulin", "loop_diuretic", "thiazide"];
    rows.forEach((r) => {
      if (r.type !== "onlyA" && r.type !== "onlyB") return;
      const m = r.a || r.b;
      const other = rows.find((o) => o !== r && (o.type === "onlyA" || o.type === "onlyB") && o.type !== r.type && (o.a || o.b).classes.some((c) => families.includes(c) && m.classes.includes(c)));
      if (other) { r.family = (other.a || other.b).display; r.familyClass = m.classes.find((c) => families.includes(c)); }
    });
    // explanations
    rows.forEach((r) => {
      const a = r.a, b = r.b;
      if (r.type === "same") r.explain = "Same medicine and dose on both lists.";
      if (r.type === "changed") r.explain = `The ${r.diffs.join(" and ")} ${r.diffs.length > 1 ? "are" : "is"} different: "${a.source_quote}" vs "${b.source_quote}". Ask which one is correct now, and get rid of old bottles so you do not take both.`;
      if (r.type === "onlyA") r.explain = r.family ? `New on the first list. It is in the same family (${KB.CLASSES[r.familyClass]?.label || r.familyClass}) as ${r.family} on the second list. You should usually NOT take both. Ask which one to take.` : "Only on the first list. If this is a new medicine, make sure you have it and know how to take it.";
      if (r.type === "onlyB") r.explain = r.family ? `Only on the second list, and in the same family (${KB.CLASSES[r.familyClass]?.label || r.familyClass}) as ${r.family} on the first list. Taking both could be dangerous. Ask before your next dose.` : "Only on the second list. Ask whether you should keep taking it. It may have been left off by mistake, or stopped on purpose.";
      if (r.type === "stoppedButHome") r.explain = `The first list says to STOP this ("${a.source_quote}"), but it is on the second list. Ask before taking it again.`;
      r.level = r.type === "same" ? "ok" : r.family || r.type === "stoppedButHome" ? "danger" : "caution";
    });
    const order = { danger: 0, caution: 1, ok: 2 };
    rows.sort((x, y) => order[x.level] - order[y.level]);
    // safety checks across everything the person might take
    const union = [...A, ...B.filter((b, i) => !usedB.has(i))];
    const checks = window.PlainlyChecks.run({ medications: union, allergies: [], results: [], ismp: [] }, "");
    return { rows, checks, countA: A.length, countB: B.length };
  }

  window.PlainlyReconcile = { compare };
})();
