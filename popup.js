const enableToggle = document.getElementById("enableToggle");
const statusText = document.getElementById("statusText");
const translatedEl = document.getElementById("translatedCount");
const cachedEl = document.getElementById("cachedCount");
const targetLangSel = document.getElementById("targetLang");
const skipNativeChk = document.getElementById("skipNative");
const managedOnlyToggle = document.getElementById("managedOnlyToggle");
const clearCacheBtn = document.getElementById("clearCache");
const refreshApisBtn = document.getElementById("refreshApis");
const discoverFreeBtn = document.getElementById("discoverFreeBtn");
const optimizeRouteBtn = document.getElementById("optimizeRouteBtn");
const apiListEl = document.getElementById("apiList");
const managedProviderListEl = document.getElementById("managedProviderList");
const discoveryHintEl = document.getElementById("discoveryHint");

const customNameEl = document.getElementById("customName");
const customMethodEl = document.getElementById("customMethod");
const customUrlEl = document.getElementById("customUrl");
const customHeadersEl = document.getElementById("customHeaders");
const customBodyEl = document.getElementById("customBody");
const customResponsePathEl = document.getElementById("customResponsePath");
const saveCustomApiBtn = document.getElementById("saveCustomApi");

function notifyTabs(message) {
  chrome.tabs.query({ url: ["https://x.com/*", "https://twitter.com/*"] }, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, message, () => {
        void chrome.runtime.lastError;
      });
    });
  });
}

function setStatus(enabled) {
  statusText.textContent = enabled ? "运行中" : "已暂停";
}

function parseHeaderJson(value) {
  const text = String(value || "").trim();
  if (!text) return {};
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("请求头必须是 JSON 对象");
  }
  return parsed;
}

function getOriginPattern(urlStr) {
  const url = new URL(urlStr);
  return `${url.origin}/*`;
}

function requestOriginPermission(urlOrOrigin, callback) {
  let pattern = "";
  try {
    pattern = getOriginPattern(urlOrOrigin);
  } catch (_) {
    callback(false, "URL 格式不正确");
    return;
  }

  chrome.permissions.contains({ origins: [pattern] }, (has) => {
    if (has) {
      callback(true);
      return;
    }

    chrome.permissions.request({ origins: [pattern] }, (granted) => {
      if (!granted) {
        callback(false, `未授权域名权限: ${pattern}`);
        return;
      }
      callback(true);
    });
  });
}

function renderApiList(engines, activeApiId) {
  apiListEl.innerHTML = "";
  engines.forEach((engine) => {
    const item = document.createElement("div");
    item.className = `api-item${engine.id === activeApiId ? " active" : ""}`;

    const main = document.createElement("div");
    main.className = "api-main";
    const dot = document.createElement("span");
    dot.className = `dot ${engine.status || "unknown"}`;
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = engine.name;
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = engine.kind === "managed" ? "托管" : engine.kind === "custom" ? "自定义" : engine.kind === "discovered" ? "发现" : "内置";
    main.appendChild(dot);
    main.appendChild(name);
    main.appendChild(tag);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.gap = "6px";
    right.style.alignItems = "center";
    const latency = document.createElement("span");
    latency.className = "hint";
    latency.textContent = engine.latency ? `${engine.latency}ms` : "--";
    right.appendChild(latency);

    if (engine.kind === "custom") {
      const del = document.createElement("button");
      del.className = "btn btn-danger";
      del.textContent = "删";
      del.style.padding = "3px 8px";
      del.addEventListener("click", (ev) => {
        ev.stopPropagation();
        chrome.runtime.sendMessage({ type: "DELETE_CUSTOM_API", apiId: engine.id }, (res) => {
          if (!res?.ok) {
            alert(`删除失败: ${res?.error || "未知错误"}`);
            return;
          }
          loadApiStatus();
        });
      });
      right.appendChild(del);
    }

    item.appendChild(main);
    item.appendChild(right);
    item.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "SWITCH_API", apiId: engine.id }, (res) => {
        if (!res?.ok) {
          alert(`切换失败: ${res?.error || "未知错误"}`);
          return;
        }
        loadApiStatus();
      });
    });

    apiListEl.appendChild(item);
  });
}

function loadApiStatus() {
  chrome.runtime.sendMessage({ type: "GET_API_STATUS" }, (res) => {
    if (!res?.ok) return;
    renderApiList(res.engines || [], res.activeApiId);
    const dateText = res.lastDiscoveryAt ? new Date(res.lastDiscoveryAt).toLocaleTimeString() : "未执行";
    discoveryHintEl.textContent = `已发现免费 API: ${res.discoveredCount || 0} · 最近扫描: ${dateText}`;
    if (typeof res.managedOnlyMode === "boolean") managedOnlyToggle.checked = res.managedOnlyMode;
  });
}

function renderManagedProviders(providers) {
  managedProviderListEl.innerHTML = "";
  providers.forEach((provider) => {
    const wrap = document.createElement("div");
    wrap.className = "provider";

    const title = document.createElement("div");
    title.className = "provider-title";
    const nameWrap = document.createElement("div");
    const n = document.createElement("div");
    n.className = "provider-name";
    n.textContent = provider.name;
    const s = document.createElement("div");
    s.className = "hint";
    s.textContent = provider.selectedModel ? `模型: ${provider.selectedModel}` : "无模型";
    nameWrap.appendChild(n);
    nameWrap.appendChild(s);

    const state = document.createElement("div");
    state.className = "hint";
    state.textContent = provider.configured ? `已配置 ${provider.keyMasked}` : "未配置";

    title.appendChild(nameWrap);
    title.appendChild(state);
    wrap.appendChild(title);

    let modelSelect = null;
    if (provider.models && provider.models.length > 0) {
      modelSelect = document.createElement("select");
      modelSelect.style.width = "100%";
      modelSelect.style.marginBottom = "6px";
      provider.models.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = m;
        if (m === provider.selectedModel) opt.selected = true;
        modelSelect.appendChild(opt);
      });
      wrap.appendChild(modelSelect);
    }

    const keyInput = document.createElement("input");
    keyInput.type = "password";
    keyInput.placeholder = "输入 API Key（留空可只更新模型）";
    keyInput.style.width = "100%";
    keyInput.style.marginBottom = "6px";
    wrap.appendChild(keyInput);

    const regionInput = document.createElement("input");
    regionInput.placeholder = "微软区域（可选，如 eastasia）";
    regionInput.style.width = "100%";
    regionInput.style.marginBottom = "6px";
    regionInput.value = provider.region || "";
    if (!provider.needsRegion) regionInput.classList.add("hidden");
    wrap.appendChild(regionInput);

    const actions = document.createElement("div");
    actions.className = "actions";
    const saveBtn = document.createElement("button");
    saveBtn.className = "btn btn-primary";
    saveBtn.textContent = "保存";
    const clearBtn = document.createElement("button");
    clearBtn.className = "btn btn-danger";
    clearBtn.textContent = "清除";
    actions.appendChild(saveBtn);
    actions.appendChild(clearBtn);
    wrap.appendChild(actions);

    saveBtn.addEventListener("click", () => {
      const apiKey = keyInput.value.trim();
      if (!apiKey && !provider.configured) {
        alert("请先输入 API Key");
        return;
      }
      const selectedModel = modelSelect ? modelSelect.value : provider.defaultModel;

      requestOriginPermission(provider.origin, (granted, errMsg) => {
        if (!granted) {
          alert(errMsg || "未获取域名权限");
          return;
        }

        chrome.runtime.sendMessage(
          {
            type: "SAVE_MANAGED_PROVIDER",
            providerId: provider.id,
            apiKey: apiKey || "__KEEP__",
            model: selectedModel,
            region: provider.needsRegion ? regionInput.value.trim() : "",
          },
          (res) => {
            if (!res?.ok) {
              alert(`保存失败: ${res?.error || "未知错误"}`);
              return;
            }
            keyInput.value = "";
            loadManagedProviders();
            loadApiStatus();
          }
        );
      });
    });

    clearBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "DELETE_MANAGED_PROVIDER", providerId: provider.id }, (res) => {
        if (!res?.ok) {
          alert(`清除失败: ${res?.error || "未知错误"}`);
          return;
        }
        loadManagedProviders();
        loadApiStatus();
      });
    });

    managedProviderListEl.appendChild(wrap);
  });
}

function loadManagedProviders() {
  chrome.runtime.sendMessage({ type: "GET_MANAGED_PROVIDERS" }, (res) => {
    if (!res?.ok) return;
    renderManagedProviders(res.providers || []);
    if (typeof res.managedOnlyMode === "boolean") managedOnlyToggle.checked = res.managedOnlyMode;
  });
}

chrome.storage.local.get(
  {
    enabled: true,
    targetLang: "zh-CN",
    skipNative: true,
    managedOnlyMode: false,
    stats: { translated: 0, cached: 0 },
  },
  (data) => {
    enableToggle.checked = !!data.enabled;
    targetLangSel.value = data.targetLang;
    skipNativeChk.checked = !!data.skipNative;
    managedOnlyToggle.checked = !!data.managedOnlyMode;
    translatedEl.textContent = String(data.stats.translated || 0);
    cachedEl.textContent = String(data.stats.cached || 0);
    setStatus(!!data.enabled);
  }
);

loadManagedProviders();
loadApiStatus();

enableToggle.addEventListener("change", () => {
  const enabled = !!enableToggle.checked;
  chrome.storage.local.set({ enabled });
  setStatus(enabled);
  notifyTabs({ type: "TOGGLE_TRANSLATE", enabled });
});

targetLangSel.addEventListener("change", () => {
  const targetLang = targetLangSel.value;
  chrome.storage.local.set({ targetLang });
  notifyTabs({ type: "CHANGE_LANG", targetLang });
});

skipNativeChk.addEventListener("change", () => {
  chrome.storage.local.set({ skipNative: !!skipNativeChk.checked });
});

managedOnlyToggle.addEventListener("change", () => {
  const enabled = !!managedOnlyToggle.checked;
  chrome.storage.local.set({ managedOnlyMode: enabled });
  chrome.runtime.sendMessage({ type: "SET_MANAGED_ONLY_MODE", enabled }, (res) => {
    if (!res?.ok) {
      alert(`设置失败: ${res?.error || "未知错误"}`);
      return;
    }
    loadApiStatus();
  });
});

clearCacheBtn.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CLEAR_CACHE" }, (res) => {
    if (!res?.ok) return;
    cachedEl.textContent = "0";
    clearCacheBtn.textContent = "已清空";
    setTimeout(() => {
      clearCacheBtn.textContent = "清空缓存";
    }, 1200);
  });
});

refreshApisBtn.addEventListener("click", () => {
  refreshApisBtn.disabled = true;
  refreshApisBtn.textContent = "检测中...";
  chrome.runtime.sendMessage({ type: "REFRESH_APIS" }, (res) => {
    refreshApisBtn.disabled = false;
    refreshApisBtn.textContent = "刷新健康度";
    if (!res?.ok) {
      alert(`刷新失败: ${res?.error || "未知错误"}`);
      return;
    }
    loadApiStatus();
  });
});

discoverFreeBtn.addEventListener("click", () => {
  discoverFreeBtn.disabled = true;
  discoverFreeBtn.textContent = "扫描中...";
  chrome.runtime.sendMessage({ type: "AUTO_DISCOVER_FREE_APIS" }, (res) => {
    discoverFreeBtn.disabled = false;
    discoverFreeBtn.textContent = "自动搜索免费 API";
    if (!res?.ok) {
      alert(`自动搜索失败: ${res?.error || "未知错误"}`);
      return;
    }
    loadApiStatus();
    alert(`已发现 ${res.foundCount} 个可用免费 API（累计 ${res.totalCount}）`);
  });
});

optimizeRouteBtn.addEventListener("click", () => {
  optimizeRouteBtn.disabled = true;
  optimizeRouteBtn.textContent = "优化中...";
  chrome.runtime.sendMessage({ type: "AUTO_OPTIMIZE_ROUTE" }, (res) => {
    optimizeRouteBtn.disabled = false;
    optimizeRouteBtn.textContent = "自动优化路由";
    if (!res?.ok) {
      alert(`自动优化失败: ${res?.error || "未知错误"}`);
      return;
    }
    loadApiStatus();
    alert(res.message || "已完成优化");
  });
});

saveCustomApiBtn.addEventListener("click", () => {
  const name = customNameEl.value.trim();
  const method = customMethodEl.value;
  const url = customUrlEl.value.trim();
  const bodyTemplate = customBodyEl.value;
  const responsePath = customResponsePathEl.value.trim() || "translatedText";

  if (!name || !url) {
    alert("请填写 API 名称和 URL");
    return;
  }

  let headers;
  try {
    headers = parseHeaderJson(customHeadersEl.value);
  } catch (err) {
    alert(`请求头格式错误: ${err.message}`);
    return;
  }

  requestOriginPermission(url, (granted, errMsg) => {
    if (!granted) {
      alert(errMsg || "未获取到域名权限");
      return;
    }

    chrome.runtime.sendMessage({ type: "ADD_CUSTOM_API", api: { name, method, url, headers, bodyTemplate, responsePath } }, (res) => {
      if (!res?.ok) {
        alert(`保存失败: ${res?.error || "未知错误"}`);
        return;
      }
      customNameEl.value = "";
      customUrlEl.value = "";
      customHeadersEl.value = "";
      customBodyEl.value = "";
      customResponsePathEl.value = "translatedText";
      loadApiStatus();
      alert("已保存并切换到自定义 API");
    });
  });
});

setInterval(() => {
  chrome.storage.local.get({ stats: { translated: 0, cached: 0 } }, (data) => {
    translatedEl.textContent = String(data.stats.translated || 0);
    cachedEl.textContent = String(data.stats.cached || 0);
  });
}, 2500);
