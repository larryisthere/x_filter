// ==UserScript==
// @name         X Strict Reply Filter
// @namespace    local.x.strict.reply.filter
// @version      1.5.19
// @description  Strictly filter spam/NSFW-style replies on X/Twitter status pages using normalization, structural signals, and a local spam score model.
// @author       larryisthere
// @license      MIT
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

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

  const FILTER_COUNTER_ATTR = 'data-x-strict-reply-filter-counter';
  const FLOATING_COUNTER_FALLBACK_SIZE = 54;
  const FLOATING_COUNTER_GAP = 14;

  let activeStatusPath = null;
  let hiddenReplyKeys = new Set();

  const TEXT_PATTERNS = {
    mention: /@[a-z0-9_]{3,20}/i,
    relationshipBait: /(主人|哥哥|弟弟|姐姐|妹妹|小狗|抱抱|领我|认领|疼人|疼我|宠我|搭子|会疼人|单身哥哥|单身姐姐|真人)/u,
    actionBait: /(快来|找个|想找|在线找|来找|看她|主页|点我主页|看我主页|看我置顶|置顶|线下|私信|加我|跟你玩|想玩|陪你玩|陪我玩|来领|资源自取|真实对接|同城约见|同城|牵线|入口|社区|自取)/u,
    nsfwBait: /(骚|sao|骚货|sao货|涩|色|好涩|好色|涩播|色播|约|约p|约炮|炮|可约|能约|日过|操过|睡过|打飞机|能冲|不行了|没她骚|她骚|母狗|无偿线下|免费线下)/u,
    templateBait: /(小狗求主人抱抱|主人快来领我|快来领我|主人.*领我|主人.*认领|想找会疼人的哥哥|会疼人的哥哥|疼人的哥哥|找.*疼人的哥哥|有弟弟线下吗|找弟弟线下|小狗在线找主人|小狗想跟你玩|找个长期搭子|长期搭子|比她好看的没她骚|比她骚的没她好看|好看的没她骚|骚的没她好看|没她骚|没人比她sao|没人比她骚|sao货|骚货|骚huo|她好涩|好涩我不行了|全国牵线|资源自取|1-5线资源|一到五线资源|点我主页|看我主页|主页自取|看我置顶|点我置顶|同城约p|同城约炮|真实对接|约炮入口|线下真实|靠谱社区|真实同城约见|今晚准时涩播|母狗找主人|无偿线下)/u,
    englishJoke: /\b(?:why\s+did|i\s+tried\s+to|i\s+tried|why\s+was|why\s+is)\b/i,
    englishPunchline: /\b(?:it\s+was|he\s+sang|she\s+sang|because|so\s+it|now\s+the)\b/i,
    englishJokeSkeleton: /(?:whydid|whywas|whyis|itriedto|itried)/,
    englishPunchlineSkeleton: /(?:itwas|hesang|shesang|because|soit|nowthe|nowim|itsaid|laughingstock|alreadyfull|overworked|offkey)/,
    knownEnglishJokeSpamSkeleton: /(?:itriedtoplayfootballitrippedovertheballnowimalaughingstock|itriedtochargemyphoneitsaidimalreadyfullofyourmemes)/,
    chineseFillerTemplate: /(赴暖而行无半分寒凉|岁月温柔从未有彷徨|岁月安然万事皆可期|清风携喜漫过朝暮间|风暖岁安事事皆顺遂)/u,
  };

  const PROFILE_PATTERNS = {
    datingBait: /(无偿|免费|骚|sao|涩|涩播|色播|单男|找单男|想找单男|线下|chu男|处男|破处|固炮|合欢宗|母狗|找主人|全国安排|同城速配|速配)/u,
    strongDatingBait: /(想找单男|找单男|无偿线下|免费线下|chu男无偿|处男无偿|无偿.*线下|线下.*无偿|免费破处|破处|准时涩播|准时色播|涩播|色播|固炮|合欢宗|母狗找主人|母狗.*主人|全国安排)/u,
    localResourceCta: /(主页|点我主页|看我主页|置顶|看我置顶|点我置顶|进群|同城|附近|附近牵线|牵线|约见|资源入口|真实资源|真实对接|真实可靠对接|全国1-5线|1-5线)/u,
    drugBait: /(催情|迷药|春药)/u,
  };

  const SCORE_RULES = [
    {
      points: 2,
      reason: 'very short text',
      test: ({ length }) => length <= 40,
    },
    {
      points: 1,
      reason: 'short text',
      test: ({ length }) => length > 40 && length <= 80,
    },
    {
      points: 2,
      reason: 'many emoji',
      test: ({ emojiCount }) => emojiCount >= 3,
    },
    {
      points: 7,
      reason: 'short digit emoji code spam',
      test: ({ length, text, emojiCount, latinLetterCount }) =>
        length >= 1 &&
        length <= 8 &&
        /^[a-z0-9]+$/i.test(text) &&
        /\d/.test(text) &&
        !hasHan(text) &&
        emojiCount >= 3 &&
        latinLetterCount <= 4 &&
        (latinLetterCount >= 1 || /^\d{1,2}$/.test(text)),
    },
    {
      points: 7,
      reason: 'emoji-only short reply',
      test: ({ length, emojiCount, rawCharCount }) =>
        length === 0 &&
        emojiCount >= 3 &&
        rawCharCount <= 12,
    },
    {
      points: 1,
      reason: 'has emoji',
      test: ({ emojiCount }) => emojiCount >= 1 && emojiCount < 3,
    },
    {
      points: 2,
      reason: 'replacement markers',
      test: ({ replacementMarkerCount }) => replacementMarkerCount >= 2,
    },
    {
      points: 1,
      reason: 'replacement marker',
      test: ({ replacementMarkerCount }) => replacementMarkerCount === 1,
    },
    {
      points: 3,
      reason: 'contains mention',
      test: ({ hasMention }) => hasMention,
    },
    {
      points: 2,
      reason: 'random latin suffix',
      test: ({ hasRandomLatinSuffix }) => hasRandomLatinSuffix,
    },
    {
      points: 2,
      reason: 'random latin prefix',
      test: ({ hasRandomLatinPrefix }) => hasRandomLatinPrefix,
    },
    {
      points: 1,
      reason: 'random alnum suffix',
      test: ({ hasRandomLatinSuffix, hasRandomAlphaNumSuffix }) =>
        !hasRandomLatinSuffix && hasRandomAlphaNumSuffix,
    },
    {
      points: 3,
      reason: 'relationship bait words',
      test: ({ text }) => TEXT_PATTERNS.relationshipBait.test(text),
    },
    {
      points: 2,
      reason: 'action bait words',
      test: ({ text }) => TEXT_PATTERNS.actionBait.test(text),
    },
    {
      points: 4,
      reason: 'nsfw bait words',
      test: ({ text }) => TEXT_PATTERNS.nsfwBait.test(text),
    },
    {
      points: 5,
      reason: 'known spam template',
      test: ({ text }) => TEXT_PATTERNS.templateBait.test(text),
    },
    {
      points: 7,
      reason: 'known english joke spam template',
      test: ({ length, latinSkeleton }) =>
        length <= 220 && TEXT_PATTERNS.knownEnglishJokeSpamSkeleton.test(latinSkeleton),
    },
    {
      points: 7,
      reason: 'emoji obfuscated english joke template',
      test: ({ raw, length, isLatinDominant, latinSkeleton, replacementMarkerCount, hasEmojiFlood }) =>
        length <= 220 &&
        isLatinDominant &&
        (
          TEXT_PATTERNS.englishJoke.test(raw) ||
          TEXT_PATTERNS.englishJokeSkeleton.test(latinSkeleton)
        ) &&
        (
          TEXT_PATTERNS.englishPunchline.test(raw) ||
          TEXT_PATTERNS.englishPunchlineSkeleton.test(latinSkeleton) ||
          replacementMarkerCount >= 1
        ) &&
        (hasEmojiFlood || replacementMarkerCount >= 2),
    },
    {
      points: 5,
      reason: 'latin emoji replacement spam combo',
      test: ({ length, isLatinDominant, emojiCount, replacementMarkerCount }) =>
        length <= 240 &&
        isLatinDominant &&
        emojiCount >= 3 &&
        replacementMarkerCount >= 1,
    },
    {
      points: 7,
      reason: 'emoji broken latin word',
      test: ({ length, isLatinDominant, emojiInsideLatinWordCount }) =>
        length <= 260 &&
        isLatinDominant &&
        emojiInsideLatinWordCount >= 1,
    },
    {
      points: 7,
      reason: 'latin emoji non-latin decoration combo',
      test: ({ length, latinLetterCount, emojiCount, suspiciousNonLatinDecorationCount }) =>
        length <= 260 &&
        latinLetterCount >= 6 &&
        emojiCount >= 1 &&
        suspiciousNonLatinDecorationCount >= 2,
    },
    {
      points: 7,
      reason: 'known chinese filler spam template',
      test: ({ length, text, emojiCount, hasRandomLatinPrefix }) =>
        length <= 100 &&
        TEXT_PATTERNS.chineseFillerTemplate.test(text) &&
        (emojiCount >= 1 || hasRandomLatinPrefix),
    },
    {
      points: 6,
      reason: 'random latin prefix chinese emoji combo',
      test: ({ length, hasRandomLatinPrefix, emojiCount, emojiAdjacentToHanCount }) =>
        length <= 100 &&
        hasRandomLatinPrefix &&
        emojiCount >= 1 &&
        emojiAdjacentToHanCount >= 1,
    },
    {
      points: 4,
      reason: 'social dating bait random suffix combo',
      test: ({ length, text, hasRandomAlphaNumSuffix }) =>
        length <= 100 &&
        hasRandomAlphaNumSuffix &&
        /(真人|认识|认识一下|来个|有没有|有没|单身)/u.test(text),
    },
    {
      points: 5,
      reason: 'short puppy owner play combo',
      test: ({ length, text }) =>
        length <= 100 &&
        /小狗/u.test(text) &&
        /(主人|找主人|跟你玩|想玩|陪你玩|陪我玩|抱抱|认领|领我)/u.test(text),
    },
    {
      points: 5,
      reason: 'offline bait combo',
      test: ({ length, text }) =>
        length <= 100 &&
        /线下/u.test(text) &&
        /(哥哥|弟弟|姐姐|妹妹|玩|找|约|可约|能约|骚|sao)/u.test(text),
    },
    {
      points: 5,
      reason: 'short mention bait combo',
      test: ({ length, text, hasMention }) =>
        length <= 150 &&
        hasMention &&
        /(骚|sao|涩|色|约|飞机|不行了|好看|主人|哥哥|弟弟|小狗|疼人)/u.test(text),
    },
    {
      points: 4,
      reason: 'random suffix bait combo',
      test: ({ length, text, hasRandomAlphaNumSuffix }) =>
        length <= 100 &&
        hasRandomAlphaNumSuffix &&
        /(主人|哥哥|弟弟|姐姐|妹妹|小狗|搭子|线下|抱抱|领我|找主人|跟你玩|想玩|疼人)/u.test(text),
    },
    {
      points: 5,
      reason: 'profile nsfw bait combo',
      test: ({ length, text }) =>
        length <= 150 &&
        /主页/u.test(text) &&
        /(骚|sao|涩|色|飞机|冲|能打|不行了)/u.test(text),
    },
    {
      points: 6,
      reason: 'local dating resource bait combo',
      test: ({ length, text }) =>
        length <= 150 &&
        /(同城|线下|附近|全国牵线|牵线)/u.test(text) &&
        /(约|约p|约炮|炮|资源|入口|对接|真实|见|自取)/u.test(text),
    },
    {
      points: 6,
      reason: 'profile pinned resource bait combo',
      test: ({ length, text }) =>
        length <= 150 &&
        /(主页|点我主页|看我主页|置顶|看我置顶|点我置顶)/u.test(text) &&
        /(资源|入口|对接|自取|约|炮|涩|色|社区)/u.test(text),
    },
    {
      points: 6,
      reason: 'live nsfw bait combo',
      test: ({ length, text }) =>
        length <= 120 &&
        /(涩播|色播|准时涩播|今晚准时涩播|开播|直播)/u.test(text),
    },
    {
      points: 6,
      reason: 'pet owner nsfw bait combo',
      test: ({ length, text }) =>
        length <= 120 &&
        /(母狗|小狗)/u.test(text) &&
        /(主人|找主人|认领|领我)/u.test(text),
    },
    {
      points: 6,
      reason: 'free offline dating bait combo',
      test: ({ length, text }) =>
        length <= 120 &&
        /(无偿|免费)/u.test(text) &&
        /(线下|约|约p|约炮|见|同城)/u.test(text),
    },
  ];

  const PROFILE_SCORE_RULES = [
    {
      points: 7,
      reason: 'profile drug bait phrase',
      test: ({ length, text }) => length <= 80 && PROFILE_PATTERNS.drugBait.test(text),
    },
    {
      points: 7,
      reason: 'profile local resource cta bait',
      test: ({ length, text }) =>
        length <= 80 && PROFILE_PATTERNS.localResourceCta.test(text),
    },
    {
      points: 7,
      reason: 'profile strong dating bait phrase',
      test: ({ text }) => PROFILE_PATTERNS.strongDatingBait.test(text),
    },
    {
      points: 4,
      reason: 'profile dating bait words',
      test: ({ text }) => PROFILE_PATTERNS.datingBait.test(text),
    },
    {
      points: 4,
      reason: 'profile dating bait pair',
      test: ({ text }) =>
        /(想找|找|无偿|免费).*(单男|线下|chu男|处男)|(单男|线下|chu男|处男).*(想找|找|无偿|免费)/u.test(text),
    },
    {
      points: 2,
      reason: 'profile emoji dating bait wrapper',
      test: ({ text, emojiCount }) =>
        emojiCount >= 2 && PROFILE_PATTERNS.datingBait.test(text),
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

  function getStableHash(text) {
    let hash = 0;
    const value = String(text || '');

    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }

    return Math.abs(hash).toString(36);
  }

  function getReplyCounterKey(article, text, authorName) {
    const permalinkPath = getTweetPermalinkPath(article);
    if (permalinkPath) return `path:${permalinkPath}`;

    return `fallback:${getStableHash(`${authorName || ''}\n${text || ''}`)}`;
  }

  function resetFilterCounterForPath(statusPath) {
    if (activeStatusPath === statusPath) return;

    activeStatusPath = statusPath;
    hiddenReplyKeys = new Set();
    updateFilterCounterBadge();
  }

  function updateFilterCounterBadge() {
    const existingBadge = document.querySelector(`[${FILTER_COUNTER_ATTR}]`);
    const count = hiddenReplyKeys.size;

    if (!isStatusPage() || count < 1) {
      existingBadge?.remove();
      return;
    }

    const badge =
      existingBadge ||
      (() => {
        const element = document.createElement('button');
        element.setAttribute(FILTER_COUNTER_ATTR, 'true');
        element.setAttribute('role', 'status');
        element.setAttribute('aria-live', 'polite');
        element.type = 'button';
        element.style.cssText = [
          'position:fixed',
          'z-index:2147483647',
          'display:flex',
          'align-items:center',
          'justify-content:center',
          'background:rgb(0,0,0)',
          'border:1px solid rgba(239,243,244,0.45)',
          'color:rgb(255,255,255)',
          'white-space:nowrap',
          'pointer-events:none',
          'padding:0',
          'margin:0',
        ].join(';');
        return element;
      })();

    const label = String(count);
    if (badge.textContent !== label) {
      badge.textContent = label;
      badge.title = `已隐藏 ${count} 条疑似垃圾回帖`;
      badge.setAttribute('aria-label', badge.title);
    }

    if (badge.parentElement !== document.body) {
      document.body.appendChild(badge);
    }

    positionFilterCounterBadge(badge);
  }

  function hasFixedOrStickyContext(element) {
    let node = element;

    while (node && node !== document.body && node !== document.documentElement) {
      const position = window.getComputedStyle(node).position;
      if (position === 'fixed' || position === 'sticky') return true;
      node = node.parentElement;
    }

    return false;
  }

  function getBottomRightFloatingActionRect(badge) {
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    const candidates = Array.from(
      document.querySelectorAll('button,[role="button"],a[role="button"]')
    )
      .filter((element) => element !== badge && !element.closest(`[${FILTER_COUNTER_ATTR}]`))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { element, rect };
      })
      .filter(({ element, rect }) => {
        const style = window.getComputedStyle(element);
        return (
          rect.width >= 40 &&
          rect.width <= 90 &&
          rect.height >= 40 &&
          rect.height <= 90 &&
          rect.right > viewportWidth * 0.55 &&
          rect.bottom > viewportHeight * 0.45 &&
          rect.left >= 0 &&
          rect.top >= 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          Number(style.opacity || '1') > 0 &&
          hasFixedOrStickyContext(element)
        );
      });

    if (!candidates.length) return null;

    const maxRight = Math.max(...candidates.map(({ rect }) => rect.right));
    const rightColumn = candidates.filter(({ rect }) => Math.abs(rect.right - maxRight) <= 8);
    rightColumn.sort((a, b) => a.rect.top - b.rect.top);

    return rightColumn[0].rect;
  }

  function positionFilterCounterBadge(badge) {
    const anchorRect = getBottomRightFloatingActionRect(badge);
    const fallbackRight = 70;
    const fallbackBottom = 154;
    const size = anchorRect
      ? Math.round(Math.min(anchorRect.width, anchorRect.height))
      : FLOATING_COUNTER_FALLBACK_SIZE;

    const left = anchorRect
      ? Math.round(anchorRect.right - size)
      : Math.round((window.innerWidth || document.documentElement.clientWidth || 0) - fallbackRight - size);
    const top = anchorRect
      ? Math.round(anchorRect.top - FLOATING_COUNTER_GAP - size)
      : Math.round((window.innerHeight || document.documentElement.clientHeight || 0) - fallbackBottom - size);

    badge.style.left = `${Math.max(8, left)}px`;
    badge.style.top = `${Math.max(8, top)}px`;
    badge.style.right = 'auto';
    badge.style.bottom = 'auto';
    badge.style.width = `${size}px`;
    badge.style.height = `${size}px`;
    badge.style.borderRadius = `${Math.round(size * 0.3)}px`;
    badge.style.boxShadow = `0 0 0 1px rgba(239,243,244,0.08),0 0 ${Math.round(
      size * 0.45
    )}px rgba(239,243,244,0.32)`;
    badge.style.font = `800 ${Math.round(
      size * 0.45
    )}px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;
  }

  function getTextWithImageAlt(node) {
    if (!node) return '';

    if (node.nodeType === 3) {
      return node.textContent || '';
    }

    if (node.nodeType !== 1) {
      return '';
    }

    if (node.tagName === 'IMG' && node.alt) {
      return node.alt;
    }

    return Array.from(node.childNodes || [])
      .map(getTextWithImageAlt)
      .join('');
  }

  function getVisibleTweetText(article) {
    const tweetTextNodes = Array.from(
      article.querySelectorAll('[data-testid="tweetText"]')
    );

    if (tweetTextNodes.length > 0) {
      return tweetTextNodes
        .map((node) => getTextWithImageAlt(node) || node.innerText || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return (article.innerText || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getVisibleUserNameText(article) {
    const userName = article.querySelector('[data-testid="User-Name"]');
    if (!userName) return '';

    const displayNameLink = userName.querySelector('a[href^="/"][role="link"]');
    const sourceNode = displayNameLink || userName;

    return (getTextWithImageAlt(sourceNode) || sourceNode.innerText || '')
      .replace(/@\w+\b.*$/u, '')
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
      .replace(/[✈🛩]/gu, '飞机')
      .replace(/💊/gu, '药')

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

  function isEmojiChar(ch) {
    try {
      return /\p{Extended_Pictographic}/u.test(ch);
    } catch {
      return false;
    }
  }

  function isLatinLetter(ch) {
    return /[a-z]/i.test(ch || '');
  }

  function isHanChar(ch) {
    return /\p{Script=Han}/u.test(ch || '');
  }

  function countEmojiAdjacentTo(text, isNeighborChar) {
    const chars = [...String(text || '')];
    let count = 0;

    chars.forEach((ch, index) => {
      if (!isEmojiChar(ch)) return;

      const prev = chars[index - 1] || '';
      const next = chars[index + 1] || '';
      if (isNeighborChar(prev) || isNeighborChar(next)) {
        count += 1;
      }
    });

    return count;
  }

  function countEmojiInsideLatinWord(text) {
    const chars = [...String(text || '')];
    let count = 0;

    chars.forEach((ch, index) => {
      if (!isEmojiChar(ch)) return;

      const prev = chars[index - 1] || '';
      const next = chars[index + 1] || '';
      if (isLatinLetter(prev) && isLatinLetter(next)) {
        count += 1;
      }
    });

    return count;
  }

  function isLatinScriptChar(ch) {
    return /\p{Script=Latin}/u.test(ch || '');
  }

  function isCommonTextSeparator(ch) {
    return /[\s.,!?;:'"()[\]{}<>/\\|@#$%&*_+=~`^\-—，。！？、：；“”‘’（）《》【】「」『』…]/u.test(ch || '');
  }

  function isSuspiciousNonLatinDecorationChar(ch) {
    return Boolean(ch) &&
      !isEmojiChar(ch) &&
      !isHanChar(ch) &&
      !isLatinScriptChar(ch) &&
      !/\p{Number}/u.test(ch) &&
      !isCommonTextSeparator(ch);
  }

  function countSuspiciousNonLatinDecorationChars(text) {
    return [...String(text || '')].filter(isSuspiciousNonLatinDecorationChar).length;
  }

  function getLatinSkeleton(text) {
    return String(text || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  function hasHan(text) {
    return /\p{Script=Han}/u.test(text);
  }

  function addScore(result, points, reason) {
    result.score += points;
    result.reasons.push(`${reason}+${points}`);
  }

  function buildTextSignals(originalText) {
    const raw = String(originalText || '');
    const text = normalizeTextForFilter(raw);
    const length = text.length;
    const emojiCount = countEmoji(raw);
    const replacementMarkerCount = countReplacementMarkers(raw);
    const latinLetterCount = countLatinLetters(raw);
    const rawCharCount = [...raw].length || 1;
    const latinSkeleton = getLatinSkeleton(raw);
    const emojiInsideLatinWordCount = countEmojiInsideLatinWord(raw);
    const emojiAdjacentToLatinCount = countEmojiAdjacentTo(raw, isLatinLetter);
    const emojiAdjacentToHanCount = countEmojiAdjacentTo(raw, isHanChar);
    const suspiciousNonLatinDecorationCount = countSuspiciousNonLatinDecorationChars(raw);

    const hasMention = TEXT_PATTERNS.mention.test(text);
    const hasRandomLatinPrefix = /^[a-z]{2,10}(?=\p{Script=Han})/u.test(text);
    const hasRandomLatinSuffix = /[a-z]{1,8}$/i.test(text) && hasHan(text);
    const hasRandomAlphaNumSuffix = /[a-z0-9]{1,8}$/i.test(text) && hasHan(text);
    return {
      raw,
      text,
      length,
      emojiCount,
      replacementMarkerCount,
      latinLetterCount,
      rawCharCount,
      latinSkeleton,
      emojiInsideLatinWordCount,
      emojiAdjacentToLatinCount,
      emojiAdjacentToHanCount,
      suspiciousNonLatinDecorationCount,
      hasMention,
      hasRandomLatinPrefix,
      hasRandomLatinSuffix,
      hasRandomAlphaNumSuffix,
      isLatinDominant: latinLetterCount >= 18 && latinLetterCount / rawCharCount >= 0.35,
      hasEmojiFlood: emojiCount >= 5 || emojiCount / rawCharCount >= 0.12,
    };
  }

  function applyScoreRules(result, signals, rules, reasonPrefix = '') {
    for (const rule of rules) {
      if (rule.test(signals)) {
        addScore(result, rule.points, `${reasonPrefix}${rule.reason}`);
      }
    }
  }

  function getSpamScore(originalText, context = {}) {
    const signals = buildTextSignals(originalText);

    const result = {
      score: 0,
      reasons: [],
      normalizedText: signals.text,
      normalizedProfileText: '',
    };

    if (signals.text || signals.emojiCount > 0) {
      applyScoreRules(result, signals, SCORE_RULES);
    }

    if (context.authorName) {
      const profileSignals = buildTextSignals(context.authorName);
      result.normalizedProfileText = profileSignals.text;

      if (profileSignals.text) {
        applyScoreRules(result, profileSignals, PROFILE_SCORE_RULES, 'author ');
      }
    }

    return result;
  }

  function matchRules(originalText, context = {}) {
    const text = normalizeTextForFilter(originalText);
    const profileText = normalizeTextForFilter(context.authorName);
    const spam = getSpamScore(originalText, context);
    if (!text && !profileText && spam.score < SPAM_SCORE_THRESHOLD) return null;

    if (spam.score >= SPAM_SCORE_THRESHOLD) {
      return {
        name: `spam score ${spam.score}: ${spam.reasons.join(', ')}`,
        normalizedText: spam.normalizedText,
        normalizedProfileText: spam.normalizedProfileText,
      };
    }

    return null;
  }

  function hideReply(article, matchedRule, counterKey) {
    const cell = getTweetCell(article);

    if (cell.dataset.xStrictReplySpamScoreFiltered === '1') return;

    const originalText = getVisibleTweetText(article);
    const originalHtml = cell.innerHTML;

    cell.dataset.xStrictReplySpamScoreFiltered = '1';
    cell.dataset.xStrictReplySpamScoreRule = matchedRule.name;
    cell.dataset.xStrictReplySpamScoreOriginalText = originalText;
    cell.dataset.xStrictReplySpamScoreOriginalHtml = originalHtml;
    if (counterKey) {
      cell.dataset.xStrictReplySpamScoreCounterKey = counterKey;
      hiddenReplyKeys.add(counterKey);
      updateFilterCounterBadge();
    }

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
      console.log('[X Strict Reply Filter] hidden:', matchedRule.name);
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
    if (!isStatusPage()) {
      resetFilterCounterForPath(null);
      return;
    }

    const currentStatusPath = getCurrentStatusPath();
    if (!currentStatusPath) return;
    resetFilterCounterForPath(currentStatusPath);

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
      const authorName = getVisibleUserNameText(article);
      if (!text && !authorName) return;

      const matchedRule = matchRules(text, { authorName });
      if (!matchedRule) return;

      const counterKey = getReplyCounterKey(article, text, authorName);
      hideReply(article, matchedRule, counterKey);
    });

    updateFilterCounterBadge();
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
      const counterKey = cell.dataset.xStrictReplySpamScoreCounterKey;
      if (html) {
        cell.innerHTML = html;
        cell.dataset.xStrictReplySpamScoreFiltered = '0';
        if (counterKey) {
          hiddenReplyKeys.delete(counterKey);
          updateFilterCounterBadge();
        }
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
    window.addEventListener('resize', () => updateFilterCounterBadge());
    window.addEventListener('popstate', () => scheduleScan(300));
    window.addEventListener('focus', () => scheduleScan(300));

    scheduleScan(300);
    scheduleScan(1000);
    scheduleScan(2500);

    if (DEBUG) {
      console.log('[X Strict Reply Filter] loaded:', location.href);
    }
  }

  if (document.documentElement) {
    start();
  } else {
    window.addEventListener('DOMContentLoaded', start, { once: true });
  }
})();
