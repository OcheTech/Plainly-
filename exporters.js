/* Plainly exporters: calendar reminders (.ics, works with Google/Apple/Outlook calendars) and
 * a printable bilingual medicine card. All generated on the device.
 */
(function () {
  "use strict";
  const I = window.PlainlyI18n;
  const pad = (n) => String(n).padStart(2, "0");
  const icsDate = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const icsDateTime = (d) => `${icsDate(d)}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const escICS = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  const fold = (line) => { const out = []; let s = line; while (s.length > 74) { out.push(s.slice(0, 74)); s = " " + s.slice(74); } out.push(s); return out.join("\r\n"); };

  function doseText(m, lang) {
    if (!m.form || m.form === "dose") return m.strengthText || "";
    const amt = m.amount ?? 1;
    return `${amt} ${I.form(lang, m.form, amt)}${m.strengthText && m.form !== "unit" ? " (" + m.strengthText + ")" : ""}`;
  }
  function whenText(m, lang) {
    const parts = [];
    if (m.freqKey) parts.push(I.t(lang, m.freqKey, m.freqVars));
    if (m.prn) parts.push(I.t(lang, "as_needed") + (m.prnReason ? ": " + m.prnReason : ""));
    if (m.route) parts.push(I.t(lang, m.route));
    if (m.durationDays) parts.push(m.durationDays % 7 === 0 && m.durationDays >= 14 ? I.t(lang, "for_weeks", { n: m.durationDays / 7 }) : I.t(lang, "for_days", { n: m.durationDays }));
    if (m.withFood) parts.push(I.t(lang, m.withFood));
    return parts.join(" · ");
  }

  /** Build an .ics calendar: one repeating reminder per medicine per time of day, plus appointments. */
  function buildICS(R, lang, times, start) {
    const now = new Date();
    const stamp = icsDateTime(now) + "Z";
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Plainly//Medicine reminders//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    let uid = 0;
    const startDay = start || new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const active = R.medications.filter((m) => m.status !== "stop" && m.status !== "hold" && !m.prn && m.times && m.times.length && !m.complex);
    active.forEach((m) => {
      m.times.filter((s) => times[s]).forEach((slot) => {
        const [hh, mm] = times[slot].split(":").map(Number);
        const d = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate(), hh, mm);
        let rule = "FREQ=DAILY";
        if (m.weekly) rule = "FREQ=WEEKLY";
        else if (m.qod) rule = "FREQ=DAILY;INTERVAL=2";
        if (m.durationDays) rule += `;COUNT=${m.weekly ? Math.max(1, Math.round(m.durationDays / 7)) : m.qod ? Math.ceil(m.durationDays / 2) : m.durationDays}`;
        const summary = `💊 ${m.display} ${doseText(m, lang)}`.trim();
        lines.push("BEGIN:VEVENT", `UID:plainly-${now.getTime()}-${uid++}@plainly`, `DTSTAMP:${stamp}`, `DTSTART:${icsDateTime(d)}`, `DURATION:PT15M`, `RRULE:${rule}`,
          fold(`SUMMARY:${escICS(summary)}`), fold(`DESCRIPTION:${escICS(whenText(m, lang) + "\n" + m.source_quote)}`),
          "BEGIN:VALARM", "ACTION:DISPLAY", fold(`DESCRIPTION:${escICS(summary)}`), "TRIGGER:PT0M", "END:VALARM", "END:VEVENT");
      });
    });
    (R.appointments || []).filter((a) => a.date).forEach((a) => {
      const d = new Date(a.date);
      lines.push("BEGIN:VEVENT", `UID:plainly-${now.getTime()}-${uid++}@plainly`, `DTSTAMP:${stamp}`);
      if (a.hasTime) lines.push(`DTSTART:${icsDateTime(d)}`, "DURATION:PT1H");
      else { const e = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); lines.push(`DTSTART;VALUE=DATE:${icsDate(d)}`, `DTEND;VALUE=DATE:${icsDate(e)}`); }
      lines.push(fold(`SUMMARY:${escICS("📅 " + (a.approx ? I.t(lang, "due") + ": " : "") + a.what)}`), fold(`DESCRIPTION:${escICS(a.source_quote)}`),
        "BEGIN:VALARM", "ACTION:DISPLAY", fold(`DESCRIPTION:${escICS(a.what)}`), a.hasTime ? "TRIGGER:-PT2H" : "TRIGGER:-PT12H", "END:VALARM", "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    return { ics: lines.join("\r\n"), events: uid };
  }

  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  window.PlainlyExport = { buildICS, download, doseText, whenText };
})();
