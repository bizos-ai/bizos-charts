# 规格参考 · Spec reference

> 由 `scripts/build.mjs` 根据引擎注册表与 `examples/specs` 生成，勿手改。完整样例数据见 `examples/specs/<编号>-*.json`。

## 通用字段（所有图表）

| 字段 | 必填 | 说明 |
|---|---|---|
| `type` | 是 | 图表编号，如 `"T03"` |
| `lang` | 否 | `"zh"`（默认）或 `"en"`；同一交付只用一种语言 |
| `title` | 是 | 一句话结论（不是图名），数字必须能从本图数据核对 |
| `subtitle` | 建议 | 指标、单位、期间，如“年度营业收入（百万元），2020A–2027E” |
| `unit` | 视图而定 | 数值单位，如“百万元”“件”；`format` 为 percent / pp / multiple / index / bps / currency 时可省 |
| `format` | 否 | `"number:1"` `"integer"` `"percent:1"` `"pp"` `"multiple"` `"currency"` 或 `{type, decimals, prefix, suffix, scale, negative:"parens"}` |
| `source` | 是 | 资料来源；用户数据写“用户提供”或文件名 |
| `notes` | 否 | 注释数组：口径、剔除项、估算方法 |
| `data` | 是 | 行数组（每行一条记录）；V02、V04、K01、K04、S07、E09、B07 的结构见各自说明 |
| `no` | 否 | 图表编号；页面与报告自动编号 |
| `highlight` | 否 | 需要突出的实体名数组；其余自动退为灰色 |
| `colors` | 否 | `{系列名: "#hex"}`，仅在品牌或语义要求时使用 |
| `palette` | 否 | `"research"`（默认）、`"mono"`（黑白打印）或 `{primary:"#hex"}`（品牌主色） |
| `names` | 否 | `{字段名: 显示名}` |
| `table` / `legend` | 否 | 设为 `false` 关闭数据表 / 图例 |
| `width` / `height` | 否 | 仅静态导出时使用；网页内按容器宽度自动重绘 |

**数值约定**：百分比一律以百分数存储（12.5 表示 12.5%）；缺失值留 `null`，不得补 0；无意义值写 `"n.m."`。
**期间约定**：`2025`、`2025-03`、`2025-03-14`、`2025Q1`、`2026E`；以 E 结尾的期间按预测值绘制（斜线填充 / 虚线），E 之后不得再出现实际期。
**通用选项**：`refLines:[{value, label, axis:"value"|"x"}]`（C01 支持 `"median"` / `"mean"`），`bands:[{from, to, label}]`，`annotations:[{x, y, text}]`，`estimateFrom`，`yDomain:[min,max]`（折线类）。保留字：type、lang、title、subtitle、unit、format、notes、source、data、no、palette、highlight、colors、names、width、height、table、legend，不得用作字段映射名。
**统计量**：E、B 族的检验、区间、拟合与合并估计由引擎计算，`render()` 结果和 `render.mjs` 输出的 `stats` 字段给出全部数值，标题与正文直接引用；P 值格式与科研图规范见 [house-style](house-style.md) 第 10 节。

## T · 趋势与时间 / Trend & time

### T01 折线图 · Line chart

- 回答：指标随时间怎样变化？多条序列谁快谁慢、何时拐头？
- 适用：连续期间的走势、多序列对比（≤6 条）、实际与预测衔接。
- 不适用：不连续的类别比较（用 C01/C02）；序列 >6 条且无主角（用 M01 小多图或高亮）。
- 输出：SVG
- 字段：
  - `x`（time，必填）：期间：YYYY / YYYY-MM / YYYY-MM-DD / 2025Q1 / 2026E
  - `y | series`（measure[]，必填）：一个或多个数值字段（宽表）；或 seriesBy + y（长表）
- 选项：`highlight`、`endLabels`、`markers`、`zero`、`scale:"log"`、`refLines`、`bands`、`annotations`、`estimateFrom`
- 示例（数据截取前 3 行）：

```json
{"type":"T01","title":"美国站贡献主要增量，日本站自 2025 年 9 月见顶后回落","subtitle":"三大站点月度销售额（万美元），2024 年 7 月–2025 年 12 月","unit":"万美元","x":"month","y":["us","de","jp"],"names":{"us":"美国站","de":"德国站","jp":"日本站"},"data":[{"month":"2024-07","us":182,"de":76,"jp":61},{"month":"2024-08","us":199.3,"de":81,"jp":66.8},{"month":"2024-09","us":213.5,"de":85.3,"jp":69.4}],"annotations":[{"x":"2024-11","y":271.7,"text":"黑五"},{"x":"2025-11","y":345.8,"text":"黑五"}],"source":"示例数据；BizOS 整理"}
```

### T02 面积图 / 堆积面积 · Area / stacked area

- 回答：总量如何随时间变化，各组成部分各贡献多少？结构是否迁移？
- 适用：单一存量走势；2–6 个组成部分随时间的堆积；percent:true 看结构占比迁移。
- 不适用：组成部分有负值（用 S01 或 C04）；需精确比较中间层（用 T01 或 M01）。
- 输出：SVG
- 字段：
  - `x`（time，必填）：期间或日期
  - `y | series`（measure[]，必填）：组成部分字段（非负）
- 选项：`stack(默认多序列堆积)`、`percent`、`refLines`、`bands`
- 示例（数据截取前 3 行）：

```json
{"type":"T02","title":"广告流量占比两年内从 39% 升至 47%，自然流量增长落后","subtitle":"店铺月度访问量按来源（万次），2024 年 1 月–2025 年 12 月","unit":"万次","x":"month","y":["organic","sp","sb","ext"],"names":{"organic":"自然搜索","sp":"商品推广","sb":"品牌推广","ext":"站外引流"},"data":[{"month":"2024-01","organic":41,"sp":22,"sb":7,"ext":4},{"month":"2024-02","organic":43,"sp":23.6,"sb":7.3,"ext":4},{"month":"2024-03","organic":44.7,"sp":25,"sb":7.5,"ext":4}],"source":"示例数据；BizOS 整理"}
```

### T03 柱线组合（规模 + 增速） · Bars + rate line (dual axis)

- 回答：规模在增长吗？增速/利润率在加速还是放缓？
- 适用：研报标准“营收及同比增速”“利润及利润率”。左轴绝对额（柱），右轴比率（线）。
- 不适用：两个同单位指标（用 C03 或 T01）；右轴不是比率/倍数/指数。
- 输出：SVG
- 字段：
  - `x`（time，必填）：期间，可含 E 预测期
  - `bars`（measure[]，必填）：1–3 个绝对额字段（左轴，单位 unit）
  - `line | lines`（measure[]，必填）：1–2 个比率字段（右轴，lineFormat: percent/pp/multiple/index）
- 选项：`lineFormat`、`lineUnit`、`barLabels`、`lineLabels`、`estimateFrom`
- 示例（数据截取前 3 行）：

```json
{"type":"T03","title":"营收增速 2025 年见底，新品线放量后 2026 年预计回升至 18%","subtitle":"年度营业收入（百万元，左轴）与同比增速（%，右轴），2020A–2027E","unit":"百万元","x":"period","bars":["revenue"],"line":"yoy","lineFormat":"percent","names":{"revenue":"营业收入","yoy":"同比增速"},"format":"number:0","data":[{"period":"2020A","revenue":312,"yoy":null},{"period":"2021A","revenue":418,"yoy":34},{"period":"2022A","revenue":506,"yoy":21.1}],"notes":["2026E–2027E 为 BizOS 预测"],"source":"示例数据；BizOS 整理"}
```

### T04 指数化表现（基期=100） · Indexed performance (rebased = 100)

- 回答：量级不同的序列，从同一起点出发谁跑得更好？
- 适用：股价相对指数、各站点/品类 GMV 的相对增长、价格指数对比。
- 不适用：需要读取绝对值（用 T01）；基期值 ≤0。
- 输出：SVG；可不填 unit
- 字段：
  - `x`（time，必填）：日期或期间
  - `y | series`（measure[]，必填）：原始水平值（引擎自动换算为基期=100）
- 选项：`base（基期，默认第一期）`、`highlight`、`refLines`
- 示例（数据截取前 3 行）：

```json
{"type":"T04","title":"公司股价 22 个月跑赢行业指数，超额收益主要来自 2025 年","subtitle":"月末收盘价，2024 年 1 月 = 100","x":"month","y":["co","sector","market"],"names":{"co":"示例公司","sector":"跨境电商指数","market":"市场指数"},"highlight":["示例公司"],"data":[{"month":"2024-01","co":38.2,"sector":3120,"market":1840},{"month":"2024-02","co":38.24,"sector":3188,"market":1855},{"month":"2024-03","co":38.02,"sector":3135,"market":1906}],"source":"示例数据；BizOS 整理"}
```

### T05 区间预测（扇形图） · Fan / range chart

- 回答：预测的中枢在哪里，不确定性有多大？历史分位区间如何？
- 适用：销量/价格预测带置信区间；竞品价格 P10–P90 分位带；情景上下限。
- 不适用：区间不是真实统计量或情景时（不要编造区间）。
- 输出：SVG
- 字段：
  - `x`（time，必填）：期间或日期
  - `y`（measure，必填）：中枢值（实际 + 预测）
  - `bands`（interval[]，必填）：[{low, high, name}] 由宽到窄，如 90%、50% 区间
- 选项：`estimateFrom`、`refLines`
- 示例（数据截取前 3 行）：

```json
{"type":"T05","title":"中性预测下 2026 年上半年月销量在 1.6–1.7 万件，区间随期限扩大","subtitle":"月度销量（百件）及预测区间，2025 年 1 月–2026 年 6 月","unit":"百件","x":"month","y":"units","names":{"units":"销量"},"bands":[{"low":"lo90","high":"hi90","name":"90% 区间"},{"low":"lo50","high":"hi50","name":"50% 区间"}],"data":[{"month":"2025-01","units":119,"lo90":null,"hi90":null,"lo50":null,"hi50":null},{"month":"2025-02","units":125.3,"lo90":null,"hi90":null,"lo50":null,"hi50":null},{"month":"2025-03","units":131.7,"lo90":null,"hi90":null,"lo50":null,"hi50":null}],"notes":["区间来自季节性模型残差的分位数；不含促销等未计划事件"],"source":"示例数据；BizOS 整理"}
```

### T06 K 线图（含成交量） · Candlestick with volume

- 回答：价格在每个周期的开高低收如何？量价是否配合？
- 适用：股票、商品、币价的日/周 K；可叠加均线与成交量。
- 不适用：只有收盘价（用 T01）；非价格类业务数据。
- 输出：SVG
- 字段：
  - `x`（time，必填）：交易日（按交易日等距排列，不留周末空档）
  - `open/high/low/close`（measure，必填）：字段名默认 open/high/low/close，可用 ohlc:{} 改名
  - `volume`（measure，可选）：成交量（可选，下方副图）
- 选项：`ma:[5,20]`、`market:"cn"|"intl"（默认中文 cn 红涨绿跌）`、`volumeUnit`
- 示例（数据截取前 3 行）：

```json
{"type":"T06","title":"9 月 30 日放量下跌后，股价在 10 月重新站上 20 日均线","subtitle":"日 K 线（元）与成交量（万股），2025 年 9 月 1 日–10 月 31 日","unit":"元","format":"number:2","x":"date","ma":[5,20],"volumeUnit":"万股","data":[{"date":"2025-09-01","open":24.6,"high":24.79,"low":23.96,"close":24.39,"volume":317},{"date":"2025-09-02","open":24.39,"high":24.7,"low":24.02,"close":24.55,"volume":296},{"date":"2025-09-03","open":24.55,"high":24.63,"low":24.08,"close":24.63,"volume":380}],"source":"示例数据；BizOS 整理"}
```

### T07 估值通道（PE/PB Band） · Valuation band (PE / PB band)

- 回答：当前股价对应历史上多少倍估值？处在通道的什么位置？
- 适用：股价与“每股收益/净资产 × 不同倍数”的平行通道对比。
- 不适用：每股收益为负或波动极大（倍数无意义，标 n.m.）。
- 输出：SVG
- 字段：
  - `x`（time，必填）：日期（月度或周度）
  - `price`（measure，必填）：股价字段
  - `base`（measure，必填）：每股指标字段（EPS 或 BVPS，滚动或预测）
  - `multiples`（list，必填）：倍数列表，如 [10,15,20,25]
- 选项：`multipleLabel（如 "x PE"）`
- 示例（数据截取前 3 行）：

```json
{"type":"T07","title":"当前股价对应 15.7 倍预测市盈率，处于近三年 11–19 倍区间的中部","subtitle":"月末股价（元）与“预测 EPS × 倍数”通道，2023 年 1 月–2025 年 12 月","unit":"元","format":"number:1","x":"month","price":"price","base":"eps","multiples":[12,15,18,21],"multipleLabel":"PE","names":{"price":"股价","eps":"预测 EPS"},"data":[{"month":"2023-01","price":16.46,"eps":1.04},{"month":"2023-02","price":17.67,"eps":1.05},{"month":"2023-03","price":17.71,"eps":1.06}],"source":"示例数据；BizOS 整理"}
```

### T08 日历热力图 · Calendar heatmap

- 回答：一年中每天的量有什么周内/季节规律，哪些日子异常？
- 适用：日销量、日订单、日广告花费等 3–24 个月的逐日数据。
- 不适用：需要精确读数或少于 60 天（用 T01/C02）。
- 输出：SVG
- 字段：
  - `x`（date，必填）：YYYY-MM-DD
  - `y`（measure，必填）：当日数值（缺失日留空，不补 0）
- 选项：`weekStart:"mon"|"sun"`
- 示例（数据截取前 3 行）：

```json
{"type":"T08","title":"周末日均订单比工作日高 12%，两次大促共 8 天贡献全年 6.1% 订单","subtitle":"2025 年每日订单量（单）","unit":"单","format":"integer","x":"date","y":"orders","names":{"orders":"订单量"},"data":[{"date":"2025-01-01","orders":449},{"date":"2025-01-02","orders":453},{"date":"2025-01-03","orders":368}],"notes":["4 月 8–9 日数据缺失，留白未补零"],"source":"示例数据；BizOS 整理"}
```

### T09 斜率图（两期对比） · Slope chart (two periods)

- 回答：两个时点之间，各项目升降方向与幅度如何，排名有无交叉？
- 适用：3–12 个项目的前后两期对比（份额、利润率、价格）。
- 不适用：超过两期（用 T01/T10）；项目 >12。
- 输出：SVG
- 字段：
  - `x`（category，必填）：项目名
  - `from / to`（measure，必填）：两期字段名，periods 给出两期标签
- 选项：`periods:["2024","2025"]`、`highlight`、`colorBy:"direction"|"series"`、`goodDirection:"up"|"down"`
- 示例（数据截取前 3 行）：

```json
{"type":"T09","title":"宠物与厨房品类份额上升，美妆工具份额收缩近两个百分点","subtitle":"各品类占店铺销售额比重（%），2024 年 vs 2025 年","format":"percent","x":"category","from":"y2024","to":"y2025","periods":["2024","2025"],"data":[{"category":"厨房用品","y2024":18.2,"y2025":21.6},{"category":"家居收纳","y2024":15.1,"y2025":13.4},{"category":"宠物用品","y2024":9.6,"y2025":12.9}],"source":"示例数据；BizOS 整理"}
```

### T10 排名变化图 · Bump chart (rank over time)

- 回答：各实体的名次如何随时间变化，谁在上升谁在掉队？
- 适用：品牌/ASIN 的 BSR 或销售额排名、市场份额排名的多期变化（≤10 个实体、≤12 期）。
- 不适用：排名背后的差距很重要时（名次掩盖差距，用 T01 或 C03）。
- 输出：SVG
- 字段：
  - `x`（time，必填）：期间
  - `seriesBy`（dimension，必填）：实体字段
  - `y | rank`（measure，必填）：数值（引擎按降序计算名次）或直接给 rank 字段
- 选项：`rank（名次字段）`、`ascending（数值越小名次越高，如 BSR）`、`highlight`
- 示例（数据截取前 3 行）：

```json
{"type":"T10","title":"示例品牌 A 八个季度从第 4 名升至第 1 名","subtitle":"品类前 6 品牌按季度销售额排名","unit":"百万美元","x":"quarter","seriesBy":"brand","y":"sales","names":{"sales":"销售额"},"highlight":["示例品牌 A","品牌 B"],"data":[{"quarter":"2024Q1","brand":"示例品牌 A","sales":41.4},{"quarter":"2024Q1","brand":"品牌 B","sales":63.6},{"quarter":"2024Q1","brand":"品牌 C","sales":54.4}],"source":"示例数据；BizOS 整理"}
```

### T11 季节性对比（逐年叠加） · Seasonality overlay

- 回答：今年与往年同期相比如何？季节性高峰在哪几个月？
- 适用：月度/周度销量、搜索量、广告花费的多年同期对比，可加往年区间带。
- 不适用：少于两年数据；不规则期间。
- 输出：SVG
- 字段：
  - `x`（date，必填）：YYYY-MM（月度）或 YYYY-MM-DD（按 ISO 周聚合）
  - `y`（measure，必填）：数值
- 选项：`range:true（往年最小–最大区间带）`、`years（指定年份）`
- 示例（数据截取前 3 行）：

```json
{"type":"T11","title":"2025 年 1–10 月每月销售均高于上年同期，7 月同比增长 14%","subtitle":"月度销售额（万美元），2022–2025 年（2025 年截至 10 月）","unit":"万美元","x":"month","y":"sales","range":true,"names":{"sales":"销售额"},"data":[{"month":"2022-01","sales":40.6},{"month":"2022-02","sales":39},{"month":"2022-03","sales":45.7}],"source":"示例数据；BizOS 整理"}
```

## C · 比较与排名 / Comparison & ranking

### C01 条形图（排序） · Bar chart (ranked)

- 回答：谁最大、谁最小？主角在同业中排第几、离中位数多远？
- 适用：3–20 个类别的排序比较，类别名较长；同业对标（主角高亮 + 中位数线）。
- 不适用：时间序列（用 C02/T01）；正负混合（用 C04）。
- 输出：SVG
- 字段：
  - `x`（category，必填）：类别名
  - `y`（measure，必填）：数值
- 选项：`sort:"desc"|"asc"|"none"`、`highlight`、`top（只显示前 N，自动加注）`、`refLines:[{value:"median"|"mean"|数值}]`
- 示例（数据截取前 3 行）：

```json
{"type":"C01","title":"示例公司 2025 年净利率 7.8%，同业第 2，高于同业中位数 2.6 个百分点","subtitle":"2025 年净利率（%），8 家跨境电商可比公司","format":"percent","x":"company","y":"margin","names":{"margin":"净利率"},"highlight":["示例公司"],"refLines":[{"value":"median"}],"data":[{"company":"示例公司","margin":7.8},{"company":"同业 A","margin":12.4},{"company":"同业 B","margin":7.1}],"source":"示例数据；BizOS 整理"}
```

### C02 柱状图 · Column chart

- 回答：各期/各类的规模是多少，哪一期最高，预测期如何？
- 适用：≤16 个期间或短名称类别；年度/季度规模，支持 A/E 区分。
- 不适用：类别名长（用 C01）；需要看连续走势（用 T01）。
- 输出：SVG
- 字段：
  - `x`（category|time，必填）：期间或类别
  - `y`（measure，必填）：数值
- 选项：`highlight`、`labels:"all"|"ends"|"none"`、`refLines`、`estimateFrom`、`cagr:{from,to}（在图上标注复合增速）`
- 示例（数据截取前 3 行）：

```json
{"type":"C02","title":"GMV 2021–2025 年复合增速 29.7%，预计 2027 年接近 5 亿美元","subtitle":"年度 GMV（百万美元），2021A–2027E","unit":"百万美元","format":"number:0","x":"year","y":"gmv","names":{"gmv":"GMV"},"cagr":{"from":"2021A","to":"2025A"},"data":[{"year":"2021A","gmv":128},{"year":"2022A","gmv":171},{"year":"2023A","gmv":236}],"notes":["2026E–2027E 为 BizOS 预测"],"source":"示例数据；BizOS 整理"}
```

### C03 分组柱/条形图 · Grouped bars

- 回答：同一类别下，两到四个系列（今年 vs 去年、我方 vs 竞品）谁高谁低？
- 适用：类别 ≤10、系列 2–4 的并列比较；horizontal:true 用于长类别名。
- 不适用：系列 >4（用 M01 或表格）；关心组成合计（用 S01）。
- 输出：SVG
- 字段：
  - `x`（category，必填）：类别
  - `y | series`（measure[]，必填）：2–4 个系列（宽表）或 seriesBy + y（长表）
- 选项：`horizontal`、`labels`、`highlight（系列名）`
- 示例（数据截取前 3 行）：

```json
{"type":"C03","title":"五个站点中四个增长，日本站是唯一下滑的站点","subtitle":"分站点年度销售额（万美元），2024 年 vs 2025 年","unit":"万美元","format":"number:0","x":"market","y":["y2024","y2025"],"names":{"y2024":"2024","y2025":"2025"},"colors":{"2024":"#8FB3DB","2025":"#16365C"},"data":[{"market":"美国","y2024":1820,"y2025":2240},{"market":"英国","y2024":412,"y2025":468},{"market":"德国","y2024":506,"y2025":542}],"source":"示例数据；BizOS 整理"}
```

### C04 正负条形图 · Diverging bar

- 回答：哪些项目增长、哪些下滑，幅度各多大？
- 适用：同比变化、利润贡献、价格变动等有正有负的类别数值。
- 不适用：全部同号（用 C01）。
- 输出：SVG
- 字段：
  - `x`（category，必填）：类别
  - `y`（measure，必填）：有正有负的数值
- 选项：`goodDirection:"up"|"down"（成本类设 down）`、`sort`
- 示例（数据截取前 3 行）：

```json
{"type":"C04","title":"宠物与厨房拉动增长，3C 配件和美妆工具同比下滑超 15%","subtitle":"各品类 2025 年销售额同比增速（%）","format":"percent","x":"category","y":"yoy","names":{"yoy":"同比增速"},"data":[{"category":"宠物用品","yoy":34.2},{"category":"厨房用品","yoy":21.5},{"category":"玩具","yoy":8.3}],"source":"示例数据；BizOS 整理"}
```

### C05 哑铃图（前后对比） · Dumbbell (before / after)

- 回答：每个类别从 A 到 B 变了多少？差距在扩大还是收窄？
- 适用：类别 ≤15 的两期/两组对比（改版前后、我方 vs 行业）；强调差值。
- 不适用：超过两期（用 T01/T09）。
- 输出：SVG
- 字段：
  - `x`（category，必填）：类别
  - `from / to`（measure，必填）：起点与终点字段；names 给出两期名称
- 选项：`sort:"to"|"change"|"none"`、`goodDirection`
- 示例（数据截取前 3 行）：

```json
{"type":"C05","title":"主图优化后转化率提升 3.6 个百分点，未改动 SKU 基本持平","subtitle":"改版前后 30 天平均转化率（%），按改版类型","format":"percent","x":"group","from":"before","to":"after","names":{"before":"改版前","after":"改版后"},"data":[{"group":"主图优化 SKU","before":9.2,"after":12.8},{"group":"A+ 页面 SKU","before":10.4,"after":12.1},{"group":"视频 SKU","before":11.6,"after":13}],"notes":["前后各 30 天，剔除大促日"],"source":"示例数据；BizOS 整理"}
```

### C06 子弹图（实际 vs 目标） · Bullet chart (actual vs target)

- 回答：各项指标完成了目标的多少，处于差/中/好哪个区间？
- 适用：预算达成、KPI 完成率、库存周转对标；同一单位的多行指标。
- 不适用：各行单位不同（拆成多张或用 K01）。
- 输出：SVG
- 字段：
  - `x`（category，必填）：指标名
  - `y`（measure，必填）：实际值
  - `target`（measure，必填）：目标值字段
  - `bands`（list，可选）：区间阈值字段数组，如 ["poor","ok"]（第三档至轴末）
- 选项：`bands`、`goodDirection`
- 示例（数据截取前 3 行）：

```json
{"type":"C06","title":"英国站超额完成，日本站仅达成目标的 79%","subtitle":"2025 年 12 月销售额实际与目标（万美元），灰色底为差/中/好区间","unit":"万美元","format":"number:0","x":"market","y":"actual","target":"target","bands":["poor","ok"],"names":{"actual":"实际","target":"目标"},"data":[{"market":"美国站","actual":238,"target":250,"poor":200,"ok":235},{"market":"英国站","actual":51,"target":46,"poor":38,"ok":45},{"market":"德国站","actual":52,"target":60,"poor":48,"ok":57}],"source":"示例数据；BizOS 整理"}
```

### C07 区间条形图 · Range bar

- 回答：各对象的取值范围（最低–最高）在哪里，典型值和我方位置在哪？
- 适用：竞品价格带、各站点配送时效区间、预测分歧（最低–最高 + 中位数）。
- 不适用：估值方法汇总（用 V01 足球场图）；只有单点值（用 C01）。
- 输出：SVG
- 字段：
  - `x`（category，必填）：对象
  - `low / high`（measure，必填）：下限与上限字段
  - `mid`（measure，可选）：典型值（中位数/均值）字段
- 选项：`refLines:[{value, label}]（如我方价格）`、`sort`
- 示例（数据截取前 3 行）：

```json
{"type":"C07","title":"我方 34.99 美元定价高于 5 个对象的中位价，仅低于品牌 A","subtitle":"前 50 名 ASIN 售价区间（美元），竖线为各品牌中位价","unit":"美元","format":"number:2","x":"brand","low":"low","high":"high","mid":"median","names":{"median":"中位价"},"refLines":[{"value":34.99,"label":"我方"}],"data":[{"brand":"品牌 A","low":29.9,"high":49.9,"median":39.9},{"brand":"品牌 B","low":24.9,"high":44.9,"median":32.9},{"brand":"品牌 C","low":19.9,"high":34.9,"median":27.5}],"source":"示例数据；BizOS 整理"}
```

## S · 构成与桥接 / Composition & bridges

### S01 堆积柱/条形图 · Stacked bars

- 回答：总量是多少，由哪些部分组成，哪一部分在变化？
- 适用：各期/各类的总额与 2–6 个组成部分（按渠道、按站点、按产品线）。
- 不适用：只关心占比（用 S02）；组成部分有负值（用 S03/C04）。
- 输出：SVG
- 字段：
  - `x`（category|time，必填）：期间或类别
  - `y | series`（measure[]，必填）：组成部分（非负）
- 选项：`horizontal`、`totals（默认显示合计）`、`estimateFrom`
- 示例（数据截取前 3 行）：

```json
{"type":"S01","title":"FBA 贡献约 79% 销售，独立站占比从 5% 升至 11%（预测）","subtitle":"季度销售额按渠道（万美元），2025Q1–2026Q2E","unit":"万美元","format":"number:0","x":"quarter","y":["fba","fbm","dtc"],"names":{"fba":"FBA","fbm":"FBM","dtc":"独立站"},"data":[{"quarter":"2025Q1","fba":182,"fbm":41,"dtc":12},{"quarter":"2025Q2","fba":196,"fbm":38,"dtc":15},{"quarter":"2025Q3","fba":214,"fbm":36,"dtc":19}],"notes":["2026Q1E–Q2E 为预测"],"source":"示例数据；BizOS 整理"}
```

### S02 百分比堆积图（结构） · 100% stacked (mix)

- 回答：结构（占比）在各期/各组之间如何变化？
- 适用：渠道结构、价格段结构、评分结构的跨期/跨组比较；每根柱合计 100%，并标注基数。
- 不适用：多选题（各项独立 0–100%，用 C01）；需要绝对额（用 S01）。
- 输出：SVG；可不填 unit
- 字段：
  - `x`（category|time，必填）：期间或组别
  - `y | series`（measure[]，必填）：组成部分绝对值（引擎换算占比）
- 选项：`horizontal`、`showBase（默认显示每组合计）`
- 示例（数据截取前 3 行）：

```json
{"type":"S02","horizontal":true,"title":"露营灯一星评价占 13%，是其他产品线的三倍以上","subtitle":"近 12 个月评论星级结构（%），柱右为评论总数（条）","unit":"条","format":"integer","x":"line","y":["s5","s4","s3","s2","s1"],"names":{"s5":"5 星","s4":"4 星","s3":"3 星","s2":"2 星","s1":"1 星"},"colors":{"5 星":"#16365C","4 星":"#4F86C6","3 星":"#B8C0CA","2 星":"#D89A8E","1 星":"#B83B3B","5★":"#16365C","4★":"#4F86C6","3★":"#B8C0CA","2★":"#D89A8E","1★":"#B83B3B"},"data":[{"line":"收纳盒","s5":612,"s4":214,"s3":61,"s2":28,"s1":35},{"line":"厨房秤","s5":388,"s4":142,"s3":52,"s2":26,"s1":24},{"line":"宠物饮水机","s5":702,"s4":168,"s3":44,"s2":26,"s1":30}],"source":"示例数据；BizOS 整理"}
```

### S03 瀑布图 / 桥接图 · Waterfall / bridge

- 回答：从起点到终点，各因素分别贡献（增加或扣减）了多少？
- 适用：利润桥（收入→毛利→经营利润）、同比变动归因（量价结构）、费用拆解、分部加总估值。
- 不适用：各步之间没有加减关系；超过 12 步（合并小项）。
- 输出：SVG
- 字段：
  - `x`（category，必填）：步骤名（默认字段 label）
  - `y`（measure，必填）：数值（默认字段 value）：total 为水平值，delta 为增减
  - `kind`（enum，必填）：total | subtotal | delta；首行为起点，subtotal/total 必须等于累计值
- 选项：`goodDirection:"down"（成本桥）`、`horizontal`
- 示例（数据截取前 3 行）：

```json
{"type":"S03","title":"销量增长抵消了广告与物流成本上升，经营利润增长 5.6%","subtitle":"经营利润变动拆解（百万美元），2024 年 → 2025 年","unit":"百万美元","format":"number:2","x":"label","y":"value","kind":"kind","data":[{"kind":"total","label":"2024 年经营利润","value":4.82},{"kind":"delta","label":"销量增长","value":2.31},{"kind":"delta","label":"价格调整","value":0.64}],"source":"示例数据；BizOS 整理"}
```

### S04 环形图（≤6 项） · Donut (≤6 parts)

- 回答：一个整体由哪几部分组成，最大的部分占多少？
- 适用：单一整体的 2–6 个互斥部分（收入构成、渠道占比），中心显示合计。
- 不适用：部分 >6、需要精确比较相近份额、跨期比较（用 C01/S02）。
- 输出：SVG
- 字段：
  - `x`（category，必填）：部分名称
  - `y`（measure，必填）：数值（非负，引擎计算占比）
- 选项：`centerLabel`、`otherLabel（“其他”排最后）`
- 示例（数据截取前 3 行）：

```json
{"type":"S04","title":"美国站贡献 55% 收入，单一市场集中度偏高","subtitle":"2025 年收入按站点构成","unit":"万美元","format":"number:0","x":"market","y":"revenue","otherLabel":"其他","data":[{"market":"美国","revenue":2240},{"market":"德国","revenue":542},{"market":"英国","revenue":468}],"source":"示例数据；BizOS 整理"}
```

### S05 矩形树图 · Treemap

- 回答：在一个大盘子里，哪些类别/子类占得最多？
- 适用：两层层级的规模分布（品类→子类目、站点→店铺），面积 = 数值；可按增速着色。
- 不适用：有负值；需要精确比较（用 C01）；叶子 >40 个（合并长尾）。
- 输出：SVG
- 字段：
  - `x`（category，必填）：叶子名称
  - `y`（measure，必填）：面积数值（非负）
  - `parent`（category，可选）：父级字段（两层时）
  - `colorBy`（measure，可选）：着色指标（如同比增速，发散色）
- 选项：`parent`、`colorBy`、`colorFormat`
- 示例（数据截取前 3 行）：

```json
{"type":"S05","title":"厨房小家电与宠物喂食规模中等但增速最快，露营品类在收缩","subtitle":"2025 年 GMV（万美元，面积）与同比增速（颜色）","unit":"万美元","format":"number:0","x":"sub","parent":"cat","y":"gmv","colorBy":"yoy","colorFormat":"percent:0","names":{"yoy":"同比增速"},"data":[{"cat":"家居","sub":"收纳","gmv":412,"yoy":6},{"cat":"家居","sub":"清洁","gmv":268,"yoy":14},{"cat":"家居","sub":"装饰","gmv":141,"yoy":-9}],"source":"示例数据；BizOS 整理"}
```

### S06 马赛克图（Marimekko） · Marimekko (market map)

- 回答：各细分市场有多大，每个细分里谁占多少份额？
- 适用：市场地图：列宽 = 细分市场规模，列内高度 = 玩家份额；定位我方在哪些细分有优势。
- 不适用：细分 >8 或玩家 >6（合并为“其他”）。
- 输出：SVG
- 字段：
  - `x`（category，必填）：细分市场
  - `seriesBy`（category，必填）：玩家/品牌字段
  - `y`（measure，必填）：销售额（非负）
- 选项：`highlight（玩家名）`、`otherLabel`
- 示例（数据截取前 3 行）：

```json
{"type":"S06","title":"示例品牌 A 在大众价位份额 23% 居首，但在入门价位仅 8%","subtitle":"细分价位段规模（列宽）与品牌份额（高度），2025 年销售额（万美元）","unit":"万美元","format":"number:0","x":"seg","seriesBy":"brand","y":"sales","otherLabel":"其他","highlight":["示例品牌 A"],"data":[{"seg":"中高端（>40 美元）","brand":"示例品牌 A","sales":96},{"seg":"中高端（>40 美元）","brand":"品牌 B","sales":141},{"seg":"中高端（>40 美元）","brand":"品牌 C","sales":48}],"source":"示例数据；BizOS 整理"}
```

### S07 桑基图（流向） · Sankey (flows)

- 回答：总量从哪里来、流向哪里、在每一层分成多少？
- 适用：利润表流向（收入→成本/毛利→费用/利润）、流量来源→落地页→转化、预算分配。
- 不适用：流不守恒且无法解释；节点 >20（聚合）；需要逐路径查询。
- 输出：SVG
- 字段：
  - `source / target / value`（link，必填）：data 为连线数组：{source, target, value}
  - `nodes`（list，可选）：可选 [{id, label, kind:"cost"|"profit"}] 控制顺序与配色
- 选项：`nodes`、`nodeColors`
- 示例（数据截取前 3 行）：

```json
{"type":"S07","title":"每 100 美元收入中，42 美元是商品成本，25 美元是平台与物流费，经营利润留存 12 美元","subtitle":"2025 年利润表流向（万美元）","unit":"万美元","format":"number:0","nodes":[{"id":"us","label":"美国站"},{"id":"eu","label":"欧洲站"},{"id":"jp","label":"日本站"}],"data":[{"source":"us","target":"rev","value":2240},{"source":"eu","target":"rev","value":1010},{"source":"jp","target":"rev","value":371}],"source":"示例数据；BizOS 整理"}
```

### S08 转化漏斗 · Conversion funnel

- 回答：从曝光到成交每一步流失多少，哪一环转化率最低？
- 适用：广告/店铺转化路径（曝光→点击→加购→下单），注明环节转化率与整体转化率。
- 不适用：各步不是同一批对象的递进（不同口径不能串成漏斗）。
- 输出：SVG
- 字段：
  - `x`（category，必填）：环节名称（按顺序）
  - `y`（measure，必填）：该环节数量（应逐级不增）
- 示例（数据截取前 3 行）：

```json
{"type":"S08","title":"点击率仅 0.75%，是转化路径中最大的流失环节","subtitle":"2025 年 12 月商品推广广告转化路径（次）","unit":"次","format":"integer","x":"stage","y":"n","data":[{"stage":"广告曝光","n":1284000},{"stage":"点击","n":9630},{"stage":"商品详情页浏览","n":8920}],"source":"示例数据；BizOS 整理"}
```

## D · 分布 / Distribution

### D01 直方图 · Histogram

- 回答：数值集中在哪个区间，分布是否偏斜、有无长尾？
- 适用：单变量分布：竞品价格、订单金额、配送时长、评分数（≥30 个样本）。
- 不适用：样本 <30（用 D03 逐点）；多组比较（用 D02）。
- 输出：SVG
- 字段：
  - `y`（measure，必填）：原始观测值字段（每行一个样本）
- 选项：`binWidth`、`bins（箱数）`、`marks:["median","mean"]`
- 示例（数据截取前 3 行）：

```json
{"type":"D01","title":"56% 的头部商品售价在 20–35 美元，均价 27.7 美元被少数高价商品拉高","subtitle":"品类前 200 名 ASIN 售价分布（美元）","unit":"美元","format":"number:0","y":"price","names":{"price":"售价"},"marks":["median","mean"],"data":[{"price":36.22},{"price":30.92},{"price":46.75}],"source":"示例数据；BizOS 整理"}
```

### D02 箱线图 · Box plot

- 回答：几组数据的中位数、离散程度和异常值有何差异？
- 适用：2–12 组的分布比较：各品类价格、各站点时效、各广告组 ACOS。
- 不适用：每组样本 <10（用 D03 展示每个点）。
- 输出：SVG
- 字段：
  - `x`（category，必填）：组别
  - `y`（measure，必填）：原始观测值（长表，每行一个样本）
- 选项：`horizontal`、`highlight`、`sort:"median"`
- 示例（数据截取前 3 行）：

```json
{"type":"D02","title":"加拿大站配送时长中位数 3.3 天，为五站最长且波动最大","subtitle":"2025 年第四季度 FBA 订单配送时长（天），各站点随机抽样 80 单","unit":"天","format":"number:1","x":"market","y":"days","sort":"median","data":[{"market":"美国","days":2},{"market":"美国","days":2.7},{"market":"美国","days":2.4}],"source":"示例数据；BizOS 整理"}
```

### D03 点分布图（蜂群） · Strip / beeswarm

- 回答：每个样本落在哪里？我方/重点对象在分布中的位置如何？
- 适用：小到中等样本（≤300/组）的逐点分布，可标注我方产品或异常点。
- 不适用：样本很大（用 D01/D02）。
- 输出：SVG
- 字段：
  - `y`（measure，必填）：数值
  - `x`（category，可选）：组别（可选）
  - `label`（category，可选）：点名称字段（用于 highlight 标注）
- 选项：`highlight（点名称）`、`label`
- 示例（数据截取前 3 行）：

```json
{"type":"D03","title":"我方 SKU-1 定价 34.99 美元，接近头部品牌中位价 39.8 美元；SKU-2 贴近中腰部中位价","subtitle":"前 64 名竞品与我方 2 款 SKU 售价（美元），按品牌层级","unit":"美元","format":"number:2","x":"tier","y":"price","label":"asin","names":{"price":"售价"},"highlight":["我方 SKU-1","我方 SKU-2"],"data":[{"tier":"头部品牌","asin":"B01001X","price":40.61},{"tier":"头部品牌","asin":"B01002X","price":40.47},{"tier":"头部品牌","asin":"B01003X","price":43.17}],"source":"示例数据；BizOS 整理"}
```

## R · 相关与定位 / Relationship & positioning

### R01 散点图（含回归） · Scatter (with fit)

- 回答：两个指标是否相关？谁偏离了整体规律？
- 适用：估值与增速（EV/EBITDA vs 增速）、价格与销量、评分与转化等两指标关系；fit:true 给出回归线与 R²。
- 不适用：时间序列（用 T01）；点 <5。
- 输出：SVG
- 字段：
  - `x / y`（measure，必填）：横轴与纵轴指标（xUnit / unit 必填）
  - `label`（category，可选）：点名称
  - `group`（category，可选）：分组着色（≤6 组）
- 选项：`fit`、`highlight`、`xFormat`、`labels:"all"`、`xZero/yZero`
- 示例（数据截取前 3 行）：

```json
{"type":"R01","title":"估值与增速正相关，示例公司 9.6 倍低于回归线隐含的 13.5 倍","subtitle":"可比公司 EV/EBITDA（2026E，倍）与 2025–2027E 收入复合增速（%）","x":"growth","y":"ev","label":"co","xFormat":"percent:0","format":"multiple","xTitle":"收入复合增速","yTitle":"EV/EBITDA","fit":true,"highlight":["示例公司"],"data":[{"co":"示例公司","growth":24,"ev":9.6},{"co":"同业 A","growth":11.6,"ev":10.3},{"co":"同业 B","growth":19,"ev":14.2}],"source":"示例数据；BizOS 整理"}
```

### R02 气泡图 · Bubble chart

- 回答：在两个指标定位之外，第三个指标（规模）有多大？
- 适用：品牌/类目在“增速 × 利润率”上的位置 + 规模（面积 = 销售额）。
- 不适用：规模差异需要精确比较（面积难精读，配表格）；点 >30。
- 输出：SVG
- 字段：
  - `x / y`（measure，必填）：定位指标（xUnit / unit 必填）
  - `size`（measure，必填）：气泡面积指标（非负，面积 ∝ 数值）
  - `label`（category，可选）：名称
- 选项：`sizeUnit`、`sizeFormat`、`highlight`、`group`
- 示例（数据截取前 3 行）：

```json
{"type":"R02","title":"宠物饮水机兼具最高增速与最高利润率，收纳规模最大但增速仅 6%","subtitle":"各子类目 2025 年同比增速（%）、净利率（%）与销售额（气泡面积，万美元）","x":"growth","y":"margin","size":"sales","label":"cat","xFormat":"percent:0","format":"percent","sizeFormat":"number:0","sizeUnit":"万美元","xTitle":"同比增速","yTitle":"净利率","names":{"sales":"销售额"},"data":[{"cat":"宠物饮水机","growth":38,"margin":18.2,"sales":236},{"cat":"厨房小家电","growth":31,"margin":12.4,"sales":298},{"cat":"厨具","growth":22,"margin":15.1,"sales":356}],"source":"示例数据；BizOS 整理"}
```

### R03 四象限矩阵（2×2） · Quadrant matrix (2×2)

- 回答：按两个维度把对象分成四类，各自该采取什么策略？
- 适用：产品组合（增速 × 份额）、关键词（搜索量 × 转化）、SKU（毛利 × 动销）的分层管理；分界线默认取中位数。
- 不适用：分界线没有业务含义且未说明；点 <8。
- 输出：SVG
- 字段：
  - `x / y`（measure，必填）：两个分类维度
  - `label`（category，可选）：名称
  - `size`（measure，可选）：可选气泡大小
- 选项：`xSplit / ySplit（数值、"mean" 或默认中位数）`、`quadrants:[右上, 左上, 左下, 右下]`、`highlight`
- 示例（数据截取前 3 行）：

```json
{"type":"R03","title":"两个高流量高转化核心词贡献最多订单，“dog water bowl”流量大但转化不足 3%","subtitle":"关键词月搜索量（千次）与广告转化率（%），气泡面积为月订单（百单），分界线为中位数","x":"vol","y":"cvr","size":"orders","label":"kw","xUnit":"千次","format":"percent","sizeFormat":"number:1","sizeUnit":"百单","xTitle":"月搜索量","yTitle":"转化率","names":{"orders":"月订单"},"quadrants":["核心词：加大投放","精准长尾：维持","低效：收缩","高流量低转化：优化页面"],"data":[{"kw":"dog water fountain","vol":48.2,"cvr":14.1,"orders":12.8},{"kw":"cat water fountain","vol":61.5,"cvr":11.2,"orders":18.4},{"kw":"pet fountain stainless","vol":9.6,"cvr":16.9,"orders":3.1}],"source":"示例数据；BizOS 整理"}
```

## V · 估值与敏感性 / Valuation & sensitivity

### V01 估值区间图（足球场图） · Valuation football field

- 回答：不同估值方法给出的价值区间是多少，与当前价格/报价相比如何？
- 适用：可比公司、可比交易、DCF、52 周区间等方法的估值汇总；情景（悲观/中性/乐观）区间。
- 不适用：没有区间只有点估计（用 C01）。
- 输出：SVG
- 字段：
  - `x`（category，必填）：方法/情景名称
  - `low / high`（measure，必填）：区间下限与上限（同一口径，如每股价值或企业价值）
  - `basis`（text，可选）：方法依据字段，如“EV/EBITDA 9–12x”
- 选项：`current（当前价格）`、`refLines（报价、目标价）`、`groupBy（方法类别着色）`
- 示例（数据截取前 3 行）：

```json
{"type":"V01","title":"当前股价 24.6 元低于 4 种方法的估值下限，各方法中值 25.5–32.9 元","subtitle":"每股价值区间（元），按估值方法","unit":"元/股","format":"number:1","x":"method","low":"low","high":"high","basis":"basis","current":24.6,"refLines":[{"value":30.5,"label":"目标价","color":"#16365C"}],"data":[{"method":"52 周股价区间","low":19.8,"high":31.2,"basis":"最低–最高"},{"method":"分析师目标价","low":25,"high":36,"basis":"9 家机构"},{"method":"可比公司 P/E","low":24.1,"high":32.1,"basis":"2026E 15–20x"}],"source":"示例数据；BizOS 整理"}
```

### V02 敏感性分析表（双因素） · Sensitivity table (two-way)

- 回答：两个关键假设同时变化时，结果（估值/利润）落在什么范围？
- 适用：WACC × 永续增长率对估值；售价 × 广告花费率对利润；基准情形加框。
- 不适用：只有一个变量（用 V03 龙卷风图）。
- 输出：HTML 表格/指标卡
- 字段：
  - `rows / cols`（axis，必填）：{name, values:[…], format} 行变量与列变量
  - `values`（matrix，必填）：结果矩阵 values[i][j]，行数 = rows.values 数
  - `base`（pair，必填）：[行基准值, 列基准值]，加框标出
- 选项：`shade:"diverging"|"sequential"|"none"`、`goodDirection`
- 示例（数据截取前 3 行）：

```json
{"type":"V02","title":"WACC 每上升 1 个百分点，每股价值平均下降约 4.2 元","subtitle":"DCF 每股价值（元）对 WACC 与永续增长率的敏感性","unit":"元/股","format":"number:1","rows":{"name":"WACC","values":[9,9.5,10],"format":"percent:1"},"cols":{"name":"永续增长率 g","values":[2,2.5,3],"format":"percent:1"},"values":[[32.5,35.2,38.3],[30.3,32.7,35.3],[28.4,30.5,32.8]],"base":[10,2.5],"notes":["简化模型：价值 = FCF × (1+g) ÷ (WACC − g)，FCF = 2.23 元/股；基准情形即目标价 30.5 元"],"source":"示例数据；BizOS 整理"}
```

### V03 龙卷风图（单因素敏感性） · Tornado (one-way sensitivity)

- 回答：哪个假设对结果影响最大？各假设上下浮动时结果变化多少？
- 适用：利润/估值对售价、销量、广告费率、汇率、头程成本等单因素 ±x% 的敏感性排序。
- 不适用：因素之间相互依赖且需联动分析（用 V02）。
- 输出：SVG
- 字段：
  - `x`（category，必填）：因素名（含浮动幅度，如“售价 ±10%”）
  - `low / high`（measure，必填）：因素取低值/高值时的结果
- 选项：`base（基准结果，必填）`、`lowLabel / highLabel`
- 示例（数据截取前 3 行）：

```json
{"type":"V03","title":"售价是利润最敏感的因素：±5% 售价对应 ±29% 经营利润","subtitle":"2026 年经营利润（万美元）对单一因素变化的敏感性","unit":"万美元","format":"number:0","x":"driver","low":"low","high":"high","base":186,"lowLabel":"因素向不利方向","highLabel":"因素向有利方向","data":[{"driver":"售价 ±5%","low":132,"high":240},{"driver":"销量 ±10%","low":151,"high":221},{"driver":"广告费率 ±2pct","low":158,"high":214}],"source":"示例数据；BizOS 整理"}
```

### V04 指标拆解树（驱动因素树） · Driver tree

- 回答：结果指标由哪些驱动因素相乘/相加得到，变化来自哪一项？
- 适用：杜邦分析（ROE = 净利率 × 周转率 × 杠杆）、GMV = 流量 × 转化率 × 客单价、利润树；可显示同比。
- 不适用：各层之间没有确定的运算关系。
- 输出：SVG；可不填 unit
- 字段：
  - `tree`（tree，必填）：{label, value, prior?, format, op:"×"|"+"|"−"|"÷", children:[…]}；父值必须等于 op(子值)
- 选项：`tolerance（默认 1%）`
- 示例（数据截取前 3 行）：

```json
{"type":"V04","title":"GMV 增长 12.6% 来自流量与客单价，转化率下降 0.6 个百分点拖累增长","subtitle":"2025 年 vs 2024 年 GMV 拆解：GMV = 访客 × 转化率 × 客单价","format":"number:1","tree":{"label":"GMV（万美元）","value":1536.3,"prior":1364.4,"op":"×","children":[{"label":"订单量（万单）","value":48.6,"prior":45.6,"op":"×","children":[{"label":"访客（万人次）","value":412,"prior":368},{"label":"转化率","value":0.11800000000000001,"prior":0.124,"format":{"type":"percent","decimals":1,"scale":0.01}}]},{"label":"客单价（美元）","value":31.6,"prior":29.9,"format":"number:2"}]},"source":"示例数据；BizOS 整理","notes":["订单量 = 访客 × 转化率；数值四舍五入，拆解误差 ≤1%"]}
```

## H · 矩阵与同期群 / Matrix & cohort

### H01 热力矩阵 · Heatmap matrix

- 回答：两个维度交叉后，哪些组合的数值最高/最低？有无规律？
- 适用：星期 × 小时订单、站点 × 品类增速、相关系数矩阵（center:0）、价格段 × 评分。
- 不适用：需要精确比较少数数值（用 C03）；格子 >400。
- 输出：SVG
- 字段：
  - `x`（category，必填）：列维度
  - `row`（category，必填）：行维度字段
  - `y`（measure，必填）：格子数值
- 选项：`center（发散色中点，如 0）`、`labels:"auto"|"all"|"none"`、`rowOrder / colOrder`
- 示例（数据截取前 3 行）：

```json
{"type":"H01","title":"晚间 18–21 点是全周订单高峰，周末上午也明显走强","subtitle":"美国站按星期与时段的平均小时订单量（单），2025 年第四季度，美东时间","unit":"单","format":"integer","x":"hour","row":"day","y":"orders","data":[{"day":"周一","hour":"0-3","orders":42},{"day":"周一","hour":"3-6","orders":21},{"day":"周一","hour":"6-9","orders":61}],"source":"示例数据；BizOS 整理"}
```

### H02 同期群留存三角 · Cohort retention triangle

- 回答：不同月份获得的客户，此后各期还剩多少（复购/留存）？新客质量在变好吗？
- 适用：复购率、会员留存、订阅续费的同期群分析；每行一个获客期。
- 不适用：没有按获客期追踪的个体数据（不能用总量反推）。
- 输出：SVG；可不填 unit
- 字段：
  - `x`（category，必填）：获客期（同期群）
  - `offset`（ordinal，必填）：距获客期的期数（0、1、2…）字段
  - `y`（measure，必填）：留存率/复购率（%）
  - `size`（measure，可选）：同期群规模（首期人数）字段
- 选项：`size`
- 示例（数据截取前 3 行）：

```json
{"type":"H02","title":"5 月起新客的次月复购率平均提升 2.4 个百分点，会员计划见效","subtitle":"按首购月份的复购客户占比（%），2025 年 1–8 月同期群","format":"percent:0","x":"cohort","offset":"offset","y":"rate","size":"size","names":{"rate":"复购率"},"data":[{"cohort":"2025-01","offset":0,"rate":100,"size":1940},{"cohort":"2025-01","offset":1,"rate":28.7,"size":1940},{"cohort":"2025-01","offset":2,"rate":24.6,"size":1940}],"source":"示例数据；BizOS 整理"}
```

## G · 地理 / Geography

### G01 美国分州瓦片地图 · US state tile map

- 回答：各州数值（销量、订单、渗透率）高低如何分布，有无区域集中？
- 适用：美国站按收货州的销售/订单/客单价；每州等面积方块，避免大州在视觉上被夸大。
- 不适用：需要精确地理位置或城市级数据。
- 输出：SVG
- 字段：
  - `x`（geo，必填）：州代码（CA）或英文州名
  - `y`（measure，必填）：数值
- 选项：`scale:"quantile"(默认)|"linear"`、`center`
- 示例（数据截取前 3 行）：

```json
{"type":"G01","title":"加州订单占全美 14%，西海岸三州合计 19%，美西仓应优先备货","subtitle":"2025 年美国站订单按收货州（单）","unit":"单","format":"integer","x":"state","y":"orders","names":{"orders":"订单"},"data":[{"state":"CA","orders":2561},{"state":"TX","orders":1359},{"state":"FL","orders":904}],"source":"示例数据；BizOS 整理"}
```

### G02 中国省级瓦片地图 · China province tile map

- 回答：各省份数值（卖家数、工厂、销量）如何分布，集中在哪些省？
- 适用：卖家/供应商所在地、各省销量；等面积方块，含港澳台。
- 不适用：城市级或需要精确边界的分析。
- 输出：SVG
- 字段：
  - `x`（geo，必填）：省份名（广东/广东省/Guangdong）
  - `y`（measure，必填）：数值
- 选项：`scale:"quantile"(默认)|"linear"`、`center`
- 示例（数据截取前 3 行）：

```json
{"type":"G02","title":"头部 100 家卖家中，广东与浙江合计 59 家，供应链高度集中于东南沿海","subtitle":"品类前 100 名卖家按公司注册省份（家）","unit":"家","format":"integer","x":"province","y":"sellers","scale":"linear","names":{"sellers":"卖家数"},"data":[{"province":"黑龙江","sellers":0},{"province":"吉林","sellers":0},{"province":"内蒙古","sellers":0}],"source":"示例数据；BizOS 整理"}
```

## K · 指标与表格 / KPIs & tables

### K01 关键指标卡 · KPI tiles

- 回答：本期核心指标是多少，较上期/去年同期变化多少，方向好坏？
- 适用：报告首屏的 3–8 个核心指标；每个指标带口径（期间）、变化与可选迷你走势。
- 不适用：指标超过 8 个（用 K02 表格）；没有比较基准的孤立数字。
- 输出：HTML 表格/指标卡；可不填 unit
- 字段：
  - `data[]`（items，必填）：{label, value, format, unit, delta, deltaFormat, deltaLabel, goodDirection, spark:[…], note}
- 选项：`columns`
- 示例（数据截取前 3 行）：

```json
{"type":"K01","title":"12 月销售额同比增长 18%，但广告花费增速更快，ACOS 上升 2.1 个百分点","subtitle":"2025 年 12 月核心经营指标，变化为同比","data":[{"label":"销售额","value":362.4,"format":"number:1","unit":"万美元","delta":18.2,"deltaLabel":"同比","spark":[241,255,262,248,270,281,296,288,301,316,344,362.4]},{"label":"订单量","value":11.46,"format":"number:2","unit":"万单","delta":14.6,"deltaLabel":"同比","spark":[8.1,8.4,8.6,8.2,8.9,9.2,9.6,9.5,9.9,10.3,11,11.46]},{"label":"客单价","value":31.62,"format":"number:2","unit":"美元","delta":3.1,"deltaLabel":"同比"}],"source":"示例数据；BizOS 整理"}
```

### K02 数据表（带条形/色阶/迷你图） · Data table (bars, heat, sparklines)

- 回答：需要逐项查数、对比多个指标时，如何一次给全且有重点？
- 适用：SKU/ASIN 明细、站点经营表、关键词表；列可加内嵌条形、色阶或迷你走势。
- 不适用：只有一两个数（写进正文或 K01）。
- 输出：HTML 表格/指标卡；可不填 unit
- 字段：
  - `columns`（list，必填）：[{key,label,format,unit,bar,heat,spark,align,href}]，第一列为行名；href 指向存放 http(s) 链接的字段（如 ASIN 详情页）
  - `data`（rows，必填）：行数据
- 选项：`total（合计行）`、`highlight（行名）`、`sortBy（"-sales"）`、`groups（表头分组）`、`finance:true（负数括号）`
- 示例（数据截取前 3 行）：

```json
{"type":"K02","title":"前五大 ASIN 贡献 64% 销售额，露营灯是唯一负增长且 ACOS 最高的商品","subtitle":"2025 年第四季度 ASIN 经营明细","columns":[{"key":"name","label":"商品"},{"key":"asin","label":"ASIN","align":"left"},{"key":"sales","label":"销售额","unit":"万美元","format":"number:1","bar":true},{"key":"yoy","label":"同比","format":"percent:1","heat":"diverging"},{"key":"margin","label":"净利率","format":"percent:1"},{"key":"acos","label":"ACOS","format":"percent:1","negativeRed":true}],"data":[{"name":"宠物饮水机 2L","asin":"B0C1A2","sales":86.4,"yoy":38.2,"margin":18.6,"acos":21.4},{"name":"厨房电子秤","asin":"B0B7K9","sales":64.1,"yoy":12.5,"margin":15.2,"acos":26.9},{"name":"收纳盒 6 件套","asin":"B0D3M1","sales":58.8,"yoy":4.1,"margin":21.4,"acos":18.2}],"total":{"label":"合计"},"highlight":["露营灯"],"notes":["前五大合计 263.0 万美元，占店铺季度销售额 411.0 万美元的 64%"],"source":"示例数据；BizOS 整理"}
```

### K03 可比公司估值表 · Comparable companies table

- 回答：主角的估值倍数、增速和利润率相对同业均值/中位数处于什么水平？
- 适用：可比公司估值（P/E、EV/EBITDA、P/S）、经营指标对标；自动计算同业均值与中位数（不含主角）。
- 不适用：同业不可比（业务结构差异大时需说明筛选标准）。
- 输出：HTML 表格/指标卡；可不填 unit
- 字段：
  - `columns`（list，必填）：同 K02；倍数列 format:"multiple"，≤0 或缺失显示 n.m.
  - `subject`（text，必填）：主角名称（首列值），置顶并加粗
- 选项：`stats:["mean","median"]`
- 示例（数据截取前 3 行）：

```json
{"type":"K03","title":"示例公司增速 18.1% 高于同业中位数，P/E 与 EV/EBITDA 分别低 26% 和 23%","subtitle":"跨境电商可比公司估值，2026E","subject":"示例公司","columns":[{"key":"co","label":"公司"},{"key":"mcap","label":"市值","unit":"亿元","format":"number:0"},{"key":"g","label":"收入增速","format":"percent:1"},{"key":"pe","label":"P/E","format":"multiple"},{"key":"ev","label":"EV/EBITDA","format":"multiple"},{"key":"ps","label":"P/S","format":"multiple"},{"key":"nm","label":"净利率","format":"percent:1"}],"data":[{"co":"示例公司","mcap":10.3,"g":18.1,"pe":15.6,"ev":9.1,"ps":1.3,"nm":8.4},{"co":"同业 A","mcap":52,"g":12,"pe":24.5,"ev":14.2,"ps":2.4,"nm":12.4},{"co":"同业 B","mcap":20,"g":18.5,"pe":19.2,"ev":11.8,"ps":1.6,"nm":7.1}],"source":"示例数据；BizOS 整理"}
```

### K04 财务预测表（A/E） · Financial forecast table (A/E)

- 回答：历史与预测期的收入、利润、利润率和估值指标是多少？
- 适用：研报“盈利预测与估值”表：实际期（A）与预测期（E）并列，自动计算同比，预测列加底色。
- 不适用：没有预测期的普通明细（用 K02）。
- 输出：HTML 表格/指标卡
- 字段：
  - `periods`（list，必填）：期间列，如 ["2023A","2024A","2025E","2026E"]
  - `rows`（list，必填）：[{label, values:[…], format, yoy:true, bold, indent}]
- 选项：`unit（表注单位）`
- 示例（数据截取前 3 行）：

```json
{"type":"K04","title":"预计 2025–2027 年净利润复合增速 24%，2027 年 EPS 1.89 元","subtitle":"盈利预测与估值","unit":"百万元","periods":["2023A","2024A","2025A","2026E","2027E"],"rows":[{"label":"营业收入","values":[571,618,664,784,902],"format":"number:0","yoy":true,"bold":true},{"label":"毛利","values":[228,241,263,318,371],"format":"number:0"},{"label":"毛利率","values":[39.9,39,39.6,40.6,41.1],"format":"percent:1","indent":1}],"notes":["P/E 基于当前股价 24.6 元；总股本 0.42 亿股"],"source":"示例数据；BizOS 整理"}
```

## P · 进程与时间线 / Process & timeline

### P01 事件时间线 · Event timeline

- 回答：关键事件按什么顺序发生，间隔多长？
- 适用：产品上市节点、政策/平台规则变化、融资与并购历程；≤16 个事件，可按类型着色。
- 不适用：事件需要与数值走势对照（在 T01 中用 annotations）。
- 输出：SVG；可不填 unit
- 字段：
  - `x`（date，必填）：日期（YYYY-MM-DD / YYYY-MM / YYYY）
  - `label`（text，必填）：事件标题字段
  - `category`（category，可选）：事件类别字段（≤4 类着色）
- 选项：`detail（说明字段）`
- 示例（数据截取前 3 行）：

```json
{"type":"P01","title":"两年内完成从单站点到四站点的扩张，独立站在第二年上线","subtitle":"关键经营节点，2024–2025 年","x":"date","label":"event","detail":"detail","category":"kind","data":[{"date":"2024-02-15","event":"美国站上线","detail":"首批 12 个 SKU","kind":"市场"},{"date":"2024-05-20","event":"品牌备案完成","detail":"开通 A+ 与品牌推广","kind":"品牌"},{"date":"2024-09-01","event":"德国站上线","detail":"欧洲 FBA 入仓","kind":"市场"}],"source":"示例数据；BizOS 整理"}
```

### P02 甘特图 · Gantt chart

- 回答：各项工作何时开始、何时结束，哪些并行、哪些延期？
- 适用：新品上市计划、大促备货排期、项目里程碑；可标注今日线与状态。
- 不适用：任务 >25 条（按阶段汇总）。
- 输出：SVG；可不填 unit
- 字段：
  - `x`（text，必填）：任务名字段
  - `start / end`（date，必填）：开始与结束日期字段（YYYY-MM-DD）；里程碑 start = end
  - `group / status`（category，可选）：阶段分组与状态（done/active/planned/late）
- 选项：`today`、`group`、`status`
- 示例（数据截取前 3 行）：

```json
{"type":"P02","title":"上市计划：头程运输已标记延期，是 3 月 12 日上市前的关键环节","subtitle":"2026 年春季新品上市排期","x":"task","start":"start","end":"end","group":"phase","status":"status","today":"2026-01-20","data":[{"phase":"产品","task":"打样定稿","start":"2025-12-01","end":"2025-12-20","status":"done"},{"phase":"产品","task":"认证测试","start":"2025-12-15","end":"2026-01-10","status":"done"},{"phase":"供应链","task":"大货生产","start":"2026-01-05","end":"2026-01-31","status":"active"}],"source":"示例数据；BizOS 整理"}
```

## M · 小多图 / Small multiples

### M01 小多图（分面） · Small multiples

- 回答：同一指标在多个对象（站点、品类、SKU）上的走势/结构是否一致？
- 适用：超过 6 条序列时替代“意大利面”折线；默认共享纵轴，便于横向比较。
- 不适用：面板 >12（筛选重点）；需要看各自细节且量级差异巨大时设 sharedScale:false 并注明。
- 输出：SVG
- 字段：
  - `base`（type，必填）：底图类型：T01 / T02 / C02
  - `facet`（category，必填）：分面字段
  - `x / y`（fields，必填）：同底图字段
- 选项：`columns`、`sharedScale（默认 true）`、`highlight（面板名）`
- 示例（数据截取前 3 行）：

```json
{"type":"M01","base":"T01","facet":"market","x":"month","y":"sales","title":"六个站点中五个全年走高，日本站是唯一下滑的市场","subtitle":"各站点月度销售额（万美元），2025 年；纵轴刻度相同","unit":"万美元","format":"number:0","names":{"sales":"销售额"},"highlight":["日本"],"data":[{"market":"美国","month":"2025-01","sales":180},{"market":"美国","month":"2025-02","sales":192.3},{"market":"美国","month":"2025-03","sales":202.2}],"source":"示例数据；BizOS 整理"}
```

## E · 实验与统计 / Experiments & statistics

### E01 组间比较（逐点 + 误差线） · Group comparison (dots + error bars)

- 回答：几组实验结果的差异有多大，在统计上是否成立？
- 适用：小样本实验（每组 3–50 个重复）：处理与对照、剂量组、基因型；显示每个样本、均值或中位数与误差线，可由引擎计算并标注组间 P 值。
- 不适用：每组 >50 个样本（用 E02 或 D02）；只有汇总值、没有重复数据。
- 输出：SVG
- 字段：
  - `x`（category，必填）：组别（长表，每行一个样本）
  - `y`（measure，必填）：测量值（unit 必填）
  - `pair`（category，可选）：配对 ID：同一受试对象跨组连线，用于 paired-t
- 选项：`summary:"mean"|"median"`、`error:"sd"|"sem"|"ci95"|"iqr"|"range"`、`comparisons:[{a, b, p?}]`、`test:"welch"|"student"|"mannwhitney"|"paired-t"|说明文字`、`adjust:"holm"|"bonferroni"|"bh"`、`pStyle:"exact"|"stars"`、`bars`、`order`、`highlight`
- 示例（数据截取前 3 行）：

```json
{"type":"E01","title":"化合物 A 10 μM 使 LPS 诱导的 IL-6 下降 56%（P < 0.001），1 μM 无显著作用","subtitle":"巨噬细胞上清 IL-6 浓度（pg/mL），LPS 刺激 24 小时，每组 6 个生物学重复","x":"group","y":"il6","unit":"pg/mL","names":{"il6":"IL-6"},"error":"sd","test":"welch","adjust":"holm","comparisons":[{"a":"LPS","b":"溶剂对照"},{"a":"LPS","b":"LPS + 化合物 A 1 μM"},{"a":"LPS","b":"LPS + 化合物 A 10 μM"}],"data":[{"group":"溶剂对照","il6":47},{"group":"溶剂对照","il6":40},{"group":"溶剂对照","il6":59}],"source":"示例数据；BizOS 整理","notes":["化合物 A 于 LPS 刺激前 1 小时加入"]}
```

### E02 小提琴图 / 云雨图 · Violin / raincloud plot

- 回答：几组数据的分布形状（双峰、偏态、长尾）有何不同？
- 适用：每组 ≥20 个观测的分布比较：单细胞表达、患者指标、各批次测量；内嵌四分位箱与中位数，可叠加逐点或改为云雨图。
- 不适用：每组 <20 个（密度估计不稳，用 E01）；只需比较中位数（用 D02）。
- 输出：SVG
- 字段：
  - `x`（category，必填）：组别（长表）
  - `y`（measure，必填）：观测值（unit 必填）
- 选项：`style:"violin"|"raincloud"`、`points`、`scale:"width"|"area"`、`bwAdjust`、`comparisons / test / adjust / pStyle（同 E01）`、`order`、`highlight`
- 示例（数据截取前 3 行）：

```json
{"type":"E02","title":"NK 细胞 GZMB 表达中位数最高（2.9）；CD8⁺ T 细胞中 14% 几乎不表达，呈双峰","notes":["“几乎不表达”指 GZMB < 0.5"],"subtitle":"外周血单个核细胞单细胞测序，GZMB 表达量（log₂(CPM + 1)），每类随机抽取 120 个细胞","x":"cell","y":"gzmb","unit":"log₂(CPM + 1)","names":{"gzmb":"GZMB"},"data":[{"cell":"CD8⁺ T 细胞","gzmb":1.44},{"cell":"CD8⁺ T 细胞","gzmb":1.94},{"cell":"CD8⁺ T 细胞","gzmb":2.64}],"source":"示例数据；BizOS 整理"}
```

### E03 实验曲线（均值 ± 误差） · Experimental curves (mean ± error)

- 回答：各处理组的测量值随时间、剂量或温度如何变化，差异从何时出现？
- 适用：数值型横轴的重复测量：肿瘤生长、细菌生长曲线、药代动力学、标准曲线；引擎按组和横轴值汇总重复，误差线或误差带，可加线性拟合。
- 不适用：横轴为日期期间（用 T01）；剂量反应拟合 IC50（用 B02）。
- 输出：SVG
- 字段：
  - `x`（measure，必填）：数值横轴：时间、剂量、温度（xUnit 必填）
  - `y`（measure，必填）：测量值：每行一个重复，或配合 err 字段的组均值
  - `group`（category，可选）：处理组
  - `err`（measure，可选）：已汇总数据的误差半宽字段（须同时写明 error 含义）
- 选项：`error:"sd"|"sem"|"ci95"`、`errorStyle:"bar"|"band"`、`points`、`xLog / yLog`、`fit:"linear"`、`xUnit`、`refLines / bands（数值横轴）`、`highlight`
- 示例（数据截取前 3 行）：

```json
{"type":"E03","title":"第 21 天，化合物 B 30 mg/kg 组平均肿瘤体积较溶剂组低 68%，10 mg/kg 组低 44%","subtitle":"皮下异种移植瘤体积（mm³），每日一次口服给药，每组 8 只小鼠","x":"day","y":"vol","group":"group","xUnit":"天","unit":"mm³","error":"sem","names":{"day":"给药后天数","vol":"肿瘤体积"},"data":[{"day":0,"group":"溶剂","vol":92},{"day":3,"group":"溶剂","vol":147},{"day":7,"group":"溶剂","vol":213}],"source":"示例数据；BizOS 整理","notes":["肿瘤体积 = 长 × 宽² / 2"]}
```

### E04 森林图 · Forest plot

- 回答：各研究或亚组的效应量及其置信区间是多少，合并后效应是否成立、是否一致？
- 适用：Meta 分析、临床试验亚组分析、多因素回归结果（HR / OR / RR 对数刻度，MD 线性）；pool 由引擎按逆方差法合并并给出异质性。
- 不适用：没有置信区间的点估计（用 C01）；效应量口径不一致的研究混在一起。
- 输出：SVG；可不填 unit
- 字段：
  - `label`（category，必填）：研究或亚组名称；只有名称、没有估计值的行作为分组标题
  - `est / lo / hi`（interval，必填）：效应量与 95% CI 字段（默认 est、lo、hi）
  - `weight`（measure，可选）：权重（%）；pool 时自动计算
- 选项：`measure:"HR"|"OR"|"RR"|"IRR"|"MD"|"SMD"|"RD"`、`pool:"fixed"|"random"`、`columns:[{field, title}]`、`favors:[左侧含义, 右侧含义]`、`nullValue`、`decimals`、`labelTitle`、`行字段 pooled:true / indent`
- 示例（数据截取前 3 行）：

```json
{"type":"E04","title":"合并 7 项试验，治疗使不良结局的比值降低 46%（OR 0.54，95% CI 0.42–0.70）","subtitle":"各试验不良结局比值比（OR）及 95% CI；列为事件数/随机化人数","label":"study","measure":"OR","pool":"random","columns":[{"field":"trt","title":"治疗组"},{"field":"ctl","title":"对照组"}],"favors":["偏向治疗组","偏向对照组"],"labelTitle":"研究","data":[{"study":"示例研究 A（2016）","est":0.93,"lo":0.48,"hi":1.78,"trt":"20/163","ctl":"21/160"},{"study":"示例研究 B（2017）","est":0.4,"lo":0.28,"hi":0.59,"trt":"47/425","ctl":"99/420"},{"study":"示例研究 C（2018）","est":0.59,"lo":0.28,"hi":1.24,"trt":"14/85","ctl":"24/96"}],"source":"示例数据；BizOS 整理"}
```

### E05 ROC / PR 曲线 · ROC / precision–recall curve

- 回答：诊断指标或预测模型区分阳性与阴性的能力有多强，哪个模型更好？
- 适用：生物标志物、诊断试验、风险模型的判别力：引擎由原始得分计算 ROC、AUC 与 DeLong 95% CI，两模型可做配对 DeLong 检验；curve:"pr" 画精确率–召回率（阳性稀少时更合适）。
- 不适用：只有一个灵敏度/特异度点（用表格）；需要校准度评价（另画校准曲线）。
- 输出：SVG；可不填 unit
- 字段：
  - `outcome`（category，必填）：真实结局字段：1/0，或用 positive 指定阳性取值
  - `score`（measure，必填）：得分字段，或多个字段数组（每个一条曲线）；得分越高越倾向阳性
- 选项：`curve:"roc"|"pr"`、`positive`、`cutoff:"youden"`、`names`、`highlight`
- 示例（数据截取前 3 行）：

```json
{"type":"E05","title":"联合模型 AUC 0.86，高于单用标志物 A 的 0.78（配对 DeLong P = 0.0019）","subtitle":"区分病例与对照的 ROC 曲线；病例 120 例，对照 120 例","outcome":"case","score":["markerA","combined"],"names":{"markerA":"标志物 A","combined":"联合模型（A + B）"},"cutoff":"youden","data":[{"case":1,"markerA":0.49,"combined":1.67},{"case":1,"markerA":1.94,"combined":2.64},{"case":1,"markerA":3.15,"combined":2.8}],"source":"示例数据；BizOS 整理"}
```

### E06 一致性分析（Bland–Altman） · Bland–Altman agreement

- 回答：两种测量方法的结果是否一致：平均偏倚多大，95% 的差值落在什么范围？
- 适用：新旧检测方法、仪器、评分者之间的一致性；引擎计算偏倚、95% 一致性界限及其置信区间，并检验比例偏倚。
- 不适用：用相关系数判断一致性（相关高不代表一致）；两种方法单位不同。
- 输出：SVG
- 字段：
  - `a`（measure，必填）：方法 A 测量值字段（names 写方法名）
  - `b`（measure，必填）：方法 B 测量值字段（同一样本同一行）
- 选项：`diff:"absolute"|"percent"`、`limits:[下限, 上限]（临床可接受范围）`、`names`
- 示例（数据截取前 3 行）：

```json
{"type":"E06","title":"血糖仪平均偏高 0.13 mmol/L，95% 一致性界限 −0.58 至 0.84 mmol/L，在 ±1.0 可接受范围内","subtitle":"同一静脉血样本的血糖仪与实验室分析仪读数差值（mmol/L），60 份样本","a":"meter","b":"lab","unit":"mmol/L","format":"number:2","names":{"meter":"血糖仪","lab":"实验室分析仪"},"limits":[-1,1],"data":[{"meter":13.8,"lab":13.7},{"meter":16.6,"lab":16.1},{"meter":11.5,"lab":12}],"source":"示例数据；BizOS 整理","notes":["可接受范围 ±1.0 mmol/L 为示例设定"]}
```

### E07 Q-Q 图 · Q-Q plot

- 回答：数据（或残差）是否服从正态？关联检验的 P 值是否整体膨胀？
- 适用：mode:"normal" 检查正态性（残差、测量值）；mode:"pvalue" 检查全基因组或高通量检验的 P 值分布，给出 λGC 与 95% 置信带。
- 不适用：比较两组分布（用 E02）；样本 <10。
- 输出：SVG；可不填 unit
- 字段：
  - `y`（measure，必填）：观测值（normal）或 P 值字段（pvalue）
- 选项：`mode:"normal"|"pvalue"`、`threshold（pvalue 模式高亮阈值，默认 5e-8）`
- 示例（数据截取前 3 行）：

```json
{"type":"E07","title":"检验统计量整体无明显膨胀（λGC = 1.02），9 个检验达到全基因组显著","subtitle":"2,000 个位点关联检验的观测与期望 −log₁₀ P","mode":"pvalue","y":"p","data":[{"p":1.27e-9},{"p":1.88e-8},{"p":6.75e-8}],"source":"示例数据；BizOS 整理"}
```

### E08 相关矩阵 · Correlation matrix

- 回答：多个变量两两之间的相关方向与强度如何，哪些相关在统计上成立？
- 适用：由原始观测（每行一个样本）计算 Pearson 或 Spearman 相关与 P 值，下三角色阶展示；可做多重比较校正，不显著的格子留白。
- 不适用：只关心两个变量（用 R01）；变量 >16 个（先筛选）。
- 输出：SVG；可不填 unit
- 字段：
  - `vars`（measure[]，必填）：参与计算的数值字段数组（3–16 个）
- 选项：`method:"pearson"|"spearman"`、`sig（显著性阈值，默认 0.05；false 关闭）`、`adjust:"none"|"holm"|"bh"`、`names`
- 示例（数据截取前 3 行）：

```json
{"type":"E08","title":"HbA1c 与空腹血糖相关最强（r = 0.82），HDL-C 与甘油三酯负相关最明显（r = −0.61）","subtitle":"200 名成人 8 项心血管代谢指标的 Pearson 相关系数","vars":["age","bmi","sbp","fpg","a1c","tg","hdl","ldl"],"names":{"age":"年龄","bmi":"BMI","sbp":"收缩压","fpg":"空腹血糖","a1c":"HbA1c","tg":"甘油三酯","hdl":"HDL-C","ldl":"LDL-C"},"method":"pearson","adjust":"bh","data":[{"age":39,"bmi":30.2,"sbp":151,"fpg":6.1,"a1c":6,"tg":2.9,"hdl":1.04,"ldl":3.18},{"age":62,"bmi":27.9,"sbp":161,"fpg":5.8,"a1c":5.9,"tg":2.19,"hdl":1.48,"ldl":2.99},{"age":71,"bmi":27.4,"sbp":171,"fpg":7.1,"a1c":6.6,"tg":2.03,"hdl":0.98,"ldl":3.37}],"source":"示例数据；BizOS 整理"}
```

### E09 交集图（UpSet） · Set intersections (UpSet)

- 回答：多个集合之间各种交集（如几组差异基因的重叠）各有多少元素？
- 适用：3–8 个集合的重叠：差异基因、突变、客户群、关键词；精确的互斥交集计数，替代面积不准的韦恩图。
- 不适用：只有两个集合（用文字或 C03）；交集数量太多且都很小（先过滤）。
- 输出：SVG；可不填 unit
- 字段：
  - `set / item`（category，必填）：长表：每行一个“集合–元素”归属（默认字段 set、item）；或 intersections 预计算
- 选项：`intersections:[{sets:[…], count}] + setSizes`、`top（显示交集数，默认 16）`、`order（集合顺序）`
- 示例（数据截取前 3 行）：

```json
{"type":"E09","title":"干旱与盐胁迫共有的差异基因最多（93 个），4 种胁迫共有 19 个","subtitle":"4 种胁迫处理下差异表达基因的交集（共 678 个基因）","names":{"heat":"热胁迫","cold":"冷胁迫","drought":"干旱","salt":"盐胁迫"},"data":[{"set":"drought","item":"G0001"},{"set":"drought","item":"G0002"},{"set":"drought","item":"G0003"}],"source":"示例数据；BizOS 整理"}
```

## B · 生物医学与组学 / Biomedicine & omics

### B01 生存曲线（Kaplan–Meier） · Survival curve (Kaplan–Meier)

- 回答：随访期间各组的生存（或无事件）比例如何下降，中位生存期相差多少？
- 适用：临床与动物实验的时间–事件数据（总生存、无进展生存、复发、设备故障、客户流失）；引擎由逐例随访时间与结局计算 KM 曲线、删失标记、风险人数表、中位生存期与 log-rank 检验。
- 不适用：只有各时点汇总生存率（无法计算删失与检验，用 T01 并注明）；竞争风险明显时（需累积发生率曲线）。
- 输出：SVG；可不填 unit
- 字段：
  - `time`（measure，必填）：随访时间字段（timeUnit 必填）
  - `event`（category，必填）：结局字段：1 = 发生事件，0 = 删失
  - `group`（category，可选）：分组（≤6 组）
- 选项：`timeUnit`、`ci`、`riskTable`、`medianLines`、`landmarks:[12, 24]`、`hr:{value, lo, hi, label}`、`tickStep`、`xMax`、`yTitle`、`order`、`highlight`
- 示例（数据截取前 3 行）：

```json
{"type":"B01","title":"治疗组中位总生存期 23.8 个月，较对照组延长 11.8 个月（log-rank P < 0.001）","subtitle":"总生存 Kaplan–Meier 曲线，意向治疗人群，每组 150 例","time":"months","event":"death","group":"arm","order":["治疗组","对照组"],"timeUnit":"月","tickStep":6,"ci":true,"landmarks":[12,24],"hr":{"value":0.57,"lo":0.43,"hi":0.74,"label":"HR","method":"Cox 比例风险模型，治疗组 vs 对照组"},"data":[{"arm":"对照组","months":38,"death":0},{"arm":"对照组","months":8.1,"death":1},{"arm":"对照组","months":5.4,"death":1}],"source":"示例数据；BizOS 整理","medianName":"总生存期"}
```

### B02 剂量反应曲线（IC50 / EC50） · Dose–response curve (IC50 / EC50)

- 回答：化合物的效力如何（IC50 / EC50 是多少），几种化合物谁更强？
- 适用：细胞活力、酶抑制、受体激动等浓度梯度实验：引擎对全部重复做四参数 logistic 拟合，给出 IC50/EC50 与 95% CI、Hill 斜率，对数浓度轴。
- 不适用：浓度点 <5 个或未覆盖上下平台（IC50 不可靠）；时间进程（用 E03）。
- 输出：SVG
- 字段：
  - `x`（measure，必填）：浓度字段（>0；concUnit 必填）
  - `y`（measure，必填）：响应值（每行一个重复；unit 必填，如 %）
  - `group`（category，可选）：化合物 / 条件
- 选项：`concUnit`、`metric:"IC50"|"EC50"`、`constrain:{bottom, top}`、`error:"sd"|"sem"`、`fit:false`、`highlight`
- 示例（数据截取前 3 行）：

```json
{"type":"B02","title":"化合物 B 抑制作用最强，IC50 为 7.38 nM，效力约为参照药的 7.6 倍","subtitle":"肿瘤细胞系 72 小时细胞活力（% 溶剂对照），10 个浓度，每个浓度 3 个复孔","x":"nM","y":"viab","group":"cmpd","concUnit":"nM","unit":"%","error":"sd","names":{"viab":"细胞活力"},"data":[{"cmpd":"化合物 A","nM":0.1,"viab":99},{"cmpd":"化合物 A","nM":0.1,"viab":96.8},{"cmpd":"化合物 A","nM":0.1,"viab":98.3}],"source":"示例数据；BizOS 整理"}
```

### B03 火山图 / MA 图 · Volcano / MA plot

- 回答：处理前后哪些基因（蛋白、代谢物）显著上调或下调，幅度多大？
- 适用：差异表达、差异蛋白与代谢物：log₂ 倍数变化 × −log₁₀ P，阈值虚线、上下调计数、自动标注最显著的条目；mode:"ma" 画平均表达 × 倍数变化。
- 不适用：没有 P 值的倍数变化（用 C04）；条目 <30。
- 输出：SVG；可不填 unit
- 字段：
  - `x`（measure，必填）：log₂ 倍数变化字段
  - `p`（measure，必填）：P 值字段（建议校正 P；pType 说明）
  - `label`（category，可选）：基因 / 蛋白名称字段
  - `mean`（measure，可选）：MA 模式的平均表达字段
- 选项：`mode:"volcano"|"ma"`、`fcCut（默认 1）`、`pCut（默认 0.05）`、`pType:"adjusted"|"raw"`、`top（标注个数）`、`highlight（必标注的名称）`、`italic`、`xLog（MA）`
- 示例（数据截取前 3 行）：

```json
{"type":"B03","title":"处理后 77 个基因显著上调、65 个显著下调","subtitle":"处理组 vs 对照组差异表达：log₂ 倍数变化与 −log₁₀ 校正 P，1,500 个基因","x":"log2fc","p":"padj","label":"gene","pType":"adjusted","pMethod":"Wald 检验，Benjamini–Hochberg 校正","data":[{"gene":"G0001","log2fc":2.87,"padj":1.53e-12},{"gene":"G0002","log2fc":2.38,"padj":2.57e-11},{"gene":"G0003","log2fc":0.5,"padj":1.18e-9}],"source":"示例数据；BizOS 整理"}
```

### B04 曼哈顿图（GWAS） · Manhattan plot (GWAS)

- 回答：全基因组范围内哪些位点与性状显著关联，信号集中在哪些染色体？
- 适用：全基因组关联分析、eQTL、全外显子负担检验：按染色体位置排列 −log₁₀ P，全基因组显著与提示性阈值线，自动标注各染色体的领头位点。
- 不适用：少量候选位点（用 C01 或表格）；P 值未经质量控制。
- 输出：SVG；可不填 unit
- 字段：
  - `chr`（category，必填）：染色体（1–22、X、Y、MT，可带 chr 前缀）
  - `pos`（measure，必填）：位置（bp）
  - `p`（measure，必填）：P 值
  - `label`（category，可选）：位点 ID 或基因名（领头位点标注用）
- 选项：`threshold（默认 5e-8）`、`suggestive（默认 1e-5；false 关闭）`、`window（领头位点合并窗口 bp，默认 1,000,000）`、`build（参考基因组版本，写入注释）`
- 示例（数据截取前 3 行）：

```json
{"type":"B04","title":"2 个独立位点达到全基因组显著，最强信号位于 6 号染色体（P = 6.6×10⁻¹³）","subtitle":"全基因组关联分析，2,000 个位点的 −log₁₀ P，按染色体位置排列","chr":"chr","pos":"pos","p":"p","build":"GRCh38","data":[{"chr":"1","pos":2993142,"p":0.273},{"chr":"1","pos":3553459,"p":0.727},{"chr":"1","pos":4500769,"p":0.781}],"source":"示例数据；BizOS 整理"}
```

### B05 聚类热图 · Clustered heatmap

- 回答：样本和基因按表达谱如何聚类，哪些基因在哪组样本中高表达？
- 适用：表达矩阵（基因 × 样本）：按行 z 分数标准化，行列层次聚类并画树状图，顶部标注样本分组；也适用于蛋白、代谢物、患者特征矩阵。
- 不适用：行数 >300（先按方差筛选）；行列有固定顺序且不需聚类（用 H01）。
- 输出：SVG；可不填 unit
- 字段：
  - `row`（category，必填）：行（基因）字段
  - `x`（category，必填）：列（样本）字段
  - `y`（measure，必填）：数值（表达量，建议已 log 转换）
  - `colGroup`（category，可选）：样本分组字段（顶部注释色条）
- 选项：`scale:"row"|"none"`、`cluster:"both"|"rows"|"cols"|"none"`、`distance:"euclidean"|"correlation"`、`linkage:"average"|"complete"`、`clip（z 分数色阶截断，默认 2）`
- 示例（数据截取前 3 行）：

```json
{"type":"B05","title":"层次聚类第一层把 4 个对照样本与 8 个处理样本完全分开","subtitle":"30 个差异基因在 12 个样本中的表达（行 z 分数）","row":"gene","x":"sample","y":"expr","colGroup":"cond","names":{"expr":"表达量 log₂"},"data":[{"gene":"G01","sample":"C-1","cond":"对照","expr":8.26},{"gene":"G01","sample":"C-2","cond":"对照","expr":8.42},{"gene":"G01","sample":"C-3","cond":"对照","expr":6.98}],"source":"示例数据；BizOS 整理","italic":true}
```

### B06 降维图（PCA / UMAP / t-SNE） · Embedding (PCA / UMAP / t-SNE)

- 回答：样本或细胞按整体特征如何分群，处理组与对照组是否分开？
- 适用：转录组样本 PCA（轴上写解释方差，可加 95% 置信椭圆）、单细胞 UMAP / t-SNE（无坐标刻度，簇标签直接标在簇上）。坐标由分析软件计算后传入。
- 不适用：用 UMAP 簇间距离或簇大小下结论；只有两个原始变量（用 R01）。
- 输出：SVG；可不填 unit
- 字段：
  - `x / y`（measure，必填）：第 1、2 维坐标字段
  - `group`（category，可选）：分组或细胞类型
  - `label`（category，可选）：样本名（少量样本时可标注）
- 选项：`method:"pca"|"umap"|"tsne"|"other"`、`variance:[PC1%, PC2%]（PCA 必填）`、`ellipse`、`labelGroups`、`axisNames`、`highlight`
- 示例（数据截取前 3 行）：

```json
{"type":"B06","title":"PC1（41.3% 方差）将对照组与两个剂量组完全分开","subtitle":"24 个肝组织样本转录组主成分分析（前 2,000 个高变基因）","x":"pc1","y":"pc2","group":"group","label":"sample","method":"pca","variance":[41.3,18.7],"ellipse":true,"data":[{"sample":"C1","group":"对照","pc1":-14.3,"pc2":7},{"sample":"C2","group":"对照","pc1":-20.8,"pc2":5.4},{"sample":"C3","group":"对照","pc1":-21.6,"pc2":-0.3}],"source":"示例数据；BizOS 整理"}
```

### B07 系统发育树 / 聚类树 · Phylogenetic tree / dendrogram

- 回答：各物种、菌株或样本的亲缘关系如何，哪些聚为一支，支持度多高？
- 适用：由 Newick 字符串绘制矩形系统发育树：有枝长时按进化距离（附比例尺），节点显示自展支持率，叶片可按分组着色、可高亮一个分支；也可画样本聚类树。
- 不适用：叶片 >150 个（拆分或折叠分支）；需要无根树的径向布局。
- 输出：SVG；可不填 unit
- 字段：
  - `newick`（tree，必填）：Newick 字符串（内部节点标签为数字时视为支持率）
- 选项：`groups:{叶片: 分组}`、`clade:[叶片…]（阴影标出这些叶片最近共同祖先所在的分支）`、`supportMin（默认 70）`、`italic（物种名斜体）`、`unit（枝长单位，如“替换/位点”）`、`branchLengths:false（等深度聚类树）`
- 示例（数据截取前 3 行）：

```json
{"type":"B07","title":"12 株临床分离株聚为一个高支持分支（自展值 98），与环境株及参考株分开","subtitle":"核心基因组 SNP 最大似然树（20 株），节点为 1,000 次自展支持率","newick":"((((CL-01:0.004,CL-02:0.006)88:0.003,(CL-03:0.005,CL-04:0.004)92:0.002)95:0.006,((CL-05:0.007,CL-06:0.003)76:0.004,(CL-07:0.002,(CL-08:0.003,CL-09:0.004)81:0.002)90:0.003)85:0.005,(CL-10:0.006,(CL-11:0.004,CL-12:0.005)94:0.003)89:0.004)98:0.021,(((EN-01:0.011,EN-02:0.009)99:0.008,(EN-03:0.013,EN-04:0.010)72:0.006)84:0.012,((EN-05:0.014,EN-06:0.012)91:0.009,(Ref-1:0.018,Ref-2:0.016)100:0.011)67:0.007)100:0.015);","groups":{"CL-01":"临床分离株","CL-02":"临床分离株","CL-03":"临床分离株","CL-04":"临床分离株","CL-05":"临床分离株","CL-06":"临床分离株","CL-07":"临床分离株","CL-08":"临床分离株","CL-09":"临床分离株","CL-10":"临床分离株","CL-11":"临床分离株","CL-12":"临床分离株","EN-01":"环境分离株","EN-02":"环境分离株","EN-03":"环境分离株","EN-04":"环境分离株","EN-05":"环境分离株","EN-06":"环境分离株","Ref-1":"参考株","Ref-2":"参考株"},"clade":["CL-01","CL-12"],"unit":"替换/位点","source":"示例数据；BizOS 整理"}
```

### B08 突变棒棒糖图 · Mutation lollipop

- 回答：突变沿蛋白序列分布在哪里，是否集中在某个结构域或热点位点？
- 适用：肿瘤测序、遗传病变异、定点突变筛选：按氨基酸位置画突变数，下方为蛋白结构域，颜色区分突变类型，自动标注热点。
- 不适用：比较多个基因的突变负荷（用 C01）；缺少蛋白长度与结构域坐标。
- 输出：SVG；可不填 unit
- 字段：
  - `x`（measure，必填）：氨基酸位置字段（1…length）
  - `y`（measure，可选）：该行突变数（缺省时每行计 1）
  - `mutType`（category，可选）：突变类型字段（错义、截断、框内、剪接…）
  - `label`（category，可选）：氨基酸改变，如 R175H
- 选项：`length（蛋白长度 aa，必填）`、`domains:[{name, start, end}]`、`top（标注热点数，默认 5）`、`protein（蛋白名）`
- 示例（数据截取前 3 行）：

```json
{"type":"B08","title":"80% 的突变位于激酶结构域；R145 位点最多（34 例，其中 R145H 28 例）","subtitle":"示例队列 130 个体细胞突变沿 EXP1 蛋白（480 aa）的分布","x":"pos","y":"n","mutType":"type","label":"change","length":480,"protein":"示例蛋白 EXP1","domains":[{"name":"激酶结构域","start":60,"end":300},{"name":"调节结构域","start":340,"end":420}],"data":[{"pos":30,"change":"Q30*","n":3,"type":"截断"},{"pos":31,"change":"p.31","n":1,"type":"错义"},{"pos":78,"change":"p.78","n":2,"type":"错义"}],"source":"示例数据；BizOS 整理"}
```
