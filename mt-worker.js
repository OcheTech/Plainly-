// On-device neural machine translation (Helsinki-NLP OPUS-MT models via Transformers.js, ONNX/WASM).
// Runs in a worker so the page stays responsive. Models download once (~110 MB) and are cached by the browser.
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2";

env.allowLocalModels = false;
let current = { model: null, pipe: null };

self.onmessage = async (e) => {
  const { id, model, prefix, texts } = e.data;
  try {
    if (current.model !== model) {
      current = { model: null, pipe: null };
      current.pipe = await pipeline("translation", model, {
        dtype: "q8",
        progress_callback: (p) => {
          if (p.status === "progress") self.postMessage({ type: "progress", id, file: p.file, loaded: p.loaded, total: p.total });
        },
      });
      current.model = model;
      self.postMessage({ type: "ready", id });
    }
    for (let i = 0; i < texts.length; i++) {
      const out = await current.pipe((prefix || "") + texts[i], { max_new_tokens: 400 });
      self.postMessage({ type: "item", id, index: i, text: out[0].translation_text });
    }
    self.postMessage({ type: "done", id });
  } catch (err) {
    self.postMessage({ type: "error", id, message: String(err && err.message ? err.message : err) });
  }
};
