# X Strict Reply Filter

简体中文 | [English](#english)

## 简体中文

一个用于 X / Twitter 状态页的本地过滤器，提供 userscript 和 Chrome extension 两种本地安装形态。它会在帖子详情页扫描主帖下方回复，并根据归一化文本和本地垃圾分数模型隐藏疑似垃圾回复。

## 适用场景

- 色情 / 约炮 / 同城资源引流回复
- 带随机字母数字尾巴的中文模板回复
- 大量 emoji 或替换符混淆的英文短笑话批量回复
- 回复内容中带有引流特征的垃圾回复

## 安装 userscript 版

1. 安装 Tampermonkey、Violentmonkey 或同类 userscript 管理器。
2. 推荐直接从 Greasy Fork 安装：<https://greasyfork.org/en/scripts/576877-x-strict-reply-filter>。
3. 也可以新建脚本并粘贴 `userscript/x-strict-reply-filter.user.js` 的全部内容。
4. 保存后打开 `https://x.com/*` 或 `https://twitter.com/*` 的帖子详情页。

## 安装 Chrome extension 版

1. 打开 Chrome 的 `chrome://extensions`。
2. 开启开发者模式。
3. 选择“加载已解压的扩展程序”。
4. 选择本仓库的 `extension` 目录。
5. 打开 `https://x.com/*` 或 `https://twitter.com/*` 的帖子详情页。

第一版 Chrome extension 不提供 popup、options 或 side panel UI；安装后会按默认策略自动生效。

userscript 版和 Chrome extension 版建议二选一安装。如果同时安装，先启动的运行时会在页面上写入运行标记，后启动的一方会跳过，避免重复隐藏同一批回复。

默认只过滤主帖下方的回复，不过滤主帖本身。

在帖子详情页隐藏到垃圾回复后，右下角会显示本帖当前已过滤数量。

如需生成 Chrome Web Store 上传包，请在本地运行：

```sh
node scripts/build-distributions.js
mkdir -p dist
cd extension
zip -r ../dist/x-strict-reply-filter-chrome-1.6.0.zip manifest.json dist icons
```

生成的 zip 是发布产物，不提交到源码仓库。

## 默认策略

- 不过滤主帖。
- 垃圾分数阈值为 `7`。
- 不显示“已隐藏”占位卡片，直接隐藏命中的回复。

## 过滤策略

脚本先读取回复中的可见文本，然后执行：

1. Unicode NFKC 归一化，移除控制符、零宽字符、方向控制符和变体选择符。
2. 归一常见绕词，例如 `曰`、`艹`、繁体和拼音混写。
3. 计算本地垃圾分数，达到阈值后隐藏。

过滤采用统一的权重打分阈值模式：弱信号需要组合叠加，高置信信号可以单条达到默认阈值 `7`，但仍走同一套分数与调试原因输出。

针对截图中的批量回复，`1.5.0` 新增了对“英文短笑话模板 + emoji / 替换符混淆”的高置信评分。它需要同时满足英文模板、emoji 泛滥或替换符等组合特征，避免单纯把普通英文回复误判为垃圾。

## 回归测试

真实漏网样本维护在 `tests/real-world-cases.json`。每次根据真实内容调整规则时，把样本按发现版本追加进去，然后运行：

```sh
node scripts/build-distributions.js
node tests/run-real-world-cases.js
```

测试用例直接验证 `src` 下的共用规则内核和 X DOM 文本提取逻辑。发布文件由 `scripts/build-distributions.js` 生成到 `userscript/` 和 `extension/dist/`。

## 隐私

过滤器完全在浏览器本地运行，不上传、不发送、不保存任何回复内容。当前默认隐藏模式不会显示占位卡片；如果源码中开启占位卡片，页面内会临时保留原始 HTML 以支持恢复显示，刷新页面后这些临时数据会消失。

## English

[简体中文](#简体中文) | English

A local filter for X / Twitter status pages, available as both a userscript and a Chrome extension. It scans replies below the main post and hides likely spam replies using normalized text and a local spam score model.

## Use Cases

- NSFW / hookup / local-service bait replies
- Chinese template replies with random letter or digit tails
- Batch English short-joke replies obfuscated with emoji or replacement characters
- Low-value replies with promotion or traffic-funneling signals

## Userscript Installation

1. Install Tampermonkey, Violentmonkey, or another userscript manager.
2. Recommended: install directly from Greasy Fork: <https://greasyfork.org/en/scripts/576877-x-strict-reply-filter>.
3. Alternatively, create a new script and paste the full contents of `userscript/x-strict-reply-filter.user.js`.
4. Save it, then open a post detail page under `https://x.com/*` or `https://twitter.com/*`.

## Chrome Extension Installation

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose "Load unpacked".
4. Select this repository's `extension` directory.
5. Open a post detail page under `https://x.com/*` or `https://twitter.com/*`.

The first Chrome extension release does not expose a popup, options page, or side panel UI; it runs automatically with the default policy after installation.

Install either the userscript version or the Chrome extension version. If both are installed, the runtime that starts first marks the page, and the second runtime skips startup to avoid hiding the same replies twice.

By default, the filter only scans replies below the main post. It does not filter the main post itself.

After spam replies are hidden on a post detail page, a floating counter in the bottom-right corner shows how many replies were filtered on the current thread.

To generate the Chrome Web Store upload package locally, run:

```sh
node scripts/build-distributions.js
mkdir -p dist
cd extension
zip -r ../dist/x-strict-reply-filter-chrome-1.6.0.zip manifest.json dist icons
```

The generated zip is a release artifact and is not committed to the source repository.

## Default Policy

- Do not filter the main post.
- Use spam score threshold `7`.
- Hide matched replies directly without showing placeholder cards.

## Filtering Strategy

The script first reads visible reply text, then:

1. Applies Unicode NFKC normalization and removes control characters, zero-width characters, direction-control characters, and variation selectors.
2. Normalizes common obfuscation, including `曰`, `艹`, traditional Chinese variants, and mixed pinyin spellings.
3. Calculates a local spam score and hides the reply when it reaches the threshold.

Filtering uses a single weighted score threshold: weak signals must combine, while high-confidence signals can reach the default threshold `7` on their own. All decisions still use the same score and debug-reason output.

For the screenshot-style spam batches, `1.5.0` added high-confidence scoring for "English short-joke templates + emoji / replacement-character obfuscation". It requires a combination of template text, emoji flooding, replacement characters, or related structural signals, so ordinary English replies with emoji are not blocked by meaning alone.

## Regression Tests

Real missed-spam samples are maintained in `tests/real-world-cases.json`. Whenever rules are adjusted based on real content, append the sample under the version where it was found, then run:

```sh
node scripts/build-distributions.js
node tests/run-real-world-cases.js
```

The test runner validates the shared rule core and X DOM text extraction helpers under `src`. Distribution files are generated into `userscript/` and `extension/dist/` by `scripts/build-distributions.js`.

## Privacy

The filter runs entirely in your browser. It does not upload, send, or store reply content. The current default mode hides replies directly without placeholder cards; if placeholder mode is enabled in source, the page temporarily keeps the original HTML so hidden replies can be restored, and that temporary data disappears after refresh.
