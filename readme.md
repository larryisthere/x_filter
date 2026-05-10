# X Strict Reply Filter

简体中文 | [English](#english)

## 简体中文

一个用于 X / Twitter 状态页的本地 userscript。它会在帖子详情页扫描主帖下方回复，并根据归一化文本和本地垃圾分数模型隐藏疑似垃圾回复。

## 适用场景

- 色情 / 约炮 / 同城资源引流回复
- 带随机字母数字尾巴的中文模板回复
- 大量 emoji 或替换符混淆的英文短笑话批量回复
- 回复内容中带有引流特征的垃圾回复

## 安装

1. 安装 Tampermonkey、Violentmonkey 或同类 userscript 管理器。
2. 推荐直接从 Greasy Fork 安装：<https://greasyfork.org/en/scripts/576877-x-strict-reply-filter>。
3. 也可以新建脚本并粘贴 `x-strict-reply-filter.user.js` 的全部内容。
4. 保存后打开 `https://x.com/*` 或 `https://twitter.com/*` 的帖子详情页。

脚本默认只过滤主帖下方的回复，不过滤主帖本身。

在帖子详情页隐藏到垃圾回复后，右下角会显示本帖当前已过滤数量。

## 核心配置

- `FILTER_MAIN_TWEET`: 是否过滤主帖。
- `SPAM_SCORE_THRESHOLD`: 垃圾分数阈值，默认 `7`。
- `SHOW_PLACEHOLDER`: 是否显示“已隐藏”占位卡片。

## 过滤策略

脚本先读取回复中的可见文本，然后执行：

1. Unicode NFKC 归一化，移除控制符、零宽字符、方向控制符和变体选择符。
2. 归一常见绕词，例如 `曰`、`艹`、繁体和拼音混写。
3. 计算本地垃圾分数，达到阈值后隐藏。

针对截图中的批量回复，`1.5.0` 新增了对“英文短笑话模板 + emoji / 替换符混淆”的高置信评分。它需要同时满足英文模板、emoji 泛滥或替换符等组合特征，避免单纯把普通英文回复误判为垃圾。

## 回归测试

真实漏网样本维护在 `tests/real-world-cases.json`。每次根据真实内容调整规则时，把样本按发现版本追加进去，然后运行：

```sh
node tests/run-real-world-cases.js
```

测试用例同时支持应隐藏的垃圾样本和不应隐藏的策略边界样本。

## 隐私

脚本完全在浏览器本地运行，不上传、不发送、不保存任何回复内容。开启 `SHOW_PLACEHOLDER` 后，页面内会临时保留原始 HTML 以支持恢复显示；刷新页面后这些临时数据会消失。

## English

[简体中文](#简体中文) | English

A local userscript for X / Twitter status pages. It scans replies below the main post and hides likely spam replies using normalized text and a local spam score model.

## Use Cases

- NSFW / hookup / local-service bait replies
- Chinese template replies with random letter or digit tails
- Batch English short-joke replies obfuscated with emoji or replacement characters
- Low-value replies with promotion or traffic-funneling signals

## Installation

1. Install Tampermonkey, Violentmonkey, or another userscript manager.
2. Recommended: install directly from Greasy Fork: <https://greasyfork.org/en/scripts/576877-x-strict-reply-filter>.
3. Alternatively, create a new script and paste the full contents of `x-strict-reply-filter.user.js`.
4. Save it, then open a post detail page under `https://x.com/*` or `https://twitter.com/*`.

By default, the script only filters replies below the main post. It does not filter the main post itself.

After spam replies are hidden on a post detail page, a floating counter in the bottom-right corner shows how many replies were filtered on the current thread.

## Core Config

- `FILTER_MAIN_TWEET`: Whether to filter the main post.
- `SPAM_SCORE_THRESHOLD`: Spam score threshold. Defaults to `7`.
- `SHOW_PLACEHOLDER`: Whether to show a "hidden" placeholder card.

## Filtering Strategy

The script first reads visible reply text, then:

1. Applies Unicode NFKC normalization and removes control characters, zero-width characters, direction-control characters, and variation selectors.
2. Normalizes common obfuscation, including `曰`, `艹`, traditional Chinese variants, and mixed pinyin spellings.
3. Calculates a local spam score and hides the reply when it reaches the threshold.

For the screenshot-style spam batches, `1.5.0` added high-confidence scoring for "English short-joke templates + emoji / replacement-character obfuscation". It requires a combination of template text, emoji flooding, replacement characters, or related structural signals, so ordinary English replies with emoji are not blocked by meaning alone.

## Regression Tests

Real missed-spam samples are maintained in `tests/real-world-cases.json`. Whenever rules are adjusted based on real content, append the sample under the version where it was found, then run:

```sh
node tests/run-real-world-cases.js
```

The test cases cover both spam samples that should be hidden and policy boundary samples that should not be hidden.

## Privacy

The script runs entirely in your browser. It does not upload, send, or store reply content. When `SHOW_PLACEHOLDER` is enabled, the page temporarily keeps the original HTML so hidden replies can be restored; this temporary data disappears after the page is refreshed.
