const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const sourcePaths = [
  path.join(repoRoot, 'src/filter-core.js'),
  path.join(repoRoot, 'src/dom-extract.js'),
];
const casesPath = path.join(__dirname, 'real-world-cases.json');

const source = sourcePaths
  .map((sourcePath) => fs.readFileSync(sourcePath, 'utf8'))
  .join('\n');

const sandbox = {
  console,
  location: {
    pathname: '/someone/status/1',
    href: 'https://x.com/someone/status/1',
  },
  document: {
    documentElement: null,
    addEventListener() {},
  },
  window: {
    addEventListener() {},
  },
  MutationObserver: function MutationObserver() {
    this.observe = function observe() {};
  },
  setTimeout,
  clearTimeout,
};

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'x-strict-reply-filter-src.js' });

const core = sandbox.XStrictReplyFilterCore;
const dom = sandbox.XStrictReplyFilterDom;

const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
let failures = 0;

function textNode(text) {
  return {
    nodeType: 3,
    textContent: text,
  };
}

function elementNode(tagName, childNodes = [], alt = '') {
  return {
    nodeType: 1,
    tagName,
    alt,
    childNodes,
  };
}

for (const testCase of cases) {
  const context = {
    authorName: testCase.authorName || '',
  };
  const matched = core.matchRules(testCase.text, context);
  const score = core.getSpamScore(testCase.text, context);
  const hidden = Boolean(matched);
  const errors = [];

  if (hidden !== testCase.expectedHidden) {
    errors.push(`expected hidden=${testCase.expectedHidden}, got ${hidden}`);
  }

  if (
    Number.isFinite(testCase.expectedMinScore) &&
    score.score < testCase.expectedMinScore
  ) {
    errors.push(`expected score >= ${testCase.expectedMinScore}, got ${score.score}`);
  }

  if (
    Number.isFinite(testCase.expectedMaxScore) &&
    score.score > testCase.expectedMaxScore
  ) {
    errors.push(`expected score <= ${testCase.expectedMaxScore}, got ${score.score}`);
  }

  if (errors.length > 0) {
    failures += 1;
    console.error(`FAIL ${testCase.id}: ${errors.join('; ')}`);
    console.error(`  matched: ${matched?.name || 'none'}`);
    console.error(`  reasons: ${score.reasons.join(', ') || 'none'}`);
  } else {
    console.log(`PASS ${testCase.id}: score=${score.score}, hidden=${hidden}`);
  }
}

const extractedBrokenWord = dom.getTextWithImageAlt(
  elementNode('SPAN', [
    textNode('Lo'),
    elementNode('IMG', [], '🌹'),
    textNode('nel'),
    elementNode('IMG', [], '🚀'),
    textNode('iness'),
  ])
);

if (extractedBrokenWord !== 'Lo🌹nel🚀iness') {
  failures += 1;
  console.error(`FAIL emoji DOM extraction: got ${JSON.stringify(extractedBrokenWord)}`);
} else {
  console.log('PASS emoji DOM extraction: preserves broken English word adjacency');
}

if (failures > 0) {
  console.error(`${failures} real-world case(s) failed.`);
  process.exit(1);
}

console.log(`${cases.length} real-world case(s) passed.`);
