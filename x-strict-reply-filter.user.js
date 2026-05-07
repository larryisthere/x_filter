// ==UserScript==
// @name         X Strict Reply Regex Filter
// @namespace    local.x.strict.reply.regex.filter
// @version      1.5.0
// @description  Strictly filter spam/NSFW-style replies on X/Twitter status pages using normalization, regex rules, and a local spam score model.
// @author       larryisthere
// @license      MIT
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const STRICT_MODE = true;

  /**
   * true  = 主帖也参与过滤
   * false = 只过滤主帖下面的回复
   */
  const FILTER_MAIN_TWEET = false;

  /**
   * 打分阈值。
   * 越低越严格，越容易误杀。
   *
   * 建议：
   * 6 = 很严格
   * 7 = 推荐严格
   * 8 = 稍微保守
   */
  const SPAM_SCORE_THRESHOLD = 7;

  const DEBUG = false;

  /**
   * true  = 显示“已隐藏”占位卡片
   * false = 直接隐藏
   */
  const SHOW_PLACEHOLDER = false;

  /**
   * 命中这些 @ 提及账号，直接隐藏。
   * 这里匹配的是回复内容里出现的 @账号，不是回复作者账号。
   */
  const BLOCKED_MENTION_ACCOUNTS = [
    'samubure',
    'dadi2412',
    'danitinahd',
    'xiaonm88',
  ];

  /**
   * 强规则：命中直接隐藏。
   * 这些规则作用于 normalized text。
   */
  const STRONG_FILTER_RULES = [
    {
  name: '同城约炮资源入口类',
  regex: /(同城约p|同城约炮|约炮入口|全推唯一约炮入口|真实同城约见|同城约见|同城约|约p)/u,
  strictOnly: false,
},
{
  name: '牵线资源自取类',
  regex: /(全国牵线|牵线|资源自取|1-5线资源|一到五线资源|点我主页|看我主页|看我置顶|真实对接|线下真实)/u,
  strictOnly: false,
},
{
  name: '置顶主页引流类',
  regex: /(点我主页|看我主页|主页自取|看我置顶|点我置顶|置顶.*资源|主页.*资源|主页.*入口)/u,
  strictOnly: false,
},
{
  name: '靠谱社区入口类',
  regex: /(靠谱社区|全推唯一靠谱社区|真实同城约见|同城资源|附近资源|同城入口)/u,
  strictOnly: false,
},
{
  name: '涩播类',
  regex: /(涩播|色播|准时涩播|今晚准时涩播|直播涩播|开播)/u,
  strictOnly: false,
},
{
  name: '母狗找主人类',
  regex: /(母狗找主人|母狗.*主人|母狗.*找|主人.*母狗)/u,
  strictOnly: false,
},
{
  name: '无偿线下类',
  regex: /(无偿线下|免费线下|线下无偿|线下免费|无偿约|免费约)/u,
  strictOnly: false,
},
{
  name: '短文本同城线下资源引流',
  regex: /^(?=.{0,120}$)(?=.*(同城|线下|资源|入口|社区|主页|置顶))(?=.*(约|炮|p|真实|对接|自取|见|牵线)).*/u,
  strictOnly: false,
},
    {
      name: '小狗求主人抱抱类',
      regex: /小狗求主人抱抱/u,
      strictOnly: false,
    },
    {
      name: '主人快来领我模板',
      regex: /(主人快来领我|快来领我|主人.*领我|主人.*认领)/u,
      strictOnly: false,
    },
    {
      name: '疼人哥哥模板',
      regex: /(想找会疼人的哥哥|会疼人的哥哥|疼人的哥哥|找.*疼人的哥哥)/u,
      strictOnly: false,
    },
    {
      name: '长期搭子引流',
      regex: /(找个长期搭子|长期搭子)/u,
      strictOnly: false,
    },
    {
      name: '比她好看没她骚模板',
      regex: /(比她好看的没她骚|比她骚的没她好看|好看的没她骚|骚的没她好看|没她骚|她骚)/u,
      strictOnly: false,
    },
    {
      name: '好涩我不行了模板',
      regex: /(她好涩|好涩我不行了|我不行了|好涩|好色|好澀)/u,
      strictOnly: false,
    },
    {
      name: '弟弟线下模板',
      regex: /(有弟弟线下吗|弟弟线下吗|找弟弟线下|弟弟.*线下|线下.*弟弟)/u,
      strictOnly: false,
    },
    {
      name: '小狗在线找主人模板',
      regex: /(小狗在线找主人|小狗.*找主人|在线找主人|找主人)/u,
      strictOnly: false,
    },
    {
      name: '小狗想跟你玩模板',
      regex: /(小狗想跟你玩|小狗.*跟你玩|小狗.*想玩|小狗.*陪你玩|小狗.*玩)/u,
      strictOnly: false,
    },
    {
      name: '线下色情引流',
      regex: /(线下.*(骚货|sao货|骚|日过|曰过|操过|约过|可约|能约|上过|睡过))/u,
      strictOnly: false,
    },
    {
      name: '主页打飞机类',
      regex: /(刷了半天.*主页.*打飞机|主页.*能打飞机|主页.*可以打飞机|主页.*能冲|主页.*可以冲)/u,
      strictOnly: false,
    },
    {
      name: '骚货混写',
      regex: /(sao货|骚货|骚huo|saohuo|没人比她sao|没人比她骚)/u,
      strictOnly: false,
    },
    {
      name: '短文本带@色情引流',
      regex: /^(?=.{0,150}$)(?=.*@)(?=.*(骚货|sao货|骚|好涩|涩|色|不行了|日过|曰过|操过|约过|打飞机|可约|能约|主页能打飞机|没她骚|她骚|好看)).*/u,
      strictOnly: false,
    },
    {
      name: '随机字母数字尾巴垃圾回复',
      regex: /^(?=.{0,100}$).*(小狗求主人抱抱|主人快来领我|快来领我|想找会疼人的哥哥|找个长期搭子|有弟弟线下吗|小狗在线找主人|小狗想跟你玩|线下.*骚货|线下.*sao货|主页.*打飞机|比她好看的没她骚|她好涩|好涩我不行了)[a-z0-9]{0,8}$/u,
      strictOnly: false,
    },

    {
      name: '严格：短回复含主人恋爱引流',
      regex: /^(?=.{0,90}$)(?=.*主人)(?=.*(领我|抱抱|快来|疼我|宠我|要我|认领|找主人)).*/u,
      strictOnly: true,
    },
    {
      name: '严格：短回复含小狗主人玩耍引流',
      regex: /^(?=.{0,90}$)(?=.*小狗)(?=.*(主人|找主人|在线|跟你玩|想玩|陪我玩|陪你玩|抱抱|领我|认领)).*/u,
      strictOnly: true,
    },
    {
      name: '严格：短回复含哥哥弟弟线下引流',
      regex: /^(?=.{0,90}$)(?=.*(哥哥|弟弟))(?=.*(线下|想找|会疼人|疼人|宠我|疼我|来找我|领我)).*/u,
      strictOnly: true,
    },
    {
      name: '严格：短回复含线下暧昧引流',
      regex: /^(?=.{0,100}$)(?=.*线下)(?=.*(弟弟|哥哥|姐姐|妹妹|小狗|主人|搭子|玩|找|约|骚|sao)).*/u,
      strictOnly: true,
    },
    {
      name: '严格：短回复带@和骚涩词',
      regex: /^(?=.{0,130}$)(?=.*@)(?=.*(骚|涩|色|约|飞机|不行了|好看|疼人|主人|哥哥|弟弟)).*/u,
      strictOnly: true,
    },
  ];

  function isStatusPage() {
    return /^\/[^/]+\/status\/\d+/.test(location.pathname);
  }

  function normalizePath(pathname) {
    return pathname.replace(/\/+$/, '');
  }

  function getCurrentStatusPath() {
    const path = normalizePath(location.pathname);
    const match = path.match(/^\/([^/]+)\/status\/(\d+)/);
    if (!match) return null;
    return `/${match[1]}/status/${match[2]}`;
  }

  function getTweetPermalinkPath(article) {
    const time = article.querySelector('time');
    const link = time?.closest('a[href*="/status/"]');

    if (!link || !link.href) return null;

    try {
      const url = new URL(link.href);
      return normalizePath(url.pathname);
    } catch {
      return null;
    }
  }

  function getTweetCell(article) {
    return (
      article.closest('[data-testid="cellInnerDiv"]') ||
      article.closest('[role="article"]') ||
      article
    );
  }

  function getVisibleTweetText(article) {
    const tweetTextNodes = Array.from(
      article.querySelectorAll('[data-testid="tweetText"]')
    );

    if (tweetTextNodes.length > 0) {
      return tweetTextNodes
        .map((node) => node.innerText || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return (article.innerText || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeTextForFilter(text) {
    return (text || '')
      .normalize('NFKC')

      // 控制字符、零宽字符、方向控制符、变体选择符
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5]/g, '')
      .replace(/[\u180B-\u180F\u200B-\u200F\u202A-\u202E]/g, '')
      .replace(/[\u2060-\u206F\u3164\uFE00-\uFE0F\uFEFF]/g, '')
      .replace(/[\uFFA0]/g, '')

      // 常见绕词归一
      .replace(/曰/g, '日')
      .replace(/艹/g, '操')
      .replace(/草/g, '操')
      .replace(/肏/g, '操')
      .replace(/騷/g, '骚')
      .replace(/骚貨/g, '骚货')
      .replace(/貨/g, '货')
      .replace(/約/g, '约')
      .replace(/澀/g, '涩')
      .replace(/飛機/g, '飞机')
      .replace(/飛/g, '飞')

      // 常见拼音 / 半绕词
      .replace(/saohuo/g, 'sao货')
      .replace(/sao貨/g, 'sao货')

      // emoji / 符号转义
      .replace(/[✈🛩]/g, '飞机')

      // 只保留中文、英文、数字、@
      .replace(/[^\p{Script=Han}a-zA-Z0-9@]/gu, '')

      .toLowerCase();
  }

  function countEmoji(text) {
    try {
      return [...(text || '')].filter((ch) => /\p{Extended_Pictographic}/u.test(ch)).length;
    } catch {
      return 0;
    }
  }

  function countReplacementMarkers(text) {
    return (String(text || '').match(/\uFFFD/g) || []).length;
  }

  function countLatinLetters(text) {
    return (String(text || '').match(/[a-z]/gi) || []).length;
  }

  function hasHan(text) {
    return /\p{Script=Han}/u.test(text);
  }

  function addScore(result, points, reason) {
    result.score += points;
    result.reasons.push(`${reason}+${points}`);
  }

  function getSpamScore(originalText) {
    const raw = originalText || '';
    const text = normalizeTextForFilter(raw);

    const result = {
      score: 0,
      reasons: [],
      normalizedText: text,
    };

    if (!text) return result;

    const length = text.length;
    const emojiCount = countEmoji(raw);
    const replacementMarkerCount = countReplacementMarkers(raw);
    const latinLetterCount = countLatinLetters(raw);
    const rawCharCount = [...raw].length || 1;

    const hasMention = /@[a-z0-9_]{3,20}/i.test(text);
    const hasRandomLatinSuffix = /[a-z]{1,8}$/i.test(text) && hasHan(text);
    const hasRandomAlphaNumSuffix = /[a-z0-9]{1,8}$/i.test(text) && hasHan(text);
    const isLatinDominant = latinLetterCount >= 18 && latinLetterCount / rawCharCount >= 0.35;
    const hasEmojiFlood = emojiCount >= 5 || emojiCount / rawCharCount >= 0.12;

    const relationshipBait = /(主人|哥哥|弟弟|姐姐|妹妹|小狗|抱抱|领我|认领|疼人|疼我|宠我|搭子|会疼人|单身哥哥|单身姐姐|真人)/u;
    const actionBait = /(快来|找个|想找|在线找|来找|看她|主页|点我主页|看我主页|看我置顶|置顶|线下|私信|加我|跟你玩|想玩|陪你玩|陪我玩|来领|资源自取|真实对接|同城约见|同城|牵线|入口|社区|自取)/u;
    const nsfwBait = /(骚|sao|骚货|sao货|涩|色|好涩|好色|涩播|色播|约|约p|约炮|炮|可约|能约|日过|操过|睡过|打飞机|能冲|不行了|没她骚|她骚|母狗|无偿线下|免费线下)/u;
    const templateBait = /(小狗求主人抱抱|主人快来领我|快来领我|想找会疼人的哥哥|有弟弟线下吗|小狗在线找主人|小狗想跟你玩|找个长期搭子|比她好看的没她骚|她好涩我不行了|全国牵线|资源自取|点我主页|看我置顶|同城约p|同城约炮|真实对接|约炮入口|线下真实|靠谱社区|真实同城约见|今晚准时涩播|母狗找主人|无偿线下)/u;
    const englishJokeTemplate = /\b(?:why\s+did|i\s+tried\s+to|i\s+tried|why\s+was|why\s+is)\b/i;
    const englishPunchlineTemplate = /\b(?:it\s+was|he\s+sang|she\s+sang|because|so\s+it|now\s+the)\b/i;

    if (length <= 40) addScore(result, 2, 'very short text');
    else if (length <= 80) addScore(result, 1, 'short text');

    if (emojiCount >= 3) addScore(result, 2, 'many emoji');
    else if (emojiCount >= 1) addScore(result, 1, 'has emoji');

    if (replacementMarkerCount >= 2) addScore(result, 2, 'replacement markers');
    else if (replacementMarkerCount >= 1) addScore(result, 1, 'replacement marker');

    if (hasMention) addScore(result, 3, 'contains mention');

    if (hasRandomLatinSuffix) addScore(result, 2, 'random latin suffix');
    else if (hasRandomAlphaNumSuffix) addScore(result, 1, 'random alnum suffix');

    if (relationshipBait.test(text)) addScore(result, 3, 'relationship bait words');
    if (actionBait.test(text)) addScore(result, 2, 'action bait words');
    if (nsfwBait.test(text)) addScore(result, 4, 'nsfw bait words');
    if (templateBait.test(text)) addScore(result, 5, 'known spam template');

    // 高置信组合：英文短笑话模板 + emoji / 替换符混淆。
    if (
      length <= 220 &&
      isLatinDominant &&
      englishJokeTemplate.test(raw) &&
      (englishPunchlineTemplate.test(raw) || replacementMarkerCount >= 1) &&
      (hasEmojiFlood || replacementMarkerCount >= 2)
    ) {
      addScore(result, 7, 'emoji obfuscated english joke template');
    }

    // 高置信组合：拉丁文本主体 + emoji 泛滥 + 替换符，常见于批量号绕过文本过滤。
    if (
      length <= 240 &&
      isLatinDominant &&
      emojiCount >= 3 &&
      replacementMarkerCount >= 1
    ) {
      addScore(result, 5, 'latin emoji replacement spam combo');
    }

    // 高置信组合：短文本 + 真人/认识/单身 bait + 随机尾巴
    if (
      length <= 100 &&
      hasRandomAlphaNumSuffix &&
      /(真人|认识|认识一下|来个|有没有|有没|单身)/u.test(text)
    ) {
      addScore(result, 4, 'social dating bait random suffix combo');
    }

    // 高置信组合：短文本 + 小狗 + 主人/玩/找
    if (
      length <= 100 &&
      /小狗/u.test(text) &&
      /(主人|找主人|跟你玩|想玩|陪你玩|陪我玩|抱抱|认领|领我)/u.test(text)
    ) {
      addScore(result, 5, 'short puppy owner play combo');
    }

    // 高置信组合：短文本 + 线下 + 哥哥/弟弟/玩/约
    if (
      length <= 100 &&
      /线下/u.test(text) &&
      /(哥哥|弟弟|姐姐|妹妹|玩|找|约|可约|能约|骚|sao)/u.test(text)
    ) {
      addScore(result, 5, 'offline bait combo');
    }

    // 高置信组合：短文本 + @ + 色情/暧昧词
    if (
      length <= 150 &&
      hasMention &&
      /(骚|sao|涩|色|约|飞机|不行了|好看|主人|哥哥|弟弟|小狗|疼人)/u.test(text)
    ) {
      addScore(result, 5, 'short mention bait combo');
    }

    // 高置信组合：短文本 + 末尾随机尾巴 + 关系/线下 bait
    if (
      length <= 100 &&
      hasRandomAlphaNumSuffix &&
      /(主人|哥哥|弟弟|姐姐|妹妹|小狗|搭子|线下|抱抱|领我|找主人|跟你玩|想玩|疼人)/u.test(text)
    ) {
      addScore(result, 4, 'random suffix bait combo');
    }

    // 高置信组合：主页 + 性暗示
    if (
      length <= 150 &&
      /主页/u.test(text) &&
      /(骚|sao|涩|色|飞机|冲|能打|不行了)/u.test(text)
    ) {
      addScore(result, 5, 'profile nsfw bait combo');
    }

    // 高置信组合：短文本 + 同城/线下 + 约炮/资源/入口
    if (
      length <= 150 &&
      /(同城|线下|附近|全国牵线|牵线)/u.test(text) &&
      /(约|约p|约炮|炮|资源|入口|对接|真实|见|自取)/u.test(text)
    ) {
      addScore(result, 6, 'local dating resource bait combo');
    }

    // 高置信组合：主页/置顶 + 资源/入口/对接
    if (
      length <= 150 &&
      /(主页|点我主页|看我主页|置顶|看我置顶|点我置顶)/u.test(text) &&
      /(资源|入口|对接|自取|约|炮|涩|色|社区)/u.test(text)
    ) {
      addScore(result, 6, 'profile pinned resource bait combo');
    }

    // 高置信组合：短文本 + 涩播/直播 bait
    if (
      length <= 120 &&
      /(涩播|色播|准时涩播|今晚准时涩播|开播|直播)/u.test(text)
    ) {
      addScore(result, 6, 'live nsfw bait combo');
    }

    // 高置信组合：母狗/主人 bait
    if (
      length <= 120 &&
      /(母狗|小狗)/u.test(text) &&
      /(主人|找主人|认领|领我)/u.test(text)
    ) {
      addScore(result, 6, 'pet owner nsfw bait combo');
    }

    // 高置信组合：无偿/免费 + 线下/约
    if (
      length <= 120 &&
      /(无偿|免费)/u.test(text) &&
      /(线下|约|约p|约炮|见|同城)/u.test(text)
    ) {
      addScore(result, 6, 'free offline dating bait combo');
    }

    return result;
  }

  function buildMentionRegex() {
    if (!BLOCKED_MENTION_ACCOUNTS.length) return null;

    const escaped = BLOCKED_MENTION_ACCOUNTS
      .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    return new RegExp(`@(?:${escaped})`, 'iu');
  }

  const BLOCKED_MENTION_REGEX = buildMentionRegex();

  function matchRules(originalText) {
    const text = normalizeTextForFilter(originalText);
    if (!text) return null;

    if (BLOCKED_MENTION_REGEX && BLOCKED_MENTION_REGEX.test(text)) {
      return {
        name: 'blocked mentioned account',
        normalizedText: text,
      };
    }

    for (const rule of STRONG_FILTER_RULES) {
      if (rule.strictOnly && !STRICT_MODE) continue;

      if (rule.regex.test(text)) {
        return {
          name: rule.name,
          normalizedText: text,
        };
      }
    }

    const spam = getSpamScore(originalText);

    if (spam.score >= SPAM_SCORE_THRESHOLD) {
      return {
        name: `spam score ${spam.score}: ${spam.reasons.join(', ')}`,
        normalizedText: spam.normalizedText,
      };
    }

    return null;
  }

  function hideReply(article, matchedRule) {
    const cell = getTweetCell(article);

    if (cell.dataset.xStrictReplySpamScoreFiltered === '1') return;

    const originalText = getVisibleTweetText(article);
    const originalHtml = cell.innerHTML;

    cell.dataset.xStrictReplySpamScoreFiltered = '1';
    cell.dataset.xStrictReplySpamScoreRule = matchedRule.name;
    cell.dataset.xStrictReplySpamScoreOriginalText = originalText;
    cell.dataset.xStrictReplySpamScoreOriginalHtml = originalHtml;

    if (SHOW_PLACEHOLDER) {
      cell.innerHTML = `
        <div style="
          padding: 12px 16px;
          margin: 4px 0;
          font-size: 13px;
          color: #71767b;
          border-bottom: 1px solid rgba(239,243,244,0.12);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        ">
          <div style="margin-bottom: 8px;">
            Hidden suspected spam reply: ${escapeHtml(matchedRule.name)}
          </div>
          <button data-x-filter-action="restore" style="
            margin-right: 8px;
            padding: 4px 8px;
            border-radius: 999px;
            border: 1px solid #536471;
            background: transparent;
            color: #e7e9ea;
            cursor: pointer;
          ">
            Restore
          </button>
          <button data-x-filter-action="copy" style="
            padding: 4px 8px;
            border-radius: 999px;
            border: 1px solid #536471;
            background: transparent;
            color: #e7e9ea;
            cursor: pointer;
          ">
            Copy report info
          </button>
        </div>
      `;
    } else {
      cell.style.display = 'none';
    }

    if (DEBUG) {
      console.log('[X Strict Reply Spam Score Filter] hidden:', matchedRule.name);
      console.log('[original]', originalText);
      console.log('[normalized]', matchedRule.normalizedText);
    }
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function scan() {
    if (!isStatusPage()) return;

    const currentStatusPath = getCurrentStatusPath();
    if (!currentStatusPath) return;

    const articles = Array.from(
      document.querySelectorAll('article[data-testid="tweet"]')
    );

    if (!articles.length) return;

    let mainTweetIndex = articles.findIndex((article) => {
      const permalinkPath = getTweetPermalinkPath(article);
      return permalinkPath === currentStatusPath;
    });

    if (mainTweetIndex < 0) {
      mainTweetIndex = 0;
    }

    articles.forEach((article, index) => {
      if (!FILTER_MAIN_TWEET) {
        if (index <= mainTweetIndex) return;
      } else {
        if (index < mainTweetIndex) return;
      }

      const cell = getTweetCell(article);
      if (cell.dataset.xStrictReplySpamScoreFiltered === '1') return;

      const text = getVisibleTweetText(article);
      if (!text) return;

      const matchedRule = matchRules(text);
      if (!matchedRule) return;

      hideReply(article, matchedRule);
    });
  }

  document.addEventListener('click', async function (event) {
    const button = event.target.closest('[data-x-filter-action]');
    if (!button) return;

    const cell =
      button.closest('[data-testid="cellInnerDiv"]') ||
      button.closest('[role="article"]') ||
      button.closest('div');

    if (!cell) return;

    const action = button.dataset.xFilterAction;

    if (action === 'restore') {
      const html = cell.dataset.xStrictReplySpamScoreOriginalHtml;
      if (html) {
        cell.innerHTML = html;
        cell.dataset.xStrictReplySpamScoreFiltered = '0';
      }
      return;
    }

    if (action === 'copy') {
      const text = cell.dataset.xStrictReplySpamScoreOriginalText || '';
      const rule = cell.dataset.xStrictReplySpamScoreRule || '';

      const reportText = [
        'Suspected spam / NSFW bait reply',
        `Matched rule: ${rule}`,
        `Page: ${location.href}`,
        '',
        'Reply text:',
        text,
      ].join('\n');

      try {
        await navigator.clipboard.writeText(reportText);
        button.textContent = 'Copied';
        setTimeout(() => {
          button.textContent = 'Copy report info';
        }, 1500);
      } catch {
        console.log(reportText);
        button.textContent = 'Copy failed, check console';
      }
    }
  });

  let scanTimer = null;
  let lastUrl = location.href;

  function scheduleScan(delay = 150) {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, delay);
  }

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      scheduleScan(600);
    } else {
      scheduleScan(150);
    }
  });

  function start() {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    window.addEventListener('scroll', () => scheduleScan(100), { passive: true });
    window.addEventListener('popstate', () => scheduleScan(300));
    window.addEventListener('focus', () => scheduleScan(300));

    scheduleScan(300);
    scheduleScan(1000);
    scheduleScan(2500);

    if (DEBUG) {
      console.log('[X Strict Reply Spam Score Filter] loaded:', location.href);
    }
  }

  if (document.documentElement) {
    start();
  } else {
    window.addEventListener('DOMContentLoaded', start, { once: true });
  }
})();
