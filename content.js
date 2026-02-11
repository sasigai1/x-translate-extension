/* ═════════════════════════════════════════════════════════════════════════════
   X Translate Content Script — Premium Glass UI Edition
   ═════════════════════════════════════════════════════════════════════════════ */

const CONFIG = {
  TARGET_LANG: 'zh-CN',
  ENABLED: true,
  SKIP_NATIVE: true,
};

const CONSTANTS = {
  PROCESSED_ATTR: 'data-x-translate-processed',
  INJECTED_CLASS: 'x-translate-premium',
  STYLE_ID: 'x-translate-premium-style',
};

const state = {
  pending: new Set(),
  scanTimer: null,
  styleInjected: false,
};

// ═════════════════════════════════════════════════════════════════════════════
// Storage & Message Handling
// ═════════════════════════════════════════════════════════════════════════════

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
    // Clear all existing translations
    document.querySelectorAll(`.${CONSTANTS.INJECTED_CLASS}`).forEach((el) => el.remove());
    document.querySelectorAll(`[${CONSTANTS.PROCESSED_ATTR}]`).forEach((el) => el.removeAttribute(CONSTANTS.PROCESSED_ATTR));
    if (CONFIG.ENABLED) scheduleScan();
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═════════════════════════════════════════════════════════════════════════════

function isTweetTextNode(node) {
  return node?.getAttribute?.('data-testid') === 'tweetText';
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

// ═════════════════════════════════════════════════════════════════════════════
// Premium Glass UI Styles
// ═════════════════════════════════════════════════════════════════════════════

function injectPremiumStyles() {
  if (state.styleInjected || document.getElementById(CONSTANTS.STYLE_ID)) {
    state.styleInjected = true;
    return;
  }

  const style = document.createElement('style');
  style.id = CONSTANTS.STYLE_ID;
  style.textContent = `
    /* ═══════════════════════════════════════════════════════════════════════
       X Translate 11.0 — Liquid Glass UI
       ═══════════════════════════════════════════════════════════════════════ */

    .${CONSTANTS.INJECTED_CLASS} {
      position: relative;
      margin: 16px 0 10px 0;
      padding: 16px 18px;
      border-radius: 20px;
      overflow: hidden;

      /* Liquid glass multi-layer background */
      background:
        radial-gradient(ellipse 150% 80% at 10% -20%, rgba(120, 200, 255, 0.25), transparent 50%),
        radial-gradient(ellipse 100% 120% at 90% 110%, rgba(80, 180, 255, 0.2), transparent 45%),
        radial-gradient(ellipse 80% 60% at 50% 50%, rgba(100, 200, 240, 0.08), transparent 60%),
        linear-gradient(165deg,
          rgba(255, 255, 255, 0.12) 0%,
          rgba(200, 230, 255, 0.08) 25%,
          rgba(180, 220, 255, 0.05) 50%,
          rgba(160, 210, 255, 0.08) 75%,
          rgba(255, 255, 255, 0.1) 100%
        );

      /* Liquid glass border with refraction effect */
      border: 1px solid rgba(255, 255, 255, 0.25);

      /* Multi-layer liquid shadow */
      box-shadow:
        0 0 0 1px rgba(120, 200, 255, 0.15),
        0 4px 16px rgba(0, 50, 100, 0.12),
        0 8px 32px rgba(0, 80, 150, 0.08),
        0 16px 48px rgba(0, 60, 120, 0.06),
        inset 0 1px 1px rgba(255, 255, 255, 0.4),
        inset 0 -1px 1px rgba(0, 50, 100, 0.05);

      /* Strong glass blur */
      backdrop-filter: blur(24px) saturate(200%) brightness(1.05);
      -webkit-backdrop-filter: blur(24px) saturate(200%) brightness(1.05);

      /* Liquid entrance animation */
      animation: xt-liquid-enter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
      transform-origin: top center;

      /* Typography */
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, "PingFang SC", sans-serif;
    }

    @keyframes xt-liquid-enter {
      0% {
        opacity: 0;
        transform: translateY(-12px) scale(0.95);
        filter: blur(8px);
      }
      60% {
        opacity: 1;
        transform: translateY(2px) scale(1.01);
        filter: blur(0);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0);
      }
    }

    /* Liquid shimmer effect on top */
    .${CONSTANTS.INJECTED_CLASS}::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 50%;
      background: linear-gradient(180deg,
        rgba(255, 255, 255, 0.3) 0%,
        rgba(255, 255, 255, 0.1) 30%,
        transparent 100%
      );
      border-radius: 20px 20px 0 0;
      pointer-events: none;
    }

    /* Animated liquid accent line */
    .${CONSTANTS.INJECTED_CLASS}::after {
      content: '';
      position: absolute;
      top: 0;
      left: 20px;
      right: 20px;
      height: 2px;
      background: linear-gradient(90deg,
        transparent 0%,
        rgba(100, 200, 255, 0.9) 20%,
        rgba(150, 220, 255, 1) 50%,
        rgba(100, 200, 255, 0.9) 80%,
        transparent 100%
      );
      border-radius: 2px;
      box-shadow:
        0 0 12px rgba(100, 200, 255, 0.6),
        0 0 24px rgba(100, 200, 255, 0.3);
      animation: xt-liquid-shimmer 3s ease-in-out infinite;
    }

    @keyframes xt-liquid-shimmer {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }

    /* Header section */
    .xt-premium-header {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    }

    .xt-premium-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .xt-premium-icon {
      width: 18px;
      height: 18px;
      background: linear-gradient(135deg,
        rgba(100, 200, 255, 0.9) 0%,
        rgba(150, 220, 255, 1) 50%,
        rgba(100, 180, 255, 0.9) 100%
      );
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: rgba(0, 50, 100, 0.9);
      font-weight: 800;
      box-shadow:
        0 2px 8px rgba(100, 200, 255, 0.4),
        inset 0 1px 1px rgba(255, 255, 255, 0.5);
    }

    .xt-premium-title {
      font-size: 12px;
      font-weight: 700;
      color: rgba(100, 200, 255, 1);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      text-shadow: 0 1px 2px rgba(0, 50, 100, 0.2);
    }

    .xt-premium-badge {
      font-size: 10px;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(100, 200, 255, 0.15);
      border: 1px solid rgba(100, 200, 255, 0.3);
      color: rgba(100, 200, 255, 1);
      font-weight: 600;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    /* Translation text */
    .xt-premium-content {
      position: relative;
      color: rgba(240, 248, 255, 0.95);
      font-size: 15px;
      line-height: 1.7;
      font-weight: 400;
      letter-spacing: 0.02em;
      word-break: break-word;
      white-space: pre-wrap;
      text-wrap: pretty;
      text-shadow: 0 1px 2px rgba(0, 30, 60, 0.15);
    }

    /* Hover liquid effect */
    .${CONSTANTS.INJECTED_CLASS}:hover {
      border-color: rgba(255, 255, 255, 0.35);
      box-shadow:
        0 0 0 1px rgba(120, 200, 255, 0.25),
        0 6px 20px rgba(0, 50, 100, 0.15),
        0 12px 40px rgba(0, 80, 150, 0.1),
        0 20px 60px rgba(0, 60, 120, 0.08),
        inset 0 1px 1px rgba(255, 255, 255, 0.5),
        inset 0 -1px 1px rgba(0, 50, 100, 0.08);
      transform: translateY(-2px);
      transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .${CONSTANTS.INJECTED_CLASS}:hover::after {
      box-shadow:
        0 0 16px rgba(100, 200, 255, 0.8),
        0 0 32px rgba(100, 200, 255, 0.4);
    }

    /* Light mode - liquid glass adaptation */
    @media (prefers-color-scheme: light) {
      .${CONSTANTS.INJECTED_CLASS} {
        background:
          radial-gradient(ellipse 150% 80% at 10% -20%, rgba(100, 180, 255, 0.2), transparent 50%),
          radial-gradient(ellipse 100% 120% at 90% 110%, rgba(80, 160, 255, 0.15), transparent 45%),
          radial-gradient(ellipse 80% 60% at 50% 50%, rgba(100, 180, 240, 0.06), transparent 60%),
          linear-gradient(165deg,
            rgba(255, 255, 255, 0.85) 0%,
            rgba(240, 248, 255, 0.8) 25%,
            rgba(230, 245, 255, 0.75) 50%,
            rgba(240, 248, 255, 0.8) 75%,
            rgba(255, 255, 255, 0.85) 100%
          );
        border-color: rgba(100, 180, 255, 0.35);
        box-shadow:
          0 0 0 1px rgba(100, 180, 255, 0.2),
          0 4px 16px rgba(100, 150, 200, 0.12),
          0 8px 32px rgba(100, 150, 200, 0.08),
          inset 0 1px 1px rgba(255, 255, 255, 0.8);
      }

      .${CONSTANTS.INJECTED_CLASS}::before {
        background: linear-gradient(180deg,
          rgba(255, 255, 255, 0.6) 0%,
          rgba(255, 255, 255, 0.2) 30%,
          transparent 100%
        );
      }

      .${CONSTANTS.INJECTED_CLASS}::after {
        background: linear-gradient(90deg,
          transparent 0%,
          rgba(60, 150, 255, 0.8) 20%,
          rgba(80, 170, 255, 1) 50%,
          rgba(60, 150, 255, 0.8) 80%,
          transparent 100%
        );
        box-shadow:
          0 0 10px rgba(60, 150, 255, 0.5),
          0 0 20px rgba(60, 150, 255, 0.25);
      }

      .xt-premium-title {
        color: rgba(30, 100, 180, 1);
        text-shadow: none;
      }

      .xt-premium-badge {
        background: rgba(60, 150, 255, 0.12);
        border-color: rgba(60, 150, 255, 0.3);
        color: rgba(30, 100, 180, 1);
      }

      .xt-premium-icon {
        background: linear-gradient(135deg,
          rgba(60, 150, 255, 0.9) 0%,
          rgba(80, 170, 255, 1) 50%,
          rgba(60, 150, 255, 0.9) 100%
        );
        color: rgba(255, 255, 255, 0.95);
      }

      .xt-premium-content {
        color: rgba(20, 40, 60, 0.9);
        text-shadow: none;
      }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
      .${CONSTANTS.INJECTED_CLASS} {
        border-width: 2px;
        border-color: rgba(100, 200, 255, 0.8);
      }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .${CONSTANTS.INJECTED_CLASS} {
        animation: none;
      }
      .${CONSTANTS.INJECTED_CLASS}::after {
        animation: none;
      }
    }
  `;

  document.head.appendChild(style);
  state.styleInjected = true;
}

// ═════════════════════════════════════════════════════════════════════════════
// Translation Injection
// ═════════════════════════════════════════════════════════════════════════════

function createPremiumTranslationCard(translatedText) {
  const wrapper = document.createElement('div');
  wrapper.className = CONSTANTS.INJECTED_CLASS;

  // Header
  const header = document.createElement('div');
  header.className = 'xt-premium-header';

  const brand = document.createElement('div');
  brand.className = 'xt-premium-brand';

  const icon = document.createElement('div');
  icon.className = 'xt-premium-icon';
  icon.textContent = 'T';

  const title = document.createElement('span');
  title.className = 'xt-premium-title';
  title.textContent = '译文';

  brand.appendChild(icon);
  brand.appendChild(title);

  const badge = document.createElement('span');
  badge.className = 'xt-premium-badge';
  badge.textContent = CONFIG.TARGET_LANG;

  header.appendChild(brand);
  header.appendChild(badge);

  // Content
  const content = document.createElement('div');
  content.className = 'xt-premium-content';
  content.textContent = translatedText;

  wrapper.appendChild(header);
  wrapper.appendChild(content);

  return wrapper;
}

function injectTranslation(container, translatedText) {
  if (!translatedText || container.querySelector(`.${CONSTANTS.INJECTED_CLASS}`)) {
    return;
  }

  injectPremiumStyles();
  const card = createPremiumTranslationCard(translatedText);
  container.appendChild(card);
  
  console.log('[X Translate Premium] Translation card injected:', translatedText.slice(0, 50) + '...');
}

// ═════════════════════════════════════════════════════════════════════════════
// Translation Request
// ═════════════════════════════════════════════════════════════════════════════

function requestTranslate(text, callback) {
  chrome.runtime.sendMessage(
    { type: 'TRANSLATE', text, targetLang: CONFIG.TARGET_LANG },
    (res) => {
      if (chrome.runtime.lastError || !res?.ok) {
        callback(null);
        return;
      }
      callback(res.text);
    }
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Tweet Processing
// ═════════════════════════════════════════════════════════════════════════════

function processTweetText(node) {
  if (!CONFIG.ENABLED || !isTweetTextNode(node)) return;
  if (node.hasAttribute(CONSTANTS.PROCESSED_ATTR)) return;

  const text = node.innerText?.trim();
  if (!text) return;
  if (CONFIG.SKIP_NATIVE && looksTargetLang(text)) return;

  const key = `${CONFIG.TARGET_LANG}:${text}`;
  if (state.pending.has(key)) return;

  state.pending.add(key);
  node.setAttribute(CONSTANTS.PROCESSED_ATTR, '1');

  requestTranslate(text, (translated) => {
    state.pending.delete(key);
    if (translated) {
      injectTranslation(node, translated);
    }
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Scanning & Observation
// ═════════════════════════════════════════════════════════════════════════════

function scan() {
  document.querySelectorAll('[data-testid="tweetText"]').forEach(processTweetText);
}

function scheduleScan() {
  clearTimeout(state.scanTimer);
  state.scanTimer = setTimeout(scan, 100);
}

const observer = new MutationObserver((mutations) => {
  if (!CONFIG.ENABLED) return;

  let shouldScan = false;

  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;

      if (isTweetTextNode(node)) {
        processTweetText(node);
        shouldScan = true;
      }

      const tweetTexts = node.querySelectorAll?.('[data-testid="tweetText"]');
      if (tweetTexts?.length) {
        tweetTexts.forEach(processTweetText);
        shouldScan = true;
      }
    }
  }

  if (shouldScan) scheduleScan();
});

// Start observing
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

// Initial scan
scheduleScan();

// Debug: Add visible indicator
setTimeout(() => {
  console.log('[X Translate Premium] Content script initialized');
  console.log('[X Translate Premium] Looking for tweets with data-testid="tweetText"');
  const tweets = document.querySelectorAll('[data-testid="tweetText"]');
  console.log(`[X Translate Premium] Found ${tweets.length} tweets on page`);
}, 1000);
