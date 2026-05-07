const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const scriptPath = path.join(repoRoot, 'x-strict-reply-filter.user.js');
const casesPath = path.join(__dirname, 'real-world-cases.json');

const source = fs
  .readFileSync(scriptPath, 'utf8')
  .replace(/\}\)\(\);\s*$/, 'globalThis.__xFilterTest = { getSpamScore, matchRules };\n})();');

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
vm.runInContext(source, sandbox, { filename: scriptPath });

const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
let failures = 0;

for (const testCase of cases) {
  const matched = sandbox.__xFilterTest.matchRules(testCase.text);
  const score = sandbox.__xFilterTest.getSpamScore(testCase.text);
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

if (failures > 0) {
  console.error(`${failures} real-world case(s) failed.`);
  process.exit(1);
}

console.log(`${cases.length} real-world case(s) passed.`);
