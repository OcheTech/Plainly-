/* Plainly - user interface */
(function () {
  "use strict";
  const E = window.PlainlyEngine, KB = window.PlainlyKB, I = window.PlainlyI18n, C = window.PlainlyChecks;
  const N = window.PlainlyNLM, TR = window.PlainlyTranslate, X_ = window.PlainlyExport;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem("plainly-" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("plainly-" + k, JSON.stringify(v)); } catch {} },
  };

  const state = { lang: "en", R: null, checks: [], original: "", showEnglish: false, txRun: 0, times: store.get("times", { morning: "08:00", midday: "12:00", evening: "18:00", bedtime: "21:00" }) };

  // ================================================================ display settings
  const root = document.documentElement;
  const prefs = store.get("prefs", {});
  function applyPrefs() {
    root.style.setProperty("--fs", (prefs.fs || 18) + "px");
    root.dataset.contrast = prefs.contrast ? "high" : "";
    root.dataset.spacing = prefs.spacing ? "easy" : "";
    if (prefs.contrast) root.dataset.theme = "light"; else delete root.dataset.theme;
    $("#contrastBtn").setAttribute("aria-pressed", !!prefs.contrast);
    $("#spacingBtn").setAttribute("aria-pressed", !!prefs.spacing);
  }
  $("#textSmaller").onclick = () => { prefs.fs = Math.max(15, (prefs.fs || 18) - 2); applyPrefs(); store.set("prefs", prefs); };
  $("#textLarger").onclick = () => { prefs.fs = Math.min(28, (prefs.fs || 18) + 2); applyPrefs(); store.set("prefs", prefs); };
  $("#contrastBtn").onclick = () => { prefs.contrast = !prefs.contrast; applyPrefs(); store.set("prefs", prefs); };
  $("#spacingBtn").onclick = () => { prefs.spacing = !prefs.spacing; applyPrefs(); store.set("prefs", prefs); };
  applyPrefs();

  // ================================================================ tool tabs
  const modes = [["modeDoc", "panelDoc"], ["modeRec", "panelRec"], ["modeClin", "panelClin"]];
  function selectMode(id) {
    modes.forEach(([b, p]) => { const on = b === id; $("#" + b).setAttribute("aria-selected", on); $("#" + b).tabIndex = on ? 0 : -1; $("#" + p).hidden = !on; });
  }
  modes.forEach(([b], i) => {
    $("#" + b).onclick = () => selectMode(b);
    $("#" + b).onkeydown = (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const n = modes[(i + (e.key === "ArrowRight" ? 1 : modes.length - 1)) % modes.length][0];
      selectMode(n); $("#" + n).focus();
    };
  });

  // ================================================================ inputs
  const langSel = $("#language");
  const og = { full: document.createElement("optgroup"), mt: document.createElement("optgroup"), br: document.createElement("optgroup") };
  og.full.label = "Checked wording + on-device translation"; og.mt.label = "On-device translation only"; og.br.label = "Needs Chrome's built-in translator";
  I.LANGS.forEach((L) => (L.browserOnly ? og.br : L.partial ? og.mt : og.full).append(new Option(L.id === "en" ? "English" : `${L.native} - ${L.name}`, L.id)));
  langSel.append(og.full, og.mt, og.br);
  const savedLang = store.get("lang", null);
  const guess = I.LANGS.find((L) => L.id === (navigator.language || "en").slice(0, 2));
  langSel.value = savedLang || (guess ? guess.id : "en");
  langSel.onchange = () => { store.set("lang", langSel.value); if (state.R) { state.lang = langSel.value; render(); } };

  function selectInputTab(which) {
    const paste = which === "paste";
    $("#tabPaste").setAttribute("aria-selected", paste); $("#tabFile").setAttribute("aria-selected", !paste);
    $("#tabPaste").tabIndex = paste ? 0 : -1; $("#tabFile").tabIndex = paste ? -1 : 0;
    $("#inPaste").hidden = !paste; $("#inFile").hidden = paste;
  }
  $("#tabPaste").onclick = () => selectInputTab("paste");
  $("#tabFile").onclick = () => selectInputTab("file");
  $$("[data-sample]").forEach((b) => (b.onclick = () => { $("#docText").value = window.PLAINLY_SAMPLES[b.dataset.sample].text; selectInputTab("paste"); explain(); }));

  function showMsg(text) { const m = $("#inputMsg"); m.textContent = text; m.hidden = !text; }

  // photos and PDFs are read on the device
  const dz = $("#dropzone");
  ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("drag"); }));
  ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("drag"); }));
  dz.addEventListener("drop", (e) => e.dataTransfer.files[0] && readFile(e.dataTransfer.files[0]));
  $("#fileInput").onchange = (e) => { if (e.target.files[0]) readFile(e.target.files[0]); e.target.value = ""; };
  document.addEventListener("paste", (e) => {
    if ($("#panelDoc").hidden) return;
    const img = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith("image/"));
    if (img) { e.preventDefault(); selectInputTab("file"); readFile(img); }
  });
  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Could not load " + src)); document.head.append(s); });
  async function readFile(f) {
    const st = $("#fileStatus");
    try {
      let text = "";
      if (f.type === "application/pdf") {
        st.textContent = "Reading the PDF on this device…";
        if (!window.pdfjsLib) {
          await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
        const pdf = await window.pdfjsLib.getDocument({ data: await f.arrayBuffer() }).promise;
        for (let p = 1; p <= Math.min(pdf.numPages, 20); p++) {
          const c = await (await pdf.getPage(p)).getTextContent();
          let lastY = null;
          c.items.forEach((it) => { const y = it.transform[5]; if (lastY !== null && Math.abs(y - lastY) > 4) text += "\n"; else if (lastY !== null) text += " "; text += it.str; lastY = y; });
          text += "\n";
        }
        if (text.replace(/\s/g, "").length < 20) throw new Error("This PDF looks like a scanned image. Take a photo of the page instead.");
      } else if (f.type.startsWith("image/")) {
        st.textContent = "Loading the on-device text reader…";
        if (!window.Tesseract) await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js");
        const { data } = await window.Tesseract.recognize(f, "eng", { logger: (m) => m.status === "recognizing text" && (st.textContent = `Reading the photo on this device… ${Math.round(m.progress * 100)}%`) });
        text = data.text;
        if (text.replace(/\s/g, "").length < 20) throw new Error("Not enough text could be read. Try a sharper, well-lit photo, flat and straight.");
      } else throw new Error("Please use a photo (JPG, PNG) or a PDF.");
      $("#docText").value = text.trim();
      st.textContent = "Done. Check the text below for reading mistakes, then press Explain.";
      selectInputTab("paste");
      $("#docText").focus();
    } catch (err) { st.textContent = err.message; }
  }

  // ================================================================ translation helpers
  let txList = [];
  const lang = () => state.lang;
  const full = () => lang() === "en" || I.hasTemplates(lang());
  /** free text that goes through machine translation */
  function X(en) {
    if (!en) return "";
    if (lang() === "en") return esc(en);
    const i = txList.push(en) - 1;
    return `<span class="tx pending" data-tx="${i}">${esc(en)}</span>`;
  }
  /** machine-translated text that also keeps the English original underneath (safety-critical) */
  const XB = (en) => X(en).replace('class="tx pending"', 'class="tx pending bi"');
  /** fixed, checked wording (falls back to machine translation for languages without templates) */
  function T(key, vars) { return full() ? esc(I.t(lang(), key, vars)) : X(I.t("en", key, vars)); }
  const F = (form, n) => (full() ? esc(I.form(lang(), form, n)) : X(I.form("en", form, n)));

  async function translatePass() {
    if (lang() === "en") return;
    const run = ++state.txRun;
    const spans = $$("#results [data-tx]");
    const bar = $("#txbar");
    const L = I.lang(lang());
    if (!spans.length) return;
    const texts = [...new Set(spans.map((s) => txList[+s.dataset.tx]))];
    let done = 0, fails = 0;
    const setBar = (html) => { if (bar && run === state.txRun) bar.innerHTML = html; };
    setBar(`<span>🌐 Translating ${texts.length} sentences into ${esc(L.native)} on this device…</span> <progress max="${texts.length}" value="0"></progress>`);
    try {
      const engine = await TR.translateMany(lang(), texts, (i, r) => {
        if (run !== state.txRun) return;
        done++; if (r.failed) fails++;
        spans.filter((s) => txList[+s.dataset.tx] === texts[i]).forEach((s) => {
          s.classList.remove("pending");
          s.dataset.en = texts[i];
          s.dataset.out = r.text;
          if (!state.showEnglish) s.textContent = r.text;
          if (r.failed) { s.classList.add("mt-fail"); s.title = I.t(lang(), "num_fail"); } else s.title = texts[i];
          // safety-critical text (warning signs, safety alerts) always keeps the English underneath
          if (s.classList.contains("bi") && !r.failed && !(s.nextElementSibling && s.nextElementSibling.classList.contains("en-under")))
            s.insertAdjacentHTML("afterend", `<span class="en-under" lang="en" dir="ltr">${esc(texts[i])}</span>`);
        });
        const p = bar && bar.querySelector("progress"); if (p) p.value = done;
      }, (pr) => {
        if (pr.engine === "local" && pr.total) setBar(`<span>⬇️ Downloading the free ${esc(L.native)} translation model (one time, ${Math.round(pr.total / 1e6)} MB file)…</span> <progress max="${pr.total}" value="${pr.loaded}"></progress>`);
        if (pr.engine === "browser" && pr.pct != null) setBar(`<span>⬇️ Your browser is preparing its built-in ${esc(L.native)} translator… ${pr.pct}%</span>`);
      });
      if (run !== state.txRun) return;
      const qNote = engine !== "browser" && L.q && L.q !== "good" ? ` Machine translation into ${esc(L.name)} on this device is ${L.q === "basic" ? "basic and can be wrong" : "fair"}: read the doses, times and warnings (fixed wording) first, and ask for an interpreter about anything unclear.` : "";
      setBar(`<span>🌐 ${esc(L.native)}: ${engine === "browser" ? "translated by your browser's built-in on-device translator" : engine === "cache" ? "translated on this device" : "translated on this device (OPUS-MT)"}. Doses, times and warnings use checked wording${fails ? `; ${fails} sentence${fails === 1 ? "" : "s"} kept in English because a number or medicine name changed` : ""}.${qNote}</span>
        <button type="button" class="ghost" id="toggleEn" aria-pressed="${state.showEnglish}">${esc(I.t(lang(), "show_en"))}</button>`);
      const tb = $("#toggleEn");
      if (tb) tb.onclick = () => {
        state.showEnglish = !state.showEnglish; tb.setAttribute("aria-pressed", state.showEnglish);
        $$("#results [data-tx]").forEach((s) => { if (s.dataset.en) s.textContent = state.showEnglish ? s.dataset.en : s.dataset.out; });
      };
    } catch (err) {
      setBar(`<span>⚠️ ${esc(err.message)} The explanation is shown in English; checked wording is still in ${esc(L.native)}.</span>`);
      $$("#results [data-tx].pending").forEach((s) => s.classList.remove("pending"));
    }
  }

  // ================================================================ explain
  async function explain() {
    showMsg("");
    let text = $("#docText").value.trim();
    if (!text) return showMsg("Paste your document, take a photo, or try a sample first.");
    if (text.length > 60000) return showMsg("That is very long. Please paste one document at a time.");
    let redacted = 0;
    if ($("#redact").checked) { const r = E.redact(text); text = r.text; redacted = r.count; }
    state.lang = langSel.value;
    state.original = text;
    state.R = E.analyze(text);
    state.R.redacted = redacted;
    state.checks = C.run(state.R, text);
    state.showEnglish = false;
    $("#results").hidden = false;
    render();
    $("#results").scrollIntoView({ block: "start" });
    if ($("#lookup").checked && navigator.onLine) {
      const R = state.R;
      const ok = await N.enrich(R, I.lang(state.lang).mp).catch(() => false);
      if (ok && R === state.R) { state.checks = C.run(R, state.original); state.R.nlmDone = true; render(true); }
    }
  }
  $("#explainBtn").onclick = explain;
  $("#docText").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) explain(); });

  // ================================================================ render
  const ICON = { morning: "🌅", midday: "☀️", evening: "🌇", bedtime: "🌙", as_needed: "⏱️" };
  const SLOTS = ["morning", "midday", "evening", "bedtime", "as_needed"];
  const listenBtn = (id) => `<button type="button" class="listen" data-speak="${id}" aria-pressed="false">🔊 ${T("listen")}</button>`;
  const srcBtn = (quote) => {
    if (!quote) return "";
    const v = E.verifyQuote(quote, state.original);
    return `<button type="button" class="src ${v === "unverified" ? "unverified" : ""}" data-quote="${esc(quote)}" title="${esc(quote)}" aria-label="Show in original: ${esc(quote)}">${v === "unverified" ? "!" : "✓"} 📄</button>`;
  };
  const fmtNum = (n) => (n == null ? "" : Math.round(n * 100) / 100);

  function medHow(m) {
    const parts = [];
    if (m.form && m.form !== "dose") parts.push(`<strong>${fmtNum(m.amount)} ${F(m.form, m.amount)}</strong>${m.strengthText && m.form !== "unit" ? ` <span class="muted">(${esc(m.strengthText)})</span>` : ""}`);
    else if (m.strengthText) parts.push(`<strong>${esc(m.strengthText)}</strong>`);
    if (m.route) parts.push(T(m.route));
    return parts.join(" · ");
  }
  function medWhen(m) {
    const parts = [];
    if (m.freqKey) parts.push(T(m.freqKey, m.freqVars));
    if (m.prn) parts.push(`<strong>${T("as_needed")}</strong>${m.prnReason ? ": " + X(m.prnReason) : ""}`);
    if (m.durationDays) parts.push(m.durationDays % 7 === 0 && m.durationDays >= 14 ? T("for_weeks", { n: m.durationDays / 7 }) : T("for_days", { n: m.durationDays }));
    if (m.withFood) parts.push(T(m.withFood));
    if (m.maxDoses) parts.push(T("max_per_day", { n: m.maxDoses }));
    return parts.join(" · ") || "—";
  }

  function render(keepScroll) {
    txList = [];
    const R = state.R, L = I.lang(lang());
    const meds = R.medications;
    const active = meds.filter((m) => m.status !== "stop" && m.status !== "hold");
    const stopped = meds.filter((m) => m.status === "stop" || m.status === "hold");
    const quotes = [];
    const q = (s) => (s && quotes.push(s), s);

    const S = [];
    // ---- safety checks first: they are the most important part
    const checks = state.checks;
    S.push(`<article class="card res-card safety-card ${checks.some((c) => c.level !== "info") ? "" : "none"}" id="sec-safety">
      <h3><span class="h-left"><span class="ico" aria-hidden="true">🛡️</span>${T("safety")}</span>${checks.length ? listenBtn("safety") : ""}</h3>
      ${checks.length ? `<div data-read="safety">${checks.map((c) => `<div class="check-item ${c.level}"><h4><span class="tag ${c.level}">${T("lv_" + c.level)}</span>${T(c.titleKey)}</h4><p>${XB(c.detail)}</p>${c.level !== "info" ? `<p class="advice">${T("ask_pharmacist")}</p>` : ""}<div class="quotes">${c.quotes.map((x) => srcBtn(q(x))).join("")}</div></div>`).join("")}</div>`
        : `<p style="margin:0">${X(meds.length ? "No common medicine problems were found in this document. Always tell your pharmacist about every medicine you take, including ones you buy without a prescription." : "No medicines were found in this document.")}</p>`}
    </article>`);

    // ---- summary
    const dxHtml = R.diagnosis.length ? `<ul class="items">${R.diagnosis.map((d) => `<li><div>${d.procedure ? "🩺 " : ""}${X(d.plain)}${d.info ? ` · <a href="${esc(d.info.url)}" target="_blank" rel="noopener">${T("more_info")}</a>` : ""}</div>${srcBtn(q(d.source_quote))}</li>`).join("")}</ul>` : "";
    const abn = R.results.filter((r) => r.status === "high" || r.status === "low").length;
    const counts = [
      meds.length && T("sum_meds", { n: active.length }), stopped.length && T("sum_stop", { n: stopped.length }), R.warning_signs.length && T("sum_warn", { n: R.warning_signs.length }),
      R.appointments.length && T("sum_next", { n: R.appointments.length }), R.results.length && T("sum_labs", { n: R.results.length, a: abn }),
    ].filter(Boolean);
    S.push(`<article class="card res-card" id="sec-summary">
      <h3><span class="h-left"><span class="ico" aria-hidden="true">📝</span>${T("summary")}</span>${listenBtn("summary")}</h3>
      <div data-read="summary"><p style="margin:0 0 8px">${T("sum_intro")} ${counts.join(" · ")}</p>${dxHtml}</div>
      ${R.allergies.length ? `<p style="margin:10px 0 0"><strong>${T("allergies")}:</strong> ${R.allergies.map((a) => esc(a.name) + (a.reaction ? ` (${X(a.reaction)})` : "")).join(", ")}</p>` : ""}
      ${lang() !== "en" ? `<p class="small" style="margin:10px 0 0;padding:8px 12px;border-radius:10px;background:var(--info-soft);color:var(--info)">🗣️ ${T("interp")}</p>` : ""}
    </article>`);

    // ---- warning signs
    const warnings = R.warning_signs.slice().sort((a, b) => (a.urgency === "emergency" ? 0 : 1) - (b.urgency === "emergency" ? 0 : 1));
    if (warnings.length) S.push(`<article class="card res-card warn-card" id="sec-warnings">
      <h3><span class="h-left"><span class="ico" aria-hidden="true">🚨</span>${T("warnings")}</span>${listenBtn("warnings")}</h3>
      <ul class="items" data-read="warnings">${warnings.map((w) => `<li class="${w.urgency}"><div><span class="tag ${w.urgency}">${T(w.urgency)}</span>${XB(w.sign)}</div>${srcBtn(q(w.source_quote))}</li>`).join("")}</ul>
      <p class="callout">${T("callout")}</p></article>`);

    // ---- medicines
    if (meds.length) {
      const sched = SLOTS.map((s) => {
        const inSlot = active.filter((m) => (m.times || []).includes(s));
        return `<div class="slot ${inSlot.length ? "" : "empty"}" role="row"><h4 role="rowheader"><span aria-hidden="true">${ICON[s]}</span>${T(s)}</h4><div role="cell">${inSlot.map((m) => `<span class="pill">${esc(m.display)} <span>${esc(m.strengthText || "")}${m.weekly ? " · " + T("f_weekly") : m.qod ? " · " + T("f_qod") : ""}</span></span>`).join("") || "—"}</div></div>`;
      }).join("");
      const medCard = (m) => {
        const cls = KB.CLASSES[(m.classes || [])[0]];
        const purpose = m.purpose || cls?.purpose || "";
        const caution = m.caution || cls?.caution || "";
        const totals = Object.entries(m.mgPerDay || {}).filter(([ing]) => ing === "acetaminophen" || KB.DRUGS[ing]?.maxDaily);
        const alt = [m.correctedName ? `Did you mean "${m.correctedName}"? (spelling checked with RxNorm)` : "", !m.recognized && m.nlm ? "Confirmed in RxNorm (U.S. National Library of Medicine)" : ""].filter(Boolean).join(" · ");
        return `<li class="med"><div class="med-head"><span class="med-name">${m.status ? `<span class="tag ${m.status === "hold" ? "stop" : m.status}">${T("st_" + (m.status === "hold" ? "stop" : m.status))}</span>` : ""}${esc(m.display)}</span>${srcBtn(q(m.source_quote))}</div>
          ${alt ? `<div class="alt">${esc(alt)}</div>` : ""}
          ${m.status === "stop" || m.status === "hold" ? "" : `<dl><dt>${T("how")}</dt><dd>${medHow(m) || "—"}</dd><dt>${T("when")}</dt><dd>${medWhen(m)}</dd>${totals.map(([ing, mg]) => `<dt></dt><dd class="muted">${T("daily_total", { mg })} (${esc(ing)})</dd>`).join("")}</dl>`}
          ${purpose ? `<p><strong>${T("why")}:</strong> ${X(purpose)}</p>` : ""}
          ${caution && m.status !== "stop" ? `<p class="careful"><strong>${T("careful")}:</strong> ${X(caution)}</p>` : ""}
          ${(m.notes || []).filter((n) => !/^stop|^do not take/i.test(n)).map((n) => `<p>${X(n)}</p>`).join("")}
          ${m.info ? `<p><a href="${esc(m.info.url)}" target="_blank" rel="noopener">${T("more_info")}: ${esc(m.info.title)}</a></p>` : ""}</li>`;
      };
      S.push(`<article class="card res-card" id="sec-meds">
        <h3><span class="h-left"><span class="ico" aria-hidden="true">💊</span>${T("meds")}</span>${listenBtn("meds")}</h3>
        ${stopped.length ? `<div class="stop-box"><h4>⛔ ${T("st_stop")}</h4><ul class="items">${stopped.map(medCard).join("")}</ul></div>` : ""}
        ${active.length ? `<div class="schedule" role="table" aria-label="${esc(I.t(lang(), "meds"))}">${sched}</div>` : ""}
        <ul class="items" data-read="meds">${active.map(medCard).join("")}</ul>
        <div class="times-row no-print"><span>⏰</span>${["morning", "midday", "evening", "bedtime"].map((s) => `<label>${T(s)} <input type="time" data-time="${s}" value="${esc(state.times[s])}"></label>`).join("")}
          <button type="button" class="ghost" id="icsBtn">📅 Add reminders to my calendar</button><button type="button" class="ghost" id="cardBtn">🪪 ${T("card_title")}</button></div>
      </article>`);
    }

    // ---- lab results
    if (R.results.length) S.push(`<article class="card res-card" id="sec-results">
      <h3><span class="h-left"><span class="ico" aria-hidden="true">🧪</span>${T("results")}</span>${listenBtn("results")}</h3>
      <div class="table-scroll"><table class="results-table" data-read="results"><thead><tr><th>${T("test")}</th><th>${T("result")}</th><th>${T("range")}</th><th></th></tr></thead><tbody>
      ${R.results.slice().sort((a, b) => (b.critical - a.critical) || ((a.status === "normal") - (b.status === "normal"))).map((r) => `<tr class="${r.critical ? "crit" : ""}"><td><strong>${X(r.test)}</strong><br><span class="muted">${X(r.meaning)}</span>${r.info ? `<br><a class="small" href="${esc(r.info.url)}" target="_blank" rel="noopener">${T("more_info")}</a>` : ""}</td><td>${esc(r.value)} <span class="status ${r.status}">${r.critical ? T("critical") : T(r.status)}</span></td><td>${esc(r.normal_range)}</td><td>${srcBtn(q(r.source_quote))}</td></tr>`).join("")}
      </tbody></table></div></article>`);

    // ---- next steps + pending
    if (R.appointments.length || R.pending.length) S.push(`<article class="card res-card" id="sec-next">
      <h3><span class="h-left"><span class="ico" aria-hidden="true">📅</span>${T("next")}</span>${listenBtn("next")}</h3>
      <ul class="items" data-read="next">${R.appointments.map((a) => `<li><div><strong>${a.date && !a.approx ? esc(new Date(a.date).toLocaleString(L.speech, { weekday: "short", month: "short", day: "numeric", ...(a.hasTime ? { hour: "numeric", minute: "2-digit" } : {}) })) : X(a.when) + (a.date ? ` <span class="muted">(${T("due")} ${esc(new Date(a.date).toLocaleDateString(L.speech, { month: "short", day: "numeric" }))})</span>` : "")}</strong> · ${X(a.what)}</div>${srcBtn(q(a.source_quote))}</li>`).join("")}
      ${R.pending.map((p) => `<li><div><span class="tag caution">${T("pending")}</span>${X(p.text)}</div>${srcBtn(q(p.source_quote))}</li>`).join("")}</ul></article>`);

    // ---- other instructions by category
    const cats = ["cat_monitor", "cat_diet", "cat_activity", "cat_wound", "cat_other"];
    const instr = R.instructions.filter((i) => i.category !== "course");
    if (instr.length) S.push(`<article class="card res-card" id="sec-key">
      <h3><span class="h-left"><span class="ico" aria-hidden="true">📋</span>${T("key")}</span>${listenBtn("key")}</h3><div data-read="key">
      ${cats.filter((c) => instr.some((i) => i.category === c)).map((c) => `<p class="cat-h">${T(c)}</p><ul class="items">${instr.filter((i) => i.category === c).map((i) => `<li><div>${X(i.text)}</div>${srcBtn(q(i.source_quote))}</li>`).join("")}</ul>`).join("")}</div></article>`);
    R.instructions.filter((i) => i.category === "course").forEach((i) => q(i.source_quote));
    R.allergies.forEach((a) => q(a.source_quote));

    if (R.unclear.length) S.push(`<article class="card res-card"><h3><span class="h-left"><span class="ico" aria-hidden="true">❓</span>${T("unclear")}</span></h3><ul class="items">${R.unclear.map((u) => `<li><div>${X(u.text)}</div>${srcBtn(u.source_quote)}</li>`).join("")}</ul></article>`);

    // ---- words explained
    if (R.glossary.length || R.decoded.length) S.push(`<article class="card res-card" id="sec-gloss">
      <h3><span class="h-left"><span class="ico" aria-hidden="true">📖</span>${T("gloss")}</span></h3>
      <dl class="gloss">${R.glossary.map((g) => `<dt>${esc(g.term)}</dt><dd>${X(g.plain)}</dd>`).join("")}
      ${R.decoded.map((d) => `<dt>${esc(d.word)}</dt><dd>${X(d.guess)} <span class="muted small">(${esc(d.parts)}; ${X("a best guess from the word's parts")})</span></dd>`).join("")}</dl></article>`);

    S.push(`<article class="card res-card" id="sec-q"><h3><span class="h-left"><span class="ico" aria-hidden="true">💬</span>${T("questions")}</span><button type="button" class="listen" id="copyQ">Copy</button></h3>
      <ol class="questions" id="qList">${R.questions.map((x) => `<li>${X(x)}</li>`).join("")}</ol></article>`);

    S.push(`<article class="card res-card ask-card" id="sec-ask"><h3><span class="h-left"><span class="ico" aria-hidden="true">🙋</span>Find something in your document</span></h3>
      <form class="ask-row" id="askForm"><label for="askInput" class="sr-only">Your question</label><input type="text" id="askInput" placeholder="e.g. Can I drive? How much can I lift?" autocomplete="off"><button class="ghost" type="submit">Search</button></form>
      <div id="answer" aria-live="polite"></div></article>`);

    // ---- original document panel
    R.medications.forEach((m) => q(m.source_quote));
    const cov = E.coverage(state.original, quotes);
    const covPct = cov.total ? Math.round((cov.covered / cov.total) * 100) : 100;
    let uid = 0;
    const origHTML = E.splitLines(state.original).map(({ parts }) => `<p class="orig-line">${parts.map((p) => {
      const cls = E.isMetaUnit(p) ? "" : quotes.some((x) => E.quoteMatchesUnit(x, p)) ? "covered" : cov.uncovered.includes(p) ? "uncov" : "";
      return `<span class="u ${cls}" data-u="${uid++}">${esc(p)}</span>`;
    }).join(" ")}</p>`).join("");

    const gBefore = E.fkGrade(E.proseOf(state.original));
    const plainEn = [...R.instructions.map((i) => i.text), ...R.warning_signs.map((w) => w.sign + "."), ...R.appointments.map((a) => a.what + ".")].join(" ");
    const gAfter = E.fkGrade(plainEn);
    $("#results").innerHTML = `
      <div class="res-top"><div>
        <h2 ${L.rtl ? 'dir="rtl"' : ""}>${T("t_" + R.document_type)}</h2>
        <div class="metrics">
          ${gBefore ? `<span class="metric">Reading level: <b>grade ${gBefore}</b>${gAfter && gAfter < gBefore ? ` → <b>grade ${gAfter}</b>` : ""}</span>` : ""}
          <span class="metric">Sentences explained: <b>${covPct}%</b></span>
          <span class="metric">Medicines: <b>${active.length}</b>${stopped.length ? ` (+${stopped.length} to stop)` : ""}</span>
          ${R.redacted ? `<span class="metric">🔒 ${R.redacted} personal detail${R.redacted === 1 ? "" : "s"} hidden</span>` : ""}
          ${R.nlmDone ? `<span class="metric">✓ Checked with RxNorm (NLM)</span>` : ""}
        </div></div>
        <div class="actions">
          <button type="button" class="ghost" data-speak="all" aria-pressed="false">🔊 Read it all to me</button>
          <button type="button" class="ghost" id="printBtn">🖨️ Print</button>
          <button type="button" class="ghost" id="againBtn">↺ New document</button>
        </div></div>
      ${lang() !== "en" ? `<div class="txbar" id="txbar" role="status"></div>` : ""}
      <div class="res-grid">
        <div class="res-main" ${L.rtl ? 'dir="rtl"' : ""} lang="${esc(L.speech)}">${S.join("")}</div>
        <aside class="card orig" aria-label="Your original document"><h3>Your original document</h3>
          <p class="legend">Green = explained${cov.uncovered.length ? ", dashed = not covered" : ""}. Tap a ✓ source button to find the sentence here.</p>
          <div class="orig-text" id="origText">${origHTML}</div>
          ${cov.uncovered.length ? `<p class="small"><strong>${cov.uncovered.length} sentence(s) were not explained.</strong> Read them in the original and ask your care team.</p>` : ""}</aside>
      </div>`;
    wire();
    translatePass();
    if (!keepScroll) $("#results").scrollIntoView({ block: "start" });
  }

  // ================================================================ interactions
  function speak(btn) {
    if (!("speechSynthesis" in window)) return alert("Reading aloud is not supported in this browser.");
    const wasOn = btn.getAttribute("aria-pressed") === "true";
    speechSynthesis.cancel();
    $$("#results [data-speak]").forEach((x) => x.setAttribute("aria-pressed", "false"));
    if (wasOn) return;
    const id = btn.dataset.speak;
    const els = id === "all" ? $$("#results .res-main [data-read]") : $$(`#results [data-read="${id}"]`);
    const text = els.map((el) => { const c = el.cloneNode(true); c.querySelectorAll(".src,.quotes").forEach((x) => x.remove()); return c.innerText; }).join(". ");
    const L = I.lang(state.showEnglish ? "en" : lang());
    const u = new SpeechSynthesisUtterance(text);
    u.lang = L.speech;
    const v = speechSynthesis.getVoices().find((vo) => vo.lang && vo.lang.toLowerCase().startsWith(L.speech.slice(0, 2).toLowerCase()));
    if (v) u.voice = v;
    else if (L.id !== "en") { const tb = $("#txbar"); if (tb) tb.insertAdjacentHTML("beforeend", `<span> · No ${esc(L.name)} voice is installed on this device, so reading aloud may not work.</span>`); }
    u.rate = 0.9;
    u.onend = () => btn.setAttribute("aria-pressed", "false");
    btn.setAttribute("aria-pressed", "true");
    speechSynthesis.speak(u);
  }

  function wire() {
    $$("#results .src").forEach((b) => (b.onclick = () => {
      $$("#origText .u.flash").forEach((u) => u.classList.remove("flash"));
      const hits = $$("#origText .u").filter((u) => E.quoteMatchesUnit(b.dataset.quote, u.textContent));
      hits.forEach((u) => u.classList.add("flash"));
      if (hits[0]) hits[0].scrollIntoView({ block: "center", behavior: "smooth" });
    }));
    $$("#results [data-speak]").forEach((b) => (b.onclick = () => speak(b)));
    $("#printBtn").onclick = () => window.print();
    $("#againBtn").onclick = () => { window.speechSynthesis?.cancel(); $("#results").hidden = true; $("#docText").value = ""; $("#panelDoc").scrollIntoView({ block: "start" }); $("#docText").focus(); };
    const cq = $("#copyQ");
    if (cq) cq.onclick = async () => { try { await navigator.clipboard.writeText($$("#qList li").map((li, i) => `${i + 1}. ${li.innerText}`).join("\n")); cq.textContent = "Copied ✓"; } catch { cq.textContent = "Select and copy"; } };
    $$("#results [data-time]").forEach((inp) => (inp.onchange = () => { state.times[inp.dataset.time] = inp.value; store.set("times", state.times); }));
    const ics = $("#icsBtn");
    if (ics) ics.onclick = () => {
      const { ics: file, events } = X_.buildICS(state.R, full() ? lang() : "en", state.times);
      if (!events) return alert("There are no regular daily medicines or dated appointments to add. Medicines taken only when needed are not added as reminders.");
      X_.download("plainly-reminders.ics", file, "text/calendar");
    };
    const cb = $("#cardBtn");
    if (cb) cb.onclick = printCard;
    $("#askForm").onsubmit = (e) => {
      e.preventDefault();
      const qv = $("#askInput").value.trim();
      if (!qv) return;
      const stop = new Set("what when how why who which is are do does can could should will would i my me the a an to of for and or in on be it this that with about much many".split(" "));
      const qt = E.tokens(qv).filter((t) => !stop.has(t));
      const scored = E.splitUnits(state.original).filter((u) => !E.isMetaUnit(u)).map((u) => {
        const ut = E.tokens(u);
        return { u, s: qt.filter((t) => ut.some((x) => x === t || (x.length > 3 && t.length > 3 && (x.startsWith(t.slice(0, 4)) || t.startsWith(x.slice(0, 4)))))).length };
      }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3);
      const out = $("#answer");
      if (!scored.length) { out.innerHTML = `<div class="answer">${esc("Your document does not seem to mention this. Please ask your nurse, doctor or pharmacist.")}</div>`; return; }
      out.innerHTML = `<div class="answer"><p style="margin:0 0 6px">Your document says:</p><ul style="margin:0;padding-left:1.2em">${scored.map((x) => `<li>${esc(E.plainify(x.u))} <span class="muted small">(“${esc(x.u)}”)</span></li>`).join("")}</ul></div>`;
    };
  }

  /** Printable medicine card: medicine names in English (what pharmacists and ER staff read), instructions in both languages. */
  function printCard() {
    const R = state.R, lg = full() ? lang() : "en", L = I.lang(lg);
    const active = R.medications.filter((m) => m.status !== "stop" && m.status !== "hold");
    const bil = lg !== "en";
    const row = (m) => `<tr><td><strong>${esc(m.display)}</strong><br>${esc(X_.doseText(m, "en"))}</td>${bil ? `<td dir="${L.rtl ? "rtl" : "ltr"}">${esc(X_.whenText(m, lg))}</td>` : ""}<td>${esc(X_.whenText(m, "en"))}</td></tr>`;
    $("#printCard").innerHTML = `<div class="pc">
      <h1>${esc(I.t(lg, "card_title"))}${bil ? " / My medicine card" : ""}</h1>
      <p>${esc(I.t(lg, "card_note"))}${bil ? "<br>" + esc(I.t("en", "card_note")) : ""}</p>
      <p>Updated: ${esc(new Date().toLocaleDateString())} · Name: ______________________ · Date of birth: __________</p>
      ${R.allergies.length ? `<div class="box"><strong>⚠ ${esc(I.t(lg, "allergies"))}${bil ? " / Allergies" : ""}:</strong> ${R.allergies.map((a) => esc(a.name + (a.reaction ? ` (${a.reaction})` : ""))).join(", ")}</div>` : `<div class="box"><strong>${esc(I.t(lg, "allergies"))}${bil ? " / Allergies" : ""}:</strong> ______________________</div>`}
      <table><thead><tr><th>Medicine</th>${bil ? `<th>${esc(L.native)}</th>` : ""}<th>English</th></tr></thead><tbody>${active.map(row).join("")}</tbody></table>
      ${R.medications.some((m) => m.status === "stop") ? `<p><strong>⛔ ${esc(I.t(lg, "st_stop"))}${bil ? " / STOP taking" : ""}:</strong> ${R.medications.filter((m) => m.status === "stop").map((m) => esc(m.display)).join(", ")}</p>` : ""}
      <div class="box">${esc(I.t(lg, "callout"))}${bil ? "<br>" + esc(I.t("en", "callout")) : ""}</div>
      <p style="font-size:9pt">Made with Plainly from the patient's own paperwork. Check with a pharmacist; this card does not replace the prescription label.</p></div>`;
    document.body.classList.add("print-card");
    window.print();
    setTimeout(() => document.body.classList.remove("print-card"), 500);
  }

  // ================================================================ compare lists
  $("#recSample").onclick = () => { $("#recA").value = window.PLAINLY_SAMPLES.reconcileA.text; $("#recB").value = window.PLAINLY_SAMPLES.reconcileB.text; compareLists(); };
  $("#recBtn").onclick = compareLists;
  function compareLists() {
    const a = $("#recA").value.trim(), b = $("#recB").value.trim();
    const out = $("#recOut");
    if (!a || !b) { out.innerHTML = `<p class="msg">Paste both lists first.</p>`; return; }
    const res = window.PlainlyReconcile.compare(a, b);
    const label = { same: "Same", changed: "Different", onlyA: "Only on list 1", onlyB: "Only on list 2", stoppedButHome: "Stopped, but still at home" };
    const issues = res.rows.filter((r) => r.level !== "ok").length;
    out.innerHTML = `<div class="stack"><article class="card"><h3 style="margin-top:0">${issues ? `⚠️ ${issues} difference${issues === 1 ? "" : "s"} to ask about` : "✅ The lists match"}</h3>
      <p class="muted">List 1: ${res.countA} medicines · List 2: ${res.countB} medicines. Brand and generic names are matched (for example Lasix = furosemide).</p>
      <div class="table-scroll"><table class="rec"><thead><tr><th>Medicine</th><th>List 1</th><th>List 2</th><th>What to do</th></tr></thead><tbody>
      ${res.rows.map((r) => `<tr class="${r.level}"><td><strong>${esc((r.a || r.b).display)}</strong><br><span class="tag ${r.level === "danger" ? "danger" : r.level === "caution" ? "caution" : "new"}">${label[r.type]}</span></td><td>${r.a ? esc(r.a.source_quote) : "—"}</td><td>${r.b ? esc(r.b.source_quote) : "—"}</td><td>${esc(r.explain)}</td></tr>`).join("")}
      </tbody></table></div>
      <p class="small muted">Bring both lists and all your pill bottles to your pharmacist or next appointment. Do not stop or start a medicine on your own because of this comparison.</p></article>
      ${res.checks.filter((c) => c.level !== "info" || c.id === "ismp").length ? `<article class="card safety-card"><h3 style="margin-top:0">🛡️ If you took everything on both lists</h3>${res.checks.filter((c) => c.id !== "unknown_drug").map((c) => `<div class="check-item ${c.level}"><h4><span class="tag ${c.level}">${esc(I.t("en", "lv_" + c.level))}</span>${esc(I.t("en", c.titleKey))}</h4><p>${esc(c.detail)}</p></div>`).join("")}</article>` : ""}</div>`;
  }

  // ================================================================ clinicians
  $("#clinSample").onclick = () => { $("#clinText").value = window.PLAINLY_SAMPLES.clinician.text; checkNote(); };
  $("#clinBtn").onclick = checkNote;
  function checkNote() {
    const t = $("#clinText").value.trim();
    const out = $("#clinOut");
    if (!t) { out.innerHTML = `<p class="msg">Paste a note first.</p>`; return; }
    const r = window.PlainlyWriter.review(t);
    const okCount = r.elements.filter((e) => e.ok).length;
    out.innerHTML = `<div class="stack">
      <article class="card"><div style="display:flex;gap:24px;flex-wrap:wrap;align-items:center">
        <div><div class="muted small">Reading level</div><div class="grade-big ${r.grade > 8 ? "bad" : r.grade <= 6 ? "good" : ""}">${r.grade ?? "n/a"}</div><div class="small muted">target: grade 6 or lower</div></div>
        <div><div class="muted small">Jargon / abbreviations</div><div class="grade-big ${r.jargonPct >= 5 ? "bad" : "good"}">${r.jargonPct}%</div><div class="small muted">${r.jargonCount} words · target under 5%</div></div>
        <div><div class="muted small">Safe-discharge elements</div><div class="grade-big ${okCount < 7 ? "bad" : "good"}">${okCount}/${r.elements.length}</div></div>
        <div><div class="muted small">Error-prone abbreviations</div><div class="grade-big ${r.ismp.length ? "bad" : "good"}">${r.ismp.length}</div></div>
        <div><div class="muted small">Medicine safety flags</div><div class="grade-big ${r.checks.some((c) => c.level !== "info" && c.id !== "ismp") ? "bad" : "good"}">${r.checks.filter((c) => c.level !== "info" && c.id !== "ismp").length}</div></div>
      </div></article>
      <article class="card"><h3 style="margin-top:0">Key elements of a safe discharge</h3><ul class="elements">${r.elements.map((e) => `<li><span class="${e.ok ? "yes" : "no"}">${e.ok ? "✓" : "✗"}</span><span>${esc(e.label)}${!e.ok && e.soft ? " <span class='muted small'>(if any)</span>" : ""}</span></li>`).join("")}</ul>
        <p class="small muted">Based on AHRQ's Re-Engineered Discharge (Project RED) toolkit and Joint Commission discharge-communication guidance.</p></article>
      ${r.ismp.length ? `<article class="card"><h3 style="margin-top:0">Error-prone abbreviations (Joint Commission "Do Not Use" / ISMP)</h3><div class="table-scroll"><table class="rec"><thead><tr><th>Found</th><th>Risk</th><th>Write instead</th><th>In</th></tr></thead><tbody>${r.ismp.map((i) => `<tr class="caution"><td><strong>${esc(i.found)}</strong></td><td>${esc(i.risk)}</td><td>${esc(i.use)}</td><td class="small">${esc(i.source_quote)}</td></tr>`).join("")}</tbody></table></div></article>` : ""}
      <article class="card"><h3 style="margin-top:0">How a patient app reads each medicine</h3><p class="small muted">If software can't tell how often to take something, a tired patient may not be able to either.</p><div class="table-scroll"><table class="rec"><thead><tr><th>Line</th><th>Medicine</th><th>Dose</th><th>Route</th><th>When</th><th>Issues</th></tr></thead><tbody>${r.medRows.map((m) => `<tr class="${m.issues.length ? "caution" : "ok"}"><td class="small">${esc(m.line)}</td><td>${esc(m.name)} ${m.status ? `<span class="tag ${m.status}">${esc(m.status)}</span>` : ""}</td><td>${esc(m.dose)}</td><td>${esc(m.route)}</td><td>${esc(m.when)}${m.duration ? `, ${esc(m.duration)}` : ""}</td><td>${m.issues.length ? esc(m.issues.join("; ")) : "✓"}</td></tr>`).join("")}</tbody></table></div></article>
      ${r.checks.filter((c) => c.id !== "ismp").length ? `<article class="card safety-card"><h3 style="margin-top:0">Medicine safety checks</h3>${r.checks.filter((c) => c.id !== "ismp").map((c) => `<div class="check-item ${c.level}"><h4><span class="tag ${c.level}">${esc(I.t("en", "lv_" + c.level))}</span>${esc(I.t("en", c.titleKey))}</h4><p>${esc(c.detail)}</p></div>`).join("")}</article>` : ""}
      ${r.hardest.length ? `<article class="card"><h3 style="margin-top:0">Hardest sentences to read</h3><ul class="items">${r.hardest.map((h) => `<li><div>${esc(h.u)}</div><span class="tag caution">grade ${h.g}</span></li>`).join("")}</ul></article>` : ""}
      ${r.jargon.length ? `<article class="card"><h3 style="margin-top:0">Jargon a patient may not know (${r.jargon.length})</h3><dl class="gloss">${r.jargon.map((j) => `<dt>${esc(j.term)}</dt><dd>${esc(j.plain)}</dd>`).join("")}</dl></article>` : ""}
      <article class="card"><h3 style="margin-top:0;display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">Plain-language draft <span class="small muted">reading level ${r.draftGrade ?? "n/a"}</span></h3>
        <p class="small muted">Generated from the note by rules. Review and edit before giving it to the patient.</p><pre class="draft" id="draftText">${esc(r.draft)}</pre>
        <button type="button" class="ghost" id="copyDraft">Copy draft</button></article></div>`;
    $("#copyDraft").onclick = async (e) => { try { await navigator.clipboard.writeText(r.draft); e.target.textContent = "Copied ✓"; } catch { e.target.textContent = "Select the text to copy"; } };
  }

  // ================================================================ boot
  if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !/[?&]nosw/.test(location.search)) navigator.serviceWorker.register("sw.js").catch(() => {});
  // demo links: ?sample=discharge&lang=es  |  ?tool=reconcile  |  ?tool=clinician
  const p = new URLSearchParams(location.search);
  if (p.get("lang") && I.LANGS.some((L) => L.id === p.get("lang"))) langSel.value = p.get("lang");
  if (p.get("tool") === "reconcile") { selectMode("modeRec"); $("#recSample").click(); }
  if (p.get("tool") === "clinician") { selectMode("modeClin"); $("#clinSample").click(); }
  if (p.get("sample") && window.PLAINLY_SAMPLES[p.get("sample")]) { $("#docText").value = window.PLAINLY_SAMPLES[p.get("sample")].text; if (p.get("lookup") === "0") $("#lookup").checked = false; explain(); }
})();
