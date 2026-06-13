// X/Twitter DOM text extraction helpers.
(function (global) {
'use strict';

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

function getVisibleUserHandleText(article) {
  const userName = article.querySelector('[data-testid="User-Name"]');
  if (!userName) return '';

  const text = getTextWithImageAlt(userName) || userName.innerText || '';
  const match = text.match(/@([a-zA-Z0-9_]{3,20})\b/u);
  return match ? match[1] : '';
}

global.XStrictReplyFilterDom = {
  getTextWithImageAlt,
  getVisibleTweetText,
  getVisibleUserNameText,
  getVisibleUserHandleText,
};
})(globalThis);
