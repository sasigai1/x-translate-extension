/* X Translate background service worker */

const CACHE = new Map();

const DEFAULT_STATE = {
  stats: { translated: 0, cached: 0 },
  activeApiId: "google_gtx",
  apiHealth: {},
  customApis: [],
  discoveredFreeApis: [],
  managedProviderConfigs: {},
  managedOnlyMode: false,
  lastDiscoveryAt: 0,
};

let stats = DEFAULT_STATE.stats;
let activeApiId = DEFAULT_STATE.activeApiId;
let apiHealth = DEFAULT_STATE.apiHealth;
let customApis = DEFAULT_STATE.customApis;
let discoveredFreeApis = DEFAULT_STATE.discoveredFreeApis;
let managedProviderConfigs = DEFAULT_STATE.managedProviderConfigs;
let managedOnlyMode = DEFAULT_STATE.managedOnlyMode;
let lastDiscoveryAt = DEFAULT_STATE.lastDiscoveryAt;

const BUILTIN_ENGINES = [
  { id: "google_gtx", name: "Google GTX", kind: "builtin", mode: "google_array", endpoint: "https://translate.googleapis.com/translate_a/single", client: "gtx" },
  { id: "google_ios", name: "Google iOS", kind: "builtin", mode: "google_array", endpoint: "https://translate.googleapis.com/translate_a/single", client: "at" },
  { id: "google_webapp", name: "Google WebApp", kind: "builtin", mode: "google_array", endpoint: "https://translate.googleapis.com/translate_a/single", client: "webapp" },
  { id: "google_dict", name: "Google Dict", kind: "builtin", mode: "google_dict", endpoint: "https://clients5.google.com/translate_a/t" },
  { id: "mymemory", name: "MyMemory", kind: "builtin", mode: "mymemory", endpoint: "https://api.mymemory.translated.net/get" },
  { id: "lingva", name: "Lingva", kind: "builtin", mode: "lingva", endpoint: "https://lingva.ml/api/v1" },
  { id: "libretranslate_de", name: "LibreTranslate DE", kind: "builtin", mode: "libretranslate", endpoint: "https://libretranslate.de/translate" },
  { id: "libretranslate_com", name: "LibreTranslate COM", kind: "builtin", mode: "libretranslate", endpoint: "https://libretranslate.com/translate" },
  { id: "libretranslate_vern", name: "LibreTranslate Vern", kind: "builtin", mode: "libretranslate", endpoint: "https://lt.vern.cc/translate" },
  { id: "argos", name: "Argos Translate", kind: "builtin", mode: "libretranslate", endpoint: "https://translate.argosopentech.com/translate" },
  { id: "terraprint", name: "Terraprint", kind: "builtin", mode: "libretranslate", endpoint: "https://translate.terraprint.co/translate" },
];

const MANAGED_PROVIDER_PRESETS = [
  {
    id: "openai",
    name: "OpenAI GPT",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.openai.com",
    endpoint: "https://api.openai.com/v1/chat/completions",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  {
    id: "deepseek",
    name: "DeepSeek 官方",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.deepseek.com",
    endpoint: "https://api.deepseek.com/chat/completions",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "zhipu_glm",
    name: "智谱 GLM",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://open.bigmodel.cn",
    endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    defaultModel: "glm-4-flash",
    models: ["glm-4-flash", "glm-4-plus", "glm-4-air", "glm-4-long", "glm-4"],
  },
  {
    id: "qwen_official",
    name: "通义千问 官方",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://dashscope.aliyuncs.com",
    endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    defaultModel: "qwen-turbo",
    models: ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-long"],
  },
  {
    id: "moonshot_kimi",
    name: "Kimi 官方",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.moonshot.cn",
    endpoint: "https://api.moonshot.cn/v1/chat/completions",
    defaultModel: "moonshot-v1-8k",
    models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
  },
  {
    id: "baichuan",
    name: "百川 官方",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.baichuan-ai.com",
    endpoint: "https://api.baichuan-ai.com/v1/chat/completions",
    defaultModel: "Baichuan4",
    models: ["Baichuan4", "Baichuan3-Turbo", "Baichuan3-Turbo-128k"],
  },
  {
    id: "minimax",
    name: "MiniMax 官方",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.minimax.chat",
    endpoint: "https://api.minimax.chat/v1/text/chatcompletion_v2",
    defaultModel: "abab6.5s-chat",
    models: ["abab6.5s-chat", "abab6.5g-chat", "abab5.5-chat"],
  },
  {
    id: "claude_anthropic",
    name: "Claude 官方",
    kind: "managed",
    mode: "anthropic_claude",
    origin: "https://api.anthropic.com",
    endpoint: "https://api.anthropic.com/v1/messages",
    defaultModel: "claude-3-haiku-20240307",
    models: ["claude-3-haiku-20240307", "claude-3-sonnet-20240229", "claude-3-opus-20240229", "claude-3-5-sonnet-20241022"],
  },
  {
    id: "gemini_google",
    name: "Google Gemini",
    kind: "managed",
    mode: "gemini",
    origin: "https://generativelanguage.googleapis.com",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
    defaultModel: "gemini-1.5-flash",
    models: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"],
  },
  {
    id: "groq",
    name: "Groq 官方",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.groq.com",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
  },
  {
    id: "mistral",
    name: "Mistral 官方",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.mistral.ai",
    endpoint: "https://api.mistral.ai/v1/chat/completions",
    defaultModel: "mistral-small-latest",
    models: ["mistral-small-latest", "mistral-large-latest", "open-mixtral-8x22b"],
  },
  {
    id: "together",
    name: "Together 官方",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.together.xyz",
    endpoint: "https://api.together.xyz/v1/chat/completions",
    defaultModel: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
    models: [
      "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      "Qwen/Qwen2.5-72B-Instruct-Turbo",
      "mistralai/Mixtral-8x7B-Instruct-v0.1",
    ],
  },
  {
    id: "fireworks",
    name: "Fireworks 官方",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.fireworks.ai",
    endpoint: "https://api.fireworks.ai/inference/v1/chat/completions",
    defaultModel: "accounts/fireworks/models/llama-v3p1-70b-instruct",
    models: [
      "accounts/fireworks/models/llama-v3p1-70b-instruct",
      "accounts/fireworks/models/mixtral-8x7b-instruct",
      "accounts/fireworks/models/qwen2p5-72b-instruct",
    ],
  },
  {
    id: "perplexity",
    name: "Perplexity 官方",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.perplexity.ai",
    endpoint: "https://api.perplexity.ai/chat/completions",
    defaultModel: "sonar",
    models: ["sonar", "sonar-pro", "sonar-reasoning", "llama-3.1-sonar-large-128k-online"],
  },
  {
    id: "xai",
    name: "xAI 官方",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.x.ai",
    endpoint: "https://api.x.ai/v1/chat/completions",
    defaultModel: "grok-2-latest",
    models: ["grok-2-latest", "grok-2-mini-latest", "grok-beta"],
  },
  {
    id: "deepinfra",
    name: "DeepInfra 官方",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.deepinfra.com",
    endpoint: "https://api.deepinfra.com/v1/openai/chat/completions",
    defaultModel: "meta-llama/Meta-Llama-3.1-70B-Instruct",
    models: [
      "meta-llama/Meta-Llama-3.1-70B-Instruct",
      "Qwen/Qwen2.5-72B-Instruct",
      "mistralai/Mixtral-8x7B-Instruct-v0.1",
    ],
  },
  {
    id: "microsoft_translator",
    name: "微软翻译",
    kind: "managed",
    mode: "microsoft_translate",
    origin: "https://api.cognitive.microsofttranslator.com",
    endpoint: "https://api.cognitive.microsofttranslator.com/translate",
    defaultModel: "",
    models: [],
  },
  {
    id: "minimaxcn",
    name: "MiniMaxCN",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.minimaxi.com",
    endpoint: "https://api.minimaxi.com/v1/chat/completions",
    defaultModel: "MiniMax-M2.1-lightning",
    models: ["MiniMax-M2.1-lightning", "MiniMax-M2.1", "MiniMax-M2", "abab6.5s-chat"],
  },
  {
    id: "minimax_codingplan",
    name: "MiniMax CodingPlan",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.minimaxi.com",
    endpoint: "https://api.minimaxi.com/v1/chat/completions",
    defaultModel: "MiniMax-M2.1",
    models: ["MiniMax-M2.1", "MiniMax-M2"],
  },
  {
    id: "siliconflow",
    name: "硅基流动",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.siliconflow.cn",
    endpoint: "https://api.siliconflow.cn/v1/chat/completions",
    defaultModel: "deepseek-ai/DeepSeek-V3",
    models: ["deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct", "THUDM/glm-4-9b-chat", "01-ai/Yi-1.5-34B-Chat"],
  },
  {
    id: "cohere",
    name: "Cohere 官方",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.cohere.ai",
    endpoint: "https://api.cohere.ai/v1/chat",
    defaultModel: "command-r-plus",
    models: ["command-r-plus", "command-r", "command-light"],
  },
  {
    id: "cerebras",
    name: "Cerebras 官方",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.cerebras.ai",
    endpoint: "https://api.cerebras.ai/v1/chat/completions",
    defaultModel: "llama3.1-70b",
    models: ["llama3.1-70b", "llama3.1-8b"],
  },
  {
    id: "sambanova",
    name: "SambaNova 官方",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.sambanova.ai",
    endpoint: "https://api.sambanova.ai/v1/chat/completions",
    defaultModel: "Meta-Llama-3.1-405B-Instruct",
    models: ["Meta-Llama-3.1-405B-Instruct", "Meta-Llama-3.1-70B-Instruct", "Meta-Llama-3.1-8B-Instruct"],
  },
  {
    id: "novita",
    name: "Novita AI",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.novita.ai",
    endpoint: "https://api.novita.ai/v3/openai/chat/completions",
    defaultModel: "meta-llama/llama-3.1-70b-instruct",
    models: ["meta-llama/llama-3.1-70b-instruct", "meta-llama/llama-3.1-8b-instruct", "mistralai/mistral-7b-instruct"],
  },
  {
    id: "hyperbolic",
    name: "Hyperbolic 官方",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.hyperbolic.xyz",
    endpoint: "https://api.hyperbolic.xyz/v1/chat/completions",
    defaultModel: "meta-llama/Meta-Llama-3.1-70B-Instruct",
    models: ["meta-llama/Meta-Llama-3.1-70B-Instruct", "meta-llama/Meta-Llama-3.1-405B-Instruct", "Qwen/Qwen2.5-72B-Instruct"],
  },
  {
    id: "lepton",
    name: "Lepton AI",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.lepton.ai",
    endpoint: "https://api.lepton.ai/v1/chat/completions",
    defaultModel: "llama3-70b",
    models: ["llama3-70b", "mixtral-8x7b", "qwen2-72b"],
  },
  {
    id: "yi_official",
    name: "零一万物 官方",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.lingyiwanwu.com",
    endpoint: "https://api.lingyiwanwu.com/v1/chat/completions",
    defaultModel: "yi-lightning",
    models: ["yi-lightning", "yi-large", "yi-medium", "yi-spark"],
  },
  {
    id: "stepfun",
    name: "阶跃星辰 官方",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.stepfun.com",
    endpoint: "https://api.stepfun.com/v1/chat/completions",
    defaultModel: "step-1-flash",
    models: ["step-1-flash", "step-1-8k", "step-1-32k", "step-2-16k"],
  },
  {
    id: "hunyuan",
    name: "腾讯混元",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://api.hunyuan.cloud.tencent.com",
    endpoint: "https://api.hunyuan.cloud.tencent.com/v1/chat/completions",
    defaultModel: "hunyuan-lite",
    models: ["hunyuan-lite", "hunyuan-standard", "hunyuan-pro"],
  },
  {
    id: "doubao",
    name: "字节豆包",
    kind: "managed",
    mode: "openai_chat",
    origin: "https://ark.cn-beijing.volces.com",
    endpoint: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    defaultModel: "doubao-pro-32k",
    models: ["doubao-pro-32k", "doubao-pro-128k", "doubao-lite-32k"],
  },
];

const FREE_API_DISCOVERY_CANDIDATES = [
  { id: "discover_libre_de", name: "LibreTranslate DE", kind: "discovered", mode: "libretranslate", endpoint: "https://libretranslate.de/translate" },
  { id: "discover_libre_com", name: "LibreTranslate COM", kind: "discovered", mode: "libretranslate", endpoint: "https://libretranslate.com/translate" },
  { id: "discover_libre_vern", name: "LibreTranslate Vern", kind: "discovered", mode: "libretranslate", endpoint: "https://lt.vern.cc/translate" },
  { id: "discover_astian", name: "Apertium Astian", kind: "discovered", mode: "libretranslate", endpoint: "https://translate.astian.org/translate" },
  { id: "discover_fedilab", name: "Fedilab Translate", kind: "discovered", mode: "libretranslate", endpoint: "https://translate.fedilab.app/translate" },
  { id: "discover_argos", name: "Argos OpenTech", kind: "discovered", mode: "libretranslate", endpoint: "https://translate.argosopentech.com/translate" },
  { id: "discover_terraprint", name: "Terraprint", kind: "discovered", mode: "libretranslate", endpoint: "https://translate.terraprint.co/translate" },
  { id: "discover_lingva_alt", name: "Lingva Mirror", kind: "discovered", mode: "lingva", endpoint: "https://lingva.ml/api/v1" },
];

function normalizeHeaders(headers) {
  if (!headers || typeof headers !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(headers)) out[String(k)] = String(v);
  return out;
}

function template(str, vars) {
  return String(str || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (vars[key] == null ? "" : String(vars[key])));
}

function readByPath(obj, path) {
  if (!path) return null;
  return path.split(".").reduce((acc, key) => {
    if (acc == null) return null;
    if (/^\d+$/.test(key)) return acc[Number(key)];
    return acc[key];
  }, obj);
}

function maskKey(key) {
  const v = String(key || "");
  if (!v) return "";
  if (v.length <= 8) return "*".repeat(v.length);
  return `${v.slice(0, 4)}***${v.slice(-4)}`;
}

function sanitizeTranslationOutput(raw) {
  let text = String(raw || "").trim();
  if (!text) return "";
  text = text.replace(/\[Pasted Content\]/gi, "").trim();
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  text = text.replace(/^(以下是翻译[:：]\s*|翻译[:：]\s*|译文[:：]\s*)/i, "").trim();
  text = text.replace(/^```[\w-]*\s*/i, "").replace(/\s*```$/i, "").trim();
  return text;
}

function buildTranslatePrompt(text, targetLang) {
  const langNames = { "zh-CN": "简体中文", "zh-TW": "繁體中文", en: "English", ja: "日本語", ko: "한국어", fr: "Français", de: "Deutsch", es: "Español", ru: "Русский", ar: "العربية" };
  const langName = langNames[targetLang] || targetLang;
  return `你是专业翻译引擎。请将文本翻译成${langName}，要求：\n1) 保持原文语气\n2) 表达自然\n3) 仅返回译文\n\n原文：\n${text}`;
}

function getManagedPreset(id) {
  return MANAGED_PROVIDER_PRESETS.find((x) => x.id === id);
}

function isManagedConfigured(preset) {
  return !!String(managedProviderConfigs[preset.id]?.apiKey || "").trim();
}

function getManagedEngines() {
  return MANAGED_PROVIDER_PRESETS.filter(isManagedConfigured).map((preset) => ({ id: preset.id, name: preset.name, kind: "managed", mode: preset.mode, preset, config: managedProviderConfigs[preset.id] }));
}

function getCustomEngines() {
  return customApis.map((cfg) => ({ id: cfg.id, name: cfg.name, kind: "custom", mode: "custom_template", config: cfg }));
}

function getDiscoveredEngines() {
  return discoveredFreeApis.map((cfg) => ({ ...cfg, kind: "discovered" }));
}

function getAllEngines() {
  return [...BUILTIN_ENGINES, ...getManagedEngines(), ...getDiscoveredEngines(), ...getCustomEngines()];
}

function getEngine(id) {
  return getAllEngines().find((e) => e.id === id);
}

function ensureApiHealth(id) {
  if (!apiHealth[id]) apiHealth[id] = { status: "unknown", lastCheck: 0, failCount: 0, latency: null };
}

function markSuccess(id, latency) {
  ensureApiHealth(id);
  apiHealth[id].status = "ok";
  apiHealth[id].lastCheck = Date.now();
  apiHealth[id].failCount = 0;
  apiHealth[id].latency = latency;
}

function markFail(id) {
  ensureApiHealth(id);
  apiHealth[id].failCount += 1;
  apiHealth[id].lastCheck = Date.now();
  apiHealth[id].latency = null;
  apiHealth[id].status = apiHealth[id].failCount >= 2 ? "down" : "unknown";
}

function persistState() {
  chrome.storage.local.set({ stats, activeApiId, apiHealth, customApis, discoveredFreeApis, managedProviderConfigs, managedOnlyMode, lastDiscoveryAt });
}

async function fetchJson(url, init = {}, timeout = 12000) {
  const resp = await fetch(url, { ...init, signal: AbortSignal.timeout(timeout) });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${body.slice(0, 120)}`);
  }
  return resp.json();
}

async function callGoogleArray(endpoint, client, text, targetLang) {
  const t0 = Date.now();
  const data = await fetchJson(`${endpoint}?client=${encodeURIComponent(client)}&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`);
  const translated = sanitizeTranslationOutput(Array.isArray(data?.[0]) ? data[0].map((seg) => seg?.[0] || "").join("") : "");
  if (!translated) throw new Error("Empty result");
  return { translated, latency: Date.now() - t0 };
}

async function callGoogleDict(endpoint, text, targetLang) {
  const t0 = Date.now();
  const data = await fetchJson(`${endpoint}?client=dict-chrome-ex&sl=auto&tl=${encodeURIComponent(targetLang)}&q=${encodeURIComponent(text)}`);
  let translated = "";
  if (Array.isArray(data) && Array.isArray(data[0])) translated = data[0].map((seg) => seg?.[0] || "").join("");
  if (!translated && data?.sentences) translated = data.sentences.map((s) => s?.trans || "").join("");
  translated = sanitizeTranslationOutput(translated);
  if (!translated) throw new Error("Empty result");
  return { translated, latency: Date.now() - t0 };
}

async function callMyMemory(endpoint, text, targetLang) {
  const t0 = Date.now();
  const data = await fetchJson(`${endpoint}?q=${encodeURIComponent(text)}&langpair=auto|${encodeURIComponent(targetLang)}`);
  const translated = sanitizeTranslationOutput(data?.responseData?.translatedText || "");
  if (!translated) throw new Error("Empty result");
  return { translated, latency: Date.now() - t0 };
}

async function callLingva(endpoint, text, targetLang) {
  const t0 = Date.now();
  const data = await fetchJson(`${endpoint}/auto/${encodeURIComponent(targetLang)}/${encodeURIComponent(text)}`);
  const translated = sanitizeTranslationOutput(data?.translation || "");
  if (!translated) throw new Error("Empty result");
  return { translated, latency: Date.now() - t0 };
}

async function callLibreTranslate(endpoint, text, targetLang) {
  const t0 = Date.now();
  const data = await fetchJson(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: text, source: "auto", target: targetLang, format: "text" }) });
  const translated = sanitizeTranslationOutput(data?.translatedText || data?.translation || "");
  if (!translated) throw new Error("Empty result");
  return { translated, latency: Date.now() - t0 };
}

async function callManaged(engine, text, targetLang) {
  const preset = engine.preset;
  const cfg = engine.config || {};
  const apiKey = String(cfg.apiKey || "").trim();
  const model = String(cfg.model || preset.defaultModel || "");
  if (!apiKey) throw new Error("Managed API key missing");
  const t0 = Date.now();

  if (preset.mode === "openai_chat") {
    const data = await fetchJson(preset.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: "system", content: "Return translation only." },
          { role: "user", content: buildTranslatePrompt(text, targetLang) },
        ],
      }),
    }, 20000);

    let translated = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || data?.output_text || "";
    if (Array.isArray(translated)) translated = translated.map((x) => (typeof x === "string" ? x : x?.text || "")).join("\n");
    translated = sanitizeTranslationOutput(translated);

    if (preset.id === "minimax_codingplan" && model.toLowerCase().includes("lightning") && /(尚未纳入 coding plan|请使用 minimax m2\.1|please use minimax m2\.1)/i.test(translated)) {
      managedProviderConfigs[preset.id] = { ...(managedProviderConfigs[preset.id] || {}), model: "MiniMax-M2.1" };
      persistState();
      return callManaged({ ...engine, config: managedProviderConfigs[preset.id] }, text, targetLang);
    }

    if (!translated) throw new Error("Managed parse failed");
    return { translated, latency: Date.now() - t0 };
  }

  if (preset.mode === "anthropic_claude") {
    const data = await fetchJson(preset.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 2048, messages: [{ role: "user", content: buildTranslatePrompt(text, targetLang) }] }),
    }, 20000);
    const translated = sanitizeTranslationOutput(Array.isArray(data?.content) ? data.content.filter((b) => b?.type === "text").map((b) => b?.text || "").join("\n") : "");
    if (!translated) throw new Error("Managed parse failed");
    return { translated, latency: Date.now() - t0 };
  }

  if (preset.mode === "gemini") {
    const url = `${preset.endpoint}/${model}:generateContent?key=${apiKey}`;
    const data = await fetchJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: buildTranslatePrompt(text, targetLang) }] }] }),
    }, 20000);
    const translated = sanitizeTranslationOutput(data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || "").join("\n") || "");
    if (!translated) throw new Error("Managed parse failed");
    return { translated, latency: Date.now() - t0 };
  }

  if (preset.mode === "microsoft_translate") {
    const region = String(cfg.region || "").trim();
    const headers = { "Content-Type": "application/json", "Ocp-Apim-Subscription-Key": apiKey, "X-ClientTraceId": crypto.randomUUID() };
    if (region) headers["Ocp-Apim-Subscription-Region"] = region;
    const data = await fetchJson(`${preset.endpoint}?api-version=3.0&from=auto&to=${encodeURIComponent(targetLang)}`, {
      method: "POST",
      headers,
      body: JSON.stringify([{ Text: text }]),
    }, 20000);
    const translated = sanitizeTranslationOutput(data?.[0]?.translations?.[0]?.text || "");
    if (!translated) throw new Error("Managed parse failed");
    return { translated, latency: Date.now() - t0 };
  }

  throw new Error("Unknown managed mode");
}

async function callTemplateEngine(config, text, targetLang) {
  const vars = {
    text,
    encodedText: encodeURIComponent(text),
    targetLang,
    encodedTargetLang: encodeURIComponent(targetLang),
    sourceLang: "auto",
    encodedSourceLang: "auto",
  };

  const method = String(config.method || "GET").toUpperCase();
  const url = template(config.url || config.endpoint, vars);
  const headers = normalizeHeaders(config.headers);
  const bodyTemplate = template(config.bodyTemplate || "", vars);
  const init = { method, headers };

  if (method !== "GET" && method !== "HEAD") {
    init.body = bodyTemplate || null;
    if (init.body && !Object.keys(headers).some((k) => k.toLowerCase() === "content-type")) {
      init.headers["Content-Type"] = "application/json";
    }
  }

  const t0 = Date.now();
  const resp = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${body.slice(0, 120)}`);
  }

  const contentType = (resp.headers.get("content-type") || "").toLowerCase();
  const raw = contentType.includes("application/json") ? await resp.json() : await resp.text();
  let translated = "";
  if (typeof raw === "string") translated = raw;
  else if (config.responsePath) translated = readByPath(raw, config.responsePath) || "";
  else translated = raw?.translatedText || raw?.translation || raw?.text || "";

  translated = sanitizeTranslationOutput(translated);
  if (!translated) throw new Error("Template parse failed");
  return { translated, latency: Date.now() - t0 };
}

async function callEngine(engine, text, targetLang) {
  if (engine.kind === "managed") return callManaged(engine, text, targetLang);
  if (engine.kind === "custom") return callTemplateEngine(engine.config, text, targetLang);

  if (engine.kind === "discovered") {
    if (engine.mode === "libretranslate") return callLibreTranslate(engine.endpoint, text, targetLang);
    if (engine.mode === "lingva") return callLingva(engine.endpoint, text, targetLang);
  }

  if (engine.mode === "google_array") return callGoogleArray(engine.endpoint, engine.client, text, targetLang);
  if (engine.mode === "google_dict") return callGoogleDict(engine.endpoint, text, targetLang);
  if (engine.mode === "mymemory") return callMyMemory(engine.endpoint, text, targetLang);
  if (engine.mode === "lingva") return callLingva(engine.endpoint, text, targetLang);

  throw new Error("Unknown engine mode");
}

function getCandidateEngines() {
  const all = getAllEngines();
  if (!managedOnlyMode) return all;
  return all.filter((e) => e.kind === "managed");
}

async function translateWithFailover(text, targetLang) {
  const candidates = getCandidateEngines();
  if (!candidates.length) throw new Error(managedOnlyMode ? "仅托管模式下没有可用托管 API" : "没有可用翻译引擎");

  if (!candidates.find((e) => e.id === activeApiId)) activeApiId = candidates[0].id;

  const orderedIds = [
    activeApiId,
    ...candidates
      .map((e) => e.id)
      .filter((id) => id !== activeApiId)
      .sort((a, b) => (apiHealth[a]?.failCount || 0) - (apiHealth[b]?.failCount || 0)),
  ];

  let lastErr = null;
  for (const id of orderedIds) {
    ensureApiHealth(id);
    if (apiHealth[id].status === "down" && Date.now() - apiHealth[id].lastCheck < 60000) continue;

    const engine = getEngine(id);
    if (!engine) continue;

    try {
      const { translated, latency } = await callEngine(engine, text, targetLang);
      markSuccess(id, latency);
      if (activeApiId !== id && apiHealth[activeApiId]?.status === "down") activeApiId = id;
      persistState();
      return translated;
    } catch (err) {
      markFail(id);
      lastErr = err;
      persistState();
    }
  }

  throw lastErr || new Error("All APIs failed");
}

async function probeAllApis() {
  const text = "hello";
  const targetLang = "zh-CN";
  const engines = getAllEngines();
  const results = {};

  await Promise.allSettled(
    engines.map(async (engine) => {
      try {
        const { translated, latency } = await callEngine(engine, text, targetLang);
        markSuccess(engine.id, latency);
        results[engine.id] = { ok: true, sample: translated, latency };
      } catch (err) {
        apiHealth[engine.id] = { status: "down", lastCheck: Date.now(), failCount: 99, latency: null };
        results[engine.id] = { ok: false, error: String(err) };
      }
    })
  );

  const best = engines.filter((e) => apiHealth[e.id]?.status === "ok").sort((a, b) => (apiHealth[a.id].latency || Infinity) - (apiHealth[b.id].latency || Infinity))[0];
  if (best) activeApiId = best.id;

  persistState();
  return { results, activeApiId };
}

async function discoverFreeApis() {
  const found = [];
  await Promise.allSettled(
    FREE_API_DISCOVERY_CANDIDATES.map(async (candidate) => {
      try {
        if (candidate.mode === "libretranslate") await callLibreTranslate(candidate.endpoint, "hello world", "zh-CN");
        if (candidate.mode === "lingva") await callLingva(candidate.endpoint, "hello world", "zh-CN");
        found.push(candidate);
      } catch (_) {
        // ignore failed candidate
      }
    })
  );

  const map = new Map();
  for (const old of discoveredFreeApis) map.set(old.id, old);
  for (const item of found) map.set(item.id, item);

  discoveredFreeApis = [...map.values()];
  lastDiscoveryAt = Date.now();
  for (const item of discoveredFreeApis) ensureApiHealth(item.id);
  persistState();

  return { foundCount: found.length, totalCount: discoveredFreeApis.length, discoveredFreeApis };
}

function validateCustomApi(input) {
  const name = String(input?.name || "").trim();
  const url = String(input?.url || "").trim();
  const method = String(input?.method || "GET").toUpperCase();
  const responsePath = String(input?.responsePath || "translatedText").trim();

  if (!name) throw new Error("API name is required");
  if (!url || !/^https?:\/\//i.test(url)) throw new Error("API URL must start with http:// or https://");
  if (!["GET", "POST", "PUT", "PATCH"].includes(method)) throw new Error("Unsupported method");

  return {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    url,
    method,
    headers: normalizeHeaders(input?.headers),
    bodyTemplate: String(input?.bodyTemplate || ""),
    responsePath,
  };
}

function getApiStatusPayload() {
  const engines = getAllEngines().map((e) => ({
    id: e.id,
    name: e.name,
    kind: e.kind,
    ...(apiHealth[e.id] || { status: "unknown", lastCheck: 0, failCount: 0, latency: null }),
  }));
  return { ok: true, engines, activeApiId, managedOnlyMode, lastDiscoveryAt, discoveredCount: discoveredFreeApis.length };
}

chrome.storage.local.get(DEFAULT_STATE, (data) => {
  stats = data.stats || DEFAULT_STATE.stats;
  activeApiId = data.activeApiId || DEFAULT_STATE.activeApiId;
  apiHealth = data.apiHealth && typeof data.apiHealth === "object" ? data.apiHealth : {};
  customApis = Array.isArray(data.customApis) ? data.customApis : [];
  discoveredFreeApis = Array.isArray(data.discoveredFreeApis) ? data.discoveredFreeApis : [];
  managedProviderConfigs = data.managedProviderConfigs && typeof data.managedProviderConfigs === "object" ? data.managedProviderConfigs : {};
  managedOnlyMode = !!data.managedOnlyMode;
  lastDiscoveryAt = Number(data.lastDiscoveryAt || 0);

  for (const engine of getAllEngines()) ensureApiHealth(engine.id);
  if (!getEngine(activeApiId)) activeApiId = getAllEngines()[0]?.id || DEFAULT_STATE.activeApiId;
  persistState();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "CLEAR_CACHE") {
    CACHE.clear();
    stats.cached = 0;
    chrome.storage.local.set({ stats });
    sendResponse({ ok: true });
    return true;
  }

  if (msg?.type === "GET_API_STATUS") {
    sendResponse(getApiStatusPayload());
    return true;
  }

  if (msg?.type === "REFRESH_APIS") {
    probeAllApis().then((result) => sendResponse({ ok: true, ...result })).catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (msg?.type === "AUTO_OPTIMIZE_ROUTE") {
    probeAllApis()
      .then((result) => sendResponse({ ok: true, message: "已自动切换到当前最快可用引擎", ...result }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (msg?.type === "AUTO_DISCOVER_FREE_APIS") {
    discoverFreeApis().then((result) => sendResponse({ ok: true, ...result })).catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (msg?.type === "SWITCH_API") {
    const engine = getEngine(String(msg.apiId || ""));
    if (!engine) {
      sendResponse({ ok: false, error: "Unknown engine" });
      return true;
    }
    activeApiId = engine.id;
    persistState();
    sendResponse({ ok: true, activeApiId });
    return true;
  }

  if (msg?.type === "SET_MANAGED_ONLY_MODE") {
    managedOnlyMode = !!msg.enabled;
    persistState();
    sendResponse({ ok: true, managedOnlyMode });
    return true;
  }

  if (msg?.type === "GET_MANAGED_PROVIDERS") {
    const providers = MANAGED_PROVIDER_PRESETS.map((preset) => {
      const cfg = managedProviderConfigs[preset.id] || {};
      return {
        id: preset.id,
        name: preset.name,
        origin: preset.origin,
        defaultModel: preset.defaultModel,
        models: preset.models || [],
        selectedModel: String(cfg.model || preset.defaultModel || ""),
        needsRegion: preset.mode === "microsoft_translate",
        configured: !!String(cfg.apiKey || "").trim(),
        keyMasked: maskKey(cfg.apiKey || ""),
        region: String(cfg.region || ""),
      };
    });
    sendResponse({ ok: true, providers, managedOnlyMode });
    return true;
  }

  if (msg?.type === "SAVE_MANAGED_PROVIDER") {
    const providerId = String(msg.providerId || "");
    const preset = getManagedPreset(providerId);
    if (!preset) {
      sendResponse({ ok: false, error: "Unknown managed provider" });
      return true;
    }

    let apiKey = String(msg.apiKey || "").trim();
    if (apiKey === "__KEEP__") apiKey = String(managedProviderConfigs[providerId]?.apiKey || "").trim();
    if (!apiKey) {
      sendResponse({ ok: false, error: "API Key 不能为空" });
      return true;
    }

    const requestedModel = String(msg.model || "").trim();
    const model = (preset.models || []).includes(requestedModel) ? requestedModel : String(preset.defaultModel || "");

    managedProviderConfigs[providerId] = { apiKey, model, region: String(msg.region || "").trim() };
    ensureApiHealth(providerId);
    activeApiId = providerId;
    persistState();
    sendResponse({ ok: true, activeApiId });
    return true;
  }

  if (msg?.type === "DELETE_MANAGED_PROVIDER") {
    const providerId = String(msg.providerId || "");
    delete managedProviderConfigs[providerId];
    delete apiHealth[providerId];
    if (activeApiId === providerId) activeApiId = getAllEngines()[0]?.id || DEFAULT_STATE.activeApiId;
    persistState();
    sendResponse({ ok: true, activeApiId });
    return true;
  }

  if (msg?.type === "ADD_CUSTOM_API") {
    try {
      const custom = validateCustomApi(msg.api || {});
      customApis.push(custom);
      ensureApiHealth(custom.id);
      activeApiId = custom.id;
      persistState();
      sendResponse({ ok: true, api: custom, activeApiId });
    } catch (err) {
      sendResponse({ ok: false, error: String(err.message || err) });
    }
    return true;
  }

  if (msg?.type === "DELETE_CUSTOM_API") {
    const id = String(msg.apiId || "");
    const before = customApis.length;
    customApis = customApis.filter((x) => x.id !== id);
    if (customApis.length === before) {
      sendResponse({ ok: false, error: "Custom API not found" });
      return true;
    }
    delete apiHealth[id];
    if (activeApiId === id) activeApiId = getAllEngines()[0]?.id || DEFAULT_STATE.activeApiId;
    persistState();
    sendResponse({ ok: true, activeApiId });
    return true;
  }

  if (msg?.type === "TRANSLATE") {
    const text = String(msg.text || "").trim();
    const targetLang = String(msg.targetLang || "zh-CN").trim();
    const key = `${targetLang}:${text}`;
    if (!text) {
      sendResponse({ ok: false, error: "Empty text" });
      return true;
    }
    if (CACHE.has(key)) {
      sendResponse({ ok: true, text: CACHE.get(key) });
      return true;
    }

    translateWithFailover(text, targetLang)
      .then((translated) => {
        CACHE.set(key, translated);
        stats.translated += 1;
        stats.cached = CACHE.size;
        chrome.storage.local.set({ stats });
        sendResponse({ ok: true, text: translated });
      })
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
});
