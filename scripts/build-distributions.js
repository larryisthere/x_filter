const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const version = '1.6.0';
const sourceFiles = [
  'src/filter-core.js',
  'src/dom-extract.js',
  'src/x-page-filter.js',
];

function readSource(filePath) {
  return fs.readFileSync(path.join(repoRoot, filePath), 'utf8').trimEnd();
}

function writeFile(filePath, content) {
  const absolutePath = path.join(repoRoot, filePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${content.trimEnd()}\n`);
}

const sharedSource = sourceFiles.map(readSource).join('\n\n');

const userscriptHeader = `// ==UserScript==
// @name         X Strict Reply Filter
// @namespace    local.x.strict.reply.filter
// @version      ${version}
// @description  Strictly filter spam/NSFW-style replies on X/Twitter status pages using normalization, structural signals, and a local spam score model.
// @author       larryisthere
// @license      MIT
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==`;

const userscriptStarter = `(function () {
  'use strict';

  globalThis.XStrictReplyFilterPage.start({
    runtimeName: 'userscript',
    version: '${version}',
  });
})();`;

const extensionStarter = `(function () {
  'use strict';

  globalThis.XStrictReplyFilterPage.start({
    runtimeName: 'chrome-extension',
    version: '${version}',
  });
})();`;

writeFile(
  'userscript/x-strict-reply-filter.user.js',
  `${userscriptHeader}\n\n${sharedSource}\n\n${userscriptStarter}`
);

writeFile(
  'extension/dist/content.js',
  `${sharedSource}\n\n${extensionStarter}`
);

console.log(`Built userscript and Chrome extension content script for ${version}.`);
