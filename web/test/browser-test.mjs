import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

const pagesToTest = [
  { path: '/login', name: 'Login Page' },
  { path: '/', name: 'Root (Redirect)' },
  { path: '/dashboard', name: 'Dashboard Page' },
  { path: '/game', name: 'Game Page' },
  { path: '/status', name: 'Status Page' },
  { path: '/character/create', name: 'Character Create Page' },
];

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const results = [];
  const allErrors = [];
  const networkErrors = [];

  // Test 1: API Health Check
  console.log('\n=== API Health Check ===');
  try {
    const apiPage = await browser.newPage();
    const apiResponse = await apiPage.goto(`${API_URL}/api/health`);
    const apiStatus = apiResponse.status();
    console.log(`  API /api/health: ${apiStatus}`);
    if (apiStatus === 404) {
      console.log('  WARNING: /api/health endpoint returns 404');
    }
    await apiPage.close();
  } catch (err) {
    console.log(`  API check failed: ${err.message}`);
  }

  // Test 2: Page-by-Page Testing (using domcontentloaded to avoid WebSocket infinite reconnect)
  console.log('\n=== Page-by-Page Testing ===');
  for (const { path, name } of pagesToTest) {
    console.log(`\nTesting: ${name} (${path})`);
    const pageErrors = [];
    const jsErrors = [];
    const pageResult = { name, path, status: 'PASS', errors: [], consoleErrors: [], jsErrors: [], screenshots: [] };

    const page = await browser.newPage();

    // Capture console errors (excluding WebSocket noise)
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out WebSocket reconnection errors (known issue, not JS bugs)
        if (text.includes('WebSocket') || text.includes('ws://')) return;
        pageErrors.push(text);
        console.log(`  [CONSOLE ERROR] ${text}`);
      }
    });

    // Capture uncaught JS exceptions via page event
    page.on('pageerror', error => {
      jsErrors.push(error.message);
      console.log(`  [PAGE ERROR] ${error.message}`);
    });

    // Capture network failures
    page.on('requestfailed', request => {
      const url = request.url();
      if (url.includes('localhost') && !url.includes('.png') && !url.includes('.svg') && !url.includes('.ico') && !url.includes('ws://')) {
        const failure = request.failure();
        networkErrors.push({ url, error: failure?.errorText || 'unknown' });
        console.log(`  [NETWORK FAIL] ${url}: ${failure?.errorText || 'unknown'}`);
      }
    });

    try {
      // Use domcontentloaded since WebSocket keeps network busy forever
      const response = await page.goto(`${BASE_URL}${path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      const status = response.status();
      console.log(`  HTTP Status: ${status}`);

      if (status >= 400) {
        pageResult.status = 'FAIL';
        pageResult.errors.push(`HTTP ${status}`);
      }

      // Check for console errors (non-WebSocket)
      if (pageErrors.length > 0) {
        pageResult.status = 'FAIL';
        pageResult.consoleErrors = [...pageErrors];
      }

      // Check for JS page errors
      if (jsErrors.length > 0) {
        pageResult.status = 'FAIL';
        pageResult.jsErrors = [...jsErrors];
      }

      // Take screenshot
      const screenshotPath = `/tmp/qa-${path.replace(/\//g, '_') || 'root'}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      pageResult.screenshots.push(screenshotPath);

      // Get page title
      const title = await page.title();
      console.log(`  Page Title: "${title}"`);

      // Check if body has content
      const bodyText = await page.evaluate(() => document.body.innerText);
      const hasContent = bodyText.trim().length > 0;
      console.log(`  Has Content: ${hasContent} (${bodyText.trim().length} chars)`);

      if (!hasContent) {
        pageResult.status = 'FAIL';
        pageResult.errors.push('Page body is empty');
      }

      // Check for React error boundaries
      const domErrors = await page.evaluate(() => {
        const errors = [];
        const errorBoundary = document.querySelector('[data-react-error]');
        if (errorBoundary) errors.push('React error boundary found');
        const allText = document.body.innerText;
        if (allText.includes('Something went wrong') || allText.includes('Error:')) {
          errors.push('Error message in page text');
        }
        return errors;
      });

      if (domErrors.length > 0) {
        pageResult.status = 'FAIL';
        pageResult.errors.push(...domErrors);
      }

      // Count WebSocket errors for reporting (not as failures)
      const wsErrorCount = await page.evaluate(() => {
        // We can't count past console errors easily, but we note the pattern
        return 0;
      });

    } catch (err) {
      pageResult.status = 'FAIL';
      pageResult.errors.push(`Navigation error: ${err.message}`);
      console.log(`  Navigation Error: ${err.message}`);
    }

    allErrors.push(...pageErrors.map(e => ({ page: name, error: e })));
    allErrors.push(...jsErrors.map(e => ({ page: name, error: `JS: ${e}` })));
    results.push(pageResult);

    await page.close();
  }

  // Test 3: Login Page Element Check
  console.log('\n=== Login Page Elements ===');
  const loginPage = await browser.newPage();
  await loginPage.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });

  const loginElements = await loginPage.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
      type: i.type, name: i.name, placeholder: i.placeholder, id: i.id
    }));
    const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.textContent?.trim(), disabled: b.disabled, type: b.type
    }));
    const links = Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent?.trim(), href: a.href
    }));
    const headings = Array.from(document.querySelectorAll('h1,h2,h3')).map(h => ({
      text: h.textContent?.trim(), tag: h.tagName
    }));
    return { inputs, buttons, links, headings };
  });
  console.log(`  Headings: ${JSON.stringify(loginElements.headings)}`);
  console.log(`  Inputs: ${JSON.stringify(loginElements.inputs)}`);
  console.log(`  Buttons: ${JSON.stringify(loginElements.buttons)}`);
  console.log(`  Links: ${JSON.stringify(loginElements.links)}`);

  await loginPage.close();

  // Test 4: Resource Loading
  console.log('\n=== Resource Loading Check ===');
  const resPage = await browser.newPage();
  await resPage.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });

  const resources = await resPage.evaluate(() => {
    const entries = performance.getEntriesByType('resource');
    return entries.map(e => ({
      name: e.name.split('/').pop(),
      type: e.initiatorType,
      duration: Math.round(e.duration),
      transferSize: e.transferSize
    }));
  });

  const failedResources = resources.filter(r => r.transferSize === 0 && r.duration > 100);
  if (failedResources.length > 0) {
    console.log(`  WARNING: ${failedResources.length} resources with issues`);
    failedResources.forEach(r => console.log(`    - ${r.name} (${r.type}, ${r.duration}ms)`));
  } else {
    console.log(`  All ${resources.length} resources loaded OK`);
  }

  await resPage.close();

  // Summary
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Pages tested: ${results.length}`);
  console.log(`Passed: ${results.filter(r => r.status === 'PASS').length}`);
  console.log(`Failed: ${results.filter(r => r.status === 'FAIL').length}`);

  for (const result of results) {
    const icon = result.status === 'PASS' ? 'PASS' : 'FAIL';
    console.log(`  [${icon}] ${result.name} (${result.path})`);
    if (result.errors.length > 0) {
      result.errors.forEach(e => console.log(`    Error: ${e}`));
    }
    if (result.consoleErrors.length > 0) {
      result.consoleErrors.forEach(e => console.log(`    Console: ${e}`));
    }
    if (result.jsErrors.length > 0) {
      result.jsErrors.forEach(e => console.log(`    JS Error: ${e}`));
    }
  }

  if (networkErrors.length > 0) {
    console.log(`\nNetwork Errors (${networkErrors.length}):`);
    networkErrors.slice(0, 20).forEach(e => console.log(`  ${e.url}: ${e.error}`));
  }

  // Known issues note
  console.log('\n=== KNOWN ISSUES ===');
  console.log('  WebSocket: ws://localhost:3000/ws connection fails repeatedly');
  console.log('  This causes infinite console error spam but does not break page rendering');
  console.log('  Root cause: Backend WebSocket server may not be running or /ws endpoint not configured');

  await browser.close();

  // Write results
  const fs = await import('fs');
  fs.writeFileSync('/tmp/qa-test-results.json', JSON.stringify({
    results,
    allErrors,
    networkErrors,
    loginElements,
    timestamp: new Date().toISOString()
  }, null, 2));

  console.log('\nResults saved to /tmp/qa-test-results.json');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
