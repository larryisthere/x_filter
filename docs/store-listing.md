# Chrome Web Store Listing

## Listing Fields

- Name: X Strict Reply Filter
- Summary: Hide likely spam replies on X/Twitter status pages with a local structural score model.
- Category: Social & Communication
- Primary language: English (United States)
- Additional localized language: Chinese (Simplified)
- Visibility recommendation for first submission: Unlisted, then switch to Public after a clean review and manual smoke test.

## Detailed Description

X Strict Reply Filter hides likely spam or NSFW-style replies on X/Twitter status pages.

It is designed for reply sections that attract repeated low-value bait, including adult-service prompts, local-resource funnels, compact emoji/code replies, emoji-broken English filler, and profile-name bait paired with generic content.

The filter runs entirely in your browser. It does not upload, send, sell, or store reply content.

How it works:

- Scans replies below the main post on X/Twitter status pages.
- Extracts visible reply text, including emoji image alt text when it affects obfuscated patterns.
- Normalizes common Unicode, emoji, and spelling obfuscation.
- Applies a local score model built around structural spam signals.
- Hides replies only when the score reaches a high-confidence threshold.

The filter avoids broad keyword-only blocking. Normal replies with ordinary language or trailing emoji are intended to stay visible.

Default behavior:

- The main post is not filtered.
- Matched replies are hidden directly.
- A small floating counter shows how many replies were hidden on the current thread.
- There is no popup, account, remote configuration, analytics, or cloud service.

## Privacy Practices

Suggested dashboard answers:

- Single purpose: Hide likely spam/NSFW-style replies on X/Twitter status pages using local structural scoring.
- Data collection: No user data is collected.
- Data sale: No data is sold.
- Data transfer unrelated to purpose: No data is transferred.
- Remote code: No remote code is loaded or executed.

Suggested permission explanation:

- Host permissions for `https://x.com/*` and `https://twitter.com/*` are required so the content script can read visible reply text on status pages and hide replies that match the local spam score model.

## Chinese (Simplified) Listing

- 名称：X Strict Reply Filter
- 简短说明：在 X/Twitter 帖子详情页用本地结构化评分隐藏疑似垃圾回复。
- 分类：Social & Communication
- 语言：中文（简体）

详细描述：

X Strict Reply Filter 用于隐藏 X/Twitter 帖子详情页中的疑似垃圾或 NSFW 引流回复。

它针对常见的回复区垃圾内容设计，例如成人服务引流、同城资源入口、短数字/emoji 代码、emoji 插入英文单词的批量填充回复，以及带有引流昵称的低价值回复。

过滤器完全在浏览器本地运行，不上传、不发送、不出售、不保存任何回复内容。

默认行为：

- 不过滤主帖。
- 命中的回复会直接隐藏。
- 右下角显示当前帖子已隐藏回复数量。
- 不包含 popup、账号系统、远程配置、统计分析或云服务。

过滤策略避免宽泛关键词封禁，普通英文、普通中文和正常带 emoji 的回复应保持可见。

## Assets

Required extension package icons:

- `extension/icons/icon-16.png`
- `extension/icons/icon-32.png`
- `extension/icons/icon-48.png`
- `extension/icons/icon-128.png`

Store listing assets:

- Icon: `docs/store-assets/store-icon-128.png`
- Screenshot 1: `docs/store-assets/screenshots/01-hide-spam-replies.png`
- Screenshot 2: `docs/store-assets/screenshots/02-fewer-false-positives.png`
- Screenshot 3: `docs/store-assets/screenshots/03-private-local-filtering.png`
- Optional small promotional image: `docs/store-assets/small-promo-440x280.png`

## Review Notes

Suggested reviewer instructions:

1. Install the extension.
2. Open a public X/Twitter status page with replies.
3. Scroll the reply list.
4. The extension automatically hides replies only when the local score model reaches the default threshold.
5. No login, account, server, or test credentials are required by the extension itself.
