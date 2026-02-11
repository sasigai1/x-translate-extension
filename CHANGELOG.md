# X Translate 11.0.0

## Highlights

- 全新液态玻璃 UI 设计，更通透的视觉体验
- 新增 11 个托管 API 提供商：Cohere、Cerebras、SambaNova、Novita、Hyperbolic、Lepton、零一万物、阶跃星辰、腾讯混元、字节豆包
- 新增 6 个内置免费翻译引擎：LibreTranslate COM/Vern、Argos、Terraprint、Google WebApp
- 扩展免费 API 自动发现候选列表
- 翻译卡片采用液态玻璃效果，带动态光晕动画
- 更新图标为新设计

## Notes

- 所有托管 API 均支持 OpenAI 兼容格式
- 免费引擎优先级：Google GTX > LibreTranslate > Lingva > MyMemory
- 自动容灾机制在引擎失败时自动切换

---

# X Translate 10.0.0

## Highlights

- Unified transparent "Studio 10" UI with full-page glassmorphism language.
- Expanded official provider matrix: Groq, Mistral, Together, Fireworks, Perplexity, xAI, DeepInfra.
- Added one-click route optimizer to switch to the fastest healthy engine.
- Added auto-discovery workflow for free translation endpoints and persistent onboarding.
- Hardened translation sanitizer against reasoning leakage and pasted artifacts.
- Improved feed injection visuals and observer performance for long timelines.
- Added robust managed-only routing and failure cooldown logic.

## Notes

- MiniMax CodingPlan is constrained to `MiniMax-M2.1` and `MiniMax-M2`.
- If an unsupported model returns a policy notice, engine auto-recovers.
