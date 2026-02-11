/* X Translate Content Script — Minimal UI Edition */

const CONFIG = {
  TARGET_LANG: 'zh-CN',
  ENABLED: true,
  SKIP_NATIVE: true,
};

const CONSTANTS = {
  PROCESSED_ATTR: 'data-x-translate-processed',
  INJECTED_CLASS: 'x-translate-minimal',
  STYLE_ID: 'x-translate-minimal-style',
};

const state = {
  pending: new Set(),
  scanTimer: null,
  styleInjected: false,
};

chrome.storage.local.get(
  { enabled: true, targetLang: 'zh-CN', skipNative: true },
  (data) => {
    CONFIG.ENABLED = !!data.enabled;
    CONFIG.TARGET_LANG = data.targetLang || 'zh-CN';
    CONFIG.SKIP_NATIVE = !!data.skipNative;
    if (CONFIG.ENABLED) scheduleScan();
  }
);

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'TOGGLE_TRANSLATE') {
    CONFIG.ENABLED = !!msg.enabled;
    if (CONFIG.ENABLED) scheduleScan();
    return;
  }

  if (msg?.type === 'CHANGE_LANG') {
    CONFIG.TARGET_LANG = msg.targetLang || CONFIG.TARGET_LANG;
    document.querySelectorAll(`.${CONSTANTS.INJECTED_CLASS}`).forEach((el) => el.remove());
    document.querySelectorAll(`[${CONSTANTS.PROCESSED_ATTR}]`).forEach((el) => el.removeAttribute(CONSTANTS.PROCESSED_ATTR));
    if (CONFIG.ENABLED) scheduleScan();
    return;
  }

  if (msg?.type === 'CHANGE_SKIP_NATIVE') {
    CONFIG.SKIP_NATIVE = !!msg.skipNative;
  }
});

function isTweetTextNode(node) {
  return node?.getAttribute?.('data-testid') === 'tweetText';
}

function extractPureText(node) {
  const clone = node.cloneNode(true);
  clone.querySelectorAll(`.${CONSTANTS.INJECTED_CLASS}`).forEach((el) => el.remove());
  return (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
}

function looksTargetLang(text) {
  const lang = CONFIG.TARGET_LANG;
  if (lang.startsWith('zh')) return /[\u4e00-\u9fff]/.test(text);
  if (lang === 'ja') return /[\u3040-\u30ff\u4e00-\u9fff]/.test(text);
  if (lang === 'ko') return /[\uac00-\ud7af]/.test(text);
  if (lang === 'ar') return /[\u0600-\u06ff]/.test(text);
  if (lang === 'ru') return /[\u0400-\u04ff]/.test(text);
  if (['en', 'fr', 'de', 'es'].includes(lang)) return /^[\x20-\x7e\s]+$/.test(text);
  return false;
}

function injectStyles() {
  if (state.styleInjected || document.getElementById(CONSTANTS.STYLE_ID)) {
    state.styleInjected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = CONSTANTS.STYLE_ID;
  style.textContent = `
    .${CONSTANTS.INJECTED_CLASS} {
      margin-top: 8px;
      padding: 8px 10px;
      border-left: 2px solid rgba(29,155,240,.7);
      background: rgba(255,255,255,.04);
      border-radius: 0 8px 8px 0;
      color: rgb(113,118,123);
      font-size: 14px;
      line-height: 1.45;
      word-break: break-word;
    }
    .xt-minimal-header {
      font-size: 11px;
      color: rgba(29,155,240,.9);
      margin-bottom: 4px;
      letter-spacing: .04em;
    }
    .xt-minimal-body {
      color: rgb(231,233,234);
    }
    @media (prefers-color-scheme: light) {
      .${CONSTANTS.INJECTED_CLASS} {
        color: rgb(83,100,113);
        background: rgba(15,20,25,.03);
      }
      .xt-minimal-body { color: rgb(15,20,25); }
    }
  `;
  document.head.appendChild(style);
  state.styleInjected = true;
}

function createTranslationNode(text) {
  const wrap = document.createElement('div');
  wrap.className = CONSTANTS.INJECTED_CLASS;

  const header = document.createElement('div');
  header.className = 'xt-minimal-header';
  header.textContent = `译文 · ${CONFIG.TARGET_LANG}`;

  const body = document.createElement('div');
  body.className = 'xt-minimal-body';
  body.textContent = text;

  wrap.appendChild(header);
  wrap.appendChild(body);
  return wrap;
}

function injectTranslation(container, translatedText) {
  if (!translatedText) return;
  if (container.querySelector(`.${CONSTANTS.INJECTED_CLASS}`)) return;
  injectStyles();
  container.appendChild(createTranslationNode(translatedText));
}

function requestTranslate(text, callback) {
  chrome.runtime.sendMessage(
    { type: 'TRANSLATE', text, targetLang: CONFIG.TARGET_LANG },
    (res) => {
      if (chrome.runtime.lastError || !res?.ok) return callback(null);
      callback(res.text);
    }
  );
}

function processTweetText(node) {
  if (!CONFIG.ENABLED || !isTweetTextNode(node)) return;
  if (node.hasAttribute(CONSTANTS.PROCESSED_ATTR)) return;

  const text = extractPureText(node);
  if (!text) return;
  if (CONFIG.SKIP_NATIVE && looksTargetLang(text)) return;

  const key = `${CONFIG.TARGET_LANG}:${text}`;
  if (state.pending.has(key)) return;

  state.pending.add(key);
  node.setAttribute(CONSTANTS.PROCESSED_ATTR, '1');

  requestTranslate(text, (translated) => {
    state.pending.delete(key);
    if (translated) injectTranslation(node, translated);
  });
}

function scan() {
  document.querySelectorAll('[data-testid="tweetText"]').forEach(processTweetText);
}

function scheduleScan() {
  clearTimeout(state.scanTimer);
  state.scanTimer = setTimeout(scan, 120);
}

const observer = new MutationObserver((mutations) => {
  if (!CONFIG.ENABLED) return;
  let touched = false;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      if (isTweetTextNode(node)) {
        processTweetText(node);
        touched = true;
      }

      const nested = node.querySelectorAll?.('[data-testid="tweetText"]');
      if (nested?.length) {
        nested.forEach(processTweetText);
        touched = true;
      }
    }
  }

  if (touched) scheduleScan();
});

observer.observe(document.documentElement, { childList: true, subtree: true });
scheduleScan();
