/* Plainly for clinicians: check a discharge note BEFORE it reaches the patient.
 * - Reading level (target: 6th grade or lower, per AMA / NIH guidance for patient materials)
 * - Jargon and abbreviations, with plain alternatives
 * - Joint Commission "Do Not Use" / ISMP error-prone abbreviations
 * - Key elements of a safe discharge (based on AHRQ's Re-Engineered Discharge (Project RED) toolkit
 *   and Joint Commission discharge-communication guidance)
 * - How Plainly's parser reads each medicine line: if software cannot tell how often to take it,
 *   a tired patient may not be able to either.
 */
(function () {
  "use strict";
  const E = window.PlainlyEngine;

  function review(text) {
    const R = E.analyze(text);
    const checks = window.PlainlyChecks.run(R, text);
    const units = E.splitUnits(text).filter((u) => !E.isMetaUnit(u));
    const grade = E.fkGrade(E.proseOf(text) || units.join(" "));
    const hardest = units.map((u) => ({ u, g: E.fkGrade(u.length > 40 ? u : u + " " + u) })).filter((x) => x.g && x.g > 8 && x.u.split(/\s+/).length >= 6).sort((a, b) => b.g - a.g).slice(0, 5);
    // Readability formulas only count word and sentence length, so abbreviation-heavy notes
    // ("s/p 3d IV abx, QD") look easy. Jargon density catches that.
    const words = text.match(/[A-Za-z][A-Za-z0-9/'.-]*/g) || [];
    const isJargon = (w) => /^[A-Z][A-Z0-9]{1,5}s?$/.test(w.replace(/[.,]$/, "")) || /\w\/\w/.test(w) || /^(?:q\d*h|qd|bid|tid|qid|qhs|prn|po|abx|exac|afebrile|dx|hx|tx|pt)$/i.test(w.replace(/[.,]$/, "")) ||
      window.PlainlyKB.GLOSSARY.some(([src]) => !/\s/.test(src) && new RegExp("^(?:" + src + ")$", "i").test(w.replace(/[.,]$/, "")));
    const jargonCount = words.filter(isJargon).length;
    const jargonPct = words.length ? Math.round((100 * jargonCount) / words.length) : 0;
    const has = (re) => re.test(text);
    const meds = R.medications;
    const elements = [
      { id: "dx", label: "Reason for the visit or diagnosis, in plain words", ok: R.diagnosis.length > 0 || has(/treated for|diagnosed with|you (?:were|came) (?:in|here) (?:for|with)/i) },
      { id: "meds", label: "Complete medicine list with dose and how often", ok: meds.length > 0 && meds.every((m) => m.status === "stop" || m.perDay || m.prn) },
      { id: "changes", label: "Medicine changes marked (new / changed / stop)", ok: meds.some((m) => m.status) || has(/\b(?:new|stop|changed?|discontinue|start)\b/i) },
      { id: "purpose", label: "What each medicine is for", ok: has(/\bfor (?:your |high |blood |pain|infection|heart|sugar|cholesterol)|\bto (?:treat|prevent|lower|help|control)\b/i) },
      { id: "warnings", label: "Specific warning signs and what to do (call vs. 911)", ok: R.warning_signs.length >= 2 },
      { id: "contact", label: "Who to call, with a phone number", ok: has(/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}|\b\d{3}-\d{4}\b/) },
      { id: "followup", label: "Follow-up appointment with a date or clear time frame", ok: R.appointments.some((a) => a.date) },
      { id: "pending", label: "Tests still pending, and who will report them", ok: R.pending.length > 0 || has(/no (?:tests|results) (?:are )?pending|all results (?:are )?final/i), soft: true },
      { id: "self", label: "Self-care: diet, activity or wound care", ok: R.instructions.some((i) => /cat_(?:diet|activity|wound|monitor)/.test(i.category)) },
      { id: "plain", label: "Plain language: grade 6 or lower and under 5% jargon", ok: grade != null && grade <= 6 && jargonPct < 5 },
    ];
    // jargon: glossary hits + unexplained word parts
    const jargon = R.glossary.map((g) => ({ term: g.term, plain: g.plain }));
    R.decoded.forEach((d) => jargon.push({ term: d.word, plain: d.guess + " (from word parts)" }));
    const medRows = meds.map((m) => ({
      line: m.source_quote, name: m.display, status: m.status || "",
      dose: m.form && m.form !== "dose" ? `${m.amount} ${m.form}${m.amount === 1 ? "" : "s"}` : m.strengthText,
      route: m.route ? window.PlainlyI18n.t("en", m.route) : "?",
      when: m.prn ? "as needed" + (m.prnReason ? ` for ${m.prnReason}` : " (reason not stated)") : m.freqKey ? window.PlainlyI18n.t("en", m.freqKey, m.freqVars) : "?",
      duration: m.durationDays ? `${m.durationDays} days` : "",
      issues: [m.unclearFreq && "frequency unclear", m.complex && "complex schedule: write day by day", m.prn && !m.prnReason && "PRN without a reason", !m.recognized && "name not recognized", !m.route && m.status !== "stop" && "route missing"].filter(Boolean),
    }));
    // a patient-friendly draft the clinician can copy and edit
    const draft = [];
    if (R.diagnosis.length) draft.push("Why you were here: " + R.diagnosis.map((d) => d.plain.replace(/\.$/, "")).join("; ") + ".");
    if (meds.length) {
      draft.push("", "Your medicines:");
      meds.forEach((m) => {
        const st = m.status === "stop" ? "STOP taking " : m.status === "new" ? "NEW: " : m.status === "changed" ? "CHANGED: " : "";
        if (m.status === "stop") { draft.push(`- ${st}${m.display}.`); return; }
        const w = window.PlainlyExport.whenText(m, "en");
        draft.push(`- ${st}${m.display} ${window.PlainlyExport.doseText(m, "en")}: ${w || "ask how often"}.`);
      });
    }
    const warn = R.warning_signs;
    if (warn.some((w) => w.urgency === "emergency")) draft.push("", "Call 911 if you have:", ...warn.filter((w) => w.urgency === "emergency").map((w) => "- " + w.sign));
    if (warn.some((w) => w.urgency === "call_doctor")) draft.push("", "Call us if you have:", ...warn.filter((w) => w.urgency === "call_doctor").map((w) => "- " + w.sign));
    if (R.appointments.length) draft.push("", "Next steps:", ...R.appointments.map((a) => `- ${a.when}: ${a.what}`));
    const other = R.instructions.filter((i) => i.category !== "course");
    if (other.length) draft.push("", "Other instructions:", ...other.map((i) => "- " + i.text));
    if (!elements.find((e) => e.id === "warnings").ok) draft.push("", "[Add specific warning signs here: for example, fever over 101 F, trouble breathing, chest pain.]");
    if (!elements.find((e) => e.id === "contact").ok) draft.push("[Add the clinic phone number and an after-hours number.]");
    const draftText = draft.join("\n").trim();
    return { R, checks, grade, jargonPct, jargonCount, draftGrade: E.fkGrade(draftText), hardest, elements, jargon, ismp: R.ismp, medRows, draft: draftText };
  }

  window.PlainlyWriter = { review };
})();
