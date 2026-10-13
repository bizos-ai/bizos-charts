# 报告模式

用户要完整报告、研究报告、月报/周报、经营分析、看板、一页纸、决策备忘录、科研或实验报告，或一次交付 4 张以上相互关联的图时使用。单张或两三张独立的图仍用图表模式。

## 版式

| layout | 名称 | 适合 | 首屏 |
|---|---|---|---|
| `research-note` | 研究报告 | 公司/行业/品类深度研究、投资或立项论证 | 核心观点（带图表编号）+ 关键数据表 |
| `business-review` | 经营分析报告 | 月报、季报、店铺/站点复盘 | 导语 + 指标卡（K01） |
| `one-pager` | 一页纸 | 品类速览、竞品速写、给管理层的单页 | 左栏观点与关键数据，右栏 2–4 张图 |
| `dashboard` | 数据看板 | 周期性监控、全年概览，文字最少 | 指标卡，下接 2–3 列图表 |
| `decision-memo` | 决策备忘录 | 需要拍板的问题：做不做、投不投、选哪个 | 决策问题 + 建议框 + 依据 |
| `study-report` | 科研报告 | 实验研究、临床前与临床数据、组学分析的结果汇报 | 摘要 + 主要发现（带图表编号）+ 研究概况 |

样张：`templates/reports/<layout>.zh.html` / `.en.html`，对应 spec 在 `examples/reports/`。

## 报告 spec

```json
{
  "layout": "research-note",
  "lang": "zh",
  "meta": { "kicker": "公司研究 · 跨境电商", "title": "结论式主标题", "subtitle": "一句话补充", "date": "2026-10-11", "author": "BizOS 研究", "scope": "范围（可选）" },
  "summary": ["核心观点 1（图表 1）", "核心观点 2（图表 2、3）"],
  "keyData": [{ "label": "当前股价", "value": "24.6 元" }],
  "keyDataNote": "股价截至 2026-10-10",
  "lede": "导语（business-review / dashboard）",
  "kpis": { "type": "K01", "...": "指标卡 spec" },
  "question": "决策问题（decision-memo 必填）",
  "recommendation": "建议（decision-memo 必填）",
  "abstract": "摘要（study-report 必填）",
  "sections": [
    { "title": "章节标题（一个论点）", "lead": "本章结论", "blocks": [
      { "type": "text", "text": "段落" },
      { "type": "bullets", "items": ["要点"] },
      { "type": "callout", "title": "建议", "text": "……" },
      { "type": "exhibit", "spec": { "type": "T03", "...": "整宽图" } },
      { "type": "exhibits", "items": [ { "type": "S03" }, { "type": "C01" } ], "columns": 2 }
    ] }
  ],
  "side": [ { "type": "exhibit", "spec": { "type": "G02" } } ],
  "risks": ["风险 1"],
  "nextSteps": ["下一步 1"],
  "method": "方法与口径（study-report 必填：检验、校正、误差线含义、样本量）",
  "dataAvailability": "数据可得性（study-report 可选）",
  "sources": ["来源 1", "来源 2"],
  "disclaimer": "可选；默认使用标准声明"
}
```

`side` 只用于 one-pager 左栏。`study-report` 中 `summary` 显示为“主要发现”，`keyData` 为“研究概况”，`risks` 为“局限性”，`method` 为“方法与统计”，`sources` 为“数据来源与参考文献”。所有文字字段都可以写成 `{"zh": "…", "en": "…"}`，同一份 spec 用 `--lang en` 渲染英文版。

## 工作流

1. **先写结论**：主标题是整份报告的结论；3–5 条核心观点，每条一个可核对的数字，并注明支撑它的图表编号。
2. **选版式**：按读者与用途，从上表选一个；不拼接两种版式。
3. **搭章节**：每章一个论点，章名就是论点；每张图回答本章的一个子问题。没有证据的模块删掉，不用演示内容占位。
4. **做图**：每张图按图表模式的规范写 spec；同一实体在全报告保持同一名称（引擎据此统一颜色）。
5. **对数**：同一指标在标题、正文、图表、关键数据中的数值必须一致；口径不同（含税/不含税、站点范围、期间）时在名称或注释中区分。科研报告中的中位生存期、IC50、AUC、P 值等统计量取自 `render.mjs` 输出的 `stats`，不手算、不改写精度。
6. **渲染**：`node scripts/render.mjs --report report.json --out <outputs>/report.html`；有 error 不出文件。
7. **检查**：`node scripts/verify.mjs <outputs>/report.html`；再通读一遍：观点引用的图表编号是否对应、数字是否一致、风险与限制是否写清。
8. **双语**：需要中英文时分别 `--lang zh` 与 `--lang en` 生成两个完整文件，不在同一版本中混用语言。

## 编号与引用

图表按出现顺序自动编号（one-pager 先左栏后右栏）；K01 指标卡默认不编号。正文与核心观点用“图表 N / Exhibit N”引用；调整章节顺序后重新核对引用。

## 报告检查（在 delivery-checks 基础上）

- 主标题是结论，核心观点都有图或表支撑，并引用正确的编号。
- 首屏能独立读懂：结论、关键数字、范围与日期齐全。
- 每章只有一个论点；没有与论点无关的“展示性”图表。
- 方法与口径、数据来源列表、风险提示（如适用）齐全；预测值标注 E。
- 科研报告：摘要、方法与统计、局限性齐全；每个检验结论在图中可见（n、误差线含义、检验与校正方法写在图注）。
- 桌面与手机宽度都能阅读；打印为 A4 时图表不被拆页。
