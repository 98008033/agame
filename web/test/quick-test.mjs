import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const errors = [];

  const pages = [
    { path: '/login', name: 'Login' },
    { path: '/', name: 'Root' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/game', name: 'Game' },
    { path: '/status', name: 'Status' },
    { path: '/character/create', name: 'Character Create' },
  ];

  for (const { path, name } of pages) {
    console.log(`Testing ${name}...`);
    const page = await browser.newPage();
    let status = 'PASS';
    const pageErrors = [];

    page.on('pageerror', e => { pageErrors.push(e.message); status = 'FAIL'; });
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const t = msg.text();
        if (!t.includes('WebSocket') && !t.includes('ws://') && !t.includes('401')) {
          pageErrors.push(t);
          status = 'FAIL';
        }
      }
    });

    try {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      const title = await page.title();
      const bodyLen = (await page.innerText('body')).length;
      const screenshot = `/tmp/qa-${path.replace(/\//g, '_') || 'root'}.png`;
      await page.screenshot({ path: screenshot, fullPage: true, timeout: 5000 });
      results.push({ name, path, status, title, bodyLen, errors: pageErrors, screenshot });
      console.log(`  ${status} | title="${title}" | body=${bodyLen}chars`);
      if (pageErrors.length) pageErrors.forEach(e => console.log(`    ERROR: ${e}`));
    } catch (e) {
      results.push({ name, path, status: 'FAIL', errors: [e.message] });
      console.log(`  FAIL: ${e.message}`);
    }
    await page.close();
  }

  await browser.close();

  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  console.log(`\nResults: ${pass} passed, ${fail} failed`);

  const fs = await import('fs');
  fs.writeFileSync('/tmp/qa-results.json', JSON.stringify(results, null, 2));
}

test().catch(console.error);
