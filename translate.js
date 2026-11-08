/* Plainly translation layer (free, on-device).
 *  1. Chrome's built-in on-device Translator API, when the browser has it.
 *  2. Otherwise OPUS-MT neural models running in a Web Worker (Transformers.js).
 * Every machine translation passes a NUMBER LOCK: all numbers in the English source must appear
 * unchanged in the translation (after normalizing Arabic-Indic / Devanagari / full-width digits).
 * If any number is missing or altered, the English sentence is shown instead.
 */
(function () {
  "use strict";
  const I = window.PlainlyI18n;
  const PREFIX = { zh: ">>cmn_Hans<< ", ar: ">>ara<< " };
  const WORKER_URL = new URL("mt-worker.js", document.currentScript ? document.currentScript.src : location.href);
  const memo = new Map();
  let worker = null, seq = 0;
  const pending = new Map();
  let browserTranslator = null, browserLang = null;

  const DIGITS = { "٠": 0, "١": 1, "٢": 2, "٣": 3, "٤": 4, "٥": 5, "٦": 6, "٧": 7, "٨": 8, "٩": 9, "۰": 0, "۱": 1, "۲": 2, "۳": 3, "۴": 4, "۵": 5, "۶": 6, "۷": 7, "۸": 8, "۹": 9, "०": 0, "१": 1, "२": 2, "३": 3, "४": 4, "५": 5, "६": 6, "७": 7, "८": 8, "९": 9 };
  // Same normalization on source and translation: native digits -> ASCII, thousands separators removed ("4.000", "4 000", "4,000" -> 4000)
  const normDigits = (s) => String(s).replace(/[٠-٩۰-۹०-९]/g, (d) => DIGITS[d]).replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0)).replace(/٫/g, ".").replace(/\b([1-9]\d{0,2})[.,\s  ](\d{3})(?!\d)/g, "$1$2");
  const numbersIn = (s) => (normDigits(s).match(/\d+(?:\.\d+)?/g) || []).map((n) => n.replace(/\.0+$/, ""));

  /** Number lock: every number in the source must survive translation. */
  function numberLock(src, out) {
    const a = numbersIn(src), b = numbersIn(out);
    const pool = b.slice();
    for (const n of a) {
      const i = pool.indexOf(n);
      if (i < 0) return false;
      pool.splice(i, 1);
    }
    return true;
  }

  /** Medicine-name lock. Latin-script languages must keep every medicine name (accents allowed),
   *  otherwise the English sentence is shown. Other scripts transliterate names, so the English
   *  name is appended in brackets for the patient and pharmacist. */
  const LATIN = new Set(["es", "fr", "vi", "de", "pt"]);
  const fold = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
  function nameLock(src, out, langId) {
    const KB = window.PlainlyKB;
    if (!KB) return { ok: true, text: out };
    const names = [];
    KB.DRUG_RE.lastIndex = 0;
    let m;
    while ((m = KB.DRUG_RE.exec(src))) names.push(m[1]);
    KB.DRUG_RE.lastIndex = 0;
    if (!names.length) return { ok: true, text: out };
    const o = fold(out);
    const missing = names.filter((n) => !o.includes(fold(n).replace(/[^a-z]/g, "").slice(0, 5)));
    if (!missing.length) return { ok: true, text: out };
    if (LATIN.has(langId)) return { ok: false, text: out };
    return { ok: true, text: out + " [" + [...new Set(missing)].join(", ") + "]" };
  }

  async function browserEngine(lang, onProgress) {
    if (!("Translator" in self) || /[?&]mt=local/.test(location.search)) return null;
    try {
      const avail = await self.Translator.availability({ sourceLanguage: "en", targetLanguage: lang });
      if (avail === "unavailable" || avail === "no") return null;
      if (browserLang !== lang) {
        browserTranslator = await self.Translator.create({
          sourceLanguage: "en", targetLanguage: lang,
          monitor(m) { m.addEventListener("downloadprogress", (e) => onProgress && onProgress({ engine: "browser", pct: Math.round((e.loaded || 0) * 100) })); },
        });
        browserLang = lang;
      }
      return browserTranslator;
    } catch { return null; }
  }

  function localTranslate(model, prefix, texts, onItem, onProgress) {
    if (!worker) {
      worker = new Worker(WORKER_URL, { type: "module" });
      worker.onmessage = (e) => {
        const p = pending.get(e.data.id);
        if (!p) return;
        if (e.data.type === "progress") p.onProgress && p.onProgress({ engine: "local", file: e.data.file, loaded: e.data.loaded, total: e.data.total });
        else if (e.data.type === "ready") p.onProgress && p.onProgress({ engine: "local", ready: true });
        else if (e.data.type === "item") p.onItem(e.data.index, e.data.text);
        else if (e.data.type === "done") { pending.delete(e.data.id); p.resolve(); }
        else if (e.data.type === "error") { pending.delete(e.data.id); p.reject(new Error(e.data.message)); }
      };
      worker.onerror = (e) => { pending.forEach((p) => p.reject(new Error(e.message || "Translation worker failed"))); pending.clear(); };
    }
    const id = ++seq;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject, onItem, onProgress });
      worker.postMessage({ id, model, prefix, texts });
    });
  }

  /** Which engine can translate English to this language? */
  async function engineFor(langId) {
    const L = I.lang(langId);
    if (langId === "en") return "none";
    if (await browserEngine(langId)) return "browser";
    if (L.mt) return "local";
    return "unavailable";
  }

  /**
   * Translate many English strings. Calls onItem(index, {text, ok, engine}) as results arrive.
   * Results that fail the number lock come back with ok=false and the English text.
   */
  async function translateMany(langId, texts, onItem, onProgress) {
    const L = I.lang(langId);
    const todo = [];
    texts.forEach((t, i) => {
      const k = langId + "|" + t;
      if (!t || !/[A-Za-z]/.test(t)) onItem(i, { text: t, ok: true, engine: "none" });
      else if (memo.has(k)) onItem(i, memo.get(k));
      else todo.push(i);
    });
    if (!todo.length) return "cache";
    const finish = (i, out, engine) => {
      const src = texts[i];
      const lock = nameLock(src, out, langId);
      const ok = numberLock(src, out) && out.trim().length > 0 && lock.ok;
      const r = { text: ok ? lock.text : src, ok, engine, failed: !ok };
      memo.set(langId + "|" + src, r);
      onItem(i, r);
    };
    const bt = await browserEngine(langId, onProgress);
    if (bt) {
      for (const i of todo) {
        try { finish(i, await bt.translate(texts[i]), "browser"); } catch { onItem(i, { text: texts[i], ok: false, engine: "browser", failed: true }); }
      }
      return "browser";
    }
    if (!L.mt) throw new Error("No free on-device translator is available for this language in this browser.");
    await localTranslate(L.mt, PREFIX[langId] || "", todo.map((i) => texts[i]), (k, out) => finish(todo[k], out, "local"), onProgress);
    return "local";
  }

  window.PlainlyTranslate = { translateMany, engineFor, numberLock, nameLock, normDigits };
})();
