/* Запускає всі тести: node tests/run-all.js (потрібен Playwright із Chromium: npx playwright install chromium) */
const { spawnSync } = require('child_process'), path = require('path');
let bad = 0;
['srs', 'app', 'web', 'translator', 'forum', 'ui', 'sync'].forEach((n) => { const r = spawnSync('node', [path.join(__dirname, n + '.test.js')], { stdio: 'inherit' }); if (r.status !== 0) bad++; });
process.exit(bad ? 1 : 0);
