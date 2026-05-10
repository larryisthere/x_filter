// X/Twitter page adapter for X Strict Reply Filter.
(function (global) {
'use strict';

const ACTIVE_GLOBAL_KEY = '__X_STRICT_REPLY_FILTER_ACTIVE__';
const ACTIVE_DOCUMENT_ATTR = 'data-x-strict-reply-filter-active';

function startXStrictReplyFilter(options = {}) {
  const core = global.XStrictReplyFilterCore;
  const dom = global.XStrictReplyFilterDom;

  if (!core || !dom) {
    throw new Error('X Strict Reply Filter dependencies are not loaded.');
  }

  const settings = Object.assign({
    filterMainTweet: false,
    spamScoreThreshold: core.DEFAULT_SPAM_SCORE_THRESHOLD,
    debug: false,
    showPlaceholder: false,
    runtimeName: 'unknown',
    version: '',
  }, options);

  if (!document.documentElement) {
    window.addEventListener('DOMContentLoaded', () => startXStrictReplyFilter(options), { once: true });
    return { started: false, reason: 'waiting-for-document' };
  }

  const activeRuntime = document.documentElement?.getAttribute(ACTIVE_DOCUMENT_ATTR) || global[ACTIVE_GLOBAL_KEY]?.runtimeName;
  if (activeRuntime) {
    if (settings.debug) {
      console.info('[X Strict Reply Filter] skipped because another runtime is active:', activeRuntime);
    }
    return { started: false, reason: 'already-active', activeRuntime };
  }

  global[ACTIVE_GLOBAL_KEY] = {
    runtimeName: settings.runtimeName,
    version: settings.version,
  };

  function markDocumentRuntime() {
    document.documentElement?.setAttribute(ACTIVE_DOCUMENT_ATTR, settings.runtimeName);
  }

  markDocumentRuntime();

  const FILTER_MAIN_TWEET = settings.filterMainTweet;
  const SPAM_SCORE_THRESHOLD = settings.spamScoreThreshold;
  const DEBUG = settings.debug;
  const SHOW_PLACEHOLDER = settings.showPlaceholder;

  const FILTER_COUNTER_ATTR = 'data-x-strict-reply-filter-counter';
  const FLOATING_COUNTER_FALLBACK_SIZE = 54;
  const FLOATING_COUNTER_GAP = 14;

  let activeStatusPath = null;
  let hiddenReplyKeys = new Set();

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
  function hideReply(article, matchedRule, counterKey) {
    const cell = getTweetCell(article);

    if (cell.dataset.xStrictReplySpamScoreFiltered === '1') return;

    const originalText = dom.getVisibleTweetText(article);
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

      const text = dom.getVisibleTweetText(article);
      const authorName = dom.getVisibleUserNameText(article);
      if (!text && !authorName) return;

      const matchedRule = core.matchRules(text, { authorName }, { spamScoreThreshold: SPAM_SCORE_THRESHOLD });
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
    markDocumentRuntime();

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

  return { started: true, runtimeName: settings.runtimeName };
}

global.XStrictReplyFilterPage = {
  start: startXStrictReplyFilter,
};
})(globalThis);
